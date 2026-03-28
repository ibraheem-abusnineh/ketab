import React from 'react';
import { LetterData } from '../../types';

interface WritingPracticePageProps {
  letterData: LetterData;
  selectedLetter: string;
  isEnglish?: boolean;
}

const WritingPracticePage: React.FC<WritingPracticePageProps> = ({
  letterData,
  selectedLetter,
  isEnglish = false
}) => {
  const getShapes = () => {
    // For English letters, just return the letter itself
    if (/^[A-Z]$/.test(selectedLetter)) {
      return [selectedLetter.toUpperCase(), selectedLetter.toLowerCase()];
    }
    // For Arabic letters, parse shapes from name
    const match = letterData.name.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split('-').map(s => s.trim()).filter(s => s);
    }
    return [selectedLetter];
  };

  return (
    <div className="book-page active">
      <div className="writing-section">
        <h3>
          {isEnglish
            ? `Write the uppercase and lowercase letter ${letterData.name.replace(/^Letter\s+/i, '').trim() || letterData.name}`
            : `أَرْسُمُ بِخَطٍّ وَاضِحٍ حَرْفَ ${letterData.name}`}
        </h3>
        <div className="writing-lines">
          {Array.from({ length: 5 }).map((_, index) => {
            const shapes = getShapes();
            const shape = shapes[index % shapes.length];
            return (
              <div
                key={index}
                className={isEnglish ? 'writing-line-english' : 'writing-line'}
              >
                <span style={{ color: 'gray', opacity: 0.5, marginLeft: '20px', fontSize: '1.2em' }}>
                  {shape}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WritingPracticePage;
