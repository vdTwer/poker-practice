// Simple placeholder opponents for the practice table. They play a plain, readable
// style so the table is useful before the real bot personalities arrive in slice 3.

import { type Rng, rankOf, suitOf } from './cards';
import { Category, evaluate } from './evaluator';
import { countDrawOuts } from './board';
import { type HandState, type PlayerAction, legalActions, potSize } from './game';

/** 0..1 rough preflop strength from the two hole cards. */
export function preflopStrength(hole: string[]): number {
  const [a, b] = hole.map(rankOf).sort((x, y) => y - x);
  const suited = suitOf(hole[0]) === suitOf(hole[1]);
  if (a === b) return Math.min(1, 0.5 + (a - 2) * 0.04); // 22 = .50, AA = .98
  let s = (a + b - 4) / 48; // 32o ≈ .02, AKo ≈ .9
  if (suited) s += 0.06;
  const gap = a - b - 1;
  if (gap === 0) s += 0.04;
  else if (gap >= 3) s -= 0.06;
  return Math.max(0, Math.min(0.95, s));
}

export function botAction(state: HandState, rng: Rng): PlayerAction {
  const legal = legalActions(state)!;
  const p = state.players[state.toAct!];
  const pot = potSize(state);
  const toCall = legal.callAmount;
  const bb = state.bigBlind;

  const raiseTo = (target: number): PlayerAction => {
    const to = Math.max(legal.minTo, Math.min(legal.maxTo, Math.round(target)));
    return { type: legal.raiseKind, to };
  };
  const passive = (): PlayerAction => (legal.canCheck ? { type: 'check' } : { type: 'call' });
  const giveUp = (): PlayerAction => (legal.canCheck ? { type: 'check' } : { type: 'fold' });

  if (state.phase === 'preflop') {
    const s = preflopStrength(p.hole);
    const facing = state.currentBet / bb;
    if (s > 0.8 && legal.canRaise && rng() < 0.85) return raiseTo(facing <= 1 ? 3 * bb : state.currentBet * 3);
    if (s > 0.6 && facing <= 1 && legal.canRaise && rng() < 0.5) return raiseTo(3 * bb);
    if (s > 0.55 && facing <= 4) return passive();
    if (s > 0.42 && facing <= 1) return passive();
    if (legal.canCheck) return { type: 'check' };
    return rng() < 0.05 ? passive() : { type: 'fold' };
  }

  const value = evaluate([...p.hole, ...state.board]);
  const usesHole = value.cards.some((c) => p.hole.includes(c));
  const strong = usesHole && value.category >= Category.TwoPair;
  const pair = usesHole && value.category === Category.Pair;
  const draw = state.board.length < 5 ? countDrawOuts(p.hole, state.board).outs.length : 0;
  const price = toCall / (pot + toCall);

  if (legal.canCheck) {
    if (strong && legal.canRaise) return raiseTo(pot * (0.5 + rng() * 0.25));
    if ((pair || draw >= 8) && legal.canRaise && rng() < 0.4) return raiseTo(pot * 0.5);
    if (legal.canRaise && rng() < 0.08) return raiseTo(pot * 0.5);
    return { type: 'check' };
  }
  if (strong) return legal.canRaise && rng() < 0.3 ? raiseTo(state.currentBet * 2.5) : passive();
  if (pair && price < 0.35) return passive();
  if (draw >= 8 && price < 0.3) return passive();
  if (draw >= 4 && price < 0.18) return passive();
  return giveUp();
}
