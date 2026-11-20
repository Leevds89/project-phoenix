import { useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

export default function Header({ onSettings }) {
  const { configStatus, status, clearSession, undoSnapshots, undoChanges } = useSession();
  const [undoBusy, setUndoBusy] = useState(false);
  const showClear = configStatus === 'ready' && status !== 'idle';
  function clear() {
    if (undoSnapshots.length && !window.confirm('Clear this session and discard Phoenix’s temporary undo restore point? Your edited files will stay as they are.')) return;
    clearSession();
  }
  async function undo() {
    const paths = undoSnapshots.flatMap((snapshot) => snapshot.path ? [snapshot.path] : snapshot.paths || []);
    if (!window.confirm(`Restore Phoenix’s previous contents for ${paths.join(', ')}? Phoenix will first check that every file still matches its proposed version; if any file changed, nothing will be restored.`)) return;
    setUndoBusy(true);
    try { await undoChanges(); }
    catch (error) { window.alert(error.message); }
    finally { setUndoBusy(false); }
  }
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Project Phoenix home">
        <span className="brand-icon" aria-hidden="true">✳</span>
        <span>PROJECT <strong>PHOENIX</strong></span>
      </a>
      <div className="header-actions"><button className="quiet-button" onClick={onSettings}>Settings</button>{undoSnapshots.length > 0 && <button className="quiet-button" onClick={undo} disabled={undoBusy}>{undoBusy ? 'Checking files…' : 'Undo Phoenix edits'}</button>}{showClear && <button className="quiet-button" onClick={clear}>Clear / Start over</button>}</div>
    </header>
  );
}
