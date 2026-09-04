import type { SubtestCode } from '../config/subtests';
import type { Localized } from '../questions/types';

export type SectionType = 'explain' | 'example' | 'trap' | 'formulas' | 'drill';

export interface LessonSection {
  readonly type: SectionType;
  readonly title: Localized;
  /** Small HTML subset: <b>, <i>, <u>, <br>, <ul><li>, <code>. */
  readonly body: Localized;
}

export interface Lesson {
  readonly id: string;             // "ar-percent"
  readonly subtest: SubtestCode;
  readonly topic: string;          // matches Question.topic for "Practice this topic"
  readonly title: Localized;
  readonly minutes: number;
  readonly sections: readonly LessonSection[];
}

export interface LessonSource { load(): Promise<readonly Lesson[]> }

export class JsonLessonSource implements LessonSource {
  async load(): Promise<readonly Lesson[]> {
    const mod = await import('../../data/lessons.json');
    return mod.default as Lesson[];
  }
}

export class LessonLibrary {
  private cache: readonly Lesson[] | null = null;
  constructor(private readonly source: LessonSource) {}
  async all(): Promise<readonly Lesson[]> { return (this.cache ??= await this.source.load()); }
  async bySubtest(code: SubtestCode): Promise<readonly Lesson[]> { return (await this.all()).filter((l) => l.subtest === code); }
  async byId(id: string): Promise<Lesson | undefined> { return (await this.all()).find((l) => l.id === id); }
}
