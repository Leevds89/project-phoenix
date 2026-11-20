import { useRef, useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { deleteProjectMemory, importProjectMemory, loadProjectMemories, saveProjectMemory } from '../lib/projectMemory.js';

const blank = { id: '', projectName: '', notes: '' };

function downloadMemory(memory) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(memory, null, 2)}\n`], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `phoenix-memory-${memory.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProjectMemoryPanel() {
  const { diagnosis, folderHandle, projectMemoryContext, setProjectMemoryContext } = useSession();
  const [memories, setMemories] = useState(loadProjectMemories);
  const [draft, setDraft] = useState(blank);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [includeInDiagnosis, setIncludeInDiagnosis] = useState(false);
  const fileInput = useRef(null);

  function load(id) {
    const found = memories.find((item) => item.id === id);
    setDraft(found ? { id: found.id, projectName: found.projectName, notes: found.notes } : { ...blank, projectName: folderHandle?.name || '' });
    setIncludeInDiagnosis(false); setProjectMemoryContext('');
    setMessage(''); setError('');
  }

  function save(event) {
    event.preventDefault(); setMessage(''); setError('');
    const memory = { ...draft, projectName: draft.projectName.trim(), notes: draft.notes.trim(), updatedAt: new Date().toISOString() };
    if (!memory.projectName) { setError('Add a project name before saving.'); return; }
    try {
      const next = saveProjectMemory({ ...memory, id: memory.id || crypto.randomUUID() });
      setMemories(next); setDraft({ ...memory, id: next[0].id }); setMessage('Project memory saved on this device.');
    } catch (saveError) { setError(saveError.name === 'QuotaExceededError' ? 'Browser storage is full. Export or remove an older memory, then try again.' : saveError.message); }
  }

  function addDiagnosis() {
    if (!diagnosis) return;
    const snapshot = [
      `Recent Phoenix diagnosis (${new Date().toLocaleDateString()}):`,
      diagnosis.summary,
      diagnosis.rootCause ? `Likely cause: ${diagnosis.rootCause}` : '',
      ...(diagnosis.recoverySteps || []).map((step) => `${step.order}. ${step.text}`),
    ].filter(Boolean).join('\n');
    const notes = [draft.notes.trim(), snapshot].filter(Boolean).join('\n\n').slice(0, 5000);
    setDraft((current) => ({ ...current, notes }));
    if (includeInDiagnosis) setProjectMemoryContext(notes);
    setMessage('Diagnosis summary added to the editable notes. Save when it looks right.');
  }

  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setMessage(''); setError('');
    try {
      if (file.size > 100_000) throw new Error('Memory files must be under 100 KB.');
      const imported = importProjectMemory(await file.text());
      const next = saveProjectMemory(imported);
      setIncludeInDiagnosis(false); setProjectMemoryContext('');
      setMemories(next); setDraft({ id: imported.id, projectName: imported.projectName, notes: imported.notes });
      setMessage('Memory imported into this browser. Review it before continuing.');
    } catch (importError) { setError(importError.name === 'QuotaExceededError' ? 'Browser storage is full. Export or remove an older memory, then try again.' : importError.message || 'Could not import that file.'); }
  }

  function remove() {
    if (!draft.id) return;
    const next = deleteProjectMemory(draft.id);
    setMemories(next); setDraft({ ...blank, projectName: folderHandle?.name || '' }); setIncludeInDiagnosis(false); setProjectMemoryContext(''); setMessage('Saved memory deleted from this browser.'); setError('');
  }

  return <section className="panel memory-panel" aria-labelledby="memory-title">
    <div className="panel-heading"><div><p className="step-label">OPT-IN · PROJECT CONTINUITY</p><h2 id="memory-title">Project memory</h2></div><span className="text-badge">Saved on this device</span></div>
    <p>Save a short checkpoint so you can pick up later. Phoenix saves only the project name and notes shown here, when you choose Save. Raw errors and project files are never added automatically.</p>
    <div className="memory-privacy" role="note"><strong>Stored in this browser profile.</strong> Memory is not uploaded or synced, and Phoenix does not encrypt it. Do not save passwords, keys, or private data. Browser data clearing can remove it; export a backup if you need one.</div>
    <div className="memory-toolbar"><label htmlFor="saved-memory">Saved checkpoints</label><select id="saved-memory" value={draft.id} onChange={(event) => load(event.target.value)}><option value="">New checkpoint</option>{memories.map((memory) => <option key={memory.id} value={memory.id}>{memory.projectName} · {new Date(memory.updatedAt).toLocaleDateString()}</option>)}</select></div>
    <form className="memory-form" onSubmit={save}>
      <label htmlFor="memory-project-name">Project name</label><input id="memory-project-name" value={draft.projectName} maxLength={100} onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))} placeholder={folderHandle?.name || 'e.g. Phoenix'} />
      <label htmlFor="memory-notes">Your checkpoint notes</label><textarea id="memory-notes" value={draft.notes} maxLength={5000} rows={5} onChange={(event) => { const notes = event.target.value; setDraft((current) => ({ ...current, notes })); if (includeInDiagnosis) setProjectMemoryContext(notes); }} placeholder="Project goal, decisions, current state, and the next thing to try…" />
      {diagnosis && <button type="button" className="quiet-button" onClick={addDiagnosis}>Add current diagnosis to notes for review</button>}
      <label className="memory-opt-in"><input type="checkbox" checked={includeInDiagnosis} onChange={(event) => { const checked = event.target.checked; setIncludeInDiagnosis(checked); setProjectMemoryContext(checked ? draft.notes : ''); }} /> Include these notes with diagnoses during this session</label>
      <div className="memory-actions"><button className="primary-button compact" type="submit">{draft.id ? 'Update memory' : 'Save memory'}</button>{draft.id && <><button type="button" className="secondary-button" onClick={() => downloadMemory(memories.find((item) => item.id === draft.id))}>Export backup</button><button type="button" className="secondary-button" onClick={remove}>Delete memory</button></>}<button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>Import backup</button><input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} /></div>
    </form>
    {error && <p className="folder-error" role="alert">{error}</p>}{message && <p className="memory-status" role="status">{message}</p>}
  </section>;
}
