import { SummaryCard } from './DiagnosisPanel.jsx';

export default function NeedsMoreContextPanel({ diagnosis }) {
  return (
    <section className="diagnosis-stack" aria-label="More context needed">
      <SummaryCard text={diagnosis.summary} />
    </section>
  );
}
