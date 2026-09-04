import type { Clock } from './Clock';

export type TimerMode = 'stopwatch' | 'countdown';

export interface TimerSnapshot {
  readonly mode: TimerMode;
  readonly elapsedMs: number;
  readonly remainingMs: number;      // Infinity for a stopwatch
  readonly fraction: number;         // remaining / limit, 1 → 0 (countdown); 0 for stopwatch
  readonly level: 'normal' | 'warn' | 'crit' | 'done';
  readonly running: boolean;
}

/**
 * One timer, two modes. It only counts; it never touches the DOM.
 * Warn at 20 % remaining, critical at 10 % — the thresholds the UI paints amber/red.
 */
export class Timer {
  private startedAt: number | null = null;
  private accumulated = 0;
  private limitMs = 0;
  private mode: TimerMode = 'stopwatch';

  constructor(private readonly clock: Clock) {}

  start(mode: TimerMode, limitMs = 0): void {
    this.mode = mode;
    this.limitMs = mode === 'countdown' ? limitMs : 0;
    this.accumulated = 0;
    this.startedAt = this.clock.now();
  }

  pause(): void {
    if (this.startedAt === null) return;
    this.accumulated += this.clock.now() - this.startedAt;
    this.startedAt = null;
  }

  resume(): void {
    if (this.startedAt !== null) return;
    this.startedAt = this.clock.now();
  }

  stop(): TimerSnapshot {
    const snap = this.snapshot();
    this.pause();
    return snap;
  }

  get isRunning(): boolean { return this.startedAt !== null; }

  snapshot(): TimerSnapshot {
    const live = this.startedAt === null ? 0 : this.clock.now() - this.startedAt;
    const elapsedMs = this.accumulated + live;
    if (this.mode === 'stopwatch') {
      return { mode: 'stopwatch', elapsedMs, remainingMs: Infinity, fraction: 0, level: 'normal', running: this.isRunning };
    }
    const remainingMs = Math.max(0, this.limitMs - elapsedMs);
    const fraction = this.limitMs === 0 ? 0 : remainingMs / this.limitMs;
    const level = remainingMs === 0 ? 'done' : fraction <= 0.1 ? 'crit' : fraction <= 0.2 ? 'warn' : 'normal';
    return { mode: 'countdown', elapsedMs, remainingMs, fraction, level, running: this.isRunning };
  }
}

export function formatMmSs(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
