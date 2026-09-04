import { SUBTESTS } from '@domain/config/subtests';
import type { Lesson } from '@domain/lessons/Lessons';
import { reportedCode } from '@domain/storage/Progress';
import { h, replace } from '../dom';
import type { AppContext, NavParams, Screen } from '../context';

const SECTION_CLASS: Record<string, string> = { explain: '', example: 'passage', trap: 'expl trap-card', formulas: 'card', drill: '' };

export class LearnScreen implements Screen {
  constructor(private readonly ctx: AppContext) {}

  async render(host: HTMLElement, params?: NavParams): Promise<void> {
    if (params?.lesson) {
      const lesson = await this.ctx.lessons.byId(params.lesson);
      if (lesson) return this.renderLesson(host, lesson);
    }
    return this.renderIndex(host);
  }

  private async renderIndex(host: HTMLElement): Promise<void> {
    const { i18n, lessons, progress } = this.ctx;
    const all = await lessons.all();
    const p = progress.current;
    replace(host, h('div', { class: 'stack lg' },
      h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('learn.eyebrow')), h('h1', {}, i18n.t('learn.title'))),
      ...SUBTESTS.map((s) => {
        const mine = all.filter((l) => l.subtest === s.code);
        if (!mine.length) return null;
        const m = p.mastery[reportedCode(s.code)];
        const pct = m && m.seen ? Math.round((m.correct / m.seen) * 100) : null;
        return h('div', { class: 'card stack' },
          h('div', { class: 'row', style: 'justify-content:space-between' },
            h('div', { class: 'row' }, h('span', { class: `pill ${s.afqt ? 'afqt' : ''}` }, s.code), h('h3', {}, i18n.text(s.name))),
            pct !== null ? h('span', { class: 'small muted mono' }, `${pct} %`) : null),
          h('div', { class: 'grid g3' }, mine.map((l) => h('button', { class: 'tile', onClick: () => this.ctx.navigate('learn', { lesson: l.id }) },
            h('span', { class: 'nm', style: 'font-size:1rem;color:var(--ink)' }, i18n.text(l.title)),
            h('span', { class: 'meta' }, `${l.minutes} ${i18n.t('units.min')} · ${l.sections.length} ${i18n.t('learn.steps')}`)))),
        );
      }),
    ));
  }

  private renderLesson(host: HTMLElement, lesson: Lesson): void {
    const { i18n } = this.ctx;
    const spec = SUBTESTS.find((s) => s.code === lesson.subtest)!;
    replace(host, h('div', { class: 'stack lg', style: 'max-width:760px' },
      h('div', {},
        h('button', { class: 'pill btn-like', onClick: () => this.ctx.navigate('learn') }, `← ${i18n.t('nav.learn')}`),
        h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: `pill ${spec.afqt ? 'afqt' : ''}` }, lesson.subtest), h('span', { class: 'eyebrow' }, `${lesson.minutes} ${i18n.t('units.min')}`)),
        h('h1', {}, i18n.text(lesson.title))),
      ...lesson.sections.map((sec) => h('section', { class: `lesson-section ${SECTION_CLASS[sec.type] ?? ''}` },
        h('div', { class: 'eyebrow' }, i18n.t(`learn.sec.${sec.type}`)),
        h('h3', {}, i18n.text(sec.title)),
        h('div', { class: 'lesson-body', html: i18n.text(sec.body) }))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onClick: () => this.ctx.navigate('practice', { subtest: lesson.subtest, topic: lesson.topic }) }, i18n.t('learn.practice')),
        h('button', { class: 'btn ghost', onClick: () => this.ctx.navigate('learn') }, i18n.t('learn.back'))),
    ));
  }
}
