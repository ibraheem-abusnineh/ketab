/**
 * Small, dependency-free helpers shared by the admin charts.
 * Everything is pure so the chart components stay dumb and testable.
 */

export interface SeriesPoint {
  label: string;
  value: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function niceScale(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { max: 1, ticks: [0, 1] };
  }

  const roughStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const max = Math.ceil(maxValue / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return { max, ticks };
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('en-US');
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

export function shortDay(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function shortDayLong(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Evenly spaced indexes for x-axis labels, always including first and last. */
export function labelIndexes(length: number, desired: number): number[] {
  if (length <= desired) return Array.from({ length }, (_, index) => index);
  const step = (length - 1) / (desired - 1);
  const indexes = new Set<number>();
  for (let i = 0; i < desired; i += 1) indexes.add(Math.round(i * step));
  return Array.from(indexes).sort((a, b) => a - b);
}

export interface HeatCell {
  day: string;
  count: number;
}

export interface HeatWeek {
  cells: Array<HeatCell | null>;
}

/**
 * Turn a daily series into calendar weeks (Monday-first) so the heatmap
 * reads like a wall calendar rather than an arbitrary grid.
 */
export function buildHeatWeeks(data: HeatCell[]): { weeks: HeatWeek[]; max: number } {
  const byDay = new Map<string, number>();
  data.forEach((entry) => byDay.set(entry.day, entry.count));

  if (data.length === 0) return { weeks: [], max: 0 };

  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day));
  const first = new Date(`${sorted[0].day}T12:00:00`);
  const last = new Date(`${sorted[sorted.length - 1].day}T12:00:00`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
    return { weeks: [], max: 0 };
  }

  // Monday = 0 ... Sunday = 6
  const startOffset = (first.getDay() + 6) % 7;
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - startOffset);

  const weeks: HeatWeek[] = [];
  let max = 0;

  while (cursor <= last) {
    const cells: Array<HeatCell | null> = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      const year = cursor.getFullYear();
      const month = `${cursor.getMonth() + 1}`.padStart(2, '0');
      const day = `${cursor.getDate()}`.padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      const inRange = cursor >= first && cursor <= last;
      const count = byDay.get(key) || 0;
      if (inRange && count > max) max = count;
      cells.push(inRange ? { day: key, count } : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ cells });
  }

  return { weeks, max };
}

/** Parse a `YYYY-MM-DD` day as a local noon date. */
export function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
