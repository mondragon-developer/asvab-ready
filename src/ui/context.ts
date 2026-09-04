import type { QuestionBank } from '@domain/questions/QuestionBank';
import type { Scorer } from '@domain/scoring/Scorer';
import type { DiagnosticAnalyzer } from '@domain/analysis/DiagnosticAnalyzer';
import type { ProgressService } from '@domain/storage/ProgressService';
import type { BackupService } from '@domain/storage/BackupService';
import type { I18n } from '@domain/i18n/i18n';
import type { Clock } from '@domain/timing/Clock';
import type { SubtestCode } from '@domain/config/subtests';
import type { Strategies } from '@domain/strategy/Strategies';
import type { LessonLibrary } from '@domain/lessons/Lessons';
import type { Topics } from '@domain/topics/Topics';
import type { StudyPlanBuilder } from '@domain/analysis/StudyPlanBuilder';

export interface NavParams { subtest?: SubtestCode; topic?: string; lesson?: string }

export type ScreenId = 'home' | 'learn' | 'practice' | 'test' | 'results' | 'strategy' | 'settings';
/** Screens that appear in the tab bar, in order. Settings lives behind the gear in the header. */
export const NAV_SCREENS: readonly ScreenId[] = ['home', 'learn', 'practice', 'test', 'results', 'strategy'];

/** Everything a screen may depend on — injected once by main.ts (composition root). */
export interface AppContext {
  readonly i18n: I18n;
  readonly clock: Clock;
  readonly bank: QuestionBank;
  readonly scorer: Scorer;
  readonly analyzer: DiagnosticAnalyzer;
  readonly progress: ProgressService;
  readonly backup: BackupService;
  readonly strategies: Strategies;
  readonly lessons: LessonLibrary;
  readonly topics: Topics;
  readonly studyPlan: StudyPlanBuilder;
  navigate(screen: ScreenId, params?: NavParams): void;
  /** The header timer chip subscribes to whichever session is active. */
  setTimerSource(source: TimerSource | null): void;
}

export interface TimerSource {
  timerSnapshot(): { mode: 'stopwatch' | 'countdown'; elapsedMs: number; remainingMs: number; level: string; running: boolean };
  tick(): void;
}

export interface Screen {
  render(host: HTMLElement, params?: NavParams): void | Promise<void>;
  /** Called when the user leaves the screen. */
  dispose?(): void;
}
