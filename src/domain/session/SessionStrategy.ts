import type { Difficulty, Question } from '../questions/types';

export interface AnswerRecord {
  readonly questionId: string;
  readonly difficulty: Difficulty;
  readonly choice: number | null;   // null = unanswered (time-out)
  readonly correct: boolean;
  readonly timeMs: number;
}

/**
 * Decides which difficulty comes next and whether the student may review/skip.
 * AdaptiveStrategy mimics the CAT; LinearStrategy is for untimed practice.
 * Both are interchangeable behind this interface (Liskov).
 */
export interface SessionStrategy {
  readonly name: 'adaptive' | 'linear';
  /** Difficulty of the first item. */
  initialDifficulty(): Difficulty;
  /** Difficulty of the next item, given the history so far. */
  nextDifficulty(history: readonly AnswerRecord[]): Difficulty;
  /** CAT: false — no going back, no skipping. Practice: true. */
  allowsReview(): boolean;
  /** Whether the strategy wants the UI to reveal correctness immediately. */
  revealsAnswer(): boolean;
  /** Estimated standard score (20–80) from the history. */
  estimateStandardScore(history: readonly AnswerRecord[], plannedItems: number): number;
}

export type { Question };
