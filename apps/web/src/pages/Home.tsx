import { useEffect, useState } from 'react';
import { href } from '../lib/router';
import { GLOSSARY } from '../lib/glossary';
import { useCompletedLessons, useDrillScores, useWordCounts, LEARNED_AFTER } from '../lib/storage';
import { STAGES, LESSONS, PRACTISED_AFTER, lessonById, nextUp, nodeState, type PathNode, type NodeState, type Stage } from '../lib/roadmap';
import { T } from '../components/Term';

// The learning path: one winding trail of poker chips per stage. Lessons are the big
// terra cotta chips; the drills they unlock hang off the trail in orchid.

/** Horizontal offsets of the trail, in steps; repeats down the page. */
const SWAY = [0, 0.9, 1.4, 0.9, 0, -0.9, -1.4, -0.9];
const ROW = 118;
const STEP = 58;
const WIDTH = 340;
const CARD = 264;

const KIND_LABEL: Record<PathNode['kind'], string> = { lesson: 'Lesson', drill: 'Drill', words: 'Words', play: 'Table' };

function Icon({ kind, state }: { kind: PathNode['kind']; state: NodeState }) {
  const p = { width: 28, height: 28, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  if (state === 'locked') return <svg {...p}><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" /></svg>;
  if (state === 'done') return <svg {...p}><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
  if (kind === 'lesson') return <svg {...p}><path fill="currentColor" d="M3 5.5C5.5 4 8.5 4 11 5.5v14C8.5 18 5.5 18 3 19.5v-14Zm10 0c2.5-1.5 5.5-1.5 8 0v14c-2.5-1.5-5.5-1.5-8 0v-14Z" /></svg>;
  if (kind === 'words') return <svg {...p}><text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor" fontFamily="var(--font-display)">Aa</text></svg>;
  if (kind === 'play') return <svg {...p}><path fill="currentColor" d="M12 2.5C9 7 4 9.2 4 13.3c0 2.5 2 4.2 4.2 4.2 1.3 0 2.3-.5 2.9-1.3-.2 1.9-1 3.4-2.6 4.3h7c-1.6-.9-2.4-2.4-2.6-4.3.6.8 1.6 1.3 2.9 1.3 2.2 0 4.2-1.7 4.2-4.2C20 9.2 15 7 12 2.5Z" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>;
}

function Trail({ stage, offset, selected, onSelect }: { stage: Stage; offset: number; selected: string | null; onSelect: (id: string | null) => void }) {
  const completed = useCompletedLessons();
  const scores = useDrillScores();
  const next = nextUp(completed, scores);
  const pts = stage.nodes.map((_, i) => ({ x: WIDTH / 2 + SWAY[(i + offset) % SWAY.length] * STEP, y: ROW / 2 + i * ROW }));
  const states = stage.nodes.map((n) => nodeState(n, completed, scores));

  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => `M${a.x} ${a.y} C${a.x} ${a.y + ROW / 2} ${b.x} ${b.y - ROW / 2} ${b.x} ${b.y}`;

  return (
    <div className="trail" style={{ height: stage.nodes.length * ROW, width: WIDTH }}>
      <svg className="trail-line" width={WIDTH} height={stage.nodes.length * ROW} aria-hidden="true">
        {pts.slice(1).map((b, i) => (
          <path key={i} d={seg(pts[i], b)} className={states[i + 1] !== 'locked' ? 'lit' : ''} />
        ))}
      </svg>
      {stage.nodes.map((n, i) => {
        const st = states[i];
        const s = scores[n.id];
        const isNext = next?.id === n.id;
        const ring = n.kind !== 'lesson' && st !== 'locked' ? Math.min(1, (s?.total ?? 0) / PRACTISED_AFTER) : 0;
        const left = pts[i].x;
        return (
          <div key={n.id} className={'trail-stop' + (selected === n.id ? ' open' : '')} style={{ top: i * ROW, left }}>
            {isNext && <span className="next-flag">{n.kind === 'lesson' ? 'Start' : 'Next'}</span>}
            <button
              className={`chip ${n.kind} ${st}${isNext ? ' next' : ''}${selected === n.id ? ' sel' : ''}`}
              style={ring > 0 && st !== 'done' ? { ['--ring' as string]: `${ring * 360}deg` } : undefined}
              aria-label={`${KIND_LABEL[n.kind]}: ${n.title}${st === 'locked' ? ' (locked)' : st === 'done' ? ' (done)' : ''}`}
              aria-expanded={selected === n.id}
              onClick={(e) => { e.stopPropagation(); onSelect(selected === n.id ? null : n.id); }}
            >
              <span className="chip-face"><Icon kind={n.kind} state={st} /></span>
            </button>
            <span className={'chip-label' + (st === 'locked' ? ' dim' : '')}>{n.title}</span>
            {selected === n.id && <NodeCard node={n} state={st} shift={Math.max(0, Math.min(WIDTH - CARD, left - CARD / 2)) - left} />}
          </div>
        );
      })}
    </div>
  );
}

function NodeCard({ node, state, shift }: { node: PathNode; state: NodeState; shift: number }) {
  const s = useDrillScores()[node.id];
  const completed = useCompletedLessons();
  let gate: PathNode | undefined;
  if (state === 'locked') gate = node.kind === 'lesson' ? LESSONS[LESSONS.findIndex((l) => l.id === node.id) - 1] : lessonById(node.lesson!);
  const action = state === 'locked' ? null
    : node.kind === 'lesson' ? (state === 'done' ? 'Review the lesson' : 'Start the lesson')
    : node.kind === 'play' ? 'Sit down'
    : s ? 'Keep practising' : 'Start';
  return (
    <div className={`node-card ${node.kind} ${state}`} style={{ width: CARD, marginLeft: shift + 80 }} role="dialog" aria-label={node.title} onClick={(e) => e.stopPropagation()}>
      <span className="eyebrow">{KIND_LABEL[node.kind]}{state === 'done' ? (node.kind === 'lesson' ? ' · finished' : ' · practised') : state === 'locked' ? ' · locked' : ''}</span>
      <b className="node-title">{node.title}</b>
      <p>{node.text}</p>
      {s && node.kind !== 'lesson' && (
        <span className="mono node-stats">{s.right}/{s.total} right · best streak {s.best}{s.total < PRACTISED_AFTER ? ` · ${PRACTISED_AFTER - s.total} more to mark it practised` : ''}</span>
      )}
      {node.kind === 'lesson' && state === 'done' && <span className="mono node-stats">Finished {new Date(completed[node.id]).toLocaleDateString()}</span>}
      {gate && <p className="muted">Finish <a href={href(gate.path)}>{gate.title}</a> to unlock this.</p>}
      {action && <a className={'btn ' + (node.kind === 'lesson' ? 'primary' : 'orchid')} href={href(node.path)}>{action} →</a>}
    </div>
  );
}

export function Home() {
  const completed = useCompletedLessons();
  const scores = useDrillScores();
  const counts = useWordCounts();
  const [selected, setSelected] = useState<string | null>(null);
  const learned = GLOSSARY.filter((g) => (counts[g.term.toLowerCase()] ?? 0) >= LEARNED_AFTER).length;
  const lessonsDone = LESSONS.filter((l) => completed[l.id]).length;
  const next = nextUp(completed, scores);

  useEffect(() => {
    if (!selected) return;
    const close = () => setSelected(null);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, [selected]);

  const words = (stage: number) => (
    <div className="words-preview">
      {GLOSSARY.filter((g) => g.stage === stage).map((g) => (
        <span key={g.term} className={'word-chip' + ((counts[g.term.toLowerCase()] ?? 0) >= LEARNED_AFTER ? ' learned' : '')}>
          <T k={g.term} />
        </span>
      ))}
    </div>
  );

  let offset = 0;
  return (
    <div className="wrap">
      <section className="hero path-hero">
        <h1>Learn No-Limit Hold'em, one idea at a time.</h1>
        <p className="lede">
          No poker knowledge needed. Follow the path: each lesson unlocks the drills that practise it. Every poker word is
          underlined, so tap it to see what it means.
        </p>
        <div className="path-progress">
          <div className="stack-sm">
            <span className="mono muted" style={{ fontSize: '0.85rem' }}>{lessonsDone} of {LESSONS.length} lessons · {learned} of {GLOSSARY.length} words learned</span>
            <div className="meter" aria-hidden="true"><span style={{ width: `${(lessonsDone / LESSONS.length) * 100}%` }} /></div>
          </div>
          {next && <a className="btn primary" href={href(next.path)}>{lessonsDone === 0 && !Object.keys(scores).length ? 'Start with your first hand' : `Continue: ${next.title}`} →</a>}
        </div>
      </section>

      {STAGES.map((stage) => {
        const first = stage.nodes[0];
        const stageLocked = nodeState(first, completed, scores) === 'locked';
        const done = stage.nodes.filter((n) => nodeState(n, completed, scores) === 'done').length;
        const trail = <Trail stage={stage} offset={offset} selected={selected} onSelect={setSelected} />;
        offset += stage.nodes.length;
        return (
          <section key={stage.n} className={'path-stage' + (stageLocked ? ' locked' : '')} aria-labelledby={`stage-${stage.n}`}>
            <header className={'stage-banner s' + (stage.n % 2)}>
              <span className="stage-num">{stage.n}</span>
              <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
                <span className="eyebrow">{stage.eyebrow}</span>
                <h2 id={`stage-${stage.n}`}>{stage.title}</h2>
                <p>{stage.text}</p>
              </div>
              <span className="mono stage-count">{done}/{stage.nodes.length}</span>
            </header>
            <div className="trail-wrap">{trail}</div>
            <details className="stage-words">
              <summary className="muted">Words in this stage</summary>
              <div style={{ marginTop: 10 }}>{words(stage.n)}</div>
            </details>
          </section>
        );
      })}

      <section className="path-stage locked">
        <header className="stage-banner soon">
          <span className="stage-num">4+</span>
          <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">Coming next</span>
            <h2>Bots, coaching and beyond</h2>
            <p>Bot personalities and a coach who pauses at key decisions come next, then stages 4 to 8.</p>
          </div>
        </header>
      </section>
    </div>
  );
}
