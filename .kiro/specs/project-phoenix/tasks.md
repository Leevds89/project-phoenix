# Project Phoenix — Implementation Tasks

**Version:** 1.6 (implemented product baseline)
**Status:** The initial implementation and the expanded scope listed below exist in the repository. Phases 1–5 retain the original build plan for traceability; they are not an unstarted implementation queue. Remaining validation and maintenance work is listed explicitly below.

The original phase plan is retained below for traceability. Each task has a “Done when” condition tied to the requirements.

## Expanded scope status

Implementation status was reviewed against the current source on 2026-11-20. Checked items mean the feature is present in source; they do not imply every browser/provider acceptance test has passed.

- [x] 6.1 Add opt-in browser-local project checkpoints with editable notes, explicit save/update/delete, and privacy disclosure. (REQ-52, REQ-53)
- [x] 6.2 Add editable diagnosis-summary insertion, explicit session-only diagnosis context selection, and JSON memory import/export with schema and size validation. (REQ-53, REQ-54, REQ-58)
- [x] 6.3 Recognize Unreal `.uproject` and `.uplugin` descriptors in bounded project scans and Project Passport; exclude binary assets. (REQ-55, REQ-57)
- [x] 6.4 Add official-source offline guides for common Unreal build, packaging, crash, GPU, and Blueprint runtime failures. (REQ-56)
- [x] 6.5 Add Unity and CRYENGINE project passport detection, bounded text scanning, official-source offline guides, and demo walkthrough cases. (REQ-59–REQ-62)

- [x] Provider adapters: OpenAI, OpenAI-compatible, Anthropic, Gemini, and local Ollama.
- [x] Appearance settings: palette, theme, and layout controls.
- [x] Palette-aware Horizon, Aurora, Embers, and Quiet background controls; preferences persist in local storage.
- [x] Optional selected-folder scan with explicit disclosure, bounded text, and skipped sensitive/generated paths.
- [x] Validated proposed edits, preview, confirmation, and original-content recheck before writes.
- [x] Bundle a versioned, multi-ecosystem offline troubleshooting library with official reference links.
- [x] Add local keyword/error-pattern ranking and a transparent no-match response.
- [x] Add an Offline Guide Search mode that does not submit input or folder context to the provider route.
- [ ] Expand the curated entries through maintainer review and periodic source re-checks; offline content cannot update itself.
- [x] Add six no-key judge scenarios using only local offline search.
- [x] Add previewed Recovery Card export that omits pasted input and project file contents.
- [x] Add session-only edit undo with content rechecks and a clear-session warning.
- [x] Add three Phoenix appearance presets and reduced-motion-aware success feedback.
- [x] Add local reviewed-guide creation, preview, removal, and JSON export; keep contributions separate from shipped guides.
- [ ] Maintainers review exported guide contributions before adding them to the shipped knowledge base.
- [x] Detect project ecosystems and declared versions from selected manifests; show source paths and avoid claiming installed state.
- [x] Allow-list Go `.mod` and .NET `.csproj` manifests so the existing Passport parsers can recognize these projects.
- [x] Display deterministic error/project evidence separately from the likely diagnosis.
- [x] Add session-only recovery-step progress and the recovery runway.
- [x] Suggest project-specific test checks without launching commands.
- [x] Preview, validate, import, and export local JSON guide packs with size/entry limits.
- [x] Expand the no-key demo into an explicit rescue walkthrough.
- [ ] Design and implement an enforced isolated test runner; current app deliberately does not execute project code.
- [ ] Exercise `showDirectoryPicker()`, folder read, approved edit, and undo through a supported desktop Chromium browser against the disposable fixture project. The app UI automation used for the current pass could not control its native folder picker.
- [ ] Verify each real provider against a configured service/model. Current live configuration is mock mode; protocol implementation does not establish account/model availability.
- [ ] Run a full WCAG 2.1 AA contrast and keyboard audit across every theme, palette, and background combination.
- [ ] Continue maintainer review and periodic source checks for offline guides. The bundled database is static while offline.

**Verification evidence recorded 2026-11-20:** `npm run build` and `git diff --check` exited 0; local `/api/health` returned `ok: true`; `/api/config` reported mock mode. Browser checks exercised offline guide search, the single failed-verification follow-up, Unity rescue prompt generation, saved theme/background preferences after reload, and a 706 px viewport with no horizontal overflow. Direct scanner-module checks against the 25-file desktop fixture detected ten ecosystems, all three game connectors, repeated Unreal log lines, and profiler CSV metrics. These checks did not exercise native folder selection, file writes/undo, real provider APIs, or a complete WCAG audit. The repository currently defines no automated test script; available npm scripts are `dev`, `build`, and `preview`.

---

## Phase 1 — Project scaffold

### Task 1.1 — Root package and tooling setup
- Initialise `package.json` at the root. Add `concurrently` as a dev dependency.
- Define `npm run dev` as a root script that starts `server/` and `client/` concurrently. *(REQ-30)*
- Add `.gitignore`: `node_modules/`, `.env`, `dist/`, `client/dist/`.
- Add `.env.example` with all keys from design §3.11; no values filled in.
- **Done when:** `npm install` completes without errors; `npm run dev` is a defined script in `package.json`.

### Task 1.2 — Express server scaffold
- Create `server/index.js`. Bind Express to the string literal `'127.0.0.1'` with the port from `.env` (default 3001). The host is hard-coded, never read from an environment variable. *(REQ-33, design §3.9)*
- Load `.env` using `dotenv.config({ path: path.resolve(__dirname, '../.env') })`. The explicit path is anchored to `server/index.js`'s own directory, so the server always finds the root `.env` regardless of the working directory from which the process is launched (e.g. via `concurrently` from the project root, or directly from inside `server/`). *(design §3.7)*
- Add `GET /api/health` returning `{ "ok": true }`.
- Set a JSON body parser with a 32 KB size limit.
- **Done when:** `GET http://127.0.0.1:3001/api/health` returns `{ "ok": true }`. The same request via the host's LAN IP returns connection refused.

### Task 1.3 — Origin middleware
- Create `server/middleware/originCheck.js`. *(design §3.8)*
- Read `PORT` and `CLIENT_PORT` from the environment (defaults: 3001, 5173) to build the exact allowlists at startup.
- Allowed `Origin` values (exact): `http://localhost:{CLIENT_PORT}` and `http://127.0.0.1:{CLIENT_PORT}`.
- Allowed `Host` values (exact): `localhost:{PORT}` and `127.0.0.1:{PORT}`.
- Apply rules from design §3.8 in order. `Origin` and `Host` are checked against independent allowlists; they are not required to match each other.
- Use exact string comparison only; no prefix, suffix, or regex matching.
- Apply the middleware before all `/api` routes.
- **Done when:**
  - `Origin: http://localhost:5173` → passes.
  - `Origin: http://127.0.0.1:5173` → passes.
  - `Origin: http://localhost:5173` with `Host: 127.0.0.1:3001` → passes (Vite proxy case; headers checked independently).
  - `Origin: http://evil.example.com` → HTTP 403.
  - No `Origin`, `Host: localhost:3001` → passes (direct call).
  - No `Origin`, `Host: 127.0.0.1:3001` → passes.
  - No `Origin`, no `Host` → HTTP 403.
  - No `Origin`, `Host: evil.local` → HTTP 403.

### Task 1.4 — Vite + React client scaffold
- Initialise a Vite + React project in `client/`.
- Configure `vite.config.js` as a config function using `defineConfig(({ mode }) => { ... })`. *(design §3.7)*
  - Load the root `.env` with `loadEnv(mode, path.resolve(__dirname, '..'), '')` before reading any port values. This is required because Vite does not make `.env` values available to the config file via `process.env`; its built-in env loading runs after config evaluation.
  - Read only `CLIENT_PORT` and `PORT` from the loaded env. No other variables — including credentials — are accessed in `vite.config.js` or exposed to the client bundle.
  - `server.port`: set to `CLIENT_PORT` (default `5173`).
  - `server.strictPort: true`. Vite exits with a clear error if the port is already occupied rather than starting on a different port that is not in Express's `Origin` allowlist.
  - Proxy rule: `/api/*` → `http://127.0.0.1:{PORT}`, with `changeOrigin: true`. This causes `http-proxy` to rewrite the forwarded `Host` header to `127.0.0.1:{PORT}`, while leaving the browser's `Origin` header unchanged.
- Add a root `<App />` component that renders a placeholder heading.
- **Done when:**
  - Both processes running via root `npm run dev`; browser shows the placeholder at `http://localhost:5173`.
  - A proxied request from the browser to `/api/health` returns `{ "ok": true }`.
  - A request inspected at Express (via a temporary debug log) shows `Origin: http://localhost:5173` and `Host: 127.0.0.1:3001` simultaneously. Remove any temporary logging after verification. *(Acceptance check "Vite proxy headers" in requirements §6.)*
  - With the app already running, a second `npm run dev` (or `cd client && npx vite`) exits immediately with a port-in-use error rather than starting on a different port. *(Acceptance check "Vite strictPort" in requirements §6.)*

---

## Phase 2 — Backend: config validation, config endpoint, provider adapter, and diagnosis endpoint

### Task 2.1 — Provider configuration validator
- Create `server/lib/validateRealModeConfig.js`. *(REQ-25-R, REQ-34, design §3.4)*
- Called at server startup before any routes are registered whenever a non-mock provider is selected.
- Validates the selected connector's provider-specific model, API key, URL, HTTPS, embedded-credential, and loopback requirements. OpenAI, Anthropic, and Gemini require keys; remote OpenAI-compatible endpoints require a key; Ollama is loopback-only and requires no key. *(REQ-25-R, REQ-34)*
- If any check fails, prints a structured error listing all failures and exits with code 1. The server does not start in a partial state.
- **Done when:**
  - Valid configuration for each provider → function returns without error.
  - Missing key for a key-required provider → error lists it; server exits.
  - `AI_API_URL=http://external.example.com/v1` → error cites HTTPS requirement; server exits. *(REQ-34)*
  - `AI_API_URL=http://127.0.0.1:11434/v1` → loopback exemption; no error on this variable.
  - `AI_MODEL` missing → error lists it; server exits.
  - Multiple failures → all listed in a single message; server exits once after collecting all.

### Task 2.2 — `GET /api/config` endpoint
- Create `server/routes/config.js`. *(design §3.1, REQ-07, REQ-08)*
- Returns adapter mode and safe provider identity (`providerLabel`, `providerId`, `providerName`, `modelName`); mock identity fields are null. The real-mode provider label is the endpoint hostname.
- Never includes `AI_API_KEY`, `AI_API_URL`, or any credential in the response.
- **Done when:**
  - Mock mode → `{ adapterMode: "mock", providerLabel: null }`.
  - Real mode, `AI_API_URL=https://api.openai.com/v1` → `{ adapterMode: "real", providerLabel: "api.openai.com" }`.
  - Real mode, `AI_API_URL=http://127.0.0.1:11434/v1` → `{ adapterMode: "real", providerLabel: "127.0.0.1" }`.
  - Raw URL and API key absent from response body in all cases.

### Task 2.3 — Provider adapter: mock
- Create `server/lib/providers/mock.js` and `server/lib/providers/index.js`. *(design §3.3, REQ-25-M)*
- `mock.diagnose(systemPrompt, userMessage)` returns one of two fixed valid `DiagnosisResult` JSON responses based on a short-input heuristic, with no network call. The full diagnosis contains two safe prose recovery steps; the needs-more-context response contains only the summary and empty fields. No `command` fields.
- `index.js` exports the mock adapter when `AI_PROVIDER` is unset or `'mock'`; otherwise it selects the requested supported provider connector. The legacy value `'real'` aliases OpenAI-compatible.
- **Done when:** Mock adapter returns the fixed JSON string without any network call. `providers/index.js` selects the correct adapter for each `AI_PROVIDER` value.

### Task 2.4 — System prompt builder
- Create `server/prompts/system.js` that exports a function returning the system prompt string. *(design §3.6)*
- Must include all six instructions from design §3.6, with explicit wording for instruction 3 (prose only; no shell commands; example paraphrase).
- **Done when:** The returned string contains the schema shape and each of the six instructions, including the prose-only instruction with example wording.

### Task 2.5 — Schema validator
- Create `server/lib/validateDiagnosisResult.js`. *(REQ-13, REQ-15, REQ-16, design §3.5)*
- Returns `{ valid: true, data }` or `{ valid: false, error: string }`.
- Strict mode: unknown fields on `RecoveryStep` or `VerificationStep` → reject. A `command` field on either type → reject with error `"Unexpected 'command' field in step"`.
- Enforces all other constraints from design §3.5.
- **Done when:** Unit tests confirm:
  - Valid `needsMoreContext: false` object → passes.
  - Valid `needsMoreContext: true` object → passes.
  - Missing `summary` → fails.
  - `needsMoreContext: true` with non-empty `recoverySteps` → fails.
  - `needsMoreContext: false` with `rootCause: null` → fails.
  - `RecoveryStep` with `risky` as string → fails.
  - `RecoveryStep` with `order: 0` → fails.
  - `RecoveryStep` with a `command` field → fails with unexpected-field error.
  - `VerificationStep` with a `command` field → fails.

### Task 2.6 — `POST /api/diagnose` route
- Create `server/routes/diagnose.js`. *(REQ-06, REQ-11–REQ-16, REQ-31)*
- Validate `input` and `verificationResult` per design §3.1 request validation rules.
- Treat both as opaque text; do not log their contents.
- Build user message; call adapter; parse JSON → schema validator.
- HTTP 502 on parse or validation failure.
- HTTP 200 with validated `DiagnosisResult` on success.
- **Done when:**
  - Valid input → `DiagnosisResult` returned; no `command` fields present.
  - Empty input → HTTP 400.
  - Input > 8,000 chars → HTTP 400.
  - Mock adapter returning `{ "broken": true }` → HTTP 502.
  - Mock adapter returning a `RecoveryStep` with a `command` field → HTTP 502.
  - Server logs contain no pasted text. *(REQ-31)*

### Task 2.7 — Provider connector adapters *(implemented; live account checks remain conditional)*
- Implement `server/lib/providers/openaiCompatible.js`, `anthropic.js`, `gemini.js`, and `ollama.js`, sharing provider config and HTTP helpers; keep the mock adapter as the default. *(design §3.3, REQ-25-R)*
- Validate each provider's model, API key, endpoint, HTTPS, and loopback requirements at server startup. OpenAI-compatible local endpoints may omit a key; Ollama is loopback-only.
- `AI_PROVIDER=real` remains a compatibility alias for `openai-compatible`.
- No adapter logs request/response payloads. *(REQ-31)*
- **Implementation present.** Live account/model behavior has not been verified for every connector; see the status checklist at the start of this file.

---

## Phase 3 — Frontend: core UI

### Task 3.1 — Session context
- Create `client/src/context/SessionContext.jsx` with the full state shape from design §2.3. *(REQ-22–REQ-24)*
- Export `useSession` hook and `SessionProvider`.
- On mount, call `GET /api/config`:
  - Success → set `configStatus = 'ready'`, `adapterMode`, `providerLabel`.
  - Failure (any network or HTTP error) → set `configStatus = 'error'`.
- Implement `clearSession`: resets `input`, `status`, `diagnosis`, `followUp`, `verificationStatus`, `verificationPaste`, `errorMessage`. Does not reset `configStatus`, `adapterMode`, or `providerLabel`.
- **Done when:** Unit test confirms: `clearSession` resets all seven resettable fields; `configStatus`, `adapterMode`, `providerLabel` are unaffected. Config fetch failure → `configStatus = 'error'`.

### Task 3.2 — Header component *(REQ-24)*
- Render app title ("Project Phoenix"), short Kiroween tagline, "Clear / Start over" button.
- Button hidden when `status === 'idle'` and during config loading/error; visible for all active session statuses.
- Clicking calls `clearSession`.
- **Done when:** Button visibility correct across all status values; click resets session to idle.

### Task 3.3 — PrivacyNotice component *(REQ-07–REQ-10, design §2.4)*
- Checks `configStatus`:
  - `'loading'` → "Loading privacy disclosure…" with spinner.
  - `'error'` → "Could not load configuration. Diagnosis is unavailable."
  - `'ready'`, mock → "Running in demo mode. Submitted text is processed by a local mock adapter and is not sent to any external service."
  - `'ready'`, real → "Submitted text is sent to `{providerLabel}` for processing. Remove any secrets, credentials, tokens, or personal data before submitting. Project Phoenix does not control what that provider does with submitted text."
- Always visible; not dismissible. No retention claims. *(REQ-10)*
- **Done when:** Each of the four states renders the correct text. Real mode shows `providerLabel` verbatim.

### Task 3.4 — InputPanel component *(REQ-01–REQ-03, REQ-05, REQ-07)*
- `<textarea>` bound to `input`; character count ("X / 8,000").
- Submit disabled when `configStatus !== 'ready'` OR `input` empty OR `status === 'loading'`.
- In provider mode, submit `{ input, projectFiles, projectMemory? }` to `/api/diagnose`; offline mode calls `searchOfflineKnowledge` locally and makes no API request.
- Handle response: `needsMoreContext: true` → `'needs-more-context'`; valid → `'result'`; error → `'error'`.
- **Done when:** Each disable condition independently prevents submission. POST fires when all conditions are met and resolves to the correct status.

### Task 3.5 — StatusBar component *(REQ-26)*
- Spinner + "Diagnosing…" when `status === 'loading'` or `'follow-up-loading'`.
- Error banner with `errorMessage` when `status === 'error'`.
- **Done when:** Each state renders correctly and clears on status change.

### Task 3.6 — DiagnosisPanel, SummaryCard, RootCauseCard
- Render `summary` and `rootCause` in labelled cards.
- Rendered only when `status === 'result'` or `'follow-up'`.
- **Done when:** Given a mock `DiagnosisResult`, both cards render the correct text.

### Task 3.7 — RecoverySteps and RiskWarning *(REQ-17, REQ-18)*
- `recoverySteps` as a numbered list of prose paragraphs. No code blocks or copy buttons in v1.
- `risky: true` → `<RiskWarning>` badge above step text.
- **Done when:** Prose renders correctly. Risky step shows badge. Non-risky does not.

### Task 3.8 — NeedsMoreContextPanel *(REQ-14)*
- Rendered only when `status === 'needs-more-context'`.
- Shows `SummaryCard` only; no other panels.
- **Done when:** `needsMoreContext: true` result renders only the summary card.

### Task 3.9 — VerificationPanel and FollowUpNotice *(REQ-09, REQ-19–REQ-21, design §2.4)*
- Rendered when `status === 'result'`.
- Shows `verificationStep.text` as prose.
- "Mark as Passed" → success message; form hidden; no re-diagnose.
- "Mark as Failed" → reveals paste textarea and `<FollowUpNotice>` with adapter-aware text.
- "Re-diagnose" → POSTs `{ input, verificationResult }`; sets `'follow-up-loading'`.
- After follow-up response → `'follow-up'`; re-diagnose button does not reappear. *(REQ-21)*
- **Done when:** Pass path → success, no re-diagnose. Fail path → `FollowUpNotice` correct; POST fires. After follow-up, no second re-diagnose.

### Task 3.10 — FollowUpPanel *(REQ-21)*
- Rendered only when `status === 'follow-up'`.
- Same `DiagnosisPanel` + `RecoverySteps` structure from `followUp` state. No `VerificationPanel`.
- **Done when:** Mock follow-up result renders correctly with no further action.

---

## Phase 4 — Styling

### Task 4.1 — Global styles and theme tokens
- Create `client/src/styles/global.css`.
- Theme tokens cover four palettes, three Phoenix presets, dark/light surfaces, four palette-aware backgrounds, comfortable/compact layout, and reduced-motion behavior.
- Base reset, body font, background colour.
- **Done when:** Dark background renders; custom properties defined and used consistently.

### Task 4.2 — Component styles *(REQ-29)*
- Style every Phase 3 component: layout, spacing, typography, card borders, button states, spinner animation, error/warning/notice treatments, config-loading and config-error states.
- Verify all text/background pairs meet WCAG 2.1 AA. *(REQ-29)*
- **Done when:** Visual review confirms dark/amber Kiroween aesthetic. Browser DevTools accessibility check confirms AA compliance.

---

## Phase 5 — Integration, hardening, and documentation

### Task 5.1 — End-to-end smoke test (mock adapter)
Walk the full flow in the browser with the mock adapter. No API key required.
1. On load: notice shows "Loading privacy disclosure…", then switches to mock-mode text.
2. `configStatus = 'ready'`: paste a sample error → Diagnose → result with prose recovery steps and verification panel.
3. Mark verification **passed** → success state; no re-diagnose button.
4. Clear → idle.
5. Submit a very short input (fewer than three words) → mock returns `needsMoreContext: true` → only summary card; no other fields.
6. Clear → idle.
7. Paste sample error → Diagnose → Mark verification **failed** → paste result → `FollowUpNotice` with mock-mode text visible → Re-diagnose → follow-up panel; no second re-diagnose.
- **Done when:** All seven steps complete with no console errors.

### Task 5.2 — Security and privacy acceptance tests

Checks marked *(real mode)* are conditional: run only if a provider has been configured.

- **[REQ-07] Fail closed:** Make `GET /api/config` return a 500. Confirm submit button disabled and error shown. Restore; confirm button re-enables.
- **[REQ-08] Mock notice:** `adapterMode = 'mock'` → "not sent to any external service" text shown.
- **[REQ-08] Real notice:** *(real mode)* `providerLabel = 'api.openai.com'` → that label in the notice; raw URL and API key absent from browser.
- **[REQ-09] Follow-up notice:** Fail verification → `FollowUpNotice` with correct adapter-aware text.
- **[REQ-12] No command execution:** `grep -r "child_process\|\.exec(\|\.spawn(\|execFile\|eval(" server/` → no matches.
- **[REQ-13] Schema rejects command field:** Inject mock response with `command` on a `RecoveryStep` → server returns HTTP 502; UI shows error banner. *(This check covers structured field enforcement only; it does not test prose content.)*
- **[REQ-14] Needs-more-context:** Submit fewer than three words in mock mode → only summary card renders; no `rootCause`, steps, or verification visible.
- **[REQ-15] Schema validation:** Mock returns `{ "broken": true }` → HTTP 502; error banner shown.
- **[REQ-21] One follow-up only:** Complete one failed-verification re-diagnosis → no second re-diagnose button.
- **[REQ-25-M] Mock default:** Remove `.env` → `npm run dev` → app starts in mock mode; notice states no external service.
- **[REQ-25-R] Provider startup validation:** With `AI_PROVIDER=openai`, omit `AI_API_KEY` and `AI_MODEL` → server lists both and does not start. With `AI_PROVIDER=ollama`, no API key is required for a valid local model configuration. Live provider calls remain unverified until configured.
- **[REQ-31] No payload logging:** Run full session; inspect server stdout/stderr → no pasted text in any log line.
- **[REQ-33] Loopback binding:** `curl http://<LAN-IP>:3001/api/health` → connection refused.
- **[REQ-34] HTTPS enforcement:** `AI_PROVIDER=openai-compatible` with a remote `http:` URL → server refuses to start. Loopback HTTP is allowed for local compatible providers; Ollama is restricted to loopback.
- **[Vite proxy headers]** With both processes running, trigger a request from the browser through the proxy. In the Express request handler (via a temporary debug log), confirm the request arrives with `Origin: http://localhost:5173` and `Host: 127.0.0.1:3001`. The `Origin` value confirms the browser's origin was preserved; the `Host` value confirms `changeOrigin: true` rewrote it to the upstream target. Remove the temporary logging after verification. *(design §3.7)*
- **[strictPort]** With the app already running (Vite occupying `CLIENT_PORT`), attempt to start a second Vite instance with `npm run dev` or `cd client && npx vite`. Confirm the second instance exits immediately with a port-in-use error rather than starting on a different port. *(requirements §6, "Vite strictPort")*
- **[Origin — rejected]** `curl` with `-H "Origin: http://evil.example.com"` to `/api/health` → HTTP 403.
- **[No headers]** `curl` with no Origin or Host to `/api/health` → HTTP 403.

- **Done when:** All non-conditional checks pass. Conditional (real mode) checks recorded as "deferred — requires provider configuration" if not yet set up.

### Task 5.3 — Error handling review
- Test: empty input, input > 8,000 chars, server killed mid-request, mock adapter returning invalid JSON, `GET /api/config` returning an error.
- Each case: appropriate error state shown; user can retry or reload without data loss.
- **Done when:** All five cases handled correctly.

### Task 5.4 — README and `.env.example` finalisation
- Document in `README.md`:
  - Prerequisites: Node.js 20.19+ or 22.12+ (per the root `package.json` engine range).
  - **Mock mode:** `npm install` → `npm run dev` → open `http://localhost:5173`. Note: demonstrates UI and flow only; no real AI diagnosis.
  - **Provider setup:** Copy `.env.example` to `.env`; choose `AI_PROVIDER=openai|openai-compatible|anthropic|gemini|ollama`; set the model and provider-specific key/URL as documented there; then run `npm run dev`. The legacy value `real` aliases OpenAI-compatible.
  - Privacy: in real mode, pasted input, selected project excerpts, explicitly selected memory notes, and failed-verification results go to the configured provider; remove secrets before submitting; Phoenix does not control provider-side retention; the `.env` file persists on disk.
  - Security: server binds to `127.0.0.1`; origin checks prevent cross-origin requests; submit disabled until disclosure loads; API key is never sent to the browser; HTTPS required for non-loopback providers.
  - Port configuration: `CLIENT_PORT` and `PORT` in `.env` control both server listening and Vite's port; changing them requires no other edits.
- **Implementation present:** README and `.env.example` describe supported providers, privacy, appearance, offline, project and game tooling. Fresh-clone install and every real provider's external call remain separate verification tasks.

---

## Dependency order summary

```
1.1 → 1.2 → 1.3 → 1.4                                   (scaffold)

1.2, 1.3 → 2.1 → 2.2                                     (config validation + config endpoint)
1.2, 1.3 → 2.1 → 2.3 → 2.4 → 2.5 → 2.6                 (backend core)
                                     2.6 → 2.7            (provider connectors; live calls need configuration)

1.4 → 3.1 → 3.2, 3.3, 3.4, 3.5                          (session + base UI)
      3.4 → 3.6, 3.7, 3.8                                 (result panels)
      3.6 → 3.9 → 3.10                                    (verification + follow-up)

4.1 (after 1.4) → 4.2 (after all Phase 3)

2.2 + 2.6 + all Phase 3 + 4.2 → 5.1 → 5.2 → 5.3 → 5.4
```

- [ ] Maintain acceptance coverage for REQ-45–REQ-64, including Passport parsing, evidence, session state, packs, local demo/search, backgrounds, and Go/.NET metadata recognition.
