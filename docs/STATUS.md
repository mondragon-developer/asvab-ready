# STATUS — ASVAB Ready tracker

Update this file at the end of every working session. Newest entry on top in the log.

## Snapshot (2026-09-04)
- Build: `npm test` 35/35 · `npm run typecheck` clean · `npm run build` OK (service worker precaches app + data)
- Content: 730 original items (WK 80, PC 60, AR 80, MK 80, GS 80, EI 80, AI 65, SI 65, MC 80, AO 60 generated) · Spanish numbers match the English format (point decimal, comma thousands), enforced by the validator · topic taxonomy 171 topics (`src/data/topics.json`) · 16 bilingual lessons · 9 cheat sheets · 47 strategy tips
- Capacity: ~5 full ASVABs without a repeated question (PC/AI/SI: 6), ~12 diagnostics; the picker prefers never-seen items across sessions
- Screens live: Home (first-run welcome card, backup nudge), Learn, Practice, Test (Diagnostic / Full CAT / single, resume), Results (score simulator + **study plan per subtest and topic**), Strategy, Settings (gear: name, branch, target AFQT, theme, pace bar, backup, two-step reset) · EN/ES
- Persistence: IndexedDB (Layer 1) + export/import with union merge (Layer 2)

## Milestones
| # | Milestone | State | Notes |
|---|---|---|---|
| 0 | HTML mock | ✅ | `mock/asvab-mock.html` — reference for UX only |
| 1 | Scaffold + domain interfaces | ✅ | Vite 6, TS strict, vitest 3, vite-plugin-pwa |
| 2 | Domain tests | ✅ | subtests, timing, scoring, session, storage, testrunner |
| 3 | Practice + Learn | ✅ | topic-scoped practice via `QuestionBank.scoped()` |
| 4 | Diagnostic + Full CAT + resume | ✅ | `TestPlan`, `TestRunner`, `activeTest` in Progress |
| 5 | Results + Strategy | ✅ | branch switcher, weak areas × leverage, timing report, missed review with tips |
| 6 | Content bank + AO generator | ✅ | 730 items; `scripts/validate-questions.mjs`, `scripts/generate-ao.mjs` |
| 6b | Topic taxonomy + StudyPlanBuilder + prefer-unseen picker | ✅ | `src/data/topics.json`, `analysis/StudyPlanBuilder.ts`, `QuestionBank.pick(avoid)` |
| 7 | PWA polish | ⬜ | see backlog P1 |
| 8 | Planner + spaced repetition + recovery-code sync | ⬜ | v1.1 |

## Backlog (priority order)
**P1 — before showing students**
- [ ] Content review pass by Robin: read 5 random items per subtest in Practice; check Spanish naturalness.
- [x] Spanish number convention normalized to match the English twin - point for decimals, comma for thousands (2026-09-04). 98 fixes in 7 banks; `validate-questions.mjs` compares ES numbers to their EN twin by digits, so any separator difference fails (comma/point swap, missing separator, or a space).
- [x] Pre-test instructions: "Before you begin" card on every timed subtest intro, 6 CAT rules, EN/ES (2026-09-04).
- [ ] Lessons for the new/thin topics (only 16 lessons exist; the study plan shows a Lesson button only where one exists). Priority: WK suffix/antonym/multiple-meaning, PC author-tone/sequence, AR whole-numbers/fractions-decimals, MK exponents/expressions/probability, GS weight-3 topics, EI magnetism/semiconductors.
- [ ] Grow GS weight-3 topics to ≥4 items (12 topics at 2) and MK weight-3 topics to ≥6 (8 topics at 3–4).
- [x] First-run welcome card + empty states + Settings screen + backup nudge (2026-09-04)
- [ ] PWA: real PNG icons (192/512 + maskable), `apple-touch-icon`, install prompt banner, offline smoke test (airplane mode), iOS Safari + Android Chrome QA at 390 px.
- [ ] Offer backup export at the end of every full test (nudge on Home is done).
- [ ] Practice: show topic chips per subtest; "Review missed" mode that drills `review.missedQueue`.
- [ ] Results: per-subtest history sparkline (dataviz skill) and the `computedAt` date per estimate.

**P2 — quality**
- [ ] Unit tests for `AOGenerator` (determinism, exactly one correct option, mirror option differs), `LessonLibrary`, `Strategies.tipFor`.
- [ ] Playwright e2e script committed under `e2e/` (the smoke used in session: subtest → results → diagnostic resume → learn → practice-by-topic → ES).
- [ ] Accessibility: focus order in QuestionPlayer, `aria-live` for the timer chip warn/crit, reduced-motion respected (done in CSS), color contrast check on dark theme.
- [ ] `QuestionPlayer` keyboard shortcuts (A–D, Enter).
- [ ] Tryout-item simulation option in Full CAT (adds 15 unscored items + time to a random subtest, announced).
- [ ] Item stats: record per-question p-value from `events` to recalibrate `difficulty` automatically (groundwork for real IRT later).

**P3 — v1.1**
- [ ] Study planner (2/4/8-week from diagnostic gap; tiers WK+PC → AR → MK → job composites).
- [ ] Spaced repetition of missed items (1 d → 3 d → 1 wk → 1 mo).
- [ ] Layer 3 persistence: `SyncingStore` decorator + recovery code against a free KV service (Cloudflare KV / Supabase).
- [ ] Grow bank to 60+ per subtest; WK generator from Open English WordNet + Moby (both permissive licenses).
- [ ] Navy / Coast Guard per-rating sums in `scoring.json`.

## Decisions log
- 2026-09-04 · Abandoning a subtest mid-run (navigating away) now leaves the step pending so it restarts on resume, matching the 2026-09-03 decision. `QuestionPlayer` gained `finishOnDispose`; Test mode passes `false`, Practice keeps the old behaviour. Before this, leaving scored the partial subtest and advanced the runner, silently dropping it.
- 2026-09-04 · Spanish items use the **English number format** — point for the decimal separator, comma for thousands — rather than the es-ES convention. Reason: the student sees English numerals on the real ASVAB, and a parallel EN/ES pair makes the format machine-checkable. `validate-questions.mjs` enforces it: an ES number that differs from its EN twin only by comma/point swap is an error.
- 2026-09-04 · Diagnostic stays 5 items/subtest; it diagnoses at the subtest level and the study plan lists missed / shaky / untested topics per subtest (untested shown explicitly, ordered by test frequency ★). Topic picture sharpens with practice.
- 2026-09-04 · No questions copied from the internet; sources used only for topic coverage (taxonomy). All 730 items original.
- 2026-09-04 · Cross-session repeat avoidance: `avoid` set of seen ids is a soft preference in `QuestionBank.pick`; falls back to seen items only when the bank is exhausted.
- 2026-09-03 · Static PWA, no backend; TS + Vite; framework-light UI; may be monetized later → no NC-SA content embedded.
- 2026-09-03 · Follow the live officialasvab.com CAT table (15/10 scored items, 197 min) over the older 16-item Fact Sheet layout.
- 2026-09-03 · AFQT percentile approximated as normal(mean 200, SD 40) over raw 2·VE+AR+MK; VE ≈ 0.655·WK + 0.406·PC − 3.03. Stated as ±5 in UI.
- 2026-09-03 · Diagnostic = 5 items/subtest at official pace ≈ 72 min (not 35 as the mock claimed).
- 2026-09-03 · Interrupted test resumes at the next subtest; the interrupted subtest restarts (mirrors the real test).
- 2026-09-03 · AS reported as the mean of AI and SI standard scores.
- 2026-09-03 · AO items generated, not hand-drawn; correct option placed round-robin so keys are balanced.

## Known issues
- Abandoning a subtest leaves a `SessionRecord` with `endedAt: null`. Harmless (`rebuildEstimates` skips them) but they accumulate; consider pruning in a later pass.
- Google Fonts load from the network; offline the fallbacks (Arial Narrow / Segoe / Menlo) are used. Consider self-hosting woff2 in `public/fonts` for a consistent offline look.
- `dist/` cannot be deleted from the remote device shell (permission); building from a normal terminal works.
- The AFQT gauge on Home shows "—" until AR, WK, PC and MK all have a timed score.

## How to resume
```bash
cd ~/Documents/1_portafolio/ASVAB_test
npm install && npm test && npm run dev
```
Then: read this file and continue with the top unchecked P1 item.

## Session log
- 2026-09-04 · Spanish number normalization (98 fixes across 7 banks) + validator guard comparing EN/ES numbers by digits. "Before you begin" pre-test rules card (EN/ES). README screenshots + ASCII dashes. Agent review found and fixed: subtests were silently skipped when abandoned mid-run, and two rules that misstated app behaviour. Tests 35/35, typecheck, validator, build all green.
- 2026-09-04 (later) · First-run welcome, Settings screen (theme/profile/backup/reset), backup nudge, Results empty state. Folder cleaned (delete permission granted).
- 2026-09-04 · Topic taxonomy (171), banks 373 → 730, StudyPlanBuilder + Results study plan, prefer-unseen selection, 4 new tests. Delivered.
- 2026-09-03 · Research brief, mock, plan, M1–M6 built and verified on the Mac. Delivered zip unpacked into the project root.
