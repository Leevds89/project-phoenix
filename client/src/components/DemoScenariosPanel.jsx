import { demoScenarios } from '../data/demoScenarios.js';
import { useSession } from '../context/SessionContext.jsx';

export default function DemoScenariosPanel() {
  const { tryDemoScenario } = useSession();
  return <details className="demo-scenarios">
    <summary><span><strong>Run the rescue walkthrough</strong><small>Six general cases plus Unreal, Unity, and CRYENGINE · no model required</small></span><span aria-hidden="true">＋</span></summary>
    <ol className="demo-flow" aria-label="Walkthrough stages"><li><strong>Choose</strong><small>a sample failure</small></li><li><strong>See</strong><small>what Phoenix noticed</small></li><li><strong>Recover</strong><small>with careful steps</small></li><li><strong>Verify</strong><small>and save a card</small></li></ol>
    <div className="scenario-grid">{demoScenarios.map((scenario) => <article className="scenario-card" key={scenario.title}>
      <span className="match-ecosystem">{scenario.ecosystem}</span><h3>{scenario.title}</h3>
      <p>{scenario.input}</p>
      <button className="secondary-button" onClick={() => tryDemoScenario(scenario)}>Try this case</button>
    </article>)}</div>
    <p className="input-hint">Sample text runs through Phoenix’s bundled offline search. It does not call a model or send data.</p>
  </details>;
}
