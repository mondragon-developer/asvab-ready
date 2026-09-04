import { h } from './dom';
import type { I18n } from '@domain/i18n/i18n';

/**
 * "Install this app" banner. Chrome/Edge/Android fire `beforeinstallprompt`, which we
 * capture and replay when the student taps Install. iOS Safari never fires it, so there
 * is nothing to show there — the Home welcome card carries the Add to Home Screen tip.
 *
 * Browser-specific presentation, so it lives in ui/ and the domain never sees it.
 */

/** The non-standard event Chromium fires; not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'asvab.installDismissed';

function alreadyInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true;
}

function dismissed(): boolean {
  try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}

function remember(): void {
  try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* private mode: just show it again next time */ }
}

export function initInstallPrompt(i18n: I18n): void {
  if (alreadyInstalled() || dismissed()) return;
  let deferred: BeforeInstallPromptEvent | null = null;
  let banner: HTMLElement | null = null;

  const close = (permanent: boolean): void => {
    if (permanent) remember();
    banner?.remove();
    banner = null;
  };

  const show = (): void => {
    if (banner || !deferred) return;
    banner = h('div', { class: 'installbar', role: 'dialog', 'aria-label': i18n.t('install.title') },
      h('div', { class: 'stack' },
        h('b', {}, i18n.t('install.title')),
        h('span', { class: 'small muted' }, i18n.t('install.body')),
      ),
      h('div', { class: 'row' },
        h('button', {
          class: 'btn brass', onClick: () => {
            const e = deferred;
            close(true);
            void e?.prompt();
          },
        }, i18n.t('install.action')),
        h('button', { class: 'btn ghost', onClick: () => close(true) }, i18n.t('install.dismiss')),
      ),
    );
    document.body.appendChild(banner);
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();               // stop Chrome's own mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    show();
  });

  window.addEventListener('appinstalled', () => close(true));
}
