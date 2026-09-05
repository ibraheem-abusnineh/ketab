import React from 'react';
import { motion } from 'framer-motion';
import { NumberData } from '../../types';
import NumberSignImage from '../NumberSignImage';
import './NumberIntroductionPage.css';

interface NumberIntroductionPageProps {
  numberData: NumberData;
}

/**
 * Learn step: big numeral + Arabic word + tens/ones dot grid,
 * plus a video slot and a hand-sign (Arabic sign language) image slot.
 *
 * The Intro page is always considered complete (it's a viewing step);
 * the orchestrator (NumbersWorksheet) is expected to enable Next for
 * this page without consulting an onComplete callback.
 */
const NumberIntroductionPage: React.FC<NumberIntroductionPageProps> = ({ numberData }) => {
  const { value, word, videoUrl, signImageUrl } = numberData;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const rows: number[] = [];
  for (let r = 0; r < tens; r++) rows.push(10);
  if (ones > 0) rows.push(ones);

  let dotCounter = 0;

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="number-introduction">
        <div className="number-introduction-banner">
          الْعددُ {word}.
        </div>

        <div className="number-introduction-row">
          <div className="number-introduction-numeral-and-word">
            <div className="number-introduction-numeral">{value}</div>
            <div className="number-introduction-word">{word}</div>
          </div>

          <div className="number-introduction-dots" aria-hidden="true">
            {rows.map((count, ri) => (
              <div className="number-introduction-dot-row" key={ri}>
                {Array.from({ length: count }).map((_, ci) => {
                  dotCounter += 1;
                  return (
                    <span
                      className="number-introduction-dot"
                      key={ci}
                      style={{ animationDelay: `${dotCounter * 0.02}s` }}
                    >
                      ⚫
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="number-introduction-slots">
          <div
            className={`number-introduction-slot ${videoUrl ? 'has-asset' : ''}`}
            aria-label={videoUrl ? `فيديو العدد ${value}` : 'مكان فيديو العدد'}
          >
            {videoUrl ? (
              <video src={videoUrl} controls />
            ) : (
              <>
                <span className="number-introduction-slot-icon" aria-hidden="true">▶</span>
                <span className="number-introduction-slot-label">
                  فيديو الشرح — سيضاف لاحقًا
                </span>
              </>
            )}
          </div>
          <div
            className={`number-introduction-slot ${signImageUrl ? 'has-asset' : ''}`}
          >
            <NumberSignImage number={value} src={signImageUrl} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NumberIntroductionPage;
