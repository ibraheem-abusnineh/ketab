import React from 'react';
import LetterImage from '../LetterImage';
import { Vowel } from '../../types';

interface VowelWritingPageProps {
  selectedLetter: string;
  vowels: Vowel[];
  isEnglish?: boolean;
}

const VowelWritingPage: React.FC<VowelWritingPageProps> = ({
  selectedLetter,
  vowels,
  isEnglish = false
}) => {
  return (
    <div className="book-page active">
      <div className="vowel-writing-section">
        <h3>{isEnglish ? 'Write the letter with vowels:' : 'أَكْتُبُ الْحَرْفَ مَعَ الْحَرَكَات:'}</h3>
        {vowels.map((vowel, index) => (
          <div key={index} className="vowel-row">
            <div className="gesture-box">
              <LetterImage 
                letter={selectedLetter}
                alt={selectedLetter}
                className="vowel-gesture-image"
              />
            </div>
            <div className="writing-line-blue writing-line">
              <span className="writing-line-sample">
                {isEnglish ? `${selectedLetter}${vowel.symbol}` : `${selectedLetter}${vowel.symbol}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VowelWritingPage;
