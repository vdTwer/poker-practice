import { useCallback, useState } from 'react';
import { openingRange, rangeShare, combos, positionName, POSITION_LONG, playersBehind, mulberry32, randomSeed, pick, type HandClass, type Grade } from '@poker/engine';
import { RangeGrid, GridLegend } from '../components/RangeGrid';
import { SpotSetShell, useSpotSet, GradedFeedback, Bars } from '../components/SpotSet';
import { T } from '../components/Term';
import { openingSeats } from './Position';
import { creditWord } from '../lib/storage';

const SET_SIZE = 5;

interface PaintSpot { players: number; seat: number; behind: number | 'HU'; label: string }

function genPaint(rng: () => number): PaintSpot {
  const players = pick([2, 3, 4, 5, 6, 6, 6, 9, 9], rng);
  const seat = pick(openingSeats(players), rng);
  return { players, seat, behind: playersBehind(seat, 0, players), label: POSITION_LONG[positionName(seat, 0, players)] };
}

export function PaintRange() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState(() => genPaint(rng));
  const [painted, setPainted] = useState<Set<HandClass>>(new Set());
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [checked, setChecked] = useState(false);
  const set = useSpotSet('paint', SET_SIZE);
  const next = useCallback(() => { setSpot(genPaint(rng)); setPainted(new Set()); setChecked(false); }, [rng]);
  const answer = openingRange(spot.behind);

  const paint = (h: HandClass, start: boolean) => {
    if (checked) return;
    let m = mode;
    if (start) { m = painted.has(h) ? 'remove' : 'add'; setMode(m); }
    setPainted((p) => {
      const n = new Set(p);
      if (m === 'add') n.add(h); else n.delete(h);
      return n;
    });
  };

  // Overlap weighted by combos: shared / (painted ∪ answer).
  let shared = 0, union = 0, missing = 0, extra = 0;
  for (const h of new Set([...painted, ...answer])) {
    const c = combos(h);
    union += c;
    if (painted.has(h) && answer.has(h)) shared += c;
    else if (answer.has(h)) missing += c;
    else extra += c;
  }
  const overlap = union ? shared / union : 0;

  const check = () => {
    setChecked(true);
    const grade: Grade = overlap >= 0.9 ? 'best' : overlap >= 0.8 ? 'fine' : overlap >= 0.65 ? 'small' : 'big';
    if (grade === 'best' || grade === 'fine') { creditWord('range'); creditWord('position'); }
    set.record({
      grade,
      cost: Math.round((1 - overlap) * 100),
      title: `${spot.label}, ${spot.players} players`,
      verdict: `${Math.round(overlap * 100)}% overlap with the chart.`,
      reason: missing > extra ? 'You left out hands that should open: this seat can play more than you painted.' : 'You painted hands that should fold: this seat is tighter than you thought.',
    });
  };

  return (
    <SpotSetShell
      id="paint" stage={2} title="Paint the range" set={set} unit={(n) => `${n}% off`} onNext={next}
      intro={<>Colour every hand you would <T k="open" /> from this seat when everyone before you has folded. Tap or drag across the grid. Then compare with the chart.</>}
    >
      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Seat: <b>{spot.label}</b> at a {spot.players}-player table{spot.behind !== 'HU' && spot.label !== 'Small blind' ? ` (${spot.behind} players behind you)` : ''}.</span>
          <span className="pill terra mono">{Math.round(rangeShare(painted) * 100)}% painted</span>
        </div>
        <RangeGrid
          stateOf={(h) => checked ? (painted.has(h) && answer.has(h) ? 'hit' : answer.has(h) ? 'miss' : painted.has(h) ? 'extra' : 'out') : painted.has(h) ? 'in' : 'out'}
          onPaint={checked ? undefined : paint}
        />
        {checked
          ? <GridLegend items={[{ cls: 'hit', label: 'Right' }, { cls: 'miss', label: 'Missed (should open)' }, { cls: 'extra', label: 'Extra (should fold)' }]} />
          : (
            <div className="row">
              <button className="btn primary" onClick={check} disabled={painted.size === 0}>Compare with the chart</button>
              {painted.size > 0 && <button className="btn ghost" onClick={() => setPainted(new Set())}>Clear</button>}
            </div>
          )}
        {checked && set.answered && (
          <GradedFeedback
            grade={set.answered.grade}
            verdict={`${Math.round(overlap * 100)}% of your range matches the chart.`}
            why={
              <Bars rows={[
                { label: 'You painted', value: rangeShare(painted), display: `${Math.round(rangeShare(painted) * 100)}%`, color: 'orchid' },
                { label: 'The chart opens', value: rangeShare(answer), display: `${Math.round(rangeShare(answer) * 100)}%`, color: 'terra' },
                { label: 'Missed', value: missing / 1326, display: `${Math.round((missing / 1326) * 100)}%`, color: 'terra' },
                { label: 'Extra', value: extra / 1326, display: `${Math.round((extra / 1326) * 100)}%`, color: 'orchid' },
              ]} />
            }
            rule={<p>Build a range in layers: pairs first, then big suited aces and kings, then suited connectors, and offsuit big cards last. The fewer players behind you, the further down each layer you go.</p>}
            ruleLabel="How to build any range"
          />
        )}
      </div>
    </SpotSetShell>
  );
}
