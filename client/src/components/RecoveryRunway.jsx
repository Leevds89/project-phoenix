export default function RecoveryRunway({ diagnosis, completedSteps = [], verificationStatus }) {
  if (!diagnosis || diagnosis.needsMoreContext) return null;
  const stepCount = diagnosis.recoverySteps?.length || 0;
  const stepsDone = stepCount > 0 && diagnosis.recoverySteps.every((step) => completedSteps.includes(step.order));
  const phases = [
    { label: 'Understand the error', state: 'complete' },
    { label: 'Work through the steps', state: stepsDone ? 'complete' : 'active' },
    { label: 'Verify the result', state: verificationStatus === 'passed' ? 'complete' : verificationStatus === 'failed' ? 'attention' : 'next' },
    { label: 'Save a Recovery Card', state: verificationStatus === 'passed' ? 'next' : 'later' },
  ];
  return <nav className="recovery-runway panel" aria-label="Recovery progress">
    <div className="runway-heading"><div><p className="step-label">YOUR RECOVERY RUNWAY</p><h2>One careful step at a time</h2></div><span className="runway-count">{completedSteps.filter((order) => diagnosis.recoverySteps?.some((step) => step.order === order)).length}/{stepCount} steps</span></div>
    <ol>{phases.map((phase, index) => <li key={phase.label} className={`runway-phase ${phase.state}`}><span className="runway-marker" aria-hidden="true">{phase.state === 'complete' ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{phase.label}</span></li>)}</ol>
  </nav>;
}
