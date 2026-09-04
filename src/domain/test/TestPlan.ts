import { SUBTESTS, getSubtest, type SubtestCode } from '../config/subtests';
import type { SessionMode } from '../session/SessionEngine';

export interface PlanStep {
  readonly subtest: SubtestCode;
  readonly items: number;
  readonly minutes: number;
}

export interface TestPlan {
  readonly mode: SessionMode;
  readonly steps: readonly PlanStep[];
}

/** Diagnostic: a short pass through every subtest at the official pace (time scaled to item count). */
export function diagnosticPlan(itemsPerSubtest = 5): TestPlan {
  return {
    mode: 'diagnostic',
    steps: SUBTESTS.map((s) => ({
      subtest: s.code,
      items: Math.min(itemsPerSubtest, s.scoredItems),
      minutes: Math.max(1, Math.round((s.minutes * Math.min(itemsPerSubtest, s.scoredItems)) / s.scoredItems)),
    })),
  };
}

/** Full CAT-ASVAB: the official table, in the official order. */
export function fullPlan(): TestPlan {
  return { mode: 'full', steps: SUBTESTS.map((s) => ({ subtest: s.code, items: s.scoredItems, minutes: s.minutes })) };
}

/** One subtest under its official clock. */
export function subtestPlan(code: SubtestCode): TestPlan {
  const s = getSubtest(code);
  return { mode: 'subtest', steps: [{ subtest: s.code, items: s.scoredItems, minutes: s.minutes }] };
}

export function planMinutes(plan: TestPlan): number {
  return plan.steps.reduce((n, s) => n + s.minutes, 0);
}
