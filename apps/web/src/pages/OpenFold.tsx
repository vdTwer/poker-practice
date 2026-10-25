import { useCallback, useState } from 'react';
import { genOpenSpot, gradeOpen, openingRange, mulberry32, randomSeed, describeHand, type OpenSpot } from '@poker/engine';
import { PokerTable } from '../components/Table';
import { RangeGrid, GridLegend } from '../components/RangeGrid';
import { SpotSetShell, useSpotSet, GradedFeedback, Bars } from '../components/SpotSet';
import { T } from '../components/Term';
import { foldedToTable } from './Position';
import { creditWord } from '../lib/storage';

const SET_SIZE = 20;
const bb = (x: number) => `${x.toFixed(x < 1 ? 2 : 1)} bb`;

export function OpenFold() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState<OpenSpot>(() => genOpenSpot(rng));
  const [choice, setChoice] = useState<boolean | null>(null);
  const set = useSpotSet('open-fold', SET_SIZE);
  const next = useCallback(() => { setSpot(genOpenSpot(rng)); setChoice(null); }, [rng]);

  const answer = (open: boolean) => {
    if (choice !== null) return;
    setChoice(open);
    const g = gradeOpen(spot, open);
    if (g.grade === 'best') { creditWord('open'); creditWord('position'); if (spot.hand.endsWith('s')) creditWord('suited'); if (spot.hand.endsWith('o')) creditWord('offsuit'); if (spot.hand.length === 2) creditWord('pocket pair'); }
    set.record({
      grade: g.grade,
      cost: g.lossBB,
      title: `${spot.positionLong}, ${spot.players} players, ${spot.hand}: you ${open ? 'opened' : 'folded'}`,
      verdict: verdictText(spot, g.grade === 'best', g.lossBB),
      reason: `This seat opens the top ${Math.round(spot.rangeShare * 100)}% of hands. ${spot.hand} ${g.opensFrom}.`,
    });
  };

  const seats = foldedToTable(spot.players, spot.seat, spot.button);
  seats[spot.seat] = { ...seats[spot.seat], hole: spot.hole, showCards: true };
  const g = choice !== null ? gradeOpen(spot, choice) : null;
  const range = openingRange(spot.behind);

  return (
    <SpotSetShell
      id="open-fold" stage={2} title="Open or fold?" set={set} unit={bb} onNext={next}
      intro={<>Everyone before you has <T k="fold">folded</T>. Do you <T k="open" plain="raise first" /> or fold? Spots mix table sizes from 2 to 9 players. Costs are shown in <T k="big blinds (bb)" plain="the size of the big blind" />.</>}
    >
      <PokerTable seats={seats} heroIndex={spot.seat} button={spot.button} board={[]} pot={0} animateBoard={false} />
      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>
            You're in the <b>{spot.positionLong.toLowerCase()}</b> at a {spot.players}-player table with <b>{describeHand(spot.hand)}</b> ({spot.hand}).
          </span>
        </div>
        {choice === null ? (
          <div className="row">
            <button className="btn" onClick={() => answer(false)} style={{ flex: '1 1 140px' }}>Fold</button>
            <button className="btn primary" onClick={() => answer(true)} style={{ flex: '1 1 140px' }}>Open: raise to 2.5 bb</button>
          </div>
        ) : g && (
          <GradedFeedback
            grade={g.grade}
            verdict={verdictText(spot, g.correct, g.lossBB)}
            why={
              <div className="stack">
                <Bars rows={[
                  { label: 'Hands opened here', value: spot.rangeShare, display: `${Math.round(spot.rangeShare * 100)}%`, color: 'terra' },
                ]} />
                <p>
                  {spot.behind === 'HU'
                    ? 'Heads-up, only the big blind is left and you act last after the flop.'
                    : `There ${spot.behind === 2 ? 'are only the blinds' : `are ${spot.behind} players`} still to act behind you.`}{' '}
                  {spot.hand} is {range.has(spot.hand) ? 'inside' : 'outside'} this seat's range (ringed in the grid).
                </p>
                <div className="stack-sm">
                  <RangeGrid stateOf={(h) => (range.has(h) ? 'in' : 'out')} mark={spot.hand} compact />
                  <GridLegend items={[{ cls: 'in', label: 'Open' }, { cls: 'out', label: 'Fold' }]} />
                </div>
              </div>
            }
            rule={<p>{spot.hand} {g.opensFrom}. {g.distance === 1 ? 'It sits right on the edge here, which is why either choice is close.' : ''}</p>}
          />
        )}
      </div>
    </SpotSetShell>
  );
}

function verdictText(spot: OpenSpot, correct: boolean, loss: number): string {
  const best = spot.shouldOpen ? 'Open' : 'Fold';
  if (correct) return `${best}. ${spot.hand} is ${spot.shouldOpen ? 'in' : 'not in'} the ${spot.positionLong.toLowerCase()}'s range.`;
  return `${best} is better. Your choice costs about ${loss.toFixed(loss < 1 ? 2 : 1)} big blinds on average.`;
}
