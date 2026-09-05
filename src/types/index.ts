export interface VocabularyItem {
  word: string;
  emoji: string;
  image?: string;
  video?: string;
}

export interface SpyObject {
  name: string;
  x: number;
  y: number;
}

export interface LetterInfo {
  name: string;
  pronunciation: string;
  link?: string;
}

export interface LetterData {
  name: string;
  pronunciation: string;
  vocab: VocabularyItem[];
  shapes?: string[];
  spyObjects?: SpyObject[];
  folderName?: string;
}

export interface LetterSquare {
  letter: string;
  isTarget: boolean;
  hasDroppedCircle?: boolean;
}

export interface MatchingWord {
  word: string;
  wordIndex: number;
  isMatched?: boolean;
}

export interface GestureBox {
  letter: string;
  wordIndex: number;
  letterIndex: number;
  isMatched?: boolean;
}

export interface Vowel {
  symbol: string;
  name: string;
}

export interface SyllablePair {
  letter: string;
  vowel: string;
}

export type PageType = 
  | 'introduction'
  | 'vocabulary'
  | 'writing'
  | 'letter-recognition'
  | 'syllable-writing'
  | 'vowel-writing'
  | 'matching'
  | 'number-introduction'
  | 'number-tracing'
  | 'number-neighbors'
  | 'missing-sequence'
  | 'build-number'
  | 'odd-one-out'
  | 'compare-order'
  | 'number-line-jump';

export interface NumberData {
  value: number;
  word: string;
  videoUrl?: string;
  signImageUrl?: string;
}

export interface VideoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  word?: string;
  isLocal?: boolean;
}
