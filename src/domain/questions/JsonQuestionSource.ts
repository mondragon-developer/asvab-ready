import type { SubtestCode } from '../config/subtests';
import type { Question, QuestionSource } from './types';

/**
 * Loads questions from the bundled JSON files (src/data/questions/<code>.json).
 * Vite turns each import into a lazily loaded chunk, so the app starts fast
 * and the service worker precaches every file for offline use.
 */
export class JsonQuestionSource implements QuestionSource {
  async load(subtest: SubtestCode): Promise<readonly Question[]> {
    const mod = await import(`../../data/questions/${subtest.toLowerCase()}.json`);
    return mod.default as Question[];
  }
}

/** For tests and for authoring tools: an in-memory source. */
export class StaticQuestionSource implements QuestionSource {
  constructor(private readonly items: readonly Question[]) {}
  async load(subtest: SubtestCode): Promise<readonly Question[]> {
    return this.items.filter((q) => q.subtest === subtest);
  }
}
