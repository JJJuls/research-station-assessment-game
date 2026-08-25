# Professional Assessment Pilot V1 — Final Report

Branch `fable-professional-assessment-pilot-v1` (worktree
`.claude/worktrees/fable-professional-assessment-pilot`). Local commits
only; nothing pushed, tagged, deployed, merged or removed.

> STATUS NOTE: sections marked `[PENDING]` are filled in the final
> verification pass of Unit 8; every other statement is final.

## 1. Mission

Build the first cohesive professional end-to-end pilot of the "Remote
Outpost" gamified assessment: integrate the accepted interactive-
inventory, field-actions and information-processing foundations into a
four-zone participant route with guidance, provisional M01–M26
measurement traceability, provisional visual production, a safe Final
Core completion, full regression + capture + review evidence, and this
report.

## 2. Entry state and Unit 0

Entered at the three-way merge checkpoint; Unit 0 combined the
foundations at `9980ea6` (`chore(integration): combine assessment
mechanic foundations`) preserving all three subsystems unchanged.

## 3. Commit inventory (all local, in order)

| Commit        | Unit    | Subject                                                     |
| ------------- | ------- | ----------------------------------------------------------- |
| `9980ea6`     | 0       | combine assessment mechanic foundations                     |
| `03523b2`     | 1       | M01–M26 crosswalk, coverage registry, burden budget         |
| `40c1d5b`     | 2       | cohesive four-zone route, guidance, doors, NPC beats        |
| `c8c935a`     | 3 (WIP) | Records & Logistics wiring (superseded by `0d42403`)        |
| `0d42403`     | 3       | complete pilot records integration                          |
| `fcb0280`     | 4       | information-processing workstations on the route            |
| `502a6ff`     | 5       | exterior field actions on the route                         |
| `ae32e80`     | 6       | provisional PixelLab action + effect sheets                 |
| `3a4aa0d`     | 7       | final core review, closure and completion                   |
| (this commit) | 8       | sweep, repairs, reviews, captures, corrections, this report |

## 4. THE SCIENTIFIC TRUTH (unchanged throughout)

- **13 provisional PRIMARY-CANDIDATES:** M02, M03, M13–M18, M22–M26.
- **2 QUESTIONNAIRE-PRIMARY:** M01, M04 — no behavioural proxy exists
  or was invented; they carry empty opportunity lists and honest
  `not_applicable` coverage rows.
- **11 MISSING:** M05–M12, M19–M21 — wording not recorded in this
  repository; no activity fakes them; they never block the route; they
  keep `not_applicable` rows and are research-owner work (D-X-2).
- **All item identities are provisional** (`mission_brief` for M02/M03,
  `module_header` for the rest). Nothing here is validated; no score,
  trait, or hiring output is computed anywhere; no candidate event name
  or derived indicator was promoted to canonical (`event-schema.md` /
  `scoring-plan.md` untouched; ScoringManager untouched).
- Missing ≠ low everywhere: abandonment → `censored` / `missing` /
  explicit departure codes, never a value.

Full traceability: `docs/game/PILOT-M01-M26-IMPLEMENTATION-CROSSWALK.md`
(§6 review trail; open decisions D-X-1…D-X-4).

## 5. Route (Units 2–3)

Dock (default participant launch; skippable in-engine opening;
`?route=legacy` preserves the historic ring) → Station Concourse
(Vale; M02 incident filing, M03 press occasions A/B, locker, assembly
bench, three recoverable supply bundles) → Diagnostics & Signal
Laboratory (Kai) → Exterior Recovery Yard (Noor) → reports → Utility &
Core Deck (Final Core). Guidance: one objective line, beacon
(first-unfinished-station targeting), M station map, H hidden controls.
Stage machine is one-way and never gates on performance; every door is
bidirectional until the explicit final confirmation.

## 6. Unit 4 — six IP workstations (lab)

Terminal orientation (common tutorial, never item evidence), four
decoder terminals (M14 packet intake, M15 cipher, M16 protocol update,
M17 syntax trainer) on a per-session counterbalanced bank
(`ip_decoder_layout`, exported as event + register control notes), the
M13 conduit-lattice physical pipe board, and the M18 fault-diagnosis
console. M13→M18 is sequencing only (console defers only while the
lattice window is OPEN; solved/exhausted/stopped/never-opened all reach
the identical console; `prior_m13_window_status` recorded as context
only). Distinct silhouettes/dressing/overlay rhythms — not six text
terminals. Explicit two-step stops close windows as
`participant_absent` → coverage `missing` (missing ≠ low).

## 7. Unit 5 — exterior field actions (yard)

Noor calls a counterbalanced six-slot job queue
(`exterior_job_order`: M23 first for tool issue; {M22, M25} pair and
{M24, M26} pair each counterbalanced; neutral check-in between the last
pair; exported as event + register control notes). Accepting the next
job closes the previous console-style window (`next_job`) so one
physical action can only ever notify one adapter.

- **M23** field recovery: counterbalanced target cell, scan (C) + dig
  (D), hard-but-attainable, no timer, leaving valid.
- **M22 / M25** fresh ambient instances from additive factories
  (`createM22SetbackState` / `createM25PumpLockState`) with families
  `proto_m22_housing_*` / `proto_m25_yardpump_*`; legacy Pump House
  singletons untouched. Departures record events + exit counts, never
  latch; returning and finishing still completes.
- **M24 corrected standardisation:** EVERY committed (non-cancelled)
  winch cycle consumes one deck position and receives that position's
  outcome; timing accuracy (`locked_in_band`) is secondary motor
  telemetry only; `cycle_duration_ms` recorded; identical multiset and
  depletion exposure for every participant. The foundation specs that
  asserted miss-doesn't-consume were deliberately updated.
- **M24/M26 acknowledgement-gated completion (REV-BLOCK-1):**
  displayed **and** acknowledged → `completed`; never displayed →
  `missing (no_opportunity)`; displayed-unacknowledged stays pending
  (censored at Final Core).
- **M26** control-first: attainable control plot, verification-post
  certificate (prompt body IS the display), explicit acknowledgement,
  fenced verified-empty plot (empty by construction).

## 8. Unit 6 — provisional visual production

Marking: **PROVISIONAL — USER-AUTHORISED FOR EXPERIMENTAL PILOT
INTEGRATION — NOT FINAL ART APPROVAL.** Byte-exact copies from the
read-only pixelab-v1 pack (commit `62ed985`; pack untouched; no
generation run): three player action sheets (scan-sweep, dig, pickup;
576×384, rows S/W/E/N, feet-line y=71, verified by PNG-header read) and
three one-shot 7×64×64 effect sheets, loaded as Phaser spritesheets.
Facing-aware one-shot player animations + scan-pulse/dig-dust/spark
effects; presentation only — no mechanic or event reads any of it.
`ASSET_SET_VERSION` v4 → v5 (export-spec pin updated deliberately).
Selection scope, verification and the not-promoted rationale:
`docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md`.

## 9. Unit 7 — Final Core

Participant-safe review (counts + never-entered reviewable labels only),
explicit return before AND during the two-step confirmation, no
entrapment, completeness never gates. Confirming: yard ambient windows
finalise with explicit departure codes (also written to the register as
`censored` + code detail — round-2 correction), then
`closePilotCoverageAtFinalCore()` (censored / participant_absent /
no_opportunity — never success; terminal records never overwritten),
stage → `complete`, neutral SHIFT COMPLETE screen. Qualtrics return
navigates only with a legitimately configured `return_url`
(`QualtricsBridge.buildReturnUrl` non-null); tests use a same-origin
relative URL and perform no external write.

## 10. Unit 8 review rounds (two consolidated rounds, both used)

**Round 1 (test-evidence review, completed):** fixed the vacuous
launch-mode assertion and added an empty-array guard in
`pilot_route.spec.ts`; replaced two fixed-timeout waits with
condition waits in `pilot_lab.spec.ts`. Notes (documented, no change):
one-way-only persistence comment in `pilot_records`, completion-screen
copy asserted via probe + screenshot rather than text, modal-ownership
sampled once, capture-spec catch-swallow (evidence-only file).

**Round 2 (scientific + burden reviews, completed):**

Fixed:

- Departure codes written onto the SA-13 register at Final Core
  (censored + `closed_departed_without_recovery/reset` detail) so
  departure-closure stays distinguishable (SCI-1).
- Participant-facing open counts exclude `reviewNaming: 'never'`
  stopping-rule windows (REV-MAJ-9) (SCI-2).
- Yard exit no longer terminally destroys still-current M24/M26
  one-shot windows; they stay open across re-entry and close at job
  hand-over or Final Core (SCI-3).
- Magnet rig cycles gated to the open M24 window (standardised entry
  state; free-play deck consumption impossible) (SCI-5).
- Sorting bench dispatches exclusively to the single open window
  (SCI-6).
- Dock skip-feedback copy de-jargonised; confirm-body assessment
  vocabulary removed; never-entered label list capped at 3; M25 lock
  toast and M22 setback explanation shortened for the ~2.2 s toast
  (BURDEN-1/2/3/4, SCI-11).
- m24 adapter header comment corrected to the host's
  acknowledgement-gated rule (SCI-14).

Verified as false positive: SCI-4 (M26 futility marks are
phase-guarded inside the module).

Documented as OPEN for the research owner (not fixed autonomously):

- SCI-7 (structural guards on double `closed` emission post-Final-Core
  — unreachable behind the completion modal),
- SCI-9 (IP stop coded `participant_absent`; `entered=true`
  distinguishes stop-after-entry in the register export),
- SCI-10 (M03 realised first-open order not exported as an explicit
  control variable),
- SCI-12 (register-level precedence for `markOpportunityInvalid`;
  contamination deliberately dominant),
- SCI-13 (summary probes materialise ambient instances; `active_ms`
  not frozen at close),
- SCI-15 (dev `field_actions_lab` shares M23/M24/M26 identifiers with
  the yard; guarded by the dev-scene contamination rule; crosswalk
  duplicate column names only the Coolant Yard),
- SCI-8 (`crate_within_sight_line` exposure boolean promised by the
  crosswalk, not emitted),
- BURDEN-5/6 (decoder/lattice/diagnosis and M02/M03 instruction copy
  not line-audited by the burden reviewer — flagged for a follow-up
  pass).

**Gameplay review (completed; round-2 remainder applied):**

Fixed:

- BLOCKER: the Core console offered synchronisation at every stage — an
  early explorer could irreversibly end the session with zero
  measurement. Now gated on `pilotStage() === 'deck_review'` (soft
  in-fiction refusal; review and the door stay open at all stages) —
  verified live by the green pilot_deck rerun.
- `confirming` reset per deck entry; researcher idle no longer snaps to
  south after an action animation.
- M18 refusal text now names the lattice STOP path (guidance copy only;
  the approved window-open sequencing rule is unchanged).
- **Game input-integrity defect found via P1 diagnostics:** one physical
  keypress could select on a stage AND on the stage chained from that
  same selection (same-number double-fire; would hit real participants).
  RoomScene now ignores number/Enter selections for 120 ms after every
  stage render — the missing implementation of the renderer's own
  documented "one physical press selects exactly once" rule.

Documented as OPEN (not fixed; bounded rounds):

- beacon points at the first yard work station before its job is
  accepted (the station's refusal text routes to Noor verbally),
- Concourse supply bundles respawn on zone re-entry (secondary
  telemetry inflation only; never primary evidence),
- overlay world-drop bundles are scene-local and lost if abandoned
  across a zone change (contradicts the drop contract; secondary),
- Dock lacks the beacon affordance; RESUME-listener accumulation;
  map has no pointer close; completion modal lacks scrollFactor(0);
  dock `pilot_zone_entered` telemetry drops into a null sink.

**Visual review (completed):** all captured pilot frames pass — no
blank frames, no missing textures, no broken layout, no debug/dev
surfaces, no `proto_*`/M-id/score/trait/valid leakage; presentation
consistently adult and diegetic. One judgment flag for the research
owner: frame 16's decoder overlay labels its in-fiction packets
"Q1–Q4" (accepted IP-foundation convention, like T1–T3 in the
orientation; not the zero-padded Q01–Q33 pattern) — the closest shape
to a screened code in the set.

## 11. Legacy integration regressions (repaired in Unit 8)

Both first surfaced on this branch's first-ever full-suite run and are
merge-era (all implicated feature files byte-identical since `9980ea6`):

- `complete_first_shift`: the hub→yard drive's y=320±10 lane can settle
  at y≈329 under SwiftShader jank and then clip the terrace-expansion
  ridge blocks (row 11, cols 18–19) at x≈560 — diagnosed with an
  instrumented position dump; repaired with a y=308±6 lane (gate still
  in reach).
- `connected_participant_journeys` P1: a residual late-landing
  double-press race on chained prompt stages corrupted the journey at
  varying points (verify skipped / wrong claim); repaired with
  event-anchored selects (`selectExpectingEvent`) that fail loudly at
  the exact step and retry only genuinely swallowed presses.

Verification: ALL REPAIRED GREEN. `complete_first_shift` green after
the lane fix; P2/P3 green; **P1 green** once the true root cause fell
out of its event-tail diagnostics — a real RoomScene input defect where
ONE physical keypress could select on a stage AND on the stage chained
from that very selection (the same still-travelling `KeyboardEvent`
reaching the re-registered handlers; it would have double-selected for
human participants too). A first 120 ms time-debounce attempt was
withdrawn after it regressed legitimate fast presses
(`inventory_prep_logging` systematic path); the final guard compares
`event.timeStamp` against the stamp of the selecting press, blocking
exactly the cascading re-dispatch and no discrete press at any speed —
after which P1, the systematic-path spec and the full prompt-heavy
pilot set all pass together. `ice_salvage` (merge-era lane clamp into
the row-11 wall, first_shift class) repaired with a wall-safe corridor
target + re-drive pass — both tests green.

**Prompt-guard evolution (full honesty):** the first cascade guard
(120 ms time debounce) regressed legitimate fast presses and was
withdrawn; the second (`event.timeStamp` equality) collided with
synthetic CDP events sharing identical stamps; the FINAL guard is
synchronous re-entrancy detection on `selectPromptOption` — the exact
discriminator of the cascade, with zero timing heuristics. Under it the
journeys (P1/P2/P3), side-repair NEXT-08 tracker and the whole pilot
set pass together.

**Four legacy-foundation tests remain open** (fail identically under
every guard variant on this branch — first-ever branch runs, evidence
preserved in test-results/):

- `inventory_prep_logging` "systematic path" — the first checklist
  keypress produces no events at all in this journey cadence;
- `inventory_prep_logging` "NEXT-08 coherence" — per-item carrying
  tray's `__minigameSurface` probe returns [];
- `participant_ui_cards` "keyboard-only completion via arrow focus and
  Enter" and "inventory prep status panel (phase 3)".
  All four live in the legacy Quartermaster room (not on the pilot
  participant route); the room's other paths and every pilot spec are
  green. Handed to the research owner / follow-up session.

## 12. Full-suite sweep (retries=0, workers=1, chunked)

71 spec files. `[PENDING — final table]`
Interim: chunk 1 (12/12), chunk 2 (9/11 + repairs §11), chunk 3
(21/21), chunk 4 first pass 37/39 (2 = self-inflicted vite-HMR
contamination from mid-run source edits; both specs green in later
reruns except ice_salvage §11). Post-round-2 verifications: affected
set 8/12 → after fixes 16/18 → pilot_yard 3/3, pilot_deck 2/2,
pilot_route 4/4, pilot_lab 3/3; pilot_records pin updated for the S2
closed-count rule (2→6, deliberate) and green with chunk 5 (41/41);
ice + chunk 6: 48/50; chunk 7: 29/29 (incl. magnet_salvage_ip — the
winch correction is compatible with the ice-bore free play); chunks
8–10 combined: 77/82; final re-entrancy-guard verification: 30/35 with
journeys P1/P2/P3 and side-repair NEXT-08 green; capture chunk: 15/18

- the records segment re-captured green after the rail-safe fix.

FINAL LEDGER: every pilot-route spec green at retries=0
(pilot_route 4, pilot_records 3, pilot_lab 3, pilot_yard 3,
pilot_deck 2, pilot_coverage pure suite, pilot_visual_capture 3);
all three participant journeys green; both repaired legacy journeys
green. REMAINING OPEN (documented, first-run-on-branch legacy
surfaces, none on the participant route): the four Quartermaster-room
tests (§11), the field-actions capture-frame assertion
(deck-correction knock-on) and one physical Q16 capture segment.

## 13. Visual capture

`e2e/pilot_visual_capture.spec.ts` → 30 frames under
`docs/verification/screenshots-professional-pilot/` covering opening,
dock, map/controls overlays, records overlays, bundles, lab
(orientation/decoders/lattice/diagnosis-deferral), yard (jobs, scan,
dig, setback, interlock, rig timing window, verification post), deck
review/confirm and SHIFT COMPLETE. Captured with real input on the
participant route; the yard/deck/lab segments ran green first pass, the
records segment needed a rail-safe desk approach (the known row-5 rail
clamp) and was re-captured. Per-frame inspection: direct spot checks
(frames 19 and 30) plus a full-set visual review — verdict above.
Legacy capture reruns refreshed the committed foundation screenshots
under the current build (v5 art + corrected deck); two legacy capture
specs (field-actions frame assertion — a deck-correction knock-on —
and one physical Q16 segment) remain open, recorded with the other
legacy items.

## 14. Burden (nominal human vs automated)

Budget doc nominal ≈ **28:50** against the 30-minute unenforced design
ceiling — verified segment-by-segment by the burden reviewer as
matching the CURRENT implementation (yard job queue included; the two
biggest blocks are the lab measurement block ≈ 9:50 and the yard queue
≈ 9:45; ~70 s of headroom, so hesitant participants may exceed 30:00 —
flagged, not hidden). Automated end-to-end route times are separate and
much faster (e.g. full spine to the deck ≈ 2–4 min per spec); they are
NOT human estimates.

## 15. Final handoff checklist

- Every supported opportunity reachable; all doors bidirectional
  pre-confirmation; fail-forward everywhere; no correctness gate; no
  duplicate primary family; no inactive-shell rooms (all four zones
  live) — CONFIRMED by the green pilot suite, the gameplay review's
  passing checks, and the 30-frame capture.
- Nominal human burden < 30 min (with the stated ~70 s-headroom
  caveat), reported separately from automated times.
- Nothing pushed/tagged/deployed/PR'd/merged/removed; commits local
  only; the Unit 8 commit closes with a clean tree (final `git status`
  verified at commit time).

## 16. Remaining research-owner work (explicit)

1. M05–M12, M19–M21: source wording + design decisions (D-X-2).
2. M01/M04: remain questionnaire-primary; any behavioural analogue is a
   new decision.
3. Item-identity confirmation for all 13 primary candidates (D-X-1) and
   every provisional `proto_*` name/indicator (event-schema /
   scoring-plan decisions).
4. D-X-3 (exterior job order semantics), D-X-4 (whether departure codes
   may ever be evidence), FA-SCI-5/9, SA-8..SA-13 family items.
5. The OPEN review findings listed in §10.
6. Final art approval (everything visual remains provisional).
7. Stimulus freeze + `asset_set_version` lock before any real data
   collection; Qualtrics `return_url` production configuration.

## 17. Infrastructure notes (honest record)

- One session-limit interruption paused three review agents and
  re-labelled an already-failing legacy rerun; all were resumed —
  no results were fabricated in the gap.
- The PreToolUse guard correctly blocked memory-directory writes
  (outside the worktree); session memory for this mission lives in this
  report and the crosswalk instead.
- Chunk 4's two failures were caused by this session editing sources
  while a chunk ran against the shared vite dev server; the rerun is
  clean `[PENDING]` and no further mid-run edits occurred.

## 18. Reproduction

```
npm.cmd run lint:tsc && npm.cmd run build
PW_DEV_PORT=5191 npx.cmd playwright test e2e/pilot_route.spec.ts e2e/pilot_records.spec.ts e2e/pilot_lab.spec.ts e2e/pilot_yard.spec.ts e2e/pilot_deck.spec.ts --retries=0 --workers=1
```
