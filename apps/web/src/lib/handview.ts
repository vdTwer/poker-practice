import { type HandState, type HandEvent, positionName, collectedPot } from '@poker/engine';
import type { TableSeat } from '../components/Table';

export function actionNote(e: Extract<HandEvent, { type: 'action' }>): string {
  const allIn = e.allIn ? ' (all-in)' : '';
  switch (e.action) {
    case 'fold': return 'Fold';
    case 'check': return 'Check';
    case 'call': return `Call${allIn}`;
    case 'bet': return `Bet ${e.to}${allIn}`;
    case 'raise': return `Raise to ${e.to}${allIn}`;
  }
}

export interface ViewOptions {
  /** Seats whose hole cards are face up. */
  reveal?: (seat: number) => boolean;
  hideCards?: boolean;
  hideBets?: boolean;
  names?: string[];
}

/** Turns an engine hand into what the table draws. */
export function seatsFromHand(state: HandState, opts: ViewOptions = {}): TableSeat[] {
  const n = state.players.length;
  const street = state.phase;
  // Last action per seat on the current street.
  const notes = new Map<number, string>();
  let streetStarted = state.phase === 'preflop';
  for (const e of state.log) {
    if (e.type === 'street') { notes.clear(); streetStarted = e.street === street; }
    if (e.type === 'action' && (streetStarted || state.phase === 'complete')) notes.set(e.seat, actionNote(e));
  }
  const winners = new Set(state.result?.awards.flatMap((a) => a.winners) ?? []);
  return state.players.map((p) => ({
    name: opts.names?.[p.seat] ?? p.name,
    stack: p.stack,
    bet: opts.hideBets ? 0 : state.phase === 'complete' ? 0 : p.bet,
    hole: opts.hideCards ? [] : p.hole,
    showCards: opts.reveal ? opts.reveal(p.seat) : false,
    folded: p.folded,
    allIn: p.allIn && state.phase !== 'complete',
    position: positionName(p.seat, state.button, n),
    toAct: state.toAct === p.seat,
    winner: state.phase === 'complete' && winners.has(p.seat),
    note: p.folded ? 'Fold' : notes.get(p.seat),
  }));
}

/** The pot shown in the middle: chips from finished streets (bets on this street sit in front of players). */
export function middlePot(state: HandState): number {
  return state.phase === 'complete' ? state.players.reduce((s, p) => s + p.total, 0) - (state.result?.returned?.amount ?? 0) : collectedPot(state);
}
