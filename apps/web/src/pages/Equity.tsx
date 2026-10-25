import { useCallback, useState } from 'react';
import { genEquitySpot, gradeEstimate, describeOuts, mulberry32, randomSeed, type EquitySpot } from '@poker/engine';
import { PlayingCard } from '../components/PlayingCard';
import { SpotSetShell, useSpotSet, GradedFeedback, Bars } from '../components/SpotSet';
import { T } from '../components/Term';
import { creditWord } from '../lib/storage';

const SET_SIZE = 10;

export function Equity() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState<EquitySpot>(() => genEquitySpot(rng));
  const [guess, setGuess] = useState(25);
  const [locked, setLocked] = useState(false);
  const set = useSpotSet('equity', SET_SIZE);
  const next = useCallback(() => { setSpot(genEquitySpot(rng)); setGuess(25); setLocked(false); }, [rng]);
  const turn = spot.cardsToCome === 1;
  const truth = spot.equity * 100;

  const lock = () => {
    setLocked(true);
    const g = gradeEstimate(spot, guess);
    if (g.grade === 'best' || g.grade === 'fine') { creditWord('equity'); creditWord('rule of 2 and 4'); }
    set.record({
      grade: g.grade,
      cost: Math.round(g.error),
      title: `${spot.draw.label}, ${turn ? 'one card' : 'two cards'} to come: you guessed ${guess}%`,
      verdict: `The real chance is ${truth.toFixed(1)}%.`,
      reason: `${spot.outs} outs × ${turn ? 2 : 4} = ${spot.quick}% with the quick rule.`,
    });
  };

  const g = locked ? gradeEstimate(spot, guess) : null;

  return (
    <SpotSetShell
      id="equity" stage={3} title="Estimate your equity" set={set} unit={(n) => `${n} points`} onNext={next}
      intro={<>How often will you hit your draw? Count your <T k="outs" />, then use the <T k="rule of 2 and 4" plain="outs × 2 with one card to come, × 4 with two" /> to estimate your <T k="equity" />. Within 3 points is best, within 6 is fine.</>}
    >
      <div className="felt-strip row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div>
          <div className="label">Your hand</div>
          <div className="cards">{spot.hole.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}</div>
        </div>
        <div>
          <div className="label">Board · {turn ? 'turn, one card to come' : 'flop, two cards to come'}</div>
          <div className="cards">
            {spot.board.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}
            {!turn && <PlayingCard slot size="lg" />}
            <PlayingCard slot size="lg" />
          </div>
        </div>
      </div>

      <div className="panel stack">
        <label className="stack-sm">
          <span>Your estimate: <b className="mono" style={{ fontSize: '1.3rem' }}>{guess}%</b> chance to make a straight or flush by the river</span>
          <input type="range" min={0} max={70} value={guess} disabled={locked} onChange={(e) => setGuess(Number(e.target.value))} aria-label="Equity estimate in percent" />
        </label>
        {!locked && <div className="row"><button className="btn primary" onClick={lock}>Lock in {guess}%</button></div>}
        {g && (
          <GradedFeedback
            grade={g.grade}
            verdict={`The real chance is ${truth.toFixed(1)}%. You were ${g.error.toFixed(1)} points ${guess > truth ? 'high' : 'low'}.`}
            why={
              <div className="stack">
                <Bars rows={[
                  { label: 'Your guess', value: guess, max: 70, display: `${guess}%`, color: 'orchid' },
                  { label: 'Real chance', value: truth, max: 70, display: `${truth.toFixed(1)}%`, color: 'good' },
                  { label: `Quick rule (× ${turn ? 2 : 4})`, value: spot.quick, max: 70, display: `${spot.quick}%`, color: 'terra' },
                ]} />
                <p>You have a {spot.draw.label} with {spot.outs} outs: {describeOuts(spot)}.</p>
              </div>
            }
            rule={<p>Outs × {turn ? 2 : 4} gets you within a few points. {turn ? '' : 'With two cards to come it slightly overestimates big draws (over 8 outs), so shade it down a little: 15 outs is about 54%, not 60%.'}</p>}
            ruleLabel="The rule to remember"
          />
        )}
      </div>
    </SpotSetShell>
  );
}
