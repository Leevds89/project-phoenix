import { useSession } from '../context/SessionContext.jsx';

export function RiskWarning() {
  return <span className="risk-warning"><span aria-hidden="true">!</span> Take care · this step may be hard to reverse</span>;
}

export default function RecoverySteps({ steps }) {
  const { completedRecoverySteps, toggleRecoveryStep } = useSession();
  if (!steps?.length) return null;
  return (
    <section className="result-card recovery-card">
      <div className="card-title-row"><span className="card-icon" aria-hidden="true">↗</span><h2>Careful next steps</h2></div>
      <p className="runway-hint">Mark each step as you complete it. Phoenix keeps this progress in this session only.</p>
      <ol className="recovery-list">
        {steps.map((step) => <li key={step.order}>
          <label className="step-complete"><input type="checkbox" checked={completedRecoverySteps.includes(step.order)} onChange={(event) => toggleRecoveryStep(step.order, event.target.checked)} aria-label={`Mark recovery step ${step.order} complete`} /><span>{String(step.order).padStart(2, '0')}</span></label>
          <div>{step.risky && <RiskWarning />}<p>{step.text}</p></div>
        </li>)}
      </ol>
    </section>
  );
}
