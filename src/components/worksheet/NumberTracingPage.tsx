import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import './NumberTracingPage.css';

interface NumberTracingPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Freehand canvas tracing over a faint numeral guide. Unlike
 * TracingExercisePage (letters), no per-number image asset is needed:
 * the guide is drawn inline via a CSS overlay so the page works for
 * every integer 1..100 without external files.
 *
 * Completion is reported via onComplete(true) the moment the user
 * makes their first stroke; onComplete(false) on clear.
 */
const NumberTracingPage: React.FC<NumberTracingPageProps> = ({ numberData, onComplete }) => {
  const { value } = numberData;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = container;
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#D9803A';
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('orientationchange', resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    setHasDrawn(false);
    if (onComplete) onComplete(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (canvasRef.current && ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [value, onComplete]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) {
      setHasDrawn(true);
      if (onComplete) onComplete(true);
    }
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer capture may not have been set
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onComplete) onComplete(false);
  };

  return (
    <motion.div
      className="number-tracing-container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="tracing-heading">تتبّع العدد</h2>
      <p className="tracing-instruction">
        تتبّع العدد {value} بإصبعك أو الفأرة على المسار الموضّح.
      </p>

      <div className="number-tracing-board" ref={containerRef}>
        <div className="number-tracing-guide" aria-hidden="true">{value}</div>
        <canvas
          ref={canvasRef}
          className="number-tracing-canvas"
          role="img"
          aria-label={`مسار تتبّع العدد ${value}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      <div className="tracing-controls">
        <button type="button" className="outline-btn" onClick={clear}>
          مسح
        </button>
      </div>
    </motion.div>
  );
};

export default NumberTracingPage;
