import type { SubtestCode } from '../config/subtests';
import type { Difficulty, Question, QuestionSource } from './types';

export interface Rng {
  /** Returns a float in [0, 1). Injected so tests are deterministic. */
  next(): number;
}

export const mathRng: Rng = { next: () => Math.random() };

/**
 * Loads, validates and samples questions. One responsibility: answer "give me N items
 * of subtest X" — never how they are stored, never how they are scored.
 */
export class QuestionBank {
  private readonly cache = new Map<SubtestCode, readonly Question[]>();

  constructor(private readonly source: QuestionSource, private readonly rng: Rng = mathRng) {}

  /** A narrower bank over the same data (e.g. one topic). Composition, not a flag on every method. */
  scoped(predicate: (q: Question) => boolean): QuestionBank {
    const parent = this;
    return new QuestionBank({ async load(subtest) { return (await parent.all(subtest)).filter(predicate); } }, this.rng);
  }

  async all(subtest: SubtestCode): Promise<readonly Question[]> {
    const cached = this.cache.get(subtest);
    if (cached) return cached;
    const items = (await this.source.load(subtest)).filter((q) => validateQuestion(q).length === 0);
    this.cache.set(subtest, items);
    return items;
  }

  async byDifficulty(subtest: SubtestCode, difficulty: Difficulty): Promise<readonly Question[]> {
    return (await this.all(subtest)).filter((q) => q.difficulty === difficulty);
  }

  /** Random sample without repeats, optionally excluding ids already seen. */
  async sample(subtest: SubtestCode, count: number, exclude: ReadonlySet<string> = new Set()): Promise<Question[]> {
    const pool = (await this.all(subtest)).filter((q) => !exclude.has(q.id));
    return shuffle(pool, this.rng).slice(0, count);
  }

  /**
   * Pick one item at the requested difficulty, falling back to the nearest difficulty
   * when the pool at that level is exhausted. `exclude` is a hard rule (this session);
   * `avoid` is a soft preference (seen in earlier sessions) — unseen items come first,
   * so a second full test repeats nothing while the bank has unseen items left.
   * Returns undefined only when everything is used.
   */
  async pick(subtest: SubtestCode, difficulty: Difficulty, exclude: ReadonlySet<string>, avoid: ReadonlySet<string> = new Set()): Promise<Question | undefined> {
    const all = (await this.all(subtest)).filter((q) => !exclude.has(q.id));
    const order: Difficulty[] = difficulty === 1 ? [1, 2, 3] : difficulty === 3 ? [3, 2, 1] : [2, 1, 3];
    for (const candidates of [all.filter((q) => !avoid.has(q.id)), all]) {
      for (const d of order) {
        const pool = candidates.filter((q) => q.difficulty === d);
        if (pool.length) return pool[Math.floor(this.rng.next() * pool.length)];
      }
    }
    return undefined;
  }
}

export function validateQuestion(q: Question): string[] {
  const errors: string[] = [];
  if (!q.id) errors.push('missing id');
  if (q.choices.length !== 4) errors.push(`${q.id}: expected 4 choices, got ${q.choices.length}`);
  if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`${q.id}: answer index out of range`);
  if (![1, 2, 3].includes(q.difficulty)) errors.push(`${q.id}: difficulty must be 1..3`);
  if (!q.stem?.en || !q.stem?.es) errors.push(`${q.id}: stem must have en and es`);
  return errors;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
