const signatures = [
  /\b(?:ERR_[A-Z0-9_]+|SQLITE_[A-Z0-9_]+|E\d{4}|SQLSTATE\s+[0-9A-Z]+)/gi,
  /\b(?:ModuleNotFoundError|ImportError|TypeError|ReferenceError|SyntaxError|NullPointerException|ClassNotFoundException|OutOfMemoryError|Segmentation fault|StackOverflowError)\b/gi,
];

export function collectDiagnosticEvidence(input = '', passport = []) {
  const observed = [...new Set(signatures.flatMap((pattern) => input.match(pattern) || []))].slice(0, 8);
  const locations = [...new Set(input.match(/\b[\w./\\-]+\.(?:js|jsx|ts|tsx|py|java|cs|go|rs|php|rb|sql):\d+(?::\d+)?/g) || [])].slice(0, 5);
  return {
    errorSignatures: observed,
    locations,
    projectFacts: passport.flatMap((entry) => [
      `${entry.ecosystem} detected from ${entry.manifest}`,
      ...entry.versions.map((version) => `${version} listed in ${entry.manifest}`),
    ]).slice(0, 16),
  };
}
