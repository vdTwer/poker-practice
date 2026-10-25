import { useCallback, useState } from 'react';
import { genSidePot, mulberry32, randomSeed, type SidePotSpot } from '@poker/engine';
import { DrillShell, useDrill } from '../components/Drill';
import { Feedback } from '../components/Feedback';
import { T } from '../components/Term';
import { creditWord } from '../lib/storage';

const ORDINAL = ['Best hand', 'Second best', 'Third best', 'Fourth best', 'Fifth best'];

export function SidePots() {
  const [rng] = useState(() => mulberry32(randomSeed()));
  const [spot, setSpot] = useState<SidePotSpot>(() => genSidePot(rng));
  const [guess, setGuess] = useState<string[]>(() => spot.players.map(() => ''));
  const [checked, setChecked] = useState(false);
  const drill = useDrill('side-pots');

  const next = useCallback(() => {
    const s = genSidePot(rng);
    setSpot(s);
    setGuess(s.players.map(() => ''));
    setChecked(false);
  }, [rng]);

  const wins = spot.players.map((_, i) => spot.pots.reduce((sum, p) => sum + (p.shares.find((s) => s.seat === i)?.amount ?? 0), 0));
  const total = spot.players.reduce((s, p) => s + p.invested, 0);
  const max = Math.max(...spot.players.map((p) => p.invested));
  const allRight = guess.every((g, i) => Number(g || 0) === wins[i]);
  const filled = guess.every((g) => g !== '');

  const check = () => {
    setChecked(true);
    drill.answer(allRight);
    if (allRight) { creditWord('side pot'); creditWord('all-in'); }
  };

  const potName = (i: number) => (i === 0 ? 'Main pot' : `Side pot ${i}`);

  return (
    <DrillShell
      id="side-pots" stage={0} title="Side pots" score={drill} answered={checked} onNext={next}
      intro={<>Everyone still in is <T k="all-in" plain="has bet every chip" />, except the biggest stack, who only needs to match the second biggest. A player can only win from each opponent as much as they put in themselves, so extra chips go into a <T k="side pot" plain="a separate pot the short stack can't win" />. How many chips does each player get?</>}
    >
      <div className="panel stack">
        <div className="eyebrow">Chips each player put in · total {total}</div>
        <div className="stack-sm">
          {spot.players.map((p, i) => {
            const rank = spot.ranking.findIndex((g) => g.includes(i));
            return (
              <div key={p.name} className="row" style={{ gap: 10 }}>
                <span style={{ width: 52, fontWeight: 650 }}>{p.name}</span>
                <div style={{ flex: '1 1 160px', height: 26, background: 'var(--band)', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: `${(p.invested / max) * 100}%`, height: '100%', background: p.folded ? 'var(--line)' : i % 2 ? 'var(--orchid)' : 'var(--terra)', borderRadius: 8 }} />
                  <span className="mono" style={{ position: 'absolute', left: 8, top: 2, fontSize: '0.85rem', color: 'var(--fg)' }}>{p.invested}</span>
                </div>
                <span className="pill" style={{ minWidth: 110, justifyContent: 'center' }}>{p.folded ? 'Folded' : ORDINAL[rank]}</span>
                <label className="row" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>wins</span>
                  <input
                    className="num" inputMode="numeric" value={guess[i]} disabled={checked} aria-label={`Chips ${p.name} wins`}
                    style={checked ? { borderColor: Number(guess[i] || 0) === wins[i] ? 'var(--good)' : 'var(--bad)' } : undefined}
                    onChange={(e) => setGuess((g) => g.map((x, k) => (k === i ? e.target.value.replace(/\D/g, '') : x)))}
                    onKeyDown={(e) => e.key === 'Enter' && filled && !checked && check()}
                  />
                </label>
                {checked && Number(guess[i] || 0) !== wins[i] && <span className="mono" style={{ color: 'var(--bad)' }}>→ {wins[i]}</span>}
              </div>
            );
          })}
        </div>
        {!checked && (
          <div className="row">
            <button className="btn primary" disabled={!filled} onClick={check}>Check</button>
            <span className="muted" style={{ fontSize: '0.88rem' }}>Players who win nothing get 0. All the numbers add up to {total}.</span>
          </div>
        )}
      </div>

      {checked && (
        <Feedback
          tone={allRight ? 'good' : 'bad'}
          openWhy
          verdict={allRight ? 'Every chip is in the right place.' : 'Some chips went to the wrong player.'}
          why={
            <div className="stack-sm">
              <p>Cut the chips into layers at each all-in amount. Each layer is a pot, and only players who reached that layer can win it.</p>
              {spot.pots.map((pot, i) => (
                <div key={i} className="result-line">
                  <b>{potName(i)}: {pot.amount}</b>{' '}
                  <span className="muted">
                    = {pot.from.map((f) => `${f.amount} from ${spot.players[f.seat].name}`).join(' + ')}.
                  </span>{' '}
                  Can be won by {pot.eligible.map((s) => spot.players[s].name).join(', ')}.{' '}
                  <b>{pot.winners.map((w) => spot.players[w].name).join(' and ')}</b> has the best hand among them and takes it.
                </div>
              ))}
            </div>
          }
          rule={<p>Work from the smallest all-in up. The main pot is the smallest all-in amount times the number of players who matched it (plus any folded chips). Whatever is left over builds the next pot, and the best hand <i>among the players in that pot</i> wins it. A short stack with the best hand only wins the main pot.</p>}
        />
      )}
    </DrillShell>
  );
}
