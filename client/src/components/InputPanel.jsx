import { useSession } from '../context/SessionContext.jsx';

export default function InputPanel() {
  const { configStatus, diagnosisMode, input, status, updateInput, diagnose, projectMemoryContext } = useSession();
  const disabled = (diagnosisMode !== 'offline' && configStatus !== 'ready') || input.trim().length === 0 || ['loading', 'follow-up-loading'].includes(status);
  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div><p className="step-label">01 <span>·</span> Start with the signal</p><h2 id="input-title">What happened?</h2></div>
        <span className="text-badge">Any language · any stack</span>
      </div>
      <label className="visually-hidden" htmlFor="diagnostic-input">Paste an error message, log, stack trace, or short code excerpt</label>
      <textarea
        id="diagnostic-input"
        className="diagnostic-input"
        value={input}
        onChange={(event) => updateInput(event.target.value)}
        maxLength={8000}
        placeholder={'Paste an error message, log snippet, stack trace, or short code excerpt…'}
        rows={7}
        disabled={['loading', 'follow-up-loading'].includes(status)}
      />
      <div className="input-footer">
        <span className="character-count">{input.length.toLocaleString()} / 8,000</span>
        <button className="primary-button" onClick={diagnose} disabled={disabled}>
          {status === 'loading' ? <><span className="button-spinner" />{diagnosisMode === 'offline' ? 'Searching guides' : 'Diagnosing'}</> : <>{diagnosisMode === 'offline' ? 'Search offline guides' : 'Find the cause'} <span aria-hidden="true">↗</span></>}
        </button>
      </div>
      <p className="input-hint">{diagnosisMode === 'offline' ? `Phoenix searches its bundled guide library on this computer. Your text and selected project stay local; no model is used.${projectMemoryContext ? ' Your selected checkpoint notes are included in this search.' : ''}` : `Phoenix never runs commands. If you selected a folder, its listed text files are included with this submission; excluded secret and build folders are skipped.${projectMemoryContext ? ' Your selected checkpoint notes are also included.' : ''}`}</p>
    </section>
  );
}
