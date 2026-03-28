import React, { useState } from 'react';
import { LetterData } from '../../types';
import { getLocalVideoPath, getWordImagePath } from '../../utils/videoUtils';
import { VocabularyItem } from '../../types';

// Separate component for vocabulary items to handle image error state
const VocabItem: React.FC<{
  item: VocabularyItem;
  letter: string;
  onVideoClick: (videoPath: string, word: string, isLocal: boolean) => void;
}> = ({ item, letter, onVideoClick }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className="vocab-item"
      onClick={() => onVideoClick(
        getLocalVideoPath(letter, item.word),
        item.word,
        true
      )}
    >
      <div className="vocab-image">
        {!imageError ? (
          <img 
            src={getWordImagePath(item.word)} 
            alt={item.word}
            onError={() => setImageError(true)}
          />
        ) : (
          item.emoji
        )}
      </div>
      <div className="vocab-word">{item.word}</div>
      <div className="vocab-hand" />
    </div>
  );
};

interface VocabularyPageProps {
  letterData: LetterData;
  selectedLetter: string;
  onVideoClick: (videoPath: string, word: string, isLocal: boolean) => void;
  isEnglish?: boolean;
}

const VocabularyPage: React.FC<VocabularyPageProps> = ({
  letterData,
  selectedLetter,
  onVideoClick,
  isEnglish = false
}) => {
  const displayLetterName = isEnglish
    ? letterData.name.replace(/^Letter\s+/i, '').trim() || letterData.name
    : letterData.name;

  return (
    <div className="book-page active">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <PrintButton isEnglish={isEnglish} />
      </div>
      <div className="vocabulary-section">
        <h3>
          {isEnglish
            ? `Words that include the letter ${displayLetterName}`
            : `كَلِمَاتٌ تَحْتَوي عَلَى حَرْفِ ${letterData.name}`}
        </h3>
        <div className="vocab-grid">
          {letterData.vocab.slice(0, 4).map((item, index) => (
            <VocabItem
              key={index}
              item={item}
              letter={selectedLetter}
              onVideoClick={onVideoClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VocabularyPage;

