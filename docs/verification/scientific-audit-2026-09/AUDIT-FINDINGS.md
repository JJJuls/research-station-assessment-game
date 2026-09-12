# Comprehensive scientific implementation audit — 2026-09-13

Audited tree: `fable-professional-world-rescue-v2` @ `5d05115` (worktree
`fable-professional-world-rebuild`). Two independent read-only audit passes
(Track A: authority → trigger → display → response → recorded event;
Track B: recorded event → persistence → export), each with file:line
evidence, consolidated and triaged here by the main writer.

Triage classes:

- **DEFECT / fix planned (this branch)** — code contradicts _existing_
  documented scientific authority; fixable without any new scientific
  decision. Each fix is verified at the call site before implementation
  and re-verified by test.
- **PROPOSAL / research owner** — the finding questions the scientific
  design itself, or its fix would create new measurement semantics. Routed
  to `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md`; **no production
  behaviour changed**.
- **NOTE** — informational; recorded, no action this branch.

## Headline results

1. **The M→Q mapping is real but unapproved.** M01–M12 ≡ Q01–Q12 verbatim
   (BFI-2 C), M19–M26 ↔ Q21–Q28 (MPS PDD/IP), while M13–M18 measure BESSI
   Information Processing — an instrument _not in the 33-item battery_ —
   and Grit-S Q13–Q20 + Goal-Time Q29–Q33 (13 of 33 items) have **no
   window on the participant route**. The crosswalk itself records the
   M↔Q binding as an open research-owner decision (D-X-2). → PROPOSAL P1.
2. **Wording is clean.** No validated Q01–Q33 wording appears in any
   player-facing string (full 33-phrase scan of `src/`). One verbatim
   quote lives in a code comment (`secondaryTelemetry.ts:5`) — permitted
   for traceability by CLAUDE.md.
3. **Neutrality holds on the route.** No praise/blame, reward, penalty,
   score display; no door/stage gates on performance; persistence
   separation (adaptive vs inappropriate) intact; Q04 = cleanup only;
   Q27 analogue matches SA-2 exactly; no global "good player" score
   anywhere (the persistence composite subtracts inappropriate
   persistence per scoring-plan §7 and both stay separately exported).
4. **The recording layer is largely sound** (single derivation point,
   frozen canonical context, uncounterfeitable session fields, monotonic
   sequence + gap detection, real idempotence guards) — but the **export
   boundary loses the science**: dispositions/validity never reach the
   payload (B2), and the Qualtrics summary ships 52 structurally-zero
   legacy variables that read as low-trait evidence (B1).

## Findings register

Ids are stable (`A*` = Track A, `B*` = Track B). Full narrative evidence
for each id is preserved in the two audit transcripts; the essential
claim + file:line is kept here.

### DEFECT / fix planned (this branch)

| Id  | Sev     | Claim (evidence)                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Authority contradicted                                                                               | Fix shape                                                                                                                                                                                                         |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B6  | MAJOR   | Dock's `pilot_zone_entered` silently swallowed: `pilotRoute.emit` writes to a sink only installed by `PilotZoneScene` (`PilotZoneScene.ts:239`), but `DockScene extends RoomScene` and calls `notePilotZoneEntered` (`DockScene.ts:575`) with sink null. Projection: 11 events vs 12 entries.                                                                                                                                                                                | Route telemetry contract (`pilotRoute.ts` header: every `pilot_*` event is recorded route telemetry) | Buffer emits while no sink is installed; flush on install.                                                                                                                                                        |
| A7  | MAJOR   | M09 reminder mention double-counted: `valeBeat()` calls `noteM09NpcMention` and is invoked from BOTH `getPromptBody` and `getPromptOptions` (`StationConcourseScene.ts:809,863` + call sites), so each Vale talk records 2; check-1 stage allows unlimited re-talks vs one return-beat talk.                                                                                                                                                                                 | Ledger equal-reminder gate (`evidenceLedger.ts:485-488`); registered form: one NPC mention per check | Record the mention once per prompt-open (body path only).                                                                                                                                                         |
| A8  | MAJOR   | Declared M10 reminder control never recorded: `noteM10ReminderLogViewed` has no call site; `PilotZoneScene.openStationMap` calls only the M09 hook (`PilotZoneScene.ts:517-519`); `reminder_log_views` constant 0.                                                                                                                                                                                                                                                           | The window's own registered control-variable declaration (`m10ComponentPromise.ts:173` + ledger)     | Call the M10 hook beside the M09 hook in `openStationMap`.                                                                                                                                                        |
| B2  | BLOCKER | Opportunity/validity dispositions never reach the export: `pilotCoverage.ts:10-12` documents they live in "the raw export" — `ResearchRuntime.buildExportPayload` (`:738-765`) carries neither the validity register nor coverage; both probes are DEV-gated, so in production the dispositions die with the tab.                                                                                                                                                            | `pilotCoverage.ts` documented contract; SA-13 register purpose                                       | Add `measurement_validity` + `pilot_coverage` snapshots to the export payload (additive, bounded, no event change).                                                                                               |
| A3  | MAJOR   | Prompt option order/focus undocumented in data: first option pre-focused (`RoomScene.ts:1735`), accept-first fixed order on M09/M10 offers; only `choice_value` logged. Spec Q12 ruling §7: fixed order must be "documented and exported".                                                                                                                                                                                                                                   | `Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md:215` (ruling §7)                                      | Export `option_position`, `option_count`, `focused_default` in the choice metadata of `pilot_npc_beat` + window choice events (additive metadata on provisional events; no canonical name touched). UI unchanged. |
| A15 | MINOR   | `invalid_detail` dropped on the `missing` branch for M24/M26 (`exteriorWindows.ts:1015-1022,1050-1057`) so `deck_never_depleted` / `channel_never_disconnected` never reach the register; the `invalid` branch passes it.                                                                                                                                                                                                                                                    | Register/ledger closure contract (`windowKit.ts:269-273`)                                            | Pass the same detail on the missing branch.                                                                                                                                                                       |
| A13 | MINOR   | **Resolved as NOT A DEFECT on verification**: `m03Reset.ts:314-315` documents "the store tray is the single marked home" — with one home, `homes_correct = objects_restored` is definitionally true and `homes_total: 1` honest. The ledger's plural "homes" is generic phrasing. No change.                                                                                                                                                                                 | —                                                                                                    | none                                                                                                                                                                                                              |
| A28 | MINOR   | **Reclassified NOTE on verification**: `case_moved` derives from inventory-store change events that genuinely cannot attribute pointer vs keyboard; `'pointer_or_keyboard'` is truthful, already present in recorded projections, and the typed `InputMode` union does not govern free metadata. Changing the value would break data continuity for no informational gain. Plumbing true attribution through the store is listed as P-move for the research owner if wanted. | —                                                                                                    | none                                                                                                                                                                                                              |
| A14 | MINOR   | Contradictory documented validity rule for M03 exposure (`returnEpisodeModel.ts:68-78` says `insufficient_opportunity`; `m03Reset.ts:356-361` says never a validity marker; code follows the latter).                                                                                                                                                                                                                                                                        | Internal doc consistency                                                                             | Fix the stale comment to match the implemented (declared) rule. Docs only.                                                                                                                                        |
| A16 | MINOR   | Legacy V1 M22/M25 yard-job ids would hit `markOpportunityInvalid` on undeclared ids and throw if ever re-enabled (`closureSession.ts:274-293`, `validity.ts:106-114`). Unreachable today.                                                                                                                                                                                                                                                                                    | Defensive contract                                                                                   | Guard the closure call on declared ids (no behaviour change on the live route).                                                                                                                                   |

### PROPOSAL / research owner (no production change; see the proposal doc)

| Id           | Sev     | One-line problem                                                                                                                                                                                                     |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 (A1)      | BLOCKER | Route construct coverage diverges from the 33-item battery (13 items unmeasured; 6 windows measure an instrument outside the battery); M↔Q binding and `itemIdentity` basis unapproved.                              |
| P2 (B1)      | BLOCKER | 52 structurally-zero legacy summary variables ship to Qualtrics/Supabase as if observed (violates "missing is never low-trait evidence", SCIENTIFIC-AUTHORITY:1110-1112) — fix requires an export-contract decision. |
| P3 (A2)      | MAJOR   | M02 completes only on correct retrieval and the UI discloses correctness ("Not the requested case") — censors low performers; fix shape changes the mechanic.                                                        |
| P4 (A4)      | MAJOR   | Declared comprehension gates asserted, never evaluated (10× unconditional `setComprehension('passed')`).                                                                                                             |
| P5 (A5)      | MAJOR   | Fixed exterior site order, no counterbalancing, no cross-exposure record between the two zero-benefit modules (M24/M26).                                                                                             |
| P6 (A6)      | MAJOR   | M24/M26 invalidation correlates with the measured behaviour (immediate stop after the signal is the response most likely dropped).                                                                                   |
| P7 (A9)      | MAJOR   | M07 review-closure converts non-engagement into a valid zero-progress observation (M20's identical pattern is ledger-sanctioned; M07's is not).                                                                      |
| P8 (A10)     | MAJOR   | M12 reference values render beside every line (correctness oracle); `errorDetected` = tile activation.                                                                                                               |
| P9 (A11)     | MAJOR   | Stale never-name list (`coverageSchedule.ts:143`): review can prompt return to windows whose non-return is the datum, and wrongly never-names M22/M25.                                                               |
| P10 (A12)    | MAJOR   | M13 permanent beacon (`isDone: () => false`) — a standing directive no other window gets. Fix needs a definition of "engaged/done" for M13.                                                                          |
| P11 (B3/A18) | MAJOR   | Reload replays: same identity, fresh windows, no prior-exposure/contamination stamp; retroactive `participant_absent` for pre-reload work; two contradictory accounts exportable.                                    |
| P12 (B4)     | MAJOR   | Keep-alive export frozen at first pagehide; a drop-out's server record stops at their first alt-tab.                                                                                                                 |
| P13 (B5/A25) | MAJOR   | "Entered then quit" coded `censored` (pilot windows) vs `missing/participant_absent` (IP windows); the IP `censored` branch is dead code.                                                                            |
| P14 (A19)    | MINOR   | Questionnaire-handoff notice delivered mid-route while windows are open.                                                                                                                                             |
| P15 (A20)    | MINOR   | M14 omission warning contingent on the measured omissions.                                                                                                                                                           |
| P16 (A21)    | MINOR   | M12 occasions not matched (numeric vs string error, different zones, fixed order).                                                                                                                                   |
| P17 (A26)    | MINOR   | Lab orientation preconditions flagged by M16/M17 but not M15/M18.                                                                                                                                                    |
| P18 (A22)    | MINOR   | `offer_position` = declaration order, not realised visit order.                                                                                                                                                      |
| P19 (B9)     | MINOR   | `windowId` mutated in flight for M09 (`m09_check_1`→`m09_check_2`); not a stable key.                                                                                                                                |
| P20 (B10)    | MINOR   | `technicalFailure()`/`invalidate()` lack already-closed guards (asymmetric with `stop`/`markAbsent`).                                                                                                                |

### NOTE (recorded, no action)

- A17: BFI-2 wording in one `src/` comment — permitted for traceability.
- A23: M06 practice loops until correct with no in-module stop path (framing note).
- A24: M15 identifiers historical (`layered_cipher` naming for a causal-model mechanic).
- A27: cross-module prior-exposure links only partially recorded (M12, M03, M24-deck).
- B8: `session_start` / `scene_start` unlisted in event-schema.md.
- B11: legacy `strategy_revision_count` construct mixing (scoring-plan §4 watch item; unreachable on route, still shipped).
- B12: scoring-plan §5 stale re DataQualityTracker (already acknowledged in SCIENTIFIC-AUTHORITY §8).
- B13: no client-side size check on the full export; 413 treated as retryable.
- B14: DEV-console `in_progress` export always 422s.
- B15: dead `kind` parameter in `buildPayload` contract.
- B16: dead gtag loader + `VITE_GOOGLE_ANALYTICS_ID` still in tree — one import from live third-party tracking in a participant bundle.
- B17: tracked `.env` has no ingest config; export refuses with `missing_configuration` (deployment checklist).
- B18: evidence ledger (construct labels, no wording) ships in the participant bundle via `coverageSchedule.ts:77`.
- B19: SCIENTIFIC-AUTHORITY §14.4 "NOT STARTED" table stale vs existing `src/measurement/q*.ts` modules (developer-launch only; contamination-stamped).
- Track-B verification limits: conclusions rest on committed projections (windows mostly declined by the driver) and no live Supabase round-trip was run.

## Implementation status (this branch)

| Id  | Status                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A7  | IMPLEMENTED — mention recorded once per prompt open in `getPromptBody` (`StationConcourseScene.ts`); `valeBeat()` is pure.                                                                                                                                                                                                                                                                  |
| A8  | IMPLEMENTED — `noteM10ReminderLogViewed()` called beside the M09 hook in `PilotZoneScene.openStationMap`.                                                                                                                                                                                                                                                                                   |
| B6  | IMPLEMENTED — `DockScene` installs the pilot route log sink for its pilot branch and removes it on shutdown; the Dock's `pilot_zone_entered` now records.                                                                                                                                                                                                                                   |
| A15 | IMPLEMENTED — `closeM24`/`closeM26` pass `invalid_detail` on the missing branch too.                                                                                                                                                                                                                                                                                                        |
| A14 | IMPLEMENTED — `M03_MIN_EXPOSURE_MS` comment corrected to the adopted record-only rule (threshold still flagged for owner confirmation).                                                                                                                                                                                                                                                     |
| A16 | IMPLEMENTED — legacy yard M22/M25 invalidation guarded on declared ids (no live-route behaviour change).                                                                                                                                                                                                                                                                                    |
| A13 | CLOSED (not a defect — single marked home is by design and documented).                                                                                                                                                                                                                                                                                                                     |
| A28 | CLOSED (reclassified NOTE — truthful unattributable value; changing it would break data continuity).                                                                                                                                                                                                                                                                                        |
| B2  | IMPLEMENTED — export augmenter: `ResearchRuntime` accepts an installed provider; the pilot layer supplies `measurement_validity` (full register serialization) and `pilot_coverage` (items + operational summary + closure) into every export payload, production included (the DEV window probes are unchanged). Additive PROVISIONAL fields in the INT-2 precedent.                       |
| A3  | IMPLEMENTED — every NPC-beat choice (`pilot_npc_beat`, which carries the M09/M10 offer answers' surrounding beats) now exports `option_position`, `option_count`, `focus_default_position` (the fixed order + default focus, per the spec's "documented and exported" ruling). UI unchanged. Station prompt options outside the NPC-beat path are NOT yet instrumented — noted as residual. |

## Cross-check duty

Before any DEFECT row above is implemented, the main writer re-reads the
cited lines and confirms the claim; a fix that would change any emitted
event name, any canonical payload key, or any participant-visible text
beyond the cited contract is demoted to PROPOSAL instead of implemented.
