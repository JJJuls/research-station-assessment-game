# Professional Assessment Pilot V3 — mission contract (Unit 0)

**Status:** frozen 2026-09-04 in worktree `.claude/worktrees/fable-evidence-led-pilot-v2`,
branch `fable-professional-pilot-v3-v1`, base checkpoint `1e06860` (tip of
`fable-evidence-led-pilot-v2`, the Pilot V2 reliability closure).

**Directive.** The human-set session goal reads, verbatim:

> Professional Assessment Pilot V3 is implemented and locally committed with a
> coherent full-engagement participant journey, defensible item-local
> measurement instrumentation, reliable participant-facing interactions,
> lossless event collection, a verified isolated Supabase write/read/idempotency
> round-trip, verified local and available live-test Qualtrics handoff,
> professional adult presentation, no new deterministic regression, complete
> verification evidence, a clean worktree, and no remaining background processes.

This document is the unit contract required by `docs/ai/CLAUDE-OPERATING-MODE.md`
§2 for the whole mission and for each bounded unit inside it. Process follows
`.claude/skills/bounded-unit/SKILL.md`: one writer, exact allowlists, focused
verification, read-only reviewers, one local commit per unit, no push.

---

## 0. Authority boundary — what this mission does and does not decide

The scientific authority hierarchy in `CLAUDE.md` is unchanged. In particular:

- **INT-1, INT-2, INT-4, INT-5** (completion/return mechanism, raw-event
  channel, return-URL allow-list, status taxonomy) and **INT-3, INT-6, D2..D8,
  SA-1..SA-13** remain **open research-owner decisions**. Nothing in V3
  resolves them.
- V3 implements the mechanisms the goal requires **exactly as the recorded,
  not-yet-authorised recommendations** of
  `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` §3.5, §4.7 and §5
  describe them, and marks every such choice **PROVISIONAL** in code comments,
  in this contract and in the V3 report. The research owner can ratify, amend
  or reverse each one on the ruling form without a schema migration of the
  raw event log: every axis is additive.
- No canonical event name is created. Runtime lifecycle events reuse the
  existing `session_start` / `scene_start` / `objective_completed` names that
  `ResearchRuntime` already emits; pilot events stay `proto_*` /
  `pilot_closure_*` provisional families. Transport state is never a research
  event.
- No scoring formula, weight, cut score, trait label or Q-item mapping changes.
  `computeSummary` is called, never edited, except where a unit below says an
  additive field is appended to the payload outside the summary object.
- No questionnaire wording enters any participant-facing string.
- Missing / invalid data is never interpreted as a low value.

Provisional decisions taken (each tagged `PROVISIONAL(INT-n)` at the code site):

| Tag                  | Choice implemented                                                                                                                                                                                                                                   | Source recommendation |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| PROVISIONAL(INT-1)   | Primary = same-window `return_url` navigation (Option A) after the export settles; fallback = participant-visible "Continue to survey" panel (Option D) whenever the URL is absent, invalid or navigation cannot proceed. Standalone launch assumed. | Pack §3.5             |
| PROVISIONAL(INT-2)   | Raw events + mission state + summary + data quality → HTTPS ingestion endpoint (the existing Supabase Edge Function), buffered in a durable local append-only store and retained until server acknowledgement; summary → Qualtrics via INT-1.        | Pack §4.7             |
| PROVISIONAL(INT-2.5) | Idempotency = composite natural key `participant_id + game_session_id + export_id`; frozen envelope bytes per `export_id`; a changed session status yields a new `export_id`, never a rewrite.                                                       | Pack §4.6             |
| PROVISIONAL(INT-4)   | Return navigation only to `https:` URLs whose host is, or ends with `.`, an allow-listed host (default `qualtrics.com`; override `VITE_RETURN_URL_ALLOWED_HOSTS`). DEV builds additionally allow `http://localhost` for browser tests.               | Pack §3.5 + PS-0      |
| PROVISIONAL(INT-5)   | Model B orthogonal axes: `launch_mode` (`production` / `test` / `development`), `session_status` (`completed` / `incomplete` / `error`), `completion_reason`, `export_status`, `return_status`. No `abandoned` value (needs a study rule).           | Pack §5.2             |
| PROVISIONAL(PS-2)    | `launch_mode=test` is the explicit test signal. In a participant bundle an absent `launch_mode` means `production`; in a DEV build it means `development` (export refused unless `test`).                                                            | PS gate §12           |

---

## 1. Mission-level contract fields

1. **Objective.** Deliver the goal statement above as a sequence of bounded
   units, each locally committed, ending with a clean worktree and no
   background process.
2. **Scientific rationale.** Scientifically neutral in mapping terms: V3 adds no
   construct-to-mechanic translation. It removes threats to validity already
   recorded in the V2 report §15.10 (control variable constant by construction,
   comprehension asserted not checked, duplicate opportunity id, unreachable
   legacy families, unrecorded reduced-motion stimulus difference) and makes
   the raw record lossless so every derived variable is reproducible from
   exported data (audit P0-2).
3. **Participant-facing behaviour.** The V2 route (Dock → Concourse → Records
   Workshop → Diagnostics Laboratory → Recovery Yard → Concourse → Workshop →
   Utility Deck → Core Chamber) is unchanged in order, copy and mechanics
   except: spawn points no longer sit inside the just-used door's interaction
   radius; the Core completion notice gains a neutral "your shift record has
   been sent / could not be sent" line and a "Continue to survey" control;
   the Utility Deck systems-board readout is legible. No validated
   questionnaire wording anywhere.
4. **Exact allowed-file list.** Per unit, §2 below. The mission-wide union is
   the union of the unit lists; nothing else.
5. **Prohibited areas.** `docs/research/event-schema.md`,
   `docs/research/scoring-plan.md`, `docs/scientific/**`,
   `docs/verification/input/**`, `docs/verification/evidence-led-pilot-v2/**`
   (ledger), `package.json`, `package-lock.json`, `src/systems/ScoringManager.ts`
   (formulas), any `src/pilot/evidenceLedger.ts` disposition, any art
   generation, `.claude/settings*.json`, `scripts/claude/**`.
6. **Entry state.** Branch `fable-professional-pilot-v3-v1`, HEAD `1e06860`,
   clean tree, node_modules present, no dev server running on the V3 ports.
7. **Success behaviour.** Every unit's success behaviour holds; the V3 report
   records the evidence; `git status --porcelain` is empty; no node, vite,
   Playwright, Chromium, Supabase or Docker process started by this mission is
   still running.
8. **Failure / recovery behaviour.** A unit that cannot be completed inside its
   allowlist stops and is reported as blocked in the V3 report; the mission
   continues with the units that do not depend on it.
9. **Telemetry boundary.** Canonical runtime events reused: `session_start`,
   `scene_start`, `objective_completed`. Additive raw-event fields
   `sequence` and `attempt_index` (integrity metadata, not measurement).
   Additive export-envelope fields listed under U1/U2. **No new canonical
   event name and no new derived variable is invented.**
10. **Scientific acceptance criteria.** All `proto_*` families and window
    semantics unchanged; every derived summary variable reproducible from the
    exported `raw_events`; control variables actually vary; reduced motion
    recorded; no participant-facing item id, validity word, score or trait
    language; missing never coded as low.
11. **Gameplay acceptance criteria.** Full route completes with keyboard only
    and with mouse; no door re-trigger on arrival; completion notice and
    survey handoff readable at 800×600; no dead end before or after the Core
    confirmation.
12. **Required tests.** `npm.cmd run lint:tsc`, `npm.cmd run build`, scoped
    ESLint on changed files, the unit specs named in §2, and the final sweep
    protocol in U7.
13. **Required screenshots.** U6 and U7 as listed.
14. **Stop conditions.** A required file outside the allowlist; a change that
    would need a new canonical event name or a scoring formula; any sign the
    Supabase round-trip would touch a non-isolated project; a deterministic
    failure that reproduces on the base checkpoint being mistaken for new.
15. **Model selection.** Fable (implementation), Opus reviewers read-only,
    Sonnet `test-reviewer` for command execution where used.
16. **Commit expectation.** One conventional commit per unit, subjects in §2.

---

## 2. Units

Ports: dev server `PW_DEV_PORT=5351` for route specs, `5352`/`5353` for pure /
isolated specs, preview `4173` only inside U3. Base worktree for regression
comparison: `.claude/worktrees/u8-baseline-897f5f4` is at `897f5f4`; the V3
base is `1e06860` in this worktree's own history (compare via `git stash`-free
method: check out nothing — the reliability closure §16 already classifies
inherited failures, and U7 re-runs any new failure on `1e06860` in a
throw-away worktree only if needed).

### U0 — Contract freeze (this document)

- Allowlist: `docs/verification/professional-pilot-v3/CONTRACT.md`,
  `docs/verification/PROFESSIONAL-ASSESSMENT-PILOT-V3-REPORT.md`.
- Tests: none (docs only). Commit:
  `docs(verification): freeze professional pilot v3 contract`.

### U1 — Lossless event collection

- Objective: every raw event carries a per-session monotonic `sequence` and an
  `attempt_index`; the raw log is mirrored synchronously into a durable,
  chunked, append-only local store keyed by `(participant_id, game_session_id)`
  that survives reload, tab close and crash; the export payload carries the
  current attempt's `raw_events` plus `prior_attempt_events` recovered from the
  store, an `event_integrity` block (first/last sequence, count, gap count),
  and the durable-store health.
- Scientific rationale: audit P0-2 / P0-3 / P1-9 / PS-3 / PS-7 — reproducibility
  and data loss. No measurement semantics change; `computeSummary` still sees
  only the current attempt's events, exactly as today.
- Participant-facing: none.
- Allowlist: `src/systems/EventLogger.ts`, `src/systems/EventStore.ts` (new),
  `src/systems/ResearchRuntime.ts`, `src/systems/ResearchExportClient.ts`,
  `src/systems/index.ts`, `e2e/event_store.spec.ts` (new),
  `e2e/research_export_test_mode.spec.ts`,
  `e2e/launch_with_research_params.spec.ts`,
  `docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md`, the V3 report.
- Success: pure tests prove monotonic sequence across two page loads of the
  same identity, chunk append cost independent of log length, quota/throwing
  storage falls back to memory without losing in-memory events, prior-attempt
  events reach the envelope; existing export spec stays green.
- Failure/recovery: storage unavailable → memory only, `durable_store:
'unavailable'` recorded in the envelope; never throws into gameplay.
- Telemetry: additive fields only. Commit:
  `feat(research): make raw event collection lossless`.

### U2 — Participant completion, export and Qualtrics handoff

- Objective: a participant bundle completes the shift, exports the session
  (status axes per PROVISIONAL(INT-5)) to the ingestion endpoint with bounded
  retry, then hands off to Qualtrics via the validated `return_url`
  (PROVISIONAL(INT-1/INT-4)); an early exit fires a best-effort keep-alive
  `incomplete` export; the Edge Function and schema accept `production` and
  `test` launch modes with the same idempotency semantics.
- Scientific rationale: P0-1 / P0-2 / P1-7 / PS-0 / PS-2. No mapping change.
- Participant-facing: completion notice shows a neutral record-status line and
  a "Continue to survey" control; automatic navigation once the export has
  settled and a valid survey link exists; otherwise the panel stays with a
  neutral instruction. No score, no item, no validity word.
- Allowlist: `src/systems/QualtricsBridge.ts`,
  `src/systems/ResearchRuntime.ts`, `src/systems/ResearchExportClient.ts`,
  `src/systems/SessionStatus.ts` (new), `src/systems/index.ts`,
  `src/types/vite-env.d.ts`, `src/scenes/CoreChamberScene.ts`,
  `src/pilot/closure/closureSession.ts`,
  `supabase/functions/ingest-research-session/ingest-research-session.ts`,
  `supabase/migrations/20260904120000_allow_production_launch_mode.sql` (new),
  `.env.example`, `e2e/participant_completion_handoff.spec.ts` (new),
  `e2e/research_export_test_mode.spec.ts`,
  `e2e/launch_with_research_params.spec.ts`, `e2e/pilot_closure.spec.ts`,
  `e2e/closureHelpers.ts`, `docs/operations/PARTICIPANT-DEPLOYMENT.md`,
  `docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md`,
  `docs/operations/QUALTRICS-HANDOFF.md` (new), the V3 report.
- Success: e2e proves (mocked network) 201 then 200-duplicate; status axes in
  envelope and return URL; navigation only to allow-listed https hosts (or DEV
  localhost); disallowed URL → fallback panel, no navigation; export failure →
  return still happens with `export_status=failed`; keep-alive incomplete
  export on `pagehide` before completion; participant bundle contains no
  debug surface.
- Failure/recovery: any transport failure is a typed result; the participant
  is never blocked from the survey by a failed export.
- Telemetry: `objective_completed` reused at completion; transport state never
  logged as an event. Commit:
  `feat(research): complete participant export and survey handoff`.

### U3 — Isolated Supabase round-trip verification

- Objective: run the real client (production bundle served by `vite preview`)
  against a locally started, isolated Supabase stack (Docker, project id
  `research-station-assessment-game`, ports 54321/54322), applying the
  repository migrations; prove insert (201), read-back of the row and its
  payload hash, duplicate acknowledgement (200 `duplicate: true`, one row),
  and content conflict (409) for a changed body under the same id; then stop
  the stack.
- Allowlist: `scripts/pilot/supabase-roundtrip.mjs` (new, Node, no
  dependencies), `docs/verification/professional-pilot-v3/SUPABASE-ROUNDTRIP.md`
  (new), the V3 report.
- Stop condition: the stack cannot be started locally → record the exact
  failure and the executed alternative (function logic exercised in isolation)
  as a limitation; never point the client at a remote project.
- Commit: `docs(verification): verify isolated supabase round-trip`.

### U4 — Defensible item-local instrumentation

- Objective: close the V2 §15.10 measurement findings that need no scientific
  decision: U8-7 (wire the declared M09/M10 reminder-exposure control to the
  actual mission-log open), U8-12 (comprehension recorded from the actual
  guidance acknowledgement, `not_checked` otherwise — never asserted),
  U8-13 (one reachable `proto_m15_layered_cipher` declaration; the other
  removed or quarantined after a runtime trace), U8-2 (legacy yard M22/M25
  families made provably unreachable and excluded from closure censoring),
  U8-3 (`prefers_reduced_motion` recorded once in session metadata and the
  export payload as an environment control), U8-6 (the five weak gates in
  `final_scientific_gates.spec.ts` strengthened to test what their names say).
- Allowlist: `src/pilot/windows/m09MonitorWatch.ts`,
  `src/pilot/windows/exteriorWindows.ts`, `src/pilot/windows/windowKit.ts`,
  `src/pilot/PilotZoneScene.ts`, `src/pilot/yardJobs.ts`,
  `src/pilot/closure/closureSession.ts`,
  `src/informationProcessing/m15CausalModel.ts`,
  `src/informationProcessing/m15LayeredCipher.ts`,
  `src/systems/SessionState.ts`, `src/systems/ResearchRuntime.ts`,
  `e2e/final_scientific_gates.spec.ts`, `e2e/pilot_exterior_isolation.spec.ts`,
  `e2e/pilot_return.spec.ts`, `e2e/pilot_exterior_models.spec.ts`,
  `docs/game/rooms/*.md` touched by the change, the V3 report.
- Stop condition: any fix that would need a new event name, a changed
  disposition or a changed validity gate → recorded as an open decision.
- Commit: `fix(research): make item-local instrumentation defensible`.

### U5 — Reliable participant-facing interactions

- Objective: U8-8 (spawn outside the door radius in Records Workshop,
  Concourse-from-Workshop, Deck-from-Chamber), U8-4 (single contextual
  interact per frame for SPACE+E), P1 triage of
  `connected_participant_journeys` (spec/mechanic mismatch or timing — no
  event renamed), and event-driven waits at the four V2 §16.11 call sites.
- Allowlist: `src/scenes/RecordsWorkshopScene.ts`,
  `src/scenes/StationConcourseScene.ts`, `src/scenes/UtilityCoreDeckScene.ts`,
  `src/scenes/RoomScene.ts`, `src/pilot/PilotZoneScene.ts`,
  `e2e/connected_participant_journeys.spec.ts`, `e2e/magnet_salvage_ip.spec.ts`,
  `e2e/helpers.ts`, `e2e/journey.ts`, `e2e/pilotHelpers.ts`,
  `e2e/pilot_route.spec.ts`, `e2e/pilot_deck.spec.ts`,
  `e2e/spawn_clearance.spec.ts` (new), the V3 report.
- Commit: `fix(game): make participant interactions reliable`.

### U6 — Professional adult presentation

- Objective: U8-9 (deck systems-board readout unoccluded), U8-10 (stale frames
  regenerated to show what their names claim), re-capture of the 30-frame
  participant set, visual review.
- Allowlist: `src/scenes/UtilityCoreDeckScene.ts`, `src/pilot/ui/**` only if
  the readout fix requires it, `e2e/pilot_visual_capture.spec.ts`,
  `docs/verification/screenshots-professional-pilot/*.png`,
  `docs/verification/evidence-led-pilot-v2/UNIT-7-VISUAL-DEFECT-LEDGER.md`
  (correction of the V28 row only), the V3 report.
- Commit: `fix(game): restore deck readout and refresh presentation evidence`.

### U7 — Final verification, evidence, clean-up

- Objective: full Playwright sweep `--retries=0 --workers=1` in chunks; every
  failure classified deterministic-vs-intermittent and new-vs-inherited
  against §16 of the V2 report (and, for any new deterministic failure, a
  re-run on `1e06860`); gates; handoff report; memory; process audit.
- Allowlist: the V3 report, `docs/verification/professional-pilot-v3/**`,
  `e2e/**` only for a test-only correction the sweep proves necessary.
- Success: `git status --porcelain` empty after the commit; `netstat` shows
  no listener on the V3 ports; no vite/node/Chromium/Supabase/Docker process
  started by the mission remains.
- Commit: `docs(verification): verify professional assessment pilot v3`.

---

## 3. Review policy for this mission

- `scientific-reviewer` after U1, U2, U4. `gameplay-reviewer` after U2, U5,
  U6. `visual-reviewer` after U6. `test-reviewer` where a command set is
  delegated. Maximum two review/fix rounds per unit; open findings are
  reported, never silently absorbed.
- Reviewer output is recommendation only. Any finding that amounts to a
  scientific decision is written into the V3 report's open-decision section
  and left open.

---

## 4. Amendments recorded during execution (Unit 7)

Recorded, not silently applied; each is explained in the V3 report section
named.

- **U1 field names.** `attempt_index` / `prior_attempt_events` became
  `page_load_index` / `prior_page_load_events` after the scientific review
  (the original name was confusable with the canonical `attempt_number`
  measurement field). Report §1.5 F2.
- **U2 telemetry line.** The participant pipeline does **not** log
  `objective_completed`; the closure's own `pilot_closure_stable` is the
  terminal marker and the PROVISIONAL(INT-5) axes carry completion. The
  contract's "reused at completion" wording is superseded; the meaning of
  `completed` in the export is an open decision. Report §2.1 / §2.6.
- **U3 allowlist additions.** `supabase/functions/ingest-research-session/
ingest-research-session.ts` (CORS `OPTIONS` handling, found only by the
  real cross-origin client) and `e2e/supabase_roundtrip_live.spec.ts`
  (env-gated real-client run). Report §3.
- **U4 scope.** `exteriorWindows.ts`, `windowKit.ts`, `yardJobs.ts`,
  `closureSession.ts`, the M15 modules, `SessionState.ts` and the room docs
  were **not** edited: the findings that needed them either require a
  research-owner decision (U8-12) or were closed by static gates without a
  product change (U8-2, U8-13). Report §4.
- **U5 path.** The interact-key site is `src/world/RoomScene.ts`, not
  `src/scenes/RoomScene.ts`. The V2 §16.11 harness items are deferred as
  test-only. Report §5.2.
- **U6 files.** `src/pilot/ui/**` untouched; two screenshot files renamed
  (`15-laboratory-phase-benches.png`, `30-record-closed-feeds-pending.png`);
  the Unit 7 visual ledger row V28 left as is (the evidence now agrees with
  it). Report §6.
- **U7 test-only correction.** `e2e/pilot_closure_models.spec.ts` test 19's
  guard pattern now matches Qualtrics _calls_ (`QualtricsBridge`,
  `buildReturnUrl(`, `completeDebugSession(`, `location.assign(`) rather
  than the word `return_url`, which the Core Chamber legitimately reads
  from the runtime's handoff state since U2. Report §7.
- **Ports.** Route specs ran on `PW_DEV_PORT=5352`, pure specs on `5353`
  (the contract said 5351/5352/5353).
