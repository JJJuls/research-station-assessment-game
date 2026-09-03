# Participant completion, export and survey handoff

**Status:** implemented in Pilot V3 Unit 2 as the recorded, **not-yet-authorised**
recommendations of `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md`
(§3.5 INT-1, §4.7 INT-2, §5 INT-5) plus the PS-0 return allow-list. Every
choice below is `PROVISIONAL(INT-n)` at its code site; the research owner
ratifies, amends or reverses each one on
`docs/decisions/RESEARCH-OWNER-RULING-FORM.md`. Nothing here is a research
variable, a scoring rule or an event-schema change.

## What happens when a participant finishes the shift

The terminal state is the Core Chamber's confirmed synchronisation
(`CoreChamberScene.finishRamp`). At that moment the runtime pipeline
(`ResearchRuntime.completeParticipantSession`) runs once:

1. **Status.** `session_status` becomes `completed` with
   `completion_reason = terminal_room_reached` (PROVISIONAL(INT-5)).
2. **Export.** The full session envelope is sent to the ingestion endpoint
   with bounded retry (3 attempts, 1 s / 2 s backoff, 15 s timeout each;
   network errors, timeouts and 5xx are retried, 4xx are not). The bytes are
   frozen on the first attempt, so every retry is byte-identical and the
   server answers duplicates with 200 instead of storing a second row. The
   device buffer is **not** cleared on acknowledgement (clearing would drop
   the sequence high-water mark, so a later page load of the same identity
   would restart numbering); count and age retention bound it instead.
3. **Survey handoff.** The launch-supplied `return_url` is validated
   (PROVISIONAL(INT-4), below). If it passes, the return URL is built from
   the summary variables plus the status axes and the page navigates to it
   automatically 20 s after the record settled (Option A), with a visible
   countdown. The notice also offers **CONTINUE TO SURVEY** for an
   immediate, participant-initiated handoff (Option D control); keyboard
   focus lands on it. If the URL is absent or refused, nothing navigates and
   the notice says so neutrally (Option D fallback). Closing the notice
   after the record settled withdraws the automatic navigation; the survey
   stays reachable by re-opening the notice from the Core.

A failed export never blocks the survey, but it is never auto-navigated past
either: the notice holds the "kept on this device" line and the participant
continues deliberately; the return URL then carries `export_status=failed`
and the events stay in the device buffer. The notice cannot be dismissed
while the data is still being sent (up to about a minute, with the attempt
number shown).

## What the participant sees

The SHIFT COMPLETE notice keeps its four closure lines and adds two dynamic
lines and, when applicable, one control:

| State                    | "Study data:" line                                                    | "Survey:" line                                              |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| sending                  | sending to the study server… (attempt n of 3)                         | preparing the handoff…                                      |
| acknowledged, URL ok     | received by the study server.                                         | opens automatically in N s — or use CONTINUE TO SURVEY now. |
| failed, URL ok           | could not be sent just now — it is kept on this device, not lost.     | ready — use CONTINUE TO SURVEY when you are ready.          |
| no endpoint / dev launch | kept on this device (no study server is configured for this session). | (as above, by URL state)                                    |
| URL absent               | (as above)                                                            | no survey link was provided for this session.               |
| URL refused              | (as above)                                                            | the survey link could not be used here.                     |
| navigating               | (as above)                                                            | opening now…                                                |

A third, state-dependent line says what to do next (stay on the page while
sending; nothing else is needed; mention the unsent data to the researcher;
keep the window open and tell the researcher).

No score, item, validity or trait language appears; the closure spec's
forbidden-text bar applies to every line.

## Return-URL policy (PROVISIONAL(INT-4) / PS-0)

Navigation is permitted only to an `https:` URL whose host equals, or is a
subdomain of, an allow-listed host. Default list: `qualtrics.com`. Override
at build time with `VITE_RETURN_URL_ALLOWED_HOSTS` (comma-separated; `*.` and
leading `.` are accepted and ignored). URLs with embedded credentials,
`http:` (except DEV-build localhost), `javascript:` or an unparseable form
are refused with a recorded reason (`absent`, `unparseable`,
`scheme_not_allowed`, `host_not_allowed`, `credentials_present`). DEV builds
additionally accept `http://localhost` / `127.0.0.1` so browser tests can
observe the navigation.

## What the return URL carries

The launch-supplied `return_url` with its own query intact, plus every
`GameSummaryVariables` field (unchanged since the V1 slice; includes
`participant_id`, `game_session_id`, `completed`, `elapsed_seconds` and the
separated persistence/organisation/… summary counts) and the
PROVISIONAL(INT-5) axes:

| Parameter           | Values                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `launch_mode`       | `production` / `test` / `development`                                                                                               |
| `session_status`    | `completed` (the pipeline only runs at the terminal state)                                                                          |
| `completion_reason` | `terminal_room_reached`                                                                                                             |
| `export_status`     | `acknowledged` / `failed` / `not_applicable`                                                                                        |
| `return_status`     | `returned`                                                                                                                          |
| `export_id`         | the acknowledged (or attempted) export id, or empty                                                                                 |
| `export_refusal`    | why nothing was sent, when nothing was (`launch_mode_not_allowed`, `missing_configuration`, `missing_session_identity`), else empty |
| `page_load_index`   | 1 for a single page load; higher after a reload                                                                                     |

`page_load_index` is the provisional answer to review finding OD-1 (a reloaded
session is distinguishable in the survey record). Identity minimisation of
the return URL (PS-4) remains open: the summary fields are the V1 set.

## Launch modes (PROVISIONAL(INT-5) / PS-2)

| Launch URL `launch_mode` | DEV build (`vite`)                                          | Participant bundle (`CI=true npm run bundle`) |
| ------------------------ | ----------------------------------------------------------- | --------------------------------------------- |
| `test`                   | exports (test row), navigates                               | exports (test row), navigates                 |
| `production`             | refuses to export unless a DEV test hook opts in; navigates | exports (production row), navigates           |
| absent / other           | `development`: never exports; navigates                     | `production`: exports, navigates              |

The raw launch value is kept in the runtime's status probe for audit; a typo
therefore shows up rather than silently becoming production data. Test and
production rows share one table and one idempotency rule, separated by the
`launch_mode` column and the status columns (migration
`20260904120000_allow_production_launch_mode.sql`).

## Early exit (PROVISIONAL(INT-5) `incomplete`)

If the page is hidden before the terminal state (tab closed, navigated away,
browser closed), a keep-alive export labelled `incomplete` /
`participant_exit` is sent. The label rides on that envelope only: the
session's own status is never moved by a page hide, so a backgrounded or
back/forward-cache-restored tab can still complete normally (pages restored
from the cache are not treated as exits at all). Browsers cap keep-alive
bodies at 64 KiB, so when the envelope would exceed 60 KB the prior-page-load
events are dropped and only the most recent current-page-load events that
fit are kept, with `payload.raw_events_omitted = true` and
`raw_events_omitted_count` set explicitly; the full log remains in the device
buffer and is carried as `prior_page_load_events` by any later export of the
same identity. Nothing is ever retried from a hidden page. A session can
therefore produce more than one row (an `incomplete` keep-alive and a later
`completed` export); the precedence rule for analysis is an open decision
(see below).

The developer console completion (`window.researchRuntime.completeDebugSession()`)
freezes its own envelope family, so using it in a session that later
completes the shift produces two rows rather than a stale duplicate.

## Configuration

| Variable                        | Purpose                                             |
| ------------------------------- | --------------------------------------------------- |
| `VITE_RESEARCH_INGEST_URL`      | ingestion endpoint (Supabase Edge Function URL)     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key sent as the `apikey` header         |
| `VITE_RETURN_URL_ALLOWED_HOSTS` | allow-listed survey hosts (default `qualtrics.com`) |

All three are inlined at build time from `.env.local` (never tracked). A
participant bundle built without the first two exports nothing and reports
`export_status=not_applicable`; the survey handoff still works.

## Verifying the handoff

- **Local (automated):** `e2e/participant_completion_handoff.spec.ts` — 6
  pure tests (axes, export permission, return policy) and 7 browser tests
  that drive the real Core synchronisation against a mocked ingestion
  endpoint and a same-origin mock survey page.
- **Live test against a real survey:** launch a `launch_mode=test` session
  from Qualtrics with `return_url` set to the survey's own
  `https://….qualtrics.com/…` continuation URL (embedded-data fields for the
  parameters above). Complete the shift. Expect the survey to resume with
  `session_status=completed` and, when an ingestion endpoint is configured,
  `export_status=acknowledged` and a `test` row in
  `research_session_exports`. No participant data is involved; the row is
  filterable by `launch_mode = 'test'`.
- **Isolated ingestion round-trip:** see
  `docs/verification/professional-pilot-v3/SUPABASE-ROUNDTRIP.md`.

## Open decisions (recorded, not resolved)

INT-1 (mechanism, standalone launch assumed — an iframe launch needs Option
B/C; the 20 s delay and the no-auto-navigation-after-failure rule are
implementation parameters), INT-2 (channel; buffer flush without
completion), INT-2.5 (per-page-load export identity), INT-4 (allow-list
contents), INT-5 (axis names and values; no `abandoned`; `export_status =
not_applicable` is a proposed extension outside the pack's set; the
early-exit rule and the precedence rule between an `incomplete` and a later
`completed` row are gaps the pack does not cover), PS-4 (return-URL identity
minimisation; `export_id` on the URL is a join key), OD-1 (page-load marker
on the return URL), the meaning of `completed` in the export (status-derived
rather than event-derived — the participant pipeline logs no
`objective_completed`), plus the U1 items in the V3 report §1.7.
