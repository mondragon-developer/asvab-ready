import { SUBTESTS, secondsPerItem, type SubtestCode } from '@domain/config/subtests';
import { reportedCode } from '@domain/storage/Progress';
import type { SubtestPlan, TopicPlan } from '@domain/analysis/StudyPlanBuilder';
import type { ReportedCode } from '@domain/scoring/Scorer';
import type { SubtestStat } from '@domain/analysis/DiagnosticAnalyzer';
import { h, replace } from '../dom';
import type { AppContext, Screen } from '../context';

const BRANCHES = ['army', 'navy', 'airforce', 'marines', 'coastguard'] as const;

/** Score simulator, weak-area ranking, timing report and review of missed items. */
export class ResultsScreen implements Screen {
  constructor(private readonly ctx: AppContext) {}

  async render(host: HTMLElement): Promise<void> {
    const { i18n, scorer, analyzer, progress, strategies, bank, lessons, studyPlan } = this.ctx;
    const p = progress.current;

    // Study plan: needs topic per answered question (from the banks) and lesson per topic.
    const topicOf = new Map<string, string>();
    for (const s of SUBTESTS) for (const q of await bank.all(s.code)) topicOf.set(q.id, q.topic);
    const lessonList = await lessons.all();
    const plan = studyPlan.build({
      events: p.events,
      topicOf: (id) => topicOf.get(id),
      lessonFor: (code, slug) => lessonList.find((l) => l.subtest === code && l.topic === slug)?.id ?? null,
    });
    const branch = p.profile.targetBranch;
    const report = scorer.report(p.estimates.standard, branch);
    const minimum = scorer.minimums().find((m) => m.branch === branch);

    const stats: SubtestStat[] = (Object.entries(p.mastery) as [ReportedCode, NonNullable<typeof p.mastery[ReportedCode]>][])
      .map(([code, m]) => ({ code, seen: m.seen, correct: m.correct, avgMs: m.avgMs }));
    const weak = analyzer.rank(stats);

    // Timing: latest timed session per subtest.
    const timing = new Map<SubtestCode, typeof p.sessions[number]>();
    for (const s of p.sessions) if (s.mode !== 'practice' && s.endedAt) timing.set(s.subtest, s);

    // Missed items: last 5 from the queue with their strategy tip.
    const missed = p.review.missedQueue.slice(-5).reverse();
    const missedCards = await Promise.all(missed.map(async (id) => {
      const code = id.slice(0, 2).toUpperCase() as SubtestCode;
      const q = (await bank.all(code)).find((x) => x.id === id);
      if (!q) return null;
      const tip = strategies.tipFor(q.strategyRef);
      return h('div', { class: 'expl' },
        h('div', { class: 'row' }, h('span', { class: 'pill' }, q.subtest), h('span', { class: 'small muted' }, q.topic)),
        h('div', { html: i18n.text(q.stem) }),
        h('div', { class: 'row' }, h('span', { class: 'pill good' }, `${i18n.t('results.answer')}: ${'ABCD'[q.answer]} · ${i18n.text(q.choices[q.answer]!)}`)),
        q.trap ? h('div', { class: 'trap', html: `<b>${i18n.t('q.trap')}:</b> ${i18n.text(q.trap)}` }) : null,
        tip ? h('div', { class: 'tip', style: 'border-left:3px solid var(--brass);padding-left:10px', html: `<b>${i18n.t('results.trick')}:</b> ${i18n.text(tip)}` }) : null,
      );
    }));

    replace(host, h('div', { class: 'stack lg' },
      h('div', {}, h('div', { class: 'eyebrow' }, p.estimates.computedAt ? i18n.t('results.eyebrow', { date: p.estimates.computedAt.slice(0, 10) }) : i18n.t('results.eyebrowNone')), h('h1', {}, i18n.t('results.title'))),
      h('div', { class: 'grid g2' },
        h('div', { class: 'card lift stack' },
          h('div', { class: 'eyebrow' }, i18n.t('results.afqt')),
          h('div', { class: 'row', style: 'align-items:baseline;gap:14px' }, h('span', { class: 'mono', style: 'font-size:2.6rem;line-height:1' }, report.afqt === null ? '—' : String(report.afqt)), report.category ? h('span', { class: 'pill afqt' }, report.category) : null),
          h('p', { class: 'small muted' }, i18n.t('results.formula')),
          report.afqt === null ? h('p', { class: 'small', style: 'color:var(--olive)' }, i18n.t('results.needAll'), ' ', h('button', { class: 'pill btn-like olive', onClick: () => this.ctx.navigate('test') }, i18n.t('home.takeDiag'))) : null,
          this.scoreRow('VE (WK + PC)', report.ve), this.scoreRow('AR', p.estimates.standard.AR), this.scoreRow('MK', p.estimates.standard.MK),
          minimum && report.afqt !== null ? h('p', { class: 'small', style: `color:var(--${report.afqt >= minimum.diploma ? 'good' : 'crit'})` }, i18n.t(report.afqt >= minimum.diploma ? 'results.meets' : 'results.below', { branch: i18n.text(minimum.name), min: minimum.diploma })) : null,
        ),
        h('div', { class: 'card stack' },
          h('div', { class: 'eyebrow' }, i18n.t('results.lines')),
          h('div', { class: 'row' }, BRANCHES.map((b) => h('button', { class: `pill btn-like ${b === branch ? 'olive' : ''}`, onClick: async () => { await progress.setTargetBranch(b); void this.render(host); } }, i18n.text(scorer.minimums().find((m) => m.branch === b)!.name)))),
          ...report.composites.map((c) => this.scoreRow(`${c.code} · ${i18n.text(c.name)}`, c.value)),
          report.composites.length === 0 ? h('p', { class: 'small muted' }, i18n.t('results.noComposites')) : null,
          h('p', { class: 'footnote' }, i18n.t('results.linesNote', { date: report.lastChecked })),
        ),
      ),
      h('div', { class: 'grid g2' },
        h('div', { class: 'card' },
          h('h3', {}, i18n.t('results.weak')),
          h('p', { class: 'small muted', style: 'margin:4px 0 8px' }, i18n.t('results.weakNote')),
          weak.length === 0 ? h('p', { class: 'muted' }, i18n.t('results.none')) : null,
          ...weak.map((w, i) => h('div', { class: 'rank', style: 'display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)' },
            h('span', { class: 'no', style: 'font-family:var(--display);font-weight:700;color:var(--ink-3)' }, String(i + 1)),
            h('span', {}, this.nameOf(w.code), w.leverage ? h('span', { class: 'pill afqt', style: 'margin-left:6px' }, `×${w.leverage.toFixed(1)}`) : null),
            h('span', { class: `pill ${w.level}` }, `${Math.round(w.accuracy * 100)} %`))),
        ),
        h('div', { class: 'card stack' },
          h('h3', {}, i18n.t('results.timing')),
          timing.size === 0 ? h('p', { class: 'muted' }, i18n.t('results.none')) : null,
          ...[...timing.values()].map((s) => {
            const avg = s.answered ? Math.round(s.usedSec / s.answered) : 0;
            const budget = secondsPerItem(s.subtest);
            const delta = avg - budget;
            return h('div', { class: 'scorerow', style: 'display:grid;grid-template-columns:1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)' },
              h('span', {}, `${s.subtest} · `, h('span', { class: 'muted small' }, i18n.t('results.avgItem'))),
              h('span', { class: 'mono' }, `${avg} s `, h('span', { class: `pill ${delta > 0 ? 'crit' : 'good'}` }, `${delta > 0 ? '+' : ''}${delta} s`), s.unanswered ? h('span', { class: 'pill crit', style: 'margin-left:6px' }, `${s.unanswered} ✕`) : null));
          }),
          h('p', { class: 'small muted' }, i18n.t('results.timingNote')),
        ),
      ),
      h('div', { class: 'card lift stack' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', {}, i18n.t('plan.title')), h('span', { class: 'small muted' }, i18n.t('plan.answered', { n: p.events.length }))),
        h('p', { class: 'small muted' }, i18n.t('plan.note')),
        plan.strengths.length || plan.weaknesses.length ? h('div', { class: 'row' },
          ...plan.strengths.map((c) => h('span', { class: 'pill good' }, `${i18n.t('plan.strong')} · ${c}`)),
          ...plan.weaknesses.map((c) => h('span', { class: 'pill crit' }, `${i18n.t('plan.weak')} · ${c}`))) : null,
        h('div', {}, plan.subtests.map((sp, i) => this.subtestPlan(sp, i === 0))),
      ),
      h('div', { class: 'card stack' },
        h('h3', {}, i18n.t('results.review')),
        h('p', { class: 'muted small' }, i18n.t('results.reviewNote')),
        missedCards.length ? missedCards : h('p', { class: 'muted' }, i18n.t('results.none')),
      ),
    ));
  }

  private subtestPlan(sp: SubtestPlan, open: boolean): HTMLElement {
    const { i18n } = this.ctx;
    const levelClass = sp.level === 'strong' ? 'good' : sp.level === 'ok' ? 'warn' : sp.level === 'weak' ? 'crit' : '';
    const acc = sp.accuracy === null ? '—' : `${Math.round(sp.accuracy * 100)} %`;
    const topicRow = (t: TopicPlan) => h('div', { class: 'topic-row' },
      h('span', { class: `pill ${t.status === 'missed' ? 'crit' : t.status === 'shaky' ? 'warn' : ''}`, style: 'min-width:88px;justify-content:center' }, i18n.t(`plan.status.${t.status}`)),
      h('span', {}, i18n.text(t.name), h('span', { class: 'small muted' }, ` · ${i18n.text(t.category)}`), t.seen ? h('span', { class: 'small muted mono' }, ` · ${t.correct}/${t.seen}`) : null),
      h('span', { class: 'row', style: 'gap:6px' },
        h('span', { class: 'pill', title: 'test frequency' }, '★'.repeat(t.weight)),
        t.lessonId ? h('button', { class: 'pill btn-like olive', onClick: () => this.ctx.navigate('learn', { lesson: t.lessonId! }) }, i18n.t('plan.lesson')) : null,
        h('button', { class: 'pill btn-like', onClick: () => this.ctx.navigate('practice', { subtest: sp.subtest, topic: t.slug }) }, i18n.t('plan.drill'))));
    return h('details', { open },
      h('summary', {},
        h('span', { class: 'ab' }, sp.subtest),
        h('span', {}, i18n.text(sp.name)),
        h('span', { class: 'spacer' }),
        sp.afqt ? h('span', { class: 'pill afqt' }, `×${sp.leverage.toFixed(1)}`) : null,
        h('span', { class: `pill ${levelClass}` }, `${i18n.t(`plan.level.${sp.level}`)} · ${acc}`)),
      h('div', { class: 'body', style: 'max-width:none' },
        sp.study.length ? sp.study.map(topicRow) : h('p', { class: 'muted small' }, i18n.t('plan.allSolid')),
        sp.solid.length ? h('p', { class: 'small muted', style: 'margin-top:8px' }, `${i18n.t('plan.solidList')}: ${sp.solid.map((t) => i18n.text(t.name)).join(' · ')}`) : null));
  }

  private scoreRow(label: string, value: number | null | undefined): HTMLElement {
    return h('div', { style: 'display:grid;grid-template-columns:1fr auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)' }, h('span', {}, label), h('span', { class: 'mono' }, value === null || value === undefined ? '—' : String(value)));
  }

  private nameOf(code: ReportedCode): string {
    if (code === 'AS') return this.ctx.i18n.locale === 'es' ? 'Automotriz y taller' : 'Auto & Shop';
    const s = SUBTESTS.find((x) => reportedCode(x.code) === code);
    return s ? this.ctx.i18n.text(s.name) : code;
  }
}
