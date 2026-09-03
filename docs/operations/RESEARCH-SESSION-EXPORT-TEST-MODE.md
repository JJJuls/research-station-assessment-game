# Research-session export — test mode and participant mode

Research-owner / operations reference for the client-to-Supabase export path.
Audience: whoever runs synthetic verification sessions or reviews what the
export can and cannot do. The participant completion pipeline that now sits on
top of this path is described in `docs/operations/QUALTRICS-HANDOFF.md`.

## What this path is

- **Who may submit (PROVISIONAL INT-5 / PS-2, Pilot V3 Unit 2).** A session
  exports only when its resolved launch mode allows it: `launch_mode=test`
  always (DEV build or participant bundle, stored as a test row);
  `production` (an explicit `launch_mode=production`, or any bundle launch
  without the parameter) only from a participant bundle — a DEV build refuses
  it unless a browser-test hook opts in; a DEV build without the parameter is
  `development` and never exports. Both environment variables below must be
  configured; otherwise the client refuses before a single byte leaves the
  browser.
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
- **Participant submission (Pilot V3 Unit 2).** A participant bundle exports
  at the shift's terminal state through `completeParticipantSession()` with
  bounded retry, then hands off to the survey; see the handoff document. The
  developer console path (`completeDebugSession()`) still previews the return
  URL and exports once without retry. No real participant data has been
  submitted through this path in this repository's history.
- **Status axes in the envelope (PROVISIONAL INT-5).** Every envelope carries
  `launch_mode`, `session_status`, `completion_reason`, `export_sequence` and
  `page_load_index` beside the identity fields; the Edge Function projects
  the first four into indexed columns.

## Lossless collection (Pilot V3 Unit 1)

All of this is PROVISIONAL(INT-2 / P0-3 / P1-9): the payload additions and the
persistence mechanism are recorded for the research owner's event-schema and
P0-3 rulings and can be renamed or reversed without touching raw events.

- **Every raw event is numbered.** `EventLogger` stamps each event with a
  per-identity monotonic `sequence` and the page load that produced it
  (`page_load_index`). Callers cannot set either field. These are integrity
  metadata, never measurement variables — `page_load_index` is deliberately
  not named like the canonical task-attempt field `attempt_number`.
- **Durable mirror on the device.** Each event is also written synchronously
  into a chunked `localStorage` store keyed by launch-mode class and identity
  (`src/systems/EventStore.ts`, prefix `research-events:v1:<mode>:…`). A
  reload, closed tab or renderer crash therefore loses nothing that was
  logged **on the device**; whether it reaches the dataset still depends on a
  later export (see "Known limitations"). Appends rewrite only the tail chunk
  (100 events), so the cost per event is bounded.
- **Test and participant buffers never mix.** A `launch_mode=test` dry run
  and a participant launch of the same identity use different keys, so a
  dry run's events can never surface in a participant export.
- **Recovered records are identity-checked.** On open, stored records whose
  own `participant_id` / `game_session_id` do not match the launch identity
  are rejected and counted (`foreign_records_rejected`), so a reused link on
  a shared device cannot attach one person's events to another's export.
- **Prior page loads are carried separately.** When the same identity loads
  again, the earlier page load's events are recovered and exported as
  `payload.prior_page_load_events`; `payload.raw_events` remains the current
  page load's log, which is what the summary is computed from — a restart is
  visible to the analyst and never double-counted. Note that
  `elapsed_seconds` restarts at 0 on every page load; only `timestamp_ms`
  is comparable across page loads.
- **One export per page load.** The frozen export envelope is scoped to a
  page load: a retry resends identical bytes (200 duplicate); a reload of the
  same identity submits a new export with a new `export_id` that carries the
  earlier events as `prior_page_load_events`.
- **Integrity block.** `payload.event_integrity` reports `page_load_index`,
  `first_sequence` / `last_sequence`, `event_count`,
  `prior_page_load_event_count`, `expected_event_count` (= `last_sequence`),
  `sequence_gap_count` (leading gap included), `sequence_duplicate_count`, the
  durable store's health (`durable`, `memory_only`, `degraded`),
  `durable_event_count`, `recovered_from_chunks`, `foreign_records_rejected`
  and `store_evictions`. A lossless export has zero gaps, zero duplicates,
  zero rejections and current + prior counts equal to `expected_event_count`.
- **Storage unavailable.** If `localStorage` is absent, blocked or throws, the
  in-memory log runs unchanged and the export reports
  `durable_store: "memory_only"`; a quota failure mid-session evicts other
  retained identities once (counted in `store_evictions`), retries, and
  otherwise reports `degraded`.
- **Retention and cleanup.** The device keeps at most the eight most recent
  identities and removes any identity untouched for 30 days at the next
  launch. Acknowledged buffers are cleared by the completion pipeline
  (Unit 2). Manual cleanup on a shared device: clear the site's storage in
  the browser (Settings → Privacy → site data for the game's origin) between
  participants; the governance checklist row 2.6 no longer holds
  automatically.
- Runtime probe (DEV only): `window.researchRuntime.getEventIntegrity()`.

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
| `launch_mode` outside {`test`, `production`} reaching the server      | HTTP 403 → `failed` / `forbidden` (client refuses first)      |
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
- **INT-5**: the client reads `launch_mode` from the URL; `test` and
  `production` are the two accepted values, anything else resolves by build
  type and is kept verbatim in the status probe for audit. This does not
  resolve the open INT-5 vocabulary decision; the research owner should
  explicitly ratify (or rename) the values when ruling on INT-5.

- `sessionStorage` unavailable (rare; e.g. fully blocked storage): the
  envelope is kept in memory instead, so idempotency holds within the page
  lifetime only; a reload would create a new `export_id` (a new row, never a
  conflict).
- Retries are manual (`submitSessionExport()`); there is no automatic
  background retry/backoff in this unit.
- The participant pipeline (Pilot V3 Unit 2) integrates this export with
  completion and the survey handoff provisionally; the research-owner rulings
  INT-1/INT-2/INT-5 remain open and are recorded in the V3 report.
- A live synthetic round-trip against the development endpoint requires
  `.env.local` credentials on the verifying machine (see procedure above);
  automated tests never call the live endpoint.
