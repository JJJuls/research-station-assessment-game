# Qualtrics End-to-End Integration Contract

Authoritative description of the complete research deployment flow for the
Remote Outpost Assessment game:

```
Qualtrics survey → game launch URL → query-parameter parsing →
participant/session init → condition assignment → gameplay state & events →
score derivation → completion payload → event & score export →
return to Qualtrics → downstream Qualtrics dataset
```

- **Repository checkpoint at authoring**: branch `fable-autonomous-game-build-v1`,
  HEAD `0c3529c` (pre-audit), clean tree.
- **Governing contracts**: `docs/ai/fable-claude-final-game-build-contract-v3.txt`
  (V3) §3 (systems), §6 (scoring), §9 (testing); `docs/research/event-schema.md`;
  `docs/research/scoring-plan.md`; `docs/expansion/reviews/WAVE1-USER-DECISION-BRIEF.md`
  (D1–D8).
- This document is **descriptive of current behaviour + the required target**.
  It does **not** decide any open scientific question and does not change any
  scientific invariant. Every section is labelled with one of:
  **[IMPLEMENTED+VERIFIED]**, **[IMPLEMENTED/UNVERIFIED]**, **[CONTRACT ONLY]**,
  **[MISSING]**, **[BLOCKED — USER DECISION]**.

> **Single most important finding.** The end-to-end return/export half of the
> pipeline exists **only on the dev/debug path** (`window.researchRuntime`,
> installed under `import.meta.env.DEV`). A production (`vite build` / `PROD`)
> artifact never installs that API, has no code that navigates to `return_url`,
> and never exports raw events. In production **as built today, no summary
> variables reach Qualtrics and no events leave the browser.** This is a
> known, decision-gated gap (V3 Beat 14 "Qualtrics return preview", backlog
> item #6, gated behind Beat-13/D2) — not an undiscovered regression — but it
> is the P0 deployment blocker.

---

## 1. Scope

In scope: launch-parameter parsing, participant/session identity, condition
read-through, `SessionState`/`EventLogger`/`DataQualityTracker`/`ScoringManager`/
`QualtricsBridge`/`ResearchRuntime`, the `window.researchRuntime` debug API, the
completion/return payload, and the production vs. dev build surface.

Out of scope (unchanged by this audit): per-room mini-game mechanics, stimulus
wording, scoring formula weights, Q01–Q33 construct mappings, and every open
D2–D8 decision. Those are referenced, never altered.

## 2. Authoritative terminology

| Term                | Meaning                                                                                           | Source of truth                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `participant_id`    | Pseudonymous participant key, assigned by Qualtrics                                               | launch URL → `SessionState.metadata.participant_id`                                   |
| `game_session_id`   | Per-attempt session key, assigned by Qualtrics; mirrored into the legacy `session_id` event field | launch URL → `SessionState`, `RawGameEvent.session_id`                                |
| `condition`         | Experimental arm; **assigned by Qualtrics, only read by the game**                                | launch URL → `SessionState`                                                           |
| `return_url`        | URL to send the participant back to Qualtrics, with summary vars appended                         | launch URL → `QualtricsBridge`                                                        |
| `game_version`      | Build/version stamp; falls back to `VITE_APP_VERSION`                                             | launch URL / `.env` → `SessionState`                                                  |
| `asset_set_version` | Frozen-stimulus id (`outpost-assets-v1`)                                                          | `src/constants/assets.ts:9` (console banner only — **not** in event/summary payloads) |
| Raw event           | Append-only behavioural record                                                                    | `EventLogger.events[]` (`src/systems/EventLogger.ts`)                                 |
| Summary variable    | Derived, additive score view for Qualtrics embedded data                                          | `GameSummaryVariables` (`src/systems/ScoringManager.ts`)                              |

## 3. Current architecture

- `src/index.ts` constructs the singleton `researchRuntime` (`src/systems/ResearchRuntime.ts`),
  calls `researchRuntime.start()` once, then boots Phaser with **all** registered
  scenes; the start scene is resolved by `?scene=` (`src/world/SceneRouter.ts`),
  default **Dock** (the connected modular world). `?scene=prototype` routes to the
  legacy monolith `src/scenes/Main.tsx`, which is **not** the participant path.
- The live participant path is the modular `*Scene.ts` graph
  (`DockScene`→`HubScene`→ station scenes → `FinalCoreScene`), all built on
  `src/world/RoomScene.ts`, all logging through the same `researchRuntime`.
- `researchRuntime` owns four subsystems: `SessionState`, `EventLogger`,
  `DataQualityTracker`, `QualtricsBridge`. Scoring is a pure function
  (`ScoringManager.computeSummary`) invoked on demand, never mutating events.

**Status: [IMPLEMENTED+VERIFIED]** for the launch→gameplay→event→in-memory-score
half; **[MISSING]** for the completion→return→export half in production.

---

## 4. Launch contract — [IMPLEMENTED+VERIFIED] (dev), [PARTIAL] (prod HTML shell)

The game is launched by navigating the participant's browser to the hosted game
URL with query parameters. The game reads `window.location.search` at construction
time (`SessionState`, `QualtricsBridge` both call `new URLSearchParams(window.location.search)`).

Expected launch URL shape (Qualtrics-side, illustrative — **not** a new invented
contract):

```
https://<host>/<base>/?participant_id=${e://Field/ResponseID or PID}
                       &game_session_id=<session key>
                       &condition=<arm>
                       &return_url=<encoded Qualtrics continue URL>
                       &game_version=<optional>
```

- `?scene=<alias>` is an additional, non-Qualtrics dev/routing parameter
  (`SceneRouter.SCENE_PARAM_TO_KEY`); unknown/absent → Dock.
- The **production HTML shell** (`index.html`) is still the upstream template:
  stale `<title>Phaser RPG | remarkablegames`, template `<meta description>`, an
  external `unpkg.com/github-corners` script and a GitHub ribbon to
  `remarkablegames/phaser-rpg`, and inert `gtag` scaffolding — see §17/§19.

## 5. Parameter contract — [IMPLEMENTED+VERIFIED]

`QualtricsBridge` (`src/systems/QualtricsBridge.ts:14-22`) parses the five V3 §3.4
params verbatim: `participant_id`, `game_session_id`, `condition`, `return_url`,
`game_version`. `SessionState` (`src/systems/SessionState.ts:44-55`) independently
parses `participant_id`, `game_session_id`, `condition`, `game_version` for the
session metadata that stamps every event.

Verified edge behaviour (frozen by `e2e/adversarial_hostile_launch.spec.ts`):

| Input                                         | Behaviour                                                                                  | Class                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------- |
| Duplicate `participant_id=A&participant_id=B` | First value wins (`URLSearchParams.get`)                                                   | Correct-by-design                                                                    |
| Oversized / URL-encoded values                | Pass through verbatim, no truncation                                                       | Correct-by-design                                                                    |
| **Empty string** `?participant_id=`           | Yields `''` — `?? fallback` guards only null/undefined, so **no** fallback id is generated | **[BLOCKED — USER DECISION]** (P0/P1, see audit §7)                                  |
| Missing param                                 | `SessionState` substitutes `createFallbackId('participant'                                 | 'session')`; `condition`→`'default'`; `game_version`→`VITE_APP_VERSION ?? 'unknown'` | Correct-by-design |

No allowed-value validation exists for `condition` (any string is accepted). No
truncation/length ceiling exists anywhere.

## 6. Participant / session identity contract — [IMPLEMENTED+VERIFIED] with one open decision

- Identity is captured once at construction and is **immutable** for the session
  (`SessionState.metadata`, returned only via defensive copy `getMetadata()`).
- Every event carries `participant_id`, `game_session_id`, `condition`,
  `game_version` via `ResearchRuntime.buildContextFields`
  (`src/systems/ResearchRuntime.ts:123-131`); these context fields are spread
  **last** so a caller can never override them (`logInteraction`, line 98-104).
- The legacy `session_id` field mirrors `game_session_id`
  (`ResearchRuntime.ts:48,62,101,168`), verified by
  `e2e/launch_with_research_params.spec.ts:34`.
- Cross-session isolation (two participants, same browser context, no bleed) is
  verified: `e2e/adversarial_session_isolation.spec.ts` (ADV-1).
- **Open decision**: empty-string identities (§5). Intended handling
  (fall back / reject / flag) is **user-owned** (recorded in
  `FABLE-SPRINT-B-PART1-HANDOFF.md`).

## 7. Condition-assignment contract — [IMPLEMENTED+VERIFIED]

The game performs **no** randomisation or condition assignment. `condition` is
read from the launch URL and only ever stamped onto events/summary. Assignment,
balancing, and validity of the arm value are entirely Qualtrics-side. Absent
`condition` → `'default'`. This delegation is correct and must be preserved.

## 8. Runtime-state contract — [IMPLEMENTED+VERIFIED]

`SessionState.missionState` holds all twelve V3 §3.1 fields
(`SessionState.ts:15-28`): `current_room_id`, `completed_rooms`,
`active_objectives`, `unresolved_objectives`, `accepted_duties`,
`skipped_duties`, `prepared_items`, `workspace_status`, `hazard_status`,
`side_repair_status`, `interruption_status`, `final_core_status`. Writers are the
room scenes (verified by the per-room `*_logging.spec.ts` suite and ADV-5 status
board). Reads are defensive copies (`getMissionState`). `completed_rooms` uses
`addUnique` (one-shot semantics for room completion); `final_core` completion has
an explicit one-shot guard (`FinalCoreScene.markFinalCoreCompleted`).

Documented non-defects (do **not** "fix"): `unresolved_objectives` has no live
writer; `hazard_status` has no reader; Hazard board line stays `pending`
(no `markRoomCompleted` for that room — a D1 consequence). Source:
`POST-FABLE-MASTER-HANDOFF.md §6`.

## 9. Persistence contract — [MISSING] (in-memory only)

**There is no `localStorage`, `sessionStorage`, IndexedDB, cookie, or server
persistence anywhere in `src/`** (verified: zero matches). `SessionState`,
`EventLogger`, and `DataQualityTracker` are pure in-memory singletons.

Consequences:

- A reload / refresh / tab-crash **loses all accumulated events and mission
  state**. On reload, the game re-initialises from the URL (same identities if
  params are still in the URL, but an **empty** event log and default mission
  state; new fallback ids if params were absent).
- No session recovery, no resume, no abandoned-session capture.
- Reload semantics are documented as by-design in
  `docs/architecture/STATE-AND-SESSION-CONTINUITY.md` and frozen by
  `e2e/adversarial_reload_partial_state.spec.ts` (ADV-2).

Whether single-session-no-recovery is acceptable for the study is a
**[BLOCKED — USER DECISION]**; if unsupervised participants may reload, this is a
P0 data-loss risk (audit §7).

## 10. Event contract — [IMPLEMENTED+VERIFIED] payload; [PARTIAL] integrity guarantees

`RawGameEvent` (`EventLogger.ts:1-32`) carries the full V3 §3.2 payload
(participant/session/condition/version context + `room_id`, `task_id`,
`study_item_ids`, `construct_id`, `event_type`, `object_id`, `choice_value`,
`attempt_number`, `previous_state`/`new_state`, `success`, `x`, `y`, `metadata`)
plus retained legacy prototype fields during the migration period. Canonical
context (`study_item_ids`/`construct_id`) is attached from
`src/world/CanonicalEventContext.ts`.

- **Append-only**: `EventLogger.log` only `push`es; `getEvents`/`toJSON` copy out
  (deep-copy of `metadata`/`study_item_ids`/`score_delta`); no path removes or
  edits an event except the whole-log `clear()` (used only between test
  participants). Verified additive-on-complete by
  `launch_with_research_params.spec.ts:103-105`.
- **Ordering**: guaranteed only by array push order + `timestamp_ms` (millisecond
  granularity). **There is no monotonic sequence number.** Under rapid input,
  ties in `timestamp_ms` are possible; order then rests on push order only.
  ADV-7 verified monotonic (non-decreasing) timestamps; the append-only invariant
  harness (ADV-9) is **planned, not implemented** (P2).
- **Duplicate events**: not deduplicated at the logger. One-shot behaviour is
  per-room (`addUnique`, completion guards). Repeatable station prompts re-log
  completion events on re-selection (documented raw-log behaviour; whether repeat
  completions are summary-scored differently is Beat-13/D2 territory).

## 11. Scoring-data contract — [IMPLEMENTED+VERIFIED] (raw/summary separation), [BLOCKED] (Beat-13)

- `computeSummary` (`ScoringManager.ts:75-224`) is a **pure derivation**: it reads
  `metadata`, `elapsed_seconds`, `completed`, a read-only `events` slice, and
  `data_quality`, and returns `GameSummaryVariables`. **No path mutates or
  discards the raw event list** — the skill's primary invariant holds.
- Subindices are separated per V3 §6 (`game_difficulty_persistence`,
  `game_uncertainty_persistence`, `game_inappropriate_persistence`,
  `failure_adaptation_index`, responsibility/organization/productiveness/
  consistency/control/final-core families). No single global "good player" score
  exists.
- Hazard D1 ruling is honoured on the live path: `HazardScene` emits **both**
  legacy `hazard_avoidance` **and** canonical `hazard_route_avoided`
  (`study_item_ids: []`, no construct) on the avoid branch
  (`HazardScene.ts:193`, `CanonicalEventContext.ts:233`). `abandonment_count`
  derives from `hazard_avoidance` only (`ScoringManager.ts:88`) — preserved
  verbatim.
- **[BLOCKED — USER DECISION]**: Beat-13 bundle (D2) is deferred by instruction —
  `strategy_revision_count` prudence-mixing, the `game_inappropriate_persistence`
  4th term (`final_core_force_continue`), `final_quality_score` shape, and the
  exploratory-label mechanism are unresolved. Until D2, `final_core_force_continue`
  is logged raw but summed into **no** summary variable.
- Exploratory proxies (Goal-Time, Consistency of Interest) are **not** yet
  labelled `_exploratory` in the surfaced output — that labelling is D2 sub-item 4.

## 12. Completion contract — [MISSING] in production / [IMPLEMENTED+VERIFIED] on debug path

- The only completion routine is `ResearchRuntime.completeDebugSession`
  (`ResearchRuntime.ts:163-187`): it logs `objective_completed`, computes the
  final summary (`getSummary(true)`), builds the return URL, and console-logs
  both. It is installed **only** on `window.researchRuntime`, **only** under
  `import.meta.env.DEV` (`installDeveloperHelper`, line 189-208).
- `FinalCoreScene` (the terminal room) marks `final_core_room` completed and sets
  `final_core_status` in `SessionState` (`FinalCoreScene.ts:326-327`) but triggers
  **no** completion payload, return, or export.
- Therefore, in a production build, **there is no completion trigger at all** —
  no summary is finalised, no return URL is built, nothing is exported.
- **[BLOCKED — USER DECISION]** on mechanism: V3 §3.4 requires the game to
  "prepare/preview summary variables for Qualtrics **without overwriting raw
  logs**" and §3.3 frames `completeDebugSession()` as a dev/debug facility. The
  production completion trigger and return mechanism (auto-redirect vs. explicit
  "return to survey" button vs. Qualtrics polling embedded data) is **not yet
  specified** and is user-owned. This is V3 Beat 14, gated on Beat-13/D2.

## 13. Qualtrics return contract — [CONTRACT ONLY] / [IMPLEMENTED+VERIFIED] (dev preview)

`QualtricsBridge.buildReturnUrl(summary)` (`QualtricsBridge.ts:28-46`):

- Returns `null` when `return_url` is null/empty/whitespace-only (trim check).
- Resolves `return_url` against the current href (`new URL(return_url, href)`),
  so **relative** return URLs resolve to the app origin.
- Appends **every** `GameSummaryVariables` key as a query param (`String(value)`)
  onto the return URL, preserving the URL's existing query params.
- Returns `null` on an unparseable URL (try/catch).

Embedded-data field names shipped to Qualtrics = the exact `GameSummaryVariables`
keys (`ScoringManager.ts:5-65`): identity (`participant_id`, `game_session_id`,
`condition`, `game_version`), `completed`, `elapsed_seconds`, the three
`data_quality_*` covariates, and the full subindex set. **The downstream Qualtrics
survey must define embedded-data fields with these exact names.**

Frozen edge behaviour (ADV-6): non-`http(s)` schemes (e.g. `javascript:`) parse
and are returned with the summary appended — `buildReturnUrl` does **not** enforce
`http(s)`. Whether it should is **[BLOCKED — USER DECISION]** (protected module).

Gaps vs. a complete return contract:

- **No production code navigates to the returned URL** (§12) — [MISSING].
- No completion-status taxonomy beyond `completed: boolean` — Qualtrics cannot
  distinguish _incomplete_ vs. _failed_ vs. _test_ (a participant who quits
  never returns at all). [MISSING].
- No payload-size guard: appending ~60 summary vars is small, but there is no
  ceiling and no fallback if a return URL approaches browser/Qualtrics length
  limits. [CONTRACT ONLY].

## 14. Downstream Qualtrics dataset contract — [BLOCKED / MISSING]

- The dataset would receive **only** the ~60 summary variables (via return-URL
  embedded data), **once the production return path exists**. Raw events are
  **never** transmitted in any build (no server sink; `exportEventsJSON()` is
  dev-only).
- **Scores are therefore not reproducible from exported data** in the current
  design, because the raw events the scores derive from never reach the dataset.
  Whether raw-event export is required — and by what channel (server POST,
  file upload, Qualtrics file field, or "summaries only by design") — is a
  **[BLOCKED — USER DECISION]** and a P0 research-validity item (audit §7).
- Codebook alignment: `GameSummaryVariables` keys must be mapped 1:1 into the
  Qualtrics codebook/embedded-data fields; no such mapping document exists yet.
  [MISSING].

## 15. Versioning contract — [PARTIAL]

- `game_version`: launch param → `VITE_APP_VERSION` → `'unknown'`; carried on
  every event and in the summary. [IMPLEMENTED+VERIFIED].
- `asset_set_version` (`outpost-assets-v1`): present **only** in the Phaser
  console banner (`index.ts:20`), **not** in any event payload or summary
  variable. Per-record stimulus provenance is therefore **not exportable**.
  [MISSING] (adding a payload field touches the frozen event schema → requires
  authorisation; audit §7).
- Scoring-version stamp: pending the stimulus-freeze checklist item 4 / Beat-13.
  [BLOCKED].

## 16. Failure and recovery contract — [MISSING]

- Return failures: `buildReturnUrl` returns `null` on unparseable/absent
  `return_url`; there is **no** participant-visible fallback, retry, or
  "your data may not have saved" messaging, because there is no production return
  path to fail in the first place.
- No duplicate-return guard (moot until a production return exists).
- Reload/crash recovery: none (§9).
- Technical errors: `DataQualityTracker.recordTechnicalError()` exists and feeds
  `data_quality_technical_error_count`, but there is no global error boundary
  wiring it to uncaught exceptions in the audited files.

## 17. Privacy / data-minimisation — [PARTIAL / ISSUES]

- **Identifiers are pseudonymous** (`participant_id`, `game_session_id` from
  Qualtrics); no name/email/PII is collected by the game. Good.
- `return_url` and identities travel in the URL query string (browser history,
  referrer, server logs of the host). Standard for this pattern but worth noting
  for the host's logging posture.
- **External network dependency in the default build**: the `vite build` artifact
  ships `unpkg.com/github-corners` (an external request from the participant's
  browser) and a GitHub ribbon to `remarkablegames/phaser-rpg`
  (`index.html:22-39`, verified in `dist/index.html`). Only `npm run bundle`
  (`BUNDLE=true`) strips it. Privacy + professionalism issue (audit §7/§8).
- **Inert `gtag` scaffolding** (`index.html:46-53`) with an empty
  `VITE_GOOGLE_ANALYTICS_ID` (`.env`). No analytics property is configured and no
  external `gtag.js` is loaded, so it is currently inert — but it is a
  data-minimisation landmine if an id is ever set. Recommend removal for a
  research build.
- No console leakage of PII beyond identifiers already in the URL; `printSummary`/
  `printEvents`/`completeDebugSession` console output is DEV-only.

## 18. Production vs. development behaviour — [IMPLEMENTED+VERIFIED, with a build-command gap]

| Surface                               | Dev (`vite`, `import.meta.env.DEV`) | Prod (`vite build`, `import.meta.env.PROD`)              |
| ------------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| `window.researchRuntime` debug API    | Installed (7 methods)               | **Not installed**                                        |
| Production completion/return/export   | Via `completeDebugSession()`        | **None**                                                 |
| Phaser arcade physics debug           | On                                  | Off                                                      |
| `disableContextMenu`                  | Off                                 | On                                                       |
| External unpkg script / GitHub ribbon | Present                             | **Present** (only `npm run bundle` strips it)            |
| Asset base path                       | `/`                                 | `/` (`vite build`) vs. `./` (`npm run bundle --base=./`) |

Playwright targets the **dev server** on `:5173` (`playwright.config.ts:17,30`),
so the entire suite validates **dev** behaviour. The production completion/return/
export path has, by construction, **zero automated coverage**.

## 19. Test matrix — [see audit §11 for the full coverage matrix]

- 49 tests / 22 spec files, all validating dev behaviour. Launch parsing,
  identity, per-room logging, cross-session isolation, reload, adversarial
  launch/return shapes, and the dev return-preview (`completeDebugSession`) are
  covered. **Uncovered**: any production-build behaviour; a real hosted
  round-trip to Qualtrics; raw-event export to a dataset; reload recovery
  (frozen as loss, not recovery).

## 20. Unresolved decisions (pointers; not resolved here)

D2 (Beat-13, deployment-gating), D3 (idle threshold), D4 (Q24/Q25 construct),
D5 (`engineer_report_submitted_supervised`), D6 (`interruption_alert_acknowledged`),
D7 (`task_started` listing), D8 (asset dispositions) — see
`WAVE1-USER-DECISION-BRIEF.md`. Plus integration-specific user decisions surfaced
by this audit: production return **mechanism**; raw-event **export channel**;
empty-identity handling; non-`http(s)` return-scheme handling; completion-status
taxonomy; `asset_set_version`-in-payload authorisation.

## 21. Definition of done (integration)

The integration is pilot-ready when, in a **production** build:

1. A completion trigger fires from the terminal room (mechanism per user ruling),
   finalises the summary, and (if `return_url` present) returns the participant to
   Qualtrics with all embedded-data fields; participant-visible failure handling
   exists when it cannot.
2. Raw events reach a durable sink by the user-decided channel, such that every
   exported summary variable is reproducible from exported raw data (or the study
   formally accepts summaries-only).
3. Identity is unambiguous (empty-identity handling ruled and enforced) and
   completed/incomplete/failed/test sessions are distinguishable downstream.
4. The deployed artifact carries no external network dependency, uses correct base
   paths, and stamps `game_version` + `asset_set_version` provenance.
5. A hosted round-trip (Qualtrics → game → Qualtrics) is verified end-to-end, and
   the production completion/return/export path has automated coverage.
6. Beat-13/D2 scoring is landed and version-stamped, and the codebook maps 1:1 to
   `GameSummaryVariables`.
