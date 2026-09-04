#!/usr/bin/env node
// Validates src/data/questions/*.json against the Question schema. Usage: node scripts/validate-questions.mjs [code ...]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Spanish items write every number exactly as their English twin does: a point for the
// decimal separator and a comma for thousands. Numbers are matched by their digits alone,
// so any difference in separators is reported no matter how it is written -- "0,25" for
// "0.25", "20.000" for "20,000", a bare "2880" for "2,880", or a spaced "27 000".
const numbers = (s) => s.match(/\d[\d.,]*\d|\d/g) ?? [];
const bare = (t) => t.replace(/[.,]/g, '');
function numberFormatProblems(pair, label, where) {
  if (!pair?.en || !pair?.es) return [];
  const en = numbers(pair.en);
  const verbatim = new Set(en);
  const byBare = new Map();
  for (const t of en) if (!byBare.has(bare(t))) byBare.set(bare(t), t);
  const out = [];
  for (const tok of numbers(pair.es)) {
    // Written the same way somewhere in the English -- nothing to report. Checked first
    // because stripping separators makes a decimal like "4.7" collide with an integer "47".
    if (verbatim.has(tok)) continue;
    const twin = byBare.get(bare(tok));
    if (twin) out.push(`${where}: ${label} "${tok}" — English writes this number as "${twin}"`);
  }
  // A space between digit groups is a thousands separator in Spanish; English never uses one.
  const spaced = pair.es.match(/\d[  ]\d{3}(?!\d)/g);
  if (spaced) for (const m of spaced) out.push(`${where}: ${label} "${m.trim()}" — space used as a thousands separator; use a comma`);
  return out;
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'questions');
const only = process.argv.slice(2).map((c) => c.toLowerCase());
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && (only.length === 0 || only.includes(f.replace('.json', ''))));
let failed = false;

for (const f of files) {
  const code = f.replace('.json', '').toUpperCase();
  let items;
  try { items = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { console.log(`✗ ${f}: invalid JSON — ${e.message}`); failed = true; continue; }
  const errors = [];
  const ids = new Set();
  const stems = new Set();
  const byDiff = { 1: 0, 2: 0, 3: 0 };
  items.forEach((q, i) => {
    const where = `${f}[${i}] ${q.id ?? '?'}`;
    if (!q.id || !/^[a-z]{2}-\d{4}$/.test(q.id)) errors.push(`${where}: id must look like "${code.toLowerCase()}-0001"`);
    if (ids.has(q.id)) errors.push(`${where}: duplicate id`); ids.add(q.id);
    if (q.subtest !== code) errors.push(`${where}: subtest must be ${code}`);
    if (!q.topic) errors.push(`${where}: missing topic`);
    if (![1, 2, 3].includes(q.difficulty)) errors.push(`${where}: difficulty must be 1,2,3`); else byDiff[q.difficulty]++;
    for (const k of ['stem', 'explanation']) if (!q[k]?.en || !q[k]?.es) errors.push(`${where}: ${k} needs en and es`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) errors.push(`${where}: need exactly 4 choices`);
    else q.choices.forEach((c, k) => { if (!c?.en || !c?.es) errors.push(`${where}: choice ${k} needs en and es`); });
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${where}: answer must be 0..3`);
    if (q.trap && (!q.trap.en || !q.trap.es)) errors.push(`${where}: trap needs en and es`);
    if (q.passage && (!q.passage.en || !q.passage.es)) errors.push(`${where}: passage needs en and es`);
    if (q.source !== 'original') errors.push(`${where}: source must be "original"`);
    if (q.version !== 1) errors.push(`${where}: version must be 1`);
    if (q.stem?.en) { const key = (q.stem.en + (q.media ?? '')).toLowerCase().replace(/\s+/g, ' '); if (stems.has(key)) errors.push(`${where}: duplicate stem`); stems.add(key); }
    if (Array.isArray(q.choices) && new Set(q.choices.map((c) => c?.en)).size !== 4) errors.push(`${where}: duplicate choice text`);
    for (const k of ['stem', 'explanation', 'trap', 'passage']) errors.push(...numberFormatProblems(q[k], k, where));
    if (Array.isArray(q.choices)) q.choices.forEach((c, k) => errors.push(...numberFormatProblems(c, `choice ${k}`, where)));
  });
  const answers = items.map((q) => q.answer);
  const dist = [0, 1, 2, 3].map((a) => answers.filter((x) => x === a).length);
  if (items.length >= 20 && Math.max(...dist) > items.length * 0.45) errors.push(`${f}: answer position skewed ${dist.join('/')} — spread the correct answer across A–D`);
  if (errors.length) { failed = true; console.log(`✗ ${f}: ${items.length} items, ${errors.length} problems`); errors.slice(0, 25).forEach((e) => console.log('   ' + e)); }
  else console.log(`✓ ${f}: ${items.length} items · difficulty ${byDiff[1]}/${byDiff[2]}/${byDiff[3]} · answers A-D ${dist.join('/')}`);
}
process.exit(failed ? 1 : 0);
