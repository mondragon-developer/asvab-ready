# ASVAB Prep Web App — Research Brief

Date: 2026-09-03 · Author: Robin (Jose Dev) with AI assistance · Status: research complete, planning next

This document is the factual base for the app. Everything here was checked against the official ASVAB site (officialasvab.com) on 2026-09-03; where third-party sources disagree with the official site, the official numbers win and the disagreement is noted.

---

## 1. What the ASVAB is (the version we must simulate)

The ASVAB is given in three forms. The app must model the first one exactly and offer the second as an option.

### 1.1 CAT-ASVAB (computer-adaptive, at MEPS — ~70% of applicants)

Ten subtests. Each has a block of *scored* items and may include an extra block of *tryout* (unscored) items that lengthens the time limit. Official table (officialasvab.com/applicants/what-to-expect, verified 2026-09-03):

| # | Subtest | Abbr | Scored Qs | Tryout Qs | Time (no tryout) | Time (with tryout) | Domain |
|---|---|---|---|---|---|---|---|
| 1 | General Science | GS | 15 | 15 | 12 min | 25 min | Science/Technical |
| 2 | Arithmetic Reasoning | AR | 15 | 15 | 55 min | 113 min | Math (AFQT) |
| 3 | Word Knowledge | WK | 15 | 15 | 9 min | 18 min | Verbal (AFQT) |
| 4 | Paragraph Comprehension | PC | 10 | 15 | 27 min | 75 min | Verbal (AFQT) |
| 5 | Mathematics Knowledge | MK | 15 | 15 | 31 min | 65 min | Math (AFQT) |
| 6 | Electronics Information | EI | 15 | 15 | 10 min | 21 min | Science/Technical |
| 7 | Auto Information | AI | 10 | 15 | 7 min | 18 min | Science/Technical |
| 8 | Shop Information | SI | 10 | 15 | 6 min | 17 min | Science/Technical |
| 9 | Mechanical Comprehension | MC | 15 | 15 | 22 min | 42 min | Science/Technical |
| 10 | Assembling Objects | AO | 15 | 15 | 18 min | 38 min | Spatial |
| | **Total** | | **135** | | **~197 min** | | ~2 h average |

CAT rules that the app must reproduce in "exam mode":
- Adaptive: starts medium; right → harder, wrong → easier.
- No skipping, no going back, no changing a submitted answer.
- Unfinished subtests are penalized; a run of wrong answers at the end is penalized more than a single wrong guess. A single wrong guess costs nothing extra, so never leave an item blank.
- AI and SI are reported together as one AS score.
- No calculator. Scratch paper allowed.

Note on disagreement: the official April-2025 Fact Sheet PDF and most prep sites still print the older layout (16 items/8 min GS, 16/39 AR, etc., 1.5 h). The live official site shows the table above. We follow the live site and keep the subtest config in one JSON file so it is a one-line change if it shifts again.

### 1.2 P&P-ASVAB (paper, at MET sites)

Nine subtests (AI+SI merged into AS). No guessing penalty; you may review within a subtest.

| Subtest | Qs | Time |
|---|---|---|
| GS | 25 | 11 |
| AR | 30 | 36 |
| WK | 35 | 11 |
| PC | 15 | 13 |
| MK | 25 | 24 |
| EI | 20 | 9 |
| AS | 25 | 11 |
| MC | 25 | 19 |
| AO | 25 | 15 |
| **Total** | **225** | **149 min** |

### 1.3 PiCAT (at-home pre-screen) + Verification Test

Same 10 subtests as CAT, unproctored, no per-subtest timer, must be finished within 48 h of starting, one attempt, only for first-time takers; code expires 30 days after issue. Followed within 45 days by a 25–30 min proctored Verification Test at MEPS; if it does not verify, the applicant takes the full ASVAB that day.

---

## 2. Scoring (what the app's score simulator must compute)

- Each subtest → Standard Score (mean 50, SD 10 vs. 1997 norm group).
- **VE (Verbal Expression)** = scaled score from WK + PC. Approximation used by prep sites: VE ≈ 0.655·WK + 0.406·PC − 3.03 (standard scores).
- **AFQT raw = 2·VE + AR + MK**, converted to percentile 1–99.
- Practical consequence: one WK point ≈ 1.31 AFQT points, PC ≈ 0.81, AR and MK = 1.0 each. WK is the cheapest place to gain AFQT points.
- GS, EI, AS, MC, AO do not affect the AFQT; they only feed job (line) scores.

AFQT categories: I 93–99 · II 65–92 · IIIA 50–64 · IIIB 31–49 · IVA 21–30 · IVB 16–20 · IVC 10–15 · V 1–9.

Minimum AFQT by branch (policy, changes with recruiting needs — show as "verify with recruiter"):

| Branch | HS diploma | GED | Note |
|---|---|---|---|
| Army | 31 | 50 | Future Soldier Prep Course for 21–30 |
| Navy | 31 | 50 | Tier III (no credential) at 50 since Jan 2024 |
| Air Force / Space Force | 31 (official airforce.com) | 50 | Prep sites claim 36/65 — unconfirmed |
| Marine Corps | 31–32 | 50 | |
| Coast Guard | 36–40 | 47–50 | Not published officially |

Line scores (Army, sums of standard scores): GT = VE+AR · CL = VE+AR+MK · EL = GS+AR+MK+EI · GM = GS+AS+MK+EI · ST = GS+VE+MK+MC · SC = VE+AR+AS+MC · CO, FA, MM, OF use retired subtests (CS/NO) with substituted values. Air Force MAGE: M = AR+AS+MC+VE(disputed) · A = MK+VE · G = AR+VE · E = AR+EI+GS+MK. Marines: GT = VE+AR+MC · EL = GS+AR+MK+EI · MM = AR+MC+AS+EI · CL = VE+MK. Navy and Coast Guard use per-rating sums.

Retest policy: 1 month → 1 month → 6 months. Most recent score counts, not highest. +20 AFQT within 6 months triggers a Confirmation Test. Scores valid 2 years.

---

## 3. Free material found — and what we may legally use

### 3.1 Verdict in one paragraph

There is **no openly licensed ASVAB question bank** anywhere (GitHub, OER sites, government). Every free practice site (Union Test Prep, Mometrix, ASVABTutor, 4Tests, asvabpracticetests.com, Kaplan samples…) is copyrighted and may be used only as a *style reference*. The official sample items are few (~40) and the site asserts copyright. Therefore **the question bank must be original**, written from openly licensed subject material plus public-domain word data. This is the single most important constraint for the project.

### 3.2 Reusable verbatim (safe)

| Source | What | License |
|---|---|---|
| DoD ASVAB CEP Overview PDF (DD Form 1304-5OV, Feb 2026) — prod-media.asvabprogram.com/CEP_PDF_Contents/ASVAB_CEP_Overview.pdf | 32 sample items + key, official subtest descriptions | US Government form, no copyright notice → public domain (strongest candidate) |
| Moby Thesaurus / Moby Word Lists — gutenberg.org/files/3201 | 30k roots, 2.5M synonyms | Public domain |
| MichaelWehar/Public-Domain-Word-Lists (GitHub) | Frequency word lists | Public domain |
| Open English WordNet — github.com/globalwordnet/english-wordnet | Definitions, synsets, POS | CC BY 4.0 |
| Wikipedia ASVAB article, Wikibooks, Wikiversity | Test structure; EI circuits, automotive, tools, physics | CC BY-SA 4.0 (attribute + share-alike) |

### 3.3 Reusable only if the app is non-commercial (CC BY-NC-SA)

OpenStax Prealgebra 2e, Elementary Algebra 2e, College Physics 2e, Chemistry 2e, Biology 2e (all now CC BY-NC-SA 4.0); Khan Academy (CC BY-NC-SA 3.0, must include their attribution note); LibreTexts (per-page, mostly NC-SA). CK-12 has a custom education-only license with attribution-badge and noindex requirements — link to it, don't embed.

### 3.4 Reference only (never copy text)

officialasvab.com sample questions (item *format* spec), todaysmilitary.com, Union Test Prep (350 free Qs), Mometrix (135-Q test), ASVABTutor, 4Tests, asvabpracticetests.com, asvabpracticetestonline.com, Kaplan/Peterson's samples, ASVAB Advantage PDF (dubious provenance), GitHub repos without LICENSE (complexorganizations/ASVAB, calvinmorett/asvab).

### 3.5 Decision required

Whether the app will ever be monetized decides whether OpenStax/Khan text can be embedded. Recommendation: assume it *might* be, so write the "Learn" content originally (using OpenStax only as topic outline) and rely on public-domain + CC BY + CC BY-SA sources for anything embedded. This keeps every door open.

---

## 4. Test-taking clues and tricks (content for the "Strategy" section)

### 4.1 General CAT strategy
1. First ~5 items of each subtest set your difficulty trajectory — spend extra time there.
2. Never skip, never leave blank; a single wrong guess costs nothing.
3. Avoid strings of wrong answers; if stuck 1–2 min, eliminate and move on.
4. Budget time so you never speed-guess the last 3–4 items (that is the penalized case).
5. Hard questions mean you are doing well — the test converges to ~50% correct for everyone.
6. Elimination rules: drop absolutes ("always/never"); when two options are opposites one is usually right; two options meaning the same thing are both wrong; if nothing can be eliminated, always guess the same letter.
7. Test day: photo ID, no calculator, arrive early, sleep, eat, don't press stray keys.

### 4.2 Pacing table (seconds per scored item, CAT)
GS 48 s · AR 220 s · WK 36 s · PC 160 s · MK 124 s · EI 40 s · AI 42 s · SI 36 s · MC 88 s · AO 72 s.
Takeaway: AR/PC/MK are generous — slow down. WK/EI/AS/GS are fast — know it or guess and move.

### 4.3 Per-subtest cheat sheets (summary; full detail in 01_STRATEGIES.md)
- **WK**: prefix/root/suffix decomposition; polarity guess (mal-, dis- negative; bene-, pro- positive); substitute each choice into the sentence; 10 new words/day.
- **PC**: read the question first; 4 types (main idea, detail, inference, vocab-in-context); traps = too specific/too general, outside knowledge, "NOT/EXCEPT" stems.
- **AR**: WANT/HAVE/CONNECT; five formulas (d=rt, percent, proportion, area, average); backsolve from B/C; signal-word traps ("5 less than x" = x−5); check that the answer is what was *asked*, not an intermediate.
- **MK**: memorize ~25 formulas (areas, volumes, Pythagorean triples, slope, exponent rules, quadratic, FOIL, x²−y²); pick numbers (avoid −1, 0, 1); watch sign errors and inequality flips.
- **GS**: 300 small facts, one flashcard each; unit traps (°C vs °F); taxonomy mnemonic; planets mnemonic; pH; Newton's laws; SI units.
- **EI**: V=IR, P=VI=I²R=V²/R; series (current same, R adds) vs parallel (voltage same, 1/R adds); diode/capacitor/inductor/transformer roles; 120 V/60 Hz; wire gauge inverse; resistor color code; wire colors.
- **AS**: four-stroke (suck-squeeze-bang-blow); diesel = compression ignition; 14.7:1; battery/alternator/starter; disc vs drum; saw types by task; wrench types; welding vs brazing vs soldering; wood joints.
- **MC**: MA = load/effort; lever classes; pulley MA = supporting rope segments; gear ratio = driven/driver teeth, meshed gears reverse, odd count → same direction; inclined plane MA = length/height; Pascal F₁/A₁=F₂/A₂; "less effort ≠ less work".
- **AO**: rotations allowed, mirror images never; check dot position on connector items; pick the odd-shaped piece and scan choices.

### 4.4 Study-plan logic (drives the app's planner)
- Diagnostic first → sort subtests into AFQT bucket vs job-composite bucket → plan by gap: within 5 AFQT pts → 2 weeks; 10–15 below → 4 weeks; 15+ → 8 weeks.
- Priority tiers: 1) WK+PC (doubled via VE), 2) AR, 3) MK, 4) only the technical subtests the target job needs.
- Active recall + spaced repetition (1 d → 3 d → 1 wk → 1 mo) from the student's own missed items; weekly full timed test; keep timed vs untimed accuracy within 10 points.

---

## 5. Skills and tools available in this workspace for the build

| Need | Tool / skill available | How it will be used |
|---|---|---|
| Interactive lessons with gated practice + scored quiz | `interactive-lesson-builder` skill | Pattern for each "Learn" module (explain → activity → Level 1/2/3 → quiz) |
| Page/UI quality | `artifact-design` skill; `design` skill (canvas mockups) | Visual system, responsive layout for laptop + phone |
| Score charts, progress dashboards | `dataviz` skill | Diagnostic radar/bars, AFQT trend, per-subtest mastery |
| Hosting a live, shareable version | `Artifact` tool (hosted page, localStorage OK, optional shared DB via `artifact-capabilities`) | Publish the app so students can open it on any device |
| Original question authoring at scale | Cloud shell (Python/Node) + WordNet/Moby data | Generate WK items programmatically; templated AR/MK generators with numeric variation; hand-written GS/EI/AS/MC/PC/AO |
| Local project files | Linked folder `ASVAB_test` on your Mac (device_bash) | Repo, question JSON, build output |
| Browser testing | browser automation / built-in browser | Test small-screen layout, timers, adaptive flow |
| Docs / exports | `docx`, `pdf`, `xlsx` skills | Printable cheat sheets, question-bank spreadsheet for review |

Not useful here: `3d-frontend`, `video-producer`, `showcase-bundle`, `pptx` (could serve later for a promo deck).

---

## 6. Open decisions before architecture (to discuss next)

1. Commercial or not (decides OpenStax/Khan embedding; see §3.5).
2. Delivery: single-file static app (no backend, progress in localStorage/IndexedDB, exportable JSON) vs. hosted with accounts. Recommendation for v1: static, offline-capable, one `index.html` + `data/*.json`; it runs from a folder, GitHub Pages, or an Artifact URL, and fits laptop + phone.
3. Tech stack: vanilla ES-modules + CSS (zero build, easiest to host anywhere) vs. Vite + React/TypeScript (better for SOLID module boundaries, tests). Recommendation: TypeScript + Vite, framework-light (Preact or vanilla), with a clean domain layer (QuestionBank, AdaptiveEngine, Scorer, Scheduler) independent of the UI.
4. Question-bank target size for v1 (suggest ≥ 40 per subtest for the diagnostic + practice = 400+, growing to 1,500+).
5. AO images: must be drawn as SVG programmatically (no free image sets exist) — decide whether AO is in v1 or v1.1.
6. Language: English only, or English + Spanish UI/explanations.

## 7. Source index
Official: officialasvab.com (what-to-expect, cat-asvab, subtests, sample-questions, scores, retest policy, PiCAT, Fact Sheet PDF Apr 2025) · airforce.com/asvab · navy.com/joining/requirements · asvabprogram.com CEP Overview PDF.
Secondary: navycs.com · dummies.com (scoring, cheat sheet, prefixes, PC types, AO) · Wikipedia ASVAB · battalionduty.com · asvabhero.com · uniontestprep.com · kaptest.com/study/asvab · military.com/join-armed-forces/asvab · mometrix.com · enlistiqprep.com · asvabdrill.com · mechanicalaptitudetest.org.
Licensing: openstax.org/license · help.openstax.org (commercial use) · info.ck12.org/terms-of-use · support.khanacademy.org/hc/en-us/articles/202262954 · github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md · gutenberg.org/files/3201.
