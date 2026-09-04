import type { SubtestCode } from '../config/subtests';

export type Locale = 'en' | 'es';

/** Text available in both UI languages. */
export type Localized = Readonly<Record<Locale, string>>;

/** 1 = easy, 2 = medium, 3 = hard. The adaptive strategy steps through these. */
export type Difficulty = 1 | 2 | 3;

export interface Question {
  readonly id: string;                 // e.g. "ar-0042"
  readonly subtest: SubtestCode;
  readonly topic: string;              // e.g. "percent"
  readonly difficulty: Difficulty;
  readonly passage?: Localized;        // PC only
  readonly media?: string;             // inline SVG for AO / MC diagrams
  readonly stem: Localized;
  readonly choices: readonly Localized[]; // exactly 4
  readonly answer: number;             // index into choices
  readonly explanation: Localized;
  readonly trap?: Localized;           // the specific mistake this item invites
  readonly strategyRef?: string;       // e.g. "ar.want-have-connect"
  readonly source: 'original';         // content policy: every item is original
  readonly version: number;
}

/** Where questions come from. The UI and engine never know if it is JSON, IndexedDB or a server. */
export interface QuestionSource {
  load(subtest: SubtestCode): Promise<readonly Question[]>;
}
