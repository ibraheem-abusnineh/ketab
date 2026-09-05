import {
  getNeighborTargets,
  getMissingSequence,
  getOddOneOutCards,
  getCompareOrderTiles,
  getNumberLineConfig
} from './numberExercises';

describe('getNeighborTargets', () => {
  test('returns 1 and 2 for value=3', () => {
    expect(getNeighborTargets(3)).toEqual([1, 2]);
  });

  test('for value=2 returns 0 and 1 (no negative)', () => {
    expect(getNeighborTargets(2)).toEqual([0, 1]);
  });

  test('for value=1 returns just 0 (no negative)', () => {
    expect(getNeighborTargets(1)).toEqual([0]);
  });

  test('returns 9 and 10 for value=11', () => {
    expect(getNeighborTargets(11)).toEqual([9, 10]);
  });

  test('every neighbor is < value and >= 0', () => {
    for (let v = 2; v <= 50; v++) {
      const ns = getNeighborTargets(v);
      ns.forEach((n) => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(v);
      });
    }
  });
});

describe('getMissingSequence', () => {
  test('produces a 5-length sequence ending at value for value>=4', () => {
    const out = getMissingSequence(5, 7);
    expect(out.sequence.length).toBe(5);
    const numbers = out.sequence.filter((n): n is number => n !== null);
    expect(numbers).toContain(5);
    expect(numbers.every((n) => n >= 0 && n <= 7)).toBe(true);
    expect(out.missing).toBeGreaterThanOrEqual(0);
    expect(out.missing).toBeLessThanOrEqual(7);
  });

  test('the missing value is present in choices and the shown sequence excludes it', () => {
    const out = getMissingSequence(12345, 9);
    expect(out.choices).toContain(out.missing);
    expect(out.sequence).toContain(null);
    const shownNumbers = out.sequence.filter((n): n is number => n !== null);
    expect(shownNumbers).not.toContain(out.missing);
  });

  test('every choice number is >= 0 and <= value', () => {
    for (let v = 1; v <= 50; v++) {
      const out = getMissingSequence(v * 31 + 1, v);
      out.choices.forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(v);
      });
      const numbers = out.sequence.filter((n): n is number => n !== null);
      numbers.forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(v);
      });
    }
  });

  test('choices are unique', () => {
    const out = getMissingSequence(42, 12);
    expect(new Set(out.choices).size).toBe(out.choices.length);
  });

  test('sequence values are unique where present', () => {
    const out = getMissingSequence(7, 8);
    const nums = out.sequence.filter((n): n is number => n !== null);
    expect(new Set(nums).size).toBe(nums.length);
  });
});

describe('getOddOneOutCards', () => {
  test('returns between 4 and 9 cards', () => {
    const cards = getOddOneOutCards(7, 99);
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.length).toBeLessThanOrEqual(9);
  });

  test('always contains the target value as a non-mirrored card', () => {
    const cards = getOddOneOutCards(7, 99);
    const correctCards = cards.filter((c) => c.correct && !c.mirror);
    expect(correctCards.length).toBeGreaterThanOrEqual(1);
    correctCards.forEach((c) => expect(c.display).toBe('7'));
  });

  test('contains a mirrored decoy of the target', () => {
    const cards = getOddOneOutCards(7, 99);
    expect(cards.some((c) => c.mirror && c.display === '7')).toBe(true);
  });

  test('contains at least 2 wrong decoys', () => {
    const cards = getOddOneOutCards(7, 99);
    const wrong = cards.filter((c) => !c.correct);
    expect(wrong.length).toBeGreaterThanOrEqual(2);
  });

  test('decoys CAN be larger than value (Odd One Out is shape-only)', () => {
    const cards = getOddOneOutCards(5, 99);
    const decoyDisplays = cards.filter((c) => !c.correct).map((c) => c.display);
    expect(decoyDisplays.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getCompareOrderTiles', () => {
  test('returns exactly 3 tiles', () => {
    const tiles = getCompareOrderTiles(7, 99);
    expect(tiles.length).toBe(3);
  });

  test('contains the target value as the largest tile', () => {
    const tiles = getCompareOrderTiles(7, 99);
    const max = Math.max(...tiles.map((t) => t.value));
    expect(max).toBe(7);
  });

  test('for value=1 still returns 3 tiles (fallback to value itself)', () => {
    const tiles = getCompareOrderTiles(1, 99);
    expect(tiles.length).toBe(3);
    expect(tiles.some((t) => t.value === 1)).toBe(true);
  });

  test('every tile has a unique id', () => {
    const tiles = getCompareOrderTiles(50, 99);
    const ids = tiles.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('for value=20 the set of values is a subset of [0, 20]', () => {
    const tiles = getCompareOrderTiles(20, 99);
    tiles.forEach((t) => {
      expect(t.value).toBeGreaterThanOrEqual(0);
      expect(t.value).toBeLessThanOrEqual(20);
    });
  });
});

describe('getNumberLineConfig', () => {
  test('for value=10: start=0, targetIndex=10, overshootBuffer=5', () => {
    const cfg = getNumberLineConfig(10);
    expect(cfg.start).toBe(0);
    expect(cfg.targetIndex).toBe(10);
    expect(cfg.overshootBuffer).toBe(5);
  });

  test('for value=7: targetIndex=7, overshootBuffer=5', () => {
    const cfg = getNumberLineConfig(7);
    expect(cfg.targetIndex).toBe(7);
    expect(cfg.overshootBuffer).toBe(5);
  });

  test('for value=50: start is clamped to >= 0 (max(0, 50-10)=40), targetIndex=10', () => {
    const cfg = getNumberLineConfig(50);
    expect(cfg.start).toBe(40);
    expect(cfg.targetIndex).toBe(10);
  });

  test('for value=100: start=90, targetIndex=10', () => {
    const cfg = getNumberLineConfig(100);
    expect(cfg.start).toBe(90);
    expect(cfg.targetIndex).toBe(10);
  });

  test('overshootBuffer is always > 0', () => {
    for (let v = 1; v <= 50; v++) {
      const cfg = getNumberLineConfig(v);
      expect(cfg.overshootBuffer).toBeGreaterThan(0);
      expect(cfg.targetIndex).toBeGreaterThan(0);
    }
  });
});
