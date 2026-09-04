# Free Material Inventory and Licensing

Purpose: every source we looked at, what it offers, and whether its content can go inside the app. Checked 2026-09-03.

## 1. Official / government

| Source | URL | Offers | Format | License / verdict |
|---|---|---|---|---|
| officialasvab.com sample questions | officialasvab.com/applicants/sample-questions/ (+ per-subtest pages) | ~4 items × 10 subtests (~40), answer on click, no explanations | HTML | Site asserts "All Rights Reserved"; items may be contractor-made → treat as copyrighted. Use as the *format spec*. |
| ASVAB CEP Overview (DD Form 1304-5OV, Feb 2026) | prod-media.asvabprogram.com/CEP_PDF_Contents/ASVAB_CEP_Overview.pdf | 4 items × 8 subtests (32) + key (p.28); authoritative subtest descriptions, timing, composites | PDF | Numbered DoD form, no copyright notice → public domain (17 U.S.C. §105). Holland/RIASEC material inside is ® — skip that. **Best seed source.** |
| CEP Counselor Manual | prod-media.asvabprogram.com/CEP_PDF_Contents/ASVAB_CEP_Counselor_Manual.pdf | Descriptions, scoring | PDF | Same status as above. |
| Today's Military | todaysmilitary.com/joining-eligibility/asvab-test/asvab-sample-questions | 9 items across 8 subtests | HTML | DoD-operated but contractor-built; no notice → unclear. Too few to matter. |
| military.com | military.com/join-armed-forces/asvab | Articles, links, paid guide | HTML | Private company (© Military Advantage). Reference only. |
| goarmy.com / airforce.com / navy.com | — | Test descriptions, minimums | HTML | Reference for policy numbers. |

## 2. Free PDFs and library access
- ASVAB Advantage Practice Exam 1 (asvabadvantage.com/…/ASVAB-Practice-Test1.pdf): ~186 items, no key, appears to be a commercial-book excerpt → do not use.
- Peterson's via Gale, LearningExpress Library: free through public libraries, copyrighted, personal use only → reference.
- Kaplan free samples (kaptest.com/study/asvab/…): ~5 items each with explanations → copyrighted, reference only.
- "Virtual library" PDF hits on scraper domains → spam, skip.

## 3. GitHub
- complexorganizations/ASVAB — study notes, no questions, no LICENSE → all rights reserved.
- calvinmorett/asvab — 1–2 examples per subtest, archived 2025, no LICENSE.
- markrainer224/ASVAB-PDF-Dumps… — spam.
- Reusable *engines* (not content), check LICENSE (mostly MIT): SafdarJamal/quiz-app, bolorundurowb/Open-Exam-Suite, Samkarya/online-exam-questions (JSON schema idea).
- Conclusion: no openly licensed ASVAB question bank exists on GitHub.

## 4. Open Educational Resources for the "Learn" section

| Source | Covers | License (verified) | Use |
|---|---|---|---|
| OpenStax Prealgebra 2e | AR/MK fractions, decimals, percents, ratios, basic algebra, geometry | CC BY-NC-SA 4.0 | Topic outline; embed only if non-commercial |
| OpenStax Elementary Algebra 2e | MK linear eqs, polynomials, factoring, quadratics | CC BY-NC-SA 4.0 | same |
| OpenStax College Physics 2e | GS/MC/EI mechanics, simple machines, circuits | CC BY-NC-SA 4.0 | same |
| OpenStax Biology 2e / Chemistry 2e | GS | CC BY-NC-SA 4.0 | same |
| OpenStax policy | openstax.org/license · help.openstax.org (commercial use) | Whole library moved to NC-SA; old downloaded CC BY 1e copies remain CC BY | — |
| CK-12 | MS/HS math + science (closest to ASVAB level) | Custom CK-12 license: education-only, attribution badge, noindex/canonical | Link out, don't embed |
| Khan Academy | Arithmetic → algebra, physics, chem, bio, reading | CC BY-NC-SA 3.0 + required attribution note | Link out |
| LibreTexts (math/phys/chem/bio) | Everything | Per page, mostly CC BY-NC-SA, some CC BY | Check badge per page |
| Wikibooks / Wikiversity | EI circuits, automotive, tools, physics | CC BY-SA 4.0 | Embed with attribution + share-alike |
| Wikipedia ASVAB article | Structure, timing, composites | CC BY-SA 4.0 | Embed with attribution |

## 5. Word Knowledge data

| Source | Offers | License |
|---|---|---|
| MichaelWehar/Public-Domain-Word-Lists | 200 rare / 5,000 common / frequency lists (txt, csv) | Public domain |
| Moby Word Lists (Gutenberg #3201) | Moby Thesaurus: 30k roots, 2.5M synonyms | Public domain |
| Open English WordNet (globalwordnet/english-wordnet, en-word.net) | Definitions, synsets, POS; via NLTK | CC BY 4.0 (WordNet License base) |
| Wiktionary / kaikki.org dumps | Definitions, synonyms (JSON) | CC BY-SA 4.0 |
| tdulcet/compact-dictionaries | Compiled dictionary/thesaurus | Per-source, check |
| Barron's/McGraw-Hill/Magoosh SAT/GRE lists | — | Copyrighted compilations — don't copy; single words are not copyrightable |

Plan for WK generation: frequency-band words (Wehar) → definition + synonyms (WordNet) → distractors from same POS, different synset, similar frequency (Moby) → human review.

## 6. Commercial free practice sites (style reference only)

| Site | Free content | Explanations | Terms |
|---|---|---|---|
| Union Test Prep | 350 free Qs, 9 subtests, CAT & P&P | Yes | "may not be reproduced…" |
| Mometrix | 135-Q test + 9 subtest tests | Yes, detailed | © |
| asvabpracticetests.com | 15 tests, 10 subtests | Yes | © by default |
| asvabpracticetestonline.com | 10 subtests + full/quick | Yes | © 2026 |
| ASVABTutor | 9 subtests, unlimited | Not stated | © 2026 |
| 4Tests | 128-Q CAT / 280-Q written | Not stated | © |
| Test Prep Review | 9 samples | Yes | © |
| ASVAB Advantage | 135-Q test | Yes | © |
| JobTestPrep / TestPrep-Online | small samples | some | © |

Benchmarks to match: ~40–50 items per subtest for a full free set; 4 options A–D; stems like "X most nearly means"; 1–3-paragraph PC passages; explanation of 2–5 sentences that names the trap.

## 7. Policy for this project
1. Every question, distractor and explanation is written originally (by hand or by our own generators).
2. Embedded explanatory text comes only from public-domain, CC BY, or CC BY-SA sources, with an attribution page in the app.
3. NC-SA sources (OpenStax, Khan, most LibreTexts) are used as topic outlines and linked, not embedded, unless the app is declared permanently non-commercial.
4. Official sample items are used to calibrate difficulty and format only.
5. Keep a `data/attributions.json` listing every external source used and its license.
