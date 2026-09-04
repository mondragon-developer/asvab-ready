import type { SubtestCode } from '../config/subtests';
import type { Locale } from '../questions/types';
import type { ReportedCode } from '../scoring/Scorer';
import type { SessionMode } from '../session/SessionEngine';
import type { ActiveTest } from '../test/TestRunner';

export const SCHEMA_VERSION = 1;

/** One answered item — the append-only source of truth. Never stores question text. */
export interface AnswerEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly questionId: string;
  readonly subtest: SubtestCode;
  readonly choice: number | null;
  readonly correct: boolean;
  readonly timeMs: number;
  readonly at: string; // ISO
}

export interface SessionRecord {
  readonly id: string;
  readonly mode: SessionMode;
  readonly subtest: SubtestCode;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly limitSec: number;
  readonly usedSec: number;
  readonly answered: number;
  readonly unanswered: number;
  readonly correct: number;
  readonly standardScore: number | null;
}

export interface MasteryStat { seen: number; correct: number; avgMs: number; lastAt: string | null }

export interface Progress {
  schemaVersion: number;
  app: 'asvab-ready';
  profile: {
    displayName: string;
    locale: Locale;
    targetBranch: string;
    targetAfqt: number;
    createdAt: string;
    updatedAt: string;
  };
  settings: { theme: 'system' | 'light' | 'dark'; showPaceBar: boolean; soundOnTimeout: boolean };
  sessions: SessionRecord[];
  events: AnswerEvent[];
  /** Cache — rebuildable from events. */
  mastery: Partial<Record<ReportedCode, MasteryStat>>;
  /** Cache — rebuildable from sessions. */
  estimates: { standard: Partial<Record<ReportedCode, number>>; computedAt: string | null };
  review: { missedQueue: string[]; lastBackupAt: string | null };
  /** An interrupted diagnostic/full test, resumable at its next subtest. */
  activeTest?: ActiveTest | null;
}


export function emptyProgress(now: string, locale: Locale = 'en'): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: 'asvab-ready',
    profile: { displayName: '', locale, targetBranch: 'army', targetAfqt: 50, createdAt: now, updatedAt: now },
    settings: { theme: 'system', showPaceBar: true, soundOnTimeout: true },
    sessions: [],
    events: [],
    mastery: {},
    estimates: { standard: {}, computedAt: null },
    review: { missedQueue: [], lastBackupAt: null },
    activeTest: null,
  };
}

/** AI and SI are practiced separately but reported together as AS. */
export function reportedCode(code: SubtestCode): ReportedCode {
  return code === 'AI' || code === 'SI' ? 'AS' : code;
}

/** Rebuild the mastery cache from the event log (also the recovery path). */
export function rebuildMastery(events: readonly AnswerEvent[]): Progress['mastery'] {
  const out: Progress['mastery'] = {};
  for (const e of events) {
    const code = reportedCode(e.subtest);
    const m = out[code] ?? { seen: 0, correct: 0, avgMs: 0, lastAt: null };
    m.avgMs = Math.round((m.avgMs * m.seen + e.timeMs) / (m.seen + 1));
    m.seen += 1;
    if (e.correct) m.correct += 1;
    if (!m.lastAt || e.at > m.lastAt) m.lastAt = e.at;
    out[code] = m;
  }
  return out;
}

/** Latest test-mode standard score per reported subtest. */
export function rebuildEstimates(sessions: readonly SessionRecord[]): Progress['estimates'] {
  const standard: Partial<Record<ReportedCode, number>> = {};
  let computedAt: string | null = null;
  const latest: Partial<Record<SubtestCode, number>> = {};
  for (const s of sessions) {
    if (s.mode === 'practice' || s.standardScore === null || !s.endedAt) continue;
    latest[s.subtest] = s.standardScore;
    if (!computedAt || s.endedAt > computedAt) computedAt = s.endedAt;
  }
  for (const [code, score] of Object.entries(latest) as [SubtestCode, number][]) {
    if (code === 'AI' || code === 'SI') continue;
    standard[reportedCode(code)] = score;
  }
  if (latest.AI !== undefined || latest.SI !== undefined) {
    const parts = [latest.AI, latest.SI].filter((x): x is number => x !== undefined);
    standard.AS = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }
  return { standard, computedAt };
}

/**
 * Merge two copies of the same student's history: union of events and sessions by id,
 * newer profile/settings win, caches rebuilt. Conflict-free by construction.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const newer = a.profile.updatedAt >= b.profile.updatedAt ? a : b;
  const byId = <T extends { id: string }>(xs: T[], ys: T[]) => {
    const m = new Map<string, T>();
    for (const x of [...xs, ...ys]) m.set(x.id, x);
    return [...m.values()];
  };
  const events = byId(a.events, b.events).sort((x, y) => x.at.localeCompare(y.at));
  const sessions = byId(a.sessions, b.sessions).sort((x, y) => x.startedAt.localeCompare(y.startedAt));
  return {
    ...newer,
    events,
    sessions,
    mastery: rebuildMastery(events),
    estimates: rebuildEstimates(sessions),
    review: {
      missedQueue: [...new Set([...a.review.missedQueue, ...b.review.missedQueue])],
      lastBackupAt: [a.review.lastBackupAt, b.review.lastBackupAt].filter(Boolean).sort().pop() ?? null,
    },
  };
}

/** Upgrade any older file to the current schema. Add a case per version bump. */
export function migrate(raw: unknown): Progress {
  const p = raw as Partial<Progress>;
  if (!p || p.app !== 'asvab-ready') throw new Error('Not an ASVAB Ready progress file');
  const version = p.schemaVersion ?? 0;
  if (version > SCHEMA_VERSION) throw new Error(`File is from a newer app version (${version})`);
  // version 0 → 1: nothing to do yet; future migrations go here.
  const base = emptyProgress(p.profile?.createdAt ?? new Date(0).toISOString(), p.profile?.locale);
  const merged: Progress = { ...base, ...p, schemaVersion: SCHEMA_VERSION } as Progress;
  merged.mastery = rebuildMastery(merged.events);
  merged.estimates = rebuildEstimates(merged.sessions);
  return merged;
}
