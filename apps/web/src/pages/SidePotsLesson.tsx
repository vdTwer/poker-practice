import { StepLesson, type Step } from '../components/Lesson';
import { T } from '../components/Term';

interface Seg { pot: 'main' | 'side'; amount: number }
interface Row { name: string; stack: number; segs: Seg[]; note?: string }

/** Chips each player put in, coloured by the pot they went into. */
function PotBars({ rows, max = 100 }: { rows: Row[]; max?: number }) {
  return (
    <div className="panel stack">
      {rows.map((r) => (
        <div key={r.name} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
          <b style={{ width: 48 }}>{r.name}</b>
          <div style={{ flex: 1, display: 'flex', height: 30, background: 'var(--band)', borderRadius: 8, overflow: 'hidden' }}>
            {r.segs.map((s, i) => (
              <div key={i} className="mono" style={{ width: `${(s.amount / max) * 100}%`, background: s.pot === 'main' ? 'var(--terra)' : 'var(--orchid)', display: 'grid', placeItems: 'center', fontSize: '0.8rem', color: '#2A1F24', borderRight: '2px solid var(--surface)' }}>
                {s.amount}
              </div>
            ))}
          </div>
          <span className="muted" style={{ width: 110, fontSize: '0.85rem' }}>{r.note ?? `${r.stack} chips`}</span>
        </div>
      ))}
      <div className="row" style={{ gap: 14, fontSize: '0.85rem' }}>
        <span className="row" style={{ gap: 6 }}><span className="rg-swatch" style={{ background: 'var(--terra)' }} /> Main pot</span>
        <span className="row" style={{ gap: 6 }}><span className="rg-swatch" style={{ background: 'var(--orchid)' }} /> Side pot</span>
      </div>
    </div>
  );
}

const START: Row[] = [
  { name: 'Alex', stack: 30, segs: [], note: '30 chips' },
  { name: 'Bea', stack: 100, segs: [], note: '100 chips' },
  { name: 'Chen', stack: 100, segs: [], note: '100 chips' },
];
const ALLIN: Row[] = [
  { name: 'Alex', stack: 0, segs: [{ pot: 'main', amount: 30 }], note: 'all-in for 30' },
  { name: 'Bea', stack: 0, segs: [{ pot: 'main', amount: 100 }], note: 'put in 100' },
  { name: 'Chen', stack: 0, segs: [{ pot: 'main', amount: 100 }], note: 'put in 100' },
];
const SPLIT: Row[] = [
  { name: 'Alex', stack: 0, segs: [{ pot: 'main', amount: 30 }], note: 'all-in for 30' },
  { name: 'Bea', stack: 0, segs: [{ pot: 'main', amount: 30 }, { pot: 'side', amount: 70 }], note: 'put in 100' },
  { name: 'Chen', stack: 0, segs: [{ pot: 'main', amount: 30 }, { pot: 'side', amount: 70 }], note: 'put in 100' },
];

const STEPS: Step[] = [
  {
    visual: <PotBars rows={START} />,
    text: <>
      <p>In <T k="No-Limit" plain="you can bet any amount up to everything you have" /> Hold'em you can always bet every chip you have. That's going <T k="all-in" plain="betting all your chips" />.</p>
      <p>But stacks are rarely equal. Here Alex has only 30 chips, while Bea and Chen have 100 each.</p>
    </>,
  },
  {
    visual: <PotBars rows={ALLIN} />,
    text: <>
      <p>Alex goes all-in for 30. Bea and Chen keep betting until they've each put in 100.</p>
      <p>Alex can't win chips he couldn't match. If Alex wins, how much can he take from Bea? Only 30, the same amount he risked himself.</p>
    </>,
    question: {
      prompt: 'Alex risked 30. How much can he win from each other player?',
      options: ['30 from each', '100 from each', 'Everything in the middle'],
      answer: 0,
      explain: 'You can win from each opponent at most what you put in yourself.',
      words: ['all-in'],
    },
  },
  {
    visual: <PotBars rows={SPLIT} />,
    text: <>
      <p>So the chips are split into two piles. The <b>main pot</b> holds 30 from each player: 30 × 3 = <b>90</b>. All three can win it.</p>
      <p>The rest, 70 from Bea and 70 from Chen, forms a <T k="side pot" plain="a separate pot the all-in player can't win" /> of <b>140</b>. Only Bea and Chen can win that one.</p>
    </>,
    question: {
      prompt: 'Who can win the side pot?',
      options: ['Alex, Bea and Chen', 'Only Bea and Chen', 'Only Alex'],
      answer: 1,
      explain: "Alex didn't put any chips into the side pot, so he can't win it.",
      words: ['side pot'],
    },
  },
  {
    visual: <PotBars rows={SPLIT} />,
    text: <>
      <p>At the <T k="showdown" />, Alex has the best hand, Chen the second best and Bea the worst.</p>
      <p>Each pot goes to the best hand <i>among the players who can win it</i>.</p>
    </>,
    question: {
      prompt: 'How many chips does Alex win, and how many does Chen win?',
      options: ['Alex 230, Chen 0', 'Alex 90, Chen 140', 'Alex 140, Chen 90'],
      answer: 1,
      explain: 'Alex wins the main pot of 90. Between Bea and Chen, Chen is better, so Chen wins the side pot of 140.',
      words: ['showdown'],
    },
  },
  {
    visual: <PotBars rows={SPLIT} />,
    text: <>
      <p><b>The rule:</b> start from the smallest all-in. Everyone pays that amount into the main pot. What's left builds the next pot, and so on.</p>
      <p>If one player bets more than anybody can call, the extra chips simply go back to them: that's an uncalled bet. If two hands are exactly equal, they share the pot: a <T k="split pot" />.</p>
      <p>Finish the lesson to unlock the Side pots drill, with 3 to 5 players.</p>
    </>,
  },
];

export function SidePotsLesson() {
  return <StepLesson lesson="side-pots-lesson" stage={0} title="All-in and side pots" steps={STEPS} />;
}
