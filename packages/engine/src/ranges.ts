// Starting hands and opening ranges.
//
// There are 169 different starting hands once suits are ignored: 13 pocket pairs,
// 78 suited and 78 offsuit hands. The opening charts below are simplified, typical
// raise-first-in ranges for a 100-big-blind cash game. They are not solver output.
//
// The key idea for a variable table size: what decides how many hands you can open is
// how many players are still to act behind you. Under the gun at a 9-player table has
// 8 players behind; on the button there are only the two blinds. A 6-player table's
// first seat has 5 behind, so it opens the same range as the fifth-to-last seat at a
// full table. Every chart is a superset of the tighter ones before it.

import { type Card, RANKS, rankOf, suitOf, rankChar } from './cards';
import { blindSeats, seatsFrom } from './game';

/** Hand classes like "AA", "AKs", "T9o". */
export type HandClass = string;

/** Ranks high to low, as the 13×13 grid shows them. */
export const GRID_RANKS = [...RANKS].reverse();

/** The hand at a grid cell: pairs on the diagonal, suited above it, offsuit below. */
export function gridHand(row: number, col: number): HandClass {
  const a = GRID_RANKS[Math.min(row, col)], b = GRID_RANKS[Math.max(row, col)];
  if (row === col) return a + b;
  return a + b + (row < col ? 's' : 'o');
}

export const ALL_HANDS: HandClass[] = (() => {
  const out: HandClass[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(gridHand(r, c));
  return out;
})();

export function handClassOf(hole: Card[]): HandClass {
  const [x, y] = hole.slice().sort((a, b) => rankOf(b) - rankOf(a));
  if (rankOf(x) === rankOf(y)) return x[0] + y[0];
  return x[0] + y[0] + (suitOf(x) === suitOf(y) ? 's' : 'o');
}

/** How many two-card combinations a hand class has: pairs 6, suited 4, offsuit 12. */
export function combos(h: HandClass): number {
  return h.length === 2 ? 6 : h[2] === 's' ? 4 : 12;
}

export const TOTAL_COMBOS = 1326;

/** Share of all 1326 starting combinations, 0..1. */
export function rangeShare(hands: Iterable<HandClass>): number {
  let n = 0;
  for (const h of hands) n += combos(h);
  return n / TOTAL_COMBOS;
}

export function describeHand(h: HandClass): string {
  const name = (c: string) => ({ A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' } as Record<string, string>)[c];
  if (h.length === 2) return `pair of ${name(h[0])}s`.replace('Sixs', 'Sixes');
  return `${name(h[0])}-${name(h[1])} ${h[2] === 's' ? 'suited' : 'offsuit'}`;
}

/** Parses chart shorthand: "66+" (66 up to AA), "ATs+" (AT suited up to AK suited), "KQo", "55". */
export function parseRange(text: string): Set<HandClass> {
  const out = new Set<HandClass>();
  for (const raw of text.split(',').map((t) => t.trim()).filter(Boolean)) {
    const plus = raw.endsWith('+');
    const t = plus ? raw.slice(0, -1) : raw;
    const hi = rankOf(t[0] + 's'), lo = rankOf(t[1] + 's');
    if (t.length === 2) {
      if (hi !== lo) throw new Error(`Bad range token ${raw}`);
      if (plus) for (let r = hi; r <= 14; r++) out.add(rankChar(r) + rankChar(r));
      else out.add(t);
    } else {
      const kind = t[2];
      if (plus) for (let r = lo; r < hi; r++) out.add(t[0] + rankChar(r) + kind);
      else out.add(t);
    }
  }
  return out;
}

/** Chart levels from tightest to loosest, keyed by players still to act behind you. */
const CHART_STEPS: { behind: number | 'HU'; add: string }[] = [
  { behind: 8, add: '66+, ATs+, KTs+, QJs, AQo+, KQo' },
  { behind: 7, add: '55, A9s, QTs, JTs, AJo' },
  { behind: 6, add: '44, A8s, A5s, K9s, T9s, ATo, KJo' },
  { behind: 5, add: '22+, A2s+, Q9s, 98s' },
  { behind: 4, add: 'K8s, J9s, 87s, 76s, A9o, QJo, KTo' },
  { behind: 3, add: 'K5s+, Q8s, J8s, T8s, 97s, 65s, 54s, A7o+, A5o, QTo, JTo' },
  // Button, and the small blind when everyone folds to it.
  { behind: 2, add: 'K2s+, Q4s+, J6s+, T6s+, 96s, 86s, 85s, 75s, 64s, 53s, A2o+, K8o+, Q9o, J9o, T9o, T8o, 98o' },
  // Heads-up the button acts first preflop and last afterwards, so it opens most hands.
  { behind: 'HU', add: 'Q2s+, J2s+, T2s+, 92s+, 82s+, 73s+, 62s+, 52s+, 42s+, 32s, K2o+, Q2o+, J4o+, T6o+, 96o+, 86o+, 76o, 65o' },
];

const CHARTS = (() => {
  const levels: { behind: number | 'HU'; hands: Set<HandClass> }[] = [];
  let acc = new Set<HandClass>();
  for (const step of CHART_STEPS) {
    acc = new Set([...acc, ...parseRange(step.add)]);
    levels.push({ behind: step.behind, hands: acc });
  }
  return levels;
})();

/**
 * Players still to act after `seat` preflop. The small blind counts as 2 (same chart as
 * the button: only one player is left, but you play every later street out of position).
 * Returns 'HU' for the heads-up button.
 */
export function playersBehind(seat: number, button: number, n: number): number | 'HU' {
  const { bb } = blindSeats(button, n);
  if (n === 2) return seat === button ? 'HU' : 0;
  if (seat === bb) return 0;
  const order = seatsFrom(bb, n); // preflop action order, ending with the big blind
  const behind = order.length - 1 - order.indexOf(seat);
  return Math.max(2, behind);
}

/** The chart for a spot where everyone before you folded. */
export function openingRange(behind: number | 'HU'): Set<HandClass> {
  if (behind === 'HU') return CHARTS[CHARTS.length - 1].hands;
  const b = Math.min(8, Math.max(2, behind));
  return CHARTS.find((c) => c.behind === b)!.hands;
}

/**
 * The tightest chart that still opens this hand, as a level index: 0 = opens from the
 * first seat at a full table, 6 = button only, 7 = heads-up only, 8 = never opened.
 */
export function openLevel(h: HandClass): number {
  const i = CHARTS.findIndex((c) => c.hands.has(h));
  return i < 0 ? CHARTS.length : i;
}

export function levelOfBehind(behind: number | 'HU'): number {
  if (behind === 'HU') return CHARTS.length - 1;
  return 8 - Math.min(8, Math.max(2, behind));
}

export const LEVEL_SEAT_NAME = [
  'under the gun at a full table (8 players behind)',
  'the second seat at a full table (7 behind)',
  'the third seat at a full table (6 behind)',
  'middle position, or under the gun with 6 players (5 behind)',
  'the hijack (4 behind)',
  'the cutoff (3 behind)',
  'the button or small blind',
  'the button heads-up',
];
