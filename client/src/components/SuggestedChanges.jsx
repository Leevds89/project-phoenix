import { useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

export default function SuggestedChanges({ changes = [] }) {
  const { applyChanges, folderHandle } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  if (!changes.length) return null;
  async function apply() {
    setConfirm(false); setMessage('Applying approved edits…');
    try { const paths = await applyChanges(changes); setMessage(`Applied: ${paths.join(', ')}`); }
    catch (error) { setMessage(error.message); }
  }
  return <section className="panel changes-panel" aria-labelledby="changes-title"><p className="step-label">OPTIONAL · REVIEW FIRST</p><h2 id="changes-title">Suggested file changes</h2>
    {changes.map((change) => <article className="change-card" key={change.path}><div className="change-heading"><strong>{change.path}</strong>{change.risky && <span className="risk-warning">Review carefully</span>}</div><p>{change.summary}</p><details className="change-details"><summary>Preview current and proposed content</summary><div className="diff-columns"><section><h3>Current</h3><pre className="change-preview current-content">{change.originalContent}</pre></section><section><h3>Proposed</h3><pre className="change-preview proposed-content">{change.proposedContent}</pre></section></div></details></article>)}
    <button className="primary-button" disabled={!folderHandle} onClick={() => setConfirm(true)}>Review &amp; apply these edits</button>{!folderHandle && <p className="input-hint">Reconnect the selected folder to apply. You can review the proposed content above.</p>}
    <p className="input-hint">After applying, undo stays available in the header for this session. Phoenix checks every affected file before restoring it.</p>
    {message && <p role="status" className="apply-status">{message}</p>}
    {confirm && <div className="confirm-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h3 id="confirm-title">Apply these file changes?</h3><p>Phoenix will update only the {changes.length} listed file(s). It will check that each file still matches the scanned version before writing.</p><ul>{changes.map((item) => <li key={item.path}>{item.path}</li>)}</ul><div className="option-row"><button className="primary-button" onClick={apply}>Apply approved edits</button><button className="secondary-button" onClick={() => setConfirm(false)}>Cancel</button></div></section></div>}
  </section>;
}
