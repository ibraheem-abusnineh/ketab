/**
 * Generate the Arabic spelling for any integer in [0, 100].
 *
 * Ported from the standalone prototype (to add/App.jsx). The generator uses
 * three lookup tables (ones, teens, tens) plus a compound "X و Y" rule for
 * 21..99. No per-number authoring — every entry is derived from `n`.
 */

const AR_ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة'
];

const AR_TEENS = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر'
];

const AR_TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون'
];

export function arabicWord(n: number): string {
  if (n === 0) return 'صفر';
  if (n === 100) return 'مائة';
  if (n < 10) return AR_ONES[n];
  if (n < 20) return AR_TEENS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? AR_TENS[tens] : `${AR_ONES[ones]} و ${AR_TENS[tens]}`;
}
