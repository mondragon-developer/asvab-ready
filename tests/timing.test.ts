import { describe, expect, it } from 'vitest';
import { FakeClock } from '@domain/timing/Clock';
import { Timer, formatMmSs } from '@domain/timing/Timer';
import { PaceBudget } from '@domain/timing/PaceBudget';

describe('Timer', () => {
  it('counts down and reports warn at 20 %, crit at 10 %, done at 0', () => {
    const clock = new FakeClock();
    const t = new Timer(clock);
    t.start('countdown', 100_000);
    expect(t.snapshot().level).toBe('normal');
    clock.advance(80_000);
    expect(t.snapshot().level).toBe('warn');
    clock.advance(10_000);
    expect(t.snapshot().level).toBe('crit');
    clock.advance(10_000);
    expect(t.snapshot().level).toBe('done');
    expect(t.snapshot().remainingMs).toBe(0);
  });
  it('pauses and resumes without losing time', () => {
    const clock = new FakeClock();
    const t = new Timer(clock);
    t.start('stopwatch');
    clock.advance(5_000);
    t.pause();
    clock.advance(60_000);
    t.resume();
    clock.advance(1_000);
    expect(t.snapshot().elapsedMs).toBe(6_000);
  });
  it('formats mm:ss', () => {
    expect(formatMmSs(0)).toBe('00:00');
    expect(formatMmSs(539_000)).toBe('08:59');
  });
});

describe('PaceBudget', () => {
  it('compares time on item with the official budget (WK = 36 s)', () => {
    const clock = new FakeClock();
    const p = new PaceBudget(clock);
    p.beginItem('WK');
    clock.advance(20_000);
    expect(p.snapshot().level).toBe('ok');
    clock.advance(8_000);
    expect(p.snapshot().level).toBe('warn');
    clock.advance(10_000);
    expect(p.snapshot().level).toBe('over');
    expect(p.spentMs()).toBe(38_000);
  });
});
