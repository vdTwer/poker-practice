import { useCallback, useState } from 'react';
import { genBestFive, checkBestFive, mulberry32, randomSeed, CATEGORY_NAME, type Card } from '@poker/engine';
import { PlayingCard, CardRow } from '../components/PlayingCard';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord } from '../lib/storage';
import { lowerFirst } from '../lib/text';

export function BestFive() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState(() => genBestFive(rng));
  const [chosen, setChosen] = useState<Card[]>([]);
  const [result, setResult] = useState<ReturnType<typeof checkBestFive> | null>(null);
  const drill = useDrill('best-five');

  const next = useCallback(() => { setSpot(genBestFive(rng)); setChosen([]); setResult(null); }, [rng]);

  const toggle = (c: Card) => {
    if (result) return;
    setChosen((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length < 5 ? [...cur, c] : cur));
  };

  const check = () => {
    const r = checkBestFive(spot, chosen);
    setResult(r);
    drill.answer(r.correct);
    if (r.correct) creditWord(CATEGORY_NAME[spot.best.category]);
  };

  const stateOf = (c: Card) => {
    if (!result) return chosen.includes(c) ? 'selected' : null;
    if (spot.best.cards.includes(c)) return chosen.includes(c) ? 'good' : 'glow';
    return chosen.includes(c) ? 'bad' : 'dim';
  };

  const usesHole = spot.best.cards.filter((c) => spot.hole.includes(c)).length;

  return (
    <DrillShell
      id="best-five" stage={0} title="Build the best five" score={drill} answered={!!result} onNext={next}
      intro={<>You have two <T k="hole cards" /> and there are five cards on the <T k="board" />. Tap the five cards that make your best hand. You can use both, one or even none of your own cards.</>}
    >
      <div className="felt-strip stack">
        <div>
          <div className="label">Board</div>
          <div className="cards">{spot.board.map((c) => <PlayingCard key={c} card={c} size="lg" state={stateOf(c)} onClick={() => toggle(c)} animate />)}</div>
        </div>
        <div>
          <div className="label">Your hole cards</div>
          <div className="cards">{spot.hole.map((c) => <PlayingCard key={c} card={c} size="lg" state={stateOf(c)} onClick={() => toggle(c)} animate />)}</div>
        </div>
      </div>

      {!result && (
        <div className="row">
          <button className="btn primary" disabled={chosen.length !== 5} onClick={check}>
            {chosen.length === 5 ? 'Check my five' : `Pick ${5 - chosen.length} more`}
          </button>
          {chosen.length > 0 && <button className="btn ghost" onClick={() => setChosen([])}>Clear</button>}
        </div>
      )}

      {result && (
        <Feedback
          tone={result.correct ? 'good' : 'bad'}
          openWhy={!result.correct}
          verdict={result.correct ? `Right: ${lowerFirst(spot.best.name)}.` : `Your best is ${lowerFirst(spot.best.name)}. You picked ${lowerFirst(result.value?.name ?? '')}.`}
          why={
            <div className="stack-sm">
              <div className="row"><span className="muted">Best five:</span> <CardRow cards={spot.best.cards} size="sm" /></div>
              <p>
                {usesHole === 2 && 'This uses both of your hole cards. '}
                {usesHole === 1 && 'This uses one of your hole cards and four from the board. '}
                {usesHole === 0 && 'Your hole cards don\'t help: the five board cards are your best hand. When that happens, everyone still in the hand has at least this, so "the board plays". '}
                Hand types come first, so look for the strongest type you can make (flush, straight, pairs) before thinking about the leftover cards.
              </p>
            </div>
          }
          rule={<p>Start from the top of the list: can you make a flush (five of one suit)? A straight (five in a row)? Then pairs and sets. Fill the rest with your highest cards: they are your <T k="kicker">kickers</T>.</p>}
        />
      )}
    </DrillShell>
  );
}
