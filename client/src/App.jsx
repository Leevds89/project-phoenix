import { useState } from 'react';
import { useSession } from './context/SessionContext.jsx';
import Header from './components/Header.jsx';
import PrivacyNotice from './components/PrivacyNotice.jsx';
import InputPanel from './components/InputPanel.jsx';
import StatusBar from './components/StatusBar.jsx';
import DiagnosisPanel from './components/DiagnosisPanel.jsx';
import NeedsMoreContextPanel from './components/NeedsMoreContextPanel.jsx';
import VerificationPanel from './components/VerificationPanel.jsx';
import FollowUpPanel from './components/FollowUpPanel.jsx';
import ProjectFolderPanel from './components/ProjectFolderPanel.jsx';
import SettingsDialog from './components/SettingsDialog.jsx';
import SuggestedChanges from './components/SuggestedChanges.jsx';
import OfflineMatchesPanel from './components/OfflineMatchesPanel.jsx';
import DemoScenariosPanel from './components/DemoScenariosPanel.jsx';
import GuideContributionPanel from './components/GuideContributionPanel.jsx';
import RecoveryCard from './components/RecoveryCard.jsx';
import EvidencePanel from './components/EvidencePanel.jsx';
import RecoveryRunway from './components/RecoveryRunway.jsx';
import ProjectCheckPlan from './components/ProjectCheckPlan.jsx';
import ProjectMemoryPanel from './components/ProjectMemoryPanel.jsx';
import { GameConnectorsPanel, GameRecoveryTracker, GameRescuePanel } from './components/GameProjectTools.jsx';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { status, diagnosis, followUp, diagnosisMode, matches, followUpMatches, knowledgeBase, verificationStatus, verificationPaste, verifiedAt, fileChanges, demoTitle, input, projectFiles, projectPassport, completedRecoverySteps } = useSession();
  return (
    <main id="top" className="page-shell">
      <Header onSettings={() => setSettingsOpen(true)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-mark" aria-hidden="true"><span>✳</span></div>
        <p className="eyebrow">A little clarity for the hard parts</p>
        <h1 id="page-title">Let’s figure out<br /><span>what went wrong.</span></h1>
        <p className="hero-copy">Bring the error that stopped you. Phoenix will help you understand it and choose a careful next step.</p>
      </section>
      <div className="workspace">
        <PrivacyNotice />
        {status === 'idle' && <DemoScenariosPanel />}
        <ProjectFolderPanel />
        <GameConnectorsPanel />
        <GameRescuePanel />
        <ProjectMemoryPanel />
        <InputPanel />
        {diagnosisMode === 'offline' && <GuideContributionPanel />}
        <StatusBar />
        {status === 'result' && diagnosis && <>
          <RecoveryRunway diagnosis={diagnosis} completedSteps={completedRecoverySteps} verificationStatus={verificationStatus} />
          <EvidencePanel input={input} projectPassport={projectPassport} projectFiles={projectFiles} diagnosisMode={diagnosisMode} />
          <DiagnosisPanel diagnosis={diagnosis} />
          <SuggestedChanges changes={diagnosis.suggestedChanges} />
          {diagnosisMode === 'offline' && <OfflineMatchesPanel matches={matches} knowledgeBase={knowledgeBase} />}
          <ProjectCheckPlan projectPassport={projectPassport} />
          <VerificationPanel />
          <GameRecoveryTracker />
          <RecoveryCard diagnosis={diagnosis} diagnosisMode={diagnosisMode} matches={matches} projectPassport={projectPassport} verificationStatus={verificationStatus} verifiedAt={verifiedAt} fileChanges={fileChanges} demoTitle={demoTitle} />
        </>}
        {status === 'needs-more-context' && diagnosis && <><NeedsMoreContextPanel diagnosis={diagnosis} />{diagnosisMode === 'offline' && <OfflineMatchesPanel matches={matches} knowledgeBase={knowledgeBase} />}</>}
        {status === 'follow-up' && followUp && <><RecoveryRunway diagnosis={followUp} completedSteps={completedRecoverySteps} verificationStatus={verificationStatus} /><EvidencePanel input={`${input}\n${verificationPaste}`} projectPassport={projectPassport} projectFiles={projectFiles} diagnosisMode={diagnosisMode} /><FollowUpPanel diagnosis={followUp} />{diagnosisMode === 'offline' && <OfflineMatchesPanel matches={followUpMatches} knowledgeBase={knowledgeBase} />}<GameRecoveryTracker /><ProjectCheckPlan projectPassport={projectPassport} /><RecoveryCard diagnosis={followUp} diagnosisMode={diagnosisMode} matches={followUpMatches} projectPassport={projectPassport} verificationStatus={verificationStatus} verifiedAt={verifiedAt} fileChanges={fileChanges} demoTitle={demoTitle} /></>}
      </div>
      <footer className="page-footer"><span className="footer-spark" aria-hidden="true">✳</span> Diagnostics clear when you leave. Only checkpoints you explicitly save remain in this browser.</footer>
    </main>
  );
}
