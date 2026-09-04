import { describe, expect, it } from 'vitest';
import { StudyPlanBuilder } from '@domain/analysis/StudyPlanBuilder';
import { Scorer } from '@domain/scoring/Scorer';
import { Topics } from '@domain/topics/Topics';
import { QuestionBank } from '@domain/questions/QuestionBank';
import { StaticQuestionSource } from '@domain/questions/JsonQuestionSource';
import type { Difficulty, Question } from '@domain/questions/types';
import type { AnswerEvent } from '@domain/storage/Progress';
import { SUBTESTS } from '@domain/config/subtests';

const topics = new Topics();
const builder = new StudyPlanBuilder(new Scorer(), topics);
const ev = (id: string, subtest: AnswerEvent['subtest'], correct: boolean): AnswerEvent =>
  ({ id: `e-${id}-${correct}`, sessionId: 's', questionId: id, subtest, choice: 0, correct, timeMs: 1000, at: '2026-09-04T00:00:00Z' });

describe('Topics taxonomy', () => {
  it('covers all 10 subtests and names every slug used in the banks', () => {
    for (const s of SUBTESTS) expect(topics.topics(s.code).length).toBeGreaterThan(0);
    expect(topics.name('AR', 'percent').en.toLowerCase()).toContain('percent');
  });
});

describe('StudyPlanBuilder', () => {
  it('ranks a weak, high-leverage subtest first and lists missed topics before untested ones', () => {
    const events = [
      ev('wk-0001', 'WK', false), ev('wk-0002', 'WK', false), ev('wk-0003', 'WK', true),   // WK 33 %
      ev('ei-0001', 'EI', false), ev('ei-0002', 'EI', false), ev('ei-0003', 'EI', false),  // EI 0 % but leverage 0
      ev('mk-0001', 'MK', true), ev('mk-0002', 'MK', true), ev('mk-0003', 'MK', true), ev('mk-0004', 'MK', true), ev('mk-0005', 'MK', true), // MK strong
    ];
    const topicOf = (id: string) => ({ 'wk-0001': 'synonym', 'wk-0002': 'synonym', 'wk-0003': 'prefix', 'ei-0001': 'ohms-law', 'ei-0002': 'ohms-law', 'ei-0003': 'components', 'mk-0001': 'angles', 'mk-0002': 'angles', 'mk-0003': 'area', 'mk-0004': 'area', 'mk-0005': 'area' } as Record<string, string>)[id];
    const plan = builder.build({ events, topicOf, lessonFor: (s, slug) => (s === 'WK' && slug === 'synonym' ? 'wk-synonym' : null) });

    expect(plan.subtests[0]?.subtest).toBe('WK');           // 33 % × (1 + 1.31) beats EI 0 % × 1
    expect(plan.weaknesses).toContain('WK');
    expect(plan.weaknesses).toContain('EI');
    expect(plan.strengths).toEqual(['MK']);

    const wk = plan.subtests.find((s) => s.subtest === 'WK')!;
    expect(wk.level).toBe('weak');
    expect(wk.study[0]?.slug).toBe('synonym');               // missed first
    expect(wk.study[0]?.status).toBe('missed');
    expect(wk.study[0]?.lessonId).toBe('wk-synonym');
    expect(wk.solid.map((t) => t.slug)).toContain('prefix'); // 1/1 → solid
    const untested = wk.study.filter((t) => t.status === 'untested');
    expect(untested.length).toBeGreaterThan(0);
    // untested topics come sorted by weight, high-yield first
    expect(untested[0]!.weight).toBeGreaterThanOrEqual(untested[untested.length - 1]!.weight);
  });
  it('marks never-practised subtests as untested with mid priority', () => {
    const plan = builder.build({ events: [], topicOf: () => undefined, lessonFor: () => null });
    expect(plan.subtests.every((s) => s.level === 'untested')).toBe(true);
    expect(plan.subtests[0]?.subtest).toBe('WK');           // highest leverage breaks the tie
  });
});

describe('QuestionBank.pick prefers unseen items across sessions', () => {
  const q = (id: string, d: Difficulty): Question => ({ id, subtest: 'WK', topic: 't', difficulty: d, source: 'original', version: 1, answer: 0, stem: { en: id, es: id }, explanation: { en: 'e', es: 'e' }, choices: [{ en: 'a', es: 'a' }, { en: 'b', es: 'b' }, { en: 'c', es: 'c' }, { en: 'd', es: 'd' }] });
  const items = [q('a', 2), q('b', 2), q('c', 2), q('d', 1)];
  it('never returns an avoided item while unseen items exist, then falls back', async () => {
    const bank = new QuestionBank(new StaticQuestionSource(items), { next: () => 0.99 });
    const avoid = new Set(['a', 'b']);
    const first = await bank.pick('WK', 2, new Set(), avoid);
    expect(first?.id).toBe('c');
    const second = await bank.pick('WK', 2, new Set(['c']), avoid);
    expect(second?.id).toBe('d');                            // unseen at another difficulty beats seen at the same one
    const third = await bank.pick('WK', 2, new Set(['c', 'd']), avoid);
    expect(['a', 'b']).toContain(third?.id);                 // fallback once everything unseen is used
  });
});
