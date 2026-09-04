import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '@domain/storage/ProgressStore';
import { IndexedDbStore } from '@domain/storage/IndexedDbStore';
import { ProgressService } from '@domain/storage/ProgressService';
import { BackupService } from '@domain/storage/BackupService';
import { emptyProgress, mergeProgress, migrate } from '@domain/storage/Progress';
import { FakeClock } from '@domain/timing/Clock';
import type { Question } from '@domain/questions/types';

const q: Question = {
  id: 'wk-0001', subtest: 'WK', topic: 't', difficulty: 2, source: 'original', version: 1, answer: 1,
  stem: { en: 's', es: 's' }, explanation: { en: 'e', es: 'e' },
  choices: [{ en: 'a', es: 'a' }, { en: 'b', es: 'b' }, { en: 'c', es: 'c' }, { en: 'd', es: 'd' }],
};
let n = 0;
const ids = { next: (p: string) => `${p}_${++n}` };

describe('ProgressService', () => {
  it('saves after every answer and rebuilds mastery', async () => {
    const store = new MemoryStore();
    const clock = new FakeClock();
    const svc = new ProgressService(store, clock, ids);
    await svc.init('es');
    const sid = await svc.startSession('practice', 'WK', 0);
    await svc.recordAnswer(sid, { questionId: q.id, difficulty: 2, choice: 0, correct: false, timeMs: 5000 }, q);
    const saved = await store.load();
    expect(saved?.events).toHaveLength(1);
    expect(saved?.mastery.WK).toEqual({ seen: 1, correct: 0, avgMs: 5000, lastAt: saved?.events[0]?.at });
    expect(saved?.review.missedQueue).toEqual(['wk-0001']);
    expect(saved?.profile.locale).toBe('es');
  });
});

describe('IndexedDbStore', () => {
  it('round-trips a progress document', async () => {
    const store = new IndexedDbStore();
    const p = emptyProgress('2026-09-03T00:00:00Z');
    p.profile.displayName = 'R.';
    await store.save(p);
    expect((await store.load())?.profile.displayName).toBe('R.');
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});

describe('Backup export / import / merge', () => {
  it('imports a file from another device as a union, never an overwrite', async () => {
    const clock = new FakeClock();
    clock.advance(Date.parse('2026-09-03T10:00:00Z'));
    const a = new MemoryStore();
    const svcA = new ProgressService(a, clock, ids);
    await svcA.init();
    const sA = await svcA.startSession('practice', 'WK', 0);
    await svcA.recordAnswer(sA, { questionId: q.id, difficulty: 2, choice: 1, correct: true, timeMs: 1000 }, q);
    const json = await new BackupService(a, clock).exportJson();
    expect(JSON.parse(json).review.lastBackupAt).toBe('2026-09-03T10:00:00.000Z');

    const b = new MemoryStore();
    const svcB = new ProgressService(b, clock, ids);
    await svcB.init();
    const sB = await svcB.startSession('subtest', 'AR', 3300);
    await svcB.recordAnswer(sB, { questionId: 'ar-0001', difficulty: 2, choice: 0, correct: false, timeMs: 2000 }, { ...q, id: 'ar-0001', subtest: 'AR' });

    const merged = await new BackupService(b, clock).importJson(json);
    expect(merged.events).toHaveLength(2);
    expect(merged.sessions).toHaveLength(2);
    expect(merged.mastery.WK?.correct).toBe(1);
    expect(merged.mastery.AR?.correct).toBe(0);
  });
  it('rejects foreign files and newer schema versions', () => {
    expect(() => migrate({ app: 'other' })).toThrow();
    expect(() => migrate({ app: 'asvab-ready', schemaVersion: 99 })).toThrow(/newer/);
  });
  it('merge is idempotent', () => {
    const p = emptyProgress('2026-01-01T00:00:00Z');
    expect(mergeProgress(p, p)).toEqual(p);
  });
});
