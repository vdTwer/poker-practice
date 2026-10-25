// Cards are two-character strings such as "As" (ace of spades) or "Td" (ten of diamonds).
// Rank characters: 2-9, T, J, Q, K, A. Suit characters: s, h, d, c.

export type Suit = 's' | 'h' | 'd' | 'c';
export type Card = string;

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME: Record<Suit, string> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

/** Two-colour deck, like real cards: hearts and diamonds are red, spades and clubs black. */
export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === 'h' || suit === 'd' ? 'red' : 'black';
}

/** Numeric rank, 2..14 (ace high). */
export function rankOf(card: Card): number {
  const i = RANKS.indexOf(card[0] as (typeof RANKS)[number]);
  if (i < 0) throw new Error(`Bad card: ${card}`);
  return i + 2;
}

export function suitOf(card: Card): Suit {
  const s = card[1] as Suit;
  if (!SUITS.includes(s)) throw new Error(`Bad card: ${card}`);
  return s;
}

export function rankChar(rank: number): string {
  return RANKS[rank - 2];
}

const RANK_WORD: Record<number, [string, string]> = {
  2: ['Two', 'Twos'], 3: ['Three', 'Threes'], 4: ['Four', 'Fours'], 5: ['Five', 'Fives'],
  6: ['Six', 'Sixes'], 7: ['Seven', 'Sevens'], 8: ['Eight', 'Eights'], 9: ['Nine', 'Nines'],
  10: ['Ten', 'Tens'], 11: ['Jack', 'Jacks'], 12: ['Queen', 'Queens'], 13: ['King', 'Kings'], 14: ['Ace', 'Aces'],
};

export function rankName(rank: number, plural = false): string {
  // A 1 shows up as the low ace in a wheel straight (A-2-3-4-5).
  const r = rank === 1 ? 14 : rank;
  return RANK_WORD[r][plural ? 1 : 0];
}

export function cardName(card: Card): string {
  return `${rankName(rankOf(card))} of ${SUIT_NAME[suitOf(card)]}`;
}

/** Short label for display, e.g. "10♥". */
export function cardLabel(card: Card): string {
  const r = card[0] === 'T' ? '10' : card[0];
  return r + SUIT_SYMBOL[suitOf(card)];
}

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  return deck;
}

export function parseCards(text: string): Card[] {
  const t = text.replace(/\s+/g, '');
  if (t.length % 2 !== 0) throw new Error(`Bad card list: ${text}`);
  const out: Card[] = [];
  for (let i = 0; i < t.length; i += 2) {
    const c = t[i].toUpperCase() + t[i + 1].toLowerCase();
    rankOf(c);
    suitOf(c);
    out.push(c);
  }
  return out;
}

// --- Randomness -----------------------------------------------------------
// A small seedable generator so hands and drills can be replayed and tested.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffledDeck(rng: Rng, exclude: readonly Card[] = []): Card[] {
  return shuffle(fullDeck().filter((c) => !exclude.includes(c)), rng);
}
