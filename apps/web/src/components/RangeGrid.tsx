import { useRef } from 'react';
import { gridHand, type HandClass } from '@poker/engine';

export type CellState = 'in' | 'out' | 'hit' | 'miss' | 'extra';

interface Props {
  /** Decides how each cell looks. */
  stateOf: (h: HandClass) => CellState;
  /** The hand to ring (the one you hold). */
  mark?: HandClass | null;
  /** Paint mode: called for each cell the pointer passes over while pressed. */
  onPaint?: (h: HandClass, start: boolean) => void;
  onHover?: (h: HandClass | null) => void;
  compact?: boolean;
}

/**
 * The 13×13 starting-hand grid. Pairs run down the diagonal, suited hands sit above it
 * and offsuit hands below. In paint mode you can drag across cells.
 */
export function RangeGrid({ stateOf, mark, onPaint, onHover, compact }: Props) {
  const painting = useRef(false);
  const cells = [];
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++) {
      const h = gridHand(r, c);
      const st = stateOf(h);
      cells.push(
        <div
          key={h}
          className={`rg-cell ${st}${h === mark ? ' mark' : ''}${r === c ? ' pair' : ''}`}
          data-hand={h}
          role={onPaint ? 'button' : undefined}
          aria-pressed={onPaint ? st === 'in' : undefined}
          aria-label={h}
          onPointerDown={onPaint ? (e) => { e.preventDefault(); painting.current = true; onPaint(h, true); } : undefined}
          onPointerEnter={() => { onHover?.(h); if (onPaint && painting.current) onPaint(h, false); }}
        >
          {h}
        </div>,
      );
    }
  return (
    <div
      className={'range-grid' + (compact ? ' compact' : '') + (onPaint ? ' paintable' : '')}
      onPointerUp={() => { painting.current = false; }}
      onPointerLeave={() => { painting.current = false; onHover?.(null); }}
      onPointerMove={onPaint ? (e) => {
        // Touch devices don't fire pointerenter while dragging, so look up the cell under the finger.
        if (!painting.current || e.pointerType === 'mouse') return;
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const h = el?.dataset.hand;
        if (h) onPaint(h, false);
      } : undefined}
    >
      {cells}
    </div>
  );
}

export function GridLegend({ items }: { items: { cls: CellState; label: string }[] }) {
  return (
    <div className="row" style={{ gap: 14, fontSize: '0.85rem' }}>
      {items.map((i) => (
        <span key={i.cls} className="row" style={{ gap: 6 }}>
          <span className={`rg-swatch ${i.cls}`} /> {i.label}
        </span>
      ))}
      <span className="muted">Pairs on the diagonal · suited above · offsuit below</span>
    </div>
  );
}
