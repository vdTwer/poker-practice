import { useMemo, useState } from 'react';
import {
  openingRange, rangeShare, playersBehind, positionName, POSITION_LONG, seatsFrom, blindSeats, openLevel,
  describeHand, LEVEL_SEAT_NAME, type HandClass,
} from '@poker/engine';
import { PokerTable, type TableSeat } from '../components/Table';
import { RangeGrid, GridLegend } from '../components/RangeGrid';
import { T } from '../components/Term';
import { href } from '../lib/router';
import { LessonCheck, type CheckQuestion } from '../components/Lesson';

const POSITION_CHECK: CheckQuestion[] = [
  {
    prompt: 'What decides how many hands you can open?',
    options: ['How many players are still to act behind you', 'How many chips you have', 'Which seat number you sit in'],
    answer: 0,
    explain: 'Every player behind you could wake up with a strong hand. The fewer players left to act, the more hands you can open.',
    words: ['Position', 'Open'],
  },
  {
    prompt: 'Under the gun at a full 9-player table, or on the button: where do you open more hands?',
    options: ['Under the gun', 'On the button', 'The same in both seats'],
    answer: 1,
    explain: 'On the button only the two blinds are left to act, and you act last on every street after the flop. Under the gun, eight players are still behind you.',
    words: ['Button', 'Under the gun'],
  },
  {
    prompt: 'Everyone folds to you and you want to play your hand. What do you do?',
    options: ['Call the big blind (limp)', 'Raise (open)', 'Check'],
    answer: 1,
    explain: 'When you are first in, raise or fold. A raise can win the blinds right away and puts you in charge of the hand; limping does neither.',
    words: ['Limp', 'Open'],
  },
];

/** Seats that can open (everyone but the big blind), in preflop order. */
export function openingSeats(n: number, button = 0): number[] {
  const { bb } = blindSeats(button, n);
  return seatsFrom(bb, n).filter((s) => s !== bb);
}

/** A table where everyone before `hero` has folded. */
export function foldedToTable(n: number, hero: number, button = 0): TableSeat[] {
  const { sb, bb } = blindSeats(button, n);
  const order = seatsFrom(bb, n);
  const before = new Set(order.slice(0, order.indexOf(hero)));
  return Array.from({ length: n }, (_, i) => {
    const pos = positionName(i, button, n);
    return {
      name: i === hero ? 'You' : POSITION_LONG[pos],
      stack: 200 - (i === sb ? 1 : i === bb ? 2 : 0),
      bet: i === sb ? 1 : i === bb ? 2 : 0,
      hole: i === hero ? [] : [],
      showCards: false,
      folded: before.has(i),
      position: pos,
      toAct: i === hero,
      note: before.has(i) ? 'Fold' : undefined,
    };
  });
}

export function Position() {
  const [n, setN] = useState(6);
  const seats = openingSeats(n);
  const [hero, setHero] = useState(seats[0]);
  const seat = seats.includes(hero) ? hero : seats[0];
  const behind = playersBehind(seat, 0, n);
  const range = useMemo(() => openingRange(behind), [behind]);
  const [hover, setHover] = useState<HandClass | null>(null);
  const pos = positionName(seat, 0, n);

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage 2 · lesson</a>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Position: why your seat decides your hands</h1>
        <div className="stack-sm" style={{ maxWidth: '68ch' }}>
          <p>
            Your <T k="position" plain="where you sit relative to the button" /> decides when you act. After the flop the player
            closest to the <T k="button" /> acts last and sees what everyone else did first. Acting last is called being{' '}
            <T k="in position" />, and it's a big advantage.
          </p>
          <p>
            Before the flop, the more players still have to act after you, the more likely one of them has a strong hand. So the
            first seat, <T k="under the gun" plain="first to act preflop" />, plays only strong hands, and the{' '}
            <T k="cutoff" /> and button play many more. When everyone before you has folded and you raise, you{' '}
            <T k="open" plain="make the first raise" />. The set of hands you open is your <T k="range" plain="all the hands you would play this way" />.
          </p>
        </div>
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="stack-sm" style={{ minWidth: 240, flex: '1 1 240px' }}>
            <span>Players at the table: <b className="mono">{n}</b></span>
            <input type="range" min={2} max={9} value={n} onChange={(e) => { const v = Number(e.target.value); setN(v); setHero(openingSeats(v)[0]); }} aria-label="Players at the table" />
          </label>
          <div className="stack-sm" style={{ flex: '2 1 320px' }}>
            <span className="muted">Your seat (everyone before you folds)</span>
            <div className="seat-picker" role="group" aria-label="Your seat">
              {seats.map((s) => {
                const p = positionName(s, 0, n);
                return <button key={s} className={s === seat ? 'on' : ''} onClick={() => setHero(s)} title={POSITION_LONG[p]}>{p}</button>;
              })}
            </div>
          </div>
        </div>

        <div className="explorer">
          <div className="stack">
            <RangeGrid stateOf={(h) => (range.has(h) ? 'in' : 'out')} mark={hover} onHover={setHover} />
            <GridLegend items={[{ cls: 'in', label: 'Open (raise)' }, { cls: 'out', label: 'Fold' }]} />
          </div>
          <div className="stack">
            <div>
              <div className="eyebrow">{POSITION_LONG[pos]} · {n} players</div>
              <div className="big-number">{Math.round(rangeShare(range) * 100)}%</div>
              <div className="muted">of all starting hands are an open from here</div>
            </div>
            <p>
              {behind === 'HU'
                ? <>Heads-up you are the button and the <T k="small blind" />. Only the big blind is left, and you act last on every later street, so you open most hands.</>
                : <>Players still to act behind you: <b>{behind === 2 && pos === 'SB' ? 1 : behind}</b>. {pos === 'SB'
                  ? <>Only the big blind is left, but you will act first on every later street, so you open about as wide as the button, not wider.</>
                  : behind >= 5 ? <>That's a lot of players who could wake up with a big hand, so you stay tight.</>
                  : behind >= 3 ? <>Fewer players behind means fewer strong hands to run into, so the range gets wider.</>
                  : <>Only the blinds are left, and you'll be in position after the flop. This is the widest seat.</>}</>}
            </p>
            <div className="mistake" aria-live="polite">
              {hover ? (
                <>
                  <b>{hover} · {describeHand(hover)}</b>
                  <span className="muted">
                    {range.has(hover) ? 'Open from this seat. ' : 'Fold from this seat. '}
                    {openLevel(hover) >= LEVEL_SEAT_NAME.length ? 'Never an open.' : `Opens from ${LEVEL_SEAT_NAME[openLevel(hover)]}${openLevel(hover) < 7 ? ' and later' : ''}.`}
                  </span>
                </>
              ) : <span className="muted">Point at or tap a hand in the grid to see where it starts being an open.</span>}
            </div>
            <p className="muted" style={{ fontSize: '0.88rem' }}>
              These charts are simplified typical ranges for a 100-<T k="big blinds (bb)">big-blind</T> cash game. They are a solid
              starting point, not solver output.
            </p>
          </div>
        </div>
      </div>

      <PokerTable seats={foldedToTable(n, seat)} heroIndex={seat} button={0} board={[]} pot={0} highlight={`seat:${seat}`} callout={POSITION_LONG[pos]} animateBoard={false} />

      <div className="panel stack-sm">
        <h3>Three things to remember</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }} className="stack-sm">
          <li>Count the players behind you, not the seat name. Under the gun at a 6-player table plays like the middle of a full table.</li>
          <li>Pairs, big cards and <T k="suited" /> hands come first. <T k="offsuit" plain="different suits" /> small cards almost never open.</li>
          <li>Don't <T k="limp" plain="just call the big blind" />: when you play a hand first in, raise it.</li>
        </ul>
      </div>

      <LessonCheck lesson="position" questions={POSITION_CHECK} />
    </div>
  );
}
