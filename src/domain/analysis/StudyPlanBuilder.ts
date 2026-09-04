import { SUBTESTS, type SubtestCode } from '../config/subtests';
import type { Localized } from '../questions/types';
import type { AnswerEvent } from '../storage/Progress';
import { reportedCode } from '../storage/Progress';
import type { Scorer } from '../scoring/Scorer';
import type { Topics, TopicDef } from '../topics/Topics';

export type Level = 'strong' | 'ok' | 'weak' | 'untested';

export interface TopicPlan {
  readonly slug: string;
  readonly name: Localized;
  readonly weight: number;
  readonly seen: number;
  readonly correct: number;
  readonly status: 'missed' | 'shaky' | 'solid' | 'untested';
  readonly lessonId: string | null;
  readonly category: Localized;
}

export interface SubtestPlan {
  readonly subtest: SubtestCode;
  readonly name: Localized;
  readonly afqt: boolean;
  readonly leverage: number;
  readonly seen: number;
  readonly accuracy: number | null;
  readonly level: Level;
  readonly priority: number;
  /** What to study, in order: missed → shaky → untested high-weight → the rest. */
  readonly study: readonly TopicPlan[];
  readonly solid: readonly TopicPlan[];
}

export interface StudyPlan {
  readonly subtests: readonly SubtestPlan[];   // sorted by priority, weakest & most leveraged first
  readonly strengths: readonly SubtestCode[];
  readonly weaknesses: readonly SubtestCode[];
}

export interface StudyPlanInput {
  readonly events: readonly AnswerEvent[];
  readonly topicOf: (questionId: string) => string | undefined;
  readonly lessonFor: (subtest: SubtestCode, slug: string) => string | null;
}

/**
 * Turns the answer history into "what to study next", per subtest and per topic.
 * Subtest level uses all answers (test + practice). Topics are graded from their own
 * answers; anything never seen is listed as untested so the student knows the map is
 * incomplete rather than pretending five diagnostic items settled it.
 */
export class StudyPlanBuilder {
  constructor(private readonly scorer: Scorer, private readonly topics: Topics) {}

  build(input: StudyPlanInput, target = 0.8): StudyPlan {
    const perSubtest: SubtestPlan[] = SUBTESTS.map((spec) => {
      const events = input.events.filter((e) => e.subtest === spec.code);
      const seen = events.length;
      const correct = events.filter((e) => e.correct).length;
      const accuracy = seen ? correct / seen : null;
      const leverage = this.scorer.afqtLeverage(reportedCode(spec.code));
      const level: Level = accuracy === null ? 'untested' : accuracy >= target ? 'strong' : accuracy >= 0.6 ? 'ok' : 'weak';
      const gap = accuracy === null ? 0.5 : Math.max(0, target - accuracy);
      const priority = gap * (1 + leverage);

      const stats = new Map<string, { seen: number; correct: number }>();
      for (const e of events) {
        const slug = input.topicOf(e.questionId);
        if (!slug) continue;
        const s = stats.get(slug) ?? { seen: 0, correct: 0 };
        s.seen++; if (e.correct) s.correct++;
        stats.set(slug, s);
      }
      const plans: TopicPlan[] = this.topics.categories(spec.code).flatMap((cat) => cat.topics.map((t: TopicDef) => {
        const s = stats.get(t.slug) ?? { seen: 0, correct: 0 };
        const acc = s.seen ? s.correct / s.seen : null;
        const status: TopicPlan['status'] = acc === null ? 'untested' : acc < 0.5 ? 'missed' : acc < target ? 'shaky' : 'solid';
        return { slug: t.slug, name: t.name, weight: t.weight, seen: s.seen, correct: s.correct, status, lessonId: input.lessonFor(spec.code, t.slug), category: cat.name };
      }));
      const rank: Record<TopicPlan['status'], number> = { missed: 0, shaky: 1, untested: 2, solid: 3 };
      const ordered = plans.slice().sort((a, b) => rank[a.status] - rank[b.status] || b.weight - a.weight || b.seen - a.seen);
      return {
        subtest: spec.code, name: spec.name, afqt: spec.afqt, leverage, seen, accuracy, level, priority,
        study: ordered.filter((p) => p.status !== 'solid'),
        solid: ordered.filter((p) => p.status === 'solid'),
      };
    });
    const sorted = perSubtest.slice().sort((a, b) => b.priority - a.priority);
    return {
      subtests: sorted,
      strengths: sorted.filter((s) => s.level === 'strong').map((s) => s.subtest),
      weaknesses: sorted.filter((s) => s.level === 'weak').map((s) => s.subtest),
    };
  }
}
