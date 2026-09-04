import { SUBTESTS } from '@domain/config/subtests';
import { h, replace } from '../dom';
import type { AppContext, Screen } from '../context';

export class StrategyScreen implements Screen {
  constructor(private readonly ctx: AppContext) {}

  render(host: HTMLElement): void {
    const { i18n, strategies } = this.ctx;
    const locale = i18n.locale;
    const nameOf = (code: string) => code === 'AS' ? (locale === 'es' ? 'Automotriz y taller' : 'Auto & Shop') : i18n.text(SUBTESTS.find((s) => s.code === code)!.name);
    replace(host, h('div', { class: 'stack lg' },
      h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('strategy.eyebrow')), h('h1', {}, i18n.t('strategy.title'))),
      h('div', { class: 'card stack' },
        h('h3', {}, i18n.t('strategy.catTitle')),
        h('ol', { style: 'margin:0;padding-left:20px;display:grid;gap:6px;max-width:70ch' }, strategies.general(locale).map((r) => h('li', {}, r))),
      ),
      h('div', {}, strategies.cheatsheets().map((c, i) =>
        h('details', { open: i === 0 },
          h('summary', {}, h('span', { class: 'ab' }, c.label), nameOf(c.code)),
          h('div', { class: 'body' }, h('ul', {}, (c.tips[locale] ?? c.tips.en).map((t) => h('li', {}, t)))),
        ))),
      h('div', { class: 'card stack' }, h('h3', {}, i18n.t('strategy.dayTitle')), h('p', { class: 'muted' }, i18n.text(strategies.testDay()))),
    ));
  }
}
