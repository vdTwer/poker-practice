// No-Limit Texas Hold'em hand engine for 2 to 9 players.
//
// A hand is a plain data object. `startHand` posts blinds and deals, `legalActions` says
// what the player to act may do, and `applyAction` returns the next state. The engine
// runs the board out automatically when nobody can bet any more, and settles the pots
// (main pot, side pots, splits, uncalled bets) at the end.

import { type Card, type Rng, shuffledDeck, mulberry32, randomSeed } from './cards';
import { type HandValue, evaluate, explainComparison } from './evaluator';
import { buildPots, splitPot } from './pots';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Phase = Street | 'complete';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export interface SeatSetup {
  id: string;
  name: string;
  stack: number;
}

export interface HandPlayer {
  seat: number;
  id: string;
  name: string;
  /** Chips behind (not yet put in). */
  stack: number;
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in over the whole hand. */
  total: number;
  startStack: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  hasActed: boolean;
  /** The bet level this player had matched when they last acted (decides whether a short all-in reopens raising). */
  lastFacedBet: number;
}

export interface PlayerAction {
  type: ActionType;
  /** For bet and raise: the total this player's bet on this street becomes ("raise to"). */
  to?: number;
}

export type HandEvent =
  | { type: 'post'; seat: number; blind: 'small' | 'big'; amount: number; allIn: boolean }
  | { type: 'deal'; }
  | { type: 'action'; seat: number; action: ActionType; to: number; added: number; allIn: boolean; street: Street }
  | { type: 'street'; street: Exclude<Street, 'preflop'>; cards: Card[]; board: Card[] }
  | { type: 'return'; seat: number; amount: number }
  | { type: 'win'; seat: number; amount: number; pot: number; potName: string; hand: string | null }
  | { type: 'showdown' }
  | { type: 'end'; showdown: boolean };

export interface PotAward {
  name: string;
  amount: number;
  eligible: number[];
  winners: number[];
  /** The winning hand's name, or null when everyone else folded. */
  hand: string | null;
  /** Plain-language reason, e.g. "Pair of Kings beats pair of Nines". */
  reason: string;
  shares: { seat: number; amount: number }[];
}

export interface HandResult {
  showdown: boolean;
  awards: PotAward[];
  returned: { seat: number; amount: number } | null;
  /** Best hand of every player who reached showdown. */
  hands: Record<number, HandValue>;
  /** Net chip change per seat. */
  net: Record<number, number>;
}

export interface HandState {
  players: HandPlayer[];
  button: number;
  sbSeat: number;
  bbSeat: number;
  smallBlind: number;
  bigBlind: number;
  phase: Phase;
  board: Card[];
  deck: Card[];
  /** The highest bet on this street that players must match. */
  currentBet: number;
  /** Size of the last full bet or raise on this street; the next raise must be at least this much more. */
  lastRaiseSize: number;
  toAct: number | null;
  log: HandEvent[];
  result: HandResult | null;
}

export interface StartOptions {
  seats: SeatSetup[];
  button: number;
  smallBlind: number;
  bigBlind: number;
  rng?: Rng;
  /** Fixed cards for lessons and tests. Hole cards by seat, plus the five board cards. */
  preset?: { hole: Card[][]; board: Card[] };
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  /** Chips needed to call; 0 when checking is possible. */
  callAmount: number;
  /** True when calling puts the player all-in. */
  callIsAllIn: boolean;
  canRaise: boolean;
  /** "bet" when nobody has bet this street, "raise" otherwise. */
  raiseKind: 'bet' | 'raise';
  minTo: number;
  maxTo: number;
}

const clone = (s: HandState): HandState => JSON.parse(JSON.stringify(s));

/** Seat order starting just left of `from`, wrapping round the table. */
export function seatsFrom(from: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) out.push((from + i) % n);
  return out;
}

export function blindSeats(button: number, n: number): { sb: number; bb: number } {
  if (n === 2) return { sb: button, bb: (button + 1) % 2 };
  return { sb: (button + 1) % n, bb: (button + 2) % n };
}

export function startHand(opts: StartOptions): HandState {
  const n = opts.seats.length;
  if (n < 2 || n > 9) throw new Error('A table needs 2 to 9 players');
  if (opts.seats.some((s) => s.stack <= 0)) throw new Error('Every seated player needs chips');
  const rng = opts.rng ?? mulberry32(randomSeed());
  const { sb, bb } = blindSeats(opts.button, n);

  let deck: Card[];
  let hole: Card[][];
  let board: Card[] = [];
  if (opts.preset) {
    hole = opts.preset.hole.map((h) => h.slice());
    const used = [...hole.flat(), ...opts.preset.board];
    // The preset board is placed at the top of the deck so the streets deal it in order.
    deck = [...opts.preset.board, ...shuffledDeck(rng, used)];
  } else {
    deck = shuffledDeck(rng);
    // Deal one card at a time, starting left of the button, like a real dealer.
    hole = opts.seats.map(() => [] as Card[]);
    const order = seatsFrom(opts.button, n);
    for (let round = 0; round < 2; round++) for (const s of order) hole[s].push(deck.shift()!);
  }

  const players: HandPlayer[] = opts.seats.map((s, i) => ({
    seat: i, id: s.id, name: s.name, stack: s.stack, startStack: s.stack, bet: 0, total: 0,
    hole: hole[i], folded: false, allIn: false, hasActed: false, lastFacedBet: 0,
  }));

  const state: HandState = {
    players, button: opts.button, sbSeat: sb, bbSeat: bb,
    smallBlind: opts.smallBlind, bigBlind: opts.bigBlind,
    phase: 'preflop', board, deck, currentBet: 0, lastRaiseSize: opts.bigBlind,
    toAct: null, log: [], result: null,
  };

  post(state, sb, opts.smallBlind, 'small');
  post(state, bb, opts.bigBlind, 'big');
  state.log.push({ type: 'deal' });
  // Players must match the full big blind even if the big blind player was short.
  state.currentBet = opts.bigBlind;
  state.lastRaiseSize = opts.bigBlind;

  // Preflop the first to act sits left of the big blind (heads-up, that's the button).
  return advance(state, bb);
}

function post(state: HandState, seat: number, amount: number, blind: 'small' | 'big') {
  const p = state.players[seat];
  const paid = Math.min(amount, p.stack);
  p.stack -= paid;
  p.bet += paid;
  p.total += paid;
  if (p.stack === 0) p.allIn = true;
  state.log.push({ type: 'post', seat, blind, amount: paid, allIn: p.allIn });
}

function canAct(p: HandPlayer) {
  return !p.folded && !p.allIn;
}

function needsToAct(state: HandState, p: HandPlayer) {
  return canAct(p) && (!p.hasActed || p.bet < state.currentBet);
}

export function legalActions(state: HandState): LegalActions | null {
  if (state.toAct === null || state.phase === 'complete') return null;
  const p = state.players[state.toAct];
  const toCall = Math.max(0, state.currentBet - p.bet);
  const callAmount = Math.min(toCall, p.stack);
  const othersWhoCanAct = state.players.filter((o) => o.seat !== p.seat && canAct(o)).length;
  const reopened = !p.hasActed || state.currentBet - p.lastFacedBet >= state.lastRaiseSize;
  const maxTo = p.bet + p.stack;
  const canRaise = p.stack > toCall && othersWhoCanAct > 0 && reopened;
  const fullMin = state.currentBet === 0 ? state.bigBlind : state.currentBet + state.lastRaiseSize;
  return {
    canFold: toCall > 0,
    canCheck: toCall === 0,
    callAmount: toCall === 0 ? 0 : callAmount,
    callIsAllIn: toCall > 0 && callAmount === p.stack,
    canRaise,
    raiseKind: state.currentBet === 0 ? 'bet' : 'raise',
    // A player who can't afford a full raise may still move all-in.
    minTo: Math.min(fullMin, maxTo),
    maxTo,
  };
}

export class IllegalAction extends Error {}

export function applyAction(prev: HandState, action: PlayerAction): HandState {
  const legal = legalActions(prev);
  if (!legal || prev.toAct === null) throw new IllegalAction('No one is to act');
  const state = clone(prev);
  const p = state.players[prev.toAct];
  const street = state.phase as Street;
  let to = p.bet;

  switch (action.type) {
    case 'fold':
      // Folding when you could check is allowed in real play, but it's always a mistake;
      // we allow it so the table behaves like a real one.
      p.folded = true;
      break;
    case 'check':
      if (!legal.canCheck) throw new IllegalAction('You can only check when there is no bet to call');
      break;
    case 'call': {
      if (legal.canCheck) throw new IllegalAction('There is nothing to call');
      const add = legal.callAmount;
      p.stack -= add; p.bet += add; p.total += add;
      if (p.stack === 0) p.allIn = true;
      to = p.bet;
      break;
    }
    case 'bet':
    case 'raise': {
      if (!legal.canRaise) throw new IllegalAction('Raising is not allowed here');
      const target = action.to;
      if (target === undefined || !Number.isFinite(target)) throw new IllegalAction('A bet needs an amount');
      if (action.type === 'bet' && state.currentBet > 0) throw new IllegalAction('There is already a bet: raise instead');
      if (action.type === 'raise' && state.currentBet === 0) throw new IllegalAction('There is no bet yet: bet instead');
      if (target > legal.maxTo) throw new IllegalAction(`You only have ${legal.maxTo} in total`);
      const allIn = target === legal.maxTo;
      if (target < legal.minTo && !allIn) throw new IllegalAction(`The minimum is ${legal.minTo}`);
      if (target <= state.currentBet) throw new IllegalAction('A raise must be more than the current bet');
      const increment = target - state.currentBet;
      if (increment >= state.lastRaiseSize || state.currentBet === 0) state.lastRaiseSize = Math.max(increment, state.bigBlind);
      const add = target - p.bet;
      p.stack -= add; p.bet = target; p.total += add;
      if (p.stack === 0) p.allIn = true;
      state.currentBet = target;
      to = target;
      break;
    }
  }
  p.hasActed = true;
  p.lastFacedBet = state.currentBet;
  const added = action.type === 'fold' || action.type === 'check' ? 0 : p.total - prev.players[p.seat].total;
  state.log.push({ type: 'action', seat: p.seat, action: action.type, to, added, allIn: p.allIn, street });
  return advance(state, p.seat);
}

/** Moves the hand forward after the player in `fromSeat` acted (or after blinds). */
function advance(state: HandState, fromSeat: number): HandState {
  const n = state.players.length;
  const inHand = state.players.filter((p) => !p.folded);
  if (inHand.length === 1) return settle(state, false);

  const next = seatsFrom(fromSeat, n).map((s) => state.players[s]).find((p) => needsToAct(state, p));
  const actors = state.players.filter(canAct);
  // With one player left who can bet and everyone else all-in, there is nobody to bet against.
  const roundOver = !next || (actors.length === 1 && actors[0].bet >= state.currentBet);
  if (!roundOver && next) {
    state.toAct = next.seat;
    return state;
  }

  // Betting round finished: collect bets and deal the next street.
  for (const p of state.players) { p.bet = 0; p.hasActed = false; p.lastFacedBet = 0; }
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;
  state.toAct = null;

  const order: Exclude<Street, 'preflop'>[] = ['flop', 'turn', 'river'];
  const stillBetting = () => state.players.filter(canAct).length >= 2;
  while (true) {
    const idx = state.phase === 'preflop' ? 0 : state.phase === 'flop' ? 1 : state.phase === 'turn' ? 2 : 3;
    if (idx === 3) return settle(state, true);
    const street = order[idx];
    const count = street === 'flop' ? 3 : 1;
    const cards = state.deck.splice(0, count);
    state.board.push(...cards);
    state.phase = street;
    state.log.push({ type: 'street', street, cards, board: state.board.slice() });
    if (stillBetting()) {
      const first = seatsFrom(state.button, n).map((s) => state.players[s]).find(canAct)!;
      state.toAct = first.seat;
      return state;
    }
    // Everyone (or all but one) is all-in: keep dealing to the river.
  }
}

const POT_NAMES = ['Main pot', 'Side pot 1', 'Side pot 2', 'Side pot 3', 'Side pot 4', 'Side pot 5', 'Side pot 6', 'Side pot 7', 'Side pot 8'];

function settle(state: HandState, showdown: boolean): HandState {
  state.phase = 'complete';
  state.toAct = null;
  const n = state.players.length;
  const { pots, returned } = buildPots(state.players.map((p) => ({ seat: p.seat, amount: p.total, folded: p.folded })));
  if (returned) {
    state.players[returned.seat].stack += returned.amount;
    state.log.push({ type: 'return', seat: returned.seat, amount: returned.amount });
  }

  const hands: Record<number, HandValue> = {};
  const live = state.players.filter((p) => !p.folded);
  if (showdown) {
    state.log.push({ type: 'showdown' });
    for (const p of live) hands[p.seat] = evaluate([...p.hole, ...state.board]);
  }

  const orderFromButton = seatsFrom(state.button, n);
  const awards: PotAward[] = [];
  pots.forEach((pot, i) => {
    const name = pots.length === 1 ? 'Pot' : POT_NAMES[i];
    let winners: number[];
    let hand: string | null = null;
    let reason: string;
    if (!showdown || pot.eligible.length === 1) {
      winners = pot.eligible.slice();
      const w = state.players[winners[0]];
      if (showdown) {
        hand = hands[w.seat].name;
        reason = w.name === 'You' ? 'You are the only player still in for this pot, so it goes back to you.' : `${w.name} is the only player still in for this pot, so it goes back to them.`;
      } else {
        reason = w.name === 'You' ? 'Everyone else folded, so you win without showing your cards.' : `Everyone else folded, so ${w.name} wins without showing their cards.`;
      }
    } else {
      const best = Math.max(...pot.eligible.map((s) => hands[s].score));
      winners = pot.eligible.filter((s) => hands[s].score === best);
      hand = hands[winners[0]].name;
      reason = explainPot(state, pot.eligible, winners, hands);
    }
    const shares = splitPot(pot.amount, winners, orderFromButton);
    for (const [seat, amt] of shares) {
      state.players[seat].stack += amt;
      state.log.push({ type: 'win', seat, amount: amt, pot: i, potName: name, hand });
    }
    awards.push({ name, amount: pot.amount, eligible: pot.eligible, winners, hand, reason, shares: [...shares].map(([seat, amount]) => ({ seat, amount })) });
  });

  const net: Record<number, number> = {};
  for (const p of state.players) net[p.seat] = p.stack - p.startStack;
  state.result = { showdown, awards, returned, hands, net };
  state.log.push({ type: 'end', showdown });
  return state;
}

function explainPot(state: HandState, eligible: number[], winners: number[], hands: Record<number, HandValue>): string {
  const name = (s: number) => state.players[s].name;
  if (winners.length > 1) {
    const losers = eligible.filter((s) => !winners.includes(s));
    const tie = explainComparison(hands[winners[0]], hands[winners[1]], name(winners[0]), name(winners[1])).text;
    const beat = losers.length ? ` ${winners.length === 2 ? 'They both' : 'They all'} beat ${losers.map(name).join(' and ')}.` : '';
    return `${tie}${beat}`;
  }
  const w = winners[0];
  // Explain against the strongest losing hand, which is the comparison that matters.
  const runnerUp = eligible.filter((s) => s !== w).sort((a, b) => hands[b].score - hands[a].score)[0];
  return explainComparison(hands[w], hands[runnerUp], name(w), name(runnerUp)).text;
}

/** The button moves one seat to the left for the next hand. */
export function nextButton(button: number, n: number): number {
  return (button + 1) % n;
}

/** Total chips in the middle: collected pots plus bets on this street. */
export function potSize(state: HandState): number {
  return state.players.reduce((s, p) => s + p.total, 0);
}

/** Chips from earlier streets only (what sits in the middle, not in front of players). */
export function collectedPot(state: HandState): number {
  return state.players.reduce((s, p) => s + p.total - p.bet, 0);
}

// --- Seat names ------------------------------------------------------------------

/**
 * Short position name for a seat, e.g. BTN, SB, BB, UTG, HJ, CO.
 * Heads-up the button also posts the small blind.
 */
export function positionName(seat: number, button: number, n: number): string {
  const { sb, bb } = blindSeats(button, n);
  if (n === 2) return seat === button ? 'BTN' : 'BB';
  if (seat === button) return 'BTN';
  if (seat === sb) return 'SB';
  if (seat === bb) return 'BB';
  const others = seatsFrom(bb, n).filter((s) => s !== button && s !== sb && s !== bb);
  const names = positionLabels(others.length);
  return names[others.indexOf(seat)];
}

function positionLabels(k: number): string[] {
  switch (k) {
    case 1: return ['UTG'];
    case 2: return ['UTG', 'CO'];
    case 3: return ['UTG', 'HJ', 'CO'];
    case 4: return ['UTG', 'MP', 'HJ', 'CO'];
    case 5: return ['UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
    case 6: return ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO'];
    default: return [];
  }
}

export const POSITION_LONG: Record<string, string> = {
  BTN: 'Button', SB: 'Small blind', BB: 'Big blind', UTG: 'Under the gun', 'UTG+1': 'Under the gun +1',
  'UTG+2': 'Under the gun +2', MP: 'Middle position', HJ: 'Hijack', CO: 'Cutoff',
};
