import { useSession } from '../context/SessionContext.jsx';

export default function StatusBar() {
  const { status, errorMessage } = useSession();
  if (status === 'loading' || status === 'follow-up-loading') return <div className="progress-line" role="status"><span className="button-spinner" />{status === 'loading' ? 'Reading the clues…' : 'Taking another look…'}</div>;
  if (status === 'error') return <div className="error-banner" role="alert"><span aria-hidden="true">!</span><p>{errorMessage || 'Something went wrong. Please try again.'}</p></div>;
  return null;
}
