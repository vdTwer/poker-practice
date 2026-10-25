import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { lookup, STAGE_TITLES } from '../lib/glossary';
import { useWordCounts, LEARNED_AFTER } from '../lib/storage';

interface Props {
  /** Glossary term to show; defaults to the text itself. */
  k?: string;
  /** Short plain-language gloss shown in brackets until the word is learned. */
  plain?: string;
  children?: ReactNode;
}

/**
 * A poker word you can tap for its meaning. While the word is new, its plain
 * explanation follows it in brackets; it fades out once you've used it correctly
 * three times, and comes back if you miss it later.
 */
export function T({ k, plain, children }: Props) {
  const label = children ?? k;
  const key = k ?? (typeof children === 'string' ? children : '');
  const entry = lookup(key);
  const counts = useWordCounts();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  if (!entry) return <>{label}</>;
  const learned = (counts[entry.term.toLowerCase()] ?? 0) >= LEARNED_AFTER;
  return (
    <>
      <button ref={btn} type="button" className="term" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {label}
      </button>
      {plain && !learned && <span className="term-plain"> ({plain})</span>}
      {open && <TermPopover anchor={btn.current} term={entry.term} onClose={() => setOpen(false)} />}
    </>
  );
}

function TermPopover({ anchor, term, onClose }: { anchor: HTMLElement | null; term: string; onClose: () => void }) {
  const entry = lookup(term)!;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: 0 });
  const counts = useWordCounts();
  const uses = counts[entry.term.toLowerCase()] ?? 0;

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    let top = a.bottom + 8;
    if (top + p.height > window.innerHeight - 8) top = Math.max(8, a.top - p.height - 8);
    const left = Math.min(Math.max(8, a.left + a.width / 2 - p.width / 2), window.innerWidth - p.width - 8);
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className="popover" role="dialog" aria-label={entry.term} style={pos}>
      <div className="row" style={{ gap: 8, marginBottom: 2 }}>
        <h4>{entry.term}</h4>
        <span className="pill">Stage {entry.stage}</span>
      </div>
      <p>{entry.definition}</p>
      <p className="ex">“{entry.example}”</p>
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
        {uses >= LEARNED_AFTER ? 'You know this word.' : `Used correctly ${uses} of ${LEARNED_AFTER} times.`} · {STAGE_TITLES[entry.stage]}
      </p>
    </div>,
    document.body,
  );
}
