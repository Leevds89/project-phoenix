import { useSession } from '../context/SessionContext.jsx';

export default function FollowUpNotice() {
  const { adapterMode, providerLabel, projectMemoryContext } = useSession();
  return <div className={`notice follow-up-notice ${adapterMode === 'mock' ? 'notice-demo' : 'notice-privacy'}`}>
    <span className="notice-icon" aria-hidden="true">{adapterMode === 'mock' ? '✳' : '⌁'}</span>
    <p>{adapterMode === 'mock'
      ? `Demo mode. This follow-up${projectMemoryContext ? ', including the selected project notes,' : ''} is processed locally and is not sent to an external service.`
      : <>This follow-up{projectMemoryContext ? ', including the selected project notes,' : ''} is sent to <strong>{providerLabel}</strong>. Remove secrets, credentials, tokens, or personal data. Project Phoenix does not control provider-side handling.</>}</p>
  </div>;
}
