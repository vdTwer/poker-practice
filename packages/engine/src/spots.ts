// Spot generators for the stage 2 and 3 drills, with grading in chips or big blinds.

import { type Card, type Rng, shuffledDeck, pick, rankName, SUIT_NAME, suitOf } from './cards';
import { positionName, POSITION_LONG } from './game';
import { countDrawOuts, type OutsResult } from './board';
import { evaluate, Category } from './evaluator';
import {
  type HandClass, handClassOf, openingRange, openLevel, levelOfBehind, playersBehind, LEVEL_SEAT_NAME, rangeShare,
} from './ranges';
import { type Grade, equityOneCard, equityTwoCards, potOddsNeeded, callEV, maxCallableBet, gradeByPot, ruleOf2and4 } from './odds';

// --- Stage 2: open or fold? ------------------------------------------------------

export interface OpenSpot {
  players: number;
  seat: number;
  button: number;
  position: string;
  positionLong: string;
  behind: number | 'HU';
  hole: Card[];
  hand: HandClass;
  shouldOpen: boolean;
  /** Share of all starting hands opened from this seat. */
  rangeShare: number;
}

export function genOpenSpot(rng: Rng): OpenSpot {
  for (;;) {
    const players = 2 + Math.floor(rng() * 8);
    const button = 0;
    // Any seat that can be first in: not the big blind.
    const seats = Array.from({ length: players }, (_, i) => i).filter((s) => playersBehind(s, button, players) !== 0);
    const seat = pick(seats, rng);
    const behind = playersBehind(seat, button, players);
    const hole = shuffledDeck(rng).slice(0, 2);
    const hand = handClassOf(hole);
    const range = openingRange(behind);
    const shouldOpen = range.has(hand);
    // Keep a mix: many spots near the edge of the range, where the learning is.
    const dist = Math.abs(openLevel(hand) - levelOfBehind(behind));
    if (dist > 3 && rng() < 0.6) continue;
    const position = positionName(seat, button, players);
    return { players, seat, button, position, positionLong: POSITION_LONG[position], behind, hole, hand, shouldOpen, rangeShare: rangeShare(range) };
  }
}

export interface OpenGrade {
  grade: Grade;
  correct: boolean;
  /** Estimated cost of the choice in big blinds (0 for the best play). */
  lossBB: number;
  /** How many seats away the decision flips. */
  distance: number;
  /** Where this hand starts being an open, as a phrase after the hand: "opens from the cutoff…". */
  opensFrom: string;
}

/**
 * Grades open/fold by how far the hand is from the edge of the range. One seat away
 * counts as a close spot. The big-blind cost is a rough estimate to show scale.
 */
export function gradeOpen(spot: OpenSpot, open: boolean): OpenGrade {
  const lvl = openLevel(spot.hand);
  const here = levelOfBehind(spot.behind);
  const opensFrom = lvl >= LEVEL_SEAT_NAME.length ? 'is a fold from every seat'
    : lvl === LEVEL_SEAT_NAME.length - 1 ? 'only opens from the button heads-up'
    : `opens from ${LEVEL_SEAT_NAME[lvl]} or any later seat`;
  const correct = open === spot.shouldOpen;
  if (correct) return { grade: 'best', correct, lossBB: 0, distance: 0, opensFrom };
  const distance = spot.shouldOpen ? here - lvl + 1 : lvl - here;
  const lossBB = Math.min(2.5, Math.round(0.08 * distance * distance * 100) / 100);
  const grade: Grade = distance <= 1 ? 'fine' : distance <= 3 ? 'small' : 'big';
  return { grade, correct, lossBB, distance, opensFrom };
}

// --- Stage 3: call or fold with a draw ------------------------------------------------

export interface CallSpot {
  hole: Card[];
  board: Card[];
  /** Chips in the middle before the opponent's bet. */
  pot: number;
  bet: number;
  /** 1: turn bet, river to come. 2: flop all-in, both cards to come. */
  cardsToCome: 1 | 2;
  draw: OutsResult;
  outs: number;
  equity: number;
  needed: number;
  evCall: number;
  maxBet: number;
}

const BET_FRACTIONS = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.25, 1.5];

export function genCallSpot(rng: Rng, mode: 'turn' | 'flop' | 'mixed' = 'mixed'): CallSpot {
  for (;;) {
    const cardsToCome: 1 | 2 = mode === 'turn' ? 1 : mode === 'flop' ? 2 : rng() < 0.6 ? 1 : 2;
    const deck = shuffledDeck(rng);
    const hole = deck.splice(0, 2);
    const board = deck.splice(0, cardsToCome === 1 ? 4 : 3);
    if (evaluate([...hole, ...board]).category > Category.Pair) continue;
    const draw = countDrawOuts(hole, board);
    if (draw.outs.length < 4) continue;
    const outs = draw.outs.length;
    const equity = cardsToCome === 1 ? equityOneCard(outs) : equityTwoCards(outs);
    const pot = 10 * (2 + Math.floor(rng() * 11)); // 20..120
    const bet = Math.max(5, Math.round((pick(BET_FRACTIONS, rng) * pot) / 5) * 5);
    const needed = potOddsNeeded(pot, bet);
    // Lean towards spots where the answer isn't obvious.
    if (Math.abs(equity - needed) > 0.15 && rng() < 0.6) continue;
    return { hole, board, pot, bet, cardsToCome, draw, outs, equity, needed, evCall: callEV(equity, pot, bet), maxBet: maxCallableBet(equity, pot) };
  }
}

export interface CallGrade {
  grade: Grade;
  best: 'call' | 'fold';
  /** Chips given up compared with the best play. */
  loss: number;
}

export function gradeCall(spot: CallSpot, choice: 'call' | 'fold'): CallGrade {
  const best = spot.evCall >= 0 ? 'call' : 'fold';
  const ev = choice === 'call' ? spot.evCall : 0;
  const loss = Math.max(0, Math.max(spot.evCall, 0) - ev);
  return { grade: gradeByPot(loss, spot.pot + spot.bet), best, loss };
}

/** Describes the draw and its outs in one plain sentence. */
export function describeOuts(spot: { hole: Card[]; board: Card[]; draw: OutsResult }): string {
  const parts: string[] = [];
  if (spot.draw.flushOuts.length) parts.push(`${spot.draw.flushOuts.length} ${SUIT_NAME[suitOf(spot.draw.flushOuts[0])]} for the flush`);
  const ranks = [...new Set(spot.draw.straightOuts.map((c) => c[0]))];
  if (ranks.length) parts.push(`${spot.draw.straightOuts.length} card${spot.draw.straightOuts.length > 1 ? 's' : ''} for the straight (${ranks.map((r) => `any ${rankName('23456789TJQKA'.indexOf(r) + 2)}`).join(', ')})`);
  return parts.join(' and ');
}

// --- Stage 3: estimate your equity -----------------------------------------------------

export interface EquitySpot {
  hole: Card[];
  board: Card[];
  draw: OutsResult;
  outs: number;
  cardsToCome: 1 | 2;
  /** Exact chance to hit, 0..1. */
  equity: number;
  /** The rule-of-2-and-4 estimate, as a percentage. */
  quick: number;
}

export function genEquitySpot(rng: Rng): EquitySpot {
  for (;;) {
    const cardsToCome: 1 | 2 = rng() < 0.5 ? 1 : 2;
    const deck = shuffledDeck(rng);
    const hole = deck.splice(0, 2);
    const board = deck.splice(0, cardsToCome === 1 ? 4 : 3);
    if (evaluate([...hole, ...board]).category > Category.Pair) continue;
    const draw = countDrawOuts(hole, board);
    if (draw.outs.length < 4) continue;
    const outs = draw.outs.length;
    return { hole, board, draw, outs, cardsToCome, equity: cardsToCome === 1 ? equityOneCard(outs) : equityTwoCards(outs), quick: ruleOf2and4(outs, cardsToCome) };
  }
}

/** Grades an equity estimate (in percent) by how far it is from the truth. */
export function gradeEstimate(spot: EquitySpot, guessPct: number): { grade: Grade; error: number } {
  const error = Math.abs(guessPct - spot.equity * 100);
  const grade: Grade = error <= 3 ? 'best' : error <= 6 ? 'fine' : error <= 12 ? 'small' : 'big';
  return { grade, error };
}
