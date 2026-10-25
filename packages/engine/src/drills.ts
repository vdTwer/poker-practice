// Spot generators for the stage 0 and stage 1 drills. Each returns everything the UI
// needs to ask the question and explain the answer.

import { type Card, type Rng, shuffledDeck, pick, shuffle } from './cards';
import { type HandValue, Category, evaluate, explainComparison } from './evaluator';
import { findNuts, rankAllHoldings, countDrawOuts, flopTexture, type OutsResult, type Texture } from './board';
import { buildPots, splitPot, type Pot } from './pots';

export const DRILL_NAMES = ['Alex', 'Bea', 'Chen', 'Dara', 'Eli', 'Fran', 'Gus', 'Hana', 'Ivo'];

// --- Who wins? -------------------------------------------------------------------

export interface ShowdownSpot {
  board: Card[];
  players: { name: string; hole: Card[]; value: HandValue }[];
  /** Indexes into players; more than one means a split pot. */
  winners: number[];
  explanation: string;
}

export function genShowdown(rng: Rng, playerCount = 2): ShowdownSpot {
  // Bias towards close, teachable spots: same hand type or kicker battles come up often.
  for (let tries = 0; tries < 40; tries++) {
    const deck = shuffledDeck(rng);
    const board = deck.splice(0, 5);
    const players = DRILL_NAMES.slice(0, playerCount).map((name) => {
      const hole = deck.splice(0, 2);
      return { name, hole, value: evaluate([...hole, ...board]) };
    });
    const best = Math.max(...players.map((p) => p.value.score));
    const winners = players.map((p, i) => (p.value.score === best ? i : -1)).filter((i) => i >= 0);
    const sorted = players.slice().sort((a, b) => b.value.score - a.value.score);
    const close = sorted[0].value.category === sorted[1].value.category;
    if (!close && tries < 25 && rng() < 0.6) continue;
    let explanation: string;
    if (winners.length > 1) {
      explanation = explainComparison(players[winners[0]].value, players[winners[1]].value, players[winners[0]].name, players[winners[1]].name).text;
    } else {
      const w = players[winners[0]];
      const runner = sorted.find((p) => p !== w)!;
      explanation = explainComparison(w.value, runner.value, w.name, runner.name).text;
    }
    return { board, players, winners, explanation };
  }
  throw new Error('unreachable');
}

// --- Build the best five ----------------------------------------------------------

export interface BestFiveSpot {
  hole: Card[];
  board: Card[];
  best: HandValue;
}

export function genBestFive(rng: Rng): BestFiveSpot {
  // Prefer hands where the choice matters (not just "the board plays").
  for (let tries = 0; ; tries++) {
    const deck = shuffledDeck(rng);
    const hole = deck.splice(0, 2);
    const board = deck.splice(0, 5);
    const best = evaluate([...hole, ...board]);
    const boardOnly = evaluate(board);
    if (best.score === boardOnly.score && tries < 30) continue;
    if (best.category === Category.HighCard && tries < 30 && rng() < 0.7) continue;
    return { hole, board, best };
  }
}

export function checkBestFive(spot: BestFiveSpot, chosen: Card[]): { correct: boolean; value: HandValue | null } {
  if (chosen.length !== 5) return { correct: false, value: null };
  const value = evaluate(chosen);
  return { correct: value.score === spot.best.score, value };
}

// --- Tap the nuts -------------------------------------------------------------------

export interface NutsSpot {
  board: Card[];
  options: { hole: Card[]; value: HandValue; isNuts: boolean }[];
  nuts: HandValue;
  /** How many different hole-card pairs make the nuts. */
  nutCombos: number;
}

export function genNuts(rng: Rng, boardSize: 3 | 4 | 5 = 5): NutsSpot {
  const board = shuffledDeck(rng).slice(0, boardSize);
  const all = rankAllHoldings(board);
  const { value: nuts, combos } = findNuts(board);
  const nutPick = pick(combos, rng);
  // Distractors: strong hands of different strength, the kind a beginner might mistake for the best.
  const seen = new Set<number>([nuts.score]);
  const distract: { hole: Card[]; value: HandValue }[] = [];
  const pool = all.filter((h) => h.value.score < nuts.score).slice(0, 120);
  for (const h of shuffle(pool, rng)) {
    if (seen.has(h.value.score) || h.hole.some((c) => nutPick.includes(c) && rng() < 0.5)) continue;
    seen.add(h.value.score);
    distract.push(h);
    if (distract.length === 3) break;
  }
  const options = shuffle([{ hole: nutPick, value: nuts, isNuts: true }, ...distract.map((d) => ({ ...d, isNuts: false }))], rng);
  return { board, options, nuts, nutCombos: combos.length };
}

// --- Count your outs ------------------------------------------------------------------

export interface OutsSpot {
  hole: Card[];
  board: Card[];
  result: OutsResult;
}

export function genOuts(rng: Rng): OutsSpot {
  for (;;) {
    const deck = shuffledDeck(rng);
    const hole = deck.splice(0, 2);
    const board = deck.splice(0, rng() < 0.65 ? 3 : 4);
    const now = evaluate([...hole, ...board]);
    if (now.category > Category.Pair) continue;
    const result = countDrawOuts(hole, board);
    if (result.outs.length === 0) continue;
    return { hole, board, result };
  }
}

// --- Wet or dry? ------------------------------------------------------------------------

export interface TextureSpot {
  flop: Card[];
  texture: Texture;
}

/** Only deals flops that are clearly wet or clearly dry. */
export function genTexture(rng: Rng): TextureSpot {
  const wantWet = rng() < 0.5;
  for (;;) {
    const flop = shuffledDeck(rng).slice(0, 3);
    const texture = flopTexture(flop);
    if (texture.kind === (wantWet ? 'wet' : 'dry')) return { flop, texture };
  }
}

// --- Side pots ---------------------------------------------------------------------------

export interface SidePotSpot {
  players: { name: string; invested: number; folded: boolean }[];
  /** Player indexes from best hand to worst; equal hands share a group. */
  ranking: number[][];
  pots: (Pot & { winners: number[]; shares: { seat: number; amount: number }[] })[];
}

export function genSidePot(rng: Rng, count = 3 + Math.floor(rng() * 3)): SidePotSpot {
  // Round numbers keep the arithmetic about the idea, not the adding.
  const stacks = shuffle([20, 30, 40, 50, 60, 80, 100, 120, 150], rng).slice(0, count);
  const players = stacks.map((s, i) => ({ name: DRILL_NAMES[i], invested: s, folded: false }));
  // Sometimes one player folds after putting a little in, which adds dead money.
  if (count >= 4 && rng() < 0.4) {
    const i = Math.floor(rng() * count);
    players[i].folded = true;
    players[i].invested = Math.min(players[i].invested, 10);
  }
  // Nobody puts in more than the second-biggest live stack can call.
  const live = players.filter((p) => !p.folded).map((p) => p.invested).sort((a, b) => b - a);
  for (const p of players) if (!p.folded) p.invested = Math.min(p.invested, live[1]);
  const order = shuffle(players.map((_, i) => i).filter((i) => !players[i].folded), rng);
  const ranking = order.map((i) => [i]);
  const { pots } = buildPots(players.map((p, i) => ({ seat: i, amount: p.invested, folded: p.folded })));
  const seatOrder = players.map((_, i) => i);
  const withWinners = pots.map((pot) => {
    const winners = ranking.find((group) => group.some((i) => pot.eligible.includes(i)))!.filter((i) => pot.eligible.includes(i));
    const shares = [...splitPot(pot.amount, winners, seatOrder)].map(([seat, amount]) => ({ seat, amount }));
    return { ...pot, winners, shares };
  });
  return { players, ranking, pots: withWinners };
}
