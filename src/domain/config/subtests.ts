/**
 * The official CAT-ASVAB layout — single source of truth for the whole app.
 * Verified against officialasvab.com/applicants/what-to-expect on 2026-09-03.
 * If the official layout changes, this file is the only place to edit.
 */
export type SubtestCode = 'GS' | 'AR' | 'WK' | 'PC' | 'MK' | 'EI' | 'AI' | 'SI' | 'MC' | 'AO';

export type Domain = 'verbal' | 'math' | 'science-technical' | 'spatial';

export interface SubtestSpec {
  readonly code: SubtestCode;
  readonly name: { readonly en: string; readonly es: string };
  readonly scoredItems: number;
  readonly minutes: number;
  readonly domain: Domain;
  /** True for the four subtests that feed the AFQT (AR, WK, PC, MK). */
  readonly afqt: boolean;
}

export const SUBTESTS: readonly SubtestSpec[] = [
  { code: 'GS', name: { en: 'General Science', es: 'Ciencias generales' }, scoredItems: 15, minutes: 12, domain: 'science-technical', afqt: false },
  { code: 'AR', name: { en: 'Arithmetic Reasoning', es: 'Razonamiento aritmético' }, scoredItems: 15, minutes: 55, domain: 'math', afqt: true },
  { code: 'WK', name: { en: 'Word Knowledge', es: 'Vocabulario' }, scoredItems: 15, minutes: 9, domain: 'verbal', afqt: true },
  { code: 'PC', name: { en: 'Paragraph Comprehension', es: 'Comprensión de párrafos' }, scoredItems: 10, minutes: 27, domain: 'verbal', afqt: true },
  { code: 'MK', name: { en: 'Mathematics Knowledge', es: 'Conocimientos matemáticos' }, scoredItems: 15, minutes: 31, domain: 'math', afqt: true },
  { code: 'EI', name: { en: 'Electronics Information', es: 'Electrónica' }, scoredItems: 15, minutes: 10, domain: 'science-technical', afqt: false },
  { code: 'AI', name: { en: 'Auto Information', es: 'Automotriz' }, scoredItems: 10, minutes: 7, domain: 'science-technical', afqt: false },
  { code: 'SI', name: { en: 'Shop Information', es: 'Taller y herramientas' }, scoredItems: 10, minutes: 6, domain: 'science-technical', afqt: false },
  { code: 'MC', name: { en: 'Mechanical Comprehension', es: 'Comprensión mecánica' }, scoredItems: 15, minutes: 22, domain: 'science-technical', afqt: false },
  { code: 'AO', name: { en: 'Assembling Objects', es: 'Ensamble de objetos' }, scoredItems: 15, minutes: 18, domain: 'spatial', afqt: false },
] as const;

export const SUBTEST_ORDER: readonly SubtestCode[] = SUBTESTS.map((s) => s.code);

export function getSubtest(code: SubtestCode): SubtestSpec {
  const spec = SUBTESTS.find((s) => s.code === code);
  if (!spec) throw new Error(`Unknown subtest: ${code}`);
  return spec;
}

/** Official time budget per scored item, in seconds (e.g. WK = 36 s, AR = 220 s). */
export function secondsPerItem(code: SubtestCode): number {
  const s = getSubtest(code);
  return Math.round((s.minutes * 60) / s.scoredItems);
}

export const TOTAL_SCORED_ITEMS = SUBTESTS.reduce((n, s) => n + s.scoredItems, 0); // 135
export const TOTAL_MINUTES = SUBTESTS.reduce((n, s) => n + s.minutes, 0); // 197
