// Reading the board: the nuts, outs and draws, and how wet or dry a flop is.

import { type Card, fullDeck, rankOf, suitOf, rankName, SUIT_NAME, type Suit } from './cards';
import { type HandValue, Category, evaluate } from './evaluator';

export interface NutsResult {
  value: HandValue;
  /** Every pair of hole cards that makes the nuts. */
  combos: Card[][];
}

/** All two-card holdings with their best hand on this board, strongest first. */
export function rankAllHoldings(board: Card[], dead: Card[] = []): { hole: Card[]; value: HandValue }[] {
  if (board.length < 3 || board.length > 5) throw new Error('The board has 3 to 5 cards');
  const unseen = fullDeck().filter((c) => !board.includes(c) && !dead.includes(c));
  const out: { hole: Card[]; value: HandValue }[] = [];
  for (let i = 0; i < unseen.length; i++)
    for (let j = i + 1; j < unseen.length; j++) {
      const hole = [unseen[i], unseen[j]];
      out.push({ hole, value: evaluate([...hole, ...board]) });
    }
  return out.sort((a, b) => b.value.score - a.value.score);
}

export function findNuts(board: Card[]): NutsResult {
  const all = rankAllHoldings(board);
  const top = all[0].value.score;
  return { value: all[0].value, combos: all.filter((h) => h.value.score === top).map((h) => h.hole) };
}

export type DrawKind = 'flush draw' | 'open-ender' | 'double gutshot' | 'gutshot' | 'combo draw';

export interface OutsResult {
  outs: Card[];
  flushOuts: Card[];
  straightOuts: Card[];
  draws: DrawKind[];
  /** Short label for the whole hand, e.g. "combo draw (flush draw + open-ender)". */
  label: string;
}

/**
 * Cards that complete a straight or flush draw using at least one hole card.
 * Only counts when the hand is not already a straight or better.
 */
export function countDrawOuts(hole: Card[], board: Card[]): OutsResult {
  const now = evaluate([...hole, ...board]);
  const empty: OutsResult = { outs: [], flushOuts: [], straightOuts: [], draws: [], label: 'no draw' };
  if (now.category >= Category.Straight || board.length >= 5) return empty;
  const unseen = fullDeck().filter((c) => !hole.includes(c) && !board.includes(c));
  const flushOuts: Card[] = [];
  const straightOuts: Card[] = [];
  for (const c of unseen) {
    const v = evaluate([...hole, ...board, c]);
    if (v.category < Category.Straight || v.category === Category.FullHouse || v.category === Category.FourOfAKind) continue;
    if (!v.cards.some((x) => hole.includes(x))) continue;
    if (v.category === Category.Flush || v.category === Category.StraightFlush) flushOuts.push(c);
    else straightOuts.push(c);
  }
  // A card that makes both counts once, as a flush out.
  const draws: DrawKind[] = [];
  if (flushOuts.length) draws.push('flush draw');
  const straightRanks = new Set([...straightOuts, ...flushOuts.filter((c) => makesStraight(hole, board, c))].map(rankOf));
  if (straightRanks.size >= 2) draws.push(isOpenEnded(hole, board) ? 'open-ender' : 'double gutshot');
  else if (straightRanks.size === 1) draws.push('gutshot');
  const outs = [...flushOuts, ...straightOuts];
  const label = draws.length > 1 ? `combo draw (${draws.join(' + ')})` : draws[0] ?? 'no draw';
  return { outs, flushOuts, straightOuts, draws, label };
}

function makesStraight(hole: Card[], board: Card[], c: Card): boolean {
  const ranks = new Set([...hole, ...board, c].map(rankOf));
  if (ranks.has(14)) ranks.add(1);
  for (let top = 14; top >= 5; top--) {
    let ok = true;
    for (let r = top; r > top - 5; r--) if (!ranks.has(r)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

/** Four consecutive ranks (using a hole card) that can complete at either end. */
function isOpenEnded(hole: Card[], board: Card[]): boolean {
  const ranks = new Set([...hole, ...board].map(rankOf));
  const holeRanks = new Set(hole.map(rankOf));
  if (ranks.has(14)) ranks.add(1);
  // Lowest card from 2 (completes with A or 6) to 10 (completes with 9 or A).
  // A-2-3-4 and J-Q-K-A can only complete one way, so they are gutshots in effect.
  for (let low = 2; low <= 10; low++) {
    const run = [low, low + 1, low + 2, low + 3];
    if (run.every((r) => ranks.has(r)) && run.some((r) => holeRanks.has(r))) return true;
  }
  return false;
}

export interface Texture {
  kind: 'wet' | 'dry' | 'in between';
  suits: 'rainbow' | 'two-tone' | 'monotone';
  paired: boolean;
  /** Most board cards inside any five-rank window: 3 means very connected. */
  connected: number;
  score: number;
  reasons: string[];
}

export function flopTexture(flop: Card[]): Texture {
  if (flop.length !== 3) throw new Error('A flop has 3 cards');
  const suitCounts = new Map<Suit, number>();
  for (const c of flop) suitCounts.set(suitOf(c), (suitCounts.get(suitOf(c)) ?? 0) + 1);
  const maxSuit = Math.max(...suitCounts.values());
  const suits = maxSuit === 3 ? 'monotone' : maxSuit === 2 ? 'two-tone' : 'rainbow';
  const ranks = flop.map(rankOf);
  const paired = new Set(ranks).size < 3;
  const rs = new Set(ranks);
  if (rs.has(14)) rs.add(1);
  let connected = 1;
  for (let low = 1; low <= 10; low++) {
    let k = 0;
    for (let r = low; r < low + 5; r++) if (rs.has(r)) k++;
    connected = Math.max(connected, k);
  }
  const reasons: string[] = [];
  let score = 0;
  if (suits === 'monotone') {
    score += 3;
    const s = [...suitCounts.keys()][0];
    reasons.push(`All three cards are ${SUIT_NAME[s]}, so anyone holding one more ${SUIT_NAME[s].slice(0, -1)} has a flush draw, and two make a flush already.`);
  } else if (suits === 'two-tone') {
    score += 1;
    const s = [...suitCounts.entries()].find(([, n]) => n === 2)![0];
    reasons.push(`Two cards are ${SUIT_NAME[s]}, so a flush draw is possible.`);
  } else reasons.push('Three different suits (a rainbow flop), so nobody can have a flush draw yet.');

  if (!paired) {
    if (connected === 3) { score += 2; reasons.push('All three cards fit inside a five-card straight, so many hands have straight draws or even a straight.'); }
    else if (connected === 2) { score += 1; reasons.push('Two of the cards are close together, so a few straight draws are possible.'); }
    else reasons.push('The cards are far apart, so straight draws are rare.');
  }
  if (paired) { score -= 1; reasons.push(`The board is paired (two ${rankName(mode(ranks), true)}), which leaves fewer cards for draws.`); }
  const kind = score >= 3 ? 'wet' : score <= 0 ? 'dry' : 'in between';
  return { kind, suits, paired, connected, score, reasons };
}

function mode(xs: number[]): number {
  return xs.find((x, i) => xs.indexOf(x) !== i) ?? xs[0];
}
