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
