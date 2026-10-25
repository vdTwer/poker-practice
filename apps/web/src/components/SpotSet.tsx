import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { type Grade, GRADE_LABEL } from '@poker/engine';
import { Feedback } from './Feedback';
import { recordDrill, useDrillScores } from '../lib/storage';
import { href } from '../lib/router';

// The drill framework: a set of spots answered one by one, each graded by how much the
// choice cost (best, fine, small mistake, big mistake), then a review of the biggest
// mistakes at the end. Close spots ("fine") never count as failures.

export interface SpotResult {
  grade: Grade;
  /** Cost of the choice in the drill's unit (chips, big blinds, percentage points). */
  cost: number;
  /** One line naming the spot, e.g. "Cutoff, 6 players, K9o: you folded". */
  title: string;
  /** The layer-1 verdict, kept for the review. */
  verdict: string;
  /** The key reason, kept for the review. */
  reason: string;
}

export function useSpotSet(id: string, size: number) {
  const [results, setResults] = useState<SpotResult[]>([]);
  const [answered, setAnswered] = useState<SpotResult | null>(null);
  const [streak, setStreak] = useState(0);

  const record = useCallback((r: SpotResult) => {
    setAnswered(r);
    setResults((rs) => [...rs, r]);
    const ok = r.grade === 'best' || r.grade === 'fine';
    setStreak((s) => {
      const next = ok ? s + 1 : 0;
      recordDrill(id, ok, next);
      return next;
    });
  }, [id]);

  const restart = useCallback(() => { setResults([]); setAnswered(null); }, []);
  return { results, answered, setAnswered, record, restart, size, streak };
}

export type SpotSetState = ReturnType<typeof useSpotSet>;

const TONE: Record<Grade, 'good' | 'close' | 'small' | 'bad'> = { best: 'good', fine: 'close', small: 'small', big: 'bad' };

export function GradedFeedback({ grade, verdict, cost, why, rule, ruleLabel = 'What would change the answer?' }: {
  grade: Grade;
  verdict: ReactNode;
  cost?: ReactNode;
  why: ReactNode;
  rule: ReactNode;
  ruleLabel?: string;
}) {
  return (
    <Feedback
      tone={TONE[grade]}
      openWhy={grade === 'small' || grade === 'big'}
      verdict={<><span className={`grade-pill ${grade}`}>{GRADE_LABEL[grade]}</span>{verdict}</>}
      detail={cost}
      why={why}
      rule={rule}
      ruleLabel={ruleLabel}
    />
  );
}

/** Horizontal bars for the numbers that decide a spot. */
export function Bars({ rows }: { rows: { label: ReactNode; value: number; max?: number; display: string; color: 'terra' | 'orchid' | 'good'; line?: number }[] }) {
  return (
    <div className="bars">
      {rows.map((r, i) => {
        const max = r.max ?? 1;
        return (
          <div key={i} className="bar-row">
            <span className="bar-label">{r.label}</span>
            <div className="bar-track">
              <div className={`bar-fill ${r.color}`} style={{ width: `${Math.min(100, (r.value / max) * 100)}%` }} />
              {r.line !== undefined && <div className="bar-line" style={{ left: `calc(${Math.min(100, (r.line / max) * 100)}% - 1px)` }} title="Break-even" />}
            </div>
            <span className="bar-val">{r.display}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ShellProps {
  id: string;
  stage: number;
  title: string;
  intro: ReactNode;
  set: SpotSetState;
  /** Formats a cost for the review, e.g. "4.2 chips". */
  unit: (cost: number) => string;
  onNext: () => void;
  children: ReactNode;
  toolbar?: ReactNode;
}

/** Frame for a graded drill: progress through the set, the spot, then the end-of-set review. */
export function SpotSetShell({ id, stage, title, intro, set, unit, onNext, children, toolbar }: ShellProps) {
  const saved = useDrillScores()[id];
  const finished = set.results.length >= set.size && !set.answered;

  const next = useCallback(() => { set.setAnswered(null); if (set.results.length < set.size) onNext(); }, [set, onNext]);

  useEffect(() => {
    if (!set.answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set.answered, next]);

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage {stage} · drills</a>
        <div className="drill-head">
          <div className="stack-sm" style={{ flex: '1 1 320px' }}>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>{title}</h1>
            <div className="muted" style={{ maxWidth: '68ch' }}>{intro}</div>
          </div>
          <div className="score" aria-label="Score">
            <span>spot <b>{Math.min(set.results.length + (set.answered ? 0 : 1), set.size)}</b>/{set.size}</span>
            <span>streak <b>{set.streak}</b></span>
            {saved && <span>best <b>{saved.best}</b></span>}
          </div>
        </div>
        <div className="set-progress" aria-hidden="true">
          {Array.from({ length: set.size }, (_, i) => {
            const r = set.results[i];
            return <span key={i} className={r ? r.grade : i === set.results.length ? 'now' : ''} />;
          })}
        </div>
        {toolbar}
      </div>

      {finished ? <SetSummary results={set.results} unit={unit} onAgain={() => { set.restart(); onNext(); }} /> : children}

      {set.answered && (
        <div className="row">
          <button className="btn primary" onClick={next} autoFocus>
            {set.results.length >= set.size ? 'See your review →' : 'Next spot →'}
          </button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>or press <span className="kbd">Enter</span></span>
        </div>
      )}
    </div>
  );
}

function SetSummary({ results, unit, onAgain }: { results: SpotResult[]; unit: (n: number) => string; onAgain: () => void }) {
  const count = (g: Grade) => results.filter((r) => r.grade === g).length;
  const lost = results.reduce((s, r) => s + r.cost, 0);
  const worst = results.filter((r) => r.grade === 'small' || r.grade === 'big').sort((a, b) => b.cost - a.cost).slice(0, 3);
  const passed = count('best') + count('fine');
  return (
    <div className="stack">
      <div className="panel stack">
        <span className="eyebrow">Set complete</span>
        <h2>{passed} of {results.length} spots right or close</h2>
        <div className="summary-grades">
          {(['best', 'fine', 'small', 'big'] as Grade[]).map((g) => (
            <div key={g}><span className={`grade-pill ${g}`}>{GRADE_LABEL[g]}</span><b>{count(g)}</b></div>
          ))}
        </div>
        <p className="muted">Estimated total cost of your mistakes: <b style={{ color: 'var(--fg)' }}>{unit(lost)}</b>. Close spots count as right.</p>
      </div>
      <div className="stack-sm">
        <h3>{worst.length ? 'Your biggest mistakes, to review' : 'No real mistakes in this set. Nicely done.'}</h3>
        {worst.map((m, i) => (
          <div key={i} className="mistake">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{m.title}</b>
              <span><span className={`grade-pill ${m.grade}`}>{GRADE_LABEL[m.grade]}</span><span className="mono">−{unit(m.cost)}</span></span>
            </div>
            <span>{m.verdict}</span>
            <span className="muted">{m.reason}</span>
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={onAgain} autoFocus>Start another set</button>
        <a className="btn" href={href('/')}>Back to the stages</a>
      </div>
    </div>
  );
}
