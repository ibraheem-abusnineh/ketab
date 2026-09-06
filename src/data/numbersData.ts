import { NumberData } from '../types';
import { arabicWord } from '../utils/arabicWord';

export const numbersOrder: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Every entry is generated from arabicWord(n); no hand-authored Arabic names.
 * videoUrl / signImageUrl are optional per number and render a graceful
 * placeholder when absent (see NumberSignImage and VideoSlot in
 * NumberIntroductionPage).
 */
export const numbersData: Record<number, NumberData> = numbersOrder.reduce(
  (acc, n) => {
    acc[n] = { value: n, word: arabicWord(n), videoUrl: `/numbers/${n}.mp4` };
    return acc;
  },
  {} as Record<number, NumberData>
);
