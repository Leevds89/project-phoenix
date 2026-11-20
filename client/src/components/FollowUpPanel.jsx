import DiagnosisPanel, { SummaryCard } from './DiagnosisPanel.jsx';

export default function FollowUpPanel({ diagnosis }) {
  return <section className="follow-up-panel" aria-label="Follow-up diagnosis">
    <div className="follow-up-heading"><span className="follow-up-mark" aria-hidden="true">↻</span><div><p className="step-label">ONE FOLLOW-UP</p><h2>A fresh read on the result</h2></div></div>
    {diagnosis.needsMoreContext
      ? <SummaryCard text={diagnosis.summary} />
      : <DiagnosisPanel diagnosis={diagnosis} />}
  </section>;
}
