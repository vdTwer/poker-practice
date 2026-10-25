import { useState } from 'react';
import { equityOneCard, equityTwoCards, potOddsNeeded, callEV, maxCallableBet } from '@poker/engine';
import { Bars } from '../components/SpotSet';
import { T } from '../components/Term';
import { href } from '../lib/router';
import { LessonCheck, type CheckQuestion } from '../components/Lesson';

const POT_ODDS_CHECK: CheckQuestion[] = [
  {
    prompt: 'The pot is 100 and your opponent bets 100. What share of the final pot do you pay if you call?',
    options: ['25%', '33%', '50%'],
    answer: 1,
    explain: 'You pay 100 to win a pot of 100 + 100 + 100 = 300. 100 ÷ 300 = 33%.',
    words: ['Pot odds'],
  },
  {
    prompt: 'You have a flush draw with 9 outs and one card to come. Roughly how often do you hit?',
    options: ['About 9%', 'About 18%', 'About 36%'],
    answer: 1,
    explain: 'With one card to come, multiply your outs by 2: 9 × 2 = 18%. (Exactly it is 9 ÷ 46 = 19.6%.)',
    words: ['Outs', 'Rule of 2 and 4'],
  },
  {
    prompt: 'You hit 18% of the time and calling costs 25% of the final pot. Call or fold?',
    options: ['Call', 'Fold'],
    answer: 1,
    explain: 'Your chance to hit is smaller than the share you pay, so calling loses chips on average. Fold, unless you expect to win a lot more on later streets.',
    words: ['Equity', 'Pot odds'],
  },
];

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function PotOdds() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(50);
  const [outs, setOuts] = useState(9);
  const [cards, setCards] = useState<1 | 2>(1);
  const need = potOddsNeeded(pot, bet);
  const eq = cards === 1 ? equityOneCard(outs) : equityTwoCards(outs);
  const ev = callEV(eq, pot, bet);
  const maxBet = maxCallableBet(eq, pot);

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage 3 · lesson</a>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Pot odds: is the call worth the price?</h1>
        <div className="stack-sm" style={{ maxWidth: '68ch' }}>
          <p>
            When someone bets and you have a <T k="draw" />, two numbers decide whether to call. The first is the{' '}
            <T k="pot odds" plain="what you pay compared to what you can win" />: the share of the final pot you have to put in.
            The second is your <T k="equity" plain="your chance to win" />: how often you'll hit.
          </p>
          <p>
            If your chance to hit is bigger than the share you pay, calling wins chips on average: it has positive{' '}
            <T k="expected value (EV)" plain="average result if you made this call many times" />. Drag the sliders and watch.
          </p>
        </div>
      </div>

      <div className="panel stack-lg">
        <div className="explorer" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <div className="stack">
            <span className="eyebrow">The price</span>
            <label className="stack-sm"><span>Pot before the bet: <b className="mono">{pot}</b></span>
              <input type="range" min={10} max={300} step={5} value={pot} onChange={(e) => setPot(Number(e.target.value))} /></label>
            <label className="stack-sm"><span>Opponent bets: <b className="mono">{bet}</b> ({Math.round((bet / pot) * 100)}% of the pot)</span>
              <input type="range" min={5} max={400} step={5} value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>
            <p className="muted">
              You pay <b>{bet}</b> to win a final pot of <b>{pot + 2 * bet}</b> ({pot} + their {bet} + your {bet}).
              So you need to win {bet} ÷ {pot + 2 * bet} = <b>{pct(need)}</b> of the time to <T k="break-even" />.
            </p>
          </div>
          <div className="stack">
            <span className="eyebrow">Your chance</span>
            <label className="stack-sm"><span>Your <T k="outs" />: <b className="mono">{outs}</b></span>
              <input type="range" min={1} max={20} value={outs} onChange={(e) => setOuts(Number(e.target.value))} /></label>
            <div className="seat-picker" role="group" aria-label="Cards to come">
              <button className={cards === 1 ? 'on' : ''} onClick={() => setCards(1)}>Turn: 1 card to come</button>
              <button className={cards === 2 ? 'on' : ''} onClick={() => setCards(2)}>Flop all-in: 2 cards</button>
            </div>
            <p className="muted">
              {cards === 1
                ? <>{outs} of the 46 unseen cards hit: {outs} ÷ 46 = <b>{pct(eq)}</b>. Quick estimate with the <T k="rule of 2 and 4" />: {outs} × 2 = {outs * 2}%.</>
                : <>Seeing both the turn and the river, you hit at least once {pct(eq)} of the time. Quick estimate: {outs} × 4 = {outs * 4}%.</>}
            </p>
          </div>
        </div>

        <Bars rows={[
          { label: 'Your chance to hit', value: eq, display: pct(eq), color: eq >= need ? 'good' : 'orchid', line: need },
          { label: 'Share you pay', value: need, display: pct(need), color: 'terra' },
        ]} />

        <div className={`feedback ${ev >= 0 ? 'good' : 'bad'}`}>
          <div className="verdict">{ev >= 0 ? 'Call' : 'Fold'}: calling {ev >= 0 ? 'wins' : 'loses'} {Math.abs(ev).toFixed(1)} chips on average.</div>
          <p style={{ marginTop: 6 }}>
            {pct(eq)} × {pot + bet} won − {pct(1 - eq)} × {bet} lost = {ev.toFixed(1)} chips.{' '}
            {Number.isFinite(maxBet) ? <>With {outs} outs you could call a bet of up to <b>{Math.floor(maxBet)}</b> into this pot.</> : 'With this much equity you can call any bet.'}
          </p>
        </div>
      </div>

      <div className="panel stack-sm">
        <h3>The short version</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }} className="stack-sm">
          <li>Share you pay = bet ÷ (pot + bet + bet). A half-pot bet needs 25%, a pot-sized bet needs 33%.</li>
          <li>Chance to hit ≈ outs × 2 with one card to come, outs × 4 with two.</li>
          <li>Call when your chance is higher than the share you pay. Later streets can win you more when you hit (<T k="implied odds" />), but start with the plain math.</li>
        </ul>
      </div>

      <LessonCheck lesson="pot-odds" questions={POT_ODDS_CHECK} />
    </div>
  );
}
