const profiles = [
  {
    id: 'unreal', name: 'Unreal Engine', matches: (ecosystem) => ecosystem?.toLowerCase().includes('unreal'),
    marker: (path) => /\.uproject$|\.uplugin$|(?:^|\/)config\/defaultengine\.ini$/i.test(path),
    log: (path) => /(?:^|\/)saved\/logs\/[^/]+\.log$|(?:unrealeditor|unrealgame|unrealbuildtool)[^/]*\.log$/i.test(path),
    error: /(?:\bLog[A-Za-z0-9_]+:\s*Error:|Fatal error:|Assertion failed|PackagingResults:\s*Error)/i,
  },
  {
    id: 'unity', name: 'Unity', matches: (ecosystem) => ecosystem === 'Unity',
    marker: (path) => /(?:^|\/)projectversion\.txt$|(?:^|\/)packages\/manifest\.json$|\.asmdef$/i.test(path),
    log: (path) => /(?:^|\/)(?:editor|player)\.log$|unity[^/]*\.log$/i.test(path),
    error: /(?:\berror\s+CS\d+\b|NullReferenceException|MissingReferenceException|Shader error|Failed to resolve packages|Package Manager Error)/i,
  },
  {
    id: 'cryengine', name: 'CRYENGINE', matches: (ecosystem) => ecosystem === 'CRYENGINE',
    marker: (path) => /\.cryproject$|(?:^|\/)project\.cfg$/i.test(path),
    log: (path) => /(?:^|\/)(?:game|editor|error)\.log$|cryengine[^/]*\.log$/i.test(path),
    error: /(?:^\s*Error:\s|^\s*CRITICAL ERROR|CryAssert|assertion failed|Failed to (?:load|open|initialize))/im,
  },
];

const normalizeMessage = (line) => line
  .replace(/^\s*\[[^\]]+\]\s*/, '')
  .replace(/\b0x[\da-f]+\b/gi, '<address>')
  .replace(/\b\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?\b/g, '<time>')
  .replace(/\s+/g, ' ').trim().slice(0, 240);

function findLogEvents(profile, logs) {
  const events = [];
  for (const file of logs) {
    file.content.split(/\r?\n/).forEach((line, index) => {
      if (!profile.error.test(line)) return;
      const message = normalizeMessage(line);
      if (!message) return;
      events.push({ file: file.path, line: index + 1, message });
    });
  }
  const firstBySignature = new Map();
  for (const event of events) {
    const key = event.message.toLowerCase();
    const prior = firstBySignature.get(key);
    if (prior) { prior.count += 1; prior.occurrences.push({ file: event.file, line: event.line }); }
    else firstBySignature.set(key, { ...event, count: 1, occurrences: [{ file: event.file, line: event.line }] });
  }
  const groups = [...firstBySignature.values()];
  return { timeline: groups.slice(0, 12), groups: groups.slice(0, 8) };
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function summarizeProfilerCsv(files) {
  const summaries = [];
  for (const file of files.filter(({ path }) => /\.csv$/i.test(path)).slice(0, 5)) {
    const rows = file.content.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) continue;
    const headers = parseCsvLine(rows[0]);
    const metrics = headers.map((header, column) => {
      if (!/(?:frame|cpu|gpu|memory|alloc|time|duration)/i.test(header)) return null;
      const values = rows.slice(1, 1001).map((row) => Number(parseCsvLine(row)[column])).filter(Number.isFinite);
      if (!values.length) return null;
      const total = values.reduce((sum, value) => sum + value, 0);
      return { header, samples: values.length, min: Math.min(...values), average: total / values.length, max: Math.max(...values) };
    }).filter(Boolean).slice(0, 8);
    if (metrics.length) summaries.push({ path: file.path, metrics });
  }
  return summaries;
}

function healthFor(profile, projects) {
  const versions = projects.flatMap((project) => project.versions.map((value) => ({ project: project.project, value })));
  const versionCategory = (value) => {
    if (value.startsWith('Engine association')) return 'Unreal engine association';
    if (value.startsWith('Unity Editor')) return 'Unity Editor version';
    if (value.startsWith('Declared engine reference')) return 'CRYENGINE reference';
    if (/^Project format/.test(value)) return 'CRYENGINE project format';
    const packageMatch = value.match(/^(com\.unity\.[^\s]+)/);
    return packageMatch ? `Unity package ${packageMatch[1]}` : null;
  };
  const byDeclaration = new Map();
  for (const item of versions) {
    const category = versionCategory(item.value);
    if (!category) continue;
    const key = `${item.project}\0${category}`;
    const values = byDeclaration.get(key) || { project: item.project, category, values: new Set() };
    values.values.add(item.value);
    byDeclaration.set(key, values);
  }
  const conflicts = [...byDeclaration.values()].filter((entry) => entry.values.size > 1).map((entry) => ({
    project: entry.project, category: entry.category, values: [...entry.values],
  }));
  const marker = {
    unreal: (value) => value.startsWith('Engine association'),
    unity: (value) => value.startsWith('Unity Editor'),
    cryengine: (value) => value.startsWith('Declared engine reference'),
  }[profile.id];
  return { missingEngineDeclaration: !versions.some((item) => marker(item.value)), conflicts };
}

export function buildGameConnectors(files = [], passport = []) {
  const fileIndex = new Map(files.map((file) => [file.path.replace(/\\/g, '/'), file]));
  const detected = profiles.filter((profile) => passport.some((project) => profile.matches(project.ecosystem)));
  return detected.map((profile) => {
    const markerFiles = files.filter(({ path }) => profile.marker(path.replace(/\\/g, '/'))).map(({ path }) => path);
    const logs = files.filter(({ path }) => profile.log(path.replace(/\\/g, '/')) || (detected.length === 1 && /\.log$/i.test(path))).sort((left, right) => left.path.localeCompare(right.path));
    const { timeline, groups } = findLogEvents(profile, logs);
    const manifestDetails = passport.filter((project) => profile.matches(project.ecosystem));
    return {
      id: profile.id,
      name: profile.name,
      projects: manifestDetails,
      markerFiles,
      logs: logs.map(({ path }) => path),
      timeline,
      groups,
      health: healthFor(profile, manifestDetails),
      profilerSummaries: summarizeProfilerCsv(files),
      inspectedTextFiles: files.length,
      connectionType: 'Selected local project folder · read-only scan',
      note: profile.id === 'unity'
        ? 'Unity Editor.log is often stored outside the project folder. Paste it into the diagnosis or copy it into the selected folder if you want Phoenix to inspect it.'
        : 'Phoenix reads only the supported text files in the selected folder. It does not attach to the running editor or game.',
      readPaths: [...new Set([...markerFiles, ...logs.map(({ path }) => path)])].slice(0, 20),
      hasProjectEvidence: markerFiles.length > 0 && fileIndex.size > 0,
    };
  });
}

export function buildGameRescuePrompt(engine, issue, details = '') {
  const prompts = {
    'build-or-package': ['What exact build, cook, or packaging step failed?', 'Paste the first relevant error and the nearby log lines.', 'What engine version and target platform are involved?'],
    'launch-crash': ['Does the editor, game, or both crash?', 'When does it happen, and what changed just before it started?', 'Paste the crash or startup log excerpt.'],
    'missing-assets': ['Which asset or resource is missing?', 'What is its expected project path or identifier?', 'Did it move, get renamed, or change source control state?'],
    'shader-rendering': ['Which shader/material or rendering feature is affected?', 'What GPU/API/platform is involved?', 'Paste the shader/compiler message and describe expected versus actual output.'],
    'performance': ['What is slow: editor, loading, CPU, GPU, memory, or frame time?', 'Which scene/action reproduces it, and what changed?', 'Paste a short profiler export or measured values with units.'],
  };
  const engineQuestions = {
    'Unreal Engine': {
      'build-or-package': 'Which target/configuration failed, and what is the first relevant line in the project Saved/Logs log or build output?',
      'launch-crash': 'Does the project Saved/Logs log or crash report show the first failure before the crash?',
      'missing-assets': 'What Unreal asset/object path is missing, and does the log mention a failed package load or redirector?',
      'shader-rendering': 'Which material or shader permutation is affected, and what does the shader compile log report?',
      performance: 'If available, include a text or CSV export of the Unreal Insights/Stat measurements and the capture target.',
    },
    Unity: {
      'build-or-package': 'Is the first failure a C# compiler error, a Package Manager resolution error, or a build-target error? Include the first Console error.',
      'launch-crash': 'Does the Unity Editor.log or Player.log contain the first exception or native crash detail?',
      'missing-assets': 'Which asset path or GUID is missing, and did its .meta file move or change?',
      'shader-rendering': 'Which render pipeline and shader are involved, and what is the first Console shader error?',
      performance: 'If available, include a Unity Profiler CSV export with the target device and capture conditions.',
    },
    CRYENGINE: {
      'build-or-package': 'Did project generation, the Visual Studio/CMake build, or packaging fail? Include the first build output error.',
      'launch-crash': 'Does editor.log, game.log, or error.log contain an earlier error before the crash?',
      'missing-assets': 'Which asset or level resource is missing, and what does the CRYENGINE Error Report Window or log identify?',
      'shader-rendering': 'Which material or rendering feature is affected, and what shader or renderer error appears in the log?',
      performance: 'If available, include a Statoscope CSV/text export with the scene and capture conditions.',
    },
  };
  const title = issue.replaceAll('-', ' ');
  const specificQuestion = engineQuestions[engine]?.[issue];
  return [`Engine: ${engine}`, `Issue: ${title}`, '', 'Please help me diagnose this game-project issue using only the evidence below. Separate observed facts from likely explanations. Ask for missing context instead of guessing. Do not recommend destructive changes.', ...prompts[issue].map((question) => `- ${question}`), ...(specificQuestion ? [`- ${specificQuestion}`] : []), '', 'My details:', details.trim() || '[Add what happened here]'].join('\n');
}
