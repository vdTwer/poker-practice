import { type Card, suitOf, suitColor, SUIT_SYMBOL, cardName } from '@poker/engine';

interface Props {
  card?: Card | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show the back instead of the face. */
  hidden?: boolean;
  /** An empty dashed outline where a card will go. */
  slot?: boolean;
  state?: 'selected' | 'good' | 'bad' | 'glow' | 'dim' | null;
  onClick?: () => void;
  animate?: boolean;
  className?: string;
}

/** A two-colour playing card: hearts and diamonds red, spades and clubs black. */
export function PlayingCard({ card, size = 'md', hidden, slot, state, onClick, animate, className = '' }: Props) {
  const cls = ['pc', size, state ?? '', onClick ? 'clickable' : '', animate ? 'deal-in' : '', className];
  if (slot || !card) return <span className={[...cls, 'slot'].join(' ')} aria-hidden="true" />;
  if (hidden) return <span className={[...cls, 'back'].join(' ')} role="img" aria-label="Face-down card" />;
  const suit = suitOf(card);
  const rank = card[0] === 'T' ? '10' : card[0];
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={[...cls, suitColor(suit)].join(' ')}
      onClick={onClick}
      aria-label={cardName(card)}
      aria-pressed={onClick ? state === 'selected' : undefined}
      type={onClick ? 'button' : undefined}
      style={onClick ? { border: '1px solid #D9CCD1', font: 'inherit', fontFamily: 'var(--font-display)', fontWeight: 750 } : undefined}
    >
      <span className="corner">
        <span style={rank === '10' ? { letterSpacing: '-0.08em' } : undefined}>{rank}</span>
        <span className="s">{SUIT_SYMBOL[suit]}</span>
      </span>
      <span className="pip" aria-hidden="true">{SUIT_SYMBOL[suit]}</span>
    </Tag>
  );
}

export function CardRow({ cards, size, states, onPick, animate }: {
  cards: Card[];
  size?: Props['size'];
  states?: Record<string, Props['state']>;
  onPick?: (c: Card) => void;
  animate?: boolean;
}) {
  return (
    <span className="cards">
      {cards.map((c) => (
        <PlayingCard key={c} card={c} size={size} state={states?.[c]} onClick={onPick ? () => onPick(c) : undefined} animate={animate} />
      ))}
    </span>
  );
}
