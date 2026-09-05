import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import { getNeighborTargets } from '../../utils/numberExercises';
import './NumberNeighborsPage.css';

interface NumberNeighborsPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Number Neighbors: pick the number(s) that come BEFORE the target.
 * Uses the tap-to-select / tap-to-place pattern from the prototype —
 * the prototype doesn't use react-dnd for this either.
 *
 * Completion fires only when every slot is filled with the actual
 * correct neighbor (in correct order). Tapping a wrong tile shakes
 * the slot and clears the selection; spamming the same tile never
 * auto-completes.
 */
const NumberNeighborsPage: React.FC<NumberNeighborsPageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  const targets = useMemo(() => getNeighborTargets(value), [value]);

  // Distractors are smaller numbers strictly below the targets — never > value.
  const distractorPool = useMemo(() => {
    const out = new Set<number>();
    for (let v = value - 1; v >= 0 && out.size < 4; v--) {
      if (!targets.includes(v)) out.add(v);
    }
    return Array.from(out);
  }, [value, targets]);

  const tiles = useMemo(() => [...targets, ...distractorPool].sort((a, b) => a - b), [targets, distractorPool]);

  const [slots, setSlots] = useState<(number | null)[]>(() => targets.map(() => null));
  const [selected, setSelected] = useState<number | null>(null);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => {
    if (slots.every((s) => s !== null)) {
      const isCorrect = slots.every((v, i) => v === targets[i]);
      if (isCorrect) {
        setCelebrate((c) => c + 1);
        if (onComplete) onComplete(true);
      }
    }
  }, [slots, targets, onComplete]);

  const place = (slotIndex: number) => {
    if (selected === null || slots[slotIndex] !== null) return;
    if (selected === targets[slotIndex]) {
      setSlots((prev) => prev.map((v, i) => (i === slotIndex ? selected : v)));
      setSelected(null);
    } else {
      setShakeSlot(slotIndex);
      setTimeout(() => setShakeSlot(null), 450);
      setSelected(null);
    }
  };

  const labels = targets.length === 2 ? ['قبل قبله', 'قبله'] : ['قبله'];

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="number-neighbors">
        <div className="number-neighbors-banner">
          ما هو العدد الذي يأتي قبل العدد {value}؟
        </div>

        <div className="number-neighbors-slots">
          {targets.map((_, i) => (
            <button
              type="button"
              key={i}
              className={`number-neighbors-slot ${slots[i] !== null ? 'filled' : ''} ${shakeSlot === i ? 'shake' : ''}`}
              onClick={() => place(i)}
              aria-label={`المكان ${i + 1}`}
            >
              <span>{slots[i] ?? '؟'}</span>
              <span className="number-neighbors-slot-label">{labels[i]}</span>
            </button>
          ))}
          <div className="number-neighbors-target">{value}</div>
        </div>

        <div className="number-neighbors-tiles">
          {tiles.map((t) => {
            const used = slots.includes(t);
            return (
              <button
                type="button"
                key={t}
                className={`number-neighbors-tile ${selected === t ? 'selected' : ''} ${used ? 'disabled' : ''}`}
                onClick={() => setSelected(t)}
                disabled={used}
              >
                {t}
              </button>
            );
          })}
        </div>

        <p className="number-neighbors-hint">اختر رقمًا ثم اضغط على المكان الصحيح</p>
      </div>
    </motion.div>
  );
};

export default NumberNeighborsPage;
