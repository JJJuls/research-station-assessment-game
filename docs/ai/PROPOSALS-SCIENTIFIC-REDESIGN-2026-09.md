# Scientific redesign proposals — 2026-09-13 audit

Status: **PROPOSALS ONLY. Nothing in this document is implemented.**
Each entry follows the required form: problem → evidence → scientific
consequences → alternatives → recommendation → the exact research-owner
decision required. Source: the consolidated audit
(`docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md`), tree
`5d05115`. Companion defect fixes (things the code already contradicts
in documented authority) are implemented separately and listed there —
none of them resolves any decision below.

---

## P1 — Route construct coverage vs the 33-item battery (BLOCKER)

**Problem.** The active participant route measures M01–M26. M01–M12 are
verbatim Q01–Q12 (BFI-2 C); M19–M26 map to Q21–Q28 (MPS PDD/IP). But
M13–M18 operationalise BESSI-192 Information Processing — an instrument
that is **not part of the final 33-item battery** — while Grit-S
Q13–Q20 and Goal-Time Q29–Q33 (13 of 33 items) have **no measurement
window on the route**. Standalone modules for Q03/Q04/Q16/Q23/Q27/
Q29-Q31/Q30/Q32/Q33 exist in `src/measurement/` but are reachable only
from developer launches. The M↔Q crosswalk is explicitly an open
decision (crosswalk D-X-2), and `coverageSchedule.ts:191` stamps
`itemIdentity: 'mission_brief'` on all 26 items although the crosswalk
records `module_header` / `none` for most.

**Evidence.** `docs/game/PILOT-M01-M26-IMPLEMENTATION-CROSSWALK.md:29-31,
590-592`; `M01-M26-IMPLEMENTATION-LEDGER.md` item texts; `evidenceLedger.ts:109-154`;
`SceneRouter.ts:74-84`; no pilot importer of the `src/measurement/q*.ts` modules.

**Consequences.** Any Q01–Q33 criterion comparison is impossible for 13
items; ~390 s of the item-owned time budget measures an out-of-battery
construct; the exported identity basis contradicts the repository record.

**Alternatives.**

1. Approve the battery-subset route as-is (declare the pilot a
   Q01–Q12 + Q21–Q28 instrument; drop the 13 items from pilot claims;
   re-label M13–M18 exploratory out-of-battery).
2. Extend the route with windows for Q13–Q20/Q29–Q33 (large build; the
   NEXT-10 rulings already sketch several).
3. Replace M13–M18 slots with battery-item windows (budget-neutral).

**Recommendation.** (1) for the imminent pilot — it is the only option
that requires no new measurement design — combined with an explicit
statement in the export (`coverage_scope`) naming the measured subset,
and correcting the `itemIdentity` stamp to the crosswalk's values.

**Decision required.** (a) Approve/reject the M↔Q binding table as
derived; (b) choose alternative 1/2/3; (c) rule the correct
`itemIdentity` values for the export.

---

## P2 — Zero-filled legacy summary in the export (BLOCKER)

**Problem.** `ScoringManager.computeSummary` derives 52 of 59 summary
fields from counts of 57 legacy event names of which exactly one fires
on the pilot route; `QualtricsBridge.buildReturnUrl` and the Supabase
payload serialise every field. A completing participant lands with
`game_persistence_total=0`, `organization_prep_count=0`, … — zeros that
read as observed low-trait evidence.

**Evidence.** `ScoringManager.ts:75-369`; `QualtricsBridge.ts:160-167`;
`ResearchRuntime.ts:746`; all three committed projections.

**Consequences.** Directly contradicts SCIENTIFIC-AUTHORITY:1110-1112
("A contaminated, technically failed, absent or otherwise invalid
opportunity … must never be converted into low trait evidence") for
every summary consumer.

**Alternatives.**

1. Null/absent semantics: route-inapplicable summary fields are omitted
   (or an explicit sentinel) and a `summary_scope` field names the
   applicable set.
2. Gate `buildReturnUrl` to identity/context/data-quality fields only
   until tier-3/4 scoring rulings land.
3. Leave as-is and handle at analysis time (fragile: the Qualtrics
   record itself stays misleading).

**Recommendation.** (2), because it changes no field _semantics_ and
cannot be misread downstream; (1) as the follow-up once the export
consumer confirms it tolerates absent embedded-data fields.

**Decision required.** Choose 1/2/3 and rule the exact field list that
may continue to ship (this is an export-contract change on the
scoring-plan/event-schema side; the current 59-field contract is
authority and must not be silently altered).

---

## P3 — M02 completion gated on correct retrieval; correctness disclosed (MAJOR)

**Problem.** The case-workspace window completes only after both
retrieval probes are answered correctly; wrong picks show "Not the
requested case." and do not advance. Participants who cannot find the
case are censored; `retrieval_errors` measures guesses-to-success.

**Evidence.** `m02CaseWorkspace.ts:467-535`; `InventoryOverlayScene.ts:888-890`;
crosswalk §3 ("gates … never a correct answer").

**Consequences.** Q02's observation is conditioned on task success —
selective missingness correlated with the construct; feedback is a
correctness oracle (demand characteristic).

**Alternatives.**

1. Advance the probe on any pick; record correctness silently.
2. Cap attempts (advance after N wrong picks, recorded).
3. Keep as-is and re-label the window's evidential strength.

**Recommendation.** (1), with neutral feedback ("Noted.") — closest to
the ledger's declared raw variables.

**Decision required.** Choose 1/2/3 and the feedback wording rule.

---

## P4 — Comprehension gates asserted, never evaluated (MAJOR)

**Problem.** Ten unconditional `setComprehension('passed')` calls and
two hardcoded `comprehension: 'passed'` payloads assert gates the
ledger declares as evaluated; only M06 practice and the IP orientation
actually test anything; M01's declared gate is never set.

**Evidence.** `exteriorWindows.ts:283-806` (10 sites);
`StationConcourseScene.ts:703`; `ExteriorRecoveryYardScene.ts:1977`;
`e2e/final_scientific_gates.spec.ts:356-370`.

**Consequences.** Validity metadata overstates what was checked; a
non-comprehending participant is indistinguishable from a comprehending
one.

**Alternatives.** 1. Re-declare these gates as `not_required` in the
ledger (honest downgrade). 2. Add minimal behavioural comprehension
probes per window (design work). 3. Status quo.

**Recommendation.** (1) now; (2) selectively where the ledger marks the
gate load-bearing.

**Decision required.** Per-window ruling: which comprehension gates are
required, and their form.

---

## P5 — Exterior order fixed; no counterbalancing or cross-exposure record (MAJOR)

**Problem.** `EXTERIOR_SITE_ORDER` fixes rig-before-uplink; the
crosswalk's REV-MAJ-8 asked for `exterior_job_order` counterbalancing
and `proto_m24_depletion_signal_seen` / `proto_m26_futility_signal_seen`
prior-exposure stamps; `YARD_JOB_ORDERS` exists but nothing calls it.

**Evidence.** `exteriorEpisodeModel.ts:58-64`; `yardJobs.ts:78-83`;
crosswalk §3.

**Consequences.** Order effects between the two zero-benefit modules
are uncontrolled and unrecorded.

**Alternatives.** 1. Wire the existing `YARD_JOB_ORDERS`
counterbalancing (participant-id parity) + record cross-exposure. 2. Record-only (keep fixed order, stamp exposure). 3. Status quo.

**Recommendation.** (1) — the mechanism already exists in-tree.

**Decision required.** Approve the counterbalancing key (what rotates,
keyed on what) and the two prior-exposure stamps.

---

## P6 — M24/M26 invalidation correlated with the measured behaviour (MAJOR)

**Problem.** A participant who stops immediately after the utility-stop
signal may never open the prompt that acknowledges the signal; the
window is then coded `invalid (insufficient_opportunity)`. The cleanest
Q27-target response is the most likely to be dropped.

**Evidence.** `m24MagnetRigModel.ts:325-339`; `m26ChannelModel.ts:368-378`;
`exteriorWindows.ts:1023-1067`, `ExteriorRecoveryYardScene.ts:1359-1371,1487-1496`.

**Consequences.** Systematic missingness negatively correlated with the
construct — biases every M24/M26 analysis.

**Alternatives.** 1. Auto-acknowledge: the standardised banner itself
counts as signal receipt (acknowledgement becomes a process variable,
not a validity gate). 2. Code unacknowledged-but-shown as valid with a
flag. 3. Status quo.

**Recommendation.** (1); the banner is already standardised and
auto-fires, so receipt is guaranteed by construction.

**Decision required.** Rule which event constitutes "signal received"
for validity, and whether acknowledgement stays a validity condition.

---

## P7 — M07 non-engagement becomes a valid zero-progress observation (MAJOR)

**Problem.** The deck review closure _opens_ M07 (`opened_by:
'review_closure'`) and completes it with `stages_completed: 0` instead
of marking it absent (as it does for M01/M06/M12/M14). M20's identical
pattern is ledger-sanctioned (`returned` raw variable); M07's is not.

**Evidence.** `m07Calibration.ts:265-284`; `returnWindows.ts:450-468`;
`reviewClosure.ts:30-36`; crosswalk §2 ("missing is never a low value").

**Alternatives.** 1. Align M07 with the absent-marking group. 2. Add a `returned` raw variable to M07's ledger entry (sanctioning the
current shape). 3. Status quo.

**Recommendation.** (1).

**Decision required.** Choose 1/2 (this changes either emitted events on
non-engagement or the ledger's declared variables — both authority).

---

## P8 — M12 correctness oracle and click-equals-detection (MAJOR)

**Problem.** Reference values render permanently beside every line, the
surface instructs "activate again to correct to the reference", replies
"Line already matches the reference.", and `errorDetected` is set by
mere tile activation — the declared "visible-but-not-salient matched
error + inspection process measure" is not what runs.

**Evidence.** `m12QualityControl.ts:251-253`; `surfaceModels.ts:564-592`;
`evidenceLedger.ts:591-604`.

**Alternatives.** 1. Hide references until a line is activated
(inspection becomes a real act; detection = correcting the wrong line
vs right line distinguishable). 2. Keep UI; demote the window's
evidential strength label. 3. Status quo.

**Recommendation.** (1) — smallest UI change that restores the declared
process measure.

**Decision required.** Approve the surface change and the resulting
process-variable definitions.

---

## P9 — Stale never-name list steers the review toward the datum (MAJOR)

**Problem.** `NEVER_NAMED = ['M22','M24','M25','M26']` predates v2: it
never-names two windows that are no longer stopping-rule measures
(M22 report revision, M25 questionnaire notice) while the deck review CAN
name M19/M20/M21/M23 — persistence/return windows whose _non-return_ is
the datum.

**Evidence.** `coverageSchedule.ts:143`; `UtilityCoreDeckScene.ts:604-609`.

**Alternatives.** 1. Re-derive the list from the v2 ledger (never name
any window whose measure is voluntary return/continuation: M19, M20,
M21, M23, M24, M26). 2. Never name any open window at the review. 3. Status quo.

**Recommendation.** (1).

**Decision required.** Approve the exact v2 never-name set.

---

## P10 — M13 permanent beacon (MAJOR)

**Problem.** The lattice bench's guided-station predicate is
`isDone: () => false`, so after the other guided stations close the
beacon points at M13 for the rest of `workshop_work` — a standing
directive no other window receives (unequal salience).

**Evidence.** `RecordsWorkshopScene.ts:500-507`; `pilotRoute.ts:557-566`.

**Alternatives.** 1. Terminal on first engagement (any `proto_m13_*`
open). 2. Remove M13 from the guided list (uncommanded like the feed
console). 3. Status quo.

**Recommendation.** (1) — guided once like its peers, never a standing
directive afterwards.

**Decision required.** Choose 1/2 (changes the guided-opportunity
presentation of a measurement window).

---

## P11 — Reload semantics (MAJOR)

**Problem.** A mid-route reload keeps identity + event sequence but
resets route/windows/validity register: the participant can replay
windows as fresh, both passes code `valid`, and the post-reload closure
retroactively codes pre-reload work `participant_absent`. The
measurement layer never learns `page_load_index` changed. The governing
architecture doc still claims "No client-side persistence exists".

**Evidence.** `pilotRoute.ts:8`; `validity.ts:62-65`; `SessionState.ts:59-69`;
`EventStore.ts:246`; `STATE-AND-SESSION-CONTINUITY.md §4`.

**Alternatives.** 1. Stamp every declared opportunity of a reloaded
session (`page_load_index > 0`) with `prior_exposure:
reloaded_mid_route` and add `page_load_index` to register + coverage
export (record, don't block). 2. Hard-invalidate reloaded sessions. 3. Persist window state across reloads (large; new failure modes).

**Recommendation.** (1) — analysis can then separate first-exposure
data without any runtime behaviour change.

**Decision required.** Choose 1/2/3; update the stale architecture doc
either way.

---

## P12 — Keep-alive export frozen at first pagehide (MAJOR)

**Problem.** The compact keep-alive envelope is frozen per
`(identity, page_load_index, status, kind)` at the FIRST pagehide and
re-sent verbatim on every later pagehide; a participant who alt-tabs at
minute 2 and abandons at minute 25 leaves only minute-2 data on the
server.

**Evidence.** `ResearchExportClient.ts:422-430, 600-641`;
`ResearchRuntime.ts:656-659`.

**Alternatives.** 1. Include the last event `sequence` in the freeze
key (a pagehide with new events builds a fresh envelope; identical
retries still dedupe). 2. Refresh unconditionally (loses retry dedupe). 3. Status quo.

**Recommendation.** (1).

**Decision required.** Approve the envelope-key change (export
infrastructure contract).

---

## P13 — Two codings of "entered, then quit" (MAJOR)

**Problem.** Pilot windows code abandonment `censored`; IP windows
(M13–M18) code it `missing/participant_absent` (their `censored` branch
is dead code). Analysts pooling `participant_absent` mix "never took it
up" with "took it up and abandoned".

**Evidence.** `windowKit.ts:250-284`; `informationProcessing/windowState.ts:205-240`.

**Alternatives.** 1. IP explicit-exit → `censored` (wire the dead
branch). 2. Document the per-subsystem semantics as intended. 3. Status
quo.

**Recommendation.** (1) unless the IP design intended absence semantics
— the dead branch suggests it did not.

**Decision required.** Rule the disposition for explicit mid-task exit
per subsystem.

---

## P14–P20 (MINOR, summarised)

- **P14** questionnaire notice mid-route (`m25HandoffModel.ts:42-44`):
  move to post-route? / keep (it is itself the M25 shell). Decision:
  placement.
- **P15** M14 warning contingent on omissions (`m14IncidentDesk.ts:324-331`):
  always-on neutral confirmation vs contingent warning. Decision: form.
- **P16** M12 occasions unmatched (numeric vs transposed-string error,
  zones, fixed order). Decision: accept as documented heterogeneity or
  redesign o2.
- **P17** lab orientation preconditions flagged by M16/M17 only.
  Decision: uniform rule for M15/M18.
- **P18** `offer_position` records declaration order, not visit order.
  Decision: add realised-order stamps?
- **P19** M09 `windowId` mutates (`m09_check_1`→`m09_check_2`).
  Decision: stable id + `check` payload field?
- **P20** `technicalFailure()`/`invalidate()` lack closed guards
  (late failure flips completed observations). Decision: is the
  conservative retro-invalidation intended? Document or guard.

---

_Prepared by Fable, 2026-09-13, from the two audit transcripts. No
entry here may be implemented without the named decision._
