# Research-session export — test mode (development ingestion unit)

Research-owner / operations reference for the **test-only** client-to-Supabase
export path. Audience: whoever runs synthetic verification sessions or reviews
what this unit can and cannot do.

## What this unit is

- **Test-only submission.** The game submits a completed session to the
  development Supabase Edge Function (`ingest-research-session`) **only** when
  all three are true: it is a development build (`import.meta.env.DEV`), the
  session was launched with `launch_mode=test` in the URL, and both
  environment variables below are configured. Anything else refuses before a
  single byte leaves the browser.
- **Raw plus summary export.** One envelope carries the untouched raw event
  log (`EventLogger`), the derived summary (`ScoringManager`), data-quality
  metrics (`DataQualityTracker`), the technical-error count (count only — the
  existing capture stores no error content by design), and the
  (`game_version`, `asset_set_version`) provenance pair. Raw events, process
  variables and summary variables stay distinguishable; nothing is merged
  into a single score.
- **Stable idempotency identifier.** The first time a session identity
  (`participant_id`, `game_session_id`) submits, the client generates one
  UUID `export_id`, freezes the fully-serialised envelope in
  `sessionStorage`, and every retry resends those exact bytes. First storage
  acknowledges with HTTP 201; identical retries acknowledge with HTTP 200
  (`duplicate: true`); the server never stores a second row for an identical
  retry. An `export_id` is never reused for different payload bytes, so a
  409 content conflict cannot arise from this client.
- **Transport status is not data quality.** The exporter returns a typed
  transport result (`acknowledged` / `refused` / `failed` with a reason).
  That result is debugging information only: it is never written into the
  raw event log, the summary, or any research variable. The INT-5
  `export_status` vocabulary remains an open research-owner decision.
- **No participant submission.** Participant sessions (any launch without
  `launch_mode=test`) complete exactly as before and never call the
  transport. Production builds refuse unconditionally. No real participant
  data has been submitted through this path.
- **No Qualtrics redirect.** Completion still only _previews_ the return
  URL in the developer console. Nothing in this unit navigates.

## Required environment variables

Copy `.env.example` into an untracked `.env.local` (gitignored) and fill in:

| Variable                        | Value                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `VITE_RESEARCH_INGEST_URL`      | `https://<project-ref>.supabase.co/functions/v1/ingest-research-session` (development project) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The development project's publishable (client) API key                                         |

Never put real values in tracked files. The key is sent only as the `apikey`
request header and is never logged, stored, or echoed into results.

## Local synthetic verification procedure

1. Ensure `.env.local` is configured (above) and start the dev server
   (`npm.cmd run start`).
2. Open the game with a **fresh synthetic identity**, e.g.
   `http://localhost:5173/?participant_id=AUTO-TEST-<date>&game_session_id=AUTO-TEST-<date>-S1&condition=test&launch_mode=test`.
3. Play any amount (optional), then in the browser console run
   `window.researchRuntime.completeDebugSession()` — the export fires
   automatically and logs a `[research-export]` result line.
4. Expect `status: "acknowledged"`, `duplicate: false`, `http_status: 201`.
5. Retry with `await window.researchRuntime.submitSessionExport()` — expect
   `duplicate: true`, `http_status: 200`, same `export_id`.
6. Inspect the last result any time with
   `window.researchRuntime.getLastExportResult()`.

## Retry and conflict behaviour

| Situation                                                             | Result                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| First submission of a session                                         | HTTP 201, `acknowledged`, `duplicate: false`                  |
| Any retry (same tab, incl. after reload)                              | HTTP 200, `acknowledged`, `duplicate: true`, same `export_id` |
| Same `export_id` with different bytes (not producible by this client) | HTTP 409 → `failed` / `export_id_conflict`                    |
| Wrong/missing key                                                     | HTTP 401 → `failed` / `unauthorized`                          |
| `launch_mode` ≠ `test` reaching the server                            | HTTP 403 → `failed` / `forbidden` (client refuses first)      |
| No response within 15 s                                               | `failed` / `timeout` (request aborted)                        |
| Offline / DNS failure                                                 | `failed` / `network_error`                                    |
| Non-JSON or unexpected server body                                    | `failed` / `malformed_response`                               |
| Env vars missing                                                      | `refused` / `missing_configuration`, nothing sent             |

Note: a retry acknowledgement always refers to the **frozen first
submission**. If you replay the game with the _same_ participant/session
identity in the same tab, the original envelope is resent and acknowledged
`duplicate: true` — the replayed run's events are **not** stored. Always use
a fresh synthetic `game_session_id` per verification run.

## Known limitations and next step

- **Bundling hygiene**: Vite inlines any `VITE_*` value present at build
  time. Before producing the participant artifact (`CI=true npm run
bundle`), make sure `.env.local` is absent (or contains no ingest values)
  on the bundling machine, so the publishable key never ships in the
  participant bundle — the DEV gate already prevents its _use_, this keeps
  the string out entirely.
- **INT-5**: the client reads `launch_mode` from the URL and acts only on
  the literal value `test`. This does not resolve the open INT-5 vocabulary
  decision; the research owner should explicitly ratify (or rename) `test`
  when ruling on INT-5.

- `sessionStorage` unavailable (rare; e.g. fully blocked storage): the
  envelope is kept in memory instead, so idempotency holds within the page
  lifetime only; a reload would create a new `export_id` (a new row, never a
  conflict).
- Retries are manual (`submitSessionExport()`); there is no automatic
  background retry/backoff in this unit.
- The export is not integrated with participant completion, by design. The
  remaining next step for a pilot-ready pipeline is a research-owner-approved
  participant-mode ingestion decision (endpoint, launch-mode vocabulary
  INT-5, retry policy) plus the separate Qualtrics-return unit — neither is
  implemented here.
- A live synthetic round-trip against the development endpoint requires
  `.env.local` credentials on the verifying machine (see procedure above);
  automated tests never call the live endpoint.
