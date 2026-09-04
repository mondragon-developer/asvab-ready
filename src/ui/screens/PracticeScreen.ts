import { SUBTESTS, type SubtestCode } from '@domain/config/subtests';
import { LinearStrategy } from '@domain/session/LinearStrategy';
import { SessionEngine, type SessionSummary } from '@domain/session/SessionEngine';
import { h, replace } from '../dom';
import type { AppContext, NavParams, Screen } from '../context';
import { QuestionPlayer } from '../components/QuestionPlayer';

export class PracticeScreen implements Screen {
  private player: QuestionPlayer | null = null;
  private subtest: SubtestCode = 'WK';
  private topic: string | undefined;
  private host: HTMLElement | null = null;

  constructor(private readonly ctx: AppContext) {}

  async render(host: HTMLElement, params?: NavParams): Promise<void> {
    this.dispose();
    this.host = host;
    if (params?.subtest) this.subtest = params.subtest;
    this.topic = params?.topic;
    const { i18n } = this.ctx;
    const playerHost = h('div', { class: 'player' });
    replace(host,
      h('div', { class: 'stack lg' },
        h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('practice.eyebrow')), h('h1', {}, i18n.t('practice.title')), this.topic ? h('span', { class: 'pill olive', style: 'margin-top:6px' }, this.topic) : null),
        h('div', { class: 'row' }, SUBTESTS.map((s) => h('button', { class: `pill btn-like ${s.code === this.subtest ? 'olive' : ''}`, onClick: () => this.render(host, { subtest: s.code }) }, s.code))),
        playerHost,
      ),
    );
    await this.startSession(playerHost);
  }

  private async startSession(playerHost: HTMLElement): Promise<void> {
    const { clock, progress } = this.ctx;
    const topic = this.topic;
    const scoped = topic ? this.ctx.bank.scoped((q) => q.topic === topic) : this.ctx.bank;
    const bank = (await scoped.all(this.subtest)).length ? scoped : this.ctx.bank;
    const planned = Math.min(10, (await bank.all(this.subtest)).length);
    const sessionId = await progress.startSession('practice', this.subtest, 0);
    const engine = new SessionEngine(this.subtest, 'practice', planned, bank, new LinearStrategy(2), clock, {
      onAnswer: (r, q) => { void progress.recordAnswer(sessionId, r, q); },
    }, progress.seenQuestionIds());
    this.player = new QuestionPlayer(this.ctx, engine, {
      reveal: true,
      onFinish: (s: SessionSummary) => {
        void progress.endSession(sessionId, s);
        replace(playerHost, h('div', { class: 'card lift stack' },
          h('h2', {}, this.ctx.i18n.t('q.finished')),
          h('p', { class: 'muted' }, `${s.correct} / ${s.answered}`),
          h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => { if (this.host) void this.render(this.host); } }, this.ctx.i18n.t('q.next'))),
        ));
      },
    });
    await this.player.mount(playerHost);
  }

  dispose(): void { this.player?.dispose(); this.player = null; }
}
