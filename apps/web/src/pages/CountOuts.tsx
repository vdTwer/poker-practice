import { useCallback, useState } from 'react';
import { genOuts, mulberry32, randomSeed, RANKS, SUITS, rankOf, rankName, suitOf, SUIT_NAME, evaluate, type Card, type OutsSpot } from '@poker/engine';
import { PlayingCard } from '../components/PlayingCard';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord, missWord } from '../lib/storage';
import { lowerFirst } from '../lib/text';

const DRAW_TERM: Record<string, string> = { 'flush draw': 'Draw', 'open-ender': 'Open-ender', 'double gutshot': 'Gutshot', gutshot: 'Gutshot' };

export function CountOuts() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState<OutsSpot>(() => genOuts(rng));
  const [tapped, setTapped] = useState<Card[]>([]);
  const [checked, setChecked] = useState(false);
  const drill = useDrill('outs');

  const next = useCallback(() => { setSpot(genOuts(rng)); setTapped([]); setChecked(false); }, [rng]);
  const known = [...spot.hole, ...spot.board];
  const outs = spot.result.outs;
  const exact = tapped.length === outs.length && tapped.every((c) => outs.includes(c));

  const toggle = (c: Card) => {
    if (checked || known.includes(c)) return;
    setTapped((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]));
  };
  const check = () => {
    setChecked(true);
    drill.answer(exact);
    if (exact) { creditWord('outs'); spot.result.draws.forEach((d) => DRAW_TERM[d] && creditWord(DRAW_TERM[d])); }
    else missWord('outs');
  };

  const stateOf = (c: Card) => {
    if (known.includes(c)) return 'dim';
    if (!checked) return tapped.includes(c) ? 'selected' : null;
    if (outs.includes(c)) return tapped.includes(c) ? 'good' : 'glow';
    return tapped.includes(c) ? 'bad' : null;
  };

  const now = evaluate(known);
  const flushSuit = spot.result.flushOuts[0] ? suitOf(spot.result.flushOuts[0]) : null;
  const straightRanks = [...new Set(spot.result.straightOuts.map(rankOf))].sort((a, b) => b - a);
  const missed = outs.filter((c) => !tapped.includes(c)).length;
  const extra = tapped.filter((c) => !outs.includes(c)).length;

  return (
    <DrillShell
      id="outs" stage={1} title="Count your outs" score={drill} answered={checked} onNext={next}
      intro={<>You have a <T k="draw" plain="a hand that needs one more card" />. Tap every card still in the deck that would complete your straight or flush. Those are your <T k="outs" plain="the cards that make your hand" />.</>}
    >
      <div className="felt-strip row" style={{ gap: 28, alignItems: 'flex-start' }}>
        <div>
          <div className="label">Your hand</div>
          <div className="cards">{spot.hole.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}</div>
        </div>
        <div>
          <div className="label">Board ({spot.board.length === 3 ? 'flop' : 'turn'})</div>
          <div className="cards">
            {spot.board.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}
            {spot.board.length === 3 && <PlayingCard slot size="lg" />}
            <PlayingCard slot size="lg" />
          </div>
        </div>
      </div>

      <div className="panel stack">
        <div className="row">
          <b>Unseen cards</b>
          <span className="muted">Tap your outs. Greyed cards are already on the table.</span>
          <span className="spacer" />
          <span className="pill orchid mono">{tapped.length} tapped</span>
        </div>
        <div className="stack-sm">
          {SUITS.map((s) => (
            <div key={s} className="grid-cards">
              {[...RANKS].reverse().map((r) => {
                const c = r + s;
                return <PlayingCard key={c} card={c} size="sm" state={stateOf(c)} onClick={known.includes(c) ? undefined : () => toggle(c)} />;
              })}
            </div>
          ))}
        </div>
        {!checked && (
          <div className="row">
            <button className="btn primary" onClick={check} disabled={tapped.length === 0}>Check</button>
            {tapped.length > 0 && <button className="btn ghost" onClick={() => setTapped([])}>Clear</button>}
          </div>
        )}
      </div>

      {checked && (
        <Feedback
          tone={exact ? 'good' : 'bad'}
          openWhy={!exact}
          verdict={exact ? `Right: ${outs.length} outs.` : `You have ${outs.length} outs. You tapped ${tapped.length - extra} of them${extra ? ` and ${extra} card${extra > 1 ? 's' : ''} that don't help` : ''}.`}
          detail={<>Right now you have {lowerFirst(now.name)} and a <b>{spot.result.label}</b>. {missed > 0 && !exact ? `The ${missed} you missed glow in orchid.` : ''}</>}
          why={
            <ul style={{ margin: 0, paddingLeft: 20 }} className="stack-sm">
              {flushSuit && (
                <li>
                  <b>Flush outs: {spot.result.flushOuts.length}.</b> You have four {SUIT_NAME[flushSuit]}. Each suit has 13 cards, so 13 − 4 = 9 are left.
                </li>
              )}
              {straightRanks.length > 0 && (
                <li>
                  <b>Straight outs: {spot.result.straightOuts.length}.</b> Any {straightRanks.map((r) => rankName(r)).join(' or any ')} makes your straight. Each rank has four cards
                  {flushSuit ? `, minus the ${SUIT_NAME[flushSuit]} already counted as flush outs` : ''}.
                </li>
              )}
              <li>A card is only counted once, even if it completes both draws.</li>
            </ul>
          }
          rule={
            <p>
              Memorise the common counts: flush draw 9, <T k="open-ender" plain="four in a row, open at both ends" /> 8,{' '}
              <T k="gutshot" plain="missing one card in the middle" /> 4, flush draw plus open-ender 15. In stage 3 you'll turn outs into a percentage chance to hit.
            </p>
          }
        />
      )}
    </DrillShell>
  );
}
