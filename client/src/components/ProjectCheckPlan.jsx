const checkFor = {
  'Python': { label: 'Run Python tests', command: 'python -m pytest', note: 'Use the project’s documented virtual environment.' },
  'Rust': { label: 'Run Rust tests', command: 'cargo test', note: 'Cargo may resolve or download dependencies.' },
  'Go': { label: 'Run Go tests', command: 'go test ./...', note: 'Run from the module root.' },
  '.NET': { label: 'Run .NET tests', command: 'dotnet test', note: 'Run from the solution or test-project folder.' },
  'Java / Maven': { label: 'Run Maven tests', command: 'mvn test', note: 'Review project plugins and build steps first.' },
};

export default function ProjectCheckPlan({ projectPassport = [] }) {
  const checks = projectPassport.flatMap((project) => (project.checks?.length ? project.checks : [checkFor[project.ecosystem]]).filter(Boolean).map((check) => ({ project, check })));
  if (!checks.length) return null;
  return <section className="panel check-plan" aria-labelledby="check-plan-title">
    <div className="panel-heading"><div><p className="step-label">OPTIONAL · YOU STAY IN CONTROL</p><h2 id="check-plan-title">Project check plan</h2></div><span className="text-badge">Suggestions only</span></div>
    <p>These common checks fit the detected project types. Phoenix will not run them. Inspect the project’s scripts and instructions before you choose to run anything.</p>
    <ul>{checks.slice(0, 5).map(({ project, check }) => <li key={`${project.manifest}:${check.command}`}><div><strong>{check.label} · {project.ecosystem}</strong><code>{check.command}</code><small>{check.note} Running project checks can execute project-defined code.</small></div></li>)}</ul>
  </section>;
}
