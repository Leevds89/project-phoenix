const rootFields = ['needsMoreContext', 'summary', 'rootCause', 'recoverySteps', 'verificationStep', 'suggestedChanges'];
const recoveryFields = ['order', 'text', 'risky'];
const verificationFields = ['text'];

function hasExactFields(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === expected.length
    && expected.every((field) => Object.hasOwn(value, field));
}
function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateDiagnosisResult(value) {
  if (!hasExactFields(value, rootFields)) return { valid: false, error: 'Diagnosis has an unexpected or missing field.' };
  if (typeof value.needsMoreContext !== 'boolean' || !nonEmptyString(value.summary) || !Array.isArray(value.recoverySteps)) {
    return { valid: false, error: 'Diagnosis does not match the required shape.' };
  }
  if (!Array.isArray(value.suggestedChanges) || value.suggestedChanges.length > 20) return { valid: false, error: 'Suggested changes are invalid.' };
  const safePath = (path) => typeof path === 'string' && path.length <= 240 && !/[\u0000-\u001f]/.test(path) && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some((part) => !part || part === '.' || part === '..') && !/^[a-z]:/i.test(path);
  let suggestedTextSize = 0;
  for (const change of value.suggestedChanges) {
    if (!hasExactFields(change, ['path', 'summary', 'originalContent', 'proposedContent', 'risky']) || !safePath(change.path)
      || !nonEmptyString(change.summary) || typeof change.originalContent !== 'string' || typeof change.proposedContent !== 'string'
      || change.originalContent.length > 25000 || change.proposedContent.length > 25000 || typeof change.risky !== 'boolean') return { valid: false, error: 'Suggested change is invalid.' };
    suggestedTextSize += change.path.length + change.summary.length + change.originalContent.length + change.proposedContent.length;
    if (suggestedTextSize > 250000) return { valid: false, error: 'Suggested changes exceed the response size limit.' };
  }
  if (value.needsMoreContext) {
    if (value.rootCause !== null || value.recoverySteps.length !== 0 || value.verificationStep !== null || value.suggestedChanges.length !== 0) {
      return { valid: false, error: 'Needs-more-context diagnosis contains unsupported fields.' };
    }
    return { valid: true, data: value };
  }
  if (!nonEmptyString(value.rootCause) || !hasExactFields(value.verificationStep, verificationFields)
    || !nonEmptyString(value.verificationStep.text) || value.recoverySteps.length === 0) {
    return { valid: false, error: 'Diagnosis is missing required details.' };
  }
  for (const [index, step] of value.recoverySteps.entries()) {
    if (!hasExactFields(step, recoveryFields)) {
      return { valid: false, error: Object.hasOwn(step ?? {}, 'command')
        ? "Unexpected 'command' field in step"
        : 'Recovery step has an unexpected or missing field.' };
    }
    if (step.order !== index + 1 || !nonEmptyString(step.text) || typeof step.risky !== 'boolean') {
      return { valid: false, error: 'Recovery step does not match the required shape.' };
    }
  }
  return { valid: true, data: value };
}
