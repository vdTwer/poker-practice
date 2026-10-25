// Poker vocabulary, grouped by the stage that teaches each word.
// Assumes zero prior knowledge: definitions use only plain words or earlier terms.

export interface GlossaryEntry {
  term: string;
  stage: number;
  definition: string;
  example: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    "term": "Deck",
    "stage": 0,
    "definition": "The 52 cards used in the game: 13 ranks in each of 4 suits.",
    "example": "A new deck is shuffled before every hand."
  },
  {
    "term": "Suit",
    "stage": 0,
    "definition": "One of the four card families: spades ♠, hearts ♥, diamonds ♦, clubs ♣. Hearts and diamonds are red, spades and clubs are black. No suit beats another.",
    "example": "You need five cards of one suit for a flush, so look at the symbol, not just the colour."
  },
  {
    "term": "Rank",
    "stage": 0,
    "definition": "A card's value, from 2 (lowest) up to Ace (highest). T means ten.",
    "example": "A King outranks a Queen."
  },
  {
    "term": "Hole cards",
    "stage": 0,
    "definition": "The two private cards dealt face down to each player.",
    "example": "My hole cards were A♠ K♥."
  },
  {
    "term": "Board",
    "stage": 0,
    "definition": "The shared face-up cards in the middle that everyone can use. Also called community cards.",
    "example": "The board ran out K♥ 9♥ 2♣ J♠ 4♦."
  },
  {
    "term": "Preflop",
    "stage": 0,
    "definition": "The first betting round, after hole cards are dealt and before any board cards.",
    "example": "She raised preflop."
  },
  {
    "term": "Flop",
    "stage": 0,
    "definition": "The first three board cards, dealt together, and the betting round after them.",
    "example": "The flop came K♥ 9♥ 2♣."
  },
  {
    "term": "Turn",
    "stage": 0,
    "definition": "The fourth board card and the betting round after it.",
    "example": "The J♠ on the turn gave me a straight draw."
  },
  {
    "term": "River",
    "stage": 0,
    "definition": "The fifth and last board card and the final betting round.",
    "example": "I missed on the river and folded."
  },
  {
    "term": "Street",
    "stage": 0,
    "definition": "Any one of the four betting rounds: preflop, flop, turn, river.",
    "example": "He bet on every street."
  },
  {
    "term": "Showdown",
    "stage": 0,
    "definition": "When the betting is over and the remaining players show their cards to see who wins.",
    "example": "At showdown my flush beat his straight."
  },
  {
    "term": "Button",
    "stage": 0,
    "definition": "The marker showing the dealer seat. It moves one seat left each hand and acts last after the flop.",
    "example": "The button is the best seat at the table."
  },
  {
    "term": "Small blind",
    "stage": 0,
    "definition": "A forced half-size bet posted by the player left of the button before cards are dealt.",
    "example": "Small blind posts 1 chip."
  },
  {
    "term": "Big blind",
    "stage": 0,
    "definition": "A forced full-size bet posted two seats left of the button. It sets the minimum bet.",
    "example": "Big blind posts 2 chips."
  },
  {
    "term": "Blinds",
    "stage": 0,
    "definition": "The two forced bets together. They make sure there is always something to win.",
    "example": "The blinds are 1 and 2."
  },
  {
    "term": "Pot",
    "stage": 0,
    "definition": "All the chips bet so far in the hand. The winner takes it.",
    "example": "The pot is 60 chips."
  },
  {
    "term": "Stack",
    "stage": 0,
    "definition": "The chips a player has in front of them.",
    "example": "I have a 200-chip stack."
  },
  {
    "term": "Check",
    "stage": 0,
    "definition": "Pass without betting. Only allowed if no one has bet yet this round.",
    "example": "Everyone checked on the flop."
  },
  {
    "term": "Bet",
    "stage": 0,
    "definition": "Put chips in when no one else has this round.",
    "example": "I bet 20 into a 60 pot."
  },
  {
    "term": "Call",
    "stage": 0,
    "definition": "Match the current bet to stay in the hand.",
    "example": "He bet 20 and I called."
  },
  {
    "term": "Raise",
    "stage": 0,
    "definition": "Put in more than the current bet, so others must pay more to continue.",
    "example": "She bet 20 and I raised to 60."
  },
  {
    "term": "Fold",
    "stage": 0,
    "definition": "Give up your cards and any chance at the pot.",
    "example": "Facing a big raise, I folded."
  },
  {
    "term": "All-in",
    "stage": 0,
    "definition": "Bet every chip you have left.",
    "example": "He moved all-in for 180."
  },
  {
    "term": "No-Limit",
    "stage": 0,
    "definition": "The betting rule where you may bet any amount up to your whole stack at any time.",
    "example": "In No-Limit, one hand can cost your whole stack."
  },
  {
    "term": "Side pot",
    "stage": 0,
    "definition": "A separate pot created when a player is all-in and others keep betting. The all-in player can't win it.",
    "example": "The short stack won the main pot, I won the side pot."
  },
  {
    "term": "Split pot",
    "stage": 0,
    "definition": "When two or more players have equally good hands and share the pot. Also called a chop.",
    "example": "We both had the straight, so we split the pot."
  },
  {
    "term": "Kicker",
    "stage": 0,
    "definition": "A side card that breaks ties between hands of the same type.",
    "example": "We both had a pair of Aces, but my King kicker won."
  },
  {
    "term": "Heads-up",
    "stage": 0,
    "definition": "Only two players, either at the table or left in a hand.",
    "example": "It's heads-up to the river."
  },
  {
    "term": "Muck",
    "stage": 0,
    "definition": "The pile of folded cards, or to throw your hand away without showing it.",
    "example": "He mucked his hand at showdown."
  },
  {
    "term": "High card",
    "stage": 0,
    "definition": "The weakest hand: no pair or better, so the highest card counts.",
    "example": "Ace-high didn't win."
  },
  {
    "term": "Pair",
    "stage": 0,
    "definition": "Two cards of the same rank.",
    "example": "I paired my King on the flop."
  },
  {
    "term": "Two pair",
    "stage": 0,
    "definition": "Two different pairs.",
    "example": "Kings and nines: two pair."
  },
  {
    "term": "Three of a kind",
    "stage": 0,
    "definition": "Three cards of the same rank.",
    "example": "Three fives."
  },
  {
    "term": "Straight",
    "stage": 0,
    "definition": "Five cards in a row of any suits. A-2-3-4-5 and 10-J-Q-K-A both count.",
    "example": "8-9-10-J-Q is a straight."
  },
  {
    "term": "Flush",
    "stage": 0,
    "definition": "Five cards of the same suit.",
    "example": "Five hearts make a flush."
  },
  {
    "term": "Full house",
    "stage": 0,
    "definition": "Three of a kind plus a pair.",
    "example": "Three Kings and two nines: Kings full of nines."
  },
  {
    "term": "Four of a kind",
    "stage": 0,
    "definition": "All four cards of one rank. Also called quads.",
    "example": "Four Jacks."
  },
  {
    "term": "Straight flush",
    "stage": 0,
    "definition": "A straight with all five cards in the same suit. The best possible hand type; the Ace-high one is the royal flush.",
    "example": "5♥ 6♥ 7♥ 8♥ 9♥."
  },
  {
    "term": "Nuts",
    "stage": 1,
    "definition": "The best possible hand on the current board.",
    "example": "With no pair or flush possible on the board, the Ace-high straight is the nuts."
  },
  {
    "term": "Made hand",
    "stage": 1,
    "definition": "A hand that is already a pair or better.",
    "example": "Top pair is a made hand."
  },
  {
    "term": "Draw",
    "stage": 1,
    "definition": "A hand that is not good yet but can improve to a strong hand with the right card.",
    "example": "Four hearts is a flush draw."
  },
  {
    "term": "Outs",
    "stage": 1,
    "definition": "The unseen cards that would improve your hand to the likely winner.",
    "example": "A flush draw has 9 outs."
  },
  {
    "term": "Open-ender",
    "stage": 1,
    "definition": "An open-ended straight draw: four in a row that can complete at either end. 8 outs.",
    "example": "9-8 on a 7-6 board is an open-ender."
  },
  {
    "term": "Gutshot",
    "stage": 1,
    "definition": "A straight draw missing one card in the middle. 4 outs.",
    "example": "J-T on 8-7 needs a 9: a gutshot."
  },
  {
    "term": "Overcards",
    "stage": 1,
    "definition": "Hole cards higher than every card on the board.",
    "example": "A-K on a 9-6-2 flop has two overcards."
  },
  {
    "term": "Board texture",
    "stage": 1,
    "definition": "How connected, suited or paired the board is. It decides which hands and draws are possible.",
    "example": "A rainbow K-7-2 has a dry texture."
  },
  {
    "term": "Wet board",
    "stage": 1,
    "definition": "A board with many possible straights and flushes.",
    "example": "J♥ T♥ 9♣ is very wet."
  },
  {
    "term": "Dry board",
    "stage": 1,
    "definition": "A board with few possible draws.",
    "example": "K♠ 7♦ 2♣ is dry."
  },
  {
    "term": "Rainbow",
    "stage": 1,
    "definition": "A flop with three different suits, so no flush draw is possible yet.",
    "example": "The flop came rainbow."
  },
  {
    "term": "Set",
    "stage": 1,
    "definition": "Three of a kind made with a pocket pair plus one board card. Very well hidden.",
    "example": "My 5-5 hit a set on a 5-K-9 flop."
  },
  {
    "term": "Trips",
    "stage": 1,
    "definition": "Three of a kind made with one hole card and a pair on the board.",
    "example": "I hold K-Q on a K-K-4 board: trips."
  },
  {
    "term": "Position",
    "stage": 2,
    "definition": "Where you sit relative to the button, which decides when you act. Acting later is an advantage.",
    "example": "I have position on him after the flop."
  },
  {
    "term": "In position",
    "stage": 2,
    "definition": "Acting after your opponent on the flop, turn and river.",
    "example": "Playing in position makes decisions easier."
  },
  {
    "term": "Under the gun",
    "stage": 2,
    "definition": "The first seat to act preflop, left of the big blind. Short: UTG.",
    "example": "Under the gun, open only strong hands."
  },
  {
    "term": "Hijack",
    "stage": 2,
    "definition": "Two seats right of the button.",
    "example": "The hijack opened to 2.5 big blinds."
  },
  {
    "term": "Cutoff",
    "stage": 2,
    "definition": "The seat just right of the button.",
    "example": "The cutoff is the second-best seat."
  },
  {
    "term": "Open",
    "stage": 2,
    "definition": "Be the first player to raise preflop.",
    "example": "I opened the button with K-9 suited."
  },
  {
    "term": "Limp",
    "stage": 2,
    "definition": "Just call the big blind preflop instead of raising. Usually a weak play.",
    "example": "Two players limped in."
  },
  {
    "term": "Suited",
    "stage": 2,
    "definition": "Two hole cards of the same suit. Written with an s, like AKs.",
    "example": "J-T suited can make flushes."
  },
  {
    "term": "Offsuit",
    "stage": 2,
    "definition": "Two hole cards of different suits. Written with an o, like AKo.",
    "example": "K-9 offsuit is a fold under the gun."
  },
  {
    "term": "Pocket pair",
    "stage": 2,
    "definition": "Two hole cards of the same rank.",
    "example": "Pocket sevens."
  },
  {
    "term": "Suited connectors",
    "stage": 2,
    "definition": "Suited hole cards next to each other in rank.",
    "example": "7♥ 6♥ is a suited connector."
  },
  {
    "term": "Range",
    "stage": 2,
    "definition": "The whole set of hands a player could have in a spot. You think about ranges because you never know exact cards.",
    "example": "Her opening range from the button is wide."
  },
  {
    "term": "Big blinds (bb)",
    "stage": 2,
    "definition": "Bets and stacks measured in big blinds, so advice works at any stakes.",
    "example": "Open to 2.5bb; we both have 100bb."
  },
  {
    "term": "Pot odds",
    "stage": 3,
    "definition": "The price of a call: what you pay compared to what you can win.",
    "example": "Calling 30 to win 90 gives 3-to-1 pot odds."
  },
  {
    "term": "Equity",
    "stage": 3,
    "definition": "Your share of the pot if all cards were dealt out, as a percentage chance to win.",
    "example": "My flush draw has about 20% equity on the turn."
  },
  {
    "term": "Expected value (EV)",
    "stage": 3,
    "definition": "The average result of a decision if you made it many times. Positive is profitable.",
    "example": "This call is +4 chips EV."
  },
  {
    "term": "Break-even",
    "stage": 3,
    "definition": "The point where a call neither wins nor loses on average.",
    "example": "I need 25% to break even."
  },
  {
    "term": "Rule of 2 and 4",
    "stage": 3,
    "definition": "Quick estimate of equity: outs × 2 with one card to come, outs × 4 with two.",
    "example": "9 outs on the flop: about 36%."
  },
  {
    "term": "Implied odds",
    "stage": 3,
    "definition": "Extra chips you expect to win on later streets when you hit.",
    "example": "Small pairs need implied odds to call."
  },
  {
    "term": "3-bet",
    "stage": 4,
    "definition": "The first re-raise preflop (the blinds count as the first bet, the open as the second).",
    "example": "Button opens, big blind 3-bets."
  },
  {
    "term": "4-bet",
    "stage": 4,
    "definition": "A re-raise of a 3-bet.",
    "example": "He 4-bet with Aces."
  },
  {
    "term": "Cold call",
    "stage": 4,
    "definition": "Call a raise when you have not put any chips in yet this round.",
    "example": "The cutoff cold-called the open."
  },
  {
    "term": "Squeeze",
    "stage": 4,
    "definition": "A 3-bet after one player opened and another called.",
    "example": "With an open and a call in front, I squeezed."
  },
  {
    "term": "Defend",
    "stage": 4,
    "definition": "Call or re-raise from the blinds instead of folding to a steal.",
    "example": "The big blind defends wide."
  },
  {
    "term": "C-bet",
    "stage": 5,
    "definition": "Continuation bet: the preflop raiser bets again on the flop.",
    "example": "I opened and c-bet the flop."
  },
  {
    "term": "Value bet",
    "stage": 5,
    "definition": "A bet made hoping to be called by worse hands.",
    "example": "Top pair, good kicker: bet for value."
  },
  {
    "term": "Bluff",
    "stage": 5,
    "definition": "A bet with a weak hand, hoping better hands fold.",
    "example": "I bluffed the river with a missed draw."
  },
  {
    "term": "Semi-bluff",
    "stage": 5,
    "definition": "A bet with a draw: it can win now if they fold, or later if you hit.",
    "example": "Betting my flush draw is a semi-bluff."
  },
  {
    "term": "Range advantage",
    "stage": 5,
    "definition": "When a board helps one player's range more than the other's.",
    "example": "A-K-x flops favour the preflop raiser."
  },
  {
    "term": "Donk bet",
    "stage": 5,
    "definition": "Leading out into the preflop raiser instead of checking to them.",
    "example": "The big blind donk-bet the flop."
  },
  {
    "term": "SPR",
    "stage": 6,
    "definition": "Stack-to-pot ratio: the stack size divided by the pot on the flop. Low SPR makes it easier to commit.",
    "example": "With 60 behind and a 20 pot, SPR is 3."
  },
  {
    "term": "Barrel",
    "stage": 6,
    "definition": "Bet again on the next street after betting before.",
    "example": "He double-barrelled the flop and turn."
  },
  {
    "term": "Check-raise",
    "stage": 6,
    "definition": "Check, then raise after an opponent bets.",
    "example": "I check-raised with a set."
  },
  {
    "term": "Overbet",
    "stage": 6,
    "definition": "A bet bigger than the pot.",
    "example": "She overbet the river."
  },
  {
    "term": "Bluff catcher",
    "stage": 6,
    "definition": "A hand that beats only bluffs. You call to catch them.",
    "example": "Second pair on the river is a bluff catcher."
  },
  {
    "term": "Thin value",
    "stage": 6,
    "definition": "A value bet with a hand that is only slightly ahead of the hands that call.",
    "example": "Betting middle pair on a safe river is thin value."
  },
  {
    "term": "MDF",
    "stage": 6,
    "definition": "Minimum defence frequency: how often you must continue so an opponent can't profit by bluffing with any two cards.",
    "example": "Facing a pot-size bet, MDF is 50%."
  },
  {
    "term": "Pot control",
    "stage": 6,
    "definition": "Checking a medium hand to keep the pot small.",
    "example": "Checking the turn with one pair for pot control."
  },
  {
    "term": "VPIP",
    "stage": 7,
    "definition": "Voluntarily put money in pot: how often a player plays a hand preflop.",
    "example": "A VPIP of 45% is very loose."
  },
  {
    "term": "PFR",
    "stage": 7,
    "definition": "Preflop raise: how often a player raises preflop.",
    "example": "VPIP 22, PFR 18 is a solid player."
  },
  {
    "term": "Tight",
    "stage": 7,
    "definition": "Plays few hands.",
    "example": "She's tight; fold to her raises."
  },
  {
    "term": "Loose",
    "stage": 7,
    "definition": "Plays many hands.",
    "example": "He's loose and calls too much."
  },
  {
    "term": "Passive",
    "stage": 7,
    "definition": "Calls and checks more than bets and raises.",
    "example": "Passive players rarely bluff."
  },
  {
    "term": "Aggressive",
    "stage": 7,
    "definition": "Bets and raises more than calls.",
    "example": "Aggressive play wins more pots."
  },
  {
    "term": "Nit",
    "stage": 7,
    "definition": "A very tight, cautious player.",
    "example": "The nit only plays premium hands."
  },
  {
    "term": "Calling station",
    "stage": 7,
    "definition": "A player who calls too often and rarely folds. Don't bluff them; value bet.",
    "example": "Bet big against the calling station."
  },
  {
    "term": "Maniac",
    "stage": 7,
    "definition": "A player who bets and raises with almost anything.",
    "example": "Let the maniac bluff into you."
  },
  {
    "term": "TAG",
    "stage": 7,
    "definition": "Tight-aggressive: few hands, played aggressively. The classic solid style.",
    "example": "Most winning beginners play TAG."
  },
  {
    "term": "LAG",
    "stage": 7,
    "definition": "Loose-aggressive: many hands, played aggressively.",
    "example": "The LAG raises every button."
  },
  {
    "term": "Exploit",
    "stage": 7,
    "definition": "Change your strategy to profit from an opponent's specific mistake.",
    "example": "Exploit the nit by stealing his blinds."
  },
  {
    "term": "GTO",
    "stage": 7,
    "definition": "Game theory optimal: a balanced strategy that can't be exploited. A baseline to adjust from.",
    "example": "The solver's GTO play here is a small bet."
  },
  {
    "term": "Multiway",
    "stage": 7,
    "definition": "A pot with three or more players.",
    "example": "Bluff less in multiway pots."
  },
  {
    "term": "Tell",
    "stage": 7,
    "definition": "A habit that hints at a player's hand, like timing or bet size.",
    "example": "He always bets fast with draws."
  },
  {
    "term": "Tilt",
    "stage": 8,
    "definition": "Playing worse because of frustration or emotion.",
    "example": "After that bad beat I was on tilt."
  },
  {
    "term": "Variance",
    "stage": 8,
    "definition": "Short-term luck. Results swing even when decisions are good.",
    "example": "Variance makes 1,000 hands a tiny sample."
  },
  {
    "term": "Bad beat",
    "stage": 8,
    "definition": "Losing a hand you were a big favourite to win.",
    "example": "My Aces lost to a river flush: a bad beat."
  },
  {
    "term": "Downswing",
    "stage": 8,
    "definition": "A stretch of losing caused largely by variance.",
    "example": "Even winners have 20 buy-in downswings."
  },
  {
    "term": "Bankroll",
    "stage": 8,
    "definition": "The money set aside only for poker.",
    "example": "Keep at least 30 buy-ins in your bankroll."
  },
  {
    "term": "Buy-in",
    "stage": 8,
    "definition": "The chips you start with at a table, usually 100 big blinds.",
    "example": "I rebought for another buy-in."
  },
  {
    "term": "Results-oriented",
    "stage": 8,
    "definition": "Judging a decision by how the hand ended instead of whether it was right.",
    "example": "Calling was correct; don't be results-oriented."
  }
];

export const STAGE_TITLES = [
  'Cards, table words and rules',
  'Reading the board',
  'Position and opening hands',
  'Pot odds and equity',
  'Facing raises',
  'The flop',
  'Turn and river',
  'Reading players',
  'Mental game',
];

const byKey = new Map<string, GlossaryEntry>();
for (const e of GLOSSARY) byKey.set(e.term.toLowerCase(), e);

/** Looks up a term by name, ignoring case and a trailing plural "s". */
export function lookup(term: string): GlossaryEntry | undefined {
  const k = term.toLowerCase();
  return byKey.get(k) ?? byKey.get(k.replace(/s$/, '')) ?? byKey.get(k.replace(/es$/, ''));
}
