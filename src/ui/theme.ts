import type { Progress } from '@domain/storage/Progress';

/** Stamp the chosen theme on <html>; 'system' removes the stamp so prefers-color-scheme decides. */
export function applyTheme(theme: Progress['settings']['theme']): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#1B2233' : theme === 'dark' ? '#0E131C' : '#1B2233';
}
