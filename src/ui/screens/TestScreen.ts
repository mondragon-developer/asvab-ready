import { SUBTESTS, getSubtest, secondsPerItem, type SubtestCode } from '@domain/config/subtests';
import type { SessionSummary } from '@domain/session/SessionEngine';
import { diagnosticPlan, fullPlan, planMinutes, subtestPlan, type TestPlan } from '@domain/test/TestPlan';
import { TestRunner, type ActiveTest } from '@domain/test/TestRunner';
import { h, replace, toast } from '../dom';
import type { AppContext, Screen } from '../context';
import { QuestionPlayer } from '../components/QuestionPlayer';

/**
 * Test lobby + runner UI. Three modes (diagnostic, full CAT, single subtest), a resume
 * banner for an interrupted test, per-subtest intro cards, and a break card between
 * subtests. All rules come from TestRunner/SessionEngine; this file only paints.
 */
export class TestScreen implements Screen {
  private player: QuestionPlayer | null = null;
  private host: HTMLElement | null = null;
  private sessionId = '';

  constructor(private readonly ctx: AppContext) {}

  render(host: HTMLElement): void {
    this.dispose();
    this.host = host;
    const { i18n, progress } = this.ctx;
    const active = progress.current.activeTest ?? null;
    const diag = diagnosticPlan();
    const full = fullPlan();

    replace(host,
      h('div', { class: 'stack lg' },
        h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('test.eyebrow')), h('h1', {}, i18n.t('test.title'))),
        active && active.stepIndex < active.steps.length ? this.resumeBanner(active) : null,
        h('div', { class: 'grid g3' },
          this.modeCard(i18n.t('test.diag'), i18n.t('test.diagDesc', { min: planMinutes(diag) }), i18n.t('test.startHere'), 'olive', () => this.run(diag)),
          this.modeCard(i18n.t('test.full'), i18n.t('test.fullDesc'), `${Math.round(planMinutes(full) / 60 * 10) / 10} h`, '', () => this.run(full)),
          this.modeCard(i18n.t('test.single'), i18n.t('test.singleDesc'), '6–55 min', '', () => this.pickSubtest()),
        ),
        this.layoutTable(),
      ),
    );
  }

  private modeCard(title: string, desc: string, pill: string, pillClass: string, onClick: () => void): HTMLElement {
    return h('button', { class: 'mode', onClick }, h('span', { class: 't' }, title), h('span', { class: 'muted small' }, desc), h('span', { class: `pill ${pillClass}` }, pill));
  }

  private resumeBanner(active: ActiveTest): HTMLElement {
    const { i18n } = this.ctx;
    const next = active.steps[active.stepIndex];
    return h('div', { class: 'card lift stack', style: 'border-color:var(--brass)' },
      h('div', { class: 'eyebrow' }, i18n.t('test.resumeEyebrow')),
      h('h3', {}, i18n.t('test.resumeTitle', { done: active.stepIndex, total: active.steps.length, next: next ? next.subtest : '' })),
      h('div', { class: 'row' },
        h('button', { class: 'btn brass', onClick: () => this.run(active) }, i18n.t('test.resume')),
        h('button', { class: 'btn ghost', onClick: async () => { await this.ctx.progress.setActiveTest(null); this.render(this.host!); } }, i18n.t('test.discard')),
      ),
    );
  }

  private layoutTable(): HTMLElement {
    const { i18n } = this.ctx;
    return h('div', { class: 'card' },
      h('h3', {}, i18n.t('test.layoutTitle')),
      h('div', { class: 'tablewrap', style: 'margin-top:10px' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, i18n.t('test.thSubtest')), h('th', { class: 'n' }, i18n.t('test.thScored')), h('th', { class: 'n' }, i18n.t('units.min')), h('th', { class: 'n' }, i18n.t('units.perItem')), h('th', {}, i18n.t('test.thCounts')))),
        h('tbody', {}, SUBTESTS.map((s) => h('tr', {},
          h('td', {}, h('b', {}, s.code), ` · ${i18n.text(s.name)}`),
          h('td', { class: 'n' }, String(s.scoredItems)), h('td', { class: 'n' }, String(s.minutes)), h('td', { class: 'n' }, String(secondsPerItem(s.code))),
          h('td', {}, s.afqt ? h('span', { class: 'pill afqt' }, i18n.t('afqt.yes')) : h('span', { class: 'small muted' }, i18n.t('afqt.no'))),
        ))),
      )),
      h('p', { class: 'footnote', style: 'margin-top:8px' }, i18n.t('test.tryoutNote')),
    );
  }

  private pickSubtest(): void {
    const { i18n } = this.ctx;
    replace(this.host!, h('div', { class: 'stack lg' },
      h('h2', {}, i18n.t('test.single')),
      h('div', { class: 'tiles' }, SUBTESTS.map((s) => h('button', { class: 'tile', onClick: () => this.run(subtestPlan(s.code)) },
        h('span', { class: 'ab' }, s.code), h('span', { class: 'nm' }, i18n.text(s.name)), h('span', { class: 'meta' }, `${s.scoredItems} q · ${s.minutes} ${i18n.t('units.min')}`)))),
      h('button', { class: 'btn ghost', onClick: () => this.render(this.host!) }, i18n.t('test.back')),
    ));
  }

  /* ---------- running a plan ---------- */

  private run(plan: TestPlan | ActiveTest): void {
    const { bank, clock, progress } = this.ctx;
    const runner = new TestRunner(plan, bank, clock, {
      onAnswer: (r, q) => { void progress.recordAnswer(this.sessionId, r, q); },
      onTimeout: () => toast(this.ctx.i18n.t('q.timeout')),
      onStepDone: () => { if (!runner.isDone && runner.active.mode !== 'subtest') void progress.setActiveTest(runner.active); },
      onAllDone: () => { void progress.setActiveTest(null); },
    }, progress.seenQuestionIds());
    if (runner.active.mode !== 'subtest') void progress.setActiveTest(runner.active);
    void this.intro(runner);
  }

  private async intro(runner: TestRunner): Promise<void> {
    const { i18n } = this.ctx;
    const step = runner.currentStep;
    if (!step) return this.finished(runner);
    const spec = getSubtest(step.subtest);
    const engine = await runner.prepareStep();
    if (!engine) return this.finished(runner);
    replace(this.host!, h('div', { class: 'card lift stack', style: 'max-width:720px' },
      h('div', { class: 'eyebrow' }, `${i18n.t(`test.mode.${runner.active.mode}`)} · ${runner.active.stepIndex + 1} / ${runner.active.steps.length}`),
      h('h2', {}, `${spec.code} · ${i18n.text(spec.name)}`),
      h('div', { class: 'row' }, h('span', { class: 'pill' }, `${engine.total} q`), h('span', { class: 'pill' }, `${step.minutes} ${i18n.t('units.min')}`), h('span', { class: 'pill' }, `${secondsPerItem(spec.code)} ${i18n.t('units.perItem')}`)),
      h('p', { class: 'muted' }, i18n.t('test.beginNote')),
      this.rules(),
      h('div', { class: 'row' },
        h('button', { class: 'btn brass', onClick: () => this.play(runner) }, i18n.t('test.begin')),
        h('button', { class: 'btn ghost', onClick: () => this.render(this.host!) }, i18n.t('test.pauseLater')),
      ),
    ));
  }

  /**
   * The CAT rules a student must know before the clock starts. They also live in the
   * Strategy screen, but a student who goes straight to Test would never read them there.
   * Collapsed by default so Begin stays above the fold on a 390 px phone.
   */
  private rules(): HTMLElement {
    const { i18n } = this.ctx;
    const keys = ['test.rule.noBack', 'test.rule.answerAll', 'test.rule.keepMoving', 'test.rule.harder', 'test.rule.noCalc', 'test.rule.restart'];
    return h('details', { class: 'rules' },
      h('summary', {}, i18n.t('test.rulesTitle')),
      h('div', { class: 'body' }, h('ul', {}, keys.map((k) => h('li', {}, i18n.t(k))))),
    );
  }

  private async play(runner: TestRunner): Promise<void> {
    const { progress } = this.ctx;
    const step = runner.currentStep!;
    const engine = runner.currentEngine!;
    this.sessionId = await progress.startSession(runner.active.mode, step.subtest, step.minutes * 60);
    const sessionId = this.sessionId;
    const playerHost = h('div', { class: 'player' });
    replace(this.host!, playerHost);
    this.player = new QuestionPlayer(this.ctx, engine, {
      reveal: false,
      finishOnDispose: false,
      onFinish: (s: SessionSummary) => {
        void progress.endSession(sessionId, s);
        this.player = null;
        this.breakCard(runner, s);
      },
    });
    await this.player.mount(playerHost);
  }

  private breakCard(runner: TestRunner, s: SessionSummary): void {
    const { i18n } = this.ctx;
    if (runner.isDone) return this.finished(runner);
    replace(this.host!, h('div', { class: 'card lift stack', style: 'max-width:720px' },
      h('h2', {}, `${s.subtest} · ${i18n.t('q.finished')}`),
      h('div', { class: 'row' }, h('span', { class: 'pill' }, `${s.answered} / ${s.plannedItems}`), h('span', { class: 'pill' }, `${Math.round(s.usedMs / 1000)} s`), s.unanswered ? h('span', { class: 'pill crit' }, `${s.unanswered} ${i18n.t('test.unanswered')}`) : null),
      h('p', { class: 'muted' }, i18n.t('test.breakNote', { next: runner.currentStep?.subtest ?? '' })),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onClick: () => void this.intro(runner) }, i18n.t('test.continue')),
        h('button', { class: 'btn ghost', onClick: () => this.render(this.host!) }, i18n.t('test.pauseLater')),
      ),
    ));
  }

  private finished(runner: TestRunner): void {
    const { i18n, scorer, progress } = this.ctx;
    const report = scorer.report(progress.current.estimates.standard, progress.current.profile.targetBranch);
    replace(this.host!, h('div', { class: 'card lift stack', style: 'max-width:720px' },
      h('div', { class: 'eyebrow' }, i18n.t(`test.mode.${runner.active.mode}`)),
      h('h2', {}, i18n.t('test.allDone')),
      report.afqt !== null ? h('p', { class: 'muted' }, `AFQT ≈ ${report.afqt} · ${report.category}`) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onClick: () => this.ctx.navigate('results') }, i18n.t('nav.results')),
        h('button', { class: 'btn ghost', onClick: () => this.render(this.host!) }, i18n.t('test.back')),
      ),
    ));
  }

  dispose(): void { this.player?.dispose(); this.player = null; }
}
