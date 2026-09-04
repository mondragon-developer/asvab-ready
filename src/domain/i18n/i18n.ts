import type { Locale, Localized } from '../questions/types';
import en from './en.json';
import es from './es.json';

type Dict = Record<string, string>;
const DICTS: Record<Locale, Dict> = { en: en as Dict, es: es as Dict };

/** Tiny translator: t('nav.home'); text(localizedObj). Missing keys fall back to English, then to the key. */
export class I18n {
  private listeners = new Set<(l: Locale) => void>();
  constructor(private current: Locale = 'en') {}

  get locale(): Locale { return this.current; }

  set(locale: Locale): void {
    if (locale === this.current) return;
    this.current = locale;
    this.listeners.forEach((fn) => fn(locale));
  }

  onChange(fn: (l: Locale) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  t(key: string, vars: Record<string, string | number> = {}): string {
    const raw = DICTS[this.current][key] ?? DICTS.en[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
  }

  text(l: Localized): string { return l[this.current] ?? l.en; }
}
