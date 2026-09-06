import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { numbersData, numbersOrder } from '../data/numbersData';
import { NumberData, NumberPageType } from '../types';
import {
  VideoSlot,
  NumberDrawablePage,
  NumberHotspotPage,
} from './worksheet';
import './NumbersWorksheet.css';

const PAGE_ORDER = ['1', '2', '3', '4', '5', '6'];

const isDrawType = (type: NumberPageType): boolean =>
  type === 'write' || type === 'trace' || type === 'color';

interface IconProps {
  size?: number;
}

/* Minimal inline SVG icons to avoid adding a lucide-react dependency.
   The shapes mirror what lucide's Home / ArrowLeft / ArrowRight /
   RotateCcw / PartyPopper rendered for us. */
const HomeIcon: React.FC<IconProps> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12 12 4l9 8" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);
const ArrowLeftIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);
const ArrowRightIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
const RotateCcwIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
const PartyPopperIcon: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.8 11.3 2 22l10.7-3.79" />
    <path d="M4 3h.01" />
    <path d="M22 8h.01" />
    <path d="M15 2h.01" />
    <path d="M22 20h.01" />
    <path d="M9 9a3 3 0 1 0 6 0 3 3 0 1 0-6 0Z" />
  </svg>
);

const NumbersWorksheet: React.FC = () => {
  // The route path is `/worksheet/:letter` — React Router exposes the
  // path segment under the literal name `letter` regardless of the
  // unit being a letter or a number.
  const { letter } = useParams<{ letter: string }>();
  const navigate = useNavigate();

  const parsed = letter ? parseInt(letter, 10) : NaN;
  const initial =
    !Number.isNaN(parsed) && numbersOrder.includes(parsed)
      ? parsed
      : numbersOrder[0];

  const [selectedNumber, setSelectedNumber] = useState<number>(initial);
  const [pageIdx, setPageIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [finished, setFinished] = useState(false);

  const numberData: NumberData | undefined = numbersData[selectedNumber];
  const pageKey = useMemo(() => PAGE_ORDER[pageIdx], [pageIdx]);
  const page = numberData?.pages[pageKey];

  // Sync URL → state when the user navigates /worksheet/:n directly.
  useEffect(() => {
    if (!Number.isNaN(parsed) && numbersOrder.includes(parsed) && parsed !== selectedNumber) {
      setSelectedNumber(parsed);
      setPageIdx(0);
      setCompleted(false);
      setDrawn(false);
      setFinished(false);
    }
  }, [parsed, selectedNumber]);

  // Reset completion when the selected number changes.
  const restartAll = useCallback(() => {
    setPageIdx(0);
    setCompleted(false);
    setDrawn(false);
    setFinished(false);
  }, []);

  useEffect(() => {
    restartAll();
  }, [selectedNumber, restartAll]);

  useEffect(() => {
    const titleBeforePrint = document.title;
    const onBeforePrint = () => {
      document.title = 'Ketab';
    };
    const onAfterPrint = () => {
      document.title = titleBeforePrint;
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  const resetStepState = () => {
    setCompleted(false);
    setDrawn(false);
  };

  const goPrev = () => {
    if (pageIdx > 0) {
      setPageIdx(pageIdx - 1);
      resetStepState();
    } else {
      navigate('/numbers');
    }
  };

  const goNext = () => {
    if (pageIdx < PAGE_ORDER.length - 1) {
      setPageIdx(pageIdx + 1);
      resetStepState();
    } else {
      setFinished(true);
    }
  };

  const goHome = () => navigate('/letters');

  // After the user finishes a number's last page, wait briefly so they
  // see the celebratory screen, then auto-advance to the next number.
  // On the last number (10) we keep the existing "أتقنت كل الأعداد" menu
  // so the user has somewhere to go from here.
  useEffect(() => {
    if (!finished) return;
    const currentIndex = numbersOrder.indexOf(selectedNumber);
    const isLastNumber = currentIndex === numbersOrder.length - 1;
    if (isLastNumber || currentIndex < 0) return;
    const nextNumber = numbersOrder[currentIndex + 1];
    const timer = setTimeout(() => {
      navigate(`/worksheet/${nextNumber}`);
    }, 1000);
    return () => clearTimeout(timer);
  }, [finished, selectedNumber, navigate]);

  if (!numberData || !page) {
    return <div>Number not found</div>;
  }

  let stepComplete = true;
  if (isDrawType(page.type)) stepComplete = drawn;
  else if (page.numerals) stepComplete = completed;

  const isLastPage = pageIdx === PAGE_ORDER.length - 1;

  return (
    <div className="numbers-worksheet-container" dir="rtl">
      {!finished && (
        <>
          <div className="numbers-worksheet-header">
            <button
              type="button"
              className="numbers-worksheet-home-btn"
              onClick={goHome}
              aria-label="القائمة"
            >
              <HomeIcon />
            </button>
            <div className="numbers-worksheet-dots" aria-hidden="true">
              {PAGE_ORDER.map((k, i) => (
                <span
                  key={k}
                  className={`numbers-worksheet-dot ${i === pageIdx ? 'active' : ''} ${i < pageIdx ? 'done' : ''}`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedNumber}-${pageKey}`}
              className="numbers-worksheet-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {page.type === 'learn' && (
                <div className="numbers-worksheet-learn">
                  <img
                    src={page.image}
                    alt=""
                    className="numbers-worksheet-learn-image"
                  />
                  <VideoSlot videoUrl={numberData.videoUrl} />
                </div>
              )}
              {isDrawType(page.type) && (
                <NumberDrawablePage
                  src={page.image}
                  showPalette={page.type === 'color'}
                  onComplete={setDrawn}
                />
              )}
              {page.numerals && (
                <NumberHotspotPage
                  src={page.image}
                  numerals={page.numerals}
                  onComplete={setCompleted}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="numbers-worksheet-nav">
            <button type="button" className="outline-btn" onClick={goPrev}>
              <ArrowRightIcon /> السابق
            </button>
            <button
              type="button"
              className={`primary-btn ${stepComplete ? 'glow' : ''}`}
              onClick={goNext}
              disabled={!stepComplete}
            >
              {isLastPage ? (
                <>
                  <PartyPopperIcon /> إنهاء
                </>
              ) : (
                <>
                  التالي <ArrowLeftIcon />
                </>
              )}
            </button>
          </div>
        </>
      )}

      {finished && (() => {
        const currentIndex = numbersOrder.indexOf(selectedNumber);
        const isLastNumber = currentIndex === numbersOrder.length - 1;
        const nextNumber = isLastNumber ? null : numbersOrder[currentIndex + 1];
        return (
          <div className="numbers-worksheet-finished">
            <div className="numbers-worksheet-finished-emoji" aria-hidden="true">
              🏆
            </div>
            <h2 className="numbers-worksheet-finished-heading">
              {isLastNumber
                ? 'أحسنت! أتقنت كل الأعداد'
                : `أحسنت! أتقنتَ العدد ${numberData.value}`}
            </h2>
            {!isLastNumber && (
              <p className="numbers-worksheet-finished-hint">
                الانتقال إلى العدد {nextNumber}…
              </p>
            )}
            <div className="numbers-worksheet-finished-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  restartAll();
                }}
              >
                <RotateCcwIcon /> إعادة
              </button>
              <button type="button" className="outline-btn" onClick={goHome}>
                <HomeIcon />
                {isLastNumber ? ' العودة إلى القائمة' : ' القائمة'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default NumbersWorksheet;
