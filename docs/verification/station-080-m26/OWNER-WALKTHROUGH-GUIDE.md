# Station 080 — owner walkthrough guide (U24 Part B)

**Readiness is not completion.** This guide is the gate G.1 artefact of U24
(`U24-CONTRACT.md` §G): it prepares an informed owner walkthrough of the
complete connected route. Three statements govern how to read it:

- **G.1 (walkthrough readiness).** The walkthrough is ready only when Parts A
  and B are committed, the route completes by ordinary input at both
  viewports and in the minimal route (V-1 PASS), this guide has been checked
  against the S1 frames (V-10 PASS), and every row that is not PASS, every
  accepted limitation and every open prerequisite is listed below.
  **Status: MET at this documentation revision** (the documentation-only
  amendment of `cbc53dd`; the owner's ruling of 23 October 2026). V-10 and
  G.1 close only when the corrected guide meets these requirements
  (confirmed by the independent check of the final documentation), the
  evidence preservation is verified (on 23 October the durable `B\`,
  `B-closeout\`, `B-closeout-2\` and Part A evidence matched their
  manifests) and the documentation revision is committed (this revision).
  The owner's named exception EX-B-734 covers the acceptance of the Part B
  integration commit and the start of this walkthrough only. G.1 closes
  nothing else: not G.2, not G.3, no other failed or partial row and no
  scientific implementation finding. The assessment is in
  `U24-END-TO-END-REPORT.md` §1.
- **G.2 (required U24 verification complete) is NOT reached.** It needs every
  acceptance row of every part PASS or excepted by name, including the
  independent raw-event recount (layer R), which is Part C (RC-1 = a), and
  the correction or named exception of every reproduced cross-task
  candidate. U24 Part B reports several rows FAIL or PARTLY (§5).
- **G.3 (prerequisites before participant collection) is NOT satisfied.**
  U24 never satisfies G.3; the open items are listed in §6. Nothing here is
  clearance for participant collection, and nothing here is a scientific
  validation of any row.

Every route step below was driven by ordinary input in S1 (real keyboard
and pointer input from the Dock, no shortcut). The steps with a frame were
checked against the S1 frames at 800 × 600 and 1280 × 720
(`…\u24-end-to-end-evidence\B\frames\`, copied and verified against
`B.SHA256-manifest.txt` on 23 October 2026; frame names are given without
their running number; the 91 names are the same at both viewports). **Steps with
no frame** (driven and logged in the per-stage logs `stage-logs\S1-*.json`,
but not framed, so not checked against a picture): the Dock tutorial and the
north door (the Dock is framed only on entry); M10 d1's key-card offer; M09
checks 2 and 3 at the gauge; the key card handed to Kai; the probe handed
back; Mast 04's outdoor stages; the driver handed back and "finished
outside"; the logbook left with Kai; and the handover prompt's body — frame
`handover-desk-after-notice` shows the world only, so the I-1 handover text
("… field components: see the field tray.") has no runtime picture; it is
pinned by a source-text check (`m22_setbacks.spec.ts`, the I-1 = a test).
The times are AUTOMATION times from the S1 run (the drivers never pause to
read); they are never a human duration estimate.

## 1. Setup (about 5 minutes)

1. From the U24 worktree, run `npm.cmd run start` (the Vite dev server; the
   DEV probes need it). **Use the dev server for the walkthrough.** A
   production build (`npm.cmd run build`, then `npm.cmd run preview`) has no
   DEV helpers and treats every launch as `production` (or `test`), and both
   modes send the session export to the ingest address configured in the
   environment (`VITE_RESEARCH_INGEST_URL`). Use a preview build only if that
   address is unset or is a test endpoint you control.
2. On the dev server, open a synthetic launch so the session is identifiable
   and nothing real is contacted (with no `launch_mode` the dev server runs
   in `development`, which never exports):

   `http://localhost:<port>/?participant_id=OWNER-WALK-01&game_session_id=OWNER-WALK-01&condition=pilot&game_version=u24-walkthrough`

   Leave out `return_url` (no navigation leaves the machine). Note: the DEV
   page template still requests an external script (`unpkg.com`, the
   GitHub-corners embed in `index.html`, skipped in a `BUNDLE=true` build);
   U24's runs answered it locally (report §7, finding F-B6).

3. Play at a normal window size; if time allows, a second time at about
   800 × 600.
4. Keep a notes file open and note the time at each zone change.

## 2. The route (ordinary play; follow the one objective line)

| #   | Episode / zone                                | What you do (as S1 did it)                                                                                                                                                                                                                                                                                                                | Rows you meet                                                                                     | S1 frames (both viewports)                                                                                                                                                                                                                                                                                                                        | Automation time |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | Dock                                          | the arrival terminal and the movement tutorial; the north door                                                                                                                                                                                                                                                                            | none                                                                                              | `room-dock-entry`                                                                                                                                                                                                                                                                                                                                 | —               |
| 2   | Concourse (ep 1)                              | Vale: the briefing, the watch offer, the key-card offer (an alarm, then the recap), the lamp job; the lamp job first; the plan board; the incident desk (two packets); the quality packet; the gauge; "Handover confirmed"                                                                                                                | M05 o1 (lamp), M09 (watch; check 1), M10 d1 (key card), M01 o1, M14, M12 o1                       | `room-concourse-entry`, `npc-vale-briefing`, `npc-vale-watch-offer`, `npc-vale-lamp-offer`, `m05-lamp-first-view`, `m01-board-first-view`, `m14-orientation`, `m14-results`, `m12-o1-first-view`, `m09-gauge-check-1`, `npc-vale-handover`                                                                                                        | ≈ 2.5 min       |
| 3   | Records Workshop (ep 2)                       | the Work Order Board ("Take the orders."); the case workspace; the dispatch console; the second quality packet; the lattice bench; Label Press A; the cutter (two coupons) and the calibration bench; the board sign-off                                                                                                                  | M02, M06, M12 o2, M13, M03 A, M04 (two jobs), M07 start                                           | `room-workshop-entry`, `board-to-workshop_work`, `m02-organise-first-view`, `m02-request-1`, `m02-request-record`, `m06-practice-first-view`, `m06-work-period`, `m12-o2-first-view`, `m13-network-1-first-view`, `m13-results`, `m03-press-a-first-view`, `m04-job-1-pieces`, `m07-bench-episode-2`, `m04-job-2-pieces`, `board-to-lab_briefing` | ≈ 4.5 min       |
| 4   | Concourse, Diagnostics Laboratory (ep 3)      | the gauge on the lab pass; Kai's briefing (the probe borrowed); the console orientation; the evidence table, the protocol console, the training rig, the diagnostic board; the key card handed to Kai; the probe handed back; "done"                                                                                                      | M09 (check 2), M11 lab, M15, M16, M17, M18, M10 d1 (fulfilled)                                    | `room-laboratory-entry`, `npc-kai-briefing`, `lab-orientation-first-view`, `m15-orientation`, `m15-results`, `m16-card`, `m16-results`, `m17-rig-first-view`, `m17-learning-feedback`, `m18-card`, `m18-results`                                                                                                                                  | ≈ 4 min         |
| 5   | Recovery Yard (ep 4)                          | Noor's briefing (the driver borrowed); the flag job; Mast 04 (the antenna's outdoor stages); the support console; the coupling panel; the excavation stake and Plot A; the magnet rig; the uplink posts; the sensor post; the driver handed back; "finished outside"; the yard logbook accepted                                           | M11 yard, M05 o2, M20 (outdoor preparation), M08, M19, M23, M24, M26, M25 (loops), M10 d2 (offer) | `room-yard-entry`, `npc-noor-briefing`, `m05-flag-first-view`, `m08-choice`, `m19-card`, `m19-both-lines-finished`, `m23-plot-a-opened`, `m23-failure-choice`, `u23-mast-prompt-plot-a-west-ring`, `m24-rig-check`, `m26-panel-check`, `m26-explanation`, `m25-post-first-view`, `npc-noor-logbook-offer`                                         | ≈ 6.5 min       |
| 6   | Laboratory, Concourse, Workshop return (ep 5) | the logbook left with Kai; the gauge (check 3); Vale's return check-in and her one question; the feed console (two channels to their hold); Label Press B; the feed console after its notice; the calibration bench; the relay bench; the report desk; the return batch; the handover desk (the questionnaire notice); the board sign-off | M10 d2 (delegated), M09 (check 3), M25 (question), M20, M03 B, M07 end, M21, M22, M01 o2          | `npc-vale-return`, `npc-vale-m25-question`, `room-workshop-return-entry`, `m20-card`, `m20-both-held`, `m03-press-b-first-view`, `m20-notice-channel-a`, `m07-bench-return`, `m21-relay-bench-first-view`, `m22-report-1-returned`, `m22-after-ratings`, `m01-return-batch-first-view`, `handover-desk-after-notice`, `board-return-sign-off`     | ≈ 6 min         |
| 7   | Utility Deck, Core (ep 6)                     | the station-record review (two steps); the three feeds; the Core synchronised                                                                                                                                                                                                                                                             | the review closes every open row                                                                  | `room-deck-entry`, `deck-record-closed`, `deck-feeds-up`, `room-core-entry`, `core-sync-review`, `core-completion-notice`                                                                                                                                                                                                                         | ≈ 0.6 min       |

Correction of the preparation table (`U24-OWNER-WALKTHROUGH-PLAN.md` §2)
against S1: M11's first loan is in the Laboratory (episode 3), not the
Concourse; M10's second delivery (the yard logbook) is offered in the Yard
and delivered on the return; M09's second check is the gauge on the
Concourse pass toward the laboratory; the M25 question is asked at Vale's
return check-in once the three required loops were run and the M24 / M26
windows are recorded closed, not at the review; M20's yard part is the
outdoor preparation only — the measured channels are the Workshop feed
console.

## 3. What to try on purpose (about 15 minutes of the total)

- **Help, leave, pause, return** at least once per surface kind (work
  surface, overlay, field HUD, NPC dialog): press H; press ESC; LEAVE; walk
  away; come back; the work is kept. S4 showed, at 800 × 600: the ESC menu
  freezing the avatar; the incident desk's help opening and closing by key
  and by pointer; the desk left mid-decision and reopened on the same
  decision; and that a station is entered by SPACE / E only (a click does
  nothing). **The pause menu shows no Resume button** — only "Sound: on" and
  the controls card, cut at the bottom — and clicking where Resume should
  be does nothing; press ESC to resume (finding F-B9, pre-existing; report
  V-2).
- **Pointer only** for one whole window (the quality packet or Press A) and
  **keyboard only** for another (the incident desk or the case workspace) —
  S5 did exactly this at 800 × 600.
- **Decline** one optional offer (an M05 job or an M11 loan): the route
  continues without penalty (S2).
- **Never open** the calibration bench (M07). After the review, the debug
  export (`window.researchRuntime.exportEventsJSON()` in DEV, the guide's
  one "inspect the data" step) shows M07 null with `no_eligible_event` /
  `presented_not_entered` (Part A, S-M07a; S2 here).
- **Reload** once in the Workshop return.
  - **What you will see.** The page load replays from the Dock (the
    opening, the Dock tutorial, Vale). Items already met hold their offers
    back (S3). The calibration bench, if it was opened and you open it
    again, shows its held-back screen (the bench title, the owner's lines,
    LEAVE only) — Part A evidence (A-12); in S3 the bench was not reopened
    after a reload. In S3 the route was finished by ordinary input after
    three reloads. (S3's second reload was at Vale's return check-in in the
    Concourse, with the M25 question open — not inside the Workshop return
    as the plan's S3 wording has it; report §2.)
  - **What you may also see.** A station worked in an earlier page load and
    only shown again in the later one (the plan board, the case workspace,
    the press batches, the dispatch console, the quality packets, the
    sensor post) is re-offered,
    and if you do not open it again its row reads `declined` in that load,
    not `interrupted` (report §7, finding F-B2; an open question). A
    question open at the reload (S3: Vale's M25 question) reads
    `no_eligible_event` afterwards, not `interrupted` (F-B8), and a station
    never presented in any load reads `interrupted` (F-B7).
  - **Not visible to you, but recorded.** The keep-alive export the page
    sends when it is hidden is rejected by the browser (its body is larger
    than the browser's keep-alive limit), so it never arrives (report §7,
    finding F-B1).

## 4. Checklist of known judgement items (accepted limitations; shown, not changed)

| Item                                              | Where                                                                         | What to judge                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M16 beacon salience                               | Laboratory, after M15                                                         | does the console beacon pull attention from M17 / M18?                                                                                                                                                                                                                                         |
| U18 H1                                            | M15 question views                                                            | the bottom row is about 105 px below the content                                                                                                                                                                                                                                               |
| Noor's "test rig" line                            | Laboratory                                                                    | does it read naturally with the M18 card?                                                                                                                                                                                                                                                      |
| Feedback auto-clear (2.2 s)                       | work surfaces                                                                 | can a line outlive a view change in a confusing way?                                                                                                                                                                                                                                           |
| Single amber feedback colour                      | all surfaces                                                                  | acceptable (VIS-1 = a: kept)?                                                                                                                                                                                                                                                                  |
| Settling ADVANCE (approved appearance, unchanged) | calibration bench                                                             | while "Settling…", ADVANCE keeps focus and is drawn like the live LEAVE: does it read as inert?                                                                                                                                                                                                |
| G4                                                | calibration bench, the same load after the review                             | the bench opens live but is inert — your disposition is a G.3 item (12)                                                                                                                                                                                                                        |
| F-1                                               | M07 held-back screens                                                         | the status text is small                                                                                                                                                                                                                                                                       |
| Held-back wording after a reload                  | M07 held-back screens                                                         | the three owner-worded screens read as intended                                                                                                                                                                                                                                                |
| TRY versus SET ASIDE salience                     | M19                                                                           | acceptable (§5.343)?                                                                                                                                                                                                                                                                           |
| **The U23 mast prompt box**                       | Yard, Plot A's west ring (`u23-mast-prompt-plot-a-west-ring`, both viewports) | U23 accepted it "for this integration" and retained it for this complete-game visual review (V-6, the visual reviewer's judgement in the report). Your disposition after the walkthrough (accept for collection, or a later presentation amendment with a mockup) is a G.3 item (6; VIS-2 = a) |
| M05 competing briefed tasks                       | Concourse ep 1                                                                | is walking between briefed stations acceptable as latency (I-2 = a: accepted for this walkthrough only; a decision is required before collection)?                                                                                                                                             |
| M22 report lines                                  | Workshop return                                                               | report 1 now reads "Coolant coupling — line check" and "Excavation field — survey record" (I-1 = a, `m22-setbacks-v4`); report 2 still has "Relay coupling — recovered" (not covered by the ruling; finding F-B4)                                                                              |
| Fonts                                             | everywhere                                                                    | Windows fonts only; other platforms not verified                                                                                                                                                                                                                                               |

## 5. Rows that are not PASS, accepted limitations and open questions

The full status of every acceptance row, its evidence kind and evidence path
is in `U24-END-TO-END-REPORT.md` §3. Listed here with their status:

- **Rows not PASS** (report §3; each FAIL is pre-existing at 43f12de, with
  baseline proof in the report):
  - V-2 **FAIL** — RESUME by pointer (F-B9), C-8, the M14 GP-1 pattern,
    C-6; gaps: keyboard-only NPC dialog and field HUD evidenced by S2 / S1,
    1280 × 720 only as far as S1 goes (`reproduction\S4.json`,
    `diagnostics\ESC-MENU-CLASSIFICATION.md`, `V7-RESULTS.md`);
  - V-3 **FAIL** (M16 cells, C-6 / C-7) and PARTLY (named gaps; report §4);
  - V-4 **PARTLY** — layer R pending Part C;
  - V-5 **FAIL** on (b) — F-B8, F-B7, and F-B2 open (report §7;
    `exports\S3.json`, `diagnostics\S3-BASE-COMPARISON.md`);
  - V-6 **PARTLY** — the settled completion notice not framed, the steps
    without a frame (above), non-Windows fonts; defects F-B9, F-B10
    (`VISUAL-REVIEW.md`);
  - V-7 **PARTLY** — C-2 not reproduced by inspection only;
  - V-9 **PARTLY** — B-8's premise (F-B3);
  - V-12 **FAIL** on (e) — F-B1;
  - V-11 **EXCEPTION-CONDITIONS-MET (P-1)**, never PASS — lint:tsc, build,
    changed-file ESLint, git diff --check and the whole-branch scope audit
    (0 paths outside the union of allowlists A and B) passed; the
    post-commit verify-unit exited 1, its only FAIL lines naming the ten
    untracked .agents/ / .codex/ files, hash-identical before and after the
    commit (handoff field 6; logs\c-07-verify-unit.log,
    precommit-gate-hashes.json, postcommit-gate-hashes.json,
    branch-outside-union.txt);
- **Regression outcomes** (all exit 1; report §9; REG §5.400): the
  `pilot_return` M25 `pending` / M21 `pending` outcomes (pre-existing, the
  named commit-only exception of contract B.17); `pilot_closure` `:154` —
  FAIL, pre-existing (fails at the Deck's west door on 43f12de in 2 of 3
  full-route runs, landing-dependent;
  `diagnostics\PILOT-CLOSURE-154-CLASSIFICATION.md`);
  `pilot_records` `:706` — FAIL: the scheduled run stopped at a pickup
  (`:734`) with no trace, so that occurrence's cause is not shown; one rerun
  on the work tree reached the base's M05 failure at `:854`
  (`diagnostics\PILOT-RECORDS-706-CLASSIFICATION.md`); in the Part B
  closeout a fresh 43f12de extraction stopped at the same `:734` step, its
  trace showing the press taken by the Case Workspace station, while the
  cbc53dd run reached `:854`
  (`…\u24-end-to-end-evidence\B-closeout-2\PILOT-RECORDS-734-TARGETED-RUNS.md`);
  the scheduled occurrence is not shown to share that mechanism, test
  positioning versus a participant-facing interaction conflict is
  unresolved, and the run counts establish no failure rate; the owner's
  named exception EX-B-734 covers the `:734` stop for the commit's
  acceptance and this walkthrough only — the test does not PASS, no
  harmless flakiness is established and the investigation stays before
  participant collection (§6, item 13; report §3); `pilot_route`, and
  `pilot_records` in the runs that reach `:854` (B-8 / F-B3);
  `final_scientific_gates` (M08 schedule);
  `participant_completion_handoff` `:1094` (F-B1); the legacy capture specs
  and `world_v1_interactions` `:184` (identical at 43f12de); seven look /
  route-capture specs (an unset capture-output directory, environmental).
- **Findings for the owner** (report §7): F-B1 keep-alive export never
  delivered; F-B2 a re-presented station reads `declined` after a reload;
  F-B3 the bare-route check's M05 premise; F-B4 report 2's "Relay coupling —
  recovered"; F-B5 further stale registry labels; F-B6 the DEV template's
  external request; F-B7 / F-B8 two V-5 (b) clauses after a reload; F-B9
  the pause menu's missing Resume control; F-B10 further visual defects;
  the measurement-adjacent observations (the ESC time excluded as
  `unusable_controls`, the frame helper's movement inside M23, default
  focus across measured choices); the register's S2 ambiguities. The
  owner's reload-policy directions (a) to (h) of 23 October 2026 for F-B2,
  F-B7 and F-B8 (REG §5.403) are approved but not implemented: they need a
  bounded correction unit, and no row status changes until then.
- **Reproduced cross-task candidates (V-7)**, pre-existing at the Part A
  commit: C-6 (M16 unguarded resume: the time after leaving counted as
  active; reproduced in M16 only), C-7 (M16 comes back live after the
  review), C-8 (a results page reached by NEXT lands on an actionable
  control; reproduced in M15), and the GP-1 focus pattern on M14's results
  pages. C-2 as defined (M15 / M16 / M18 hotkeys) did not reproduce (by
  inspection).
- **U23 verification exceptions that bear on the route** (U23 acceptance
  §3, rows 1–3): the assignment-oracle comparison waived for B4, L1, L2; no
  direct runtime evidence for ESC during an active guidance part, part-one
  duration, restart timing after pre-emption and suspension on region exit;
  inspection-only evidence for the unreachable busy refusals and hidden
  controls, the L1 branch-coverage limitation, the missing `stop_confirmed`
  input-mode assertion and the X4 title discrepancy.
- **The assignment coupling** (AS-1 = a): one bit of the session id drives
  the two-option form and order factors of ten rows (M01, M02, M06, M08,
  M12, M13, M17, M21, M22, M24). U25 is scheduled before collection (not
  authorised); U24's evidence for those rows is "pre-correction scheme
  (single-bit)". The audit (`U24-ASSIGNMENT-AUDIT.md`) is recorded as the
  inventory for U23 item 5b; the owner has not accepted it as complete.
- The M04 extractor gap (REG §5.216); the M17 criterion decision (REG
  §5.87–5.88): criterion values are not to be read until it is decided.
- The legacy capture specs (superseded by the U24 full-route frames; not
  rewritten, I-3 = a); the legacy rows in `returnEpisodeModel.ts`; the
  `final_scientific_gates` M08 schedule exception.
- The compact export's omission rule (raw events dropped above 60 000
  bytes) — and finding F-B1, that the compact envelope still exceeds the
  browser's keep-alive limit.
- No postMessage channel to Qualtrics: the return is by URL only (S6).
- "Not scientifically validated" applies to every row.
- The M07 questions (M07-Q), unresolved before collection: data from builds
  before the L1 fix (only if such data will be analysed — nothing here
  implies that participant data exist); whether to record the departure
  route; a production guard for a return without a departure.

## 6. Prerequisites before participant collection (G.3) — all open

1. G.2 (every U24 row PASS or excepted by name; Part C's layer R) —
   including the pause menu's Resume control (F-B9) and the V-5 (b)
   findings.
2. U23 item 5b (the owner accepts the assignment audit as complete) and
   AS-1 (U25, then the refresh of the stale U24 evidence, audit §5).
3. The correction or named exception of every reproduced cross-task
   candidate (C-6, C-7, C-8 and the M14 GP-1 pattern; C-2 not reproduced).
4. The M05 competing-task rule (I-2).
5. The M04 extractor gap (REG §5.216) and the M17 criterion decision
   (REG §5.87–5.88).
6. Your disposition of the U23 mast-prompt colour (VIS-2), after this
   walkthrough.
7. A non-Windows font check.
8. A production-build check with a real (test) Qualtrics flow.
9. The privacy and security gate (`docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`)
   — including the DEV template's external request (finding F-B6).
10. M07-Q (the three questions above).
11. A participant-bundle export check (Part A's exports are harness
    captures; Part B's exports are the participant pipeline's own request,
    but from the DEV server with a mock ingest).
12. Your disposition of G4 (the bench opens live but inert after the review).
13. The `pilot_records` `:734` stop (added by the owner's ruling of 23
    October 2026; excepted by EX-B-734 for the commit's acceptance and this
    walkthrough only): the scheduled occurrence's mechanism, test
    positioning versus a participant-facing interaction conflict at the
    Workshop bundles, and a failure rate.

## 7. After the walkthrough

Your notes go to a new decision record; U24 resolves nothing from them. The
next units are yours to choose: U25 (the assignment correction), any
presentation amendments, the M05 rule, and the corrections of the
reproduced cross-task candidates and of the findings in the report §7.
