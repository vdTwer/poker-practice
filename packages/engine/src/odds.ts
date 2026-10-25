// Pot odds, equity from outs, and expected value. All amounts are chips.

/** Chance to hit with one card to come (turn to river): outs out of 46 unseen cards. */
export function equityOneCard(outs: number): number {
  return outs / 46;
}

/** Chance to hit at least once with two cards to come (flop to river), seeing both cards. */
export function equityTwoCards(outs: number): number {
  const miss = ((47 - outs) / 47) * ((46 - outs) / 46);
  return 1 - miss;
}

/** The rule of 2 and 4: outs × 2 with one card to come, × 4 with two (as a percentage). */
export function ruleOf2and4(outs: number, cardsToCome: 1 | 2): number {
  return outs * (cardsToCome === 1 ? 2 : 4);
}

/**
 * The share of the final pot you pay when calling: call / (pot after you call).
 * `pot` is what was in the middle before the bet.
 */
export function potOddsNeeded(pot: number, bet: number): number {
  return bet / (pot + 2 * bet);
}

/** Average result of calling (folding is 0): win pot + bet, or lose the call. */
export function callEV(equity: number, pot: number, bet: number): number {
  return equity * (pot + bet) - (1 - equity) * bet;
}

/** Largest bet you could call profitably with this equity (Infinity at 50% or more). */
export function maxCallableBet(equity: number, pot: number): number {
  if (equity >= 0.5) return Infinity;
  return (equity * pot) / (1 - 2 * equity);
}

export type Grade = 'best' | 'fine' | 'small' | 'big';

export const GRADE_LABEL: Record<Grade, string> = {
  best: 'Best play',
  fine: 'Fine: a close spot',
  small: 'Small mistake',
  big: 'Big mistake',
};

/** Grades a decision by chips lost compared with the best play, relative to the pot. */
export function gradeByPot(loss: number, pot: number): Grade {
  if (loss <= 1e-9) return 'best';
  const r = loss / pot;
  if (r < 0.03) return 'fine';
  if (r < 0.1) return 'small';
  return 'big';
}
