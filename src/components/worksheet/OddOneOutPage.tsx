import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import { getOddOneOutCards, OddOneOutCard } from '../../utils/numberExercises';
import './OddOneOutPage.css';

interface OddOneOutPageProps {
  numberData: NumberData;
  onComplete?: (complete: boolean) => void;
}

/**
 * Odd One Out: shape-discrimination task. The child must click every
 * real numeral among mirrored / reversed / off-by-one decoys. Decoys
 * may be any digit (this is the one exercise that does not respect
 * the "never exceed target" rule).
 *
 * Completion fires only when every correct card has been found.
 */
const OddOneOutPage: React.FC<OddOneOutPageProps> = ({
  numberData,
  onComplete
}) => {
  const { value } = numberData;
  const cards = useMemo<OddOneOutCard[]>(
    () => getOddOneOutCards(value, value * 11 + 5),
    [value]
  );
  const totalCorrect = cards.filter((c) => c.correct).length;
  const [found, setFound] = useState<Set<number>>(() => new Set());
  const [wrongId, setWrongId] = useState<number | null>(null);

  const click = (card: OddOneOutCard) => {
    if (found.has(card.id)) return;
    if (card.correct) {
      setFound((prev) => {
        const next = new Set(prev);
        next.add(card.id);
        if (next.size >= totalCorrect && onComplete) onComplete(true);
        return next;
      });
    } else {
      setWrongId(card.id);
      setTimeout(() => setWrongId(null), 450);
    }
  };

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="odd-one-out">
        <div className="odd-one-out-banner">
          اعثر على كل بطاقات العدد {value} الحقيقية! بعضها مخادع.
        </div>

        <div className="odd-one-out-grid">
          {cards.map((c) => (
            <button
              type="button"
              key={c.id}
              className={[
                'odd-one-out-card',
                c.mirror ? 'mirrored' : '',
                found.has(c.id) ? 'correct' : '',
                wrongId === c.id ? 'wrong' : '',
                found.has(c.id) ? 'disabled' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => click(c)}
              disabled={found.has(c.id)}
              aria-label={`بطاقة ${c.display}`}
            >
              {c.display}
            </button>
          ))}
        </div>

        <div className="odd-one-out-status">
          وجدتُ {found.size} من {totalCorrect}
        </div>
      </div>
    </motion.div>
  );
};

export default OddOneOutPage;
