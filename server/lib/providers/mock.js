import { systemPrompt } from '../../prompts/system.js';

const fullDiagnosis = {
  needsMoreContext: false,
  summary: 'The application cannot find one of the packages it needs to start.',
  rootCause: 'A dependency may be missing, or the install step may not have completed in the project folder.',
  recoverySteps: [
    { order: 1, text: 'Check that you are in the project folder and that its package manifest lists the missing dependency. This confirms the project has the information needed to install it.', risky: false },
    { order: 2, text: 'Use your package manager to install the project dependencies, then start the application again. This restores packages recorded by the project.', risky: false },
  ],
  verificationStep: { text: 'Start the application again and confirm that the missing-package error no longer appears.' },
  suggestedChanges: [],
};
const needsContext = {
  needsMoreContext: true,
  summary: 'I need the exact error message and a little context about what you were doing when it appeared. Paste the full error and the command or action that triggered it.',
  rootCause: null,
  recoverySteps: [],
  verificationStep: null,
  suggestedChanges: [],
};

function extractInput(userMessage) {
  try {
    const parsed = JSON.parse(userMessage);
    return typeof parsed.input === 'string' ? parsed.input : '';
  } catch {
    return userMessage;
  }
}

export async function diagnose(_systemPrompt = systemPrompt, userMessage) {
  // The mock uses a tiny heuristic only to make the needs-more-context UI demonstrable.
  const input = extractInput(userMessage).trim();
  const result = input.split(/\s+/).filter(Boolean).length < 3 ? needsContext : fullDiagnosis;
  return JSON.stringify(result);
}
