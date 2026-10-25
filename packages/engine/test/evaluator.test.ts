import { describe, it, expect } from 'vitest';
import { evaluate, parseCards, Category, explainComparison } from '../src';

const ev = (s: string) => evaluate(parseCards(s));

describe('evaluate', () => {
  it('ranks every category', () => {
    expect(ev('As Ks Qs Js Ts 2d 3c').name).toBe('Royal flush');
    expect(ev('9h 8h 7h 6h 5h Ac Ad').category).toBe(Category.StraightFlush);
    expect(ev('7c 7d 7h 7s Kd 2c 3c').name).toBe('Four of a kind, Sevens');
    expect(ev('Kc Kd Kh 7s 7d 2c 3c').name).toBe('Full house, Kings full of Sevens');
    expect(ev('2h 9h Jh 4h Kh Ac Ad').name).toBe('Flush, King high');
    expect(ev('9c Td Jh Qs Kd 2c 2d').name).toBe('Straight, King high');
    expect(ev('5c 5d 5h Ks 2d 8c 9h').category).toBe(Category.ThreeOfAKind);
    expect(ev('5c 5d 9h 9s 2d 8c Kh').name).toBe('Two pair, Nines and Fives');
    expect(ev('5c 5d 9h Js 2d 8c Kh').name).toBe('Pair of Fives');
    expect(ev('5c 3d 9h Js 2d 8c Kh').name).toBe('High card, King');
  });

  it('handles the wheel (A-2-3-4-5) as a five-high straight', () => {
    const v = ev('Ac 2d 3h 4s 5d Kc Qh');
    expect(v.name).toBe('Straight, Five high');
    expect(v.cards.map((c) => c[0]).join('')).toBe('5432A');
    expect(ev('2c 3d 4h 5s 6d Ac Kh').score).toBeGreaterThan(v.score);
  });

  it('does not wrap straights round the ace', () => {
    expect(ev('Qc Kd Ah 2s 3d 8c 9h').category).toBe(Category.HighCard);
  });

  it('picks the best two pair out of three pairs', () => {
    const v = ev('Ac Ad Kh Ks 2d 2c 9h');
    expect(v.tiebreak).toEqual([14, 13, 9]);
  });

  it('picks the best full house from two sets', () => {
    expect(ev('8c 8d 8h 4s 4d 4c 2h').name).toBe('Full house, Eights full of Fours');
  });

  it('uses kickers to break ties and splits identical hands', () => {
    const a = ev('Ah Kd Qc Qs 7d 4c 2h');
    const b = ev('Jh Td Qc Qs 7d 4c 2h');
    expect(a.score).toBeGreaterThan(b.score);
    const r = explainComparison(a, b, 'Alex', 'Bea');
    expect(r.kicker).toBe(true);
    expect(r.text).toContain('Ace beats Jack');
    // The board plays for both: split pot.
    const c = ev('2h 3d As Ks Qs Js Ts');
    const d = ev('4h 5d As Ks Qs Js Ts');
    expect(c.score).toBe(d.score);
    expect(explainComparison(c, d).result).toBe(0);
  });

  it('flush beats straight and says so', () => {
    const f = ev('2h 9h Jh 4h Kh Ac Ad');
    const s = ev('9c Td Jh Qs Kd 2c 2d');
    expect(explainComparison(f, s, 'Alex', 'Bea').text).toMatch(/Alex has a flush, which beats Bea's straight/);
  });

  it('rejects duplicate cards', () => {
    expect(() => ev('As As Kd Qd Jd')).toThrow();
  });
});

describe('explanations for "You"', () => {
  it('uses second person', () => {
    const f = evaluate(parseCards('2h 9h Jh 4h Kh Ac Ad'));
    const s = evaluate(parseCards('9c Td Jh Qs Kd 2c 2d'));
    expect(explainComparison(f, s, 'You', 'Bea').text).toMatch(/^You have a flush, which beats Bea's straight/);
    expect(explainComparison(f, s, 'Bea', 'You').text).toMatch(/Bea has a flush, which beats your straight/);
  });
});
