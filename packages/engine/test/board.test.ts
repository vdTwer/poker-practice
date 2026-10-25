import { describe, it, expect } from 'vitest';
import {
  parseCards, findNuts, countDrawOuts, flopTexture, Category, mulberry32,
  genShowdown, genBestFive, checkBestFive, genNuts, genOuts, genTexture, genSidePot,
} from '../src';

const c = parseCards;

describe('the nuts', () => {
  it('finds the nut flush on a three-suited board', () => {
    const n = findNuts(c('2h 7h Jh 9c 3d'));
    expect(n.value.category).toBe(Category.Flush);
    expect(n.combos.every((h) => h.includes('Ah'))).toBe(true);
  });
  it('finds quads on a paired board without a flush or straight possible', () => {
    const n = findNuts(c('Kd Kc 7s 2h 2d'));
    expect(n.value.name).toBe('Four of a kind, Kings');
    expect(n.combos).toEqual([['Ks', 'Kh']]);
  });
  it('finds a straight flush when one is possible', () => {
    expect(findNuts(c('9s Ts Js 2d 3c')).value.name).toBe('Straight flush, King high');
  });
});

describe('outs', () => {
  it('counts 9 flush outs', () => {
    const r = countDrawOuts(c('Ah 5h'), c('Kh 8h 2c'));
    expect(r.outs).toHaveLength(9);
    expect(r.draws).toEqual(['flush draw']);
  });
  it('counts 8 outs for an open-ender', () => {
    const r = countDrawOuts(c('9c 8d'), c('7h 6s Kc'));
    expect(r.outs).toHaveLength(8);
    expect(r.draws).toEqual(['open-ender']);
  });
  it('counts 4 outs for a gutshot', () => {
    const r = countDrawOuts(c('9c 8d'), c('6h 5s Kc'));
    expect(r.outs).toHaveLength(4);
    expect(r.draws).toEqual(['gutshot']);
  });
  it('counts 15 outs for a flush draw plus open-ender', () => {
    const r = countDrawOuts(c('9h 8h'), c('7h 6c 2h'));
    expect(r.outs).toHaveLength(15);
    expect(r.label).toBe('combo draw (flush draw + open-ender)');
  });
  it('treats A-2-3-4 as a one-way draw', () => {
    const r = countDrawOuts(c('Ac 2d'), c('3h 4s Kc'));
    expect(r.outs).toHaveLength(4);
  });
});

describe('board texture', () => {
  it('calls K-7-2 rainbow dry and 9-8-7 two-tone wet', () => {
    expect(flopTexture(c('Kc 7d 2h')).kind).toBe('dry');
    expect(flopTexture(c('9h 8h 7c')).kind).toBe('wet');
    expect(flopTexture(c('9h 8h 7h')).suits).toBe('monotone');
  });
});

describe('drill generators', () => {
  const rng = mulberry32(7);
  it('produce valid spots', () => {
    for (let i = 0; i < 30; i++) {
      const sd = genShowdown(rng, 2 + (i % 3));
      expect(sd.winners.length).toBeGreaterThan(0);
      const bf = genBestFive(rng);
      expect(checkBestFive(bf, bf.best.cards).correct).toBe(true);
      const nuts = genNuts(rng, ([3, 4, 5] as const)[i % 3]);
      expect(nuts.options.filter((o) => o.isNuts)).toHaveLength(1);
      expect(new Set(nuts.options.map((o) => o.value.score)).size).toBe(nuts.options.length);
      expect(genOuts(rng).result.outs.length).toBeGreaterThan(0);
      expect(['wet', 'dry']).toContain(genTexture(rng).texture.kind);
      const sp = genSidePot(rng);
      const liveMax = sp.players.filter((p) => !p.folded).map((p) => p.invested).sort((a, b) => b - a);
      expect(liveMax[0]).toBe(liveMax[1]);
      const invested = sp.players.reduce((a, p) => a + p.invested, 0);
      expect(sp.pots.reduce((a, p) => a + p.amount, 0)).toBe(invested);
    }
  });
  it('side pot spots never leave an uncalled bet', () => {
    for (let i = 0; i < 500; i++) {
      const sp = genSidePot(rng);
      const invested = sp.players.reduce((a, p) => a + p.invested, 0);
      expect(sp.pots.reduce((a, p) => a + p.amount, 0)).toBe(invested);
      expect(sp.pots.flatMap((p) => p.shares).reduce((a, s) => a + s.amount, 0)).toBe(invested);
    }
  });
});
