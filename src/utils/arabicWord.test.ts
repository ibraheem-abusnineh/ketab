import { arabicWord } from './arabicWord';

describe('arabicWord', () => {
  test('returns the ones for 1, 2, 3', () => {
    expect(arabicWord(1)).toBe('واحد');
    expect(arabicWord(2)).toBe('اثنان');
    expect(arabicWord(3)).toBe('ثلاثة');
  });

  test('returns the teens for 10, 11, 12', () => {
    expect(arabicWord(10)).toBe('عشرة');
    expect(arabicWord(11)).toBe('أحد عشر');
    expect(arabicWord(12)).toBe('اثنا عشر');
  });

  test('returns a tens word for 20 (no compound)', () => {
    expect(arabicWord(20)).toBe('عشرون');
  });

  test('returns a compound word for 21 (X و Y)', () => {
    expect(arabicWord(21)).toBe('واحد و عشرون');
  });

  test('returns a compound word for 25', () => {
    expect(arabicWord(25)).toBe('خمسة و عشرون');
  });

  test('returns a tens word for 50', () => {
    expect(arabicWord(50)).toBe('خمسون');
  });

  test('returns a compound word for 99', () => {
    expect(arabicWord(99)).toBe('تسعة و تسعون');
  });

  test('returns مائة for 100', () => {
    expect(arabicWord(100)).toBe('مائة');
  });

  test('generates a non-empty word for every integer 1..100', () => {
    for (let n = 1; n <= 100; n++) {
      const w = arabicWord(n);
      expect(typeof w).toBe('string');
      expect(w.length).toBeGreaterThan(0);
    }
  });

  test('returns صفر for 0', () => {
    expect(arabicWord(0)).toBe('صفر');
  });
});
