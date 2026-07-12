import type { Difficulty, CognitiveLevel } from "../shared/types";

/** Renditja numerike e vështirësisë (për garantimin e rendit të pikëve). */
export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/** Renditja numerike e nivelit kognitiv (Remember → Create). */
export const COGNITIVE_RANK: Record<CognitiveLevel, number> = {
  Remember: 1,
  Understand: 2,
  Apply: 3,
  Analyze: 4,
  Evaluate: 5,
  Create: 6,
};

/**
 * Ndaj `maxScore` pikë *integere* nëpër `weights` duke ruajtur raportin proporcional
 * (metoda e mbetjes më të madhe / Hamilton). Garanton:
 *  - shuma e saktë = maxScore,
 *  - çdo pyetje merr të paktën 1 pikë (nëse maxScore ≥ numri i pyetjeve),
 *  - renditja ruhet: pesha më e madhe → më shumë pikë (e njëjta për vështirësinë).
 * Determinist — i njëjti input kthen gjithmonë të njëjtin output.
 */
export function allocatePoints(maxScore: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const target = Math.max(0, Math.floor(maxScore));

  // Çdo pyetje marrë të paktën 1 pikë; pjesën tjetër e ndajmë sipas peshës.
  const minEach = 1;
  const base = new Array<number>(n).fill(minEach);
  let remaining = target - n * minEach;
  if (remaining < 0) remaining = 0; // rast degjener (maxScore < n): jepim 1 secilës

  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || remaining === 0) return base;

  // Pjesa shtesë proporcionale me peshën.
  const extra = weights.map((w) => (remaining * Math.max(0, w)) / total);
  const floorExtra = extra.map((x) => Math.floor(x));
  let allocated = floorExtra.reduce((a, b) => a + b, 0);
  let remainder = remaining - allocated;

  // Rendit sipas mbetjes dhjetore (zbrastësia), më pas pesha, më pas indeksi — determinist.
  const order = extra
    .map((x, i) => ({ i, frac: x - Math.floor(x), w: Math.max(0, weights[i]) }))
    .sort((a, b) => b.frac - a.frac || b.w - a.w || a.i - b.i);

  const points = base.map((b, i) => b + floorExtra[i]);
  let k = 0;
  while (remainder > 0) {
    if (k >= order.length) k = 0; // siguri nëse remainder ≥ n
    points[order[k].i]++;
    remainder--;
    k++;
  }
  return points;
}

/** Klason një peshë (1–10) në vështirësi të përgjithshme për paraqitje. */
export function weightToDifficulty(weight: number): Difficulty {
  if (weight <= 3.5) return "easy";
  if (weight <= 7) return "medium";
  return "hard";
}

/** Verifikon që pikët janë monotonic me vështirësinë (easy ≤ medium ≤ hard). */
export function isMonotonicWithDifficulty(
  questions: { difficulty: Difficulty; points: number }[],
): boolean {
  const ranks = questions.map((q) => ({ r: DIFFICULTY_RANK[q.difficulty], p: q.points }));
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i].r > ranks[i - 1].r && ranks[i].p < ranks[i - 1].p) return false;
  }
  return true;
}
