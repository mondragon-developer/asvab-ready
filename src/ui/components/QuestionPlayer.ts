import { secondsPerItem } from '@domain/config/subtests';
import type { Question } from '@domain/questions/types';
import type { SessionEngine, SessionSummary } from '@domain/session/SessionEngine';
import { h, replace } from '../dom';
import type { AppContext } from '../context';

export interface PlayerOptions {
  /** true = show correctness + explanation before moving on (practice). */
  reveal: boolean;
  /**
   * true (default) = leaving the screen finishes the session and reports what was answered.
   * Test mode passes false: abandoning a subtest must not score it or advance the TestRunner,
   * so the subtest restarts on resume (see docs/STATUS.md, decision 2026-09-03).
   */
  finishOnDispose?: boolean;
  onFinish(summary: SessionSummary): void;
}

/**
 * Renders one SessionEngine. Owns only presentation: which choice is selected,
 * the pace bar, the explanation panel. All rules live in the engine/strategy.
 */
export class QuestionPlayer {
  private host: HTMLElement | null = null;
  private paceEl: HTMLElement | null = null;
  private raf = 0;

  constructor(private readonly ctx: AppContext, private readonly engine: SessionEngine, private readonly opts: PlayerOptions) {}

  async mount(host: HTMLElement): Promise<void> {
    this.host = host;
    const first = await this.engine.start();
    this.ctx.setTimerSource(this.engine);
    this.loop();
    if (first) this.show(first); else this.finish();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ctx.setTimerSource(null);
    if (this.opts.finishOnDispose !== false && !this.engine.isFinished) this.engine.finish();
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.engine.isFinished) return;
    this.engine.tick();
    if (this.engine.isFinished) { this.finish(); return; }
    if (this.paceEl) {
      const p = this.engine.paceSnapshot();
      this.paceEl.className = `pace ${p.level === 'ok' ? '' : p.level}`;
      const bar = this.paceEl.firstElementChild as HTMLElement | null;
      if (bar) bar.style.width = `${Math.min(100, p.ratio * 100)}%`;
    }
  };

  private show(q: Question): void {
    if (!this.host) return;
    const { i18n } = this.ctx;
    let selected: number | null = null;
    let revealed = false;
    const total = this.engine.total;
    const idx = this.engine.index;

    this.paceEl = h('div', { class: 'pace', style: this.ctx.progress.current.settings.showPaceBar ? '' : 'visibility:hidden' }, h('i'));
    const choiceEls = q.choices.map((c, k) =>
      h('button', { class: 'choice', onClick: () => {
        if (revealed) return;
        selected = k;
        choiceEls.forEach((el, j) => el.classList.toggle('sel', j === k));
        submit.disabled = false;
      } }, h('span', { class: 'k' }, 'ABCD'[k] ?? ''), h('span', { html: i18n.text(c) })),
    );
    const expl = h('div');
    const submit = h('button', { class: 'btn primary', disabled: true, onClick: async () => {
      if (selected === null) return;
      if (this.opts.reveal && !revealed) {
        revealed = true;
        choiceEls.forEach((el, j) => { if (j === q.answer) el.classList.add('ok'); else if (j === selected) el.classList.add('bad'); });
        replace(expl, h('div', { class: 'expl' },
          h('div', { html: `<b>${i18n.t('q.why')}:</b> ${i18n.text(q.explanation)}` }),
          q.trap ? h('div', { class: 'trap', html: `<b>${i18n.t('q.trap')}:</b> ${i18n.text(q.trap)}` }) : null,
        ));
        submit.textContent = i18n.t('q.next');
        return;
      }
      const next = await this.engine.answer(selected);
      if (next) this.show(next); else this.finish();
    } }, this.opts.reveal ? i18n.t('q.check') : i18n.t('q.submit'));

    replace(this.host,
      h('div', { class: 'qhead' },
        h('span', { class: 'pill afqt' }, q.subtest),
        h('span', { class: 'small muted' }, i18n.t('q.of', { n: idx + 1, total })),
        h('span', { class: 'small muted mono' }, i18n.t('q.pace', { sec: secondsPerItem(q.subtest) })),
        this.paceEl,
      ),
      q.passage ? h('div', { class: 'passage', html: i18n.text(q.passage) }) : null,
      q.media ? h('div', { class: 'media', html: q.media }) : null,
      h('div', { class: 'stem', html: i18n.text(q.stem) }),
      h('div', { class: 'choices' }, choiceEls),
      h('div', { class: 'row' }, submit, this.opts.reveal ? null : h('span', { class: 'small muted' }, i18n.t('q.noBack'))),
      expl,
    );
  }

  private finish(): void {
    cancelAnimationFrame(this.raf);
    this.ctx.setTimerSource(null);
    this.opts.onFinish(this.engine.finish());
  }
}
