import { NumberData, NumberPageData, NumberNumeral } from '../types';
import { arabicWord } from '../utils/arabicWord';
import numbersManifest from './numbersManifest.json';

/**
 * Manifest schema (per number):
 *   {
 *     "pages": {
 *       "1": { "type": "learn",        "image": "0_page-1.png" },
 *       "2": { "type": "write",        "image": "0_page-2.png" },
 *       "3": { "type": "countChoose",  "image": "0_page-3.png", "numerals": [{value,xPct,yPct,wPct,hPct,correct}, ...] },
 *       "4": { "type": "circleFind",   "image": "0_page-4.png", "numerals": [...] },
 *       "5": { "type": "trace",        "image": "0_page-5.png" },
 *       "6": { "type": "color",        "image": "0_page-6.png" }
 *     }
 *   }
 * `image` from the manifest is a bare filename like `0_page-1.png`;
 * the live frontend serves them at `/numbers/{n}/page-{k}.png`.
 */

interface RawManifestNumerals {
  value: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  correct: boolean;
}

interface RawManifestPage {
  type: string;
  image: string;
  numerals?: RawManifestNumerals[];
}

interface RawManifestNumber {
  pages: Record<string, RawManifestPage>;
}

interface RawManifest {
  [key: string]: RawManifestNumber;
}

const manifest = numbersManifest as RawManifest;

/**
 * Convert the manifest's `n_page-k.png` filename to a live URL the
 * frontend can serve. The user-side unzip places files under
 * `public/numbers/<n>/page-<k>.png` so this maps deterministically.
 */
const pageImageUrl = (n: number, image: string): string => {
  const m = /^(\d+)_page-(\d+)\.png$/.exec(image);
  if (!m) {
    // Fallback to the raw image; matches the path the user unpacked.
    return `/numbers/${image}`;
  }
  const [, nn, kk] = m;
  return `/numbers/${nn}/page-${kk}.png`;
};

export const numbersOrder: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const buildPage = (n: number, raw: RawManifestPage): NumberPageData => {
  const page: NumberPageData = {
    type: raw.type as NumberPageData['type'],
    image: pageImageUrl(n, raw.image),
  };
  if (raw.numerals) {
    page.numerals = raw.numerals.map((num): NumberNumeral => ({
      value: num.value,
      xPct: num.xPct,
      yPct: num.yPct,
      wPct: num.wPct,
      hPct: num.hPct,
      correct: num.correct,
    }));
  }
  return page;
};

/**
 * Build the per-number data record from the manifest. Each entry
 * keeps `value`, `word` (from `arabicWord(n)` — unvocalized, CI-tested),
 * `videoUrl` (the trimmed mp4 still served from `public/numbers/<n>.mp4`),
 * and `pages[k]` for k in `["1".."6"]`.
 */
export const numbersData: Record<number, NumberData> = numbersOrder.reduce(
  (acc, n) => {
    const m = manifest[String(n)];
    const pages: Record<string, NumberPageData> = {};
    if (m?.pages) {
      for (const k of Object.keys(m.pages)) {
        pages[k] = buildPage(n, m.pages[k]);
      }
    }
    acc[n] = {
      value: n,
      word: arabicWord(n),
      videoUrl: `/numbers/${n}.mp4`,
      pages,
    };
    return acc;
  },
  {} as Record<number, NumberData>
);
