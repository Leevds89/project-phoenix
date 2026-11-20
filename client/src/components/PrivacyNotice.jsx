import { useSession } from '../context/SessionContext.jsx';

export default function PrivacyNotice() {
  const { configStatus, adapterMode, providerLabel, diagnosisMode, demoTitle, projectMemoryContext } = useSession();
  if (diagnosisMode === 'offline') return <div className="notice notice-demo"><span className="notice-icon" aria-hidden="true">⌕</span><p><strong>{demoTitle ? `Judge demo · ${demoTitle}.` : 'Offline guide mode.'}</strong> Searches Phoenix guides entirely on this device. No AI model is used, and no text, selected project files, or selected memory notes are sent anywhere. {projectMemoryContext && 'Selected notes are included in the local search.'}</p></div>;
  if (configStatus === 'loading') return <div className="notice notice-loading" role="status"><span className="mini-spinner" />Loading privacy disclosure…</div>;
  if (configStatus === 'error') return <div className="notice notice-error" role="alert">Could not load configuration. Diagnosis is unavailable.</div>;
  if (adapterMode === 'mock') return <div className="notice notice-demo"><span className="notice-icon" aria-hidden="true">✳</span><p><strong>Demo mode.</strong> Submitted text, selected project excerpts{projectMemoryContext ? ', and selected checkpoint notes' : ''} are processed by a local mock adapter and are not sent to any external service.</p></div>;
  return <div className="notice notice-privacy"><span className="notice-icon" aria-hidden="true">⌁</span><p>Pasted text and any selected project files{projectMemoryContext ? ', plus the project notes you selected for this session,' : ''} are sent to <strong>{providerLabel}</strong> when you submit. Remove secrets, credentials, tokens, and personal data first. Project Phoenix does not control provider-side retention.</p></div>;
}
