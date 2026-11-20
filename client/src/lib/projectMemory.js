const STORAGE_KEY = 'phoenix.project-memory.v1';
const MAX_MEMORIES = 50;
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 5000;

export function validateProjectMemory(value) {
  return Boolean(value && typeof value === 'object'
    && Object.keys(value).sort().join(',') === 'id,notes,projectName,updatedAt'
    && typeof value.id === 'string' && value.id.length <= 80
    && typeof value.projectName === 'string' && value.projectName.trim().length > 0 && value.projectName.length <= MAX_NAME_LENGTH
    && typeof value.notes === 'string' && value.notes.length <= MAX_NOTES_LENGTH
    && typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt)));
}

export function loadProjectMemories() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(validateProjectMemory).slice(0, MAX_MEMORIES) : [];
  } catch { return []; }
}

export function saveProjectMemory(memory) {
  if (!validateProjectMemory(memory)) throw new Error('Project memory is incomplete or exceeds the supported size.');
  const existing = loadProjectMemories();
  if (!existing.some((item) => item.id === memory.id) && existing.length >= MAX_MEMORIES) throw new Error('This browser already has 50 saved project memories. Delete one before adding another.');
  const next = [memory, ...existing.filter((item) => item.id !== memory.id)].slice(0, MAX_MEMORIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteProjectMemory(id) {
  const next = loadProjectMemories().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function importProjectMemory(text) {
  const memory = JSON.parse(text);
  if (!validateProjectMemory(memory)) throw new Error('This file is not a valid Phoenix project memory.');
  return { ...memory, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
}
