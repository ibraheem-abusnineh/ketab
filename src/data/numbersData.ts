import { NumberData } from '../types';
import { arabicWord } from '../utils/arabicWord';

export const numbersOrder: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

/**
 * Every entry is generated from arabicWord(n); no hand-authored Arabic names.
 * videoUrl / signImageUrl are optional per number and render a graceful
 * placeholder when absent (see NumberSignImage and VideoSlot in
 * NumberIntroductionPage).
 */
export const numbersData: Record<number, NumberData> = numbersOrder.reduce(
  (acc, n) => {
    acc[n] = { value: n, word: arabicWord(n) };
    return acc;
  },
  {} as Record<number, NumberData>
);
