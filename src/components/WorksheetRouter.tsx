import React from 'react';
import { useParams } from 'react-router-dom';
import { englishLettersData } from '../data/englishLettersData';
import { lettersData } from '../data/lettersData';
import ArabicWorksheet from './ArabicWorksheet';
import EnglishWorksheet from './EnglishWorksheet';

const WorksheetRouter: React.FC = () => {
  const { letter } = useParams<{ letter: string }>();
  
  // Determine if letter is English (uppercase A-Z)
  const isEnglishLetter = (l: string) => /^[A-Z]$/.test(l);
  
  // Check if letter exists in English data
  if (letter && isEnglishLetter(letter) && englishLettersData[letter]) {
    return <EnglishWorksheet />;
  }
  
  // Check if letter exists in Arabic data
  if (letter && lettersData[letter]) {
    return <ArabicWorksheet />;
  }
  
  // Default to Arabic if letter not found
  return <ArabicWorksheet />;
};

export default WorksheetRouter;

