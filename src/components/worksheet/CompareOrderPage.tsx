import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import { getCompareOrderTiles } from '../../utils/numberExercises';
import './CompareOrderPage.css';

interface CompareOrderPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Compare & Order: drag three tiles into ascending-order slots.
 * Tap-to-select / tap-to-place pattern (matching the prototype).
 * Completion fires only when every slot holds the actual correct
 * value (ascending order). A wrong arrangement shakes the slots
 * and resets them.
 */
const CompareOrderPage: React.FC<CompareOrderPageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  const tiles = useMemo(() => getCompareOrderTiles(value, value * 17 + 3), [value]);
  const correctOrder = useMemo(
    () => [...tiles].sort((a, b) => a.value - b.value).map((t) => t.id),
    [tiles]
  );

  const [slots, setSlots] = useState<(string | null)[]>(() => tiles.map(() => null));
  const [selected, setSelected] = useState<string | null>(null);
  const [shakeAll, setShakeAll] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (slots.every((s) => s !== null)) {
      const isCorrect = slots.every((s, i) => s === correctOrder[i]);
      if (isCorrect) {
        setDone(true);
        if (onComplete) onComplete(true);
      } else {
        setShakeAll((s) => s + 1);
        setTimeout(() => setSlots(tiles.map(() => null)), 600);
      }
    }
  }, [slots, correctOrder, tiles, onComplete]);

  const placeIn = (i: number) => {
    if (selected === null || slots[i] !== null) return;
    setSlots((prev) => prev.map((v, idx) => (idx === i ? selected : v)));
    setSelected(null);
  };

  const placedIds = slots.filter(Boolean);

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="compare-order">
        <div className="compare-order-banner">
          رتّب الأعداد من الأصغر إلى الأكبر.
        </div>

        <div className="compare-order-slots" key={shakeAll}>
          {slots.map((s, i) => {
            const tile = tiles.find((t) => t.id === s);
            return (
              <button
                type="button"
                key={i}
                className={`compare-order-slot ${done ? 'done' : ''} ${shakeAll > 0 ? 'shake' : ''}`}
                onClick={() => placeIn(i)}
                aria-label={`المكان ${i + 1}`}
              >
                {tile ? tile.value : ''}
              </button>
            );
          })}
        </div>

        <div className="compare-order-tiles">
          {tiles
            .filter((t) => !placedIds.includes(t.id))
            .map((t) => (
              <button
                type="button"
                key={t.id}
                className={`compare-order-tile ${selected === t.id ? 'selected' : ''}`}
                onClick={() => setSelected(t.id)}
              >
                {t.value}
              </button>
            ))}
        </div>

        {done && (
          <div className="compare-order-result">
            {correctOrder.map((id) => tiles.find((t) => t.id === id)!.value).join('  <  ')}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompareOrderPage;
