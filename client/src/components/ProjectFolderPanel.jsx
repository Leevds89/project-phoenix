import { useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';

export default function ProjectFolderPanel() {
  const { projectFiles, projectPassport, selectFolder } = useSession();
  const [error, setError] = useState('');
  async function choose() { setError(''); try { await selectFolder(); } catch (e) { if (e.name !== 'AbortError') setError(e.message); } }
  return <section className="panel folder-panel" aria-labelledby="folder-title">
    <div className="panel-heading"><div><p className="step-label">OPTIONAL · LOCAL PROJECT</p><h2 id="folder-title">Add project context</h2></div><span className="text-badge">Up to 100 files</span></div>
    <p className="folder-description">Choose one folder to include up to 100 small text files in your diagnosis. Phoenix recognizes Unreal, Unity, and CRYENGINE project descriptors, and can read supported source, configuration, shader text, and logs. Binary game assets are not read. Phoenix skips engine caches, dependency/build folders, and common secret files. Nothing is sent until you submit a diagnosis.</p>
    <button className="secondary-button" onClick={choose}>Choose a project folder</button>
    {projectFiles.length > 0 && <div className="file-selection"><strong>{projectFiles.length} text files ready</strong><ul>{projectFiles.map((file) => <li key={file.path}>{file.path}</li>)}</ul></div>}
    {projectPassport.length > 0 && <section className="project-passport" aria-label="Detected project passport"><div><span className="step-label">PROJECT PASSPORT · READ-ONLY</span><strong>What Phoenix detected</strong></div>{projectPassport.map((project) => <article key={`${project.manifest}:${project.ecosystem}`}><strong>{project.project}</strong><span>{project.ecosystem}{project.versions.length ? ` · ${project.versions.join(' · ')}` : ''}</span><small>Evidence: {project.manifest}</small></article>)}<p>Detected from the files listed above. These are declared project details, not a claim about what is installed or running.</p></section>}
    {error && <p className="folder-error" role="alert">{error}</p>}
  </section>;
}
