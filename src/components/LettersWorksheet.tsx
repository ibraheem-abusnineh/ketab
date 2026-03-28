import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { lettersData, lettersOrder, letterInfo } from '../data/lettersData';
import VideoPopup from './VideoPopup';
import { LetterSquare, MatchingWord, GestureBox, Vowel, SyllablePair } from '../types';
import {
  IntroductionPage,
  VocabularyPage,
  WritingPracticePage,
  LetterRecognitionPage,
  SyllableWritingPage,
  VowelWritingPage,
  MatchingExercisePage
} from './worksheet';
import './LettersWorksheet.css';

const ArabicWorksheet: React.FC = () => {
  const { letter } = useParams<{ letter: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLetter, setSelectedLetter] = useState(letter || lettersOrder[0]);
  
  const [videoPopup, setVideoPopup] = useState<{ isOpen: boolean; videoUrl?: string; word?: string; isLocal?: boolean }>({
    isOpen: false
  });
  const [letterSquares, setLetterSquares] = useState<LetterSquare[]>([]);
  const [draggableCircles, setDraggableCircles] = useState<number[]>([]);
  const [matchingWords, setMatchingWords] = useState<MatchingWord[]>([]);
  const [gestureBoxes, setGestureBoxes] = useState<GestureBox[]>([]);
  const [gestureRowOrder, setGestureRowOrder] = useState<number[]>([]);

  const letterData = lettersData[selectedLetter];
  const letterInfoData = letterInfo[selectedLetter];

  useEffect(() => {
    if (letter && lettersData[letter]) {
      setSelectedLetter(letter);
    } else if (!letter) {
      setSelectedLetter(lettersOrder[0]);
    }
  }, [letter]);

  const updateLetterRecognitionExercise = useCallback(() => {
    if (!letterData) return;

    // Parse shapes from letter name
    let shapes = [selectedLetter];
    const match = letterData.name.match(/\(([^)]+)\)/);
    if (match) {
      shapes = match[1].split('-').map(s => s.trim()).filter(s => s);
    }

    // Generate random letters for the grid
    const allLetters = Object.keys(lettersData);
    const gridLetters: LetterSquare[] = [];
    
    // Add 4 instances of the target letter shapes
    for (let i = 0; i < 4; i++) {
      const shape = shapes[i % shapes.length];
      gridLetters.push({ letter: shape, isTarget: true });
    }
    
    // Add 8 random different letters
    const otherLetters = allLetters.filter(l => l !== selectedLetter);
    for (let i = 0; i < 8; i++) {
      const randomLetter = otherLetters[Math.floor(Math.random() * otherLetters.length)];
      let otherShape = randomLetter;
      const otherName = lettersData[randomLetter].name;
      const otherMatch = otherName.match(/\(([^)]+)\)/);
      if (otherMatch) {
        otherShape = otherMatch[1].split('-')[0].trim();
      }
      gridLetters.push({ letter: otherShape, isTarget: false });
    }

    // Shuffle the array
    for (let i = gridLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridLetters[i], gridLetters[j]] = [gridLetters[j], gridLetters[i]];
    }

    setLetterSquares(gridLetters);
    
    // Count target shapes and create draggable circles
    const targetCount = gridLetters.filter(l => l.isTarget).length;
    setDraggableCircles(Array.from({ length: targetCount }, (_, i) => i));
  }, [selectedLetter, letterData]);

  const updateMatchingExercise = useCallback(() => {
    if (!letterData) return;

    const words = letterData.vocab.slice(0, 3).map((item, index) => ({
      word: item.word,
      wordIndex: index,
      isMatched: false
    }));

    setMatchingWords(words);

    // Create gesture boxes for each word (preserve letter order within each word)
    const boxes: GestureBox[] = [];
    words.forEach((word, wordIndex) => {
      // Remove Arabic diacritics
      const wordLetters = word.word.replace(/[َُِّْ]/g, '');
      wordLetters.split('').forEach((wordLetter, letterIndex) => {
        boxes.push({
          letter: wordLetter,
          wordIndex,
          letterIndex,
          isMatched: false
        });
      });
    });

    setGestureBoxes(boxes);

    // Shuffle only the row order (which word row appears where), not letter order inside a row
    const order = words.map((_, idx) => idx);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setGestureRowOrder(order);
  }, [letterData]);

  useEffect(() => {
    if (letterData) {
      updateLetterRecognitionExercise();
      updateMatchingExercise();
    }
  }, [selectedLetter, letterData, updateLetterRecognitionExercise, updateMatchingExercise]);

  const handleLetterSelect = (newLetter: string) => {
    setSelectedLetter(newLetter);
    setCurrentPage(1);
    navigate(`/worksheet/${newLetter}`);
  };

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    const maxPages = 7;
    
    if (newPage < 1) {
      navigate('/letters');
      return;
    }
    
    if (newPage > maxPages) {
      const currentIndex = lettersOrder.indexOf(selectedLetter);
      const nextIndex = (currentIndex + 1) % lettersOrder.length;
      const nextLetter = lettersOrder[nextIndex];
      setCurrentPage(1);
      navigate(`/worksheet/${nextLetter}`);
      return;
    }
    
    setCurrentPage(newPage);
  };

  const handleDragStart = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData('text/plain', letter);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (letterSquares[index].isTarget && !letterSquares[index].hasDroppedCircle) {
      e.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const draggedLetter = e.dataTransfer.getData('text/plain');
    const square = letterSquares[index];
    
    if (square.isTarget && !square.hasDroppedCircle && draggedLetter === selectedLetter) {
      setLetterSquares(prev => 
        prev.map((sq, i) => 
          i === index ? { ...sq, hasDroppedCircle: true } : sq
        )
      );
      setDraggableCircles(prev => prev.slice(1));
    }
  };

  const handleWordDragStart = (e: React.DragEvent, wordIndex: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ wordIndex }));
  };

  const handleGestureDragOver = (e: React.DragEvent, wordIndex: number) => {
    e.preventDefault();
    const gestureRow = (e.currentTarget as HTMLElement).closest('.gesture-row-matching');
    if (gestureRow && !gestureRow.classList.contains('has-word')) {
      gestureRow.classList.add('drag-over');
    }
  };

  const handleGestureDragLeave = (e: React.DragEvent) => {
    const gestureRow = (e.currentTarget as HTMLElement).closest('.gesture-row-matching');
    if (gestureRow) {
      gestureRow.classList.remove('drag-over');
    }
  };

  const handleGestureDrop = (e: React.DragEvent, targetWordIndex: number) => {
    e.preventDefault();
    const gestureRow = (e.currentTarget as HTMLElement).closest('.gesture-row-matching');
    if (gestureRow) {
      gestureRow.classList.remove('drag-over');
    }

    if (gestureRow && gestureRow.classList.contains('has-word')) {
      return;
    }

    const raw = e.dataTransfer.getData('text/plain');
    let draggedWordIndex: number | null = null;
    try {
      const draggedData = JSON.parse(raw);
      draggedWordIndex = Number(draggedData.wordIndex);
    } catch {
      // If JSON parse fails, ignore
    }
    if (draggedWordIndex === null || Number.isNaN(draggedWordIndex)) return;

    if (draggedWordIndex === targetWordIndex) {
      setMatchingWords(prev => 
        prev.map((word, i) => 
          i === draggedWordIndex ? { ...word, isMatched: true } : word
        )
      );
      
      if (gestureRow) {
        gestureRow.classList.add('matched', 'has-word');
      }
    }
  };

  const openVideoPopup = (videoUrl: string, word?: string, isLocal = false) => {
    setVideoPopup({ isOpen: true, videoUrl, word, isLocal });
  };

  const closeVideoPopup = () => {
    setVideoPopup({ isOpen: false });
  };

  const vowels: Vowel[] = [
    { symbol: 'َ', name: 'فَتْحَة' },
    { symbol: 'ُ', name: 'ضَمَّة' },
    { symbol: 'ِ', name: 'كَسْرَة' }
  ];

  const syllablePairs: SyllablePair[] = [
    { letter: selectedLetter, vowel: 'ا' },
    { letter: selectedLetter, vowel: 'و' },
    { letter: selectedLetter, vowel: 'ي' }
  ];

  if (!letterData) {
    return <div>Letter not found</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="worksheet-container">
        <div className="logo-top-left">
          <img src={`${process.env.PUBLIC_URL}/qra-logo.svg`} alt="Logo" />
        </div>
        {/* Decorative corner elements to match original styling */}
        <div className="corner-decoration top-left" />
        <div className="corner-decoration top-right" />
        <div className="corner-decoration bottom-left" />
        <div className="corner-decoration bottom-right" />

        <div className="letter-selector">
          <label htmlFor="letterSelect">اخترِ الحَرْفَ:</label>
          <select 
            id="letterSelect" 
            value={selectedLetter} 
            onChange={(e) => handleLetterSelect(e.target.value)}
          >
            {lettersOrder.map(letter => (
              <option key={letter} value={letter}>
                {letter} - {lettersData[letter].name}
              </option>
            ))}
          </select>
        </div>

        {/* Page 1: Introduction */}
        {currentPage === 1 && (
          <IntroductionPage
            selectedLetter={selectedLetter}
            letterData={letterData}
            letterInfoData={letterInfoData}
          />
        )}

        {/* Page 2: Vocabulary */}
        {currentPage === 2 && (
          <VocabularyPage
            letterData={letterData}
            selectedLetter={selectedLetter}
            onVideoClick={openVideoPopup}
          />
        )}

        {/* Page 3: Writing Practice */}
        {currentPage === 3 && (
          <WritingPracticePage
            letterData={letterData}
            selectedLetter={selectedLetter}
          />
        )}

        {/* Page 4: Letter Recognition */}
        {currentPage === 4 && (
          <LetterRecognitionPage
            letterSquares={letterSquares}
            draggableCircles={draggableCircles}
            selectedLetter={selectedLetter}
            letterData={letterData}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}

        {/* Page 5: Syllable Writing */}
        {currentPage === 5 && (
          <SyllableWritingPage
            selectedLetter={selectedLetter}
            syllablePairs={syllablePairs}
            isEnglish={false}
          />
        )}

        {/* Page 6: Vowel Writing */}
        {currentPage === 6 && (
          <VowelWritingPage
            selectedLetter={selectedLetter}
            vowels={vowels}
            isEnglish={false}
          />
        )}

        {/* Page 7: Matching Exercise */}
        {currentPage === 7 && (
          <MatchingExercisePage
            matchingWords={matchingWords}
            gestureBoxes={gestureBoxes}
            gestureRowOrder={gestureRowOrder}
            onWordDragStart={handleWordDragStart}
            onGestureDragOver={handleGestureDragOver}
            onGestureDragLeave={handleGestureDragLeave}
            onGestureDrop={handleGestureDrop}
          />
        )}

        {/* Footer */}
        <div className="footer">
          الْتَعَلُمْ الْمُمْتِعْ
        </div>

        {/* Navigation */}
        <div className="book-navigation">
          <button onClick={() => handlePageChange(-1)}>
            الصفحة السابقة
          </button>
          <span className="page-indicator">
            صفحة {currentPage} من 7
          </span>
          <button onClick={() => handlePageChange(1)}>
            الصفحة التالية
          </button>
          <button 
            className="back-to-index" 
            onClick={() => navigate('/letters')}
            style={{ marginRight: '10px' }}
          >
            عودة إلى فهرس الحروف
          </button>
        </div>
      </div>

      <VideoPopup
        isOpen={videoPopup.isOpen}
        onClose={closeVideoPopup}
        videoUrl={videoPopup.videoUrl}
        word={videoPopup.word}
        isLocal={videoPopup.isLocal}
      />
    </DndProvider>
  );
};

export default ArabicWorksheet;
