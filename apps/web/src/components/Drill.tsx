import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { recordDrill, useDrillScores } from '../lib/storage';
import { href } from '../lib/router';

/** Score keeping for one drill session. */
export function useDrill(id: string) {
  const [right, setRight] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const answer = useCallback((correct: boolean) => {
    setTotal((t) => t + 1);
    if (correct) setRight((r) => r + 1);
    setStreak((s) => {
      const next = correct ? s + 1 : 0;
      recordDrill(id, correct, next);
      return next;
    });
  }, [id]);
  return { right, total, streak, answer };
}

interface ShellProps {
  id: string;
  stage: number;
  title: string;
  intro: ReactNode;
  score: { right: number; total: number; streak: number };
  children: ReactNode;
  /** Shown once the spot is answered. */
  onNext?: () => void;
  answered?: boolean;
}

export function DrillShell({ id, stage, title, intro, score, children, onNext, answered }: ShellProps) {
  const saved = useDrillScores()[id];
  useEffect(() => {
    if (!answered || !onNext) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, onNext]);

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
            <span><b>{score.right}</b>/{score.total} right</span>
            <span>streak <b>{score.streak}</b></span>
            {saved && <span>best <b>{saved.best}</b></span>}
          </div>
        </div>
      </div>
      {children}
      {answered && onNext && (
        <div className="row">
          <button className="btn primary" onClick={onNext} autoFocus>Next spot →</button>
          <span className="muted" style={{ fontSize: '0.85rem' }}>or press <span className="kbd">Enter</span></span>
        </div>
      )}
    </div>
  );
}
