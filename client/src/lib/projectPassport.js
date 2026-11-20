const basename = (path) => path.split('/').at(-1)?.toLowerCase() || '';
const capture = (text, pattern) => text.match(pattern)?.[1]?.trim() || null;
const safeText = (value) => typeof value === 'string' ? value.trim().slice(0, 100) : null;

function nodePassport(file) {
  try {
    const manifest = JSON.parse(file.content);
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    const tools = ['react', 'vite', 'next', 'express', 'typescript', 'vue', 'svelte', 'angular'];
    const frameworks = tools.filter((name) => dependencies[name]).map((name) => `${name} ${dependencies[name]}`);
    const scriptNames = Object.keys(manifest.scripts || {}).filter((name) => /^[A-Za-z][\w:-]{0,39}$/.test(name));
    const checks = ['test', 'build', 'lint'].filter((name) => scriptNames.includes(name)).map((name) => ({ label: `Run the ${name} script`, command: `npm run ${name}`, note: `This script is declared in ${file.path}.` }));
    return { ecosystem: 'JavaScript / Node.js', project: safeText(manifest.name) || 'Node.js project', versions: [manifest.engines?.node ? `Node ${manifest.engines.node}` : null, ...frameworks].filter(Boolean).slice(0, 6), checks, manifest: file.path };
  } catch { return null; }
}

function unityPassport(file) {
  const name = basename(file.path);
  if (name === 'projectversion.txt') {
    const version = capture(file.content, /^m_EditorVersion:\s*(.+)$/m);
    const project = file.path.split('/').length > 2 ? safeText(file.path.split('/')[0]) : 'Unity project';
    return { ecosystem: 'Unity', project: project || 'Unity project', versions: version ? [`Unity Editor ${version}`] : [], manifest: file.path };
  }
  if (!/(?:^|\/)packages\/manifest\.json$/i.test(file.path.replace(/\\/g, '/'))) return null;
  try {
    const manifest = JSON.parse(file.content);
    const dependencies = manifest.dependencies || {};
    const relevant = ['com.unity.render-pipelines.universal', 'com.unity.render-pipelines.high-definition', 'com.unity.inputsystem', 'com.unity.entities'];
    const packages = relevant.filter((key) => dependencies[key]).map((key) => {
      const declared = typeof dependencies[key] === 'string' && /^[~^]?\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(dependencies[key])
        ? dependencies[key]
        : 'custom reference';
      return `${key} ${declared}`;
    });
    return { ecosystem: 'Unity', project: 'Unity project packages', versions: packages.slice(0, 5), manifest: file.path };
  } catch { return null; }
}

function projectPassportFor(file) {
  const name = basename(file.path);
  const text = file.content;
  if (name.endsWith('.cryproject')) {
    try {
      const descriptor = JSON.parse(text);
      const versions = [Number.isFinite(descriptor.version) ? `Project format ${descriptor.version}` : null,
        descriptor.require?.engine ? `Declared engine reference ${safeText(descriptor.require.engine)}` : null].filter(Boolean);
      return { ecosystem: 'CRYENGINE', project: safeText(descriptor.info?.name) || safeText(file.path.split('/').at(-1).replace(/\.cryproject$/i, '')) || 'CRYENGINE project', versions, manifest: file.path };
    } catch { return null; }
  }
  if (name.endsWith('.uproject') || name.endsWith('.uplugin')) {
    try {
      const descriptor = JSON.parse(text);
      const project = file.path.split('/').at(-1).replace(/\.(?:uproject|uplugin)$/i, '');
      const isPlugin = name.endsWith('.uplugin');
      const versions = [descriptor.EngineAssociation ? `Engine association ${safeText(descriptor.EngineAssociation)}` : null,
        Number.isFinite(descriptor.Version) ? `Plugin descriptor version ${descriptor.Version}` : null].filter(Boolean);
      return { ecosystem: isPlugin ? 'Unreal Engine plugin' : 'Unreal Engine', project: safeText(project) || 'Unreal project', versions, manifest: file.path };
    } catch { return null; }
  }
  if (name === 'package.json') return nodePassport(file);
  if (name === 'projectversion.txt' || /(?:^|\/)packages\/manifest\.json$/i.test(file.path.replace(/\\/g, '/'))) return unityPassport(file);
  if (name === 'go.mod') return { ecosystem: 'Go', project: safeText(capture(text, /^module\s+(.+)$/m)) || 'Go module', versions: [capture(text, /^go\s+([\d.]+)$/m)].filter(Boolean).map((version) => `Go ${version}`), manifest: file.path };
  if (name === 'cargo.toml') return { ecosystem: 'Rust', project: safeText(capture(text, /^name\s*=\s*["']([^"']+)/m)) || 'Rust project', versions: [capture(text, /^rust-version\s*=\s*["']([^"']+)/m)].filter(Boolean).map((version) => `Rust ${version}`), manifest: file.path };
  if (name === 'pyproject.toml') return { ecosystem: 'Python', project: safeText(capture(text, /^name\s*=\s*["']([^"']+)/m)) || 'Python project', versions: [capture(text, /^requires-python\s*=\s*["']([^"']+)/m)].filter(Boolean).map((version) => `Python ${version}`), manifest: file.path };
  if (name === 'requirements.txt') return { ecosystem: 'Python', project: 'Python dependencies', versions: text.split(/\r?\n/).map((line) => line.match(/^\s*([A-Za-z0-9_.-]+)\s*(===|==|~=|>=)\s*([^;\s#]+)/)?.slice(1).join(' ')).filter(Boolean).slice(0, 5), manifest: file.path };
  if (name === 'composer.json') {
    try { const manifest = JSON.parse(text); return { ecosystem: 'PHP / Composer', project: safeText(manifest.name) || 'Composer project', versions: manifest.require?.php ? [`PHP ${manifest.require.php}`] : [], manifest: file.path }; } catch { return null; }
  }
  if (name.endsWith('.csproj')) return { ecosystem: '.NET', project: name, versions: [...text.matchAll(/<TargetFrameworks?>\s*([^<]+)\s*<\/TargetFrameworks?>/gi)].map((match) => `.NET ${match[1].trim()}`).slice(0, 4), manifest: file.path };
  if (name === 'pom.xml') return { ecosystem: 'Java / Maven', project: safeText(capture(text, /<artifactId>\s*([^<]+)\s*<\/artifactId>/i)) || 'Maven project', versions: [capture(text, /<(?:maven\.compiler\.(?:release|source)|java\.version)>\s*([^<]+)\s*</i)].filter(Boolean).map((version) => `Java ${version}`), manifest: file.path };
  if (name === 'gemfile') return { ecosystem: 'Ruby / Bundler', project: 'Ruby project', versions: [capture(text, /^\s*ruby\s+["']([^"']+)/m)].filter(Boolean).map((version) => `Ruby ${version}`), manifest: file.path };
  return null;
}

export function buildProjectPassport(files = []) {
  return files.map(projectPassportFor).filter(Boolean).slice(0, 12);
}

export function passportSummary(passport = []) {
  return passport.map(({ ecosystem, project, versions, manifest }) => `${ecosystem} ${project} ${versions.join(' ')} ${manifest}`.trim()).join('\n');
}
