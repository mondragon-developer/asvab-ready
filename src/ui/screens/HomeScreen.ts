import { SUBTESTS } from '@domain/config/subtests';
import { reportedCode } from '@domain/storage/Progress';
import { h, replace, svg } from '../dom';
import type { AppContext, Screen } from '../context';

export class HomeScreen implements Screen {
  constructor(private readonly ctx: AppContext) {}

  render(host: HTMLElement): void {
    const { i18n, scorer, progress, backup } = this.ctx;
    const p = progress.current;
    const report = scorer.report(p.estimates.standard, p.profile.targetBranch);
    const days = backup.daysSinceBackup(p);
    const firstRun = p.events.length === 0;
    const nudge = !firstRun && (days === null ? p.events.length >= 20 : days >= 7);
    const backupNote = days === null ? i18n.t('home.backupNever') : i18n.t('home.backupDays', { days });
    const circumference = 2 * Math.PI * 64;
    const afqt = report.afqt;

    replace(host,
      h('div', { class: 'stack lg' },
        h('div', {}, h('div', { class: 'eyebrow' }, p.profile.displayName ? i18n.t('home.hello', { name: p.profile.displayName }) : i18n.t('brand')), h('h1', {}, firstRun ? i18n.t('home.welcomeTitle') : i18n.t('home.title'))),
        firstRun ? this.welcome() : null,
        h('div', { class: 'card lift hero' },
          h('div', { class: 'gauge' },
            svg('0 0 150 150', `<circle cx="75" cy="75" r="64" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="75" cy="75" r="64" fill="none" stroke="var(--brass)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - (afqt ?? 0) / 100)}" transform="rotate(-90 75 75)"/>`),
            h('div', { style: 'text-align:center' }, h('div', { class: 'n' }, afqt === null ? '—' : String(afqt)), h('div', { class: 'l' }, i18n.t('home.afqt'))),
          ),
          h('div', { class: 'stack' },
            h('h2', {}, afqt === null ? i18n.t('home.noData') : `AFQT ${afqt} · ${report.category}`),
            nudge ? h('p', { class: 'small', style: 'color:var(--warn)' }, `${backupNote} · `, h('button', { class: 'pill btn-like warn', onClick: () => this.ctx.navigate('settings') }, i18n.t('settings.export'))) : h('p', { class: 'small muted' }, afqt === null ? i18n.t('home.firstStep') : backupNote),
            h('div', { class: 'row' },
              h('button', { class: 'btn primary', onClick: () => this.ctx.navigate('test') }, afqt === null ? i18n.t('home.takeDiag') : i18n.t('nav.test')),
              h('button', { class: 'btn ghost', onClick: () => this.ctx.navigate('results') }, i18n.t('nav.results')),
            ),
          ),
        ),
        h('div', { class: 'card' },
          h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', {}, i18n.t('home.mastery')), h('span', { class: 'pill afqt' }, 'AFQT')),
          h('div', { class: 'stack', style: 'margin-top:12px;gap:8px' },
            SUBTESTS.map((s) => {
              const m = p.mastery[reportedCode(s.code)];
              const pct = m && m.seen ? Math.round((m.correct / m.seen) * 100) : 0;
              return h('div', { class: 'mrow' }, h('span', { class: 'k' }, s.code), h('div', { class: 'bar' }, h('i', { class: s.afqt ? 'afqt' : '', style: `width:${pct}%` })), h('span', { class: 'v' }, m?.seen ? `${pct} %` : '—'));
            }),
          ),
        ),
        h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('home.subtests')),
          h('div', { class: 'tiles', style: 'margin-top:8px' },
            SUBTESTS.map((s) => h('button', { class: 'tile', onClick: () => this.ctx.navigate('practice', { subtest: s.code }) },
              h('span', { class: 'ab' }, s.code), h('span', { class: 'nm' }, i18n.text(s.name)),
              h('span', { class: 'meta' }, `${s.scoredItems} q · ${s.minutes} ${i18n.t('units.min')}${s.afqt ? ' · AFQT' : ''}`))),
          ),
        ),
      ),
    );
  }

  /** First-run card: what the four areas are and the start-here path. Disappears after the first answer. */
  private welcome(): HTMLElement {
    const { i18n } = this.ctx;
    const step = (n: string, title: string, body: string, screen: 'settings' | 'test' | 'results' | 'learn') =>
      h('button', { class: 'welcome-step', onClick: () => this.ctx.navigate(screen) },
        h('span', { class: 'no' }, n), h('span', {}, h('b', {}, title), h('br'), h('span', { class: 'small muted' }, body)));
    return h('div', { class: 'card lift stack welcome' },
      h('p', {}, i18n.t('home.welcomeIntro')),
      h('div', { class: 'welcome-steps' },
        step('1', i18n.t('home.w1'), i18n.t('home.w1d'), 'settings'),
        step('2', i18n.t('home.w2'), i18n.t('home.w2d'), 'test'),
        step('3', i18n.t('home.w3'), i18n.t('home.w3d'), 'results'),
        step('4', i18n.t('home.w4'), i18n.t('home.w4d'), 'learn')),
      h('p', { class: 'small muted' }, i18n.t('home.welcomeInstall')),
    );
  }
}
