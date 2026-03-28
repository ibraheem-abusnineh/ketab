import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './TracingExercisePage.css';

export interface TracingExercisePageProps {
  letter: string;
  onComplete?: () => void;
}

type Pointer = {
  id: number;
  x: number;
  y: number;
};

const TracingExercisePage: React.FC<TracingExercisePageProps> = ({ letter, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointersRef = useRef<Map<number, Pointer>>(new Map());

  const tracingImageSrc = useMemo(() => {
    const normalizedLetter = letter.trim().toLowerCase() || 'a';
    return `/letters/${normalizedLetter}-tracing.jpg`;
  }, [letter]);
  const instructionText = useMemo(
    () => `Trace the letter ${letter.toUpperCase()} with your finger or mouse.`,
    [letter]
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { clientWidth, clientHeight } = container;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;

    const context = canvas.getContext('2d');
    if (context) {
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 30;
      context.strokeStyle = '#00AEEF';
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('orientationchange', resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, [resizeCanvas]);

  const getCanvasCoordinates = useCallback((event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  const drawLine = useCallback(
    (pointer: Pointer) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const previousPointer = pointersRef.current.get(pointer.id);
      if (!previousPointer) {
        context.beginPath();
        context.moveTo(pointer.x, pointer.y);
      } else {
        context.beginPath();
        context.moveTo(previousPointer.x, previousPointer.y);
        context.lineTo(pointer.x, pointer.y);
        context.stroke();
      }
      pointersRef.current.set(pointer.id, pointer);
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const coordinates = getCanvasCoordinates(event);
      setIsDrawing(true);
      const pointer: Pointer = { id: event.pointerId, ...coordinates };
      pointersRef.current.set(pointer.id, pointer);
      drawLine(pointer);
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [drawLine, getCanvasCoordinates]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      event.preventDefault();
      const coordinates = getCanvasCoordinates(event);
      const pointer: Pointer = { id: event.pointerId, ...coordinates };
      drawLine(pointer);
    },
    [drawLine, getCanvasCoordinates, isDrawing]
  );

  const stopDrawing = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(false);
    pointersRef.current.delete(event.pointerId);
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // ignore if capture was not set
    }
  }, []);

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    pointersRef.current.clear();
  }, []);

  return (
    <motion.div
      className="tracing-container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="tracing-heading">Letter Tracing</h2>
      <p className="tracing-instruction">{instructionText}</p>

      <div className="tracing-board">
        <div className="tracing-image-wrapper" ref={containerRef}>
          <img
            src={tracingImageSrc}
            alt={`Tracing guide for letter ${letter}`}
            className="tracing-image"
            onLoad={() => resizeCanvas()}
          />
          <canvas
            ref={canvasRef}
            className="tracing-canvas"
            role="img"
            aria-label={`Tracing canvas for letter ${letter}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={(event) => {
              if (isDrawing) {
                stopDrawing(event);
              }
            }}
            onPointerCancel={stopDrawing}
          />
        </div>
      </div>

      <div className="tracing-controls">
        <button type="button" className="outline-btn" onClick={handleReset}>
          Reset
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (onComplete) {
              onComplete();
            }
          }}
        >
          Next
        </button>
      </div>
    </motion.div>
  );
};

export default TracingExercisePage;
