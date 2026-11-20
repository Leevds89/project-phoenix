import RecoverySteps from './RecoverySteps.jsx';

export function SummaryCard({ text }) {
  return <section className="result-card summary-card"><p className="card-kicker">THE SHORT VERSION</p><p className="summary-text">{text}</p></section>;
}

export default function DiagnosisPanel({ diagnosis }) {
  return (
    <section className="diagnosis-stack" aria-label="Diagnosis">
      <SummaryCard text={diagnosis.summary} />
      <section className="result-card root-cause-card">
        <div className="card-title-row"><span className="card-icon" aria-hidden="true">⌕</span><h2>Likely root cause</h2></div>
        <p>{diagnosis.rootCause}</p>
      </section>
      <RecoverySteps steps={diagnosis.recoverySteps} />
    </section>
  );
}
