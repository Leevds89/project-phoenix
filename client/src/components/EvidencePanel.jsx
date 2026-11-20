import { collectDiagnosticEvidence } from '../lib/diagnosticEvidence.js';
import { searchOfflineKnowledge } from '../lib/offlineSearch.js';
import { passportSummary } from '../lib/projectPassport.js';
import { buildGameConnectors } from '../lib/gameConnectors.js';

export default function EvidencePanel({ input, projectPassport = [], projectFiles = [], diagnosisMode = 'offline' }) {
  const evidence = collectDiagnosticEvidence(input, projectPassport);
  const referenceMatches = diagnosisMode === 'offline' ? [] : searchOfflineKnowledge(input, passportSummary(projectPassport)).matches;
  const engineEvidence = buildGameConnectors(projectFiles, projectPassport).flatMap((connector) => connector.timeline.map((event) => ({ engine: connector.name, ...event })));
  const hasEvidence = evidence.errorSignatures.length || evidence.locations.length || evidence.projectFacts.length || referenceMatches.length || engineEvidence.length;
  return <section className="panel evidence-panel" aria-labelledby="evidence-title">
    <div className="panel-heading"><div><p className="step-label">SHOW YOUR WORK</p><h2 id="evidence-title">What Phoenix observed</h2></div><span className="text-badge">Evidence, not certainty</span></div>
    {!hasEvidence ? <p className="evidence-caveat">Phoenix did not find a recognizable error code or selected-project manifest. The diagnosis remains a likely explanation, not a confirmed cause.</p> : <div className="evidence-groups">
      {evidence.errorSignatures.length > 0 && <section><h3>In the pasted error</h3><ul>{evidence.errorSignatures.map((item) => <li key={item}><code>{item}</code></li>)}</ul></section>}
      {evidence.locations.length > 0 && <section><h3>Locations mentioned</h3><ul>{evidence.locations.map((item) => <li key={item}><code>{item}</code></li>)}</ul></section>}
      {evidence.projectFacts.length > 0 && <section><h3>From selected project manifests</h3><ul>{evidence.projectFacts.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      {engineEvidence.length > 0 && <section><h3>Engine log excerpts</h3><ul>{engineEvidence.slice(0, 12).map((item, index) => <li key={`${item.file}:${item.line}:${index}`}><strong>{item.engine} · <code>{item.file}:{item.line}</code></strong><br /><code>{item.message}</code></li>)}</ul><small>These excerpts are observed text, not confirmed causes.</small></section>}
      {referenceMatches.length > 0 && <section><h3>Local reference matches</h3><ul>{referenceMatches.map((match) => <li key={match.id}><a href={match.source} target="_blank" rel="noreferrer">{match.title} · {match.ecosystem}</a>{match.custom && <small>Locally contributed guide · review its source</small>}<br /><small>Matched: {match.matchedTerms.join(', ')}</small></li>)}</ul></section>}
    </div>}
    <p className="evidence-caveat">These clues are observations. They do not prove the root cause; check the recovery guidance against your project.</p>
  </section>;
}
