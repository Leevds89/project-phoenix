# Project Phoenix

A local-first software diagnostics demo for Kiroween 2026. Paste an error, log, stack trace, or short code excerpt to get a plain-language explanation, careful recovery guidance, and a way to check whether the fix worked.

## Run the demo

Prerequisite: Node.js 20.19 or newer in the 20.x line, or 22.12 or newer.

1. Install dependencies with `npm install`.
2. Start both local services with `npm run dev` from the project root.
3. Open `http://localhost:5173` in your browser.

Mock mode is the default and requires no API key. It demonstrates the interface and interaction flow with fixed local responses; it does not perform real AI diagnosis. A very short input returns the demo “needs more context” state.

## Connect a model

Phoenix uses server-side connectors. Copy `.env.example` to a root `.env` file, choose a connector, set its model ID and any required credentials, then restart `npm run dev`. Keep `.env` private: API keys stay on the server and are never returned to the browser.

| `AI_PROVIDER` | Endpoint and credential setup |
|---|---|
| `openai` | Uses OpenAI's API by default. Set `AI_API_KEY` and `AI_MODEL`. |
| `anthropic` | Uses the Anthropic Messages API by default. Set `AI_API_KEY` and `AI_MODEL`. |
| `gemini` | Uses Google's Gemini `generateContent` API by default. Set `AI_API_KEY` and `AI_MODEL`. |
| `ollama` | Uses the local Ollama API at `http://127.0.0.1:11434` by default. Set the installed model ID in `AI_MODEL`; no API key is needed. |
| `openai-compatible` | Connects to any provider that implements the OpenAI chat-completions format. Set `AI_API_URL` and `AI_MODEL`; remote providers also require `AI_API_KEY`. Local servers may omit the key. |

OpenAI-compatible endpoints include many hosted gateways and local servers such as LM Studio and vLLM. Providers with a different API format need a dedicated connector; Phoenix currently includes native OpenAI, Anthropic, Gemini, and Ollama connectors. This is broad compatibility, not a guarantee that every service or model can be connected without provider-specific setup.

For remote providers, `AI_API_URL` must use HTTPS. Plain HTTP is allowed only for `localhost` or `127.0.0.1`. Ollama is restricted to loopback in this version. Do not put credentials in the URL.

When a real connector is active, pasted input and any failed-verification result are sent to that provider. Remove secrets, credentials, tokens, and personal data before submitting. Phoenix does not control provider-side retention. The `.env` file persists on your computer until you delete it; it is excluded from Git.

## Appearance and provider settings

Use **Settings** to choose Ember, Ocean, Violet, Forest, or one of Phoenix’s themed palettes: Phoenix Rising, Ashfall, and First Light. Pick dark/light appearance and comfortable/compact spacing too. Phoenix’s success state has a brief rise animation and respects reduced-motion preferences.

The settings dialog shows the active model connection. Change provider, endpoint, model, or credentials in the root `.env` file and restart the app. Phoenix currently includes OpenAI, OpenAI-compatible services, Anthropic, Gemini, and local Ollama connectors. Provider API keys stay on the server and are never sent to the browser.

## Offline guide search

Choose **Settings → Offline guide search** to search Phoenix’s bundled knowledge base without calling an AI model or sending text or selected files anywhere. It ranks matching guides by error phrases and keywords, then shows why each matched, cautious recovery steps, a verification idea, and an official reference. This is retrieval and template-based guidance, not generated reasoning; it will ask for more context when it has no close match.

The home screen includes a **Rescue walkthrough** with six general software cases and an Unreal Blueprint runtime case. Each case runs against the same offline search, requires no API key, and makes no model request. In offline mode, **Contribute a reviewed guide** lets you preview, save, remove, export, and import JSON guide packs. Imported and locally saved guides stay separate from the shipped knowledge base; Phoenix validates their structure and HTTPS links but cannot independently verify their claims.

The initial library contains more than 50 curated guides for JavaScript/Node.js, npm, Vite, React, TypeScript, Python/pip, Java, Maven, Gradle, .NET/NuGet, Go, Rust/Cargo, PHP/Composer, Ruby/Bundler, C/C++/CMake, Git, SQLite, PostgreSQL, Unreal Engine, Unity, CRYENGINE, and common local development errors. The official references used for this initial library were checked on 2026-11-20. It does not update itself while offline; refresh the library as official documentation changes. The Phoenix app itself can run offline after its dependencies are installed locally.

The offline library includes first-pass game-engine guidance for Unreal packaging/cooking, C++ module builds, editor/GPU crashes, and Blueprint runtime errors; Unity package resolution, script assembly compilation, and shader errors; and CRYENGINE project loading, solution generation, crash logs, and packaging behavior. These are searchable reference matches, not full editor inspection. When a folder is selected, Phoenix recognizes Unreal `.uproject`/`.uplugin`, Unity `ProjectVersion.txt` and package manifests, and CRYENGINE `.cryproject` descriptors. It can read supported source, configuration, shader text, and logs within existing limits; binary game assets and generated engine caches are not read.

## Project memory

Use **Project memory** to save a named checkpoint with notes about a project's goals, decisions, current state, and next steps. Phoenix saves only when you choose **Save memory** or **Update memory**. You can select, edit, delete, export, or import checkpoints. Add a diagnosis to the notes only when you choose the editable add action. Checkpoints are stored in this browser profile's local storage; Phoenix does not upload or sync them and does not encrypt them. Browser data clearing can remove them, so export a backup if needed. Do not store secrets. A separate unchecked-by-default option controls whether the visible notes are included with diagnoses in the current session; in real-provider mode the privacy notice identifies that before submission.

## Project folder review

Choose **Add project context** to select one local folder. Phoenix reads up to 100 small text files, with a total limit of 250,000 characters and a 25,000-character per-file limit. It skips common dependency/build folders, engine-generated caches, and common credential files. The selected paths and a read-only Project Passport show which manifests and declared versions Phoenix detected; this does not prove what is installed or running. Nothing is sent until you submit. In real-provider mode, submitted excerpts go to the configured provider under the disclosure shown in the app.

When the model returns a suggested edit, Phoenix displays the proposed content. Choose **Review & apply these edits** to see the confirmation and file list. Phoenix rechecks each file against the scanned original before writing, stops if a file changed, and never runs commands. After writing, Phoenix keeps a session-only restore point; **Undo Phoenix’s latest edits** rechecks that the files still match Phoenix’s proposed version before restoring. Clearing or refreshing the session discards that restore point without changing files. Browser support for local folder reading/writing varies; Chromium browsers on localhost support the folder picker. Unsupported browsers cannot apply edits.

**Preview Recovery Card** opens a Markdown summary before saving. The card includes the diagnosis, recovery guidance, verification state, edit status, available references, and any detected project names, declared versions, and relative manifest paths. It does not include the pasted error or project file contents.

Phoenix also shows deterministic evidence separately from its likely diagnosis, and lets you tick off recovery steps during the current session. When it detects a supported project type, it can suggest a conventional test command. Phoenix does not run those commands. Project scripts can execute project code, so inspect the project instructions before choosing to run one yourself. Isolated test execution is not available yet.

### Game engine connectors and workflows

Phoenix includes local, read-only project-folder connectors for Unreal Engine, Unity, and CRYENGINE. After selecting a project folder, Phoenix shows detected engine markers and declared version details, flags absent engine-version/reference declarations or differing declarations for the same named project, matching text log files, and the earliest matching error lines within each file. These are review prompts, not proof that a project is invalid. Repeated identical error lines are grouped to reduce noise. The timeline is ordered by file and line; it is not a synchronized timeline across logs, and matching text is a clue rather than a confirmed root cause.

The game rescue flow can prepare engine-specific questions for build/cook/package failures, launch crashes, missing assets, shader/rendering problems, and performance issues. A bug report builder creates a Markdown report for preview and download. Matching log excerpts are excluded unless you opt in, and you should review them before sharing. Game recovery attempts are session-only and are included in a follow-up diagnosis if you choose one.

Phoenix can summarize numeric columns in selected CSV profiler exports when the headers look related to frame, CPU, GPU, memory, allocation, time, or duration. It preserves the exported values and does not infer units, rank a root cause, or currently parse binary Unreal Insights traces, Unity profiler captures, or native CRYENGINE profiling files.

These are project-folder connectors, not plugins installed in Unreal Editor, Unity Editor, or CRYENGINE Sandbox. Phoenix does not attach to a running editor/game or collect live telemetry. Unity Editor logs are often stored outside the project folder; paste one into the diagnosis or copy it into the selected folder if you want Phoenix to inspect it. Folder access starts read-only; Phoenix requests write access separately only when you approve suggested file edits.

## Privacy and safety

- The app binds to `127.0.0.1` and uses local origin checks.
- It accesses only the folder you explicitly select and reads only bounded text files. It does not execute commands.
- Diagnostic text, project excerpts, file handles, passport details, recovery progress, and undo restore points stay in browser memory and clear when you refresh, close the tab, or choose **Clear / Start over**. Appearance preferences, explicitly saved guides, and explicitly saved project memories are stored in browser local storage. Local guides and project memories can be removed or exported.
- The server does not log request bodies or provider responses.
- The AI response is validated before it reaches the browser. Phoenix asks for prose guidance without commands, but model output cannot be guaranteed safe or correct. Review all guidance and file changes before acting.

## Configuration

`PORT` sets the local server port (default `3001`), and `CLIENT_PORT` sets the browser app port (default `5173`). Both can be set in the root `.env` file. Vite exits if its selected port is already in use.

## Build

Run `npm run build` from the project root to create the browser production bundle in `client/dist/`.

## License

Project Phoenix is released under the MIT License. See [LICENSE](LICENSE).
