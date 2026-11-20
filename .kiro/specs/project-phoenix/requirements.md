# Project Phoenix — Requirements

**Version:** 1.6 (implemented product baseline)
**Context:** Kiroween 2026 — local web app, session-only diagnoses with opt-in project memory, multi-language

---

## 1. Goals

Phoenix may optionally inspect a bounded set of text files from one folder explicitly selected by the developer, and propose file edits for preview and explicit approval. Developers can separately save reviewed project checkpoints locally to continue later.

Project Phoenix helps a developer understand what went wrong in a software project, get safe recovery guidance, and verify whether the fix worked. It runs as a local web app in the browser. No accounts or live system access; only explicitly saved project checkpoints persist in the browser profile.

---

## 2. Users

**Primary user:** A developer debugging their own project. They understand basic development concepts. They paste in an error message, log snippet, or code context and expect a plain-language diagnosis and actionable next steps.

Out of scope for v1: ops engineers, live incident response, production system access, multi-user scenarios.

---

## 3. Functional Requirements

### 3.1 Input

- **REQ-01** The user can paste free-form text into an input area: an error message, a log snippet, a stack trace, or a short code excerpt. No file upload required in v1.
- **REQ-02** The input field accepts text from any language or ecosystem without requiring the user to specify the stack.
- **REQ-03** The user can submit the input to trigger a diagnosis.
- **REQ-04** The user can clear the current session (input, diagnosis, and verification state) and start fresh without reloading the page.
- **REQ-05** The server enforces a maximum input length of 8,000 characters and returns HTTP 400 with a plain-language error if that limit is exceeded.
- **REQ-06** Phoenix places pasted text in the user-message role of the AI prompt. The system prompt instructs the model to treat user-message content as data to diagnose, not as instructions to follow. This reduces the risk of the model acting on instructions embedded in pasted text, but does not guarantee the model cannot be influenced by it. Phoenix makes no stronger claim about prompt isolation.

### 3.2 Privacy disclosure

- **REQ-07** On load, the UI fetches the active adapter mode and a safe provider label from the server. Until that fetch succeeds, the submit button is disabled and a note is shown explaining that the privacy disclosure is loading. If the fetch fails, the submit button remains disabled and an error is shown; the user cannot submit a diagnosis until the correct disclosure is visible. The UI never allows submission with an unknown adapter mode.

- **REQ-08** Once the adapter mode is known, the UI displays a persistent, non-dismissible notice above the input area for the whole session. Its content depends on the adapter mode:

  **Mock mode:** "Running in demo mode. Submitted text is processed by a local mock adapter and is not sent to any external service."

  **Real mode:** "Pasted text and any selected project files, plus project notes selected for this session, are sent to [provider label] when you submit. Remove secrets, credentials, tokens, and personal data first. Project Phoenix does not control provider-side retention."

  The provider label is the hostname extracted from `AI_API_URL` by the URL parser (e.g. `api.openai.com`). It is derived structurally — the URL parser cannot return a full URL or embed credentials in the hostname component — so no further content validation is needed. `AI_PROVIDER_LABEL` does not exist in v1; custom labels are out of scope because no content-based check can reliably distinguish a credential-shaped string from safe display text.

- **REQ-09** The same adapter-aware disclosure applies to the follow-up re-diagnosis. When the user is about to submit a failed-verification result, an inline notice in the verification panel states the same destination as REQ-08, in the same mode-dependent form.

- **REQ-10** Phoenix must not assert or imply that submitted text is kept private by the AI provider, or that the provider deletes it after use. This applies to real mode only; in mock mode no external claim is relevant.

### 3.3 Diagnosis

- **REQ-11** On submission, Phoenix sends the pasted text to the configured provider adapter and returns a structured diagnosis containing:
  - A plain-language summary of what went wrong (or, for vague input, what additional context is needed).
  - The likely root cause: a non-empty string in a normal diagnosis; `null` when `needsMoreContext` is true.
  - Zero or more ordered recovery steps, each expressed as prose. An empty array when `needsMoreContext` is true.
  - A suggested way to verify that the fix worked, expressed as prose: a non-null object in a normal diagnosis; `null` when `needsMoreContext` is true.
- **REQ-12** Phoenix never executes any code, shell instruction, or file operation on the server or the user's machine. It only processes the text the user pastes in.
- **REQ-13** The `DiagnosisResult` schema has no `command` field on `RecoveryStep` or `VerificationStep`. The schema validator rejects any response that includes such a field, preventing structured shell commands from reaching the client. This does not prevent the model from writing shell commands inside prose `text` fields; the system prompt instruction is the safeguard for prose content, and that safeguard is not guaranteed. These two limits are separate and both apply.
- **REQ-14** **Needs-more-context response:** If the validated response has `needsMoreContext: true`, Phoenix renders a "needs more context" state showing only the summary (which explains what additional information is needed). It does not render a root-cause card, recovery steps, or a verification panel, and does not fabricate any of those fields.

### 3.4 AI response validation

- **REQ-15** The server validates every provider response against the defined `DiagnosisResult` schema before returning it to the client. A response that does not conform is treated as an error; the server returns HTTP 502 and the UI shows the error state.
- **REQ-16** The server never forwards a raw, unvalidated provider response to the client.

### 3.5 Recovery guidance

- **REQ-17** Recovery steps are presented as a numbered list of plain-language prose. Each step states what to do and why it helps.
- **REQ-18** Steps that carry any risk of data loss or difficulty of reversal are marked with a visible warning label.

### 3.6 Verification

- **REQ-19** Phoenix provides at least one concrete verification step when a full diagnosis is possible: a condition to confirm, an output to check, or a manual action to take. The verification step is omitted in the needs-more-context state.
- **REQ-20** The user can mark verification as passed or failed and optionally paste the result of running the check.
- **REQ-21** If the user marks verification as failed, Phoenix uses the original input plus the pasted verification result to generate exactly one follow-up diagnosis. No further re-diagnosis cycles are offered after that follow-up.

### 3.7 Session management

- **REQ-22** Diagnostic input, project contents, passport details, recovery progress, and undo snapshots are session-only and clear on refresh, tab close, or explicit clear. Appearance preferences and guides explicitly saved or imported by the user may persist in browser local storage. Project memory persists only when the user explicitly saves it under REQ-52 through REQ-54.
- **REQ-23** Session memory is limited to the active diagnostic workflow: current input/result/follow-up, verification state, selected bounded project text and folder handle, derived project evidence, current recovery progress/attempts, temporary edit/undo snapshots, and any notes explicitly selected for this session. These clear on refresh, tab close, or explicit clear; only the separately defined appearance preferences, local guides, and user-saved checkpoints persist.
- **REQ-24** A clearly labelled "Clear / Start over" action resets all session state without a page reload.

### 3.8 Mock mode vs. real mode

- **REQ-25-M** In mock mode Phoenix demonstrates the UI and interaction flow using fixed local diagnosis responses and a short-input needs-more-context heuristic. It performs no AI diagnosis and sends no data externally. This mode requires no API key and is the default.
- **REQ-25-R** Real AI diagnosis supports `openai`, `openai-compatible`, `anthropic`, `gemini`, and loopback-only `ollama` connectors. `AI_MODEL` is required for all real providers; API-key and endpoint requirements vary by connector and are defined by `.env.example`. Startup validates the selected connector's configuration and refuses to start when it is invalid; it does not silently fall back to mock mode. The legacy value `AI_PROVIDER=real` maps to the OpenAI-compatible connector.

---

## 4. Non-Functional Requirements

- **REQ-26 Performance:** Show a loading indicator while waiting for the provider adapter. Target diagnosis delivery under 15 seconds on a typical internet connection when using a real provider.
- **REQ-27 Safety — no command execution:** Phoenix never executes project commands. It may read bounded files from a folder the user explicitly selects and write only reviewed file edits after explicit confirmation, as described by REQ-35 through REQ-39.
- **REQ-28 Safety — no structured command output:** The schema enforces no `command` field on response step types. See REQ-13 for the scope of this safeguard and its limits with respect to prose content.
- **REQ-29 Accessibility:** The interface is designed for WCAG 2.1 AA colour contrast and keyboard navigation. A complete audit across all theme combinations remains outstanding; see the validation status in `tasks.md`.
- **REQ-30 Portability:** A single command from the project root (`npm run dev`) starts both the backend server and the frontend dev server. No separate terminal sessions required.
- **REQ-31 Privacy — no server-side logging of user content:** The server must not write pasted input text, follow-up results, or provider responses to any log file, stdout stream, or persistent store. Request-level metadata (timestamp, HTTP status, path) may be logged; payload content must not.
- **REQ-32 Privacy — provider disclosure:** See REQ-08 through REQ-10. The app does not make claims about provider-side data handling beyond what Phoenix itself controls.
- **REQ-33 Local binding:** The Express server binds exclusively to the loopback interface (`127.0.0.1`), not `0.0.0.0`. It must not be reachable from other machines on the network.
- **REQ-34 Transport security:** Real remote provider endpoints must use `https:`. Plain HTTP is allowed only for loopback providers; Ollama is restricted to `127.0.0.1` or `localhost`. The server rejects embedded URL credentials and refuses invalid connector configuration. See `server/lib/validateRealModeConfig.js` and `.env.example`.

---

## Provider, appearance, and local project requirements (implemented scope)

- REQ-33-P Phoenix supports mock, OpenAI, OpenAI-compatible, Anthropic, Gemini, and local Ollama connectors. Credentials remain server-side in `.env`.
- REQ-34-A Settings show the active provider/model and allow named Phoenix presets, Ember/Ocean/Violet/Forest palettes, dark/light appearance, comfortable/compact layout, and Horizon/Aurora/Embers/Quiet backgrounds. Background color accents follow the selected palette. Appearance preferences, explicitly saved guides, and opt-in project memories may persist in browser local storage.
- REQ-35 The user explicitly chooses one project folder. Phoenix reads only bounded text files, skips common secrets and generated/dependency folders, lists included relative paths, and sends no project excerpts until diagnosis submission.
- REQ-36 Selected project context is limited to 100 files, 25,000 characters per file, and 250,000 total characters. The current scanner allow-list includes the project metadata and source formats documented in design §1, including Go `go.mod` and .NET `.csproj` files; unsupported and binary files are skipped.
- REQ-37 Suggested edits identify an existing supplied relative path, explain the change, and include original and proposed file text. Phoenix never creates files or runs commands.
- REQ-38 Phoenix previews each proposed edit and asks for confirmation before writing. It checks original file contents immediately before writing and stops on mismatch.
- REQ-39 The browser applies edits only when its folder access capability supports it; otherwise no write is attempted.
- REQ-40 The user can choose Offline Guide Search, which searches a bundled knowledge base locally without calling an AI model or sending text or project files externally.
- REQ-41 Offline results are derived only from retrieved guide entries and fixed templates; Phoenix labels them as search matches, not AI-generated or verified diagnoses.
- REQ-42 Each offline guide includes recognizable error patterns, ecosystem, likely cause, safe recovery steps, a verification suggestion, and an official reference.
- REQ-43 Phoenix shows why a guide matched and provides the source reference; if no close match is found, it asks for more context rather than inventing a guide.
- REQ-44 The bundled library records a version and review date and is described as a static snapshot that may become stale while offline.
- REQ-45 Project Passport identifies supported ecosystems and declared versions from bounded manifests, shows relative source paths, and does not claim a dependency is installed or running.
- REQ-46 Phoenix separates deterministic observations from likely-cause analysis. Evidence includes recognizable error signatures, mentioned file locations, and Passport manifest facts. The UI says observations do not prove a root cause.
- REQ-47 The user can mark recovery steps complete. Progress is held in memory for the active diagnosis only and resets on a new diagnosis, follow-up diagnosis, clear, refresh, or tab close.
- REQ-48 For detected project types, Phoenix may suggest common checks and explain their source. Suggestions are never executed. The UI warns that project-defined scripts can run code.
- REQ-49 Users can preview JSON knowledge packs before import and export locally saved guides as a pack. Packs are limited to 1 MB and 200 guides, validated against the local guide schema and HTTPS-reference rule, and added only to this browser’s separate local guide list. Phoenix does not claim to verify imported guide content.
- REQ-50 The rescue walkthrough stays offline, no-key, and uses the same local retrieval path as Offline Guide Search. It includes six general software cases and an engine-specific case for Unreal, Unity, and CRYENGINE.
- REQ-51 Phoenix does not execute tests in an isolated project copy in this version. A process started by the local server does not qualify as isolated execution.
- REQ-52 Project memory is separate from diagnostic session state. Phoenix saves a project name and developer-reviewed notes only after an explicit save action. Raw pasted errors, project files, credentials, verification output, and restore points are never copied into memory automatically.
- REQ-53 Saved project memories remain in the current browser profile's local storage only; they are not uploaded or synced. The UI states they are not encrypted by Phoenix, may be removed by browser data clearing, and should not contain secrets. Users can list, load, edit, delete, export, and import a memory. Import validates the memory shape and size before saving.
- REQ-54 Phoenix allows the user to add the current diagnosis summary to editable notes; this does not save until the user explicitly saves the checkpoint.
- REQ-55 Project Passport recognizes Unreal Engine `.uproject` and `.uplugin` descriptors selected within existing folder limits. It reports only declared descriptor information and does not inspect binary `.uasset` or other binary assets.
- REQ-56 The offline library includes Unreal Engine guides for common packaging/cooking, module build, crash/GPU crash, and Blueprint runtime problems, each linked to official Epic documentation and presented as retrieval matches rather than confirmed diagnoses.
- REQ-57 Selecting an Unreal project may read bounded text descriptors, source, configuration, and logs allowed by the existing scanner. Existing file-count and character limits, secret-path/content filters, and provider privacy disclosures continue to apply.
- REQ-58 A developer may explicitly include the visible project-memory notes in diagnoses for the current browser session. The notes are added to offline search locally or sent with the diagnosis to the active adapter; in real-provider mode, the persistent privacy notice names that additional data before submission. This inclusion toggle is session-only and resets on reload.
- REQ-59 Project Passport recognizes Unity `ProjectSettings/ProjectVersion.txt` and `Packages/manifest.json`, reporting the declared editor version and selected direct package versions without claiming they are installed.
- REQ-60 Project Passport recognizes CRYENGINE `.cryproject` descriptors and reports the declared project name, project-file format version, engine reference, and descriptor path without claiming the engine is installed or the project is runnable.
- REQ-61 The project folder scanner can read bounded Unity assembly definitions and shader source and CRYENGINE project descriptors, source, configuration, and text logs. It continues to exclude game binary assets and generated engine caches under existing safety limits.
- REQ-62 The offline library includes Unity guides for package resolution, script assembly compilation, and shader errors; and CRYENGINE guides for project loading, solution generation, crash logs, and packaging behavior. Each guide links to an official vendor reference and is labeled as a retrieval match, not a confirmed diagnosis.
- REQ-63 Settings include selectable Horizon, Aurora, Embers, and Quiet backgrounds. Each uses the active palette's scene colors, is saved as an appearance preference, and does not affect diagnostic data or app behavior.
- REQ-64 The selected-folder scanner accepts Go `.mod` and .NET `.csproj` metadata so the existing Go and .NET Project Passport parsers can identify those projects. Project detection remains bounded and does not inspect installed toolchains.

## 5. Out of Scope (v1)

- Arbitrary file uploads, archives, or scanning paths that the user did not explicitly select. One bounded, user-selected local folder is in scope under REQ-35.
- Running language-specific toolchains or providing exhaustive project analysis. Phoenix inspects only supported bounded text and metadata files.
- Persistent diagnosis history or user accounts. Project checkpoints are separately opt-in and contain only user-reviewed notes under REQ-52–REQ-54.
- Live system repair or command execution
- Generated shell commands as structured output in recovery or verification steps
- More than one follow-up re-diagnosis cycle
- Production / incident-response workflows
- Deployment or CI/CD integration
- Phoenix-launched test execution, including purportedly isolated copies, until an enforced sandbox is available

---

## 6. Acceptance Criteria

| ID | Requirement | Acceptance condition |
|----|-------------|----------------------|
| REQ-07 | Fail closed on config load failure | With the server unreachable, the submit button is disabled and an error message is shown. The button does not become enabled until a successful config response is received. |
| REQ-08 | Adapter-aware privacy notice | In mock mode: notice states no external service. In real mode: notice shows the hostname derived from `AI_API_URL`, not the raw URL. Both are visible and non-dismissible once config loads. |
| REQ-08 | Provider label derivation | With `AI_API_URL=https://api.openai.com/v1`, `GET /api/config` returns `providerLabel: "api.openai.com"`. With `AI_API_URL=http://127.0.0.1:11434/v1`, it returns `providerLabel: "127.0.0.1"`. The raw URL and API key are absent from the response in both cases. |
| REQ-09 | Follow-up disclosure | Inline notice in the verification panel matches REQ-08 content for the active mode before follow-up submission. |
| REQ-12 | No command execution | No use of `child_process`, `exec`, `spawn`, `execFile`, `eval`, or `new Function(…)` anywhere in `server/`; confirmed by static grep. |
| REQ-13 | Schema rejects structured command fields | Injecting a mock AI response that includes a `command` field on a `RecoveryStep` or `VerificationStep` causes the server to return HTTP 502 and the UI to show the error banner. This acceptance check covers only the structured-field enforcement; it makes no claim about prose content. |
| REQ-14 | Needs-more-context | Submitting fewer than three words to the mock adapter returns the needs-more-context state and renders only the summary card. No `rootCause`, recovery steps, or verification panel appear. Real-provider behavior is conditional on provider configuration. |
| REQ-15 | Schema validation | Injecting a mock response of `{ "broken": true }` causes the server to return HTTP 502 and the UI to show the error banner. |
| REQ-21 | One follow-up only | After one failed-verification re-diagnosis, the UI does not offer another "Re-diagnose" action. |
| REQ-25-M | Mock mode is the default | With no `.env` file present, `npm run dev` starts the app in mock mode; the notice states no external service; diagnosis returns the fixed mock result. |
| REQ-25-R | Provider startup validation | With `AI_PROVIDER=openai` and `AI_API_KEY` or `AI_MODEL` missing, the server lists each applicable error and does not start. For valid loopback Ollama settings, no API key is required. |
| REQ-30 | Single start command | `npm run dev` from the root starts both server and client; confirmed by running the command in a clean environment. |
| REQ-31 | No payload logging | Server stdout/stderr during a full session contains no pasted text; confirmed by log inspection. |
| REQ-33 | Loopback binding | Server is unreachable at the host's LAN IP; confirmed by `curl http://<LAN-IP>:3001/api/health` returning connection refused. |
| REQ-34 | HTTPS enforcement | With `AI_PROVIDER=openai-compatible` and a remote `http:` endpoint, the server refuses to start. Loopback HTTP is allowed for local compatible providers; Ollama is limited to loopback. |
| Vite proxy headers | Correct headers through proxy | A request made from the browser through the Vite proxy arrives at Express with `Origin: http://localhost:{CLIENT_PORT}` and `Host: 127.0.0.1:{PORT}`. Confirmed by inspecting headers in the Express request handler during a live request. |
| Vite strictPort | Vite exits on port conflict | With the app already running and `CLIENT_PORT` occupied, a second `npm run dev` (or direct `vite` invocation) exits immediately with a port-in-use error. It does not start on a different port. |
| REQ-63 | Palette-linked backgrounds | Each background can be selected in Settings, persists after reload, and derives its scene colors from the active palette; Quiet suppresses the decorative streak layer. |
| REQ-64 | Go and .NET project metadata | A selected fixture containing `go.mod` and `.csproj` files identifies Go and .NET in Project Passport, subject to the normal file and character limits. |

---

## 7. Data flow and retention

This table covers every piece of sensitive data Phoenix handles. "Phoenix clears (memory)" means the data is gone from Phoenix-controlled process memory when the stated event occurs. It makes no claim about provider-side behaviour.

| Data item | Where it originates | Where Phoenix holds it | Sent externally? | How Phoenix clears it |
|---|---|---|---|---|
| **Pasted input** | User types/pastes into browser | Browser memory (React state) only | Real mode: sent to the configured AI provider as part of the prompt. Mock mode: not sent anywhere. | Memory: on "Clear / Start over" or page reload/close. Never written to disk by Phoenix. |
| **Verification result** | User pastes into verification textarea | Browser memory (React state) only | Real mode: sent to the configured AI provider as part of the follow-up prompt. Mock mode: not sent anywhere. | Memory: on "Clear / Start over" or page reload/close. Never written to disk by Phoenix. |
| **Selected project text and paths** | User selects a local folder; scanner reads bounded, allow-listed text | Browser memory (React state and file handles) | Offline mode: stays local. Mock mode: sent only to Phoenix's local server. Real mode: included in the provider request when diagnosis is submitted. | Memory and handle are cleared on "Clear / Start over", page reload, or tab close. |
| **Selected project-memory notes** | User enables the session-only include checkbox | Browser memory (React state) | Offline mode: used only in local search. Mock mode: sent only to Phoenix's local server. Real mode: included in the provider request while selected. | The include selection and session copy clear on clear/reload/tab close; saved checkpoint persists separately only after explicit save. |
| **Diagnosis output** | Returned by provider adapter | Server memory for the duration of the HTTP request; then browser memory (React state) | Not re-sent. Received from provider, validated, forwarded to browser. | Server memory: discarded when the HTTP request completes. Browser memory: on "Clear / Start over" or page reload/close. Never written to disk by Phoenix. |
| **API key (`AI_API_KEY`)** | `.env` file on the developer's machine | (1) `.env` file on disk — persists until the developer deletes it. (2) Server process environment — held in memory while the server runs. | Sent in the selected provider's authentication header only when that connector requires it, over HTTPS (or loopback HTTP). Never sent to the browser. | Process memory: cleared when the server process exits. The `.env` file itself remains on disk and must be managed by the developer. |
| **Provider label** | Extracted from `AI_API_URL` hostname by the URL parser | Returned by `GET /api/config` to the browser; held in React state | Shown in the browser UI only. Not sent to the AI provider. | Browser memory: on page reload/close or "Clear / Start over". |
| **Request metadata** | Server request handling | Server stdout only (HTTP method, path, status code, response time) | Not sent anywhere. | Not persisted to disk unless the developer redirects stdout. Payload content is excluded. |

## 8. Implemented experience acceptance criteria

- Six judge demo scenarios can produce local search results without a configured model or a `POST /api/diagnose` call.
- The three named theme presets apply their palette and appearance together; theme, palette, and layout preferences remain usable individually. The success animation is suppressed by `prefers-reduced-motion`.
- A Recovery Card is previewed before download and excludes the original pasted input and all project file contents.
- Undo restores edits only when all affected files still equal Phoenix's proposed versions; one mismatch prevents every restoration. The restore point is session-only, and clearing it prompts the user.
- A guide is validated and previewed before explicit local save. It appears only in this browser's offline search, can be removed/exported, and never changes bundled data automatically.

## 9. Implemented project/game acceptance criteria

- A selected folder with supported manifests shows a Project Passport listing only declared ecosystems, versions, and relative manifest paths; it does not assert installed state.
- Result screens separate observed input/project clues from inferred root cause and, when available, show local guide references and matched terms.
- Recovery step checkboxes visibly update the runway progress and clear on new diagnosis or session reset.
- Project check plans show only recognized project check suggestions, warn they may execute project-defined code, and never invoke a process from Phoenix.
- Guide pack import rejects invalid JSON/schema, packs over 1 MB, more than 200 entries, and non-HTTPS references; valid packs are previewed before explicit local import. Existing entries are not overwritten.
- The rescue walkthrough’s six cases route through offline local search without calling the model diagnosis API.
- Isolated project test execution is explicitly not provided until an enforced sandbox is implemented.
