import { useCallback, useState } from 'react';
import { genNuts, mulberry32, randomSeed, rankOf, suitOf, SUIT_NAME, CATEGORY_NAME, Category, type Card, type NutsSpot } from '@poker/engine';
import { PlayingCard, CardRow } from '../components/PlayingCard';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord, missWord } from '../lib/storage';
import { lowerFirst } from '../lib/text';

/** What this board makes possible, top of the hand list down. */
function boardChecks(board: Card[]): string[] {
  const ranks = board.map(rankOf);
  const paired = new Set(ranks).size < ranks.length;
  const suitCounts = new Map<string, number>();
  board.forEach((c) => suitCounts.set(suitOf(c), (suitCounts.get(suitOf(c)) ?? 0) + 1));
  const flushSuit = [...suitCounts.entries()].find(([, n]) => n >= 3)?.[0];
  const rs = new Set(ranks);
  if (rs.has(14)) rs.add(1);
  let straight = false;
  for (let low = 1; low <= 10; low++) {
    let k = 0;
    for (let r = low; r < low + 5; r++) if (rs.has(r)) k++;
    if (k >= 3) straight = true;
  }
  const out: string[] = [];
  out.push(paired ? 'The board is paired, so four of a kind and full houses are possible.' : 'No pair on the board, so nobody can have four of a kind or a full house.');
  out.push(flushSuit ? `There are three or more ${SUIT_NAME[flushSuit as 's']} on the board, so a flush is possible.` : 'No three cards share a suit, so no flush is possible.');
  out.push(straight ? 'Three board cards fit inside five ranks in a row, so a straight is possible.' : 'No three board cards fit inside five ranks in a row, so no straight is possible.');
  return out;
}

export function TapTheNuts() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [size, setSize] = useState<3 | 4 | 5>(5);
  const [spot, setSpot] = useState<NutsSpot>(() => genNuts(rng, 5));
  const [picked, setPicked] = useState<number | null>(null);
  const drill = useDrill('nuts');

  const next = useCallback((s = size) => { setSpot(genNuts(rng, s)); setPicked(null); }, [rng, size]);
  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = spot.options[i].isNuts;
    drill.answer(ok);
    if (ok) { creditWord('nuts'); creditWord(CATEGORY_NAME[spot.nuts.category]); } else missWord('nuts');
  };

  const ok = picked !== null && spot.options[picked].isNuts;
  const streetName = size === 3 ? 'flop' : size === 4 ? 'turn' : 'river';

  return (
    <DrillShell
      id="nuts" stage={1} title="Tap the nuts" score={drill} answered={picked !== null} onNext={() => next()}
      intro={<>The <T k="nuts" plain="the best possible hand on this board" /> is the strongest hand anyone could hold right now. Which of these four hands is it?</>}
    >
      <div className="row">
        <span className="muted">Board</span>
        {([3, 4, 5] as const).map((n) => (
          <button key={n} className={'btn small' + (size === n ? ' orchid' : '')} onClick={() => { setSize(n); next(n); }}>
            {n === 3 ? 'Flop' : n === 4 ? 'Turn' : 'River'}
          </button>
        ))}
      </div>

      <div className="felt-strip">
        <div className="label">Board on the {streetName}</div>
        <div className="cards">{spot.board.map((c) => <PlayingCard key={c} card={c} size="lg" animate />)}</div>
      </div>

      <div className="choices">
        {spot.options.map((o, i) => (
          <button
            key={o.hole.join('')}
            className={'btn choice' + (picked !== null && o.isNuts ? ' correct' : '') + (picked === i && !o.isNuts ? ' wrong' : '')}
            onClick={() => choose(i)}
          >
            <span className="stack-sm">
              <CardRow cards={o.hole} size="md" />
              {picked !== null && <span style={{ fontSize: '0.9rem' }}>{o.value.name}{o.isNuts ? ' · the nuts' : ''}</span>}
            </span>
          </button>
        ))}
      </div>

      {picked !== null && (
        <Feedback
          tone={ok ? 'good' : 'bad'}
          openWhy={!ok}
          verdict={ok ? `Yes. ${spot.nuts.name} is the nuts here.` : `Not this one. The nuts here is ${spot.nuts.name.toLowerCase().startsWith('royal') ? 'a royal flush' : lowerFirst(spot.nuts.name)}; your pick only makes ${lowerFirst(spot.options[picked].value.name)}.`}
          detail={spot.nutCombos > 1 ? <span className="muted">{spot.nutCombos} different pairs of hole cards make it.</span> : <span className="muted">Only one pair of hole cards makes it.</span>}
          why={
            <div className="stack-sm">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {boardChecks(spot.board).map((t) => <li key={t}>{t}</li>)}
              </ul>
              <div className="row"><span className="muted">The nut hand's best five:</span> <CardRow cards={spot.nuts.cards} size="sm" /></div>
              {spot.nuts.category <= Category.ThreeOfAKind && <p>With no flush, straight or pair on the board, the best anyone can do is a <T k="set" plain="three of a kind using a pocket pair" /> of the top card.</p>}
            </div>
          }
          rule={<p>Walk down the hand list and stop at the first one the board allows: straight flush, then four of a kind and full house (need a paired board), then flush (three of one suit), then straight (three cards close together), then a set of the highest card.</p>}
        />
      )}
    </DrillShell>
  );
}
