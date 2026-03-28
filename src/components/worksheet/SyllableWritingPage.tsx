import React from 'react';
import LetterImage from '../LetterImage';
import { SyllablePair } from '../../types';
import PrintButton from '../PrintButton';

interface SyllableWritingPageProps {
  selectedLetter: string;
  syllablePairs: SyllablePair[];
  isEnglish?: boolean;
}

const SyllableWritingPage: React.FC<SyllableWritingPageProps> = ({
  selectedLetter,
  syllablePairs,
  isEnglish = false
}) => {
  return (
    <div className="book-page active">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <PrintButton isEnglish={isEnglish} />
      </div>
      <div className="syllable-writing-section">
        <h3>{isEnglish ? 'Write the following syllables:' : 'أَكْتُبُ الْمَقَاطِعَ الآتيةَ:'}</h3>
        <div className="syllable-matching-grid">
          {syllablePairs.map((pair, index) => (
            <div key={index} className="syllable-row">
              <div className="syllable-sign-row">
                <div className="syllable-sign-box">
                  <LetterImage 
                    letter={pair.letter}
                    alt={pair.letter}
                    className="syllable-image"
                  />
                </div>
                <div className="syllable-sign-box">
                  <LetterImage 
                    letter={pair.vowel}
                    alt={pair.vowel}
                    className="syllable-image"
                  />
                </div>
              </div>
              <div className="writing-line-purple writing-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SyllableWritingPage;

