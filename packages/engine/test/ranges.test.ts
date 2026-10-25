import { describe, it, expect } from 'vitest';
import {
  parseRange, openingRange, rangeShare, playersBehind, handClassOf, parseCards, ALL_HANDS, combos, gridHand,
  equityOneCard, equityTwoCards, potOddsNeeded, callEV, maxCallableBet, gradeByPot,
  genOpenSpot, gradeOpen, genCallSpot, gradeCall, genEquitySpot, gradeEstimate, mulberry32,
} from '../src';

describe('hand classes and ranges', () => {
  it('has 169 hands and 1326 combos', () => {
    expect(ALL_HANDS).toHaveLength(169);
    expect(ALL_HANDS.reduce((a, h) => a + combos(h), 0)).toBe(1326);
    expect(gridHand(0, 1)).toBe('AKs');
    expect(gridHand(1, 0)).toBe('AKo');
    expect(gridHand(12, 12)).toBe('22');
  });
  it('names hole cards', () => {
    expect(handClassOf(parseCards('Kd As'))).toBe('AKo');
    expect(handClassOf(parseCards('9h Th'))).toBe('T9s');
    expect(handClassOf(parseCards('7c 7d'))).toBe('77');
  });
  it('parses chart shorthand', () => {
    expect([...parseRange('TT+')]).toEqual(['TT', 'JJ', 'QQ', 'KK', 'AA']);
    expect([...parseRange('KTs+')]).toEqual(['KTs', 'KJs', 'KQs']);
    expect(parseRange('A2o+').size).toBe(12);
  });
  it('widens as fewer players are left behind, and every chart contains the tighter ones', () => {
    const shares = [8, 7, 6, 5, 4, 3, 2].map((b) => rangeShare(openingRange(b)));
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1]);
    expect(shares[0]).toBeGreaterThan(0.07);
    expect(shares[0]).toBeLessThan(0.12);
    expect(shares[6]).toBeGreaterThan(0.4);
    expect(rangeShare(openingRange('HU'))).toBeGreaterThan(0.7);
    for (const b of [7, 6, 5, 4, 3, 2] as const) for (const h of openingRange(b + 1)) expect(openingRange(b).has(h)).toBe(true);
  });
  it('counts players behind by seat and table size', () => {
    // 9 players, button 0: SB 1, BB 2, UTG 3 ... CO 8
    expect(playersBehind(3, 0, 9)).toBe(8);
    expect(playersBehind(8, 0, 9)).toBe(3);
    expect(playersBehind(0, 0, 9)).toBe(2);
    expect(playersBehind(1, 0, 9)).toBe(2);
    expect(playersBehind(2, 0, 9)).toBe(0);
    // 6 players: UTG has 5 behind
    expect(playersBehind(3, 0, 6)).toBe(5);
    expect(playersBehind(0, 0, 2)).toBe('HU');
  });
});

describe('odds', () => {
  it('computes equity from outs', () => {
    expect(equityOneCard(9)).toBeCloseTo(0.1957, 3);
    expect(equityTwoCards(9)).toBeCloseTo(0.35, 2);
    expect(equityTwoCards(8)).toBeCloseTo(0.315, 2);
  });
  it('computes pot odds and EV', () => {
    // Pot 100, bet 50: you call 50 to win 200 total → need 25%.
    expect(potOddsNeeded(100, 50)).toBeCloseTo(0.25);
    expect(callEV(0.25, 100, 50)).toBeCloseTo(0);
    expect(callEV(0.2, 100, 50)).toBeCloseTo(-10);
    expect(maxCallableBet(0.25, 100)).toBeCloseTo(50);
    expect(gradeByPot(0, 100)).toBe('best');
    expect(gradeByPot(2, 100)).toBe('fine');
    expect(gradeByPot(5, 100)).toBe('small');
    expect(gradeByPot(20, 100)).toBe('big');
  });
});

describe('stage 2 and 3 spots', () => {
  const rng = mulberry32(3);
  it('grades open-or-fold consistently', () => {
    for (let i = 0; i < 300; i++) {
      const s = genOpenSpot(rng);
      expect(gradeOpen(s, s.shouldOpen).grade).toBe('best');
      const wrong = gradeOpen(s, !s.shouldOpen);
      expect(wrong.correct).toBe(false);
      expect(wrong.distance).toBeGreaterThan(0);
      expect(wrong.lossBB).toBeGreaterThan(0);
    }
  });
  it('folding aces is a big mistake and opening 72o from the button is one too', () => {
    const base = { players: 6, seat: 0, button: 0, position: 'BTN', positionLong: 'Button', behind: 2 as const, hole: [], rangeShare: 0.45 };
    expect(gradeOpen({ ...base, hand: 'AA', shouldOpen: true }, false).grade).toBe('big');
    expect(gradeOpen({ ...base, hand: '72o', shouldOpen: false }, true).grade).not.toBe('best');
  });
  it('grades call-or-fold by chips', () => {
    for (let i = 0; i < 200; i++) {
      const s = genCallSpot(rng);
      const g = gradeCall(s, s.evCall >= 0 ? 'call' : 'fold');
      expect(g.grade).toBe('best');
      expect(s.equity).toBeGreaterThan(0);
      expect(s.needed).toBeGreaterThan(0);
      expect(s.needed).toBeLessThan(0.5);
    }
  });
  it('grades equity estimates', () => {
    const s = genEquitySpot(rng);
    expect(gradeEstimate(s, s.equity * 100).grade).toBe('best');
    expect(gradeEstimate(s, s.equity * 100 + 30).grade).toBe('big');
  });
});
