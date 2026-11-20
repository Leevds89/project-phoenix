import { useSession } from '../context/SessionContext.jsx';
import FollowUpNotice from './FollowUpNotice.jsx';

export default function VerificationPanel() {
  const { verificationStatus, verificationPaste, updateVerificationPaste, markVerificationPassed, markVerificationFailed, rediagnose, status, diagnosis } = useSession();
  return (
    <section className="panel verification-panel" aria-labelledby="verification-title">
      <div className="panel-heading">
        <div><p className="step-label">02 <span>·</span> Close the loop</p><h2 id="verification-title">Check whether it worked</h2></div>
        <span className="text-badge">Your call</span>
      </div>
      <div className="verification-step"><span className="verification-check" aria-hidden="true">✓</span><p>{diagnosis.verificationStep.text}</p></div>
      {verificationStatus === 'passed' ? <div className="success-message phoenix-rise" role="status"><span aria-hidden="true">✳</span><div><strong>It’s rising.</strong><br />You marked this check as successful. Phoenix did not run or independently verify it.</div></div> : <>
        {verificationStatus !== 'failed' ? <div className="verification-actions">
          <button className="primary-button compact" onClick={markVerificationPassed}>It worked <span aria-hidden="true">✓</span></button>
          <button className="secondary-button" onClick={markVerificationFailed}>It didn’t work</button>
        </div> : <div className="follow-up-form">
          <label htmlFor="verification-result">What happened when you checked?</label>
          <textarea id="verification-result" value={verificationPaste} onChange={(event) => updateVerificationPaste(event.target.value)} maxLength={4000} rows={4} placeholder="Paste the output, or describe what you saw…" disabled={status === 'follow-up-loading'} />
          <div className="input-footer"><span className="character-count">{verificationPaste.length.toLocaleString()} / 4,000</span><button className="primary-button compact" onClick={rediagnose} disabled={!verificationPaste.trim() || status === 'follow-up-loading'}>Look again <span aria-hidden="true">↗</span></button></div>
          <FollowUpNotice />
        </div>}
      </>}
    </section>
  );
}
