import { h, replace, toast } from '../dom';
import { applyTheme } from '../theme';
import type { AppContext, Screen } from '../context';

const BRANCHES = ['army', 'navy', 'airforce', 'marines', 'coastguard'] as const;
const THEMES = ['system', 'light', 'dark'] as const;

/** Profile, target, appearance, backup and reset. Every change saves immediately. */
export class SettingsScreen implements Screen {
  private resetArmedUntil = 0;

  constructor(private readonly ctx: AppContext) {}

  render(host: HTMLElement): void {
    const { i18n, progress, scorer, backup } = this.ctx;
    const p = progress.current;
    const days = backup.daysSinceBackup(p);

    const nameInput = h('input', { type: 'text', class: 'input', value: p.profile.displayName, maxlength: '40', placeholder: i18n.t('settings.namePh'),
      onChange: (e) => void progress.updateProfile({ displayName: (e.target as HTMLInputElement).value.trim() }) });
    const targetInput = h('input', { type: 'number', class: 'input', min: '1', max: '99', value: String(p.profile.targetAfqt), style: 'max-width:110px',
      onChange: (e) => { const v = Math.min(99, Math.max(1, Number((e.target as HTMLInputElement).value) || 50)); void progress.updateProfile({ targetAfqt: v }); } });

    replace(host, h('div', { class: 'stack lg', style: 'max-width:720px' },
      h('div', {}, h('div', { class: 'eyebrow' }, i18n.t('settings.eyebrow')), h('h1', {}, i18n.t('settings.title'))),

      h('div', { class: 'card stack' },
        h('h3', {}, i18n.t('settings.profile')),
        h('label', { class: 'field' }, h('span', { class: 'eyebrow' }, i18n.t('settings.name')), nameInput),
        h('div', { class: 'field' }, h('span', { class: 'eyebrow' }, i18n.t('settings.branch')),
          h('div', { class: 'row' }, BRANCHES.map((b) => h('button', { class: `pill btn-like ${b === p.profile.targetBranch ? 'olive' : ''}`, onClick: async () => { await progress.setTargetBranch(b); this.render(host); } },
            i18n.text(scorer.minimums().find((m) => m.branch === b)!.name))))),
        h('label', { class: 'field' }, h('span', { class: 'eyebrow' }, i18n.t('settings.target')), h('div', { class: 'row' }, targetInput, h('span', { class: 'small muted' }, i18n.t('settings.targetHint', { min: scorer.minimums().find((m) => m.branch === p.profile.targetBranch)?.diploma ?? 31 })))),
      ),

      h('div', { class: 'card stack' },
        h('h3', {}, i18n.t('settings.appearance')),
        h('div', { class: 'row' }, THEMES.map((t) => h('button', { class: `pill btn-like ${t === p.settings.theme ? 'olive' : ''}`, onClick: async () => { await progress.updateSettings({ theme: t }); applyTheme(t); this.render(host); } }, i18n.t(`settings.theme.${t}`)))),
        h('label', { class: 'row', style: 'gap:8px' }, h('input', { type: 'checkbox', checked: p.settings.showPaceBar, onChange: (e) => void progress.updateSettings({ showPaceBar: (e.target as HTMLInputElement).checked }) }), i18n.t('settings.paceBar')),
      ),

      h('div', { class: 'card stack' },
        h('h3', {}, i18n.t('settings.backup')),
        h('p', { class: `small ${days !== null && days < 7 ? 'muted' : ''}`, style: days === null || days >= 7 ? 'color:var(--warn)' : '' }, days === null ? i18n.t('home.backupNever') : i18n.t('home.backupDays', { days })),
        h('p', { class: 'small muted' }, i18n.t('settings.backupNote')),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', onClick: () => this.exportBackup() }, i18n.t('settings.export')),
          h('label', { class: 'btn ghost' }, i18n.t('settings.import'), h('input', { type: 'file', accept: 'application/json', style: 'display:none', onChange: (e) => this.importBackup(e, host) }))),
      ),

      h('div', { class: 'card stack', style: 'border-color:var(--crit)' },
        h('h3', {}, i18n.t('settings.danger')),
        h('p', { class: 'small muted' }, i18n.t('settings.resetNote', { n: p.events.length })),
        h('button', { class: 'btn ghost', style: 'color:var(--crit);border-color:var(--crit)', onClick: (e) => this.reset(e.currentTarget as HTMLButtonElement, host) }, i18n.t('settings.reset')),
      ),

      h('p', { class: 'footnote' }, i18n.t('settings.about')),
    ));
  }

  private async exportBackup(): Promise<void> {
    const json = await this.ctx.backup.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'asvab-progress.json' });
    a.click();
    URL.revokeObjectURL(a.href);
    toast(this.ctx.i18n.t('settings.exported'));
    this.ctx.navigate('settings');
  }

  private async importBackup(e: Event, host: HTMLElement): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const merged = await this.ctx.backup.importJson(await file.text());
      this.ctx.progress.adopt(merged);
      toast(this.ctx.i18n.t('settings.imported'));
      this.render(host);
    } catch (err) { toast(String((err as Error).message)); }
  }

  /** Two-step reset: first click arms for 6 s, second click wipes. No modal dialogs. */
  private async reset(btn: HTMLButtonElement, host: HTMLElement): Promise<void> {
    const now = Date.now();
    if (now > this.resetArmedUntil) {
      this.resetArmedUntil = now + 6000;
      btn.textContent = this.ctx.i18n.t('settings.resetConfirm');
      btn.classList.add('brass');
      setTimeout(() => { if (Date.now() >= this.resetArmedUntil) this.render(host); }, 6200);
      return;
    }
    await this.ctx.progress.reset();
    toast(this.ctx.i18n.t('settings.resetDone'));
    this.ctx.navigate('home');
  }
}
