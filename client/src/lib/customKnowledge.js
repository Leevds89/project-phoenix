const storageKey = 'phoenix-custom-guides';
export const GUIDE_PACK_FORMAT = 'phoenix-guide-pack';
const isNonEmpty = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function validateCustomGuide(guide) {
  if (!guide || typeof guide !== 'object' || Array.isArray(guide)) return 'Guide data is invalid.';
  if (!isNonEmpty(guide.id, 100) || !isNonEmpty(guide.ecosystem, 80) || !isNonEmpty(guide.title, 120)) return 'Add an ecosystem and a short guide title.';
  if (!isNonEmpty(guide.appliesTo, 120)) return 'Add the language, framework, or tool versions this guide applies to.';
  if (!Array.isArray(guide.patterns) || guide.patterns.length < 1 || guide.patterns.length > 12 || guide.patterns.some((item) => !isNonEmpty(item, 180))) return 'Add 1 to 12 recognizable error phrases or codes.';
  if (!Array.isArray(guide.keywords) || guide.keywords.length > 30 || guide.keywords.some((item) => !isNonEmpty(item, 60))) return 'Keywords must contain at most 30 short terms.';
  if (!isNonEmpty(guide.cause, 1000)) return 'Describe the likely cause.';
  if (!Array.isArray(guide.steps) || guide.steps.length < 1 || guide.steps.length > 8 || guide.steps.some((item) => !isNonEmpty(item, 500))) return 'Add 1 to 8 safe recovery steps.';
  if (!isNonEmpty(guide.verify, 500)) return 'Add a concrete way to verify the recovery.';
  try { const source = new URL(guide.source); if (source.protocol !== 'https:' || source.username || source.password) return 'The reference must be an HTTPS link without embedded credentials.'; }
  catch { return 'Add a valid HTTPS reference link.'; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(guide.reviewedOn || '')) return 'Add the date the source was checked.';
  if (guide.status !== 'reviewed-local') return 'Confirm that you checked this guidance against its reference.';
  return '';
}

export function getCustomGuides() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved.filter((guide) => validateCustomGuide(guide) === '').slice(0, 200) : [];
  } catch { return []; }
}

export function saveCustomGuide(guide) {
  const error = validateCustomGuide(guide);
  if (error) throw new Error(error);
  const guides = getCustomGuides();
  const next = [...guides.filter((item) => item.id !== guide.id), guide];
  if (next.length > 200) throw new Error('The local guide limit is 200. Remove a guide before adding another.');
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}

export function buildCustomGuidePack(guides) {
  return { format: GUIDE_PACK_FORMAT, version: 1, exportedAt: new Date().toISOString(), guides };
}

export function validateCustomGuidePack(pack) {
  if (!pack || pack.format !== GUIDE_PACK_FORMAT || pack.version !== 1 || !Array.isArray(pack.guides)) return 'This is not a supported Phoenix guide pack.';
  if (pack.guides.length === 0 || pack.guides.length > 200) return 'A guide pack must contain between 1 and 200 guides.';
  const ids = new Set();
  for (const guide of pack.guides) {
    const error = validateCustomGuide(guide);
    if (error) return `A guide in this pack is invalid: ${error}`;
    if (ids.has(guide.id)) return 'This pack contains duplicate guide IDs.';
    ids.add(guide.id);
  }
  return '';
}

export function saveCustomGuides(guides) {
  if (!Array.isArray(guides) || guides.some((guide) => validateCustomGuide(guide))) throw new Error('Phoenix could not save the guide pack because one or more entries failed validation.');
  const existing = getCustomGuides();
  const ids = new Set(existing.map((guide) => guide.id));
  const additions = guides.filter((guide) => !ids.has(guide.id));
  if (existing.length + additions.length > 200) throw new Error('This pack would exceed the 200-guide local limit. Remove local guides first.');
  const next = [...existing, ...additions];
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  return { guides: next, added: additions.length, skipped: guides.length - additions.length };
}

export function removeCustomGuide(id) {
  const next = getCustomGuides().filter((guide) => guide.id !== id);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}
