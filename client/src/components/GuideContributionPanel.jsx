import { useRef, useState } from 'react';
import { buildCustomGuidePack, getCustomGuides, removeCustomGuide, saveCustomGuide, saveCustomGuides, validateCustomGuide, validateCustomGuidePack } from '../lib/customKnowledge.js';

const today = () => new Date().toISOString().slice(0, 10);
const initialFields = () => ({ ecosystem: '', appliesTo: '', title: '', patterns: '', keywords: '', cause: '', steps: '', verify: '', source: '', reviewedOn: today(), attested: false });

function downloadGuide(guide) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(guide, null, 2)}\n`], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${guide.id}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadPack(guides) {
  const pack = buildCustomGuidePack(guides);
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(pack, null, 2)}\n`], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'phoenix-guide-pack.json'; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function GuideContributionPanel() {
  const [fields, setFields] = useState(initialFields);
  const [customGuides, setCustomGuides] = useState(getCustomGuides);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [packDraft, setPackDraft] = useState(null);
  const [packError, setPackError] = useState('');
  const fileRef = useRef(null);
  const update = (key) => (event) => setFields((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  function preview(event) {
    event.preventDefault(); setError(''); setMessage('');
    const slug = fields.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const candidate = {
      id: `local-${slug}-${Date.now()}`,
      ecosystem: fields.ecosystem.trim(), appliesTo: fields.appliesTo.trim(), title: fields.title.trim(),
      patterns: fields.patterns.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      keywords: fields.keywords.split(',').map((item) => item.trim()).filter(Boolean),
      cause: fields.cause.trim(), steps: fields.steps.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      verify: fields.verify.trim(), source: fields.source.trim(), reviewedOn: fields.reviewedOn, status: fields.attested ? 'reviewed-local' : 'draft',
    };
    const validation = validateCustomGuide(candidate);
    if (validation) { setError(validation); return; }
    setDraft(candidate);
  }

  function save() {
    try {
      const saved = saveCustomGuide(draft);
      setCustomGuides(saved); setMessage('Guide saved on this device and is now included in offline search.'); setDraft(null); setFields(initialFields());
    } catch (saveError) { setError(saveError.message); }
  }

  function remove(id) {
    if (!window.confirm('Remove this locally saved guide from offline search?')) return;
    try { setCustomGuides(removeCustomGuide(id)); setMessage('Local guide removed.'); }
    catch { setError('Phoenix could not update the local guide list.'); }
  }

  async function previewPack(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    setPackError(''); setPackDraft(null);
    if (!file) return;
    if (file.size > 1024 * 1024) { setPackError('Guide packs must be smaller than 1 MB.'); return; }
    try {
      const pack = JSON.parse(await file.text());
      const validation = validateCustomGuidePack(pack);
      if (validation) { setPackError(validation); return; }
      const existingIds = new Set(customGuides.map((guide) => guide.id));
      const additions = pack.guides.filter((guide) => !existingIds.has(guide.id));
      setPackDraft({ guides: pack.guides, additions, skipped: pack.guides.length - additions.length });
    } catch { setPackError('Phoenix could not read that JSON guide pack.'); }
  }

  function importPack() {
    try {
      const result = saveCustomGuides(packDraft.guides);
      setCustomGuides(result.guides); setMessage(`Added ${result.added} local guide(s); skipped ${result.skipped} duplicate(s).`); setPackDraft(null);
    } catch (importError) { setPackError(importError.message); }
  }

  return <details className="guide-contribution panel">
    <summary><span><strong>Contribute a reviewed guide</strong><small>Save a local guide or export it for maintainer review</small></span><span aria-hidden="true">＋</span></summary>
    <p className="input-hint">Guides you save or import stay in this browser unless you export them. They are searchable only on this device and never alter the built-in library for other users.</p>
    {customGuides.length > 0 && <section className="custom-guide-list" aria-label="Your locally saved guides"><h3>Your local guides ({customGuides.length})</h3>{customGuides.map((guide) => <div className="custom-guide-row" key={guide.id}><span><strong>{guide.title}</strong><small>{guide.ecosystem} · {guide.appliesTo}</small></span><button className="quiet-button" onClick={() => remove(guide.id)}>Remove</button></div>)}</section>}
    <section className="guide-pack-tools" aria-label="Offline guide packs"><div><strong>Share a local guide pack</strong><small>JSON only · stays on this device until you export or choose a pack</small></div><div className="option-row"><button className="secondary-button" onClick={() => downloadPack(customGuides)} disabled={!customGuides.length}>Export local pack</button><button className="secondary-button" onClick={() => fileRef.current?.click()}>Choose a pack to preview</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={previewPack} /></div>{packError && <p className="folder-error" role="alert">{packError}</p>}{packDraft && <div className="guide-pack-preview"><strong>{packDraft.additions.length} new guide(s) · {packDraft.skipped} duplicate(s)</strong><ul>{packDraft.additions.slice(0, 6).map((guide) => <li key={guide.id}>{guide.title} · {guide.ecosystem} · {guide.appliesTo}</li>)}</ul><p>Phoenix checks the JSON shape and HTTPS references. It cannot independently verify the guide’s claims. Adding these entries changes only this browser’s local guide list.</p><div className="option-row"><button className="primary-button" onClick={importPack} disabled={!packDraft.additions.length}>Add to my offline guides</button><button className="quiet-button" onClick={() => setPackDraft(null)}>Cancel</button></div></div>}</section>
    <form className="guide-form" onSubmit={preview}>
      <label>Ecosystem or tool<input value={fields.ecosystem} onChange={update('ecosystem')} maxLength={80} placeholder="Python / Django" required /></label>
      <label>Versions this guidance applies to<input value={fields.appliesTo} onChange={update('appliesTo')} maxLength={120} placeholder="Python 3.11–3.14; Django 5.x" required /></label>
      <label>Guide title<input value={fields.title} onChange={update('title')} maxLength={120} placeholder="Django cannot find a migration" required /></label>
      <label>Error phrases or codes <small>One per line</small><textarea value={fields.patterns} onChange={update('patterns')} rows={3} maxLength={1500} placeholder="No migrations detected\nmakemigrations" required /></label>
      <label>Search keywords <small>Comma-separated</small><input value={fields.keywords} onChange={update('keywords')} maxLength={500} placeholder="migration, app label, model" /></label>
      <label>Likely cause<textarea value={fields.cause} onChange={update('cause')} rows={3} maxLength={1000} required /></label>
      <label>Safe recovery steps <small>One step per line</small><textarea value={fields.steps} onChange={update('steps')} rows={4} maxLength={4000} required /></label>
      <label>How to verify<textarea value={fields.verify} onChange={update('verify')} rows={2} maxLength={500} required /></label>
      <label>Official reference URL<input type="url" value={fields.source} onChange={update('source')} maxLength={500} placeholder="https://docs.example.org/..." required /></label>
      <label>Date source checked<input type="date" value={fields.reviewedOn} onChange={update('reviewedOn')} required /></label>
      <label className="attestation"><input type="checkbox" checked={fields.attested} onChange={update('attested')} /> I checked the recovery guidance against the linked source and the version range above.</label>
      <button className="secondary-button" type="submit">Preview guide</button>
    </form>
    {error && <p className="folder-error" role="alert">{error}</p>}
    {message && <p className="apply-status" role="status">{message}</p>}
    {draft && <section className="guide-draft-preview"><h3>Review this guide</h3><p>{draft.title} · {draft.ecosystem} · {draft.appliesTo}</p><pre>{JSON.stringify(draft, null, 2)}</pre><div className="option-row"><button className="primary-button" onClick={save}>Save on this device</button><button className="secondary-button" onClick={() => downloadGuide(draft)}>Export for maintainers</button><button className="quiet-button" onClick={() => setDraft(null)}>Cancel</button></div></section>}
  </details>;
}
