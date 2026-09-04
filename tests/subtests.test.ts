import { describe, expect, it } from 'vitest';
import { SUBTESTS, TOTAL_MINUTES, TOTAL_SCORED_ITEMS, secondsPerItem } from '@domain/config/subtests';

describe('official CAT-ASVAB layout (verified 2026-09-03)', () => {
  it('has 10 subtests, 135 scored items, 197 minutes', () => {
    expect(SUBTESTS).toHaveLength(10);
    expect(TOTAL_SCORED_ITEMS).toBe(135);
    expect(TOTAL_MINUTES).toBe(197);
  });
  it('exactly four subtests feed the AFQT', () => {
    expect(SUBTESTS.filter((s) => s.afqt).map((s) => s.code)).toEqual(['AR', 'WK', 'PC', 'MK']);
  });
  it('per-item budgets match the research pacing table', () => {
    expect(secondsPerItem('WK')).toBe(36);
    expect(secondsPerItem('AR')).toBe(220);
    expect(secondsPerItem('PC')).toBe(162);
    expect(secondsPerItem('MK')).toBe(124);
    expect(secondsPerItem('EI')).toBe(40);
  });
});
