import type { PathNode } from '../lib/roadmap';
import { lessonById, LESSONS } from '../lib/roadmap';
import { href } from '../lib/router';

/** Shown instead of a lesson, drill or table that isn't unlocked yet. */
export function Locked({ node }: { node: PathNode }) {
  const isLesson = node.kind === 'lesson';
  const lesson = isLesson ? LESSONS[LESSONS.findIndex((l) => l.id === node.id) - 1] : node.lesson ? lessonById(node.lesson) : undefined;
  const what = isLesson ? 'lesson' : node.kind === 'play' ? 'table' : 'drill';
  return (
    <div className="wrap">
      <div className="panel stack locked-panel">
        <span className="chip-badge locked" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" /></svg>
        </span>
        <span className="eyebrow">Locked</span>
        <h1 style={{ fontSize: '1.8rem' }}>{node.title}</h1>
        {lesson && (
          <p className="muted">
            This {what} opens once you finish the lesson <b style={{ color: 'var(--fg)' }}>{lesson.title}</b>. Lessons come first, so
            everything after them uses words and ideas you already know.
          </p>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          {lesson && <a className="btn primary" href={href(lesson.path)}>Go to {lesson.title} →</a>}
          <a className="btn" href={href('/')}>Back to the path</a>
        </div>
      </div>
    </div>
  );
}
