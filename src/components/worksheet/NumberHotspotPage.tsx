import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberNumeral } from '../../types';
import './NumberHotspotPage.css';

interface NumberHotspotPageProps {
  src: string;
  numerals: NumberNumeral[];
  onComplete?: (complete: boolean) => void;
}

/**
 * Tap-to-find hotspots layered over a worksheet PNG. Used by
 * `countChoose` and `circleFind` page types. Tap a `correct: true`
 * numeral → bounce + green ring + mark found. Tap any other
 * numeral → shake.
 *
 * The completion guard matches the prototype: `onComplete(true)`
 * is called from inside the `setFound` updater when the new
 * `Set`'s size reaches `totalCorrect`. The early `if (found.has(idx))`
 * guard on the entry path plus React's deduplication of identical
 * state updates makes this safe under StrictMode's double-invoke.
 */
const NumberHotspotPage: React.FC<NumberHotspotPageProps> = ({
  src,
  numerals,
  onComplete,
}) => {
  const totalCorrect = numerals.filter((n) => n.correct).length;
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  // Reset completion when the page changes (different numerals).
  useEffect(() => {
    setFound(new Set());
    setWrongIdx(null);
    if (onComplete) onComplete(false);
  }, [src, numerals, onComplete]);

  const click = (idx: number) => {
    const n = numerals[idx];
    if (!n) return;
    if (!n.correct) {
      setWrongIdx(idx);
      window.setTimeout(() => setWrongIdx((cur) => (cur === idx ? null : cur)), 400);
      return;
    }
    if (found.has(idx)) return;
    setFound((prev) => {
      const next = new Set(prev);
      next.add(idx);
      if (next.size >= totalCorrect && onComplete) onComplete(true);
      return next;
    });
  };

  return (
    <motion.div
      className="number-hotspot"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="number-hotspot-board">
        <img
          src={src}
          alt=""
          className="number-hotspot-image"
          draggable={false}
        />
        {numerals.map((num, idx) => {
          const isFound = found.has(idx);
          const isWrong = wrongIdx === idx;
          const className = [
            'number-hotspot-cell',
            isFound ? 'is-found' : '',
            isWrong ? 'is-wrong' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={idx}
              type="button"
              className={className}
              style={{
                left: `${num.xPct}%`,
                top: `${num.yPct}%`,
                width: `${num.wPct}%`,
                height: `${num.hPct}%`,
              }}
              onClick={() => click(idx)}
              aria-label={num.correct ? 'إجابة صحيحة' : 'إجابة خاطئة'}
            >
              {isFound && <span className="number-hotspot-ring" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <p className="number-hotspot-status">
        وجدتُ {found.size} من {totalCorrect}
      </p>
    </motion.div>
  );
};

export default NumberHotspotPage;
