import { h, replace } from '../dom';
import type { AppContext, Screen } from '../context';

/** Learn (M3), Results (M5) and Strategy (M5) arrive in later milestones. */
export class PlaceholderScreen implements Screen {
  constructor(private readonly ctx: AppContext, private readonly titleKey: string, private readonly milestone: string) {}
  render(host: HTMLElement): void {
    replace(host, h('div', { class: 'stack lg' },
      h('h1', {}, this.ctx.i18n.t(this.titleKey)),
      h('div', { class: 'card' }, h('p', { class: 'muted' }, `Milestone ${this.milestone}`)),
    ));
  }
}
