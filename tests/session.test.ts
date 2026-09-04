import { describe, expect, it } from 'vitest';
import { QuestionBank } from '@domain/questions/QuestionBank';
import { StaticQuestionSource } from '@domain/questions/JsonQuestionSource';
import type { Difficulty, Question } from '@domain/questions/types';
import { AdaptiveStrategy } from '@domain/session/AdaptiveStrategy';
import { LinearStrategy } from '@domain/session/LinearStrategy';
import { SessionEngine } from '@domain/session/SessionEngine';
import { FakeClock } from '@domain/timing/Clock';

function q(id: string, difficulty: Difficulty): Question {
  return {
    id, subtest: 'WK', topic: 't', difficulty, source: 'original', version: 1, answer: 0,
    stem: { en: id, es: id }, explanation: { en: 'e', es: 'e' },
    choices: [{ en: 'a', es: 'a' }, { en: 'b', es: 'b' }, { en: 'c', es: 'c' }, { en: 'd', es: 'd' }],
  };
}
const items: Question[] = [];
for (const d of [1, 2, 3] as Difficulty[]) for (let i = 0; i < 10; i++) items.push(q(`wk-${d}-${i}`, d));
const seq = (vals: number[]) => { let i = 0; return { next: () => vals[i++ % vals.length] ?? 0 }; };

describe('AdaptiveStrategy', () => {
  const s = new AdaptiveStrategy();
  it('starts medium, goes up on correct, down on wrong, clamped 1..3', () => {
    expect(s.initialDifficulty()).toBe(2);
    expect(s.nextDifficulty([{ questionId: 'x', difficulty: 2, choice: 0, correct: true, timeMs: 1 }])).toBe(3);
    expect(s.nextDifficulty([{ questionId: 'x', difficulty: 3, choice: 0, correct: true, timeMs: 1 }])).toBe(3);
    expect(s.nextDifficulty([{ questionId: 'x', difficulty: 1, choice: 1, correct: false, timeMs: 1 }])).toBe(1);
  });
  it('penalizes unanswered items at the end more than a single wrong guess', () => {
    const good = Array.from({ length: 15 }, (_, i) => ({ questionId: String(i), difficulty: 2 as Difficulty, choice: 0, correct: true, timeMs: 1 }));
    const oneWrong = [...good.slice(0, 14), { ...good[14]!, correct: false }];
    const fourUnreached = good.slice(0, 11);
    const full = s.estimateStandardScore(good, 15);
    expect(full).toBe(80);
    expect(s.estimateStandardScore(oneWrong, 15)).toBeGreaterThan(s.estimateStandardScore(fourUnreached, 15));
  });
});

describe('SessionEngine', () => {
  it('runs a practice session with the linear strategy and reveals answers', async () => {
    const bank = new QuestionBank(new StaticQuestionSource(items), seq([0.1, 0.5, 0.9]));
    const clock = new FakeClock();
    const engine = new SessionEngine('WK', 'practice', 3, bank, new LinearStrategy(2), clock);
    const first = await engine.start();
    expect(first?.difficulty).toBe(2);
    clock.advance(10_000);
    await engine.answer(0);
    await engine.answer(1);
    await engine.answer(0);
    expect(engine.isFinished).toBe(true);
    const summary = engine.finish();
    expect(summary.answered).toBe(3);
    expect(summary.correct).toBe(2);
    expect(summary.history[0]?.timeMs).toBe(10_000);
    expect(summary.limitMs).toBe(0);
  });
  it('runs a timed subtest with the adaptive ladder and never repeats an item', async () => {
    const bank = new QuestionBank(new StaticQuestionSource(items), seq([0.3, 0.7]));
    const clock = new FakeClock();
    const seen: string[] = [];
    const engine = new SessionEngine('WK', 'subtest', 15, bank, new AdaptiveStrategy(), clock, { onQuestion: (qq) => seen.push(qq.id) });
    let cur = await engine.start();
    expect(engine.limitMs).toBe(9 * 60_000);
    const difficulties: number[] = [];
    while (cur) { difficulties.push(cur.difficulty); cur = await engine.answer(0); } // always correct
    expect(new Set(seen).size).toBe(15);
    expect(difficulties.slice(0, 3)).toEqual([2, 3, 3]);
    expect(engine.finish().standardScore).toBeGreaterThan(70);
  });
  it('times out and counts unreached items as unanswered', async () => {
    const bank = new QuestionBank(new StaticQuestionSource(items), seq([0.2]));
    const clock = new FakeClock();
    let timedOut = false;
    const engine = new SessionEngine('WK', 'subtest', 15, bank, new AdaptiveStrategy(), clock, { onTimeout: () => { timedOut = true; } });
    await engine.start();
    await engine.answer(0);
    clock.advance(9 * 60_000 + 1);
    engine.tick();
    expect(timedOut).toBe(true);
    const s = engine.finish();
    expect(s.answered).toBe(1);
    expect(s.unanswered).toBe(14);
  });
});
