import { useState } from 'react';
import { parseCards, mulberry32, randomSeed } from '@poker/engine';
import { CardRow } from '../components/PlayingCard';
import { T } from '../components/Term';
import { creditWord, missWord } from '../lib/storage';
import { href } from '../lib/router';

const HANDS = [
  { term: 'Straight flush', name: 'Royal flush', cards: 'As Ks Qs Js Ts', note: 'The best hand of all: a straight flush from Ten up to Ace. It is just the highest straight flush, not a separate type.' },
  { term: 'Straight flush', name: 'Straight flush', cards: '9h 8h 7h 6h 5h', note: 'Five in a row, all the same suit.' },
  { term: 'Four of a kind', name: 'Four of a kind', cards: 'Qc Qd Qh Qs 7d', note: 'All four cards of one rank. Also called quads.' },
  { term: 'Full house', name: 'Full house', cards: 'Kc Kd Kh 4s 4d', note: 'Three of a kind plus a pair. Read as "Kings full of Fours".' },
  { term: 'Flush', name: 'Flush', cards: 'Ad Jd 8d 6d 2d', note: 'Any five cards of the same suit. Colour is not enough: five diamonds, not "five red cards".' },
  { term: 'Straight', name: 'Straight', cards: 'Tc 9d 8h 7s 6c', note: 'Five ranks in a row, any suits. A-2-3-4-5 is the lowest, 10-J-Q-K-A the highest.' },
  { term: 'Three of a kind', name: 'Three of a kind', cards: '7c 7d 7h Ks 2d', note: 'Three cards of one rank.' },
  { term: 'Two pair', name: 'Two pair', cards: 'Jc Jd 5h 5s Ad', note: 'Two different pairs. The higher pair is compared first.' },
  { term: 'Pair', name: 'One pair', cards: '9c 9d Ah Ks 4d', note: 'Two cards of the same rank. The other three cards are kickers.' },
  { term: 'High card', name: 'High card', cards: 'Ac Jd 8h 5s 3d', note: 'Nothing else, so the highest card counts: "Ace high".' },
];

// The quiz uses the nine real hand types (royal flush is a straight flush).
const TYPES = HANDS.slice(1);

export function Rankings() {
  const [seed] = useState(randomSeed);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const rng = mulberry32(seed + round * 7919);
  let a = Math.floor(rng() * TYPES.length);
  let b = Math.floor(rng() * (TYPES.length - 1));
  if (b >= a) b++;
  if (rng() < 0.5) [a, b] = [b, a];
  const better = Math.min(a, b); // lower index = stronger
  const next = () => { setPicked(null); setRound((r) => r + 1); };

  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === better) { creditWord(TYPES[a].term); creditWord(TYPES[b].term); }
    else missWord(TYPES[better].term);
  };

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage 0 · lesson</a>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>The ten hands, best first</h1>
        <p className="muted" style={{ maxWidth: '66ch' }}>
          At <T k="showdown" /> everyone makes their best five cards out of seven: their two <T k="hole cards" /> plus the five on
          the <T k="board" />. The hand type is compared first. Only if both players have the same type do the card ranks decide,
          and then a <T k="kicker" plain="side card" /> can break the tie. No suit is better than another.
        </p>
      </div>

      <div className="rank-table">
        {HANDS.map((h, i) => (
          <div className="rank-row" key={h.name}>
            <span className="n">{i + 1}</span>
            <b><T k={h.term}>{h.name}</T></b>
            <div className="row" style={{ gap: 14 }}>
              <CardRow cards={parseCards(h.cards)} size="sm" />
              <span className="muted" style={{ flex: '1 1 220px', fontSize: '0.93rem' }}>{h.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel stack">
        <span className="eyebrow">Quick check</span>
        <h2 style={{ fontSize: '1.3rem' }}>Which hand is higher?</h2>
        <div className="choices">
          {[a, b].map((k) => (
            <button
              key={k}
              className={'btn choice' + (picked !== null && k === better ? ' correct' : '') + (picked === k && k !== better ? ' wrong' : '')}
              onClick={() => pick(k)}
            >
              <span className="stack-sm">
                <b>{TYPES[k].name}</b>
                <CardRow cards={parseCards(TYPES[k].cards)} size="sm" />
              </span>
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className="row">
            <span style={{ color: picked === better ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>
              {picked === better ? 'Right.' : 'Not this time.'} {TYPES[better].name} is number {better + 2} on the list and beats {TYPES[a === better ? b : a].name.toLowerCase()} (number {(a === better ? b : a) + 2}).
            </span>
            <button className="btn primary small" onClick={next} autoFocus>Next pair →</button>
          </div>
        )}
      </div>

      <div className="row">
        <a className="btn primary" href={href('/drill/who-wins')}>Drill it: Who wins? →</a>
        <a className="btn" href={href('/drill/best-five')}>Build the best five</a>
      </div>
    </div>
  );
}
