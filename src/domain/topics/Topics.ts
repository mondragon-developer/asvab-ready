import type { SubtestCode } from '../config/subtests';
import type { Localized } from '../questions/types';
import data from '../../data/topics.json';

export interface TopicDef { readonly slug: string; readonly name: Localized; readonly weight: 1 | 2 | 3 }
export interface CategoryDef { readonly id: string; readonly name: Localized; readonly topics: readonly TopicDef[] }
type TopicData = Record<SubtestCode, { categories: CategoryDef[] }>;

/** Read-only map of what each subtest covers: subtest → categories → topics (with test-frequency weight). */
export class Topics {
  private readonly bySlug = new Map<string, { subtest: SubtestCode; category: CategoryDef; topic: TopicDef }>();

  constructor(private readonly d: TopicData = data as TopicData) {
    for (const code of Object.keys(d) as SubtestCode[]) {
      for (const category of d[code].categories) for (const topic of category.topics) this.bySlug.set(`${code}:${topic.slug}`, { subtest: code, category, topic });
    }
  }

  categories(code: SubtestCode): readonly CategoryDef[] { return this.d[code]?.categories ?? []; }
  topics(code: SubtestCode): readonly TopicDef[] { return this.categories(code).flatMap((c) => c.topics); }
  find(code: SubtestCode, slug: string) { return this.bySlug.get(`${code}:${slug}`); }
  name(code: SubtestCode, slug: string): Localized { return this.find(code, slug)?.topic.name ?? { en: slug, es: slug }; }
}
