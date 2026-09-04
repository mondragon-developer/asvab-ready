/** Abstraction over "now" so timers are testable without waiting. */
export interface Clock {
  now(): number; // milliseconds
}

export const systemClock: Clock = { now: () => Date.now() };

/** Test double: advance time by hand. */
export class FakeClock implements Clock {
  private t = 0;
  now(): number { return this.t; }
  advance(ms: number): void { this.t += ms; }
}
