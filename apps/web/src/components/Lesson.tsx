import { useEffect, useState, type ReactNode } from 'react';
import { completeLesson, creditWord, useCompletedLessons } from '../lib/storage';
import { ALL_NODES, lessonById, LESSONS } from '../lib/roadmap';
import { href } from '../lib/router';

export interface CheckQuestion {
  prompt: ReactNode;
  options: string[];
  answer: number;
  /** Shown after any answer: why the right one is right. */
  explain: ReactNode;
  /** Glossary words credited for a right answer. */
  words?: string[];
}

/**
 * A short check at the end of a lesson. Every question has to be answered right (you can
 * retry after reading the explanation); then the lesson counts as finished and its drills unlock.
 */
export function LessonCheck({ lesson, questions, title = 'Check your understanding' }: { lesson: string; questions: CheckQuestion[]; title?: string }) {
  const done = !!useCompletedLessons()[lesson];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [retake, setRetake] = useState(false);
  const q = questions[i];
  const right = picked === q?.answer;

  const pick = (k: number) => {
    if (picked !== null && right) return;
    setPicked(k);
    if (k === q.answer) q.words?.forEach((w) => creditWord(w));
  };
  const next = () => {
    if (i + 1 < questions.length) { setI(i + 1); setPicked(null); }
    else { setFinished(true); completeLesson(lesson); }
  };

  if (finished || (done && !retake)) {
    return <LessonComplete lesson={lesson} onRetake={() => { setI(0); setPicked(null); setFinished(false); setRetake(true); }} />;
  }

  return (
    <div className="panel stack" id="check">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow">{title}</span>
        <span className="mono muted" style={{ fontSize: '0.85rem' }}>{i + 1} of {questions.length}</span>
      </div>
      <b style={{ fontSize: '1.08rem' }}>{q.prompt}</b>
      <div className="choices">
        {q.options.map((o, k) => (
          <button
            key={o}
            className={'btn choice' + (picked !== null && right && k === q.answer ? ' correct' : '') + (picked === k && !right ? ' wrong' : '')}
            onClick={() => pick(k)}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`feedback ${right ? 'good' : 'bad'}`}>
          <div className="verdict">{right ? 'Right.' : 'Not quite. Read this and try again.'}</div>
          <div style={{ marginTop: 6 }}>{q.explain}</div>
        </div>
      )}
      {right && <div className="row"><button className="btn primary" onClick={next} autoFocus>{i + 1 < questions.length ? 'Next question →' : 'Finish the lesson'}</button></div>}
    </div>
  );
}

/** "Lesson complete" card listing what just unlocked. */
export function LessonComplete({ lesson, onRetake }: { lesson: string; onRetake?: () => void }) {
  const unlocked = ALL_NODES.filter((n) => n.lesson === lesson);
  const idx = LESSONS.findIndex((l) => l.id === lesson);
  const nextLesson = LESSONS[idx + 1];
  useEffect(() => { completeLesson(lesson); }, [lesson]);
  return (
    <div className="panel stack lesson-done">
      <div className="row" style={{ gap: 14 }}>
        <span className="chip-badge done" aria-hidden="true" />
        <div className="stack-sm">
          <span className="eyebrow">Lesson complete</span>
          <h2 style={{ fontSize: '1.4rem' }}>{lessonById(lesson)?.title}</h2>
        </div>
      </div>
      {unlocked.length > 0 && (
        <div className="stack-sm">
          <span className="muted">Now unlocked:</span>
          <div className="row">
            {unlocked.map((n) => <a key={n.id} className="btn orchid" href={href(n.path)}>{n.title} →</a>)}
          </div>
        </div>
      )}
      <div className="row">
        {nextLesson && <a className="btn primary" href={href(nextLesson.path)}>Next lesson: {nextLesson.title} →</a>}
        <a className="btn" href={href('/')}>Back to the path</a>
        {onRetake && <button className="btn ghost" onClick={onRetake}>Take the check again</button>}
      </div>
    </div>
  );
}

export interface Step {
  text: ReactNode;
  visual?: ReactNode;
  question?: CheckQuestion;
}

/** A lesson made of steps, each with text, an optional picture and an optional question. */
export function StepLesson({ lesson, stage, title, steps }: { lesson: string; stage: number; title: string; steps: Step[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const step = steps[i];
  const q = step.question;
  const right = q ? picked === q.answer : true;
  const last = i === steps.length - 1;

  const go = (d: number) => { setPicked(null); setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))); };
  const pick = (k: number) => {
    if (!q || (picked !== null && right)) return;
    setPicked(k);
    if (k === q.answer) q.words?.forEach((w) => creditWord(w));
  };

  return (
    <div className="wrap stack-lg">
      <div className="stack-sm">
        <a href={href('/')} className="eyebrow" style={{ textDecoration: 'none' }}>← Stage {stage} · lesson</a>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>{title}</h1>
      </div>
      {finished ? <LessonComplete lesson={lesson} onRetake={() => { setFinished(false); setI(0); setPicked(null); }} /> : (
        <div className="lesson-grid">
          <div>{step.visual}</div>
          <div className="panel stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Step {i + 1} of {steps.length}</span>
              <div className="progress-dots" aria-hidden="true">{steps.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div>
            </div>
            <div className="lesson-text stack-sm">{step.text}</div>
            {q && (
              <div className="stack-sm">
                <b>{q.prompt}</b>
                <div className="choices">
                  {q.options.map((o, k) => (
                    <button key={o} className={'btn choice' + (picked !== null && right && k === q.answer ? ' correct' : '') + (picked === k && !right ? ' wrong' : '')} onClick={() => pick(k)}>{o}</button>
                  ))}
                </div>
                {picked !== null && <p style={{ color: right ? 'var(--good)' : 'var(--bad)' }}>{right ? 'Right. ' : 'Not quite, try again. '}<span style={{ color: 'var(--fg)' }}>{q.explain}</span></p>}
              </div>
            )}
            <div className="lesson-controls">
              <button className="btn" onClick={() => go(-1)} disabled={i === 0}>← Back</button>
              {!last && <button className="btn primary" onClick={() => go(1)} disabled={!right}>{right ? 'Next →' : 'Answer to continue'}</button>}
              {last && <button className="btn primary" onClick={() => { setFinished(true); completeLesson(lesson); }} disabled={!right}>Finish the lesson</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
