import { useState, type ReactNode } from 'react';

interface Props {
  tone: 'good' | 'bad' | 'close' | 'small';
  /** Layer 1: what was right and how much it mattered. Always shown. */
  verdict: ReactNode;
  detail?: ReactNode;
  /** Layer 2: why, with the cards or numbers visible. */
  why?: ReactNode;
  /** Layer 3: the rule, or what would change the answer. */
  rule?: ReactNode;
  ruleLabel?: string;
  /** Open layer 2 straight away (used after a wrong answer). */
  openWhy?: boolean;
}

/** The three-layer explanation every answer gets. */
export function Feedback({ tone, verdict, detail, why, rule, ruleLabel = 'The rule to remember', openWhy }: Props) {
  const [showWhy, setShowWhy] = useState(!!openWhy);
  const [showRule, setShowRule] = useState(false);
  return (
    <div className={`feedback ${tone}`} role="status" aria-live="polite">
      <div className="verdict">{verdict}</div>
      {detail && <div style={{ marginTop: 4 }}>{detail}</div>}
      {showWhy && why && (
        <div className="layer">
          <div className="layer-label">Why</div>
          {why}
        </div>
      )}
      {showRule && rule && (
        <div className="layer">
          <div className="layer-label">{ruleLabel}</div>
          {rule}
        </div>
      )}
      {((why && !showWhy) || (rule && !showRule)) && (
        <div className="layer-toggles">
          {why && !showWhy && <button className="btn small" onClick={() => setShowWhy(true)}>Why?</button>}
          {rule && !showRule && <button className="btn small" onClick={() => setShowRule(true)}>{ruleLabel}</button>}
        </div>
      )}
    </div>
  );
}
