import { describe, expect, it } from 'vitest';
import { Scorer } from '@domain/scoring/Scorer';
import { DiagnosticAnalyzer } from '@domain/analysis/DiagnosticAnalyzer';

const scorer = new Scorer();

describe('Scorer', () => {
  it('all-50 standard scores → ~50th percentile, category IIIA', () => {
    const r = scorer.report({ GS: 50, AR: 50, WK: 50, PC: 50, MK: 50, EI: 50, AS: 50, MC: 50, AO: 50 }, 'army');
    expect(r.ve).toBe(50);
    expect(r.afqt).toBeGreaterThanOrEqual(48);
    expect(r.afqt).toBeLessThanOrEqual(52);
    expect(r.category).toBe('IIIA');
  });
  it('all-60 → roughly 84th percentile, category II', () => {
    const r = scorer.report({ AR: 60, WK: 60, PC: 60, MK: 60 });
    expect(r.afqt).toBeGreaterThanOrEqual(80);
    expect(r.afqt).toBeLessThanOrEqual(88);
    expect(r.category).toBe('II');
  });
  it('returns null AFQT when an AFQT subtest is missing', () => {
    expect(scorer.afqtPercentile({ AR: 50, MK: 50 })).toBeNull();
  });
  it('computes Army GT = VE + AR', () => {
    const r = scorer.report({ AR: 52, WK: 50, PC: 50, MK: 54 }, 'army');
    const gt = r.composites.find((c) => c.code === 'GT');
    expect(gt?.value).toBe(50 + 52);
    const el = r.composites.find((c) => c.code === 'EL');
    expect(el?.value).toBeNull(); // GS and EI not scored yet
  });
  it('WK has the highest AFQT leverage', () => {
    expect(scorer.afqtLeverage('WK')).toBeCloseTo(1.31, 2);
    expect(scorer.afqtLeverage('PC')).toBeCloseTo(0.81, 2);
    expect(scorer.afqtLeverage('AR')).toBe(1);
    expect(scorer.afqtLeverage('EI')).toBe(0);
  });
});

describe('DiagnosticAnalyzer', () => {
  it('ranks WK 58 % above EI 40 % because of AFQT leverage', () => {
    const ranked = new DiagnosticAnalyzer(scorer).rank([
      { code: 'WK', seen: 50, correct: 29, avgMs: 51_000 },
      { code: 'EI', seen: 50, correct: 20, avgMs: 40_000 },
      { code: 'MK', seen: 50, correct: 40, avgMs: 90_000 },
    ]);
    expect(ranked.map((r) => r.code)).toEqual(['WK', 'EI', 'MK']);
    expect(ranked[0]?.level).toBe('crit');
    expect(ranked[2]?.level).toBe('good');
  });
});
