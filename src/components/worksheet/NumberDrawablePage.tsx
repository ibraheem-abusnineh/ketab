import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './NumberDrawablePage.css';

interface NumberDrawablePageProps {
  src: string;
  showPalette?: boolean;
  onComplete?: (complete: boolean) => void;
}

const PALETTE = ['#84333c', '#e8697a', '#28a745', '#667eea', '#f0a500'];

/**
 * Freehand canvas over a worksheet PNG. Used by `write`, `trace`,
 * and `color` page types. Behavior ports the prototype DrawablePage
 * but keeps the DPR-aware ResizeObserver pattern from the live
 * NumberTracingPage so strokes render crisply on retina displays,
 * and uses pointer events instead of mouse/touch handlers so
 * stylus + multi-touch both work.
 *
 * `onComplete(true)` fires on the first stroke of a fresh page;
 * `onComplete(false)` fires on clear.
 */
const NumberDrawablePage: React.FC<NumberDrawablePageProps> = ({
  src,
  showPalette = false,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState<string>(PALETTE[0]);

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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
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

  // Reset completion when the page image changes.
  useEffect(() => {
    setHasDrawn(false);
    if (onComplete) onComplete(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (canvasRef.current && ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [src, onComplete]);

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
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // pointer capture may fail on some devices
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineWidth = showPalette ? 14 : 8;
    ctx.strokeStyle = color;
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
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    setHasDrawn(false);
    if (onComplete) onComplete(false);
  };

  return (
    <motion.div
      className="number-drawable"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="number-drawable-board" ref={containerRef}>
        <img
          src={src}
          alt=""
          className="number-drawable-image"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="number-drawable-canvas"
          role="img"
          aria-label="مساحة الرسم"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      <div className="number-drawable-controls">
        {showPalette &&
          PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`number-drawable-swatch ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`اختر اللون ${c}`}
            />
          ))}
        <button type="button" className="number-drawable-clear outline-btn" onClick={clear}>
          مسح
        </button>
      </div>
    </motion.div>
  );
};

export default NumberDrawablePage;
