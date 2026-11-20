import { Router } from 'express';
import { provider } from '../lib/providers/index.js';
import { systemPrompt } from '../prompts/system.js';
import { validateDiagnosisResult } from '../lib/validateDiagnosisResult.js';

const router = Router();
router.post('/', async (req, res) => {
  const { input, verificationResult, projectFiles = [], projectMemory } = req.body ?? {};
  if (typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ error: 'Paste an error message or log before asking for a diagnosis.' });
  }
  if (input.length > 8000) {
    return res.status(400).json({ error: 'Please keep the pasted text to 8,000 characters or fewer.' });
  }
  if (verificationResult !== undefined
    && (typeof verificationResult !== 'string' || verificationResult.length > 4000)) {
    return res.status(400).json({ error: 'The verification result must be text no longer than 4,000 characters.' });
  }
  if (projectMemory !== undefined && (typeof projectMemory !== 'string' || projectMemory.length > 5000)) {
    return res.status(400).json({ error: 'Saved project notes must be text no longer than 5,000 characters.' });
  }
  if (!Array.isArray(projectFiles) || projectFiles.length > 100) return res.status(400).json({ error: 'Choose no more than 100 project files.' });
  let totalSize = 0;
  for (const file of projectFiles) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || file.path.length > 240 || file.content.length > 25000
      || file.path.startsWith('/') || file.path.includes('\\') || file.path.split('/').some((part) => !part || part === '.' || part === '..') || /^[a-z]:/i.test(file.path)) {
      return res.status(400).json({ error: 'A selected project file could not be included safely.' });
    }
    totalSize += file.content.length;
    if (totalSize > 250000) return res.status(400).json({ error: 'Selected project text exceeds the 250,000 character limit.' });
  }

  const userMessage = JSON.stringify({ input, projectFiles, ...(projectMemory ? { projectMemory } : {}), ...(verificationResult === undefined ? {} : { verificationResult }) });
  try {
    const rawResponse = await provider.diagnose(systemPrompt, userMessage);
    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return res.status(502).json({ error: 'The diagnosis service returned a response Phoenix could not use. Please try again.' });
    }
    const result = validateDiagnosisResult(parsed);
    if (!result.valid) {
      return res.status(502).json({ error: 'The diagnosis service returned a response Phoenix could not use. Please try again.' });
    }
    const suppliedFiles = new Map(projectFiles.map((file) => [file.path, file.content]));
    if (result.data.suggestedChanges.some((change) => !suppliedFiles.has(change.path) || suppliedFiles.get(change.path) !== change.originalContent)) {
      return res.status(502).json({ error: 'The diagnosis service suggested a file change that does not match the supplied project text. Please try again.' });
    }
    return res.json(result.data);
  } catch {
    return res.status(502).json({ error: 'Phoenix could not get a diagnosis right now. Check your provider settings or try again.' });
  }
});
export default router;
