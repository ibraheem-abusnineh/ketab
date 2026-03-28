import React from 'react';
import LetterImage from '../LetterImage';
import { MatchingWord, GestureBox } from '../../types';

interface MatchingExercisePageProps {
  matchingWords: MatchingWord[];
  gestureBoxes: GestureBox[];
  gestureRowOrder: number[];
  onWordDragStart: (e: React.DragEvent, wordIndex: number) => void;
  onGestureDragOver: (e: React.DragEvent, wordIndex: number) => void;
  onGestureDragLeave: (e: React.DragEvent) => void;
  onGestureDrop: (e: React.DragEvent, targetWordIndex: number) => void;
  isEnglish?: boolean;
}

const MatchingExercisePage: React.FC<MatchingExercisePageProps> = ({
  matchingWords,
  gestureBoxes,
  gestureRowOrder,
  onWordDragStart,
  onGestureDragOver,
  onGestureDragLeave,
  onGestureDrop,
  isEnglish = false
}) => {
  const displayOrder = gestureRowOrder.length ? gestureRowOrder : matchingWords.map((_, i) => i);

  return (
    <div className="book-page active">
      <div className="matching-section">
        <h3>
          {isEnglish
            ? 'Match each word with its sign language letters:'
            : 'أَرْبُطُ بَيْنَ الْكَلِمَةِ وَحُرُوفِهَا الْإِشَارِيّة:'}
        </h3>
        <div className="matching-grid">
          <div className="word-column">
            {matchingWords.map((word, index) => (
              <div
                key={index}
                className={`word-item ${word.isMatched ? 'dropped' : ''}`}
                draggable={!word.isMatched}
                onDragStart={(e) => onWordDragStart(e, index)}
              >
                {word.word}
              </div>
            ))}
          </div>
          <div className="gestures-column">
            {displayOrder.map((wordIndex) => (
              <div
                key={wordIndex}
                className="gesture-row-matching"
                data-word-index={wordIndex}
                onDragOver={(e) => onGestureDragOver(e, wordIndex)}
                onDragLeave={onGestureDragLeave}
                onDrop={(e) => onGestureDrop(e, wordIndex)}
              >
                {gestureBoxes
                  .filter(box => box.wordIndex === wordIndex)
                  .sort((a, b) => a.letterIndex - b.letterIndex)
                  .map((box, boxIndex) => (
                    <div
                      key={boxIndex}
                      className="gesture-box-small"
                    >
                      <LetterImage 
                        letter={box.letter}
                        alt={box.letter}
                        className="gesture-image"
                      />
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchingExercisePage;
