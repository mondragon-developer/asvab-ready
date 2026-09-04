import type { Question } from './types';

/**
 * Generates Assembling Objects items as inline SVG, deterministically from a seed.
 * Two item types, matching the real test:
 *  - connector: two shapes with labeled points A and B; which drawing joins them at those points?
 *  - puzzle:    scattered pieces; which assembled figure uses exactly these pieces?
 * Distractors encode the real traps: a mirrored piece (never correct), a connector on the
 * wrong vertex, a swapped/extra piece.
 */

type Pt = readonly [number, number];
type Poly = readonly Pt[];

/* ---------- seeded rng (mulberry32) ---------- */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- geometry ---------- */
const rotate = (p: Poly, deg: number, cx = 0, cy = 0): Poly => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return p.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};
const mirror = (p: Poly, cx = 0): Poly => p.map(([x, y]) => [2 * cx - x, y]);
const translate = (p: Poly, dx: number, dy: number): Poly => p.map(([x, y]) => [x + dx, y + dy]);
const centroid = (p: Poly): Pt => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const fmt = (p: Poly): string => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Split a convex polygon by the line through a→b. Returns [left, right] (either may be empty). */
export function splitPolygon(poly: Poly, a: Pt, b: Pt): [Poly, Poly] {
  const side = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
    const sp = side(p), sq = side(q);
    if (sp >= 0) left.push(p);
    if (sp <= 0) right.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      const x: Pt = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
      left.push(x); right.push(x);
    }
  }
  return [left, right];
}

/* ---------- shape library (all asymmetric so mirroring is visible) ---------- */
const SHAPES: Record<string, Poly> = {
  pentagon: [[4, -30], [32, -9], [22, 25], [-14, 25], [-24, -9]], // slightly skewed so a mirror is visible
  arrow: [[-30, -10], [10, -10], [10, -25], [35, 0], [10, 25], [10, 10], [-30, 10]],
  lshape: [[-25, -30], [0, -30], [0, 5], [25, 5], [25, 30], [-25, 30]],
  trapezoid: [[-30, 20], [30, 20], [15, -20], [-10, -20]],
  flag: [[-30, -25], [30, -25], [15, -5], [30, 15], [-30, 15]],
  bar: [[-40, -8], [40, -8], [40, 8], [-40, 8]],
  wedge: [[-30, 25], [30, 25], [30, -25]],
};
const SHAPE_NAMES = Object.keys(SHAPES);

/* ---------- svg helpers ---------- */
const box = (x: number, label: string, inner: string) =>
  `<g transform="translate(${x},0)"><rect x="0" y="16" width="110" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="4" y="12" font-size="12" fill="currentColor">${label}</text>${inner}</g>`;
const poly = (p: Poly, extra = '') => `<polygon points="${fmt(p)}" fill="none" stroke="currentColor" stroke-width="2" ${extra}/>`;
const dot = ([x, y]: Pt, label?: string) =>
  `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="currentColor"/>${label ? `<text x="${(x + 6).toFixed(1)}" y="${(y - 5).toFixed(1)}" font-size="12" fill="currentColor">${label}</text>` : ''}`;
const line = (a: Pt, b: Pt) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="currentColor" stroke-width="2"/>`;
const wrap = (inner: string) => `<svg viewBox="0 0 600 132" width="600" height="132" role="img" aria-label="Assembling objects item">${inner}</svg>`;

/* ---------- connector items ---------- */
function connectorItem(rng: () => number, index: number): Question {
  const pick = () => SHAPE_NAMES[Math.floor(rng() * SHAPE_NAMES.length)]!;
  const nameA = pick();
  let nameB = pick();
  while (nameB === nameA) nameB = pick();
  const A = SHAPES[nameA]!, B = SHAPES[nameB]!;
  const va = Math.floor(rng() * A.length), vb = Math.floor(rng() * B.length);
  const scale = (p: Poly, k: number): Poly => p.map(([x, y]) => [x * k, y * k]);
  const sA = scale(A, 0.55), sB = scale(B, 0.55);

  // Stem: both shapes with their labeled points.
  const stem = box(0, '', `${poly(translate(sA, 30, 50))}${dot(translate(sA, 30, 50)[va]!, 'A')}${poly(translate(sB, 78, 92))}${dot(translate(sB, 78, 92)[vb]!, 'B')}`);

  // A drawing joins the shapes so that the line runs from vertex va of A to vertex vb of B.
  const draw = (pa: Poly, ia: number, pb: Poly, ib: number, deg: number) => {
    const ra = rotate(pa, deg), rb = rotate(pb, deg + 30);
    const a = translate(ra, 32 - ra[ia]![0] + 14, 45 - ra[ia]![1] + 14);
    const b = translate(rb, 80 - rb[ib]![0], 95 - rb[ib]![1]);
    return `${poly(a)}${poly(b)}${line(a[ia]!, b[ib]!)}`;
  };
  const correct = draw(sA, va, sB, vb, Math.floor(rng() * 8) * 45);
  const mirrored = draw(mirror(sA), va, sB, vb, Math.floor(rng() * 8) * 45);         // mirror trap
  const wrongVertex = draw(sA, (va + 1 + Math.floor(rng() * (A.length - 1))) % A.length, sB, vb, Math.floor(rng() * 8) * 45);
  const wrongVertexB = draw(sA, va, sB, (vb + 1 + Math.floor(rng() * (B.length - 1))) % B.length, Math.floor(rng() * 8) * 45);

  const options = [correct, mirrored, wrongVertex, wrongVertexB];
  const order = placeOptions(index, rng);
  const answer = order.indexOf(0);
  const media = wrap(stem + order.map((o, k) => box(130 + k * 118, 'ABCD'[k]!, options[o]!)).join(''));
  const letter = 'ABCD'[answer]!;
  return {
    id: `ao-${String(index).padStart(4, '0')}`, subtest: 'AO', topic: 'connectors', difficulty: (1 + (index % 3)) as 1 | 2 | 3,
    media, stem: { en: 'Which drawing shows the two shapes connected at points A and B?', es: '¿Qué dibujo muestra las dos figuras conectadas por los puntos A y B?' },
    choices: ['A', 'B', 'C', 'D'].map((c) => ({ en: c, es: c })), answer,
    explanation: { en: `Only ${letter} keeps the line attached at the marked vertex of each shape with both shapes rotated but not flipped.`, es: `Solo ${letter} mantiene la línea unida al vértice marcado de cada figura, con ambas figuras rotadas pero no volteadas.` },
    trap: { en: 'One option is a mirror image (never correct); the others move the connector to a neighbouring vertex.', es: 'Una opción es una imagen en espejo (nunca es correcta); las otras mueven el conector a un vértice vecino.' },
    strategyRef: 'ao.mirror-trap', source: 'original', version: 1,
  };
}

/* ---------- puzzle items ---------- */
function cutSquare(rng: () => number): { pieces: Poly[]; cuts: [Pt, Pt][] } {
  const S = 80;
  const square: Poly = [[0, 0], [S, 0], [S, S], [0, S]];
  const edgePoint = (): Pt => {
    const e = Math.floor(rng() * 4), t = 10 + rng() * (S - 20);
    return e === 0 ? [t, 0] : e === 1 ? [S, t] : e === 2 ? [t, S] : [0, t];
  };
  const cuts: [Pt, Pt][] = [];
  let pieces: Poly[] = [square];
  const n = 2 + Math.floor(rng() * 2); // 2 or 3 cuts → 3-4 pieces
  for (let i = 0; i < n; i++) {
    let a = edgePoint(), b = edgePoint();
    let guard = 0;
    while ((Math.abs(a[0] - b[0]) < 15 && Math.abs(a[1] - b[1]) < 15 || (a[0] === b[0] && (a[0] === 0 || a[0] === S)) || (a[1] === b[1] && (a[1] === 0 || a[1] === S))) && guard++ < 20) { a = edgePoint(); b = edgePoint(); }
    cuts.push([a, b]);
    pieces = pieces.flatMap((p) => splitPolygon(p, a, b).filter((q) => q.length >= 3));
  }
  return { pieces, cuts };
}

function drawCuts(cuts: [Pt, Pt][], transform: (p: Poly) => Poly, ox: number, oy: number): string {
  const S = 80;
  const sq = translate(transform([[0, 0], [S, 0], [S, S], [0, S]]), ox, oy);
  return poly(sq) + cuts.map(([a, b]) => { const t = translate(transform([a, b]), ox, oy); return line(t[0]!, t[1]!); }).join('');
}

function puzzleItem(rng: () => number, index: number): Question {
  const { pieces, cuts } = cutSquare(rng);
  // Stem: pieces scattered and individually rotated.
  const scattered = pieces.map((p, i) => {
    const c = centroid(p);
    const r = rotate(translate(p, -c[0], -c[1]), Math.floor(rng() * 8) * 45);
    const cols = pieces.length <= 3 ? 2 : 2;
    const x = 30 + (i % cols) * 50, y = 45 + Math.floor(i / cols) * 45;
    return poly(translate(r.map(([px, py]) => [px * 0.6, py * 0.6]), x, y));
  }).join('');
  const stem = box(0, '', scattered);

  const whole = (deg: number) => (p: Poly) => rotate(p, deg, 40, 40);
  const correct = drawCuts(cuts, whole(Math.floor(rng() * 4) * 90), 15, 31);
  const mirroredCuts = drawCuts(cuts, (p) => mirror(rotate(p, Math.floor(rng() * 4) * 90, 40, 40), 40), 15, 31);
  const other = cutSquare(rng);
  const differentCuts = drawCuts(other.cuts, whole(0), 15, 31);
  const extraCut = drawCuts([...cuts, [[10 + rng() * 60, 0], [10 + rng() * 60, 80]]], whole(Math.floor(rng() * 4) * 90), 15, 31);

  const options = [correct, mirroredCuts, differentCuts, extraCut];
  const order = placeOptions(index, rng);
  const answer = order.indexOf(0);
  const media = wrap(stem + order.map((o, k) => box(130 + k * 118, 'ABCD'[k]!, options[o]!)).join(''));
  const letter = 'ABCD'[answer]!;
  return {
    id: `ao-${String(index).padStart(4, '0')}`, subtest: 'AO', topic: 'puzzle', difficulty: (1 + (index % 3)) as 1 | 2 | 3,
    media, stem: { en: 'Which figure is made from exactly the pieces shown on the left?', es: '¿Qué figura se forma exactamente con las piezas de la izquierda?' },
    choices: ['A', 'B', 'C', 'D'].map((c) => ({ en: c, es: c })), answer,
    explanation: { en: `${letter} contains every piece once, rotated but not flipped. Check the most distinctive piece first, then confirm a second one.`, es: `${letter} contiene cada pieza una vez, rotada pero no volteada. Revisa primero la pieza más distintiva y luego confirma una segunda.` },
    trap: { en: 'One figure is the mirror image of the correct one, one uses a different set of pieces, and one has an extra piece.', es: 'Una figura es la imagen en espejo de la correcta, otra usa un conjunto distinto de piezas y otra tiene una pieza extra.' },
    strategyRef: 'ao.odd-piece', source: 'original', version: 1,
  };
}

/** Option order: the correct option (0) goes to slot index % 4 so keys spread evenly; distractors are shuffled. */
function placeOptions(index: number, rng: () => number): number[] {
  const rest = [1, 2, 3];
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j]!, rest[i]!]; }
  const out = rest.slice();
  out.splice(index % 4, 0, 0);
  return out;
}

/** Generate `count` AO items (alternating connector / puzzle) from a seed. */
export function generateAO(count: number, seed = 20260903): Question[] {
  const rng = seededRng(seed);
  const out: Question[] = [];
  for (let i = 1; i <= count; i++) out.push(i % 2 === 1 ? connectorItem(rng, i) : puzzleItem(rng, i));
  return out;
}
