import { describe, expect, it } from 'vitest';
import { QuestionBank } from '@domain/questions/QuestionBank';
import { StaticQuestionSource } from '@domain/questions/JsonQuestionSource';
import type { Difficulty, Question } from '@domain/questions/types';
import { SUBTESTS } from '@domain/config/subtests';
import { diagnosticPlan, fullPlan, planMinutes, subtestPlan } from '@domain/test/TestPlan';
import { TestRunner } from '@domain/test/TestRunner';
import { FakeClock } from '@domain/timing/Clock';
import { rebuildEstimates, type SessionRecord } from '@domain/storage/Progress';

const items: Question[] = [];
for (const s of SUBTESTS) for (const d of [1, 2, 3] as Difficulty[]) for (let i = 0; i < 6; i++) items.push({
  id: `${s.code}-${d}-${i}`, subtest: s.code, topic: 't', difficulty: d, source: 'original', version: 1, answer: 0,
  stem: { en: 's', es: 's' }, explanation: { en: 'e', es: 'e' },
  choices: [{ en: 'a', es: 'a' }, { en: 'b', es: 'b' }, { en: 'c', es: 'c' }, { en: 'd', es: 'd' }],
});
const bank = () => new QuestionBank(new StaticQuestionSource(items), { next: () => 0.42 });

describe('TestPlan', () => {
  it('diagnostic covers all 10 subtests with 5 items each and ~30 minutes', () => {
    const p = diagnosticPlan();
    expect(p.steps).toHaveLength(10);
    expect(p.steps.every((s) => s.items === 5)).toBe(true);
    expect(planMinutes(p)).toBeGreaterThanOrEqual(60);
    expect(planMinutes(p)).toBeLessThanOrEqual(80);
  });
  it('full plan is the official 135 items / 197 minutes', () => {
    const p = fullPlan();
    expect(p.steps.reduce((n, s) => n + s.items, 0)).toBe(135);
    expect(planMinutes(p)).toBe(197);
  });
  it('subtest plan is one step', () => {
    expect(subtestPlan('WK').steps).toEqual([{ subtest: 'WK', items: 15, minutes: 9 }]);
  });
});

describe('TestRunner', () => {
  it('abandoning a subtest does not score it or advance the step (it restarts on resume)', async () => {
    const runner = new TestRunner(diagnosticPlan(), bank(), new FakeClock());
    const engine = await runner.prepareStep();
    expect(runner.currentStep?.subtest).toBe('GS');
    await engine!.start();
    await engine!.answer(0);

    // What QuestionPlayer.dispose() now does in Test mode: tear down without finishing.
    // Finishing here is what used to skip the subtest.
    expect(engine!.isFinished).toBe(false);

    expect(runner.active.stepIndex).toBe(0);
    expect(runner.active.summaries).toHaveLength(0);
    expect(runner.currentStep?.subtest).toBe('GS');
  });

  it('finishing a subtest early does advance it (the pre-fix behaviour, still used by Practice)', async () => {
    const runner = new TestRunner(diagnosticPlan(), bank(), new FakeClock());
    const engine = await runner.prepareStep();
    await engine!.start();
    await engine!.answer(0);
    engine!.finish();

    expect(runner.active.stepIndex).toBe(1);
    expect(runner.active.summaries).toHaveLength(1);
  });

  it('runs a diagnostic step by step and reports completion', async () => {
    const done: number[] = [];
    let all = 0;
    const runner = new TestRunner(diagnosticPlan(2), bank(), new FakeClock(), { onStepDone: (_s, i) => done.push(i), onAllDone: () => { all++; } });
    while (!runner.isDone) {
      const engine = await runner.prepareStep();
      expect(engine).not.toBeNull();
      let q = await engine!.start();
      while (q) q = await engine!.answer(0);
    }
    expect(done).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(all).toBe(1);
    expect(runner.active.summaries).toHaveLength(10);
  });
  it('resumes from a saved ActiveTest at the next subtest', async () => {
    const first = new TestRunner(diagnosticPlan(2), bank(), new FakeClock());
    const e = await first.prepareStep();
    let q = await e!.start();
    while (q) q = await e!.answer(0);
    const saved = JSON.parse(JSON.stringify(first.active));
    const resumed = new TestRunner(saved, bank(), new FakeClock());
    expect(resumed.currentStep?.subtest).toBe('AR');
    expect(resumed.active.summaries).toHaveLength(1);
  });
});

describe('estimates: AS is the mean of AI and SI', () => {
  it('averages the two auto/shop subtests into one reported score', () => {
    const base = { id: '', mode: 'subtest' as const, startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:10:00Z', limitSec: 0, usedSec: 0, answered: 0, unanswered: 0, correct: 0 };
    const sessions: SessionRecord[] = [
      { ...base, id: '1', subtest: 'AI', standardScore: 40 },
      { ...base, id: '2', subtest: 'SI', standardScore: 60 },
      { ...base, id: '3', subtest: 'WK', standardScore: 55 },
    ];
    expect(rebuildEstimates(sessions).standard).toEqual({ AS: 50, WK: 55 });
  });
});
