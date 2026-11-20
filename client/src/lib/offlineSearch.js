import { knowledgeBase, knowledgeBaseInfo } from '../data/knowledgeBase.js';
import { getCustomGuides } from './customKnowledge.js';

const stopWords = new Set(['the', 'and', 'for', 'from', 'with', 'this', 'that', 'then', 'when', 'where', 'what', 'why', 'how', 'was', 'were', 'are', 'is', 'it', 'no', 'named', 'but', 'you', 'your', 'app', 'application', 'project', 'code', 'error', 'failed', 'failure', 'could', 'cannot', 'unable', 'please', 'help', 'issue', 'problem', 'happens', 'happened']);
const normalize = (value) => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const terms = (value) => normalize(value).split(/\s+/).filter((term) => term.length > 1 && !stopWords.has(term));

function rankGuide(query, guide) {
  const normalizedQuery = normalize(query);
  const queryTerms = terms(query);
  const patterns = guide.patterns.map(normalize).filter(Boolean);
  const keywords = guide.keywords.map(normalize);
  const titleTerms = terms(`${guide.title} ${guide.ecosystem}`);
  const contentTerms = terms(`${guide.cause} ${guide.steps.join(' ')} ${guide.verify}`);
  let score = 0;
  for (const pattern of patterns) {
    if (pattern.length > 3 && normalizedQuery.includes(pattern)) score += 12;
  }
  const matchedTerms = [];
  for (const term of new Set(queryTerms)) {
    let weight = 0;
    if (patterns.some((pattern) => pattern.split(' ').includes(term))) weight = Math.max(weight, 3.5);
    if (keywords.some((keyword) => keyword.split(' ').includes(term))) weight = Math.max(weight, 2.7);
    if (titleTerms.includes(term)) weight = Math.max(weight, 2);
    if (contentTerms.includes(term)) weight = Math.max(weight, 1);
    if (weight > 0) { score += weight; matchedTerms.push(term); }
  }
  return { score, matchedTerms };
}

export function searchOfflineKnowledge(query, context = '') {
  const customGuides = getCustomGuides();
  const allGuides = [...knowledgeBase, ...customGuides];
  const info = { ...knowledgeBaseInfo, guideCount: allGuides.length, customGuideCount: customGuides.length };
  const combinedQuery = `${query}\n${context}`.trim();
  const ranked = allGuides.map((guide) => ({ guide, ...rankGuide(combinedQuery, guide) }))
    .filter((result) => result.score >= 4 && result.matchedTerms.length > 0)
    .sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title))
    .slice(0, 3);
  if (ranked.length === 0) {
    return {
      needsMoreContext: true,
      summary: 'I could not find a close match in the offline guide library. Paste the exact error text, include the language or tool, and describe what you were doing when it appeared.',
      matches: [],
      knowledgeBase: info,
      diagnosis: { needsMoreContext: true, summary: 'I could not find a close match in the offline guide library. Paste the exact error text, include the language or tool, and describe what you were doing when it appeared.', rootCause: null, recoverySteps: [], verificationStep: null, suggestedChanges: [] },
    };
  }
  const best = ranked[0];
  const relevant = best.score >= 12 ? ranked.filter((result, index) => index === 0 || result.score >= best.score * 0.55) : ranked;
  const strength = best.score >= 12 ? 'Strong text match' : 'Related guide';
  const matches = relevant.map(({ guide, score, matchedTerms }) => ({
    id: guide.id, title: guide.title, ecosystem: guide.ecosystem, appliesTo: guide.appliesTo || null, reviewedOn: guide.reviewedOn || null, custom: guide.status === 'reviewed-local', cause: guide.cause,
    steps: guide.steps, verify: guide.verify, source: guide.source,
    matchedTerms, strength: score >= 12 ? 'Strong text match' : 'Related guide',
  }));
  const summary = `${strength}: this most closely resembles “${best.guide.title}” in Phoenix’s offline guides. Use the error text and project details to confirm it applies to your setup.`;
  return {
    needsMoreContext: false,
    matches,
    knowledgeBase: info,
    diagnosis: {
      needsMoreContext: false,
      summary,
      rootCause: best.guide.cause,
      recoverySteps: best.guide.steps.map((text, index) => ({ order: index + 1, text, risky: false })),
      verificationStep: { text: best.guide.verify },
      suggestedChanges: [],
    },
  };
}
