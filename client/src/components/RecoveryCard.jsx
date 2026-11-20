import { useRef, useState } from 'react';
import { buildRecoveryCard } from '../lib/recoveryCard.js';

export default function RecoveryCard({ diagnosis, diagnosisMode, matches, projectPassport, verificationStatus, verifiedAt, fileChanges, demoTitle }) {
  const dialog = useRef(null);
  const [message, setMessage] = useState('');
  if (!diagnosis) return null;
  const card = buildRecoveryCard({ diagnosis, diagnosisMode, matches, projectPassport, verificationStatus, verifiedAt, fileChanges, demoTitle });
  function download() {
    const url = URL.createObjectURL(new Blob([card], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `phoenix-recovery-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Recovery Card saved. It excludes your raw error text and project contents.');
    dialog.current?.close();
  }
  return <section className="recovery-card-action"><button className="secondary-button" onClick={() => { setMessage(''); dialog.current?.showModal(); }}>Preview Recovery Card</button>{message && <span role="status" className="card-saved-message">{message}</span>}
    <dialog ref={dialog} className="settings-dialog recovery-card-dialog" aria-labelledby="recovery-card-title">
      <div className="dialog-heading"><div><p className="step-label">SHARE A SAFE SUMMARY</p><h2 id="recovery-card-title">Recovery Card preview</h2></div><button className="quiet-button" aria-label="Close preview" onClick={() => dialog.current?.close()}>Close</button></div>
      <p className="input-hint">The export includes detected project names, declared versions, and relative manifest paths when available. It omits your original error and file contents. Review the preview before saving.</p>
      <pre className="recovery-card-preview">{card}</pre>
      <button className="primary-button" onClick={download}>Save Recovery Card</button>
    </dialog>
  </section>;
}
