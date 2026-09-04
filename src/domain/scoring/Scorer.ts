import type { Localized } from '../questions/types';
import scoringData from '../../data/scoring.json';

/** Standard scores (mean 50, SD 10) per reported subtest. AI+SI are reported together as AS. */
export type ReportedCode = 'GS' | 'AR' | 'WK' | 'PC' | 'MK' | 'EI' | 'AS' | 'MC' | 'AO';
export type StandardScores = Readonly<Partial<Record<ReportedCode, number>>>;

export interface Composite {
  readonly branch: string;
  readonly code: string;
  readonly name: Localized;
  readonly value: number | null;   // null when a needed subtest has no score yet
}

export interface ScoreReport {
  readonly standard: StandardScores;
  readonly ve: number | null;
  readonly afqt: number | null;    // percentile 1–99
  readonly category: string | null;
  readonly composites: readonly Composite[];
  readonly lastChecked: string;
}

interface ScoringData {
  lastChecked: string;
  ve: { wk: number; pc: number; intercept: number };
  categories: { cat: string; min: number; max: number }[];
  minimums: { branch: string; name: Localized; diploma: number; ged: number }[];
  composites: { branch: string; code: string; name: Localized; sum: string[] }[];
}

/**
 * Converts standard scores into VE, AFQT percentile, category and line scores.
 * All formulas live in data/scoring.json — adding a branch or composite is a data change.
 */
export class Scorer {
  constructor(private readonly data: ScoringData = scoringData as ScoringData) {}

  verbalExpression(s: StandardScores): number | null {
    if (s.WK === undefined || s.PC === undefined) return null;
    const { wk, pc, intercept } = this.data.ve;
    return Math.round(wk * s.WK + pc * s.PC + intercept);
  }

  /**
   * AFQT raw = 2·VE + AR + MK (range 80–320 for standard scores 20–80).
   * Percentile mapping: the official table is not published; we use a normal
   * approximation with mean 200 and SD 40 (= 2·10 + 10 + 10, one SD on every
   * component). Anchors: all-50s → 50th percentile; all-60s → 84th.
   */
  afqtPercentile(s: StandardScores): number | null {
    const ve = this.verbalExpression(s);
    if (ve === null || s.AR === undefined || s.MK === undefined) return null;
    const raw = 2 * ve + s.AR + s.MK;
    const z = (raw - 200) / 40;
    const pct = Math.round(normalCdf(z) * 100);
    return Math.min(99, Math.max(1, pct));
  }

  category(afqt: number | null): string | null {
    if (afqt === null) return null;
    return this.data.categories.find((c) => afqt >= c.min && afqt <= c.max)?.cat ?? null;
  }

  composites(s: StandardScores, branch?: string): Composite[] {
    const ve = this.verbalExpression(s);
    const lookup = (code: string): number | undefined => (code === 'VE' ? ve ?? undefined : s[code as ReportedCode]);
    return this.data.composites
      .filter((c) => !branch || c.branch === branch)
      .map((c) => {
        const parts = c.sum.map(lookup);
        const value = parts.every((p): p is number => p !== undefined) ? parts.reduce((a, b) => a + b, 0) : null;
        return { branch: c.branch, code: c.code, name: c.name, value };
      });
  }

  minimums() { return this.data.minimums; }

  report(s: StandardScores, branch?: string): ScoreReport {
    const afqt = this.afqtPercentile(s);
    return {
      standard: s,
      ve: this.verbalExpression(s),
      afqt,
      category: this.category(afqt),
      composites: this.composites(s, branch),
      lastChecked: this.data.lastChecked,
    };
  }

  /**
   * AFQT leverage of one subtest point — used to rank weak areas.
   * WK ≈ 1.31, PC ≈ 0.81, AR = MK = 1.0, everything else 0.
   */
  afqtLeverage(code: ReportedCode): number {
    switch (code) {
      case 'WK': return 2 * this.data.ve.wk;
      case 'PC': return 2 * this.data.ve.pc;
      case 'AR': case 'MK': return 1;
      default: return 0;
    }
  }
}

/** Abramowitz–Stegun approximation of the standard normal CDF (error < 7.5e-8). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
