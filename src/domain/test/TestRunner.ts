import type { QuestionBank } from '../questions/QuestionBank';
import { AdaptiveStrategy } from '../session/AdaptiveStrategy';
import { SessionEngine, type SessionEvents, type SessionSummary } from '../session/SessionEngine';
import type { Clock } from '../timing/Clock';
import type { PlanStep, TestPlan } from './TestPlan';

/** What survives a reload: counts only, never the per-item history (that lives in Progress.events). */
export type StepSummary = Omit<SessionSummary, 'history'>;

export interface ActiveTest {
  readonly mode: TestPlan['mode'];
  readonly steps: readonly PlanStep[];
  readonly stepIndex: number;             // next step to run
  readonly summaries: readonly StepSummary[];
  readonly startedAt: string;
}

export interface RunnerEvents extends SessionEvents {
  /** Fired after each subtest finishes; index is the step that just finished. */
  onStepDone?(summary: SessionSummary, index: number): void;
  onAllDone?(summaries: readonly StepSummary[]): void;
}

/**
 * Runs a TestPlan one subtest at a time. Each step is a fresh SessionEngine with the
 * adaptive strategy and the step's own clock. The runner exposes a serializable
 * ActiveTest so an interrupted test resumes at the start of the next unfinished
 * subtest (the real CAT does not pause either; an interrupted subtest is restarted).
 */
export class TestRunner {
  private engine: SessionEngine | null = null;
  private state: ActiveTest;

  constructor(
    plan: TestPlan | ActiveTest,
    private readonly bank: QuestionBank,
    private readonly clock: Clock,
    private readonly events: RunnerEvents = {},
    private readonly avoid: ReadonlySet<string> = new Set(),
  ) {
    this.state = 'stepIndex' in plan
      ? plan
      : { mode: plan.mode, steps: plan.steps, stepIndex: 0, summaries: [], startedAt: new Date(clock.now()).toISOString() };
  }

  get active(): ActiveTest { return this.state; }
  get currentStep(): PlanStep | undefined { return this.state.steps[this.state.stepIndex]; }
  get currentEngine(): SessionEngine | null { return this.engine; }
  get isDone(): boolean { return this.state.stepIndex >= this.state.steps.length; }

  /** Build (but do not start) the engine for the current step. The UI starts it when the student presses Begin. */
  async prepareStep(): Promise<SessionEngine | null> {
    const step = this.currentStep;
    if (!step) return null;
    const available = (await this.bank.all(step.subtest)).length;
    const planned = Math.min(step.items, available);
    this.engine = new SessionEngine(step.subtest, this.state.mode, planned, this.bank, new AdaptiveStrategy(), this.clock, {
      ...this.events,
      onFinish: (s) => {
        this.events.onFinish?.(s);
        this.completeStep(s);
      },
    }, this.avoid);
    return this.engine;
  }

  private completeStep(summary: SessionSummary): void {
    const index = this.state.stepIndex;
    const { history: _history, ...counts } = summary;
    this.state = { ...this.state, stepIndex: index + 1, summaries: [...this.state.summaries, counts] };
    this.engine = null;
    this.events.onStepDone?.(summary, index);
    if (this.isDone) this.events.onAllDone?.(this.state.summaries);
  }
}
