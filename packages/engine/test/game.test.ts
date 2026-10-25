import { describe, it, expect } from 'vitest';
import {
  startHand, applyAction, legalActions, parseCards, mulberry32, buildPots, splitPot,
  positionName, type HandState, type SeatSetup, IllegalAction,
} from '../src';

const seats = (...stacks: number[]): SeatSetup[] => stacks.map((s, i) => ({ id: `p${i}`, name: `P${i}`, stack: s }));
const cards = (s: string) => parseCards(s);
const act = (s: HandState, type: 'fold' | 'check' | 'call' | 'bet' | 'raise', to?: number) => applyAction(s, { type, to });
const totalChips = (s: HandState) => s.players.reduce((a, p) => a + p.stack + p.total, 0);

describe('blinds and order of play', () => {
  it('posts blinds left of the button and starts preflop left of the big blind', () => {
    const s = startHand({ seats: seats(100, 100, 100, 100), button: 0, smallBlind: 1, bigBlind: 2, rng: mulberry32(1) });
    expect(s.sbSeat).toBe(1);
    expect(s.bbSeat).toBe(2);
    expect(s.players[1].bet).toBe(1);
    expect(s.players[2].bet).toBe(2);
    expect(s.toAct).toBe(3);
    expect(s.players.every((p) => p.hole.length === 2)).toBe(true);
  });

  it('heads-up: the button posts the small blind, acts first preflop and last after the flop', () => {
    let s = startHand({ seats: seats(100, 100), button: 0, smallBlind: 1, bigBlind: 2, rng: mulberry32(2) });
    expect(s.sbSeat).toBe(0);
    expect(s.bbSeat).toBe(1);
    expect(s.toAct).toBe(0);
    s = act(s, 'call');
    // The big blind still gets the option to raise.
    expect(s.toAct).toBe(1);
    expect(legalActions(s)!.canCheck).toBe(true);
    s = act(s, 'check');
    expect(s.phase).toBe('flop');
    expect(s.board).toHaveLength(3);
    expect(s.toAct).toBe(1);
  });

  it('names positions for every table size', () => {
    expect([0, 1].map((i) => positionName(i, 0, 2))).toEqual(['BTN', 'BB']);
    expect([0, 1, 2, 3, 4, 5].map((i) => positionName(i, 0, 6))).toEqual(['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => positionName(i, 0, 9))).toEqual(['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO']);
  });
});

describe('betting rules', () => {
  it('enforces the minimum raise as the size of the last raise', () => {
    let s = startHand({ seats: seats(500, 500, 500), button: 0, smallBlind: 5, bigBlind: 10, rng: mulberry32(3) });
    // Button opens to 30 (a raise of 20), so the next raise must be to at least 50.
    s = act(s, 'raise', 30);
    expect(legalActions(s)!.minTo).toBe(50);
    expect(() => act(s, 'raise', 45)).toThrow(IllegalAction);
    s = act(s, 'raise', 70);
    expect(legalActions(s)!.minTo).toBe(110);
  });

  it('preflop ends once everyone has called or folded to the raise', () => {
    let s = startHand({ seats: seats(1000, 1000, 1000, 130), button: 0, smallBlind: 5, bigBlind: 10, rng: mulberry32(4) });
    s = act(s, 'raise', 100); // UTG (seat 3)
    expect(s.toAct).toBe(0);
    s = act(s, 'call');
    s = act(s, 'fold'); // SB
    s = act(s, 'fold'); // BB
    expect(s.phase).toBe('flop');
  });

  it('short all-in after a bet: earlier bettor may only call or fold', () => {
    let s = startHand({ seats: seats(1000, 1000, 150), button: 0, smallBlind: 5, bigBlind: 10, rng: mulberry32(5) });
    // Preflop: button calls, SB calls, BB checks.
    s = act(s, 'call'); s = act(s, 'call'); s = act(s, 'check');
    expect(s.phase).toBe('flop');
    // Flop: SB (seat 1) bets 100, BB (seat 2, 140 behind) moves all-in to 140: a raise of 40, less than 100.
    expect(s.toAct).toBe(1);
    s = act(s, 'bet', 100);
    s = act(s, 'raise', 140);
    expect(s.players[2].allIn).toBe(true);
    // Button hasn't acted yet, so may raise.
    expect(legalActions(s)!.canRaise).toBe(true);
    s = act(s, 'call');
    // Back to SB, who already acted: only call or fold.
    const l = legalActions(s)!;
    expect(s.toAct).toBe(1);
    expect(l.canRaise).toBe(false);
    expect(l.callAmount).toBe(40);
  });

  it('cannot check facing a bet, cannot call with nothing to call', () => {
    const s = startHand({ seats: seats(100, 100, 100), button: 0, smallBlind: 1, bigBlind: 2, rng: mulberry32(6) });
    expect(() => act(s, 'check')).toThrow(IllegalAction);
    const s2 = act(act(act(s, 'call'), 'call'), 'check');
    expect(() => act(s2, 'call')).toThrow(IllegalAction);
  });

  it('returns an uncalled bet and gives the pot to the last player in', () => {
    let s = startHand({ seats: seats(100, 100, 100), button: 0, smallBlind: 1, bigBlind: 2, rng: mulberry32(7) });
    s = act(s, 'raise', 10); // button
    s = act(s, 'fold');
    s = act(s, 'fold');
    expect(s.phase).toBe('complete');
    expect(s.result!.showdown).toBe(false);
    expect(s.result!.returned).toEqual({ seat: 0, amount: 8 });
    expect(s.players[0].stack).toBe(103);
    expect(s.players[1].stack).toBe(99);
    expect(s.players[2].stack).toBe(98);
  });

  it('a blind smaller than the big blind goes all-in when posting', () => {
    const s = startHand({ seats: seats(100, 1, 100), button: 0, smallBlind: 1, bigBlind: 2, rng: mulberry32(8) });
    expect(s.players[1].allIn).toBe(true);
    expect(s.players[1].total).toBe(1);
  });
});

describe('showdowns and side pots', () => {
  it('runs the board out when everyone is all-in and builds side pots', () => {
    // P0 (button) 100 with AA, P1 (SB) 50 with KK, P2 (BB) 20 with QQ. Board blank.
    let s = startHand({
      seats: seats(100, 50, 20), button: 0, smallBlind: 1, bigBlind: 2,
      preset: { hole: [cards('As Ad'), cards('Ks Kd'), cards('Qs Qd')], board: cards('2c 7h 9d 3s 4h') },
    });
    s = act(s, 'raise', 100);
    s = act(s, 'call'); // SB all-in 50
    s = act(s, 'call'); // BB all-in 20
    expect(s.phase).toBe('complete');
    expect(s.board).toHaveLength(5);
    const r = s.result!;
    expect(r.showdown).toBe(true);
    expect(r.returned).toEqual({ seat: 0, amount: 50 });
    expect(r.awards.map((a) => [a.name, a.amount, a.winners])).toEqual([
      ['Main pot', 60, [0]],
      ['Side pot 1', 60, [0]],
    ]);
    expect(s.players.map((p) => p.stack)).toEqual([170, 0, 0]);
    expect(s.players.reduce((a, p) => a + p.stack, 0)).toBe(170);
  });

  it('short stack can win the main pot while someone else takes the side pot', () => {
    let s = startHand({
      seats: seats(100, 100, 30), button: 0, smallBlind: 1, bigBlind: 2,
      preset: { hole: [cards('Ks Kd'), cards('Qs Qd'), cards('As Ad')], board: cards('2c 7h 9d 3s 4h') },
    });
    s = act(s, 'raise', 100);
    s = act(s, 'call');
    s = act(s, 'call');
    const [main, side] = s.result!.awards;
    expect(main.amount).toBe(90);
    expect(main.winners).toEqual([2]);
    expect(side.amount).toBe(140);
    expect(side.winners).toEqual([0]);
    expect(side.reason).toContain('Kings');
  });

  it('splits a pot when the board plays and gives the odd chip left of the button', () => {
    let s = startHand({
      seats: seats(100, 100, 100), button: 0, smallBlind: 1, bigBlind: 2,
      preset: { hole: [cards('2c 3d'), cards('2d 3c'), cards('4c 5d')], board: cards('As Ks Qs Js Ts') },
    });
    s = act(s, 'call'); s = act(s, 'call'); s = act(s, 'check');
    while (s.phase !== 'complete') s = act(s, 'check');
    const a = s.result!.awards[0];
    expect(a.winners.sort()).toEqual([0, 1, 2]);
    expect(a.amount).toBe(6);
    expect(a.reason).toMatch(/split/);
  });

  it('odd chips go to the first winner left of the button', () => {
    expect([...splitPot(7, [0, 2], [1, 2, 0])]).toEqual([[0, 3], [2, 4]]);
  });

  it('builds pots with folded money and multiple all-ins', () => {
    const r = buildPots([
      { seat: 0, amount: 20, folded: false },
      { seat: 1, amount: 50, folded: false },
      { seat: 2, amount: 10, folded: true },
      { seat: 3, amount: 100, folded: false },
      { seat: 4, amount: 100, folded: false },
    ]);
    expect(r.returned).toBeNull();
    expect(r.pots.map((p) => [p.amount, p.eligible])).toEqual([
      [90, [0, 1, 3, 4]],
      [90, [1, 3, 4]],
      [100, [3, 4]],
    ]);
  });
});

describe('random play keeps every chip', () => {
  it('plays 3000 random hands at 2 to 9 seats without losing or creating chips', () => {
    const rng = mulberry32(42);
    for (let h = 0; h < 3000; h++) {
      const n = 2 + (h % 8);
      const st = seats(...Array.from({ length: n }, () => 1 + Math.floor(rng() * 300)));
      const start = st.reduce((a, p) => a + p.stack, 0);
      let s = startHand({ seats: st, button: h % n, smallBlind: 1, bigBlind: 2, rng });
      let guard = 0;
      while (s.phase !== 'complete') {
        const l = legalActions(s)!;
        const r = rng();
        if (l.canRaise && r < 0.25) {
          const to = l.minTo + Math.floor(rng() * (l.maxTo - l.minTo + 1));
          s = act(s, l.raiseKind, to);
        } else if (l.canFold && r < 0.45) s = act(s, 'fold');
        else s = act(s, l.canCheck ? 'check' : 'call');
        if (s.phase !== 'complete') expect(totalChips(s)).toBe(start);
        if (++guard > 500) throw new Error('hand did not end');
      }
      const end = s.players.reduce((a, p) => a + p.stack, 0);
      expect(end).toBe(start);
      expect(s.players.every((p) => p.stack >= 0)).toBe(true);
    }
  });
});

describe('placeholder bots', () => {
  it('only make legal moves', async () => {
    const { botAction } = await import('../src');
    const rng = mulberry32(9);
    for (let h = 0; h < 400; h++) {
      const n = 2 + (h % 8);
      let s = startHand({ seats: seats(...Array.from({ length: n }, () => 200)), button: 0, smallBlind: 1, bigBlind: 2, rng });
      while (s.phase !== 'complete') s = applyAction(s, botAction(s, rng));
      expect(s.players.reduce((a, p) => a + p.stack, 0)).toBe(200 * n);
    }
  });
});
