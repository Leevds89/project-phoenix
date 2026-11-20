import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { searchOfflineKnowledge } from '../lib/offlineSearch.js';
import { buildProjectPassport, passportSummary } from '../lib/projectPassport.js';

const SessionContext = createContext(null);
const emptySession = {
  configStatus: 'loading',
  adapterMode: null,
  providerLabel: null,
  providerName: null,
  modelName: null,
  input: '',
  status: 'idle',
  diagnosis: null,
  followUp: null,
  verificationStatus: null,
  verificationPaste: '',
  errorMessage: null,
  projectFiles: [],
  projectPassport: [],
  projectMemoryContext: '',
  completedRecoverySteps: [],
  recoveryAttempts: [],
  folderHandle: null,
  diagnosisMode: 'provider',
  matches: [],
  followUpMatches: [],
  knowledgeBase: null,
  undoSnapshots: [],
  fileChanges: [],
  demoTitle: null,
};

async function postDiagnosis(payload) {
  const response = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Phoenix could not complete the request. Please try again.');
  return result;
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(emptySession);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/config', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Configuration could not be loaded.');
        return response.json();
      })
      .then((config) => {
        if (!['mock', 'real'].includes(config.adapterMode)
          || (config.adapterMode === 'real' && typeof config.providerLabel !== 'string')) {
          throw new Error('Configuration response was incomplete.');
        }
        setSession((current) => ({ ...current, configStatus: 'ready', adapterMode: config.adapterMode, providerLabel: config.providerLabel, providerName: config.providerName, modelName: config.modelName }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession((current) => ({ ...current, configStatus: 'error' }));
      });
    return () => controller.abort();
  }, []);

  const updateInput = useCallback((input) => setSession((current) => ({ ...current, input })), []);
  const setProjectMemoryContext = useCallback((projectMemoryContext) => setSession((current) => ({ ...current, projectMemoryContext: String(projectMemoryContext || '').slice(0, 5000) })), []);
  const updateVerificationPaste = useCallback((verificationPaste) => setSession((current) => ({ ...current, verificationPaste })), []);
  const setDiagnosisMode = useCallback((diagnosisMode) => setSession((current) => ({
    ...current, diagnosisMode, status: 'idle', diagnosis: null, followUp: null, verificationStatus: null, verificationPaste: '',
    matches: [], followUpMatches: [], knowledgeBase: null, errorMessage: null, demoTitle: null, completedRecoverySteps: [], recoveryAttempts: [],
  })), []);
  const selectFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) throw new Error('Folder access is not available in this browser. Try a Chromium browser on localhost.');
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    const excluded = /(^|\/)(\.git|\.vs|node_modules|dist|build|coverage|\.next|\.venv|vendor|library|temp|obj|binaries|deriveddatacache|intermediate|saved\/(?:autosaves|backup|crashes|collections|cooked|stagedbuilds))(\/|$)/i;
    const secret = /(^|\/)(\.env[^/]*|\.npmrc|\.pypirc|credentials?[^/]*|secrets?[^/]*|.*(?:token|private.?key|\.pem|\.p12|\.pfx)$|id_rsa|id_ed25519)(\/|$)/i;
    const secretContent = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:api[_-]?key|secret|password|token)\s*["']?\s*[:=]\s*["']?[^"'\s]{8,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._~+/=-]{20,}/i;
    const allowed = /\.(txt|md|json|ya?ml|toml|mod|ini|cfg|conf|log|csv|uproject|uplugin|cryproject|asmdef|asmref|csproj|shader|compute|cginc|hlsl|glsl|js|jsx|ts|tsx|py|go|rs|java|kt|cs|fs|php|rb|swift|c|h|cpp|hpp|css|html|sql|sh|ps1|xml)$/i;
    const files = [];
    let totalCharacters = 0;
    async function walk(directory, prefix = '') {
      for await (const [name, entry] of directory.entries()) {
        const relative = prefix ? `${prefix}/${name}` : name;
        if (excluded.test(relative) || secret.test(relative)) continue;
        if (entry.kind === 'directory') { if (files.length < 100) await walk(entry, relative); continue; }
        if (files.length >= 100 || !allowed.test(name)) continue;
        const file = await entry.getFile();
        if (file.size > 25000 || totalCharacters + file.size > 250000) continue;
        const content = await file.text();
        if (content.includes('\0') || secretContent.test(content)) continue;
        files.push({ path: relative, content, handle: entry });
        totalCharacters += content.length;
      }
    }
    await walk(handle);
    setSession((current) => ({ ...current, folderHandle: handle, projectFiles: files, projectPassport: buildProjectPassport(files) }));
  }, []);
  const applyChanges = useCallback(async (changes) => {
    const root = session.folderHandle;
    if (!root) throw new Error('Choose a folder with write access first.');
    const permission = await root.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') throw new Error('Folder write access was not granted.');
    if (new Set(changes.map((change) => change.path)).size !== changes.length) throw new Error('The same file appeared more than once in this edit. Review the suggestion again.');
    const snapshots = [];
    for (const change of changes) {
      let directory = root;
      const parts = change.path.split('/');
      if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Stopped: ${change.path} is not a safe project path.`);
      for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
      const fileHandle = await directory.getFileHandle(parts.at(-1));
      const current = await (await fileHandle.getFile()).text();
      if (current !== change.originalContent) throw new Error(`Stopped: ${change.path} changed since Phoenix scanned it. No files were written.`);
      snapshots.push({ path: change.path, before: current, after: change.proposedContent });
    }
    const written = [];
    try {
      for (const snapshot of snapshots) {
        let directory = root;
        const parts = snapshot.path.split('/');
        for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
        const fileHandle = await directory.getFileHandle(parts.at(-1));
        const writable = await fileHandle.createWritable();
        await writable.write(snapshot.after);
        await writable.close();
        written.push(snapshot.path);
      }
    } catch (error) {
      const rollbackFailures = [];
      for (const snapshot of snapshots.filter((item) => written.includes(item.path)).reverse()) {
        try {
          let directory = root;
          const parts = snapshot.path.split('/');
          for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
          const handle = await directory.getFileHandle(parts.at(-1));
          if (await (await handle.getFile()).text() !== snapshot.after) { rollbackFailures.push(snapshot.path); continue; }
          const writable = await handle.createWritable();
          await writable.write(snapshot.before);
          await writable.close();
        } catch { rollbackFailures.push(snapshot.path); }
      }
      const detail = rollbackFailures.length ? ` Rollback needs attention for: ${rollbackFailures.join(', ')}.` : ' Earlier writes were restored.';
      throw new Error(`Phoenix could not finish applying the edits.${detail}`);
    }
    setSession((current) => ({ ...current, undoSnapshots: snapshots, fileChanges: [{ paths: snapshots.map((item) => item.path), status: 'applied' }] }));
    return written;
  }, [session.folderHandle]);
  const undoChanges = useCallback(async () => {
    const root = session.folderHandle;
    const snapshots = session.undoSnapshots;
    if (!root || snapshots.length === 0) throw new Error('There are no Phoenix edits ready to undo in this session.');
    const permission = await root.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') throw new Error('Folder write access was not granted.');
    for (const snapshot of snapshots) {
      let directory = root;
      const parts = snapshot.path.split('/');
      for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
      const handle = await directory.getFileHandle(parts.at(-1));
      if (await (await handle.getFile()).text() !== snapshot.after) throw new Error(`Undo stopped: ${snapshot.path} changed after Phoenix edited it. No files were reverted.`);
    }
    const reverted = [];
    try {
      for (const snapshot of [...snapshots].reverse()) {
        let directory = root;
        const parts = snapshot.path.split('/');
        for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
        const handle = await directory.getFileHandle(parts.at(-1));
        const writable = await handle.createWritable();
        await writable.write(snapshot.before);
        await writable.close();
        reverted.push(snapshot);
      }
    } catch {
      const restoreFailures = [];
      for (const snapshot of reverted.reverse()) {
        try {
          let directory = root;
          const parts = snapshot.path.split('/');
          for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
          const handle = await directory.getFileHandle(parts.at(-1));
          const writable = await handle.createWritable();
          await writable.write(snapshot.after);
          await writable.close();
        } catch { restoreFailures.push(snapshot.path); }
      }
      throw new Error(restoreFailures.length ? `Undo could not complete; check these files: ${restoreFailures.join(', ')}.` : 'Undo could not complete. Phoenix restored the approved edits.');
    }
    setSession((current) => ({ ...current, undoSnapshots: [], fileChanges: current.fileChanges.map((change, index) => index === current.fileChanges.length - 1 ? { ...change, status: 'undone' } : change) }));
    return snapshots.map((item) => item.path);
  }, [session.folderHandle, session.undoSnapshots]);
  const diagnose = useCallback(async () => {
    if ((session.diagnosisMode !== 'offline' && session.configStatus !== 'ready') || !session.input.trim() || session.status === 'loading') return;
    setSession((current) => ({ ...current, status: 'loading', diagnosis: null, followUp: null, matches: [], followUpMatches: [], knowledgeBase: null, verificationStatus: null, verificationPaste: '', completedRecoverySteps: [], recoveryAttempts: [], errorMessage: null }));
    try {
      if (session.diagnosisMode === 'offline') {
        const context = `${session.projectFiles.map(({ path }) => path).join(' ')}\n${passportSummary(session.projectPassport)}\n${session.projectMemoryContext}`;
        const result = searchOfflineKnowledge(session.input, context);
        setSession((current) => ({ ...current, status: result.needsMoreContext ? 'needs-more-context' : 'result', diagnosis: result.diagnosis, matches: result.matches, knowledgeBase: result.knowledgeBase }));
        return;
      }
      const projectFiles = session.projectFiles.map(({ path, content }) => ({ path, content }));
      const diagnosis = await postDiagnosis({ input: session.input, projectFiles, ...(session.projectMemoryContext ? { projectMemory: session.projectMemoryContext } : {}) });
      setSession((current) => ({ ...current, status: diagnosis.needsMoreContext ? 'needs-more-context' : 'result', diagnosis }));
    } catch (error) {
      setSession((current) => ({ ...current, status: 'error', errorMessage: error.message }));
    }
  }, [session.configStatus, session.input, session.status, session.projectFiles, session.projectPassport, session.projectMemoryContext, session.diagnosisMode]);
  const toggleRecoveryStep = useCallback((order, checked) => setSession((current) => ({
    ...current, completedRecoverySteps: checked
      ? [...new Set([...current.completedRecoverySteps, order])]
      : current.completedRecoverySteps.filter((step) => step !== order),
  })), []);
  const addRecoveryAttempt = useCallback((attempt) => setSession((current) => ({
    ...current,
    recoveryAttempts: [...current.recoveryAttempts, { action: String(attempt.action || '').slice(0, 1000), result: String(attempt.result || '').slice(0, 1000), at: attempt.at }].slice(-20),
  })), []);
  const markVerificationPassed = useCallback(() => setSession((current) => ({ ...current, verificationStatus: 'passed', verifiedAt: new Date().toISOString() })), []);
  const markVerificationFailed = useCallback(() => setSession((current) => ({ ...current, verificationStatus: 'failed' })), []);
  const rediagnose = useCallback(async () => {
    if (session.status !== 'result' || session.verificationStatus !== 'failed' || !session.verificationPaste.trim()) return;
    setSession((current) => ({ ...current, status: 'follow-up-loading', completedRecoverySteps: [], errorMessage: null }));
    try {
      if (session.diagnosisMode === 'offline') {
        const attemptNotes = session.recoveryAttempts.map((attempt, index) => `Attempt ${index + 1}: ${attempt.action} Result: ${attempt.result}`).join('\n');
        const context = `${session.verificationPaste} ${attemptNotes} ${session.projectFiles.map(({ path }) => path).join(' ')}\n${passportSummary(session.projectPassport)}\n${session.projectMemoryContext}`;
        const result = searchOfflineKnowledge(session.input, context);
        setSession((current) => ({ ...current, status: 'follow-up', followUp: result.diagnosis, followUpMatches: result.matches, knowledgeBase: result.knowledgeBase }));
        return;
      }
      const attemptNotes = session.recoveryAttempts.map((attempt, index) => `Attempt ${index + 1}: ${attempt.action}\nObserved: ${attempt.result}`).join('\n\n');
      const verificationResult = [session.verificationPaste, attemptNotes].filter(Boolean).join('\n\nRecovery attempts from this session:\n');
      const followUp = await postDiagnosis({ input: session.input, projectFiles: session.projectFiles.map(({ path, content }) => ({ path, content })), verificationResult, ...(session.projectMemoryContext ? { projectMemory: session.projectMemoryContext } : {}) });
      setSession((current) => ({ ...current, status: 'follow-up', followUp }));
    } catch (error) {
      setSession((current) => ({ ...current, status: 'error', errorMessage: error.message }));
    }
  }, [session.status, session.verificationStatus, session.verificationPaste, session.input, session.projectFiles, session.projectPassport, session.projectMemoryContext, session.recoveryAttempts, session.diagnosisMode]);
  const clearSession = useCallback(() => setSession((current) => ({
    ...emptySession,
    configStatus: current.configStatus,
    adapterMode: current.adapterMode,
    providerLabel: current.providerLabel,
    providerName: current.providerName,
    modelName: current.modelName,
    diagnosisMode: current.diagnosisMode,
  })), []);
  const tryDemoScenario = useCallback((scenario) => {
    const result = searchOfflineKnowledge(scenario.input);
    setSession((current) => ({
      ...current, diagnosisMode: 'offline', input: scenario.input, status: result.needsMoreContext ? 'needs-more-context' : 'result',
      diagnosis: result.diagnosis, matches: result.matches, knowledgeBase: result.knowledgeBase, demoTitle: scenario.title,
      projectFiles: [], projectPassport: [], completedRecoverySteps: [], recoveryAttempts: [], folderHandle: null, followUp: null, followUpMatches: [], verificationStatus: null, verificationPaste: '',
      verifiedAt: null, undoSnapshots: [], fileChanges: [], errorMessage: null,
    }));
  }, []);

  const value = useMemo(() => ({
    ...session, updateInput, updateVerificationPaste, setProjectMemoryContext, setDiagnosisMode, diagnose, markVerificationPassed,
    markVerificationFailed, rediagnose, clearSession, selectFolder, applyChanges, undoChanges, tryDemoScenario, toggleRecoveryStep, addRecoveryAttempt,
  }), [session, updateInput, updateVerificationPaste, setProjectMemoryContext, setDiagnosisMode, diagnose, markVerificationPassed, markVerificationFailed, rediagnose, clearSession, undoChanges, tryDemoScenario, toggleRecoveryStep, addRecoveryAttempt]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider.');
  return value;
}
