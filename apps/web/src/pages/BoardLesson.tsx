import { parseCards, type Card } from '@poker/engine';
import { PlayingCard } from '../components/PlayingCard';
import { StepLesson, type Step } from '../components/Lesson';
import { T } from '../components/Term';

function Felt({ hole, board, glow = [], note }: { hole?: string; board: string; glow?: Card[]; note?: string }) {
  const b = parseCards(board);
  return (
    <div className="felt-strip row" style={{ gap: 28, alignItems: 'flex-start' }}>
      {hole && (
        <div>
          <div className="label">Your hand</div>
          <div className="cards">{parseCards(hole).map((c) => <PlayingCard key={c} card={c} size="lg" state={glow.includes(c) ? 'glow' : null} />)}</div>
        </div>
      )}
      <div>
        <div className="label">Board</div>
        <div className="cards">
          {b.map((c) => <PlayingCard key={c} card={c} size="lg" state={glow.includes(c) ? 'glow' : null} />)}
          {Array.from({ length: 5 - b.length }, (_, i) => <PlayingCard key={i} slot size="lg" />)}
        </div>
      </div>
      {note && <div className="label" style={{ alignSelf: 'flex-end' }}>{note}</div>}
    </div>
  );
}

const STEPS: Step[] = [
  {
    visual: <Felt board="Ks Qs 7d 4s 2c" glow={parseCards('Ks Qs 4s')} />,
    text: <>
      <p>Before you think about your own cards, look at what the <T k="board" /> makes possible.</p>
      <p>The best possible hand right now is called the <T k="nuts" plain="the best possible hand on this board" />. Here three spades are on the board, so anyone with two more spades has a flush. No pair on the board means no full house, and no three cards fit in a straight with a straight flush.</p>
    </>,
    question: {
      prompt: 'What is the nuts on this board?',
      options: ['Three Kings', 'A flush with the Ace of spades', 'A straight'],
      answer: 1,
      explain: 'A flush beats three of a kind, and the Ace of spades makes the highest flush.',
      words: ['nuts'],
    },
  },
  {
    visual: <Felt hole="Jh Th" board="Qh 9c 3h" />,
    text: <>
      <p>A hand that's already a pair or better is a <T k="made hand" />. A hand that needs one more card is a <T k="draw" plain="a hand that can improve to a strong one" />.</p>
      <p>Here you have nothing yet, just Jack high. But four hearts (your two plus two on the board) means one more heart gives you a flush. And J-T with Q-9 means a King or an 8 gives you a straight.</p>
    </>,
  },
  {
    visual: <Felt hole="Ah 5h" board="Kh 8h 2c" glow={parseCards('Ah 5h Kh 8h')} />,
    text: <>
      <p>The cards that would complete your draw are your <T k="outs" plain="cards that make your hand" />.</p>
      <p>You hold four hearts. A suit has 13 cards, so 13 − 4 = 9 hearts are still unseen.</p>
    </>,
    question: {
      prompt: 'How many outs does a flush draw have?',
      options: ['4', '8', '9', '13'],
      answer: 2,
      explain: '13 hearts in the deck, 4 already in your hand and on the board: 9 left.',
      words: ['outs', 'draw'],
    },
  },
  {
    visual: <Felt hole="9c 8d" board="7h 6s Kc" glow={parseCards('9c 8d 7h 6s')} />,
    text: <>
      <p>Four cards in a row, 9-8-7-6, can be completed at either end: any 10 or any 5. That's an <T k="open-ender" plain="open-ended straight draw" />: 4 + 4 = 8 outs.</p>
      <p>With 9-8 on a board of 6-5, you'd need exactly a 7 in the middle. That's a <T k="gutshot" plain="a straight draw missing one middle card" />: only 4 outs.</p>
    </>,
    question: {
      prompt: 'You hold J-T and the board is Q-8-2. Which cards make your straight?',
      options: ['Any 9 (a gutshot, 4 outs)', 'Any 9 or King (8 outs)', 'Any Ace (4 outs)'],
      answer: 0,
      explain: 'Q-J-T-?-8 needs the 9 in the middle. One rank, four cards: a gutshot.',
      words: ['gutshot', 'open-ender'],
    },
  },
  {
    visual: (
      <div className="stack">
        <Felt board="9h 8h 7c" note="wet" />
        <Felt board="Kc 7d 2h" note="dry" />
      </div>
    ),
    text: <>
      <p>How connected and suited a board is, its <T k="board texture" />, tells you how many draws are around.</p>
      <p>A <T k="wet board" plain="many draws possible" /> like 9-8-7 with two hearts gives lots of hands a straight or flush draw. A <T k="dry board" plain="few draws possible" /> like K-7-2 in three different suits (a <T k="rainbow" />) gives almost none.</p>
    </>,
    question: {
      prompt: 'Which flop is wetter: J♠ T♠ 9♦ or A♣ 7♦ 2♥?',
      options: ['J♠ T♠ 9♦', 'A♣ 7♦ 2♥'],
      answer: 0,
      explain: 'J-T-9 has straights and straight draws everywhere, plus two spades for a flush draw.',
      words: ['wet board', 'dry board'],
    },
  },
  {
    visual: (
      <div className="stack">
        <Felt hole="7c 7d" board="7h Kc 2s" glow={parseCards('7c 7d 7h')} note="set" />
        <Felt hole="Ac 7d" board="7h 7c 2s" glow={parseCards('7d 7h 7c')} note="trips" />
      </div>
    ),
    text: <>
      <p>Two names for three of a kind. A <T k="set" /> uses a pocket pair plus one board card. It's well hidden, because nobody can see your pair.</p>
      <p><T k="trips" /> use one of your cards plus a pair on the board. Anyone with the fourth card's rank has the same three, so the kicker matters more.</p>
      <p>Finish the lesson to unlock Tap the nuts, Count your outs and Wet or dry.</p>
    </>,
  },
];

export function BoardLesson() {
  return <StepLesson lesson="board-lesson" stage={1} title="Reading the board" steps={STEPS} />;
}
