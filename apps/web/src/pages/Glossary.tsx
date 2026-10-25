import { useMemo, useState } from 'react';
import { GLOSSARY, STAGE_TITLES } from '../lib/glossary';
import { useWordCounts, LEARNED_AFTER, creditWord, missWord } from '../lib/storage';
import { mulberry32, randomSeed, shuffle } from '@poker/engine';

export function Glossary() {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<number | null>(null);
  const counts = useWordCounts();

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return GLOSSARY.filter((g) => (stage === null || g.stage === stage) && (!t || g.term.toLowerCase().includes(t) || g.definition.toLowerCase().includes(t)));
  }, [q, stage]);

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <span className="eyebrow">Poker words</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Glossary</h1>
        <p className="muted" style={{ maxWidth: '64ch' }}>
          Every term the course uses, in plain words, grouped by the stage that teaches it. A word counts as learned once
          you've used it correctly {LEARNED_AFTER} times in drills or the quiz below.
        </p>
      </div>
      <WordQuiz />
      <input className="search" placeholder="Search words or meanings…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the glossary" />
      <div className="stage-filter" role="group" aria-label="Filter by stage">
        <button className={stage === null ? 'on' : ''} onClick={() => setStage(null)}>All</button>
        {STAGE_TITLES.map((t, i) => (
          <button key={t} className={stage === i ? 'on' : ''} onClick={() => setStage(i)} title={t}>Stage {i}</button>
        ))}
      </div>
      <div className="gloss-list">
        {list.map((g) => {
          const uses = counts[g.term.toLowerCase()] ?? 0;
          return (
            <div key={g.term} className="gloss-item">
              <h3>
                {g.term}
                <span className="pill">Stage {g.stage}</span>
                {uses >= LEARNED_AFTER ? <span className="pill" style={{ color: 'var(--good)' }}>Learned</span> : uses > 0 ? <span className="pill orchid">{uses}/{LEARNED_AFTER}</span> : null}
              </h3>
              <p>{g.definition}</p>
              <p className="ex">“{g.example}”</p>
            </div>
          );
        })}
        {list.length === 0 && <p className="muted">No word matches “{q}”.</p>}
      </div>
    </div>
  );
}

/** Which word is this? Shows a definition and four words to pick from, weighted to unlearned words of stages 0 and 1. */
function WordQuiz() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const counts = useWordCounts();
  const make = () => {
    const pool = GLOSSARY.filter((g) => g.stage <= 1);
    const fresh = pool.filter((g) => (counts[g.term.toLowerCase()] ?? 0) < LEARNED_AFTER);
    const target = shuffle(fresh.length ? fresh : pool, rng)[0];
    const others = shuffle(pool.filter((g) => g.term !== target.term && g.stage === target.stage), rng).slice(0, 3);
    return { target, options: shuffle([target, ...others], rng) };
  };
  const [round, setRound] = useState(make);
  const [picked, setPicked] = useState<string | null>(null);
  const ok = picked === round.target.term;

  const choose = (t: string) => {
    if (picked) return;
    setPicked(t);
    if (t === round.target.term) creditWord(t); else missWord(round.target.term);
  };

  return (
    <div className="panel stack">
      <div className="row"><span className="eyebrow">Quick quiz · which word is this?</span></div>
      <p style={{ fontSize: '1.08rem' }}>{round.target.definition.replace(new RegExp(round.target.term, 'ig'), '___')}</p>
      <div className="choices">
        {round.options.map((o) => (
          <button key={o.term} className={'btn choice' + (picked && o.term === round.target.term ? ' correct' : '') + (picked === o.term && !ok ? ' wrong' : '')} onClick={() => choose(o.term)}>
            {o.term}
          </button>
        ))}
      </div>
      {picked && (
        <div className="row">
          <span style={{ color: ok ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>{ok ? 'Right.' : `It's “${round.target.term}”.`}</span>
          <span className="muted">“{round.target.example}”</span>
          <button className="btn small primary" onClick={() => { setRound(make()); setPicked(null); }} autoFocus>Next word →</button>
        </div>
      )}
    </div>
  );
}
