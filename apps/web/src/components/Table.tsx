import { useSyncExternalStore } from 'react';
import type { Card } from '@poker/engine';
import { PlayingCard } from './PlayingCard';

export interface TableSeat {
  name: string;
  stack: number;
  /** Chips in front of the player on this street. */
  bet: number;
  hole: Card[];
  /** Face up (hero, or showdown) or face down. */
  showCards: boolean;
  folded?: boolean;
  allIn?: boolean;
  position?: string;
  toAct?: boolean;
  winner?: boolean;
  /** Short note on the seat, e.g. "Call" or "Raise to 6". */
  note?: string;
}

/** Things on the table that a lesson or the "Name it" drill can point at. */
export type Target =
  | `seat:${number}` | `hole:${number}` | `stack:${number}` | `bet:${number}` | `pos:${number}`
  | 'button' | 'board' | 'flop' | 'turn' | 'river' | 'pot';

interface Props {
  seats: TableSeat[];
  /** Which seat sits at the bottom centre (you). */
  heroIndex?: number;
  button: number;
  board: Card[];
  pot: number;
  highlight?: Target | null;
  /** A small label above the highlighted thing. */
  callout?: string;
  /** Hide position badges (e.g. when they would give away a "Name it" answer). */
  hidePositions?: boolean;
  /** Hide the pot amount label text. */
  potLabel?: string;
  animateBoard?: boolean;
}

// Phones get a taller oval, so seats spread out vertically and stay clear of the board.
const NARROW = '(max-width: 640px)';
function useNarrow(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(NARROW); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

interface Geometry { seat: [number, number, number]; bet: [number, number, number]; btn: [number, number, number] }
const WIDE: Geometry = { seat: [45, 41, 49], bet: [31, 19, 47], btn: [31, 27, 49] };
const TALL: Geometry = { seat: [42, 45, 50], bet: [27, 25, 48], btn: [27, 30, 50] };

function seatPoint(i: number, n: number, hero: number, rx: number, ry: number, cy = 50) {
  const k = (i - hero + n) % n;
  const angle = Math.PI / 2 + (k * 2 * Math.PI) / n;
  return { x: 50 + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

export function PokerTable({ seats, heroIndex = 0, button, board, pot, highlight, callout, hidePositions, potLabel = 'Pot', animateBoard = true }: Props) {
  const n = seats.length;
  const g = useNarrow() ? TALL : WIDE;
  const hl = (t: Target) => (highlight === t ? ' hl-ring' : '');
  const flop = board.slice(0, 3), turn = board[3], river = board[4];
  const btnP = (() => {
    const k = (button - heroIndex + n) % n;
    const angle = Math.PI / 2 + (k * 2 * Math.PI) / n + 0.32;
    return { x: 50 + g.btn[0] * Math.cos(angle), y: g.btn[2] + g.btn[1] * Math.sin(angle) };
  })();

  return (
    <div className="table-wrap">
      <div className="felt" />
      <div className="table-center">
        <div className={'board' + hl('board')}>
          <span className={'cards' + hl('flop')} style={{ borderRadius: 10 }}>
            {[0, 1, 2].map((i) => <PlayingCard key={flop[i] ?? `f${i}`} card={flop[i]} slot={!flop[i]} size="lg" animate={animateBoard && !!flop[i]} />)}
          </span>
          <span className={'cards' + hl('turn')} style={{ borderRadius: 10 }}>
            <PlayingCard key={turn ?? 't'} card={turn} slot={!turn} size="lg" animate={animateBoard && !!turn} />
          </span>
          <span className={'cards' + hl('river')} style={{ borderRadius: 10 }}>
            <PlayingCard key={river ?? 'r'} card={river} slot={!river} size="lg" animate={animateBoard && !!river} />
          </span>
        </div>
        <div className={'pot' + hl('pot')}>
          <span className="pot-chip" aria-hidden="true" />
          {potLabel} <b>{pot}</b>
        </div>
      </div>

      <div className={'dealer-btn' + hl('button')} style={{ left: `${btnP.x}%`, top: `${btnP.y}%` }} title="Dealer button" aria-label="Dealer button">D</div>

      {seats.map((s, i) => {
        const p = seatPoint(i, n, heroIndex, ...g.seat);
        const b = seatPoint(i, n, heroIndex, ...g.bet);
        const isHero = i === heroIndex;
        const cls = ['seat', isHero ? 'hero' : '', s.toAct ? 'to-act' : '', s.folded ? 'folded' : '', s.winner ? 'winner' : '', hl(`seat:${i}`)].join(' ');
        return (
          <div key={i}>
            <div className={cls} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className={'hole' + hl(`hole:${i}`)}>
                {s.hole.length > 0 && !s.folded
                  ? s.hole.map((c, j) => <PlayingCard key={j} card={c} hidden={!s.showCards} animate />)
                  : null}
              </div>
              <div className="plate">
                {s.position && !hidePositions && <span className={'pos' + hl(`pos:${i}`)}>{s.position}</span>}
                <div className="name">{s.name}</div>
                <div className={'stack' + hl(`stack:${i}`)} style={{ borderRadius: 6 }}>
                  {s.allIn ? <span className="tag allin">All-in</span> : s.stack}
                </div>
              </div>
              {s.note && <span className="tag action">{s.note}</span>}
            </div>
            {s.bet > 0 && (
              <div className={'bet' + hl(`bet:${i}`)} style={{ left: `${b.x}%`, top: `${b.y}%` }}>
                <span className="chipstack" aria-hidden="true" />
                {s.bet}
              </div>
            )}
          </div>
        );
      })}
      {callout && highlight && <Callout target={highlight} seats={n} hero={heroIndex} button={btnP} text={callout} g={g} />}
    </div>
  );
}

function Callout({ target, seats, hero, button, text, g }: { target: Target; seats: number; hero: number; button: { x: number; y: number }; text: string; g: Geometry }) {
  let x = 50, y = 30;
  const [kind, idx] = target.split(':');
  if (idx !== undefined) {
    const p = seatPoint(Number(idx), seats, hero, ...g.seat);
    x = p.x;
    y = p.y - (kind === 'bet' ? 18 : 14);
    if (kind === 'bet') {
      const b = seatPoint(Number(idx), seats, hero, ...g.bet);
      x = b.x; y = b.y - 4;
    }
  } else if (kind === 'button') { x = button.x; y = button.y - 3; }
  else if (kind === 'pot') { x = 50; y = 53; }
  else { x = 50; y = 34; }
  return <div className="callout" style={{ left: `${x}%`, top: `${Math.max(4, y)}%` }}>{text}</div>;
}
