/**
 * Composition root — the only file that knows concrete implementations.
 * Swap IndexedDbStore for a SyncingStore, or JsonQuestionSource for a server,
 * and nothing else in the app changes.
 */
import './ui/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { systemClock } from '@domain/timing/Clock';
import { QuestionBank } from '@domain/questions/QuestionBank';
import { JsonQuestionSource } from '@domain/questions/JsonQuestionSource';
import { Scorer } from '@domain/scoring/Scorer';
import { DiagnosticAnalyzer } from '@domain/analysis/DiagnosticAnalyzer';
import { IndexedDbStore } from '@domain/storage/IndexedDbStore';
import { ProgressService } from '@domain/storage/ProgressService';
import { BackupService } from '@domain/storage/BackupService';
import { I18n } from '@domain/i18n/i18n';
import { Strategies } from '@domain/strategy/Strategies';
import { JsonLessonSource, LessonLibrary } from '@domain/lessons/Lessons';
import { Topics } from '@domain/topics/Topics';
import { StudyPlanBuilder } from '@domain/analysis/StudyPlanBuilder';
import { AppShell } from '@ui/AppShell';
import { HomeScreen } from '@ui/screens/HomeScreen';
import { PracticeScreen } from '@ui/screens/PracticeScreen';
import { TestScreen } from '@ui/screens/TestScreen';
import { LearnScreen } from '@ui/screens/LearnScreen';
import { ResultsScreen } from '@ui/screens/ResultsScreen';
import { StrategyScreen } from '@ui/screens/StrategyScreen';
import { SettingsScreen } from '@ui/screens/SettingsScreen';
import { applyTheme } from '@ui/theme';
import type { AppContext } from '@ui/context';

async function boot(): Promise<void> {
  registerSW({ immediate: true });

  const clock = systemClock;
  const store = new IndexedDbStore();
  void store.requestPersistence();
  const progress = new ProgressService(store, clock);
  const saved = await progress.init(navigator.language.startsWith('es') ? 'es' : 'en');
  applyTheme(saved.settings.theme);
  const i18n = new I18n(saved.profile.locale);
  i18n.onChange((l) => void progress.setLocale(l));

  const scorer = new Scorer();
  const topics = new Topics();
  const base = {
    i18n, clock, scorer,
    bank: new QuestionBank(new JsonQuestionSource()),
    analyzer: new DiagnosticAnalyzer(scorer),
    progress,
    backup: new BackupService(store, clock),
    strategies: new Strategies(),
    lessons: new LessonLibrary(new JsonLessonSource()),
    topics,
    studyPlan: new StudyPlanBuilder(scorer, topics),
  };

  // Screens receive the full context; the shell provides navigate/setTimerSource.
  let shell: AppShell;
  const ctx: AppContext = {
    ...base,
    navigate: (id, params) => void shell.navigate(id, params),
    setTimerSource: (src) => shell.setTimerSource(src),
  };
  shell = new AppShell(base, {
    home: new HomeScreen(ctx),
    learn: new LearnScreen(ctx),
    practice: new PracticeScreen(ctx),
    test: new TestScreen(ctx),
    results: new ResultsScreen(ctx),
    strategy: new StrategyScreen(ctx),
    settings: new SettingsScreen(ctx),
  });
  shell.mount(document.getElementById('app') as HTMLElement);
  await shell.navigate('home');
}

void boot();
