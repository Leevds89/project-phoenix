export const demoScenarios = [
  { title: 'Missing Node package', ecosystem: 'JavaScript / Node.js', input: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express' imported from src/server.js" },
  { title: 'Python import missing', ecosystem: 'Python', input: "ModuleNotFoundError: No module named 'requests'" },
  { title: 'React Hook warning', ecosystem: 'React', input: 'Invalid hook call. Hooks can only be called inside the body of a function component.' },
  { title: 'Rust ownership error', ecosystem: 'Rust', input: 'error[E0382]: use of moved value: payload' },
  { title: 'SQLite database busy', ecosystem: 'SQLite', input: 'SQLITE_BUSY: database is locked while saving a record' },
  { title: 'Git push rejected', ecosystem: 'Git', input: 'Updates were rejected because the tip of your current branch is behind its remote counterpart (non-fast-forward).' },
  { title: 'Unreal Blueprint Accessed None', ecosystem: 'Unreal Engine · Blueprints', input: 'Blueprint Runtime Error: "Accessed None trying to read property TargetActor" in BP_PlayerCharacter during Play In Editor.' },
  { title: 'Unity package resolution failed', ecosystem: 'Unity', input: 'Unable to resolve packages: Package Manager could not resolve com.unity.render-pipelines.universal from the project manifest.' },
  { title: 'CRYENGINE solution generation failed', ecosystem: 'CRYENGINE', input: 'CRYENGINE Generate Solution failed: Code folder has not been specified in the project file.' },
];
