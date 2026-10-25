import { useCallback, useState } from 'react';
import { genTexture, mulberry32, randomSeed, type TextureSpot } from '@poker/engine';
import { PlayingCard } from '../components/PlayingCard';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord, missWord } from '../lib/storage';

export function WetOrDry() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState<TextureSpot>(() => genTexture(rng));
  const [picked, setPicked] = useState<'wet' | 'dry' | null>(null);
  const drill = useDrill('wet-dry');
  const next = useCallback(() => { setSpot(genTexture(rng)); setPicked(null); }, [rng]);

  const answer = spot.texture.kind as 'wet' | 'dry';
  const ok = picked === answer;
  const choose = (k: 'wet' | 'dry') => {
    if (picked) return;
    setPicked(k);
    drill.answer(k === answer);
    const term = answer === 'wet' ? 'Wet board' : 'Dry board';
    if (k === answer) { creditWord(term); creditWord('board texture'); if (spot.texture.suits === 'rainbow') creditWord('rainbow'); }
    else missWord(term);
  };

  return (
    <DrillShell
      id="wet-dry" stage={1} title="Wet or dry?" score={drill} answered={!!picked} onNext={next}
      intro={<>A <T k="wet board" plain="many straights and flushes possible" /> gives lots of hands a <T k="draw" />. A <T k="dry board" plain="few draws possible" /> doesn't. Look at the suits and how close the ranks are.</>}
    >
      <div className="felt-strip">
        <div className="label">The flop</div>
        <div className="cards">{spot.flop.map((c) => <PlayingCard key={c} card={c} size="xl" animate />)}</div>
      </div>
      <div className="choices" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {(['wet', 'dry'] as const).map((k) => (
          <button key={k} className={'btn choice' + (picked && k === answer ? ' correct' : '') + (picked === k && !ok ? ' wrong' : '')} onClick={() => choose(k)} style={{ justifyContent: 'center', fontSize: '1.1rem' }}>
            {k === 'wet' ? 'Wet' : 'Dry'}
          </button>
        ))}
      </div>
      {picked && (
        <Feedback
          tone={ok ? 'good' : 'bad'}
          openWhy
          verdict={ok ? `Right, this flop is ${answer}.` : `This flop is ${answer}.`}
          why={<ul style={{ margin: 0, paddingLeft: 20 }}>{spot.texture.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          rule={<p>Check two things. Suits: three of one suit is very wet, two is a little wet, three different suits (a <T k="rainbow" />) is dry. Ranks: three cards close together like 9-8-7 are wet, spread out like K-7-2 are dry. A paired board is usually dry.</p>}
          ruleLabel="How to judge any flop"
        />
      )}
    </DrillShell>
  );
}
