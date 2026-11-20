import { useMemo, useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { buildGameConnectors, buildGameRescuePrompt } from '../lib/gameConnectors.js';

const issues = [
  ['build-or-package', 'Build, cook, or package failure'],
  ['launch-crash', 'Crash on launch'],
  ['missing-assets', 'Missing asset or resource'],
  ['shader-rendering', 'Shader or rendering problem'],
  ['performance', 'Performance or frame-rate issue'],
];

export function GameRescuePanel() {
  const { input, projectPassport, updateInput } = useSession();
  const engines = [...new Set(projectPassport.filter((project) => ['Unreal Engine', 'Unreal Engine plugin', 'Unity', 'CRYENGINE'].includes(project.ecosystem)).map((project) => project.ecosystem === 'Unreal Engine plugin' ? 'Unreal Engine' : project.ecosystem))];
  const [engine, setEngine] = useState(engines[0] || 'Unreal Engine');
  const [issue, setIssue] = useState('build-or-package');
  const [details, setDetails] = useState('');
  if (projectPassport.length && !projectPassport.some((project) => ['Unreal Engine', 'Unreal Engine plugin', 'Unity', 'CRYENGINE'].includes(project.ecosystem))) return null;
  function addFlow() {
    const prompt = buildGameRescuePrompt(engine, issue, details);
    updateInput([input.trim(), prompt].filter(Boolean).join('\n\n').slice(0, 8000));
    setDetails('');
  }
  return <section className="panel game-rescue" aria-labelledby="game-rescue-title">
    <div className="panel-heading"><div><p className="step-label">GAME DEVELOPMENT · GUIDED START</p><h2 id="game-rescue-title">Start a game rescue</h2></div><span className="text-badge">No commands run</span></div>
    <p>Choose the engine and problem. Phoenix will add useful questions to your diagnosis draft; it won’t inspect or change files until you select a project folder.</p>
    <div className="game-flow-controls">
      <label>Engine<select value={engine} onChange={(event) => setEngine(event.target.value)}>{[...new Set([...engines, 'Unreal Engine', 'Unity', 'CRYENGINE'])].map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>What went wrong?<select value={issue} onChange={(event) => setIssue(event.target.value)}>{issues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label className="game-details-label" htmlFor="game-rescue-details">Optional details</label>
    <textarea id="game-rescue-details" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1200} rows={3} placeholder="What were you doing? What did you expect? What changed recently?" />
    <button className="secondary-button" onClick={addFlow}>Add questions to diagnosis</button>
  </section>;
}

function downloadMarkdown(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function GameBugReport({ connectors }) {
  const [engine, setEngine] = useState(connectors[0]?.name || 'Game project');
  const [platform, setPlatform] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [includeLogs, setIncludeLogs] = useState(false);
  const [preview, setPreview] = useState(false);
  const selected = connectors.find((connector) => connector.name === engine) || connectors[0];
  const report = [
    '# Phoenix game bug report', '', `- Engine: ${engine}`,
    `- Project: ${selected?.projects.map((project) => project.project).join(', ') || 'Not detected'}`,
    `- Declared versions: ${selected?.projects.flatMap((project) => project.versions).join(', ') || 'Not detected'}`,
    `- Platform: ${platform.trim() || 'Not provided'}`, '', '## Steps to reproduce', steps.trim() || 'Not provided', '',
    '## Expected behavior', expected.trim() || 'Not provided', '', '## Actual behavior', actual.trim() || 'Not provided', '',
    ...(includeLogs ? ['## Relevant detected log lines', ...(selected?.timeline.slice(0, 8).map((event) => `- ${event.file}:${event.line} ${event.message}`) || ['No matching log lines found.']), ''] : []),
    '## Phoenix project evidence', ...(selected?.readPaths.slice(0, 12).map((path) => `- ${path}`) || ['- No project files detected.']), '',
    '> Review this report before sharing. Selected log excerpts can contain personal or confidential information.', '',
  ].join('\n');
  return <div className="game-report-builder">
    <div className="panel-heading"><div><p className="step-label">SHARE A REPRODUCIBLE ISSUE</p><h3>Game bug report</h3></div><span className="text-badge">Preview first</span></div>
    <div className="game-flow-controls"><label>Engine<select value={engine} onChange={(event) => setEngine(event.target.value)}>{connectors.map((connector) => <option key={connector.id}>{connector.name}</option>)}</select></label><label>Platform<input value={platform} maxLength={100} onChange={(event) => setPlatform(event.target.value)} placeholder="Windows, PlayStation, Android…" /></label></div>
    <label>Steps to reproduce<textarea value={steps} onChange={(event) => setSteps(event.target.value)} rows={3} maxLength={1500} placeholder="1. Open…&#10;2. Select…&#10;3. Observe…" /></label>
    <div className="game-flow-controls"><label>Expected behavior<textarea value={expected} onChange={(event) => setExpected(event.target.value)} rows={2} maxLength={800} /></label><label>Actual behavior<textarea value={actual} onChange={(event) => setActual(event.target.value)} rows={2} maxLength={800} /></label></div>
    <label className="game-checkbox"><input type="checkbox" checked={includeLogs} onChange={(event) => setIncludeLogs(event.target.checked)} /> Include matching log excerpts (review for sensitive data)</label>
    <div className="game-report-actions"><button className="secondary-button" onClick={() => setPreview(!preview)}>{preview ? 'Hide preview' : 'Preview report'}</button><button className="primary-button compact" disabled={!preview} onClick={() => downloadMarkdown(report, `phoenix-game-report-${new Date().toISOString().slice(0, 10)}.md`)}>Download report</button></div>
    {preview && <pre className="game-report-preview">{report}</pre>}
  </div>;
}

export function GameConnectorsPanel() {
  const { projectFiles, projectPassport, input, updateInput } = useSession();
  const connectors = useMemo(() => buildGameConnectors(projectFiles, projectPassport), [projectFiles, projectPassport]);
  if (!connectors.length) return null;
  function useFindings(connector) {
    const excerpts = connector.timeline.slice(0, 8).map((event) => `[${event.file}:${event.line}] ${event.message}`);
    const addendum = [`Engine: ${connector.name}`, 'Detected project log findings:', ...excerpts].join('\n');
    updateInput([input.trim(), addendum].filter(Boolean).join('\n\n').slice(0, 8000));
  }
  return <section className="panel game-connectors" aria-labelledby="game-connectors-title">
    <div className="panel-heading"><div><p className="step-label">LOCAL GAME ENGINE CONNECTORS</p><h2 id="game-connectors-title">Connected project evidence</h2></div><span className="text-badge">Read-only</span></div>
    <p>These connectors read supported text files from the folder you selected. They do not attach to a running editor or game, install an engine plugin, or transmit anything until you submit a diagnosis.</p>
    {connectors.map((connector) => <article className="game-connector-card" key={connector.id}>
      <div className="game-connector-heading"><div><span className="connector-state">CONNECTED · LOCAL FOLDER</span><h3>{connector.name}</h3></div><span className="text-badge">{connector.inspectedTextFiles} files scanned</span></div>
      <p>{connector.projects.map((project) => `${project.project}${project.versions.length ? ` · ${project.versions.join(', ')}` : ''}`).join(' | ')}</p>
      <div className="game-health-note"><strong>Project health snapshot</strong><span>Confirmed from selected files: project marker{connector.markerFiles.length === 1 ? '' : 's'}{connector.markerFiles.length ? ` (${connector.markerFiles.length})` : ' not found in the bounded scan'}, declared version details when present, and matching log excerpts.</span>{connector.health.missingEngineDeclaration && <span>No explicit engine-version or engine-reference declaration was found in the scanned project metadata. That can be intentional; Phoenix does not treat it as an error.</span>}{connector.health.conflicts.map((conflict) => <span key={`${conflict.project}:${conflict.category}`}>Different {conflict.category} declarations found for {conflict.project}: {conflict.values.join(' / ')}. Check whether these files belong to the same project.</span>)}<span>Not checked: whether this engine is installed, whether declared packages/assets are available, or whether the project currently builds and runs.</span></div>
      <div className="game-connector-facts"><section><strong>Project markers</strong>{connector.markerFiles.length ? <ul>{connector.markerFiles.map((path) => <li key={path}><code>{path}</code></li>)}</ul> : <small>No engine marker in scanned files.</small>}</section><section><strong>Logs found</strong>{connector.logs.length ? <ul>{connector.logs.map((path) => <li key={path}><code>{path}</code></li>)}</ul> : <small>No matching log file in the selected folder.</small>}</section></div>
      {connector.timeline.length > 0 ? <section className="game-log-timeline"><h4>Log timeline · first occurrence of each matching message</h4><ol>{connector.timeline.map((event, index) => <li key={`${event.file}:${event.line}:${index}`}><code>{event.file}:{event.line}</code><span>{event.message}</span></li>)}</ol><p>Entries follow selected-file order; Phoenix does not correlate timestamps across separate logs or decide which errors caused others. A later error can be a follow-on symptom.</p>{connector.groups.filter((group) => group.count > 1).length > 0 && <p>Repeated matching lines are grouped below; repetition alone does not prove they share one cause.</p>}<ul className="game-log-groups">{connector.groups.filter((group) => group.count > 1).map((group) => <li key={`${group.file}:${group.line}`}>{group.count} occurrences · first at <code>{group.file}:{group.line}</code></li>)}</ul><button className="secondary-button" onClick={() => useFindings(connector)}>Add these findings to diagnosis</button></section> : <p className="game-connector-note">No matching error lines were found in the scanned logs. {connector.note}</p>}
      {connector.profilerSummaries.length > 0 && <section className="game-profiler-summary"><h4>Profiler CSV overview · raw values and units as exported</h4>{connector.profilerSummaries.map((summary) => <div key={summary.path}><strong>{summary.path}</strong><ul>{summary.metrics.map((metric) => <li key={metric.header}>{metric.header}: {metric.samples} samples · min {metric.min.toPrecision(4)} · avg {metric.average.toPrecision(4)} · max {metric.max.toPrecision(4)}</li>)}</ul></div>)}<small>These are simple numeric summaries, not a performance diagnosis. Confirm column units and capture conditions in the source profiler.</small></section>}
      <p className="game-connector-note">{connector.note}</p>
    </article>)}
    <GameBugReport connectors={connectors} />
  </section>;
}

export function GameRecoveryTracker() {
  const { projectPassport, recoveryAttempts, addRecoveryAttempt, status } = useSession();
  const isGameProject = projectPassport.some((project) => ['Unreal Engine', 'Unreal Engine plugin', 'Unity', 'CRYENGINE'].includes(project.ecosystem));
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  if (!isGameProject || status !== 'result') return null;
  function save() {
    if (!action.trim() && !result.trim()) return;
    addRecoveryAttempt({ action: action.trim(), result: result.trim(), at: new Date().toISOString() });
    setAction(''); setResult('');
  }
  return <section className="panel game-recovery-tracker" aria-labelledby="game-recovery-title"><div className="panel-heading"><div><p className="step-label">SESSION ONLY · GAME RECOVERY</p><h2 id="game-recovery-title">Track what you tried</h2></div><span className="text-badge">Clears with session</span></div><div className="game-flow-controls"><label>What did you try?<textarea rows={2} maxLength={1000} value={action} onChange={(event) => setAction(event.target.value)} placeholder="Describe the step you took…" /></label><label>What changed?<textarea rows={2} maxLength={1000} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Paste a short result or describe what you observed…" /></label></div><button className="secondary-button" onClick={save} disabled={!action.trim() && !result.trim()}>Save attempt to this session</button>{recoveryAttempts.length > 0 && <ol className="game-attempt-list">{recoveryAttempts.map((attempt, index) => <li key={`${attempt.at}-${index}`}><strong>Attempt {index + 1}</strong>{attempt.action && <span>Tried: {attempt.action}</span>}{attempt.result && <span>Observed: {attempt.result}</span>}</li>)}</ol>}<p className="game-connector-note">If you request a follow-up diagnosis after a failed verification, Phoenix will include these session notes with the result you provide.</p></section>;
}
