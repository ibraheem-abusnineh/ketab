import React from 'react';
import { useParams } from 'react-router-dom';
import { englishLettersData } from '../data/englishLettersData';
import { lettersData } from '../data/lettersData';
import { numbersOrder } from '../data/numbersData';
import ArabicWorksheet from './ArabicWorksheet';
import EnglishWorksheet from './EnglishWorksheet';
import NumbersWorksheet from './NumbersWorksheet';

const WorksheetRouter: React.FC = () => {
  const { letter } = useParams<{ letter: string }>();

  // Numbers: route /worksheet/:number where :number parses as an integer
  // and is in the 1..100 range.
  if (letter) {
    const parsed = parseInt(letter, 10);
    if (!Number.isNaN(parsed) && numbersOrder.includes(parsed)) {
      return <NumbersWorksheet />;
    }
  }

  // English: uppercase A-Z
  const isEnglishLetter = (l: string) => /^[A-Z]$/.test(l);
  if (letter && isEnglishLetter(letter) && englishLettersData[letter]) {
    return <EnglishWorksheet />;
  }

  // Arabic letter
  if (letter && lettersData[letter]) {
    return <ArabicWorksheet />;
  }

  // Fallback to Arabic
  return <ArabicWorksheet />;
};

export default WorksheetRouter;
