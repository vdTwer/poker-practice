import { useMemo, useState, type ReactNode } from 'react';
import { startHand, applyAction, parseCards, type HandState, type PlayerAction } from '@poker/engine';
import { PokerTable, type Target } from '../components/Table';
import { CardRow } from '../components/PlayingCard';
import { T } from '../components/Term';
import { seatsFromHand, middlePot } from '../lib/handview';
import { creditWord, completeLesson } from '../lib/storage';
import { LessonComplete } from '../components/Lesson';
import { href } from '../lib/router';

// One scripted hand, dealt in slow motion. The engine plays it for real, so every number
// on the table (blinds, pot, stacks) is exactly what the rules produce.

const NAMES = ['You', 'Alex', 'Bea', 'Chen'];
const BUTTON = 1;

const ACTIONS: PlayerAction[] = [
  { type: 'raise', to: 6 }, // You (under the gun)
  { type: 'call' },         // Alex (button)
  { type: 'fold' },         // Bea (small blind)
  { type: 'call' },         // Chen (big blind)
  { type: 'check' },        // flop: Chen
  { type: 'bet', to: 10 },  // You
  { type: 'call' },         // Alex
  { type: 'fold' },         // Chen
  { type: 'bet', to: 25 },  // turn: You
  { type: 'call' },         // Alex
  { type: 'bet', to: 40 },  // river: You
  { type: 'call' },         // Alex
];

function buildStates(): HandState[] {
  let s = startHand({
    seats: NAMES.map((name, i) => ({ id: `s${i}`, name, stack: 100 })),
    button: BUTTON,
    smallBlind: 1,
    bigBlind: 2,
    preset: {
      hole: [parseCards('Kh Qh'), parseCards('9c 9d'), parseCards('7s 2d'), parseCards('Ac 5c')],
      board: parseCards('Kc 8h 4d Qc 2s'),
    },
  });
  const out = [s];
  for (const a of ACTIONS) { s = applyAction(s, a); out.push(s); }
  return out;
}

type View = 'empty' | 'blinds' | number;

interface Question {
  prompt: string;
  options: string[];
  answer: number;
  right: string;
  wrong: string;
  credit: string[];
}

interface Step {
  view: View;
  text: ReactNode;
  highlight?: Target;
  callout?: string;
  words?: string[];
  question?: Question;
  showdown?: boolean;
  /** Show fewer board cards than the state has (the narration hasn't reached them yet). */
  boardCount?: number;
}

const STEPS: Step[] = [
  {
    view: 'empty', highlight: 'seat:0', callout: 'You',
    text: <>This is a poker table. Four players sit around it: you at the bottom, then Alex, Bea and Chen. Everyone tries to win the chips in the middle. Tap <b>Next</b> to deal a whole hand slowly.</>,
  },
  {
    view: 'empty', highlight: 'stack:0', callout: 'Stack', words: ['Stack'],
    text: <>The number under each name is that player's <T k="stack" plain="the chips they have" />. Everyone starts with 100 chips.</>,
  },
  {
    view: 'empty', highlight: 'button', callout: 'Button', words: ['Button'],
    text: <>The white disc marked D is the <T k="button" plain="the dealer's marker" />. Alex has it this hand. It moves one seat to the left after every hand, and it decides who has to act first.</>,
  },
  {
    view: 'empty', highlight: 'seat:2', words: ['Small blind', 'Big blind', 'Blinds'],
    text: <>Before any cards are dealt, the two players to the left of the button must put in forced bets called <T k="blinds" plain="forced bets so there is always something to win" />. The first one, the <T k="small blind" />, is half the size of the second, the <T k="big blind" />.</>,
    question: {
      prompt: 'Who has to pay the small blind?',
      options: ['Bea', 'Chen', 'You'],
      answer: 0,
      right: 'Right. Bea sits directly left of the button, so she pays the small blind.',
      wrong: 'Not quite. The small blind is the first seat to the left of the button, and Alex has the button, so it is Bea.',
      credit: ['small blind', 'button'],
    },
  },
  {
    view: 'blinds', highlight: 'bet:3', callout: 'Big blind',
    text: <>Bea puts in the small blind of 1 chip and Chen puts in the big blind of 2. Their chips sit in front of them until the betting round ends.</>,
  },
  {
    view: 0, highlight: 'hole:0', callout: 'Your hole cards', words: ['Deck', 'Suit', 'Rank', 'Hole cards'],
    text: <>The dealer shuffles the <T k="deck" plain="52 cards" /> and gives everyone two cards face down: their <T k="hole cards" plain="private cards" />. Only you can see yours: the King and Queen of hearts. Each card has a <T k="rank" plain="its value, 2 up to Ace" /> and a <T k="suit" plain="♠ ♥ ♦ ♣" />. Hearts and diamonds are red, spades and clubs are black.</>,
  },
  {
    view: 0, highlight: 'seat:0', words: ['Preflop', 'Fold', 'Call', 'Raise', 'Street'],
    text: <>Now the first betting round, called <T k="preflop" plain="before any shared cards" />. It starts with the player to the left of the big blind, and that's you. You can <T k="fold" plain="give up your cards" />, <T k="call" plain="match the 2-chip bet" /> or <T k="raise" plain="put in more than the current bet" />.</>,
    question: {
      prompt: 'King-Queen is a strong start. Which move puts in more than the current bet?',
      options: ['Fold', 'Call', 'Raise'],
      answer: 2,
      right: 'Right. You raise to 6 chips. Now everyone else has to pay 6 to stay in.',
      wrong: 'That\'s not it. Folding gives up, calling matches the bet. Raising puts in more. You raise to 6 chips.',
      credit: ['raise', 'call', 'fold'],
    },
  },
  {
    view: 3, highlight: 'seat:2', words: ['Muck'],
    text: <>You raised to 6. Alex calls 6. Bea doesn't like her 7 and 2, so she folds and her cards go to the <T k="muck" plain="the pile of folded cards" />. She loses the 1 chip she already put in.</>,
  },
  {
    view: 4, boardCount: 0, highlight: 'pot', callout: 'Pot', words: ['Pot'],
    text: <>Chen already has 2 chips in, so he calls by adding 4 more. Everyone left has put in the same amount, so the betting round ends and all bets slide into the <T k="pot" plain="the chips everyone is playing for" />: 6 + 6 + 6 + Bea's 1 = 19.</>,
  },
  {
    view: 4, highlight: 'flop', callout: 'Flop', words: ['Flop', 'Board', 'Pair'],
    text: <>The dealer turns over three cards at once: the <T k="flop" plain="the first three shared cards" />. These are part of the <T k="board" plain="shared cards everyone can use" />. You have a King and there's a King on the board, so you now have a <T k="pair" /> of Kings.</>,
  },
  {
    view: 5, highlight: 'seat:3', words: ['Check'],
    text: <>After the flop, the first player still in the hand to the left of the button acts first. Bea folded, so it's Chen. He <T k="check">checks</T> <span className="term-plain">(passes without betting)</span>. Checking is only allowed when nobody has bet yet in this round.</>,
    question: {
      prompt: 'Chen checked. It\'s your turn and nobody has bet. What can you NOT do?',
      options: ['Check', 'Bet', 'Call'],
      answer: 2,
      right: 'Right. There\'s no bet to match, so there\'s nothing to call. You can check or bet.',
      wrong: 'You can do that one. You can\'t call, because nobody has bet, so there\'s nothing to match.',
      credit: ['check', 'call', 'bet'],
    },
  },
  {
    view: 8, boardCount: 3, highlight: 'seat:1', words: ['Bet'],
    text: <>You <T k="bet" plain="put chips in when nobody else has" /> 10. Alex calls 10. Chen folds. Now only you and Alex are left, and the pot is 19 + 10 + 10 = 39.</>,
  },
  {
    view: 8, highlight: 'turn', callout: 'Turn', words: ['Turn', 'Two pair'],
    text: <>The fourth board card is the <T k="turn" />: the Queen of clubs. Now your King and Queen both pair the board, so you have <T k="two pair" />, Kings and Queens.</>,
  },
  {
    view: 10, highlight: 'river', callout: 'River', words: ['River'],
    text: <>You bet 25 and Alex calls. The fifth and last card is the <T k="river" />: the 2 of spades. No more cards are coming, so nobody's hand can change now.</>,
  },
  {
    view: 12, showdown: true, highlight: 'seat:1', words: ['Showdown', 'Kicker'],
    text: <>You bet 40 and Alex calls. The betting is over, so both players show their cards: the <T k="showdown" />. Everyone makes the best five cards from their two hole cards plus the five on the board.</>,
  },
  {
    view: 12, showdown: true, highlight: 'pot', callout: 'You win',
    text: <>Your best five are K K Q Q 8: two pair. The 8 is your <T k="kicker" plain="the side card that breaks ties" />. Alex has a pair of Nines. Two pair beats one pair, so you win the whole pot of 169 chips.</>,
  },
];

export function FirstHand() {
  const states = useMemo(buildStates, []);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const blocked = !!step.question && picked === null;

  const state = typeof step.view === 'number' ? states[step.view] : states[0];
  const seats = seatsFromHand(state, {
    hideCards: step.view === 'empty' || step.view === 'blinds',
    hideBets: step.view === 'empty',
    reveal: (seat) => seat === 0 || (!!step.showdown && seat === 1),
  });
  if (step.view === 'empty' || step.view === 'blinds') {
    for (const s of seats) { s.note = undefined; s.toAct = false; }
    if (step.view === 'empty') seats.forEach((s) => { s.stack = 100; });
  }
  const pot = typeof step.view === 'number' ? middlePot(state) : 0;
  const final = states[states.length - 1];

  const go = (d: number) => {
    setPicked(null);
    setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d)));
  };

  const answer = (k: number) => {
    if (picked !== null || !step.question) return;
    setPicked(k);
    if (k === step.question.answer) step.question.credit.forEach((w) => creditWord(w));
  };

  return (
    <div className="wrap lesson">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage 0 · lesson</a>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Your first hand, slowly</h1>
      </div>

      {finished ? <LessonComplete lesson="first-hand" onRetake={() => { setFinished(false); setPicked(null); setI(0); }} /> : (
      <div className="lesson-grid">
      <PokerTable
        seats={seats}
        heroIndex={0}
        button={BUTTON}
        board={typeof step.view === 'number' ? state.board.slice(0, step.boardCount ?? 5) : []}
        pot={pot}
        highlight={step.highlight}
        callout={step.callout}
        hidePositions={i < 6}
      />

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">Step {i + 1} of {STEPS.length}</span>
          <div className="progress-dots" aria-hidden="true">
            {STEPS.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}
          </div>
        </div>
        <p className="lesson-text">{step.text}</p>

        {step.showdown && (
          <div className="stack-sm">
            {[0, 1].map((seat) => {
              const v = final.result!.hands[seat];
              return (
                <div key={seat} className={'hand-row' + (final.result!.awards[0].winners.includes(seat) ? ' correct' : '')}>
                  <span className="who">{NAMES[seat]}</span>
                  <CardRow cards={v.cards} size="sm" />
                  <span>{v.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {step.question && (
          <div className="stack-sm">
            <b>{step.question.prompt}</b>
            <div className="row">
              {step.question.options.map((o, k) => (
                <button
                  key={o}
                  className={'btn choice' + (picked !== null && k === step.question!.answer ? ' correct' : '') + (picked === k && k !== step.question!.answer ? ' wrong' : '')}
                  onClick={() => answer(k)}
                  disabled={picked !== null && picked !== k && k !== step.question!.answer}
                >
                  {o}
                </button>
              ))}
            </div>
            {picked !== null && (
              <p className={picked === step.question.answer ? '' : 'muted'} style={{ color: picked === step.question.answer ? 'var(--good)' : undefined }}>
                {picked === step.question.answer ? step.question.right : step.question.wrong}
              </p>
            )}
          </div>
        )}

        {step.words && (
          <div className="new-words">
            <span className="eyebrow">New words</span>
            {step.words.map((w) => <span key={w} className="word-chip"><T k={w} /></span>)}
          </div>
        )}

        <div className="lesson-controls">
          <button className="btn" onClick={() => go(-1)} disabled={i === 0}>← Back</button>
          {!last && <button className="btn primary" onClick={() => go(1)} disabled={blocked}>{blocked ? 'Answer to continue' : 'Next →'}</button>}
          {last && (
            <>
              <button className="btn primary" onClick={() => { completeLesson('first-hand'); setFinished(true); }}>Finish the lesson</button>
              <button className="btn ghost" onClick={() => { setPicked(null); setI(0); }}>Watch again</button>
            </>
          )}
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
