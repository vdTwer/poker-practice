import { useEffect, useMemo, useRef, useState } from 'react';
import {
  startHand, applyAction, legalActions, botAction, nextButton, potSize, mulberry32, randomSeed,
  DRILL_NAMES, POSITION_LONG, positionName, type HandState, type HandEvent, type PlayerAction, type SeatSetup,
} from '@poker/engine';
import { PokerTable } from '../components/Table';
import { CardRow } from '../components/PlayingCard';
import { T } from '../components/Term';
import { seatsFromHand, middlePot } from '../lib/handview';
import { lowerFirst } from '../lib/text';

const SB = 1;
const BB = 2;
const START = 200; // 100 big blinds, a standard buy-in
const BOT_DELAY = 750;

interface Session { seats: SeatSetup[]; button: number; hand: HandState; handNo: number; notes: string[] }

function newSession(n: number, rng: () => number): Session {
  const seats = [{ id: 'you', name: 'You', stack: START }, ...DRILL_NAMES.slice(0, n - 1).map((name) => ({ id: name, name, stack: START }))];
  const button = Math.floor(rng() * n);
  return { seats, button, hand: startHand({ seats, button, smallBlind: SB, bigBlind: BB, rng }), handNo: 1, notes: [] };
}

export function Play() {
  const rng = useMemo(() => mulberry32(randomSeed()), []);
  const [players, setPlayers] = useState(6);
  const [session, setSession] = useState<Session>(() => newSession(6, rng));
  const [raiseTo, setRaiseTo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hand = session.hand;
  const hero = 0;
  const legal = legalActions(hand);
  const heroTurn = hand.toAct === hero && hand.phase !== 'complete';

  // Bots act on their own after a short pause so you can follow the action.
  useEffect(() => {
    if (hand.phase === 'complete' || hand.toAct === null || hand.toAct === hero) return;
    const id = window.setTimeout(() => {
      setSession((s) => ({ ...s, hand: applyAction(s.hand, botAction(s.hand, rng)) }));
    }, BOT_DELAY);
    return () => window.clearTimeout(id);
  }, [hand, rng]);

  // Default the raise slider to the minimum whenever it becomes your turn.
  useEffect(() => {
    if (heroTurn && legal) setRaiseTo(legal.minTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTurn, hand.log.length]);

  const act = (a: PlayerAction) => {
    try {
      setError(null);
      setSession((s) => ({ ...s, hand: applyAction(s.hand, a) }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const nextHand = () => {
    setSession((s) => {
      const notes: string[] = [];
      const seats = s.seats.map((seat, i) => {
        const stack = s.hand.players[i].stack;
        if (stack === 0) {
          notes.push(i === hero ? `You ran out of chips and bought back in for ${START}.` : `${seat.name} ran out of chips and bought back in for ${START}.`);
          return { ...seat, stack: START };
        }
        return { ...seat, stack };
      });
      const button = nextButton(s.button, seats.length);
      return { seats, button, hand: startHand({ seats, button, smallBlind: SB, bigBlind: BB, rng }), handNo: s.handNo + 1, notes };
    });
  };

  const restart = (n: number) => { setPlayers(n); setSession(newSession(n, rng)); setError(null); };

  const pot = potSize(hand);
  const toCall = legal?.callAmount ?? 0;
  const preset = (f: number) => {
    if (!legal) return 0;
    const base = hand.currentBet === 0 ? f * pot : hand.currentBet + f * (pot + toCall);
    return Math.max(legal.minTo, Math.min(legal.maxTo, Math.round(base)));
  };
  const heroPos = positionName(hero, hand.button, hand.players.length);
  const result = hand.result;

  return (
    <div className="wrap stack-lg">
      <div className="drill-head">
        <div className="stack-sm" style={{ flex: '1 1 320px' }}>
          <span className="eyebrow">Practice table · hand {session.handNo}</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>Play full hands</h1>
          <p className="muted" style={{ maxWidth: '64ch' }}>
            <T k="No-Limit" /> Hold'em, <T k="blinds" /> {SB}/{BB}, everyone starts with {START} chips. Your opponents are simple
            practice bots for now; named bot personalities and a coach who pauses at key decisions come in the next slices.
          </p>
        </div>
        <label className="stack-sm" style={{ minWidth: 220 }}>
          <span className="muted">Players at the table: <b className="mono" style={{ color: 'var(--fg)' }}>{players}</b></span>
          <input type="range" min={2} max={9} value={players} onChange={(e) => restart(Number(e.target.value))} aria-label="Players at the table" />
        </label>
      </div>

      <div className="play-layout">
        <div className="stack">
          <PokerTable
            seats={seatsFromHand(hand, { reveal: (seat) => seat === hero || (!!result?.showdown && !hand.players[seat].folded) })}
            heroIndex={hero}
            button={hand.button}
            board={hand.board}
            pot={middlePot(hand)}
          />

          {heroTurn && legal && (
            <div className="action-bar" aria-label="Your action">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  Your turn{' '}
                  <span className="muted">
                    · you're on the <T k={POSITION_LONG[heroPos]}>{POSITION_LONG[heroPos].toLowerCase()}</T>
                    {toCall > 0 ? ` · ${toCall} to call` : ' · no bet to call'}
                  </span>
                </span>
                <span className="mono muted">pot {pot}</span>
              </div>
              <div className="row">
                {legal.canFold && <button className="btn" onClick={() => act({ type: 'fold' })}>Fold</button>}
                {legal.canCheck
                  ? <button className="btn" onClick={() => act({ type: 'check' })}>Check</button>
                  : <button className="btn" onClick={() => act({ type: 'call' })}>Call {legal.callAmount}{legal.callIsAllIn ? ' (all-in)' : ''}</button>}
                {legal.canRaise && (
                  <button className="btn primary" onClick={() => act({ type: legal.raiseKind, to: raiseTo })}>
                    {legal.raiseKind === 'bet' ? 'Bet' : 'Raise to'} {raiseTo}{raiseTo === legal.maxTo ? ' (all-in)' : ''}
                  </button>
                )}
              </div>
              {legal.canRaise && legal.maxTo > legal.minTo && (
                <div className="stack-sm">
                  <input type="range" min={legal.minTo} max={legal.maxTo} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} aria-label="Bet size" />
                  <div className="sizing">
                    <button className="btn small" onClick={() => setRaiseTo(legal.minTo)}>Min</button>
                    <button className="btn small" onClick={() => setRaiseTo(preset(0.5))}>½ pot</button>
                    <button className="btn small" onClick={() => setRaiseTo(preset(0.75))}>¾ pot</button>
                    <button className="btn small" onClick={() => setRaiseTo(preset(1))}>Pot</button>
                    <button className="btn small" onClick={() => setRaiseTo(legal.maxTo)}>All-in</button>
                  </div>
                </div>
              )}
              {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
            </div>
          )}

          {!heroTurn && hand.phase !== 'complete' && (
            <div className="action-bar"><span className="muted">{hand.players[hand.toAct!].name} is thinking…</span></div>
          )}

          {result && (
            <div className="action-bar">
              <div className="results">
                {result.awards.map((a, i) => (
                  <div key={i} className="result-line">
                    <b>{a.winners.map((w) => hand.players[w].name).join(' and ')}</b>{' '}
                    {a.winners.length > 1 ? 'split' : 'win' + (a.winners[0] === hero ? '' : 's')} the {a.name.toLowerCase()} of <b className="mono">{a.amount}</b>
                    {a.hand ? <> with {lowerFirst(a.hand)}</> : null}.
                    <div className="muted" style={{ fontSize: '0.92rem', marginTop: 2 }}>{a.reason}</div>
                  </div>
                ))}
                {result.showdown && (
                  <div className="stack-sm">
                    {hand.players.filter((p) => !p.folded).map((p) => (
                      <div key={p.seat} className="row" style={{ gap: 8 }}>
                        <span style={{ width: 52, fontWeight: 600 }}>{p.name}</span>
                        <CardRow cards={result.hands[p.seat].cards} size="sm" />
                        <span className="muted">{result.hands[p.seat].name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="row">
                <button className="btn primary" onClick={nextHand} autoFocus>Next hand →</button>
                <span className={result.net[hero] >= 0 ? '' : 'muted'} style={{ color: result.net[hero] > 0 ? 'var(--good)' : undefined }}>
                  This hand: {result.net[hero] > 0 ? '+' : ''}{result.net[hero]} chips
                </span>
              </div>
            </div>
          )}
        </div>

        <aside className="panel stack-sm">
          <span className="eyebrow">What happened</span>
          {session.notes.map((n) => <p key={n} className="muted" style={{ fontSize: '0.9rem' }}>{n}</p>)}
          <HandLog hand={hand} />
        </aside>
      </div>
    </div>
  );
}

function HandLog({ hand }: { hand: HandState }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [hand.log.length]);
  const name = (seat: number) => hand.players[seat].name;
  const verb = (seat: number, you: string, other: string) => (seat === 0 ? you : other);
  return (
    <div className="log">
      <div className="street-line">Preflop</div>
      {hand.log.map((e, i) => <LogLine key={i} e={e} name={name} verb={verb} />)}
      <div ref={end} />
    </div>
  );
}

function LogLine({ e, name, verb }: { e: HandEvent; name: (s: number) => string; verb: (s: number, a: string, b: string) => string }) {
  switch (e.type) {
    case 'post':
      return <div>{name(e.seat)} {verb(e.seat, 'post', 'posts')} the <T k={e.blind === 'small' ? 'small blind' : 'big blind'} /> ({e.amount}{e.allIn ? ', all-in' : ''}).</div>;
    case 'deal':
      return <div className="muted">Everyone gets two <T k="hole cards" />.</div>;
    case 'action': {
      const allIn = e.allIn ? <> and {verb(e.seat, 'are', 'is')} <T k="all-in" /></> : null;
      const who = name(e.seat);
      switch (e.action) {
        case 'fold': return <div className="muted">{who} <T k="fold">{verb(e.seat, 'fold', 'folds')}</T>.</div>;
        case 'check': return <div>{who} <T k="check">{verb(e.seat, 'check', 'checks')}</T>.</div>;
        case 'call': return <div>{who} <T k="call">{verb(e.seat, 'call', 'calls')}</T> {e.added}{allIn}.</div>;
        case 'bet': return <div>{who} <T k="bet">{verb(e.seat, 'bet', 'bets')}</T> {e.to}{allIn}.</div>;
        case 'raise': return <div>{who} <T k="raise">{verb(e.seat, 'raise', 'raises')}</T> to {e.to}{allIn}.</div>;
      }
      return null;
    }
    case 'street':
      return (
        <div className="street-line">
          <T k={e.street} /> <CardRow cards={e.cards} size="sm" />
        </div>
      );
    case 'return':
      return <div className="muted">{e.amount} uncalled {e.amount === 1 ? 'chip goes' : 'chips go'} back to {name(e.seat)}.</div>;
    case 'win':
      return <div><b>{name(e.seat)}</b> {verb(e.seat, 'win', 'wins')} {e.amount} from the {e.potName.toLowerCase()}{e.hand ? ` with ${lowerFirst(e.hand)}` : ''}.</div>;
    case 'showdown':
      return <div className="street-line"><T k="showdown" /></div>;
    case 'end':
      return null;
  }
}
