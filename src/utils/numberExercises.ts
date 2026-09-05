/**
 * Pure generators for the eight 1-100 numbers exercises.
 *
 * Critical constraint: every function EXCEPT `getOddOneOutCards` must only
 * produce numbers in [0, value]. The kid learning number 7 doesn't know
 * what 8, 12, or 50 are yet. `getOddOneOutCards` is the one exception:
 * it's a shape-recognition task where decoys can be any digit.
 *
 * Ported from to add/App.jsx. The functions are deliberately non-random
 * here so they are deterministic and unit-testable; components that need
 * a randomized draw should `useMemo` with a stable seed (e.g. the value).
 */

export interface OddOneOutCard {
  id: number;
  display: string;
  correct: boolean;
  mirror: boolean;
}

export interface CompareOrderTile {
  id: string;
  value: number;
}

export interface NumberLineConfig {
  start: number;
  targetIndex: number;
  overshootBuffer: number;
}

export interface MissingSequenceResult {
  sequence: (number | null)[];
  missing: number;
  choices: number[];
}

/**
 * Numbers that come before `value` in ascending order.
 * Returns 1 or 2 entries (value-2 and value-1), filtered to >= 0.
 *
 * For value=0 there are no smaller non-negative integers, so we return [].
 * The Neighbors page treats an empty target list as auto-complete (no slots
 * to fill), which is the right behavior: there's nothing to learn "before 0".
 */
export function getNeighborTargets(value: number): number[] {
  if (value <= 0) return [];
  return [value - 2, value - 1].filter((v) => v >= 0);
}

/**
 * A short run of consecutive numbers ending at `value`, with one slot
 * blanked out. All shown numbers and all choice distractors are in
 * [0, value]. `seed` is used to make the missing slot deterministic in
 * tests (any number works; in components pass `value`).
 *
 * For value=0 we get a trivial puzzle (sequence [null], missing 0, choices
 * [0]) — the child clicks the only available tile. The page handles this
 * gracefully: a single blank cell with one choice, completes on tap.
 */
export function getMissingSequence(seed: number, value: number): MissingSequenceResult {
  const length = Math.min(5, value + 1);
  const start = value - length + 1;
  const blankIndex = ((seed % length) + length) % length;
  const missing = start + blankIndex;
  const sequence: (number | null)[] = Array.from({ length }, (_, i) =>
    i === blankIndex ? null : start + i
  );

  const shown = new Set<number>(sequence.filter((n): n is number => n !== null));
  const extras: number[] = [];
  for (let v = start - 1; v >= 0 && extras.length < 4; v--) {
    if (!shown.has(v) && v !== missing) extras.push(v);
  }

  const choices: number[] = [missing, ...extras.slice(0, 3)];
  return { sequence, missing, choices };
}

/**
 * Cards for the Odd One Out shape-discrimination task. Decoys can be
 * any digit (this is pure shape recognition, not number sense), so they
 * may exceed `value`. The set always includes the target value as a
 * correct, non-mirrored card plus a mirrored version of the target as
 * a decoy.
 *
 * For value=0 there is no reversed variant ("0" reversed is "0") and the
 * mirrored decoy is also display "0" — it is distinguished from the
 * correct cards by the `mirror: true` flag and the CSS scaleX(-1) flip.
 */
export function getOddOneOutCards(value: number, _seed?: number): OddOneOutCard[] {
  const list: OddOneOutCard[] = [];
  for (let i = 0; i < 3; i++) {
    list.push({ id: i, display: String(value), correct: true, mirror: false });
  }
  const rev = String(value).split('').reverse().join('');
  if (rev !== String(value)) list.push({ id: list.length, display: rev, correct: false, mirror: false });
  list.push({ id: list.length, display: String(value), correct: false, mirror: true });
  for (const o of [-1, 1, 10, -10, 2, -2]) {
    if (list.filter((c) => !c.correct).length >= 6) break;
    const v = value + o;
    if (v >= 0 && v <= 100 && v !== value) {
      list.push({ id: list.length, display: String(v), correct: false, mirror: false });
    }
  }
  return list;
}

/**
 * Three tiles for the ascending-order drag exercise. `value` is always
 * the largest tile; the other two are drawn from numbers < value.
 *
 * For value=0 and value=1 there are no numbers < value, so all three
 * tiles fall back to the target value itself. The page completes when
 * the user fills the three slots (ascending-order check passes because
 * all tiles are equal). This is the documented degenerate-but-complete
 * behavior — for value=0 the user trivially fills 3 slots of "0".
 */
export function getCompareOrderTiles(value: number, seed?: number): CompareOrderTile[] {
  const below: number[] = [];
  for (let n = 0; n < value; n++) below.push(n);
  // deterministic-ish pick for testability; for components pass value as seed
  const offset = Math.abs(seed ?? value);
  const pick = (i: number) => below[(i * 7 + offset) % Math.max(below.length, 1)];
  const a = value <= 1 ? 0 : pick(0);
  const b = value <= 1 ? 0 : pick(1);
  const nums = Array.from(new Set<number>([value, a, b]));
  while (nums.length < 3) {
    nums.push(nums[0]);
  }
  return nums.slice(0, 3).map((v, i) => ({ id: `n${i}`, value: v }));
}

/**
 * Configuration for the Number Line Jump exercise. The visible number
 * line runs from `start` (clamped to 0) to `start + targetIndex`,
 * with `overshootBuffer` extra ticks past the target so the child can
 * see they overshot.
 *
 * For value=0 we get {start:0, targetIndex:0, overshootBuffer:5} — the
 * token starts on the target, so the page auto-completes on mount. This
 * is acceptable: a child learning "0" sees the line correctly and the
 * step marks done without requiring any hops.
 */
export function getNumberLineConfig(value: number): NumberLineConfig {
  const start = Math.max(0, value - 10);
  const targetIndex = value - start;
  const overshootBuffer = 5;
  return { start, targetIndex, overshootBuffer };
}
