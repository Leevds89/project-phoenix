export default function OfflineMatchesPanel({ matches = [], knowledgeBase }) {
  if (!matches.length) return <section className="panel offline-no-match"><p className="step-label">LOCAL SEARCH · NO CLOSE MATCH</p><h2>Try a little more context</h2><p>The offline library did not find a strong match. Include the exact error line, language or tool version, and what action triggered it. No model or network was used.</p><p className="knowledge-meta">{knowledgeBase?.guideCount} guides · library reviewed {knowledgeBase?.reviewedOn}</p></section>;
  return <section className="panel offline-matches" aria-labelledby="offline-matches-title">
    <div className="panel-heading"><div><p className="step-label">OFFLINE SEARCH · {knowledgeBase?.guideCount} GUIDES</p><h2 id="offline-matches-title">Why these guides matched</h2></div><span className="text-badge">No model used</span></div>
    <p className="knowledge-meta">Library {knowledgeBase?.version} · reviewed {knowledgeBase?.reviewedOn}{knowledgeBase?.customGuideCount ? ` · ${knowledgeBase.customGuideCount} local guide(s) added on this device` : ''}. This is a text match from bundled or locally saved documentation, not a live AI diagnosis.</p>
    <div className="offline-match-list">{matches.map((match) => <article className="offline-match" key={match.id}>
      <div className="match-title"><div><span className="match-ecosystem">{match.ecosystem}</span><h3>{match.title}</h3></div><span className="text-badge">{match.strength}</span></div>
      {(match.appliesTo || match.custom) && <p className="guide-scope">{match.custom ? 'Your local guide' : 'Phoenix guide'}{match.appliesTo ? ` · Applies to ${match.appliesTo}` : ''}</p>}
      {match.reviewedOn && <p className="guide-scope">Source checked {match.reviewedOn}</p>}
      <p>{match.cause}</p>
      <p className="matched-terms">Matched text: {match.matchedTerms.join(', ')}</p>
      <a href={match.source} target="_blank" rel="noreferrer">Official reference ↗</a>
    </article>)}</div>
  </section>;
}
