# Professional Assessment Pilot V3 — verification report

Mission contract: `docs/verification/professional-pilot-v3/CONTRACT.md`.
Predecessor: `docs/verification/PROFESSIONAL-ASSESSMENT-PILOT-V2-REPORT.md`
(§15.10 carries the findings V3 closes; §16 classifies the inherited test
failures V3 must not be blamed for).

Every unit below appends its own section in commit order. Nothing in this
report is a scientific ruling: all INT-1..INT-6, D2..D8 and SA-family
decisions remain open, and every integration choice is `PROVISIONAL(...)`.

---

## 0. Entry state and Unit 0

- Worktree `.claude/worktrees/fable-evidence-led-pilot-v2`, branch
  `fable-professional-pilot-v3-v1`, HEAD `1e06860`, `git status --porcelain`
  empty at entry (verified 2026-09-04).
- No `.env.local` exists in this worktree or in any other checkout of the
  repository; no ingestion credentials are available. The Supabase CLI is not
  installed on PATH; Docker Desktop is installed (client 29.6.1) but its daemon
  was not running at entry. `node` v24.19.0. These facts scope U3.
- One `node.exe` and a set of `chrome.exe` processes were running at entry;
  none was started by this mission and none listens on the V3 ports
  (5351-5353, 4173, 54321-54322). They are out of scope for the final process
  audit, which covers only processes this mission starts.
- Unit 0 wrote the contract and this skeleton. No product file changed.

---

## 1. Unit 1 — Lossless event collection

### 1.1 Scope and files

Contract U1. Changed files (all inside the U1 allowlist):

- `src/systems/EventStore.ts` (new): `DurableEventStore` — chunked,
  append-only `localStorage` mirror keyed by `(launch_mode class,
participant_id, game_session_id)`; identity-checked recovery; chunk-probe
  recovery when meta is unreadable; count and age retention;
  `computeEventIntegrity`; `resolveLocalStorage` (write probe). Pure and
  Node-importable.
- `src/systems/EventLogger.ts`: additive `sequence` / `page_load_index`
  fields assigned by the logger (caller values overwritten),
  `configureSequencing` (never lowers the counter), `setSink` (throwing sink
  can never lose or block an append), `getNextSequence`.
- `src/systems/ResearchRuntime.ts`: opens the store before `session_start`,
  continues numbering after any prior page load, mirrors every event,
  exports `page_load_index`, `prior_page_load_events`, `event_integrity`;
  additive DEV probe `getEventIntegrity()`.
- `src/systems/ResearchExportClient.ts`: payload type gains the three
  additive fields; the frozen envelope is scoped to one page load
  (`page_load_index` in the envelope and the storage key).
- `src/systems/index.ts`: barrel export.
- `e2e/event_store.spec.ts` (new, 18 pure tests),
  `e2e/research_export_test_mode.spec.ts` (envelope shape, reload semantics,
  three new browser tests), `e2e/launch_with_research_params.spec.ts`
  (pinned surface + sequence assertion),
  `docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md`.

The contract's U1 text names the page-load field `attempt_index`; it was
renamed to `page_load_index` (and `prior_attempt_events` to
`prior_page_load_events`) during the review round — see 1.5, F2. The
contract file is amended in the final documentation unit; this report is the
record of the change.

### 1.2 What is now true

- Every raw event carries `sequence` (monotonic per identity across page
  loads) and `page_load_index`. A reload of the same identity recovers every
  earlier event, continues numbering (no reuse, no renumbering), and the
  export carries the earlier events **separately** as
  `prior_page_load_events` so `computeSummary` — which still reads only
  `raw_events` — never double-counts a restart.
- A reload submits a **new** export (new `export_id`, HTTP 201) whose
  `prior_page_load_events` hold the earlier page load; a retry of the same
  page load resends identical bytes (HTTP 200 duplicate). The stale
  pre-reload envelope is never resent.
- `event_integrity` makes losslessness checkable server-side without
  trusting the client: `expected_event_count` (= `last_sequence`) must equal
  current + prior counts, with zero gaps (leading gap included), zero
  duplicates, zero foreign rejections and zero evictions.
- Recovered records are accepted only when their own identity fields match
  the launch identity; mismatches are rejected and counted. A test-mode dry
  run and a participant launch of the same identity use different buffers.
- Storage failure modes are explicit and non-fatal: absent/blocked
  `localStorage` → `memory_only`; mid-session quota failure → one eviction
  of other retained identities (counted), retry, else `degraded`; torn
  write → recovered from the events present with the high-water mark never
  lowered; unreadable meta with chunks present → events recovered from the
  chunks, `recovered_from_chunks: true`, no sequence number reissued.
- Retention: at most eight identities per device, and any identity
  untouched for 30 days is removed at the next launch. `clear()` exists as
  the acknowledgement hook and is wired in Unit 2.
- The summary, the scoring surface and the transport gate
  (`launch_mode=test` only in DEV) are unchanged.

### 1.3 Verification (`--retries=0 --workers=1`, `PW_DEV_PORT=5352`)

| Command                                                                     | Result                                                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint:tsc`                                                      | pass (before and after the review round)                                                                                                       |
| `npx eslint` on the seven changed TS files                                  | pass (one `no-useless-assignment` fixed in the first pass)                                                                                     |
| `event_store` + `launch_with_research_params` + `research_export_test_mode` | first pass 27/28 (corrupt-chunk test caught a high-water-mark defect; fixed); after the review round **33/33** (18 pure + 15 browser, 4.6 min) |
| `npm.cmd run build`                                                         | pass before the review round (2.42 s) and again after it (1.6)                                                                                 |
| `node scripts/claude/verify-unit.mjs --allow …`                             | PASS (every change inside the U1 allowlist)                                                                                                    |

No listener remained on port 5352 after any run.

### 1.4 Boundaries kept

No canonical event name, scoring formula, weight or Q-item mapping changed.
`ScoringManager.ts`, `SessionState.ts`, `QualtricsBridge.ts`,
`DataQualityTracker.ts`, `docs/research/**` and `docs/scientific/**` are
untouched. Transport and integrity state are never written into the raw log
or the summary. Nothing was pushed.

### 1.5 Review round (scientific-reviewer, read-only) and disposition

One consolidated round; 18 findings, 4 open decisions surfaced. Disposition:

| Finding                                                                   | Severity | Disposition                                                                                                                                       |
| ------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 summary input unchanged                                                | INFO     | confirmed clean                                                                                                                                   |
| F2 `attempt_index` confusable with canonical `attempt_number`             | MINOR    | **fixed** — renamed `page_load_index` / `prior_page_load_events` (a new provisional field, not a schema edit)                                     |
| F3 `elapsed_seconds` restarts per page load                               | MINOR    | **fixed** — ops doc warns; only `timestamp_ms` is cross-load comparable                                                                           |
| F4 unreadable meta discarded the buffer and reset numbering               | MAJOR    | **fixed** — chunk-probe recovery, `recovered_from_chunks` flag, high-water mark never lowered; new pure test                                      |
| F5 frozen envelope beat the durable store after reload                    | MAJOR    | **fixed** — envelope scoped per page load (PROVISIONAL(INT-2.5)); browser test proves the reload export carries the earlier events; OD-2 recorded |
| F6 no identity check on recovered records                                 | MAJOR    | **fixed** — records must carry the launch identity; rejections counted; new pure test                                                             |
| F7 eviction can delete un-acknowledged buffers silently                   | MINOR    | **partly fixed** — evictions counted in the integrity block; `clear()`-on-ack wired in Unit 2; the retention policy itself is OD-4                |
| F8 leading gap uncounted; no expected count                               | MINOR    | **fixed** — leading gap counted, `expected_event_count` added                                                                                     |
| F9 standalone launches get random identities (INT-3)                      | MINOR    | **open** — INT-3 ruling; recorded in 1.7                                                                                                          |
| F10 nothing reads as a low value                                          | INFO     | confirmed                                                                                                                                         |
| F11 payload-contract change ahead of the P1-9 / P0-3 rulings not recorded | MAJOR    | **fixed** — recorded in 1.7; `event-schema.md` untouched                                                                                          |
| F12 PROVISIONAL tags missing at three sites                               | MINOR    | **fixed** — tags at `EventLogger.ts`, `ResearchExportClient.ts`, `ResearchRuntime.ts`, `EventStore.ts`                                            |
| F13 no new canonical name / formula                                       | INFO     | confirmed                                                                                                                                         |
| F14 storage class changed; governance rows now stale                      | MAJOR    | **recorded** in 1.7 (checklist rows 2.6 / 5.3 and threat-model row B3 are outside the allowlist and are routed to their owners)                   |
| F15 §7.5 constraints: expiry, test/production separation, cleanup path    | MAJOR    | **fixed** — 30-day expiry; `launch_mode` class in the store key; ack-clear (Unit 2) plus a documented manual cleanup; new pure tests              |
| F16 build result missing; browser specs not re-run after the fix          | MAJOR    | **fixed** — 1.3 / 1.6                                                                                                                             |
| F17 the corrupt-meta test never exercised the loss path                   | MAJOR    | **fixed** — dedicated test with events present                                                                                                    |
| F18 proven vs unproven claims                                             | MINOR    | F5, F6 and F15(ii) now each have a test; F7's eviction is counted rather than silent                                                              |

### 1.6 Post-round gates

`npm.cmd run lint:tsc` pass; scoped ESLint pass; the three specs 33/33;
`npm.cmd run build` pass; `verify-unit` PASS; `git diff --check` clean.

### 1.7 Open decisions recorded (none resolved)

- **P1-9 / P0-3 (payload contract).** `sequence` and `page_load_index` on
  every raw event, and `page_load_index`, `prior_page_load_events`,
  `event_integrity` on the export payload, are additions to the canonical
  payload that the gap audit classifies as an event-schema decision. They
  are tagged PROVISIONAL in code and are not written into
  `docs/research/event-schema.md`. The research owner may rename, keep or
  remove them.
- **OD-1 (from review).** After a reload, the summary that reaches Qualtrics
  is computed from the post-reload page load only and carries no
  page-load marker; a truncated session is therefore indistinguishable from
  a complete low-activity one in the Qualtrics record alone. Options: (a)
  reconcile from the ingestion envelope; (b) add a non-scored page-load
  marker to the return payload (summary-shape change); (c) exclude reloaded
  sessions at analysis. Unit 2 adopts (b) provisionally by appending the
  status axes and `page_load_index` to the return URL — recorded there.
- **OD-2 (INT-2.5).** A reload now yields a new export rather than a
  duplicate. This is the provisional reading of "changed state → new
  export_id"; the owner may instead require a fresh tab or a single final
  export.
- **OD-3 (INT-2 / P0-3).** The device buffer does not flush on its own; a
  crash with no later launch of the same identity still leaves the dataset
  without the events. Unit 2 adds a best-effort keep-alive `incomplete`
  export at page hide; an unsolicited flush at the next launch would need an
  INT-2 ruling.
- **OD-4 (PS-3 / PS-2).** Retention policy (eight identities, 30 days,
  eviction under quota) is an engineering default; the study owner sets the
  real policy. Governance rows to update by their owners:
  `PILOT-DATA-GOVERNANCE-CHECKLIST.md` 2.6 (no longer automatic), 5.3, 8.3,
  9.2, 12.5; `RESEARCH-DATA-PRIVACY-THREAT-MODEL.md` B3 (retention is no
  longer "none").
- **INT-3.** Launches without identity parameters receive random ids per
  page load, so the durable store cannot recover across a reload for them.
  Unchanged behaviour; noted as a limitation.

---

## 2. Unit 2 — Participant completion, export and survey handoff

### 2.1 Scope and files

Contract U2. Changed files (all inside the U2 allowlist):

- `src/systems/SessionStatus.ts` (new): PROVISIONAL(INT-5) Model B axes
  (`launch_mode`, `session_status`, `completion_reason`, `export_status`,
  `return_status`), launch-mode resolution (PROVISIONAL(PS-2): `test` is the
  only explicit test signal; absent → `production` in a bundle,
  `development` in a DEV build; the raw value is kept for audit), export
  permission (`test` always; `production` only from a bundle unless a DEV
  test hook opts in; `development` never), a small one-way state machine.
  No `abandoned` value (needs a study rule).
- `src/systems/QualtricsBridge.ts`: PROVISIONAL(INT-4) return-URL policy —
  `https:` to an allow-listed host or subdomain (default `qualtrics.com`,
  `VITE_RETURN_URL_ALLOWED_HOSTS` override), DEV-only localhost, refusals
  with reasons; `buildValidatedReturnUrl`. Node-importable (no env read).
- `src/systems/ResearchExportClient.ts`: launch-mode/status-aware envelope
  (`launch_mode`, `session_status`, `completion_reason`, `export_sequence`,
  `page_load_index`), frozen per (identity, page load, status), bounded
  retry with per-attempt progress, keep-alive compact submission (64 KiB
  cap; `raw_events_omitted` explicit), refusal reasons generalised.
- `src/systems/ResearchRuntime.ts`: `completeParticipantSession()` pipeline
  (status → export with 3 attempts → buffer clear on ack → validated
  return URL with summary + axes + `export_id` + `page_load_index` →
  automatic navigation after a readable delay, or manual continue);
  `continueToSurvey()`, `cancelAutoNavigate()`, `getHandoffState()`,
  `getSessionStatus()`, `subscribeHandoff()`; `pagehide` keep-alive
  `incomplete` export; payload gains `mission_state` and
  `environment.prefers_reduced_motion` (V2 U8-3); DEV probes
  `__handoffProbe`, `getHandoffState`, `getSessionStatus`.
- `src/scenes/CoreChamberScene.ts`: the pipeline starts at `finishRamp`;
  the SHIFT COMPLETE notice gains a "Study data:" line, a "Survey:" line
  with countdown, a state-dependent "next" line, CONTINUE TO SURVEY
  (focus-first) and a close control that only appears once the data has
  settled; the notice refuses to close while sending and withdraws
  automatic navigation when closed afterwards.
- `supabase/functions/ingest-research-session/ingest-research-session.ts`
  and `supabase/migrations/20260904120000_allow_production_launch_mode.sql`:
  `launch_mode ∈ {test, production}`, optional validated status fields
  projected into indexed columns; idempotency unchanged.
- `src/types/vite-env.d.ts`, `.env.example`, `src/systems/index.ts`.
- `e2e/participant_completion_handoff.spec.ts` (new: 6 pure + 7 browser),
  `e2e/research_export_test_mode.spec.ts`, `e2e/launch_with_research_params.spec.ts`.
- `docs/operations/QUALTRICS-HANDOFF.md` (new),
  `docs/operations/PARTICIPANT-DEPLOYMENT.md`,
  `docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md`.

Deviation from the contract text: U2 said `objective_completed` would be
"reused at completion". It is **not** logged by the participant pipeline —
the V2 closure design (and `pilot_closure.spec.ts`) require that the legacy
debug completion never runs on the participant route; the closure's own
`pilot_closure_stable` remains the terminal marker and the status axes
carry completion. `closureSession.ts` and `closureHelpers.ts` (allow-listed)
did not need to change.

### 2.2 What is now true for a participant

- The shift's terminal state (confirmed Core synchronisation) starts one
  pipeline: `session_status → completed`; export of the full envelope with
  three attempts (network/timeout/5xx retried, 4xx not) and per-attempt
  progress on the notice; the validated survey URL built from the summary
  plus the status axes, `export_id`, `export_refusal` and
  `page_load_index`; automatic navigation 20 s after settle with a visible
  countdown, or immediately through CONTINUE TO SURVEY (keyboard focus
  lands on it). A failed export is never auto-navigated past. The notice
  cannot be dismissed while sending; closing it afterwards withdraws the
  automatic navigation. Absent or refused survey links produce a neutral
  fallback and no navigation.
- Navigation only to `https:` on an allow-listed host or subdomain
  (default `qualtrics.com`; single-label entries ignored), DEV localhost for
  tests; credentials, `javascript:` and unparseable URLs refused with a
  recorded reason.
- Launch modes: `test` exports everywhere; `production` exports only from a
  participant bundle (a DEV build refuses unless a test hook opts in);
  `development` never exports. The raw launch value is kept for audit.
- Early exit: a `pagehide` before the terminal state sends a keep-alive
  envelope labelled `incomplete` / `participant_exit` without moving the
  session's own status (a backgrounded or bfcache-restored tab can still
  complete); over the 64 KiB keep-alive cap the most recent events that fit
  are kept and the omission is counted explicitly.
- The ingestion function is dependency-free (plain fetch to PostgREST with
  the platform-injected service role; explicit publishable-key check) and
  accepts `test` and `production`; status axes are projected into indexed,
  check-constrained columns. Verified end to end against an isolated local
  stack in Unit 3.

### 2.3 Gameplay review (read-only) — disposition

| #     | Finding                                             | Sev     | Disposition                                                                                                            |
| ----- | --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | notice unreadable: 2.5 s before navigation          | BLOCKER | **fixed** — 20 s delay from settle with countdown; CONTINUE always available                                           |
| 2     | `blocked` phase dead end                            | MAJOR   | **fixed** — CONTINUE rendered in `blocked`; dedicated survey line                                                      |
| 3     | failed export auto-navigated past its recovery line | MAJOR   | **fixed** — no automatic navigation after a failed export                                                              |
| 4     | focus on CLOSE, not on the primary                  | MAJOR   | **fixed** — controls appear together after settle, CONTINUE first (focus index 0); help line names the focused control |
| 5     | ESC/SPACE dismisses while sending                   | MAJOR   | **fixed** — close refused while sending (neutral feedback); closing after settle cancels auto-navigation               |
| 6     | contradictory "what now" lines                      | MAJOR   | **fixed** — state-dependent next line                                                                                  |
| 7     | five nouns for three things                         | MAJOR   | **partly** — "Session record" → "Study data"; the four closure facts stay (non-scored presentation; owner may reduce)  |
| 8     | ~48 s frozen "sending…"                             | MAJOR   | **fixed** — attempt n of 3 shown; "can take up to a minute" line                                                       |
| 9     | accent button contrast ≈2.7:1                       | MINOR   | **routed to U6** (`WorkSurfaceScene.ts` outside the U2 allowlist)                                                      |
| 10    | CLOSE on the CONFIRM footprint                      | MINOR   | **fixed** — controls appear 1.2 s after settle; CLOSE panel-left                                                       |
| 11    | no countdown                                        | MINOR   | **fixed**                                                                                                              |
| 12    | "tell the researcher" unactionable                  | MINOR   | **fixed** — "kept on this device, not lost" + survey mention                                                           |
| 13    | wrap risk / no screenshots of dynamic states        | MINOR   | lines shortened; screenshots **routed to U6**                                                                          |
| 14–16 | informational                                       | INFO    | noted                                                                                                                  |

### 2.4 Scientific review (read-only) — disposition

| #   | Finding                                                                                                | Sev     | Disposition                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pagehide` permanently marked a session `incomplete` and rewrote `completed`                           | BLOCKER | **fixed** — `persisted` pages ignored; the exit label rides on the keep-alive envelope only; the status machine is never moved by a page hide                                                                                                     |
| 2   | `completed` derived from status, not from a raw event; contract line unimplemented                     | MAJOR   | **open decision** (2.6); contract deviation recorded in 2.1                                                                                                                                                                                       |
| 3   | two derivations of `completed`                                                                         | MAJOR   | **fixed** — one status-derived flag for envelope and return URL                                                                                                                                                                                   |
| 4   | keep-alive would carry no events; branch untested                                                      | MAJOR   | **fixed** — most-recent events kept up to the cap, omission counted; pure test forces the branch; real raw-log size recorded by `pilot_closure` test 1 (2.5)                                                                                      |
| 5   | `clear()` on ack destroyed the high-water mark                                                         | MAJOR   | **fixed** — no clear on ack (retention/expiry instead); U1's F15(i) ack-clear intent superseded and recorded under OD-4                                                                                                                           |
| 6   | debug completion and pipeline shared one frozen envelope                                               | MAJOR   | **fixed** — `debug` vs `full` envelope families; pure test                                                                                                                                                                                        |
| 7   | `qualtrics_completion_performed: false` now false in raw metadata; guard test vacuous                  | MAJOR   | **stop-and-report** — `utilityCoreClosure.ts` / `pilot_closure_models.spec.ts` outside the allowlist; open decision (2.6)                                                                                                                         |
| 8   | threat model / governance checklist state the flow does not exist                                      | MAJOR   | **recorded** (2.6); files outside the allowlist, routed to owners                                                                                                                                                                                 |
| 9   | tests did not prove 200-duplicate on the pipeline, https navigation, bundle surface, full-route export | MAJOR   | **partly fixed** — https allow-listed navigation test; debug-family duplicate test; keepalive flag removed; forbidden-text guard on every notice; bundle-surface grep in U3/U7; full-route (non-inspection) export remains unproven and is stated |
| 10  | `export_status = not_applicable` outside the pack's set                                                | MINOR   | **partly** — `export_refusal` now carried on the return URL; value recorded as a proposed INT-5 extension                                                                                                                                         |
| 11  | migration projected an unsent field                                                                    | MINOR   | **fixed** — `page_load_index` projected; check constraints added                                                                                                                                                                                  |
| 12  | `.env.example` / `vite-env.d.ts` said test-only                                                        | MINOR   | **fixed**                                                                                                                                                                                                                                         |
| 13  | untagged constants; 2.5 s window                                                                       | MINOR   | **fixed** — PROVISIONAL tags; 20 s; no auto-nav after failure                                                                                                                                                                                     |
| 14  | single-label allow entries                                                                             | MINOR   | **fixed** — ignored                                                                                                                                                                                                                               |
| 15  | clean items                                                                                            | INFO    | confirmed                                                                                                                                                                                                                                         |

### 2.5 Verification (`--retries=0 --workers=1`, `PW_DEV_PORT=5352`)

| Command                                                                                   | Result                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm.cmd run lint:tsc`                                                                    | pass (after every round)                                                                                                                                                                                                                                                                                          |
| scoped ESLint on the changed TS files                                                     | pass                                                                                                                                                                                                                                                                                                              |
| `npm.cmd run build`                                                                       | pass                                                                                                                                                                                                                                                                                                              |
| `participant_completion_handoff` (6 pure axes/policy + 3 pure client + 8 browser)         | first run 10/13 (three test-authoring races: the launch URL itself contains the refused host string; the automatic navigation raced the notice read) → fixed; after the gameplay round the countdown ticker used the paused scene clock (controls never rendered) → fixed with a window interval; final **17/17** |
| `research_export_test_mode` (12) + `launch_with_research_params` (3) + `event_store` (18) | 33/33 after round 1; after round 2 the reload test had to select the `completed` envelope because the page hide now sends an `incomplete` keep-alive first → 15/15 re-run green                                                                                                                                   |
| `pilot_closure` (3, participant route, ~23 min)                                           | 3/3 after adding a wait for the delayed CLOSE NOTICE control (the notice's controls appear once the handoff settles); test 1 now records the participant-route raw-log size as an annotation                                                                                                                      |
| isolated Supabase round-trip (Unit 3 script, local stack)                                 | 13/13 with the dependency-free function — the `npm:@supabase/server` version could not boot behind TLS interception                                                                                                                                                                                               |
| `node scripts/claude/verify-unit.mjs --allow …`                                           | PASS                                                                                                                                                                                                                                                                                                              |

Unproven (stated): a full participant-route export (all browser exports use
the developer inspection launch); the participant bundle's absence of DEV
hooks is checked by grep in Unit 3/7, not by a browser run.

### 2.6 Open decisions recorded (none resolved)

- **INT-5 early-exit rule.** The pack defines no `incomplete → *`
  transition. Implemented provisionally: the exit label is an envelope
  fact, never a session-state transition; a session may therefore produce an
  `incomplete` row and a later `completed` row. Precedence rule for
  analysis (highest `export_sequence` per page load? completed wins?) is
  the owner's.
- **Meaning of `completed` in the export.** Status-derived (the participant
  pipeline logs no `objective_completed`); the contract's U2 telemetry line
  assumed the event would be reused. Options: emit the canonical event at
  the terminal state (event-schema decision), or ratify the status-derived
  field as a non-reproducible envelope fact.
- **`export_status = not_applicable`** — proposed extension to the pack's
  `pending | acknowledged | failed`; `export_refusal` disambiguates.
- **Event-less / trimmed `incomplete` exports** — accept, or require a
  chunked/next-launch flush (INT-2); related to OD-3.
- **`qualtrics_completion_performed: false`** in `ClosureContext`
  (`src/pilot/closure/utilityCoreClosure.ts`) now rides on raw event
  metadata for sessions where the handoff did occur, and
  `e2e/pilot_closure_models.spec.ts`'s "no Qualtrics call in closure code"
  guard does not see `completeParticipantSession`. Both files are outside
  the U2 allowlist: needs its own unit; disposition (dynamic / remove /
  redefine) is an event-payload question for the owner.
- **Governance records** — `RESEARCH-DATA-PRIVACY-THREAT-MODEL.md` rows
  58-59 / B3, `QUALTRICS-END-TO-END-CONTRACT.md` 238/350,
  `PILOT-DATA-GOVERNANCE-CHECKLIST.md` 3.3 / 3.5 / 5.2 / 2.6 / 5.3 now
  contradict the live tree (production navigation and export exist;
  persistence exists). Outside every V3 allowlist; routed to their owners.
- **PS-4** — `export_id` and `page_load_index` on the return URL are join
  keys; the V1 summary set is unchanged.
- **INT-1 launch shape** — standalone assumed; an iframe launch needs
  Option B/C.
- **Full-route export unproven** — every browser test uses the developer
  inspection launch (near-empty log); the participant route's export is
  exercised only indirectly (U7 sweep runs the closure spec, which measures
  the raw-log size but does not export).

### 2.7 Boundaries kept

No `proto_*` / `pilot_closure_*` event, family, window, disposition or
censoring rule changed; `ScoringManager.ts`, `docs/research/**`,
`docs/scientific/**` untouched; transport state never enters the raw log;
no questionnaire wording in any new string (forbidden-text regex asserted on
every notice state in the browser tests). Nothing was pushed.

---

## 3. Unit 3 — Isolated Supabase round-trip

Contract U3, with two recorded allowlist amendments (reasons below):
`supabase/functions/ingest-research-session/ingest-research-session.ts`
(CORS `OPTIONS` handling) and `e2e/supabase_roundtrip_live.spec.ts` (the
env-gated real-client run). Evidence document:
`docs/verification/professional-pilot-v3/SUPABASE-ROUNDTRIP.md`; JSON report
`SUPABASE-ROUNDTRIP-2026-09-04.json` (no keys); script
`scripts/pilot/supabase-roundtrip.mjs`.

### 3.1 Results

- Transport contract against the local CLI stack (committed migrations and
  function): **13/13** — 201 / 200-duplicate / 409-conflict / separate test
  row / incomplete row / 403 for `development` / one row / projected
  columns / verbatim payload / hash match / labels.
- Real client (DEV server pipeline, export config pointed at the live
  local function, developer inspection launch): **1/1** — 201 once,
  console retry family 201 then 200 duplicate, PostgREST read-back with the
  stored hash equal to the SHA-256 of the client's frozen payload, CORS
  preflight 204 with `apikey` allowed. Skips (1 skipped) when the local
  keys are not set, so the ordinary suite never needs the stack.
- Participant bundle audit: no external host, analytics stub, DEV probe
  string or source map in `dist/`.

### 3.2 Defects exposed and fixed

1. The original function's registry fetch at cold start
   (`npm:@supabase/server`) failed behind TLS interception → 503
   `BOOT_ERROR` on every request; rewritten dependency-free (committed in
   Unit 2, verified here).
2. No CORS handling: a static-hosted bundle's cross-origin POST would have
   failed at the preflight and nothing would ever have left the browser.
   Added here. Neither defect was detectable by the mocked-network browser
   tests or by a same-origin Node script.

### 3.3 Limits

Local default keys and project; no hosted project, region, retention or
access-control claim (X4 / X5 / X10 / X11 external). The stack and Docker
are stopped in Unit 7's process audit.
