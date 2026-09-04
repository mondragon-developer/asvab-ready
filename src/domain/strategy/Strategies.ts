import type { Locale, Localized } from '../questions/types';
import data from '../../data/strategies.json';

export interface CheatSheet { code: string; label: string; tips: Record<Locale, string[]> }

interface StrategyData {
  general: Record<Locale, string[]>;
  cheatsheets: CheatSheet[];
  tips: Record<string, Localized>;
  testDay: Localized;
}

/** Read-only access to the strategy content; tipFor() links a missed question to its trick. */
export class Strategies {
  constructor(private readonly d: StrategyData = data as StrategyData) {}
  general(locale: Locale): string[] { return this.d.general[locale] ?? this.d.general.en; }
  cheatsheets(): CheatSheet[] { return this.d.cheatsheets; }
  testDay(): Localized { return this.d.testDay; }
  tipFor(ref: string | undefined): Localized | null { return ref ? this.d.tips[ref] ?? null : null; }
}
