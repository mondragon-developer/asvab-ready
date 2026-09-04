import type { Difficulty } from '../questions/types';
import type { AnswerRecord, SessionStrategy } from './SessionStrategy';

/**
 * Honest approximation of the CAT-ASVAB (the real test uses item-response theory):
 *  - start medium; correct → harder, wrong → easier (clamped 1..3)
 *  - estimate = difficulty-weighted proportion correct mapped onto 20–80
 *  - unanswered items at time-out count as wrong, and a run of wrong answers at the
 *    END of the subtest costs extra — mirroring the official "end-of-test penalty".
 * The Results screen states this is ±5 points so students are never misled.
 */
export class AdaptiveStrategy implements SessionStrategy {
  readonly name = 'adaptive' as const;

  initialDifficulty(): Difficulty { return 2; }

  nextDifficulty(history: readonly AnswerRecord[]): Difficulty {
    const last = history[history.length - 1];
    if (!last) return this.initialDifficulty();
    const step = last.correct ? 1 : -1;
    return clamp(last.difficulty + step) as Difficulty;
  }

  allowsReview(): boolean { return false; }
  revealsAnswer(): boolean { return false; }

  estimateStandardScore(history: readonly AnswerRecord[], plannedItems: number): number {
    if (plannedItems === 0) return 50;
    const weights: Record<Difficulty, number> = { 1: 0.7, 2: 1.0, 3: 1.4 };
    let earned = 0;
    let possible = 0;
    for (const r of history) {
      possible += weights[r.difficulty];
      if (r.correct) earned += weights[r.difficulty];
    }
    // Items never reached (time-out) count as medium items answered wrong.
    const missing = Math.max(0, plannedItems - history.length);
    possible += missing * weights[2];

    let proportion = possible === 0 ? 0 : earned / possible;

    // End-of-test penalty: consecutive wrong/unanswered items in the last quarter.
    const tail = history.slice(-Math.max(1, Math.round(plannedItems / 4)));
    const tailWrong = tail.filter((r) => !r.correct).length + missing;
    if (tailWrong >= 3) proportion -= 0.03 * (tailWrong - 2);

    proportion = Math.min(1, Math.max(0, proportion));
    return Math.round(20 + proportion * 60);
  }
}

function clamp(d: number): number { return Math.min(3, Math.max(1, d)); }
