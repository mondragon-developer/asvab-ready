# ASVAB Prep — Implementation Plan (v1)

Decisions locked on 2026-09-03: static PWA (no backend), TypeScript + Vite, framework-light UI, all 10 subtests including SVG-drawn AO, English + Spanish, AFQT/line-score simulator, visible timers. Study planner with spaced repetition deferred to v1.1. Content policy: every question and explanation is original; only public-domain / CC BY / CC BY-SA text is embedded (see docs/research/02_SOURCES_AND_LICENSING.md).

## 1. Product surface (what the student sees)

| Area | Job | Key screens |
|---|---|---|
| Home | "Where am I, what next" | Estimated AFQT, mastery per subtest, next recommended action, resume session |
| Learn | Understand a topic | Topic list per subtest → lesson (explain → worked example → 3-level practice → mini quiz) |
| Practice | Drill one subtest without pressure | Question player, instant explanation, trap callout, stopwatch + pace indicator |
| Test | Simulate the real thing | Diagnostic (short, all subtests), Full CAT (official counts/timers, no back), Single subtest; countdown timer |
| Results | Evaluate | Score simulator (standard scores → VE → AFQT → line scores by branch), weak-area ranking weighted by AFQT leverage, review of missed items with the strategy tip that would have saved it |
| Strategy | The clues and tricks | General CAT tactics, per-subtest cheat sheets, pacing table, test-day checklist |

Timer design (three instruments, one component):
1. **Countdown** in Test mode — the official limit per subtest; turns amber at 20 % remaining and red at 10 %; on zero the subtest auto-submits (mirrors the real penalty situation, explained on the results screen).
2. **Stopwatch** in Practice and Learn — total time on task for the session; feeds the "study minutes" stat on Home.
3. **Pace indicator** per item — a thin bar comparing time on the current item with the official per-item budget (AR 220 s, WK 36 s, …). This is the coaching instrument: it teaches the student what 36 seconds feels like.

## 2. Architecture (SOLID, framework-light)

```
src/
  domain/                 pure TypeScript, zero DOM, fully unit-tested
    config/subtests.ts    the official table (counts, minutes, domain, AFQT flag) — single source of truth
    questions/            Question types, QuestionBank (load/filter/sample), validators
    session/              SessionEngine + strategies: AdaptiveStrategy (CAT rules), LinearStrategy (practice)
    timing/               Timer (countdown/stopwatch), PaceBudget
    scoring/              Scorer: raw → standard → VE → AFQT → composites (formulas in data/scoring.json)
    analysis/             DiagnosticAnalyzer (weak areas × AFQT leverage), ReviewBuilder
    storage/              ProgressStore interface; IndexedDbStore; JsonExport/Import
    i18n/                 t(key), locale files en.json / es.json
  ui/                     thin views bound to domain services (Preact or vanilla web components)
    shell/                app frame, nav (bottom tabs on phone, side rail on laptop), theme, locale
    screens/              home, learn, practice, test, results, strategy
    components/           TimerChip, PaceBar, QuestionCard, ChoiceList, Explanation, ScoreGauge, MasteryBars
  data/
    questions/{gs,ar,wk,pc,mk,ei,ai,si,mc,ao}.json
    lessons/{subtest}/{topic}.json
    strategies.json, scoring.json, attributions.json
  pwa/  manifest.webmanifest, sw.ts (precache app shell + data; offline first)
```

How SOLID shows up:
- Single responsibility: Timer only counts; PaceBudget only compares; Scorer only converts; views only render.
- Open/closed: new session behaviour = new `SessionStrategy` implementation; new score composite = new row in `scoring.json`.
- Liskov: `AdaptiveStrategy` and `LinearStrategy` are interchangeable behind `SessionStrategy`.
- Interface segregation: views depend on small ports (`QuestionSource`, `ProgressStore`, `Clock`), not on concrete classes.
- Dependency inversion: domain services receive `Clock` and `ProgressStore` via constructor; tests inject fakes.

## 3. Question schema (data/questions/*.json)

```json
{
  "id": "ar-0042",
  "subtest": "AR",
  "topic": "percent",
  "difficulty": 2,
  "stem": { "en": "...", "es": "..." },
  "choices": [ { "en": "...", "es": "..." }, ... ],
  "answer": 1,
  "explanation": { "en": "...", "es": "..." },
  "trap": { "en": "Intermediate value: 20 is the discount, not the price.", "es": "..." },
  "strategyRef": "ar.want-have-connect",
  "media": null,
  "source": "original",
  "version": 1
}
```
Difficulty 1–3 is what the adaptive strategy steps through. `media` holds an SVG string for AO/MC diagrams. `strategyRef` links a miss to the tip shown on review.

Target bank for v1: 40 items per subtest (400) for a credible diagnostic and one full CAT without repeats; WK generated from WordNet + Moby then reviewed; AR/MK from templated generators with numeric variation; the rest hand-written.

## 4. Adaptive strategy (v1, honest approximation)

Real CAT uses item response theory; we approximate: start at difficulty 2; correct → +1 (max 3); wrong → −1 (min 1); estimate = weighted proportion correct by difficulty, mapped to a 20–80 standard score; unanswered items at timeout count wrong and add the "end-of-test" penalty on the estimate. Documented on the Results screen so students are never misled about accuracy.

## 5. Milestones

| # | Milestone | Output |
|---|---|---|
| 0 | HTML mock-app (this step) | One file, all screens, timers, EN/ES, sample items — agree on UX |
| 1 | Scaffold | Vite + TS, lint, vitest, folder layout, domain interfaces, subtests config |
| 2 | Domain core | QuestionBank, Timer, PaceBudget, Scorer with tests against the research tables |
| 3 | Practice + Learn | Question player, explanation, lessons for the 4 AFQT subtests |
| 4 | Test modes | Diagnostic, Full CAT with countdown and no-back, subtest test |
| 5 | Results | Score simulator, weak areas, review with strategy tips |
| 6 | Content fill | 40 items/subtest, lessons for the 6 technical subtests, AO generator |
| 7 | PWA + polish | Manifest, service worker, install prompt, offline check, phone QA |
| 8 | v1.1 | Study planner (2/4/8-week), spaced repetition of missed items |

## 6. Persistence — how a student's work survives

The app has no backend, so the browser is the only place progress lives unless we add layers. Four layers, each optional, all behind one `ProgressStore` interface.

| Layer | What | Protects against | When |
|---|---|---|---|
| 1 | IndexedDB + `navigator.storage.persist()` + save after every answered item | Closed tab, dead battery, browser eviction under storage pressure | v1 |
| 2 | Export / import of one `asvab-progress.json` file; nudge after 7 days without backup | Lost or replaced phone, cleared site data | v1 |
| 3 | Recovery code (e.g. `BRAVO-7K2M-Q9`) → progress blob in a free key-value service (Cloudflare KV, Supabase, Firebase) | Same as 2, plus cross-device sync, no account needed | v1.1 |
| 4 | Real accounts (Google/Apple sign-in via Supabase/Firebase Auth), class dashboards | Institutional use | only if a school/recruiter becomes the customer — adds minors' data obligations |

Design that keeps every layer open:

```ts
interface ProgressStore {
  load(): Promise<Progress | null>;
  save(p: Progress): Promise<void>;          // called after every answered item
  export(): Promise<Blob>;                   // Layer 2
  import(file: Blob): Promise<Progress>;     // Layer 2, validates schemaVersion and migrates
}
class IndexedDbStore implements ProgressStore { … }            // Layer 1
class SyncingStore implements ProgressStore {                  // decorator: Layer 3/4
  constructor(private local: ProgressStore, private remote: RemoteSync) {}
  async save(p) { await this.local.save(p); this.remote.push(p).catch(queueForRetry); }
}
```
The UI and the scoring code only ever see `ProgressStore`; switching layers is a wiring change in `main.ts`.

Rules that make it safe:
- Writes are small and frequent (one item = one write); a full test is never held only in memory.
- Every save carries `schemaVersion`; `import()` and `load()` run migrations, so an app update never drops old data.
- Saves are last-write-wins keyed by `updatedAt`; on import, the newer of file vs local wins per section, and the student is told what was merged.
- Conflict-free by construction: each answered item is an append-only event with its own id, so merging two copies of the same student's history is a union, not an overwrite.
- Backup nudge: Home shows "Last backup: 9 days ago" in amber after 7 days; a full test end always offers the export.
- Never store personal data beyond what the student typed (display name optional); the recovery code is random, not derived from anything.

### Progress file layout (`asvab-progress.json`, schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "app": "asvab-ready",
  "exportedAt": "2026-09-03T18:20:00Z",
  "recoveryCode": null,
  "profile": {
    "displayName": "R.",
    "locale": "en",
    "targetBranch": "army",
    "targetAfqt": 50,
    "createdAt": "2026-09-01T14:02:00Z",
    "updatedAt": "2026-09-03T18:19:41Z"
  },
  "settings": { "theme": "system", "showPaceBar": true, "soundOnTimeout": true },
  "sessions": [
    {
      "id": "s_01J6X…",
      "mode": "diagnostic",
      "startedAt": "2026-09-01T14:05:00Z",
      "endedAt": "2026-09-01T14:41:12Z",
      "subtests": [
        { "ab": "WK", "limitSec": 540, "usedSec": 512, "answered": 15, "unanswered": 0, "correct": 9 }
      ]
    }
  ],
  "events": [
    { "id": "e_01J6X…", "sessionId": "s_01J6X…", "questionId": "wk-0042", "subtest": "WK",
      "choice": 0, "correct": false, "timeMs": 51000, "at": "2026-09-01T14:06:11Z" }
  ],
  "mastery": {
    "WK": { "seen": 40, "correct": 23, "avgMs": 48000, "lastAt": "2026-09-03T18:19:41Z" }
  },
  "estimates": {
    "standard": { "GS": 51, "AR": 49, "WK": 50, "PC": 53, "MK": 54, "EI": 44, "AS": 50, "MC": 52, "AO": 55 },
    "ve": 52, "afqt": 55, "computedAt": "2026-09-03T18:19:41Z"
  },
  "review": {
    "missedQueue": ["wk-0042", "ar-0007"],
    "lastBackupAt": "2026-08-27T09:00:00Z"
  }
}
```
`events` is the source of truth; `mastery` and `estimates` are caches that can be rebuilt from it (a "Rebuild stats" button does exactly that, which is also the recovery path if a cache ever looks wrong). Question text is never stored — only ids — so the file stays small (roughly 150 bytes per answered item; a heavy student at 3,000 items is under 500 KB).

## 7. Risks
- Question volume is the real work; the generators for WK/AR/MK are the lever.
- Official CAT layout may change again — it lives in one config file.
- Branch minimums are policy; show "verify with your recruiter" and a last-checked date.
