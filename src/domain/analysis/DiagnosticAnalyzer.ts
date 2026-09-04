import type { ReportedCode } from '../scoring/Scorer';
import type { Scorer } from '../scoring/Scorer';

export interface SubtestStat {
  readonly code: ReportedCode;
  readonly seen: number;
  readonly correct: number;
  readonly avgMs: number;
}

export interface WeakArea {
  readonly code: ReportedCode;
  readonly accuracy: number;     // 0..1
  readonly leverage: number;     // AFQT points per subtest point (0 for technical subtests)
  readonly priority: number;     // what the list is sorted by
  readonly level: 'good' | 'warn' | 'crit';
}

/**
 * Turns raw stats into "where to spend your next hour".
 * Priority = gap × (1 + leverage): a 58 % on WK outranks a 40 % on EI for an
 * enlistment-focused student, because WK points move the AFQT and EI points do not.
 */
export class DiagnosticAnalyzer {
  constructor(private readonly scorer: Scorer) {}

  rank(stats: readonly SubtestStat[], target = 0.8): WeakArea[] {
    return stats
      .filter((s) => s.seen > 0)
      .map((s) => {
        const accuracy = s.correct / s.seen;
        const leverage = this.scorer.afqtLeverage(s.code);
        const gap = Math.max(0, target - accuracy);
        return {
          code: s.code,
          accuracy,
          leverage,
          priority: gap * (1 + leverage),
          level: accuracy >= target ? 'good' : accuracy >= 0.6 ? 'warn' : 'crit',
        } as WeakArea;
      })
      .sort((a, b) => b.priority - a.priority);
  }
}
