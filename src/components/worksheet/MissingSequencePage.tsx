import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import { getMissingSequence } from '../../utils/numberExercises';
import './MissingSequencePage.css';

interface MissingSequencePageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Missing Sequence: a short run of consecutive numbers ending at the
 * target has one slot blanked; the child picks the missing number
 * from a set of choices. Every shown number and every distractor is
 * strictly <= value (the generator enforces this).
 */
const MissingSequencePage: React.FC<MissingSequencePageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  // Use value as the seed so the missing slot is stable per-number.
  const puzzle = useMemo(() => getMissingSequence(value * 13 + 7, value), [value]);
  const { sequence, missing, choices } = puzzle;

  const [filled, setFilled] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);

  const pick = (c: number) => {
    if (filled) return;
    if (c === missing) {
      setFilled(true);
      if (onComplete) onComplete(true);
    } else {
      setWrong(c);
      setTimeout(() => setWrong(null), 450);
    }
  };

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="missing-sequence">
        <div className="missing-sequence-banner">
          ما هو العدد الناقص في التسلسل؟
        </div>

        <div className="missing-sequence-row">
          {sequence.map((n, i) => (
            <div
              key={i}
              className={`missing-sequence-cell ${n === null ? 'blank' : ''} ${n === null && filled ? 'filled' : ''}`}
            >
              {n === null ? (filled ? missing : '؟') : n}
            </div>
          ))}
        </div>

        <div className="missing-sequence-choices">
          {choices.map((c) => (
            <button
              type="button"
              key={c}
              className={`missing-sequence-tile ${wrong === c ? 'wrong' : ''} ${filled ? 'disabled' : ''}`}
              onClick={() => pick(c)}
              disabled={filled}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default MissingSequencePage;
