import { getSubtest, type SubtestCode } from '../config/subtests';
import type { QuestionBank } from '../questions/QuestionBank';
import type { Question } from '../questions/types';
import type { Clock } from '../timing/Clock';
import { PaceBudget } from '../timing/PaceBudget';
import { Timer, type TimerSnapshot } from '../timing/Timer';
import type { AnswerRecord, SessionStrategy } from './SessionStrategy';

export type SessionMode = 'practice' | 'diagnostic' | 'subtest' | 'full';

export interface SessionEvents {
  onQuestion?(q: Question, index: number, total: number): void;
  onAnswer?(record: AnswerRecord, q: Question): void;
  onFinish?(summary: SessionSummary): void;
  onTimeout?(): void;
}

export interface SessionSummary {
  readonly subtest: SubtestCode;
  readonly mode: SessionMode;
  readonly plannedItems: number;
  readonly answered: number;
  readonly unanswered: number;
  readonly correct: number;
  readonly usedMs: number;
  readonly limitMs: number;
  readonly standardScore: number;
  readonly history: readonly AnswerRecord[];
}

/**
 * Runs one subtest. Orchestrates bank + strategy + timer + pace; owns no UI.
 * The same engine serves practice (LinearStrategy, stopwatch) and test
 * (AdaptiveStrategy, countdown) — only the injected collaborators change.
 */
export class SessionEngine {
  private readonly timer: Timer;
  private readonly pace: PaceBudget;
  private readonly history: AnswerRecord[] = [];
  private readonly seen = new Set<string>();
  private current: Question | undefined;
  private finished = false;

  constructor(
    private readonly subtest: SubtestCode,
    private readonly mode: SessionMode,
    private readonly plannedItems: number,
    private readonly bank: QuestionBank,
    private readonly strategy: SessionStrategy,
    clock: Clock,
    private readonly events: SessionEvents = {},
    /** Question ids answered in earlier sessions — avoided while unseen items remain. */
    private readonly avoid: ReadonlySet<string> = new Set(),
  ) {
    this.timer = new Timer(clock);
    this.pace = new PaceBudget(clock);
  }

  get limitMs(): number {
    return this.mode === 'practice' ? 0 : getSubtest(this.subtest).minutes * 60_000;
  }

  async start(): Promise<Question | undefined> {
    this.timer.start(this.mode === 'practice' ? 'stopwatch' : 'countdown', this.limitMs);
    return this.next(this.strategy.initialDifficulty());
  }

  timerSnapshot(): TimerSnapshot { return this.timer.snapshot(); }
  paceSnapshot() { return this.pace.snapshot(); }
  get currentQuestion(): Question | undefined { return this.current; }
  get index(): number { return this.history.length; }
  get total(): number { return this.plannedItems; }
  get isFinished(): boolean { return this.finished; }

  /** Call from the UI clock tick; ends the session when a countdown reaches zero. */
  tick(): void {
    if (this.finished || this.mode === 'practice') return;
    if (this.timer.snapshot().level === 'done') {
      this.events.onTimeout?.();
      this.finish();
    }
  }

  async answer(choice: number): Promise<Question | undefined> {
    if (this.finished || !this.current) return undefined;
    const q = this.current;
    const record: AnswerRecord = {
      questionId: q.id,
      difficulty: q.difficulty,
      choice,
      correct: choice === q.answer,
      timeMs: this.pace.spentMs(),
    };
    this.history.push(record);
    this.events.onAnswer?.(record, q);
    if (this.history.length >= this.plannedItems) { this.finish(); return undefined; }
    return this.next(this.strategy.nextDifficulty(this.history));
  }

  finish(): SessionSummary {
    if (this.finished) return this.summary();
    this.finished = true;
    this.timer.stop();
    const s = this.summary();
    this.events.onFinish?.(s);
    return s;
  }

  private async next(difficulty: Question['difficulty']): Promise<Question | undefined> {
    const q = await this.bank.pick(this.subtest, difficulty, this.seen, this.avoid);
    if (!q) { this.finish(); return undefined; }
    this.seen.add(q.id);
    this.current = q;
    this.pace.beginItem(this.subtest);
    this.events.onQuestion?.(q, this.history.length, this.plannedItems);
    return q;
  }

  private summary(): SessionSummary {
    const answered = this.history.length;
    return {
      subtest: this.subtest,
      mode: this.mode,
      plannedItems: this.plannedItems,
      answered,
      unanswered: Math.max(0, this.plannedItems - answered),
      correct: this.history.filter((r) => r.correct).length,
      usedMs: this.timer.snapshot().elapsedMs,
      limitMs: this.limitMs,
      standardScore: this.strategy.estimateStandardScore(this.history, this.plannedItems),
      history: this.history.slice(),
    };
  }
}
