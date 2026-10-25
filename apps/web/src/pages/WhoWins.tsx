import { useCallback, useEffect, useState } from 'react';
import { genShowdown, mulberry32, randomSeed, type ShowdownSpot, CATEGORY_NAME } from '@poker/engine';
import { CardRow, PlayingCard } from '../components/PlayingCard';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord } from '../lib/storage';
import { lowerFirst } from '../lib/text';

const SECONDS = 5;

export function WhoWins() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [players, setPlayers] = useState(2);
  const [timed, setTimed] = useState(false);
  const [spot, setSpot] = useState<ShowdownSpot>(() => genShowdown(rng, 2));
  const [picked, setPicked] = useState<number[] | 'timeout' | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const drill = useDrill('who-wins');

  const next = useCallback((count = players) => {
    setSpot(genShowdown(rng, count));
    setPicked(null);
    setLeft(SECONDS);
  }, [rng, players]);

  useEffect(() => {
    if (!timed || picked) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const remain = SECONDS - (performance.now() - start) / 1000;
      if (remain <= 0) {
        window.clearInterval(id);
        setLeft(0);
        setPicked('timeout');
        drill.answer(false);
      } else setLeft(remain);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, spot, picked]);

  const isSplit = spot.winners.length > 1;
  const correct = Array.isArray(picked) && picked.length === spot.winners.length && picked.every((p) => spot.winners.includes(p));

  const choose = (claim: number[] | 'split') => {
    if (picked) return;
    // "Split pot" is right whenever two or more hands tie for best.
    const who = claim === 'split' ? (isSplit ? spot.winners : [-1]) : claim;
    setPicked(who);
    const ok = who.length === spot.winners.length && who.every((p) => spot.winners.includes(p));
    drill.answer(ok);
    if (ok) {
      creditWord('showdown');
      const w = spot.players[spot.winners[0]].value;
      creditWord(CATEGORY_NAME[w.category]);
      if (/kicker/.test(spot.explanation)) creditWord('kicker');
      if (isSplit) creditWord('split pot');
    }
  };

  const answered = !!picked;
  const bestCards = new Set(spot.winners.flatMap((w) => spot.players[w].value.cards));

  return (
    <DrillShell
      id="who-wins" stage={0} title="Who wins?" score={drill} answered={answered} onNext={() => next()}
      intro={<>It's the <T k="showdown" plain="everyone shows their cards" />. Each player uses their two cards plus the five on the board to make their best five. Tap the winner, or <b>Split pot</b> if two hands are exactly equal.</>}
    >
      <div className="row">
        <span className="muted">Players</span>
        {[2, 3, 4].map((n) => (
          <button key={n} className={'btn small' + (players === n ? ' orchid' : '')} onClick={() => { setPlayers(n); next(n); }}>{n}</button>
        ))}
        <span className="spacer" />
        <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={timed} onChange={(e) => { setTimed(e.target.checked); setLeft(SECONDS); }} />
          <span>5-second timer</span>
        </label>
      </div>
      {timed && <div className="timer" aria-hidden="true"><div style={{ width: `${(left / SECONDS) * 100}%` }} /></div>}

      <div className="felt-strip">
        <div className="label">Board</div>
        <div className="cards">
          {spot.board.map((c) => (
            <PlayingCard key={c} card={c} size="lg" state={answered ? (bestCards.has(c) ? 'glow' : 'dim') : null} animate />
          ))}
        </div>
      </div>

      <div className="stack-sm">
        {spot.players.map((p, i) => {
          const win = spot.winners.includes(i);
          const cls = ['hand-row', !answered ? 'pickable' : '', answered && win ? 'correct' : '', Array.isArray(picked) && picked.includes(i) && !win ? 'wrong' : ''].join(' ');
          return (
            <div key={p.name} className={cls} role={!answered ? 'button' : undefined} tabIndex={!answered ? 0 : undefined}
              onClick={() => choose([i])} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && choose([i])}>
              <span className="who">{p.name}</span>
              <CardRow cards={p.hole} size="md" />
              {answered && (
                <>
                  <span style={{ fontWeight: 600 }}>{p.value.name}</span>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>best five:</span>
                  <CardRow cards={p.value.cards} size="sm" />
                </>
              )}
            </div>
          );
        })}
        {!answered && (
          <div className="row">
            <button className="btn" onClick={() => choose('split')}>
              Split pot
            </button>
          </div>
        )}
      </div>

      {answered && (
        <Feedback
          tone={correct ? 'good' : 'bad'}
          openWhy={!correct}
          verdict={
            picked === 'timeout' ? `Out of time. ${winnerText(spot)}`
              : correct ? `Right. ${winnerText(spot)}`
              : `Not quite. ${winnerText(spot)}`
          }
          why={<p>{spot.explanation}</p>}
          rule={
            <p>
              Compare the hand type first (flush beats straight, and so on). Only when the types are equal do the ranks
              matter, starting with the most important cards; then <T k="kicker">kickers</T>. If the best five cards are
              exactly the same, the pot is split. Suits never break a tie.
            </p>
          }
        />
      )}
    </DrillShell>
  );
}

function winnerText(spot: ShowdownSpot): string {
  if (spot.winners.length > 1) {
    return `${spot.winners.map((w) => spot.players[w].name).join(' and ')} split the pot with ${lowerFirst(spot.players[spot.winners[0]].value.name)}.`;
  }
  const w = spot.players[spot.winners[0]];
  return `${w.name} wins with ${lowerFirst(w.value.name)}.`;
}
