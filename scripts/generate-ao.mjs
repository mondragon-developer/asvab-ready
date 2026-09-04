#!/usr/bin/env node
// Regenerates src/data/questions/ao.json from the deterministic AO generator.
// Usage: node scripts/generate-ao.mjs [count] [seed]
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const count = Number(process.argv[2] ?? 40);
const seed = Number(process.argv[3] ?? 20260903);
// Transpile on the fly through vite-node-less path: use tsx if present, else esbuild via vitest's bundled esbuild.
const code = `import { generateAO } from './src/domain/questions/AOGenerator.ts'; console.log(JSON.stringify(generateAO(${count}, ${seed}), null, 1));`;
writeFileSync('.ao-gen.mts', code);
try {
  const out = execSync('node --experimental-strip-types .ao-gen.mts', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  writeFileSync('src/data/questions/ao.json', out);
  console.log(`wrote ${count} AO items (seed ${seed})`);
} finally {
  execSync('rm -f .ao-gen.mts');
}
