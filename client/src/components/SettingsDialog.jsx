import { useEffect, useRef, useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

const palettes = ['ember', 'ocean', 'violet', 'forest'];
const backgrounds = [
  { id: 'horizon', name: 'Horizon', description: 'Soft glow with fine light trails' },
  { id: 'aurora', name: 'Aurora', description: 'Layered color drifting overhead' },
  { id: 'embers', name: 'Embers', description: 'Low, rising points of light' },
  { id: 'minimal', name: 'Quiet', description: 'A clean, nearly solid backdrop' },
];
const presets = [
  { name: 'Phoenix Rising', palette: 'phoenix', theme: 'dark', description: 'molten gold · midnight ash' },
  { name: 'Ashfall', palette: 'ashfall', theme: 'dark', description: 'smoke · ember red' },
  { name: 'First Light', palette: 'firstlight', theme: 'light', description: 'warm ivory · sunrise' },
];
export default function SettingsDialog({ open, onClose }) {
  const ref = useRef(null);
  const { adapterMode, providerName, modelName, providerLabel, diagnosisMode, setDiagnosisMode, configStatus } = useSession();
  const [prefs, setPrefs] = useState(() => {
    try { return { theme: localStorage.getItem('phoenix-theme') || 'dark', palette: localStorage.getItem('phoenix-palette') || 'ember', layout: localStorage.getItem('phoenix-layout') || 'comfortable', background: localStorage.getItem('phoenix-background') || 'horizon' }; }
    catch { return { theme: 'dark', palette: 'ember', layout: 'comfortable', background: 'horizon' }; }
  });
  const applyPreset = (preset) => setPrefs({ ...prefs, palette: preset.palette, theme: preset.theme });
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.palette = prefs.palette;
    document.documentElement.dataset.layout = prefs.layout;
    document.documentElement.dataset.background = prefs.background;
    try { localStorage.setItem('phoenix-theme', prefs.theme); localStorage.setItem('phoenix-palette', prefs.palette); localStorage.setItem('phoenix-layout', prefs.layout); localStorage.setItem('phoenix-background', prefs.background); } catch { /* Preferences are optional. */ }
  }, [prefs]);
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  return <dialog ref={ref} className="settings-dialog" onClose={onClose} aria-labelledby="settings-title">
    <div className="dialog-heading"><div><p className="step-label">PERSONALIZE</p><h2 id="settings-title">Settings</h2></div><button className="quiet-button" onClick={onClose} aria-label="Close settings">Close</button></div>
    <fieldset><legend>Phoenix themes</legend><div className="theme-presets">{presets.map((preset) => <button key={preset.name} className={`theme-preset preset-${preset.palette}`} aria-pressed={prefs.palette === preset.palette && prefs.theme === preset.theme} onClick={() => applyPreset(preset)}><span className="theme-swatch" aria-hidden="true" /><strong>{preset.name}</strong><small>{preset.description}</small></button>)}</div></fieldset>
    <fieldset><legend>Color palette</legend><div className="option-row">{palettes.map((palette) => <button key={palette} className={`choice-button palette-${palette}`} aria-pressed={prefs.palette === palette} onClick={() => setPrefs({ ...prefs, palette })}>{palette[0].toUpperCase() + palette.slice(1)}</button>)}</div></fieldset>
    <fieldset><legend>Appearance</legend><div className="option-row">{['dark', 'light'].map((theme) => <button key={theme} className="choice-button" aria-pressed={prefs.theme === theme} onClick={() => setPrefs({ ...prefs, theme })}>{theme === 'dark' ? 'Dark' : 'Light'}</button>)}</div></fieldset>
    <fieldset><legend>Background</legend><div className="background-options">{backgrounds.map((background) => <button key={background.id} className={`background-choice background-${background.id}`} aria-pressed={prefs.background === background.id} onClick={() => setPrefs({ ...prefs, background: background.id })}><span className="background-preview" aria-hidden="true" /><strong>{background.name}</strong><small>{background.description}</small></button>)}</div></fieldset>
    <fieldset><legend>Layout</legend><div className="option-row">{['comfortable', 'compact'].map((layout) => <button key={layout} className="choice-button" aria-pressed={prefs.layout === layout} onClick={() => setPrefs({ ...prefs, layout })}>{layout[0].toUpperCase() + layout.slice(1)}</button>)}</div></fieldset>
    <fieldset><legend>Diagnosis mode</legend><div className="option-row"><button className="choice-button" aria-pressed={diagnosisMode === 'provider'} onClick={() => setDiagnosisMode('provider')}>Model connector</button><button className="choice-button" aria-pressed={diagnosisMode === 'offline'} onClick={() => setDiagnosisMode('offline')}>Offline guide search</button></div></fieldset>
    <section className="connector-info"><h3>Model connection</h3><p>{configStatus === 'error' ? 'Model configuration is unavailable; offline guide search still works.' : adapterMode === 'mock' ? 'Mock demo · fixed responses, no external model connected' : `${providerName} · ${modelName} · ${providerLabel}`}</p><p>To connect or change a model, edit the root <code>.env</code> file and restart Phoenix. Your key stays on this computer and is never entered in these settings.</p></section>
  </dialog>;
}
