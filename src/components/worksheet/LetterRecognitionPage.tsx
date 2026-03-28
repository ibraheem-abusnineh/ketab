import React from 'react';
import { LetterSquare, LetterData } from '../../types';

interface LetterRecognitionPageProps {
  letterSquares: LetterSquare[];
  draggableCircles: number[];
  selectedLetter: string;
  letterData: LetterData;
  onDragStart: (e: React.DragEvent, letter: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isEnglish?: boolean;
}

const LetterRecognitionPage: React.FC<LetterRecognitionPageProps> = ({
  letterSquares,
  draggableCircles,
  selectedLetter,
  letterData,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isEnglish = false
}) => {
  const uppercaseLetter = selectedLetter.toUpperCase();
  const lowercaseLetter = selectedLetter.toLowerCase();
  const englishLetterName = letterData.name.replace(/^Letter\s+/i, '').trim() || letterData.name;

  return (
    <div className="book-page active">
      <div className="letter-organization-section">
        <h3>
          {isEnglish
            ? `Place a circle on the letter ${uppercaseLetter}/${lowercaseLetter}`
            : `أَضَعُ دَائِرَةٌ عَلَى حَرْفِ ${letterData.name} ${selectedLetter}`}
        </h3>
        {isEnglish && (
          <p style={{ marginBottom: '12px', color: '#555' }}>
            Find every uppercase or lowercase {englishLetterName} in the grid.
          </p>
        )}
        <div className="letter-squares-grid">
          {letterSquares.map((square, index) => (
            <div
              key={index}
              className={`letter-square ${square.hasDroppedCircle ? 'has-dropped-circle' : ''}`}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
            >
              <span className="letter-in-square">{square.letter}</span>
              {square.hasDroppedCircle && (
                <div className="draggable-circle" />
              )}
            </div>
          ))}
        </div>
        <div className="draggable-circles-container">
          {draggableCircles.map((_, index) => (
            <div
              key={index}
              className="draggable-circle"
              draggable
              onDragStart={(e) => onDragStart(e, selectedLetter)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LetterRecognitionPage;

