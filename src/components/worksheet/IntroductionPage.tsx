import React from 'react';
import LetterImage from '../LetterImage';
import { LetterData, LetterInfo } from '../../types';
import { convertToEmbedUrl } from '../../utils/videoUtils';
import PrintButton from '../PrintButton';

interface IntroductionPageProps {
  selectedLetter: string;
  letterData: LetterData;
  letterInfoData?: LetterInfo;
  isEnglish?: boolean;
}

const IntroductionPage: React.FC<IntroductionPageProps> = ({
  selectedLetter,
  letterData,
  letterInfoData,
  isEnglish = false
}) => {
  const embedUrl = letterInfoData?.link ? convertToEmbedUrl(letterInfoData.link) : '';
  const rawLetterName = letterInfoData?.name || letterData.name;
  const displayLetterName = isEnglish
    ? rawLetterName.replace(/^Letter\s+/i, '').trim() || rawLetterName
    : rawLetterName;

  return (
    <div className="book-page active">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <PrintButton isEnglish={isEnglish} />
      </div>
      <div className="header">
        <h1>
          {isEnglish ? 'Worksheet' : 'وَرَقَةُ عَمَلٍ'}<br />
          {isEnglish ? `Letter ${displayLetterName}` : `حَرْفُ ${rawLetterName}`}
        </h1>
      </div>
      
      <div className="letter-showcase">
        <div className="letter-text-section">
          <div className="main-letter">{selectedLetter}</div>
          <div className="letter-name">
            {isEnglish ? `Letter ${displayLetterName}` : `حَرْفُ ${rawLetterName}`}
          </div>
          <div className="letter-pronunciation">
            {letterInfoData?.pronunciation || letterData.pronunciation}
          </div>
        </div>
        <div className="letter-image">
          <LetterImage 
            letter={selectedLetter}
            alt={selectedLetter}
            className="main-letter-image"
          />
        </div>
      </div>

      <div className="hand-gestures">
        <h3>
          {isEnglish
            ? `Hand signs for the letter ${displayLetterName}`
            : `إِشَارَاتُ الْيَّدِ لِحَرْفِ ${letterData.name}`}
        </h3>
        <div className="video-placeholder">
          {embedUrl ? (
            <iframe
              width="100%"
              height="400"
              src={embedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                borderRadius: '12px',
                border: '2px dashed #84333c',
                background: '#eee'
              }}
            />
          ) : (
            <div style={{
              background: '#eee',
              border: '2px dashed #84333c',
              borderRadius: '12px',
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: '#84333c', fontSize: '1.3em' }}>
                {isEnglish ? 'Video placeholder' : 'مكان الفيديو هنا'}
              </span>
            </div>
          )}
        </div>
        
        
      </div>
    </div>
  );
};

export default IntroductionPage;

