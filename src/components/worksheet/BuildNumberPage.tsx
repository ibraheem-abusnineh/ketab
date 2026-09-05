import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import './BuildNumberPage.css';

interface BuildNumberPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Build the Number: stack tens-rods and ones-cubes until the total
 * matches the target. Place-value exercise.
 *
 * Completion fires only when total === value (the actual correct
 * state). A doneRef guards against re-firing onComplete while the
 * user is still adjusting — spamming "+1" cannot auto-complete unless
 * the total genuinely lands on `value`.
 */
const BuildNumberPage: React.FC<BuildNumberPageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const doneRef = useRef(false);

  const total = tens * 10 + ones;

  useEffect(() => {
    if (total === value && !doneRef.current) {
      doneRef.current = true;
      if (onComplete) onComplete(true);
    } else if (total !== value) {
      doneRef.current = false;
    }
  }, [total, value, onComplete]);

  useEffect(() => {
    // Reset on value change
    setTens(0);
    setOnes(0);
    doneRef.current = false;
    if (onComplete) onComplete(false);
  }, [value, onComplete]);

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="build-number">
        <div className="build-number-banner">
          ابنِ العدد {value} باستخدام العشرات والآحاد.
        </div>

        <div className="build-number-canvas" aria-label="منطقة البناء">
          <div className="build-number-row">
            {Array.from({ length: tens }).map((_, i) => (
              <div className="build-number-ten" key={`t-${i}`} title="عشرة">
                {Array.from({ length: 10 }).map((__, j) => (
                  <div className="build-number-unit" key={`t-${i}-${j}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="build-number-row">
            {Array.from({ length: ones }).map((_, i) => (
              <span className="build-number-one" key={`o-${i}`} />
            ))}
          </div>
        </div>

        <div
          className={`build-number-total ${total > value ? 'over' : ''} ${total === value ? 'match' : ''}`}
        >
          {total}
        </div>

        {total > value && (
          <p className="build-number-warning">تجاوزت العدد! أزل بعض القطع</p>
        )}

        <div className="build-number-controls">
          <button
            type="button"
            className="build-number-btn primary"
            onClick={() => setTens((t) => t + 1)}
          >
            + عشرة
          </button>
          <button
            type="button"
            className="build-number-btn primary ones"
            onClick={() => setOnes((o) => o + 1)}
          >
            + واحد
          </button>
          <button
            type="button"
            className="build-number-btn"
            onClick={() => setTens((t) => Math.max(0, t - 1))}
            disabled={tens === 0}
          >
            − عشرة
          </button>
          <button
            type="button"
            className="build-number-btn"
            onClick={() => setOnes((o) => Math.max(0, o - 1))}
            disabled={ones === 0}
          >
            − واحد
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BuildNumberPage;
