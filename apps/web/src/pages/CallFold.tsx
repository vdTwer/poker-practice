import { useCallback, useState } from 'react';
import { genCallSpot, gradeCall, describeOuts, mulberry32, randomSeed, type CallSpot } from '@poker/engine';
import { PlayingCard } from '../components/PlayingCard';
import { SpotSetShell, useSpotSet, GradedFeedback, Bars } from '../components/SpotSet';
import { T } from '../components/Term';
import { creditWord } from '../lib/storage';

const SET_SIZE = 20;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const chips = (x: number) => `${x.toFixed(1)} chips`;

export function CallFold() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [mode, setMode] = useState<'mixed' | 'turn' | 'flop'>('mixed');
  const [spot, setSpot] = useState<CallSpot>(() => genCallSpot(rng, 'mixed'));
  const [choice, setChoice] = useState<'call' | 'fold' | null>(null);
  const set = useSpotSet('call-fold', SET_SIZE);
  const next = useCallback((m = mode) => { setSpot(genCallSpot(rng, m)); setChoice(null); }, [rng, mode]);

  const answer = (c: 'call' | 'fold') => {
    if (choice) return;
    setChoice(c);
    const g = gradeCall(spot, c);
    if (g.grade === 'best' || g.grade === 'fine') { creditWord('pot odds'); creditWord('equity'); creditWord('outs'); }
    set.record({
      grade: g.grade,
      cost: g.loss,
      title: `${spot.outs} outs, ${spot.bet} into ${spot.pot} (${spot.cardsToCome === 1 ? 'turn' : 'flop all-in'}): you ${c === 'call' ? 'called' : 'folded'}`,
      verdict: verdict(spot, c),
      reason: `You need ${pct(spot.needed)}; your ${spot.outs} outs give you ${pct(spot.equity)}.`,
    });
  };

  const g = choice ? gradeCall(spot, choice) : null;
  const turn = spot.cardsToCome === 1;

  return (
    <SpotSetShell
      id="call-fold" stage={3} title="Call or fold?" set={set} unit={chips} onNext={() => next()}
      intro={<>You have a <T k="draw" />. Your opponent bets. Count your <T k="outs" />, compare your chance to hit with the <T k="pot odds" plain="share of the final pot you pay" />, and decide. Assume this is the last bet: if you miss, you lose.</>}
      toolbar={
        <div className="seat-picker" role="group" aria-label="Spot type">
          {(['mixed', 'turn', 'flop'] as const).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => { setMode(m); if (!choice) next(m); }}>
              {m === 'mixed' ? 'Mixed' : m === 'turn' ? 'Turn: 1 card to come' : 'Flop all-in: 2 cards'}
            </button>
          ))}
        </div>
      }
    >
      <div className="felt-strip row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div>
          <div className="label">Your hand</div>
          <div className="cards">{spot.hole.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}</div>
        </div>
        <div>
          <div className="label">Board · {turn ? 'turn' : 'flop'}</div>
          <div className="cards">
            {spot.board.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}
            {!turn && <PlayingCard slot size="lg" />}
            <PlayingCard slot size="lg" />
          </div>
        </div>
        <div className="stack-sm">
          <div className="label">Money</div>
          <div className="mono">Pot <b>{spot.pot}</b></div>
          <div className="mono">{turn ? 'Bet' : 'All-in'} <b>{spot.bet}</b></div>
        </div>
      </div>

      <div className="panel stack">
        {!choice ? (
          <>
            <span>{turn ? `Your opponent bets ${spot.bet} into a pot of ${spot.pot}. The river is the last card.` : `Your opponent goes all-in for ${spot.bet} into a pot of ${spot.pot}. If you call, you see both the turn and the river.`}</span>
            <div className="row">
              <button className="btn" onClick={() => answer('fold')} style={{ flex: '1 1 140px' }}>Fold</button>
              <button className="btn primary" onClick={() => answer('call')} style={{ flex: '1 1 140px' }}>Call {spot.bet}</button>
            </div>
          </>
        ) : g && (
          <GradedFeedback
            grade={g.grade}
            verdict={verdict(spot, choice)}
            why={
              <div className="stack">
                <Bars rows={[
                  { label: 'Your chance to hit', value: spot.equity, display: pct(spot.equity), color: spot.equity >= spot.needed ? 'good' : 'orchid', line: spot.needed, max: 0.6 },
                  { label: 'Share you pay', value: spot.needed, display: pct(spot.needed), color: 'terra', max: 0.6 },
                ]} />
                <p>
                  You have a {spot.draw.label} with {spot.outs} outs: {describeOuts(spot)}.{' '}
                  {turn ? `${spot.outs} of 46 unseen cards hit = ${pct(spot.equity)} (rule of 2: about ${spot.outs * 2}%).` : `With two cards to come you hit ${pct(spot.equity)} of the time (rule of 4: about ${spot.outs * 4}%).`}{' '}
                  You pay {spot.bet} to win {spot.pot + 2 * spot.bet} in total, so you need {spot.bet} ÷ {spot.pot + 2 * spot.bet} = {pct(spot.needed)}.
                </p>
                <p className="muted">Calling averages {spot.evCall >= 0 ? '+' : ''}{spot.evCall.toFixed(1)} chips; folding is 0.</p>
              </div>
            }
            rule={<p>{Number.isFinite(spot.maxBet)
              ? <>With {spot.outs} outs you could call a bet of up to <b>{Math.floor(spot.maxBet)}</b> into this pot of {spot.pot}. {spot.bet > spot.maxBet ? 'A smaller bet would make this a call.' : 'A bigger bet than that would make this a fold.'}</>
              : 'Your chance is over 50%, so calling is right whatever the bet.'}</p>}
          />
        )}
      </div>
    </SpotSetShell>
  );
}

function verdict(spot: CallSpot, choice: 'call' | 'fold'): string {
  const best = spot.evCall >= 0 ? 'call' : 'fold';
  const loss = Math.abs(spot.evCall);
  if (choice === best) return best === 'call' ? `Call. It wins ${loss.toFixed(1)} chips on average.` : `Fold. Calling would lose ${loss.toFixed(1)} chips on average.`;
  return best === 'call' ? `Call. Folding gives up ${loss.toFixed(1)} chips on average.` : `Fold. Calling loses ${loss.toFixed(1)} chips on average.`;
}
