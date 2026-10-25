import { useCallback, useState } from 'react';
import { startHand, applyAction, legalActions, mulberry32, randomSeed, shuffle, pick, DRILL_NAMES, type HandState, type Rng } from '@poker/engine';
import { PokerTable, type Target } from '../components/Table';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { lookup } from '../lib/glossary';
import { seatsFromHand, middlePot } from '../lib/handview';
import { creditWord, missWord } from '../lib/storage';

type Kind = 'Button' | 'Small blind' | 'Big blind' | 'Hole cards' | 'Flop' | 'Turn' | 'River' | 'Board' | 'Pot' | 'Stack';
const KINDS: Kind[] = ['Button', 'Small blind', 'Big blind', 'Hole cards', 'Flop', 'Turn', 'River', 'Board', 'Pot', 'Stack'];

const HOW_TO_SPOT: Record<Kind, string> = {
  Button: 'Look for the white disc marked D. The seat next to it is the dealer for this hand.',
  'Small blind': 'Before anyone acts, the small blind is the smaller forced bet, one seat to the left of the button.',
  'Big blind': 'Before anyone acts, the big blind is the bigger forced bet, two seats to the left of the button.',
  'Hole cards': 'Every player gets two private cards. Yours are face up at the bottom; everyone else\'s are face down.',
  Flop: 'The first three board cards, which always come out together.',
  Turn: 'The fourth board card, which comes out on its own.',
  River: 'The fifth and last board card.',
  Board: 'All the face-up cards in the middle, shared by everyone.',
  Pot: 'The chips in the middle from earlier betting rounds. The winner takes them.',
  Stack: 'The number under a player\'s name: the chips they still have.',
};

interface Spot { state: HandState; target: Target; answer: Kind; options: Kind[] }

function advanceTo(s: HandState, street: 'flop' | 'turn' | 'river'): HandState {
  const order = ['preflop', 'flop', 'turn', 'river'];
  while (order.indexOf(s.phase) < order.indexOf(street) && s.phase !== 'complete') {
    const l = legalActions(s)!;
    s = applyAction(s, l.canCheck ? { type: 'check' } : { type: 'call' });
  }
  return s;
}

function makeSpot(rng: Rng): Spot {
  const answer = pick(KINDS, rng);
  const n = 3 + Math.floor(rng() * 4);
  const names = ['You', ...DRILL_NAMES.slice(0, n - 1)];
  const button = Math.floor(rng() * n);
  let s = startHand({ seats: names.map((name, i) => ({ id: `${i}`, name, stack: 100 })), button, smallBlind: 1, bigBlind: 2, rng });
  let target: Target;
  switch (answer) {
    case 'Button': target = 'button'; break;
    case 'Small blind': target = `bet:${s.sbSeat}`; break;
    case 'Big blind': target = `bet:${s.bbSeat}`; break;
    case 'Hole cards': target = 'hole:0'; break;
    case 'Stack': target = `stack:${Math.floor(rng() * n)}`; break;
    case 'Flop': s = advanceTo(s, 'flop'); target = 'flop'; break;
    case 'Turn': s = advanceTo(s, 'turn'); target = 'turn'; break;
    case 'River': s = advanceTo(s, 'river'); target = 'river'; break;
    case 'Board': s = advanceTo(s, rng() < 0.5 ? 'flop' : 'turn'); target = 'board'; break;
    case 'Pot': s = advanceTo(s, 'flop'); target = 'pot'; break;
  }
  // Distractors: prefer words that are easy to mix up with the answer.
  const confusable: Record<Kind, Kind[]> = {
    Button: ['Small blind', 'Big blind', 'Pot'], 'Small blind': ['Big blind', 'Button', 'Pot'], 'Big blind': ['Small blind', 'Button', 'Pot'],
    'Hole cards': ['Board', 'Flop', 'River'], Flop: ['Turn', 'River', 'Board'], Turn: ['River', 'Flop', 'Board'], River: ['Turn', 'Flop', 'Board'],
    Board: ['Flop', 'Hole cards', 'Turn'], Pot: ['Stack', 'Big blind', 'Board'], Stack: ['Pot', 'Big blind', 'Button'],
  };
  const options = shuffle([answer, ...confusable[answer]], rng);
  return { state: s, target, answer, options };
}

export function NameIt() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState(() => makeSpot(rng));
  const [picked, setPicked] = useState<Kind | null>(null);
  const drill = useDrill('name-it');

  const next = useCallback(() => { setSpot(makeSpot(rng)); setPicked(null); }, [rng]);

  const choose = (k: Kind) => {
    if (picked) return;
    setPicked(k);
    const ok = k === spot.answer;
    drill.answer(ok);
    if (ok) creditWord(spot.answer);
    else { missWord(spot.answer); }
  };

  const seats = seatsFromHand(spot.state, { reveal: (seat) => seat === 0 });
  seats.forEach((s) => { s.note = undefined; s.toAct = false; });
  const entry = lookup(spot.answer)!;
  const ok = picked === spot.answer;

  return (
    <DrillShell
      id="name-it" stage={0} title="Name it" score={drill} answered={!!picked} onNext={next}
      intro={<>Something on the table is lit up in orchid. Pick its name. Every right answer counts towards learning the word.</>}
    >
      <PokerTable seats={seats} heroIndex={0} button={spot.state.button} board={spot.state.board} pot={middlePot(spot.state)} highlight={spot.target} hidePositions animateBoard={false} />
      <div className="panel stack">
        <b>What is the highlighted thing called?</b>
        <div className="choices">
          {spot.options.map((o) => (
            <button
              key={o}
              className={'btn choice' + (picked && o === spot.answer ? ' correct' : '') + (picked === o && !ok ? ' wrong' : '')}
              onClick={() => choose(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {picked && (
          <Feedback
            tone={ok ? 'good' : 'bad'}
            openWhy={!ok}
            verdict={ok ? `Yes: the ${spot.answer.toLowerCase()}.` : `That's the ${spot.answer.toLowerCase()}, not the ${picked.toLowerCase()}.`}
            detail={<>{entry.definition}</>}
            why={<p>{HOW_TO_SPOT[spot.answer]}</p>}
            rule={<p><i>“{entry.example}”</i> Tap any underlined word, like <T k={spot.answer} />, to see its meaning again.</p>}
            ruleLabel="Use it in a sentence"
          />
        )}
      </div>
    </DrillShell>
  );
}
