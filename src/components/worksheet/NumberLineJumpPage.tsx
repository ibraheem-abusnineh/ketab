import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import { getNumberLineConfig } from '../../utils/numberExercises';
import './NumberLineJumpPage.css';

interface NumberLineJumpPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Number Line Jump: hop a token along a number line to land exactly
 * on the target. The line only shows numbers <= value (target is the
 * largest tick). An overshoot buffer lets the child see they went
 * too far; they must back up.
 *
 * Completion fires only when pos === targetIndex (the actual correct
 * position). A doneRef guards against re-firing onComplete from
 * re-renders. Spamming "+1" cannot auto-complete unless the position
 * genuinely lands on the target.
 */
const NumberLineJumpPage: React.FC<NumberLineJumpPageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  const cfg = useMemo(() => getNumberLineConfig(value), [value]);
  const { start, targetIndex, overshootBuffer } = cfg;
  const maxPos = targetIndex + overshootBuffer;
  const trackDenom = targetIndex + overshootBuffer + 1;

  const [pos, setPos] = useState(0);
  const [hop, setHop] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setPos(0);
    setHop(0);
    doneRef.current = false;
    if (onComplete) onComplete(false);
  }, [value, onComplete]);

  useEffect(() => {
    if (pos === targetIndex && !doneRef.current) {
      doneRef.current = true;
      if (onComplete) onComplete(true);
    } else if (pos !== targetIndex) {
      doneRef.current = false;
    }
  }, [pos, targetIndex, onComplete]);

  const move = (delta: number) => {
    setPos((p) => Math.max(0, Math.min(maxPos, p + delta)));
    setHop((h) => h + 1);
  };

  const overshot = pos > targetIndex;
  const ticks = Array.from({ length: targetIndex + 1 }, (_, i) => i);

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="number-line-jump">
        <div className="number-line-jump-banner">
          اقفز بالضفدع حتى يصل إلى العدد {value} بالضبط — لا تتجاوزه!
        </div>

        <div className="number-line-jump-track" aria-label="خط الأعداد">
          <div
            className="number-line-jump-bar main"
            style={{
              right: `${(overshootBuffer / trackDenom) * 100}%`
            }}
          />
          <div
            className="number-line-jump-bar overshoot"
            style={{
              left: `${((targetIndex + 1) / trackDenom) * 100}%`,
              right: 0
            }}
          />
          {ticks.map((i) => {
            const num = start + i;
            return (
              <div
                key={i}
                className="number-line-jump-tick"
                style={{ left: `calc(${(i / trackDenom) * 100}% - 1px)` }}
              >
                <span className="number-line-jump-tick-label">{num}</span>
                {i === targetIndex && (
                  <span className="number-line-jump-flag" aria-label="الهدف">🏁</span>
                )}
              </div>
            );
          })}
          <div
            key={hop}
            className={`number-line-jump-frog ${overshot ? 'overshoot' : 'hop'}`}
            style={{ left: `${(pos / trackDenom) * 100}%` }}
            aria-label="الضفدع"
          >
            🐸
          </div>
        </div>

        {overshot ? (
          <p className="number-line-jump-message over">
            تجاوزتَ العدد {value}! اضغط «تراجع» للعودة
          </p>
        ) : (
          <p className="number-line-jump-message">
            المكان الحالي: {start + pos}
          </p>
        )}

        <div className="number-line-jump-controls">
          <button
            type="button"
            className="number-line-jump-btn back"
            onClick={() => move(-1)}
            disabled={pos === 0}
          >
            تراجع
          </button>
          <button
            type="button"
            className="number-line-jump-btn"
            onClick={() => move(1)}
            disabled={pos === maxPos}
          >
            قفزة
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NumberLineJumpPage;
