import React, { useState, useEffect } from 'react';

interface LetterImageProps {
  letter: string;
  alt?: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const LetterImage: React.FC<LetterImageProps> = ({ 
  letter, 
  alt = letter, 
  className = '', 
  onError 
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentPath, setCurrentPath] = useState(0);

  useEffect(() => {
    setImageError(false);
    setCurrentPath(0);
  }, [letter]);

  const encodedLetter = encodeURIComponent(letter);
  const PUBLIC_URL = process.env.PUBLIC_URL || '';

  const imagePaths = [
    `${PUBLIC_URL}/letters/${encodedLetter}/1.jpg`,
    `${PUBLIC_URL}/letters/${encodedLetter}/1.JPG`,
    `${PUBLIC_URL}/letters/${encodedLetter}/1.png`,
    `${PUBLIC_URL}/letters/${encodedLetter}/1.PNG`
  ];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (currentPath < imagePaths.length - 1) {
      setCurrentPath(currentPath + 1);
      return;
    }
    setImageError(true);
    if (onError) onError(e);
  };

  if (imageError) {
    return <div className={`letter-fallback ${className}`}>{letter}</div>;
  }

  return (
    <img 
      key={currentPath}
      src={imagePaths[currentPath]}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
};

export default LetterImage;
