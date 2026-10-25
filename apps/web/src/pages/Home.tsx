import { href } from '../lib/router';
import { GLOSSARY } from '../lib/glossary';
import { useDrillScores, useWordCounts, LEARNED_AFTER } from '../lib/storage';
import { PlayingCard } from '../components/PlayingCard';
import { T } from '../components/Term';

interface Tile { path: string; kind: 'Lesson' | 'Drill' | 'Words' | 'Play'; title: string; text: string; id?: string }

const STAGE0: Tile[] = [
  { path: '/learn/first-hand', kind: 'Lesson', title: 'Your first hand, slowly', text: 'One full hand dealt step by step, with every part of the table named as it appears. Start here.' },
  { path: '/drill/name-it', kind: 'Words', title: 'Name it', text: 'Something on the table lights up. Pick its name. Learns the table words fast.', id: 'name-it' },
  { path: '/learn/rankings', kind: 'Lesson', title: 'The ten hands', text: 'Every hand type from high card to royal flush, best first, with examples.' },
  { path: '/drill/who-wins', kind: 'Drill', title: 'Who wins?', text: 'Two to four players show their cards. Tap the winner before the timer runs out.', id: 'who-wins' },
  { path: '/drill/best-five', kind: 'Drill', title: 'Build the best five', text: 'You have seven cards. Pick the five that make your best hand.', id: 'best-five' },
  { path: '/drill/side-pots', kind: 'Drill', title: 'Side pots', text: 'Three to five players are all-in with different stacks. Who wins how much?', id: 'side-pots' },
];

const STAGE1: Tile[] = [
  { path: '/drill/nuts', kind: 'Drill', title: 'Tap the nuts', text: 'Which two cards would make the best possible hand on this board?', id: 'nuts' },
  { path: '/drill/outs', kind: 'Drill', title: 'Count your outs', text: 'You have a draw. Tap every card that completes it.', id: 'outs' },
  { path: '/drill/wet-dry', kind: 'Drill', title: 'Wet or dry?', text: 'Sort flops by how many draws they allow.', id: 'wet-dry' },
];

const STAGE2: Tile[] = [
  { path: '/learn/position', kind: 'Lesson', title: 'Position and opening hands', text: 'Pick a table size and a seat, and see which hands open from there and why.' },
  { path: '/drill/open-fold', kind: 'Drill', title: 'Open or fold?', text: 'Everyone folds to you at a random seat and table size. Raise or fold? Sets of 20.', id: 'open-fold' },
  { path: '/drill/paint', kind: 'Drill', title: 'Paint the range', text: 'Colour the 13×13 grid yourself, then compare it with the chart.', id: 'paint' },
];

const STAGE3: Tile[] = [
  { path: '/learn/pot-odds', kind: 'Lesson', title: 'Pot odds', text: 'Drag the bet and your outs and watch whether calling wins or loses chips.' },
  { path: '/drill/call-fold', kind: 'Drill', title: 'Call or fold?', text: 'You have a draw and face a bet. Graded in chips, with the numbers shown as bars.', id: 'call-fold' },
  { path: '/drill/equity', kind: 'Drill', title: 'Estimate your equity', text: 'Turn outs into a percentage with the rule of 2 and 4.', id: 'equity' },
];

export function Home() {
  const scores = useDrillScores();
  const counts = useWordCounts();
  const learned = GLOSSARY.filter((g) => (counts[g.term.toLowerCase()] ?? 0) >= LEARNED_AFTER).length;

  const tiles = (list: Tile[]) => (
    <div className="tiles">
      {list.map((t) => {
        const s = t.id ? scores[t.id] : undefined;
        return (
          <a key={t.path} className="tile" href={href(t.path)}>
            <span className="kind">{t.kind}</span>
            <h3>{t.title}</h3>
            <p>{t.text}</p>
            {s && <span className="best">{s.right}/{s.total} right · best streak {s.best}</span>}
          </a>
        );
      })}
    </div>
  );

  const words = (stage: number) => (
    <div className="words-preview">
      {GLOSSARY.filter((g) => g.stage === stage).map((g) => (
        <span key={g.term} className={'word-chip' + ((counts[g.term.toLowerCase()] ?? 0) >= LEARNED_AFTER ? ' learned' : '')}>
          <T k={g.term} />
        </span>
      ))}
    </div>
  );

  return (
    <div className="wrap">
      <section className="hero">
        <div className="row" style={{ gap: 6 }}>
          <PlayingCard card="As" size="lg" />
          <PlayingCard card="Kh" size="lg" />
          <PlayingCard card="Qd" size="lg" />
          <PlayingCard card="Jc" size="lg" />
        </div>
        <h1>Learn No-Limit Hold'em, one idea at a time.</h1>
        <p className="lede">
          No poker knowledge needed. Every poker word is underlined: tap it to see what it means. New words show a short
          explanation in brackets until you've used them correctly three times.
        </p>
        <div className="row">
          <a className="btn primary" href={href('/learn/first-hand')}>Start with your first hand</a>
          <a className="btn" href={href('/play')}>Go to the practice table</a>
          <span className="muted mono" style={{ fontSize: '0.85rem' }}>{learned} of {GLOSSARY.length} words learned</span>
        </div>
      </section>

      <section className="stage-block">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stage-num">0</span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="eyebrow">Stage 0 · Foundations</span>
            <h2>Cards, table words and rules</h2>
            <p className="muted" style={{ maxWidth: '66ch' }}>
              What the cards are, what the words mean and who wins. You can't think about strategy while you're still
              working out the vocabulary, so this comes first.
            </p>
          </div>
        </div>
        {tiles(STAGE0)}
        <details>
          <summary className="muted" style={{ cursor: 'pointer' }}>Words in this stage</summary>
          <div style={{ marginTop: 10 }}>{words(0)}</div>
        </details>
      </section>

      <section className="stage-block">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stage-num">1</span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="eyebrow">Stage 1 · Foundations</span>
            <h2>Reading the board</h2>
            <p className="muted" style={{ maxWidth: '66ch' }}>
              Before you can judge your hand, you need to see what the <T k="board" /> makes possible: the{' '}
              <T k="nuts" plain="the best possible hand right now" />, <T k="draw">draws</T> and <T k="outs" plain="cards that would complete your hand" />.
            </p>
          </div>
        </div>
        {tiles(STAGE1)}
        <details>
          <summary className="muted" style={{ cursor: 'pointer' }}>Words in this stage</summary>
          <div style={{ marginTop: 10 }}>{words(1)}</div>
        </details>
      </section>

      <section className="stage-block">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stage-num">2</span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="eyebrow">Stage 2 · Preflop</span>
            <h2>Position and opening hands</h2>
            <p className="muted" style={{ maxWidth: '66ch' }}>
              Most beginner losses come from playing too many hands from early seats. Learn which hands to{' '}
              <T k="open" plain="raise first" /> from each seat, at any table size from 2 to 9 players.
            </p>
          </div>
        </div>
        {tiles(STAGE2)}
        <details>
          <summary className="muted" style={{ cursor: 'pointer' }}>Words in this stage</summary>
          <div style={{ marginTop: 10 }}>{words(2)}</div>
        </details>
      </section>

      <section className="stage-block">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stage-num">3</span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="eyebrow">Stage 3 · The math</span>
            <h2>Pot odds and equity</h2>
            <p className="muted" style={{ maxWidth: '66ch' }}>
              This turns "I have a feeling" into "calling wins 4 chips on average". Everything after it uses this math.
            </p>
          </div>
        </div>
        {tiles(STAGE3)}
        <details>
          <summary className="muted" style={{ cursor: 'pointer' }}>Words in this stage</summary>
          <div style={{ marginTop: 10 }}>{words(3)}</div>
        </details>
      </section>

      <section className="stage-block">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stage-num" style={{ background: 'var(--muted)' }}>4+</span>
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="eyebrow">Coming next</span>
            <h2>Bots, coaching and beyond</h2>
            <p className="muted" style={{ maxWidth: '66ch' }}>
              Bot personalities and a coach who pauses at key decisions come next, then progress tracking and stages 4 to 8.
              The <a href={href('/play')}>practice table</a> already plays full hands with 2 to 9 players.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
