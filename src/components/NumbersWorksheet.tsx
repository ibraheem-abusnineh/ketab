import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { numbersData, numbersOrder } from '../data/numbersData';
import { NumberData } from '../types';
import {
  NumberIntroductionPage,
  NumberTracingPage,
  NumberNeighborsPage,
  MissingSequencePage,
  BuildNumberPage,
  OddOneOutPage,
  CompareOrderPage,
  NumberLineJumpPage
} from './worksheet';
import LogoWithImage from './LogoWithImage';
import './NumbersWorksheet.css';

const TOTAL_PAGES = 8;

// Page keys: 1=intro, 2=trace, 3=neighbors, 4=missing,
// 5=build, 6=odd-one-out, 7=compare-order, 8=number-line-jump.
const PAGE_LABELS: Record<number, string> = {
  1: 'تعرّف',
  2: 'تتبّع',
  3: 'الجيران',
  4: 'الناقص',
  5: 'ابنِ',
  6: 'الدخيل',
  7: 'رتّب',
  8: 'اقفز'
};

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
  const [currentPage, setCurrentPage] = useState(1);

  // Per-step completion flags. The Intro page is auto-complete (viewing step).
  const [traceDone, setTraceDone] = useState(false);
  const [neighborsDone, setNeighborsDone] = useState(false);
  const [missingDone, setMissingDone] = useState(false);
  const [buildDone, setBuildDone] = useState(false);
  const [oddDone, setOddDone] = useState(false);
  const [compareDone, setCompareDone] = useState(false);
  const [lineDone, setLineDone] = useState(false);

  const numberData: NumberData = numbersData[selectedNumber];

  useEffect(() => {
    if (!Number.isNaN(parsed) && numbersOrder.includes(parsed) && parsed !== selectedNumber) {
      setSelectedNumber(parsed);
      setCurrentPage(1);
    }
  }, [parsed, selectedNumber]);

  // Reset completion when the selected number changes.
  useEffect(() => {
    setTraceDone(false);
    setNeighborsDone(false);
    setMissingDone(false);
    setBuildDone(false);
    setOddDone(false);
    setCompareDone(false);
    setLineDone(false);
    setCurrentPage(1);
  }, [selectedNumber]);

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

  const isStepComplete = useCallback(
    (page: number): boolean => {
      switch (page) {
        case 1: return true;            // intro is auto-complete
        case 2: return traceDone;
        case 3: return neighborsDone;
        case 4: return missingDone;
        case 5: return buildDone;
        case 6: return oddDone;
        case 7: return compareDone;
        case 8: return lineDone;
        default: return false;
      }
    },
    [
      traceDone, neighborsDone, missingDone, buildDone,
      oddDone, compareDone, lineDone
    ]
  );

  const goPrev = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    } else {
      navigate('/numbers');
    }
  };

  const goNext = () => {
    if (currentPage < TOTAL_PAGES) {
      setCurrentPage((p) => p + 1);
    } else {
      // last page — advance to the next number (or back to index)
      const idx = numbersOrder.indexOf(selectedNumber);
      if (idx >= 0 && idx < numbersOrder.length - 1) {
        const next = numbersOrder[idx + 1];
        setSelectedNumber(next);
        navigate(`/worksheet/${next}`);
      } else {
        navigate('/numbers');
      }
    }
  };

  if (!numberData) {
    return <div>Number not found</div>;
  }

  const completed = isStepComplete(currentPage);

  return (
    <div className="numbers-worksheet-container" dir="rtl">
      <div className="logo-top-left">
        <LogoWithImage logoPath="qra-logo.svg" />
      </div>

      <div className="numbers-worksheet-header">
        <h1>الْعددُ {selectedNumber}</h1>
        <h2>{PAGE_LABELS[currentPage]}</h2>
      </div>

      <div className="numbers-worksheet-dots" aria-hidden="true">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
          const page = i + 1;
          const cls =
            page === currentPage
              ? 'numbers-worksheet-dot active'
              : page < currentPage
                ? 'numbers-worksheet-dot done'
                : 'numbers-worksheet-dot';
          return <span key={page} className={cls} />;
        })}
      </div>

      <div className="numbers-worksheet-page">
        {currentPage === 1 && <NumberIntroductionPage numberData={numberData} />}
        {currentPage === 2 && (
          <NumberTracingPage numberData={numberData} onComplete={setTraceDone} />
        )}
        {currentPage === 3 && (
          <NumberNeighborsPage numberData={numberData} onComplete={setNeighborsDone} />
        )}
        {currentPage === 4 && (
          <MissingSequencePage numberData={numberData} onComplete={setMissingDone} />
        )}
        {currentPage === 5 && (
          <BuildNumberPage numberData={numberData} onComplete={setBuildDone} />
        )}
        {currentPage === 6 && (
          <OddOneOutPage numberData={numberData} onComplete={setOddDone} />
        )}
        {currentPage === 7 && (
          <CompareOrderPage numberData={numberData} onComplete={setCompareDone} />
        )}
        {currentPage === 8 && (
          <NumberLineJumpPage numberData={numberData} onComplete={setLineDone} />
        )}
      </div>

      <div className="numbers-worksheet-nav">
        <button type="button" onClick={goPrev}>
          السابق
        </button>
        <span className="indicator">
          خطوة {currentPage} من {TOTAL_PAGES}
        </span>
        <button
          type="button"
          className="primary"
          onClick={goNext}
          disabled={!completed}
        >
          {currentPage === TOTAL_PAGES ? 'إنهاء' : 'التالي'}
        </button>
      </div>

      <div className="numbers-worksheet-footer">الْتَعَلُمْ الْمُمْتِعْ</div>
    </div>
  );
};

export default NumbersWorksheet;
