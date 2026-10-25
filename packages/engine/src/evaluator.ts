import { type Card, rankOf, rankName, suitOf } from './cards';

export enum Category {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export const CATEGORY_NAME: Record<Category, string> = {
  [Category.HighCard]: 'High card',
  [Category.Pair]: 'Pair',
  [Category.TwoPair]: 'Two pair',
  [Category.ThreeOfAKind]: 'Three of a kind',
  [Category.Straight]: 'Straight',
  [Category.Flush]: 'Flush',
  [Category.FullHouse]: 'Full house',
  [Category.FourOfAKind]: 'Four of a kind',
  [Category.StraightFlush]: 'Straight flush',
};

export interface HandValue {
  category: Category;
  /** Ranks that break ties within the category, most important first. A wheel straight uses 5 as its top. */
  tiebreak: number[];
  /** Single comparable number: higher is better. Equal scores split the pot. */
  score: number;
  /** The best five cards, ordered so the important ones come first. */
  cards: Card[];
  /** Plain-language name, e.g. "Pair of Kings" or "Flush, Ace high". */
  name: string;
}

function encode(category: Category, tiebreak: number[]): number {
  let s = category;
  for (let i = 0; i < 5; i++) s = s * 15 + (tiebreak[i] ?? 0);
  return s;
}

/** Returns the top rank of a straight in these distinct ranks (descending), or 0. */
function straightTop(ranksDesc: number[]): number {
  const set = new Set(ranksDesc);
  for (let top = 14; top >= 5; top--) {
    let ok = true;
    for (let r = top; r > top - 5; r--) {
      const need = r === 1 ? 14 : r;
      if (!set.has(need)) { ok = false; break; }
    }
    if (ok) return top;
  }
  return 0;
}

function describe(category: Category, t: number[]): string {
  switch (category) {
    case Category.HighCard: return `High card, ${rankName(t[0])}`;
    case Category.Pair: return `Pair of ${rankName(t[0], true)}`;
    case Category.TwoPair: return `Two pair, ${rankName(t[0], true)} and ${rankName(t[1], true)}`;
    case Category.ThreeOfAKind: return `Three of a kind, ${rankName(t[0], true)}`;
    case Category.Straight: return `Straight, ${rankName(t[0])} high`;
    case Category.Flush: return `Flush, ${rankName(t[0])} high`;
    case Category.FullHouse: return `Full house, ${rankName(t[0], true)} full of ${rankName(t[1], true)}`;
    case Category.FourOfAKind: return `Four of a kind, ${rankName(t[0], true)}`;
    case Category.StraightFlush: return t[0] === 14 ? 'Royal flush' : `Straight flush, ${rankName(t[0])} high`;
  }
}

/** Evaluates exactly five cards. */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('evaluate5 needs 5 cards');
  const ranks = cards.map(rankOf);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Groups sorted by size, then by rank: e.g. full house KKK77 -> [[13,3],[7,2]].
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const distinctDesc = [...counts.keys()].sort((a, b) => b - a);
  const sTop = distinctDesc.length === 5 ? straightTop(distinctDesc) : 0;

  let category: Category;
  let tiebreak: number[];
  if (sTop && flush) { category = Category.StraightFlush; tiebreak = [sTop]; }
  else if (groups[0][1] === 4) { category = Category.FourOfAKind; tiebreak = [groups[0][0], groups[1][0]]; }
  else if (groups[0][1] === 3 && groups[1][1] === 2) { category = Category.FullHouse; tiebreak = [groups[0][0], groups[1][0]]; }
  else if (flush) { category = Category.Flush; tiebreak = distinctDesc; }
  else if (sTop) { category = Category.Straight; tiebreak = [sTop]; }
  else if (groups[0][1] === 3) { category = Category.ThreeOfAKind; tiebreak = groups.map((g) => g[0]); }
  else if (groups[0][1] === 2 && groups[1][1] === 2) { category = Category.TwoPair; tiebreak = groups.map((g) => g[0]); }
  else if (groups[0][1] === 2) { category = Category.Pair; tiebreak = groups.map((g) => g[0]); }
  else { category = Category.HighCard; tiebreak = distinctDesc; }

  // Order the cards for display: by group, then rank; a wheel shows 5-4-3-2-A.
  const order = (c: Card) => {
    const r = rankOf(c);
    if ((category === Category.Straight || category === Category.StraightFlush) && tiebreak[0] === 5 && r === 14) return -1;
    return (counts.get(r)! * 100) + r;
  };
  const sorted = cards.slice().sort((a, b) => order(b) - order(a));

  return { category, tiebreak, score: encode(category, tiebreak), cards: sorted, name: describe(category, tiebreak) };
}

/** Best five-card hand out of 5 to 7 cards. */
export function evaluate(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error(`evaluate needs 5-7 cards, got ${cards.length}`);
  if (new Set(cards).size !== cards.length) throw new Error(`Duplicate cards: ${cards.join(' ')}`);
  let best: HandValue | null = null;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const v = evaluate5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || v.score > best.score) best = v;
          }
  return best!;
}

export function compareHands(a: HandValue, b: HandValue): number {
  return a.score - b.score;
}

// --- Explaining a comparison in plain words ----------------------------------

const TIEBREAK_PARTS: Record<Category, string[]> = {
  [Category.HighCard]: ['highest card', 'second-highest card', 'third-highest card', 'fourth-highest card', 'fifth card'],
  [Category.Pair]: ['pair', 'kicker', 'second kicker', 'third kicker'],
  [Category.TwoPair]: ['top pair', 'second pair', 'kicker'],
  [Category.ThreeOfAKind]: ['three of a kind', 'kicker', 'second kicker'],
  [Category.Straight]: ['top card of the straight'],
  [Category.Flush]: ['highest flush card', 'second flush card', 'third flush card', 'fourth flush card', 'fifth flush card'],
  [Category.FullHouse]: ['three-of-a-kind part', 'pair part'],
  [Category.FourOfAKind]: ['four of a kind', 'kicker'],
  [Category.StraightFlush]: ['top card of the straight flush'],
};

const KICKER_INDEX_FROM: Partial<Record<Category, number>> = {
  [Category.Pair]: 1, [Category.TwoPair]: 2, [Category.ThreeOfAKind]: 1, [Category.FourOfAKind]: 1,
};

export interface ComparisonReason {
  /** Positive if a wins, negative if b wins, 0 for a split. */
  result: number;
  /** Plain sentence, e.g. "Both have a pair of Kings. The kicker decides: Ace beats Queen." */
  text: string;
  /** True when a kicker (side card) decided it. */
  kicker: boolean;
}

/** Explains why hand a beats, loses to, or ties with hand b, naming the deciding card. */
export function explainComparison(a: HandValue, b: HandValue, nameA = 'The first hand', nameB = 'the second hand'): ComparisonReason {
  if (a.category !== b.category) {
    const [w, l, wn, ln] = a.category > b.category ? [a, b, nameA, nameB] : [b, a, nameB, nameA];
    return {
      result: a.category - b.category,
      kicker: false,
      text: `${cap(wn)} ${hasVerb(wn)} ${article(CATEGORY_NAME[w.category])}, which beats ${possessive(ln)} ${CATEGORY_NAME[l.category].toLowerCase()}. Hand type is checked first.`,
    };
  }
  const parts = TIEBREAK_PARTS[a.category];
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const ra = a.tiebreak[i] ?? 0, rb = b.tiebreak[i] ?? 0;
    if (ra !== rb) {
      const [wn, w, l] = ra > rb ? [nameA, ra, rb] : [nameB, rb, ra];
      const isKicker = KICKER_INDEX_FROM[a.category] !== undefined && i >= KICKER_INDEX_FROM[a.category]!;
      const [wv, lv] = ra > rb ? [a, b] : [b, a];
      let same: string;
      let decider: string;
      if (i === 0) {
        same = `Both have ${article(CATEGORY_NAME[a.category])}.`;
        decider = `${cap(possessive(wn, true))} is higher: ${lowerFirst(wv.name)} beats ${lowerFirst(lv.name)}.`;
      } else {
        same = sharedPart(a.category, a.tiebreak, i);
        decider = `So the ${parts[i] ?? 'next card'} decides: ${rankName(w)} beats ${rankName(l)}.`;
      }
      const tail = i === 0 ? '' : ` ${cap(wn)} ${isYou(wn) ? 'win' : 'wins'}.`;
      return { result: ra - rb, kicker: isKicker, text: `${same} ${decider}${tail}` };
    }
  }
  return {
    result: 0,
    kicker: false,
    text: `Both have the same best five cards (${lowerFirst(a.name)}), so they split the pot. Only the best five cards count, so a sixth or seventh card can't break the tie.`,
  };
}

/** What two hands of the same type have in common before position i of the tiebreak. */
function sharedPart(cat: Category, t: number[], i: number): string {
  const r = (k: number, plural = true) => rankName(t[k], plural);
  switch (cat) {
    case Category.Pair: return `Both have a pair of ${r(0)}${i > 1 ? ` and the same ${i === 2 ? 'first kicker' : 'first two kickers'}` : ''}.`;
    case Category.TwoPair: return i === 1 ? `Both have two pair with ${r(0)} on top.` : `Both have two pair, ${r(0)} and ${r(1)}.`;
    case Category.ThreeOfAKind: return `Both have three ${r(0)}${i > 1 ? ' and the same first kicker' : ''}.`;
    case Category.FullHouse: return `Both have a full house with three ${r(0)}.`;
    case Category.FourOfAKind: return `Both have four ${r(0)}.`;
    default: {
      const same = t.slice(0, i).map((x) => rankName(x)).join(', ');
      return `Both have ${article(CATEGORY_NAME[cat])} and the same top card${i > 1 ? 's' : ''} (${same}).`;
    }
  }
}

// Explanations address the player as "You" on the practice table.
const isYou = (name: string) => name.toLowerCase() === 'you';
const hasVerb = (name: string) => (isYou(name) ? 'have' : 'has');
function possessive(name: string, standalone = false): string {
  if (isYou(name)) return standalone ? 'yours' : 'your';
  return `${name}'s`;
}

function article(phrase: string): string {
  const p = phrase.toLowerCase();
  if (p === 'two pair' || p === 'three of a kind' || p === 'four of a kind' || p === 'high card') return p;
  return (/^[aeiou]/.test(p) ? 'an ' : 'a ') + p;
}
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s: string): string {
  // Keep rank names capitalised ("pair of Kings").
  return s.charAt(0).toLowerCase() + s.slice(1);
}
