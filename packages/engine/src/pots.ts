// Splitting chips into a main pot and side pots.
//
// Every player's total contribution for the hand is cut into layers at each all-in
// amount. A layer goes to the players who put chips into it and are still in the hand.

export interface Contribution {
  seat: number;
  amount: number;
  folded: boolean;
}

export interface Pot {
  amount: number;
  /** Seats that can win this pot (put chips into it and didn't fold). */
  eligible: number[];
  /** Each contributor's chips in this pot, for explanations. */
  from: { seat: number; amount: number }[];
}

export interface PotResult {
  pots: Pot[];
  /** Chips returned to a player because nobody matched them. */
  returned: { seat: number; amount: number } | null;
}

export function buildPots(contribs: Contribution[]): PotResult {
  const live = contribs.filter((c) => c.amount > 0);
  if (live.length === 0) return { pots: [], returned: null };

  // An uncalled bet (the part of the biggest contribution nobody else reached) goes back.
  const sorted = live.slice().sort((a, b) => b.amount - a.amount);
  let returned: PotResult['returned'] = null;
  const amounts = new Map(live.map((c) => [c.seat, c.amount]));
  const second = sorted[1]?.amount ?? 0;
  if (sorted[0].amount > second) {
    returned = { seat: sorted[0].seat, amount: sorted[0].amount - second };
    amounts.set(sorted[0].seat, second);
  }

  // Layer boundaries are the contribution levels of players still in the hand
  // (an all-in by a live player caps what they can win).
  const levels = [...new Set(live.filter((c) => !c.folded).map((c) => amounts.get(c.seat)!))]
    .filter((x) => x > 0)
    .sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const from: Pot['from'] = [];
    for (const c of live) {
      const amt = amounts.get(c.seat)!;
      const part = Math.min(amt, level) - prev;
      if (part > 0) from.push({ seat: c.seat, amount: part });
    }
    const amount = from.reduce((s, f) => s + f.amount, 0);
    const eligible = live.filter((c) => !c.folded && amounts.get(c.seat)! >= level).map((c) => c.seat);
    if (amount > 0) pots.push({ amount, eligible, from });
    prev = level;
  }
  // Chips folded players put in above the last live level (rare, e.g. a folded bigger stack
  // after an all-in) belong to the top pot.
  const leftover = live.reduce((s, c) => s + Math.max(0, amounts.get(c.seat)! - prev), 0);
  if (leftover > 0 && pots.length) {
    const top = pots[pots.length - 1];
    top.amount += leftover;
    for (const c of live) {
      const extra = amounts.get(c.seat)! - prev;
      if (extra > 0) {
        const f = top.from.find((x) => x.seat === c.seat);
        if (f) f.amount += extra; else top.from.push({ seat: c.seat, amount: extra });
      }
    }
  }

  // Merge neighbouring pots with the same eligible players (happens when a folded player's
  // level sits between live levels, or a live level only differs by folded money).
  const merged: Pot[] = [];
  for (const p of pots) {
    const last = merged[merged.length - 1];
    if (last && sameSet(last.eligible, p.eligible)) {
      last.amount += p.amount;
      for (const f of p.from) {
        const e = last.from.find((x) => x.seat === f.seat);
        if (e) e.amount += f.amount; else last.from.push({ ...f });
      }
    } else merged.push({ amount: p.amount, eligible: p.eligible.slice(), from: p.from.map((f) => ({ ...f })) });
  }
  return { pots: merged, returned };
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * Splits a pot among winners. Odd chips go one at a time to the winners closest to the
 * left of the button, which is the usual casino rule.
 */
export function splitPot(amount: number, winners: number[], seatOrderFromButton: number[]): Map<number, number> {
  const out = new Map<number, number>();
  const share = Math.floor(amount / winners.length);
  let odd = amount - share * winners.length;
  for (const w of winners) out.set(w, share);
  const ordered = seatOrderFromButton.filter((s) => winners.includes(s));
  for (const s of ordered) {
    if (odd <= 0) break;
    out.set(s, out.get(s)! + 1);
    odd--;
  }
  return out;
}
