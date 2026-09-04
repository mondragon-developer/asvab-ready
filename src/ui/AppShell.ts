import { formatMmSs } from '@domain/timing/Timer';
import { h, replace, svg } from './dom';
import { NAV_SCREENS, type AppContext, type NavParams, type Screen, type ScreenId, type TimerSource } from './context';

const ICONS: Record<string, string> = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  learn: '<path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  practice: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  test: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  results: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  strategy: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};

/**
 * App frame: header with timer chip + language toggle, navigation, screen host.
 * Knows nothing about questions or scores — it only routes and paints the clock.
 */
export class AppShell {
  private main = h('main');
  private chip = h('div', { class: 'timerchip' }, h('span', { class: 'dot' }), h('span', { class: 'lbl' }), h('span', { class: 'time mono' }, '00:00'));
  private nav = h('nav', { class: 'tabs' });
  private current: Screen | null = null;
  private currentId: ScreenId = 'home';
  private timerSource: TimerSource | null = null;

  constructor(private readonly ctx: Omit<AppContext, 'navigate' | 'setTimerSource'>, private readonly screens: Record<ScreenId, Screen>) {}

  mount(root: HTMLElement): void {
    const { i18n } = this.ctx;
    const langBtn = h('button', { class: 'iconbtn', onClick: () => i18n.set(i18n.locale === 'en' ? 'es' : 'en') }, i18n.locale === 'en' ? 'ES' : 'EN');
    i18n.onChange((l) => { langBtn.textContent = l === 'en' ? 'ES' : 'EN'; this.paintNav(); void this.navigate(this.currentId); });
    const gear = h('button', { class: 'iconbtn icon-only', 'aria-label': 'Settings', onClick: () => void this.navigate('settings') }, svg('0 0 24 24', ICONS.settings!, 'gear'));
    replace(root, h('div', { class: 'app' },
      h('header', { class: 'top' }, h('div', { class: 'brand', onClick: () => void this.navigate('home') }, h('span', { class: 'chev' }), h('span', {}, i18n.t('brand'))), h('div', { class: 'spacer' }), this.chip, langBtn, gear),
      this.nav, this.main,
    ));
    this.paintNav();
    this.paintChip();
    setInterval(() => this.paintChip(), 250);
  }

  navigate = async (id: ScreenId, params?: NavParams): Promise<void> => {
    this.current?.dispose?.();
    this.currentId = id;
    this.current = this.screens[id];
    this.paintNav();
    window.scrollTo({ top: 0 });
    await this.current.render(this.main, params);
  };

  setTimerSource = (source: TimerSource | null): void => { this.timerSource = source; this.paintChip(); };

  private paintNav(): void {
    replace(this.nav, NAV_SCREENS.map((id) =>
      h('button', { class: id === this.currentId ? 'on' : '', onClick: () => void this.navigate(id) },
        svg('0 0 24 24', ICONS[id]!), h('span', {}, this.ctx.i18n.t(`nav.${id}`)))));
  }

  private paintChip(): void {
    const { i18n } = this.ctx;
    const lbl = this.chip.querySelector('.lbl') as HTMLElement;
    const time = this.chip.querySelector('.time') as HTMLElement;
    this.chip.className = 'timerchip';
    if (!this.timerSource) { lbl.textContent = i18n.t('timer.idle'); time.textContent = '00:00'; return; }
    const s = this.timerSource.timerSnapshot();
    this.chip.classList.add('run');
    if (s.mode === 'stopwatch') { lbl.textContent = i18n.t('timer.session'); time.textContent = formatMmSs(s.elapsedMs); return; }
    lbl.textContent = i18n.t('timer.left');
    time.textContent = formatMmSs(s.remainingMs);
    if (s.level === 'warn' || s.level === 'crit') this.chip.classList.add(s.level);
  }
}
