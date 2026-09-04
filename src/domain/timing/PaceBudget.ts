import { secondsPerItem, type SubtestCode } from '../config/subtests';
import type { Clock } from './Clock';

export interface PaceSnapshot {
  readonly budgetSec: number;
  readonly spentSec: number;
  readonly ratio: number;             // spent / budget, may exceed 1
  readonly level: 'ok' | 'warn' | 'over';
}

/**
 * The coaching instrument: compares time on the current item with the official
 * per-item budget (WK 36 s, AR 220 s, …). Teaches what 36 seconds feels like.
 */
export class PaceBudget {
  private itemStartedAt = 0;
  private budgetSec = 0;

  constructor(private readonly clock: Clock) {}

  beginItem(subtest: SubtestCode): void {
    this.budgetSec = secondsPerItem(subtest);
    this.itemStartedAt = this.clock.now();
  }

  snapshot(): PaceSnapshot {
    const spentSec = (this.clock.now() - this.itemStartedAt) / 1000;
    const ratio = this.budgetSec === 0 ? 0 : spentSec / this.budgetSec;
    return { budgetSec: this.budgetSec, spentSec, ratio, level: ratio >= 1 ? 'over' : ratio >= 0.75 ? 'warn' : 'ok' };
  }

  /** Milliseconds spent on the current item — recorded on every answer event. */
  spentMs(): number { return this.clock.now() - this.itemStartedAt; }
}
