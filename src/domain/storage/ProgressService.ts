import { emptyProgress, rebuildEstimates, rebuildMastery, type AnswerEvent, type Progress, type SessionRecord } from './Progress';
import type { ProgressStore } from './ProgressStore';
import type { Clock } from '../timing/Clock';
import type { SessionSummary } from '../session/SessionEngine';
import type { AnswerRecord } from '../session/SessionStrategy';
import type { Question } from '../questions/types';
import type { ActiveTest } from '../test/TestRunner';

export interface IdGen { next(prefix: string): string }

export const randomIds: IdGen = {
  next: (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
};

/**
 * Application service that records what the student does. Small, frequent writes:
 * one answered item = one save, so a closed tab loses one item, not a test.
 */
export class ProgressService {
  private progress: Progress | null = null;

  constructor(private readonly store: ProgressStore, private readonly clock: Clock, private readonly ids: IdGen = randomIds) {}

  async init(locale: Progress['profile']['locale'] = 'en'): Promise<Progress> {
    this.progress = (await this.store.load()) ?? emptyProgress(this.nowIso(), locale);
    return this.progress;
  }

  get current(): Progress {
    if (!this.progress) throw new Error('ProgressService.init() not called');
    return this.progress;
  }

  async startSession(mode: SessionRecord['mode'], subtest: SessionRecord['subtest'], limitSec: number): Promise<string> {
    const id = this.ids.next('s');
    this.current.sessions.push({ id, mode, subtest, startedAt: this.nowIso(), endedAt: null, limitSec, usedSec: 0, answered: 0, unanswered: 0, correct: 0, standardScore: null });
    await this.commit();
    return id;
  }

  async recordAnswer(sessionId: string, record: AnswerRecord, q: Question): Promise<void> {
    const e: AnswerEvent = {
      id: this.ids.next('e'), sessionId, questionId: q.id, subtest: q.subtest,
      choice: record.choice, correct: record.correct, timeMs: record.timeMs, at: this.nowIso(),
    };
    this.current.events.push(e);
    if (!record.correct && !this.current.review.missedQueue.includes(q.id)) this.current.review.missedQueue.push(q.id);
    this.current.mastery = rebuildMastery(this.current.events);
    await this.commit();
  }

  async endSession(sessionId: string, summary: SessionSummary): Promise<void> {
    const s = this.current.sessions.find((x) => x.id === sessionId);
    if (!s) return;
    Object.assign(s, {
      endedAt: this.nowIso(), usedSec: Math.round(summary.usedMs / 1000), answered: summary.answered,
      unanswered: summary.unanswered, correct: summary.correct, standardScore: summary.standardScore,
    });
    this.current.estimates = rebuildEstimates(this.current.sessions);
    await this.commit();
  }

  async setLocale(locale: Progress['profile']['locale']): Promise<void> {
    this.current.profile.locale = locale;
    await this.commit();
  }

  /** Every question id the student has answered — fed to pickers as a soft 'avoid' set. */
  seenQuestionIds(): ReadonlySet<string> { return new Set(this.current.events.map((e) => e.questionId)); }

  async setTargetBranch(branch: string): Promise<void> {
    this.current.profile.targetBranch = branch;
    await this.commit();
  }

  async setActiveTest(state: ActiveTest | null): Promise<void> {
    this.current.activeTest = state;
    await this.commit();
  }

  async updateProfile(patch: Partial<Progress['profile']>): Promise<void> {
    Object.assign(this.current.profile, patch);
    await this.commit();
  }

  async updateSettings(patch: Partial<Progress['settings']>): Promise<void> {
    Object.assign(this.current.settings, patch);
    await this.commit();
  }

  /** Wipe everything and start over (keeps the language). */
  async reset(): Promise<Progress> {
    const locale = this.current.profile.locale;
    await this.store.clear();
    this.progress = emptyProgress(this.nowIso(), locale);
    await this.commit();
    return this.progress;
  }

  /** Replace in-memory state after an import. */
  adopt(p: Progress): void { this.progress = p; }

  private async commit(): Promise<void> {
    this.current.profile.updatedAt = this.nowIso();
    await this.store.save(this.current);
  }

  private nowIso(): string { return new Date(this.clock.now()).toISOString(); }
}
