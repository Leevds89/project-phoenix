function safeLine(value) { return String(value ?? '').replace(/[\r\n]+/g, ' ').trim(); }

export function buildRecoveryCard({ diagnosis, diagnosisMode, matches = [], projectPassport = [], verificationStatus, verifiedAt, fileChanges = [], demoTitle }) {
  const steps = diagnosis?.recoverySteps?.map((step) => `${step.order}. ${safeLine(step.text)}`).join('\n') || 'No recovery steps were provided.';
  const references = matches.length ? matches.map((match) => `- [${safeLine(match.title)}](${match.source}) — ${safeLine(match.ecosystem)}`).join('\n') : 'No offline guide references were attached.';
  const edits = fileChanges.length ? fileChanges.map((change) => `- ${change.status === 'undone' ? 'Undone' : 'Applied'}: ${change.paths.join(', ')}`).join('\n') : 'No Phoenix file edits were applied.';
  const passport = projectPassport.length ? projectPassport.map((project) => `- ${safeLine(project.project)} · ${safeLine(project.ecosystem)}${project.versions.length ? ` · ${project.versions.map(safeLine).join(', ')}` : ''} (manifest: ${safeLine(project.manifest)})`).join('\n') : 'No selected-project manifest was available.';
  const verification = verificationStatus === 'passed'
    ? `User reported as passed${verifiedAt ? ` at ${new Date(verifiedAt).toLocaleString()}` : ''}. Phoenix did not run or independently verify this check.`
    : verificationStatus === 'failed' ? 'Failed; follow-up was requested.' : 'Not marked as passed or failed.';
  return [
    '# Phoenix Recovery Card',
    '',
    `- Created: ${new Date().toISOString()}`,
    `- Mode: ${diagnosisMode === 'offline' ? 'Offline Guide Search' : 'Configured model connector'}`,
    ...(demoTitle ? [`- Sample scenario: ${safeLine(demoTitle)}`] : []),
    '',
    '## Summary',
    safeLine(diagnosis?.summary),
    '',
    '## Likely cause',
    safeLine(diagnosis?.rootCause || 'Phoenix requested more context.'),
    '',
    '## Recovery steps',
    steps,
    '',
    '## Selected-project evidence',
    passport,
    '',
    '## Verification',
    safeLine(diagnosis?.verificationStep?.text || 'No verification step was provided.'),
    `Result: ${verification}`,
    '',
    '## Phoenix file edits',
    edits,
    '',
    '## References',
    references,
    '',
    '> Privacy: the original pasted error, project file contents, and credentials are not included in this card.',
    '',
  ].join('\n');
}
