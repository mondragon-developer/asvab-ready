import type { Difficulty } from '../questions/types';
import type { AnswerRecord, SessionStrategy } from './SessionStrategy';

/** Practice mode: fixed difficulty ladder, review allowed, answers revealed at once. */
export class LinearStrategy implements SessionStrategy {
  readonly name = 'linear' as const;

  constructor(private readonly difficulty: Difficulty = 2) {}

  initialDifficulty(): Difficulty { return this.difficulty; }
  nextDifficulty(): Difficulty { return this.difficulty; }
  allowsReview(): boolean { return true; }
  revealsAnswer(): boolean { return true; }

  estimateStandardScore(history: readonly AnswerRecord[], plannedItems: number): number {
    const answered = history.length || plannedItems;
    if (answered === 0) return 50;
    const correct = history.filter((r) => r.correct).length;
    return Math.round(20 + (correct / answered) * 60);
  }
}
