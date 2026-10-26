# Station 080 — owner walkthrough guide (U24 completion revision)

**Readiness is not completion.** This guide is the gate G.1 artefact of U24
(`U24-CONTRACT.md` §G), rewritten at the close of the consolidated U24
completion run of 25 October 2026 from the final S1 frames and evidence on
the final source `287dcc6`. Three statements govern how to read it:

- **G.1 (walkthrough readiness).** The walkthrough is ready only when Parts A
  and B are committed, the route completes by ordinary input at both
  viewports and in the minimal route (V-1 PASS), this guide has been checked
  against the S1 frames (V-10), and every row that is not PASS, every
  accepted limitation and every open prerequisite is listed below.
  **Status: MET at this revision** — the owner's ruling of 23 October 2026
  closed G.1 at the Part B documentation revision, and this run
  re-established its conditions on the final source (V-1 PASS on
  `287dcc6` at both viewports and in S2; the guide rewritten from the final
  frames; the lists below complete). G.1 closes nothing else: not G.2, not
  G.3, no other failed or partial row and no scientific implementation
  finding. The assessment is in `U24-END-TO-END-REPORT.md` §1.
- **G.2 (required U24 verification complete) is NOT reached.** It needs every
  acceptance row of every part PASS or excepted by name, including the
  independent raw-event recount (layer R, Part C — run in this completion
  run) and the correction or named exception of every reproduced cross-task
  candidate. The completion ledger reports several rows FAIL or PARTLY (§5).
- **G.3 (prerequisites before participant collection) is NOT satisfied.**
  U24 never satisfies G.3; the open items are listed in §6. Nothing here is
  clearance for participant collection, nothing here calls the game fully
  verified, and nothing here is a scientific validation of any row.

Every route step below was driven by ordinary input in S1 on the final
source (real keyboard and pointer input from the Dock, no shortcut). The
steps with a frame were checked against this run's S1 frames at 800 × 600
and 1280 × 720 (`B\frames\800x600\`, `B\frames\1280x720\` in the durable
completion evidence `…\2026\10\25\u24-completion-evidence\CP-04-FINAL`;
frame names are given without their running number; the 91 names are the
same at both viewports and the same as Part B's). **Steps with no frame**
(driven and logged in the per-stage logs `B\stage-logs\S1-*.json`, but not
framed, so not checked against a picture): the Dock tutorial and the north
door (the Dock is framed only on entry); M10 d1's key-card offer; M09
checks 2 and 3 at the gauge; the key card handed to Kai; the probe handed
back; Mast 04's outdoor stages; the driver handed back and "finished
outside"; the logbook left with Kai; the handover prompt's body (frame
`handover-desk-after-notice` shows the world only; the I-1 handover text is
pinned by a source-text check in `m22_setbacks.spec.ts`); and M14's results
page 2 (the S1 driver's ENTER after SHOW RESULTS now lands on the neutral
results text — the C-8 correction — so page 2 is reached by TAB or an arrow
key to NEXT and then ENTER, or by a click; the M14 landing test and route
spec cover it, the route spec by a click only). The
times are AUTOMATION times from this run's S1 (the drivers never pause to
read, and the machine was shared with other runs); they are never a human
duration estimate.

## 1. Setup (about 5 minutes)

1. From the U24 worktree at `287dcc6` or later, run `npm.cmd run start` (the
   Vite dev server; the DEV probes need it). **Use the dev server for the
   walkthrough.** A production build (`npm.cmd run build`, then
   `npm.cmd run preview`) has no DEV helpers and treats every launch as
   `production` (or `test`), and both modes send the session export to the
   ingest address configured in the environment (`VITE_RESEARCH_INGEST_URL`).
   Use a preview build only if that address is unset or is a test endpoint
   you control.
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

| #   | Episode / zone                                | What you do (as S1 did it)                                                                                                                                                                                                                                                                                                                | Rows you meet                                                                                     | S1 frames (both viewports)                                                                                                                                                                                                                                                                                                                        | Automation time (800 × 600 / 1280 × 720) |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Dock                                          | the arrival terminal and the movement tutorial; the north door                                                                                                                                                                                                                                                                            | none                                                                                              | `room-dock-entry`                                                                                                                                                                                                                                                                                                                                 | —                                        |
| 2   | Concourse (ep 1)                              | Vale: the briefing, the watch offer, the key-card offer (an alarm, then the recap), the lamp job; the lamp job first; the plan board; the incident desk (two packets; the results pages now land on their text — TAB or an arrow key to NEXT, then ENTER, or click NEXT, for page 2); the quality packet; the gauge; "Handover confirmed" | M05 o1 (lamp), M09 (watch; check 1), M10 d1 (key card), M01 o1, M14, M12 o1                       | `room-concourse-entry`, `npc-vale-briefing`, `npc-vale-watch-offer`, `npc-vale-lamp-offer`, `m05-lamp-first-view`, `m01-board-first-view`, `m14-orientation`, `m14-results`, `m12-o1-first-view`, `m09-gauge-check-1`, `npc-vale-handover`                                                                                                        | ≈ 3.8 / 2.4 min                          |
| 3   | Records Workshop (ep 2)                       | the Work Order Board ("Take the orders."); the case workspace; the dispatch console; the second quality packet; the lattice bench; Label Press A; the cutter (two coupons) and the calibration bench; the board sign-off                                                                                                                  | M02, M06, M12 o2, M13, M03 A, M04 (two jobs), M07 start                                           | `room-workshop-entry`, `board-to-workshop_work`, `m02-organise-first-view`, `m02-request-1`, `m02-request-record`, `m06-practice-first-view`, `m06-work-period`, `m12-o2-first-view`, `m13-network-1-first-view`, `m13-results`, `m03-press-a-first-view`, `m04-job-1-pieces`, `m07-bench-episode-2`, `m04-job-2-pieces`, `board-to-lab_briefing` | ≈ 7.0 / 5.8 min                          |
| 4   | Concourse, Diagnostics Laboratory (ep 3)      | the gauge on the lab pass; Kai's briefing (the probe borrowed); the console orientation; the evidence table, the protocol console, the training rig, the diagnostic board; the key card handed to Kai; the probe handed back; "done"                                                                                                      | M09 (check 2), M11 lab, M15, M16, M17, M18, M10 d1 (fulfilled)                                    | `room-laboratory-entry`, `npc-kai-briefing`, `lab-orientation-first-view`, `m15-orientation`, `m15-results`, `m16-card`, `m16-results`, `m17-rig-first-view`, `m17-learning-feedback`, `m18-card`, `m18-results`                                                                                                                                  | ≈ 6.0 / 5.0 min                          |
| 5   | Recovery Yard (ep 4)                          | Noor's briefing (the driver borrowed); the flag job; Mast 04 (the antenna's outdoor stages); the support console; the coupling panel; the excavation stake and Plot A; the magnet rig; the uplink posts; the sensor post; the driver handed back; "finished outside"; the yard logbook accepted                                           | M11 yard, M05 o2, M20 (outdoor preparation), M08, M19, M23, M24, M26, M25 (loops), M10 d2 (offer) | `room-yard-entry`, `npc-noor-briefing`, `m05-flag-first-view`, `m08-choice`, `m19-card`, `m19-both-lines-finished`, `m23-plot-a-opened`, `m23-failure-choice`, `u23-mast-prompt-plot-a-west-ring`, `m24-rig-check`, `m26-panel-check`, `m26-explanation`, `m25-post-first-view`, `npc-noor-logbook-offer`                                         | ≈ 7.4 / 7.2 min                          |
| 6   | Laboratory, Concourse, Workshop return (ep 5) | the logbook left with Kai; the gauge (check 3); Vale's return check-in and her one question; the feed console (two channels to their hold); Label Press B; the feed console after its notice; the calibration bench; the relay bench; the report desk; the return batch; the handover desk (the questionnaire notice); the board sign-off | M10 d2 (delegated), M09 (check 3), M25 (question), M20, M03 B, M07 end, M21, M22, M01 o2          | `npc-vale-return`, `npc-vale-m25-question`, `room-workshop-return-entry`, `m20-card`, `m20-both-held`, `m03-press-b-first-view`, `m20-notice-channel-a`, `m07-bench-return`, `m21-relay-bench-first-view`, `m22-report-1-returned`, `m22-after-ratings`, `m01-return-batch-first-view`, `handover-desk-after-notice`, `board-return-sign-off`     | ≈ 7.1 / 6.3 min                          |
| 7   | Utility Deck, Core (ep 6)                     | the station-record review (two steps); the three feeds; the Core synchronised; the completion notice (its CLOSE NOTICE control appears about a second after the data is sent)                                                                                                                                                             | the review closes every open row                                                                  | `room-deck-entry`, `deck-record-closed`, `deck-feeds-up`, `room-core-entry`, `core-sync-review`, `core-completion-notice`; the settled notice: `completion-notice-settled\<viewport>-settled.png` (from the S2 route)                                                                                                                             | ≈ 0.8 / 0.9 min                          |

Correction of the preparation table (`U24-OWNER-WALKTHROUGH-PLAN.md` §2)
against S1, unchanged from Part B: M11's first loan is in the Laboratory
(episode 3), not the Concourse; M10's second delivery (the yard logbook) is
offered in the Yard and delivered on the return; M09's second check is the
gauge on the Concourse pass toward the laboratory; the M25 question is asked
at Vale's return check-in once the three required loops were run and the
M24 / M26 windows are recorded closed, not at the review; M20's yard part is
the outdoor preparation only — the measured channels are the Workshop feed
console.

## 3. What to try on purpose (about 15 minutes of the total)

- **Help, leave, pause, return** at least once per surface kind (work
  surface, overlay, field HUD, NPC dialog): press H; press ESC; LEAVE; walk
  away; come back; the work is kept. S4 showed, at 800 × 600: the ESC menu
  freezing the avatar; the incident desk's help opening and closing by key
  and by pointer; the desk left mid-decision and reopened on the same
  decision; and that a station is entered by SPACE / E only (a click does
  nothing). **The pause menu now covers the world with an opaque pause
  screen and shows a Resume button, and one click on Resume resumes**
  (finding F-B9, corrected in this run and shown at both viewports); ESC
  still resumes too. Limits that remain (F-B10): Resume and the Sound
  toggle answer the pointer only (ENTER does nothing, although the card
  says "arrow keys and Enter"), ESC is the only keyboard way out, and the
  controls card below the button runs off the canvas at both viewports
  (every line still readable).
- **A console or bench left mid-series** (the evidence table or the
  protocol console): press ESC or LEAVE with a card open, walk away and
  come back. Its clock no longer runs while you are away: after the pause
  menu, the clock restarts only while the console's surface is open (C-6,
  corrected in this run). A console you never open before the
  station-record review shows the closed record afterwards and accepts
  nothing (C-7, corrected).
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
    opening, the Dock tutorial, Vale). A station you worked or answered in
    an earlier page load is held back: its offer is not repeated, or the
    station opens on a held screen (the calibration bench's held-back
    screen — Part A; the training rig's held view with the rig's title,
    CLOSED, the two owner-worded lines and LEAVE only — this run; the
    coupling panel, the feed console and the other RL-4 stations show the
    held screen under an unverifiable history). The handover desk does not
    offer the questionnaire notice after a reload (and never implies that
    you acknowledged it); the guided step moves on. In S3 the route was
    finished by ordinary input after three reloads (inside the evidence
    table; at Vale's return check-in with the M25 question open; after the
    Deck review).
  - **How the data reads afterwards** (the reload-correction units RL-0 …
    RL-4 under the owner's specification r3 of 23–24 October 2026; report
    §4, §7): a station worked in an earlier page load and only shown again
    reads `interrupted` (held), never `declined`; a question open at the
    reload (Vale's M25 question) reads `interrupted`; a station never
    presented in any load reads `not_presented`; a station briefed in the
    final load but never opened in any load reads `no_eligible_event`, as
    on a first load (S3's M16, M18, M19, M20); a station whose earlier
    history cannot be verified reads `interrupted` with the uncertain-history
    marker (RL-4). These readings are the register's as implemented; their
    scientific review stays with you (owner items A1–A7 in the handoff).
  - **Not visible to you, but recorded.** The keep-alive export the page
    sends when it is hidden is rejected by the browser (its body is larger
    than the keep-alive limit), so it never arrives; an abrupt departure may
    leave the data only on the device, and server receipt is not
    established for such a departure (finding F-B1; the owner's named
    exception D-1 b for V-12 (e); still a pre-collection blocker).

## 4. Checklist of known judgement items (accepted limitations; shown, not changed)

| Item                                                                  | Where                                                         | What to judge                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M16 beacon salience                                                   | Laboratory, after M15                                         | does the console beacon pull attention from M17 / M18?                                                                                                                                                                                                                                                                                                                                                                       |
| U18 H1                                                                | M15 question views                                            | the bottom row is about 105 px below the content                                                                                                                                                                                                                                                                                                                                                                             |
| Noor's "test rig" line                                                | Laboratory                                                    | does it read naturally with the M18 card?                                                                                                                                                                                                                                                                                                                                                                                    |
| Feedback auto-clear (2.2 s)                                           | work surfaces                                                 | can a line outlive a view change in a confusing way?                                                                                                                                                                                                                                                                                                                                                                         |
| Single amber feedback colour                                          | all surfaces                                                  | acceptable (VIS-1 = a: kept)?                                                                                                                                                                                                                                                                                                                                                                                                |
| Settling ADVANCE (approved appearance, unchanged)                     | calibration bench                                             | while "Settling…", ADVANCE keeps focus and is drawn like the live LEAVE: does it read as inert?                                                                                                                                                                                                                                                                                                                              |
| G4                                                                    | calibration bench, the same load after the review             | the bench opens live but is inert — your disposition is a G.3 item (12)                                                                                                                                                                                                                                                                                                                                                      |
| F-1                                                                   | M07 held-back screens                                         | the status text is small                                                                                                                                                                                                                                                                                                                                                                                                     |
| Held-back wording after a reload                                      | the M07, M17 and RL-4 held screens                            | the owner-worded screens read as intended (the M14–M20 U / M screens have inspection-only coverage for the M text — item B1)                                                                                                                                                                                                                                                                                                 |
| The held coupling panel's objective line                              | Yard, after a reload with the coupling panel held             | the Yard's objective line stays on the coupling for the whole exterior stage (the beacon and Noor's list still guide) — owner item C1                                                                                                                                                                                                                                                                                        |
| The Laboratory wall display and orientation under a held phase        | Laboratory, after a reload                                    | the wall display counts held phases as recorded; the orientation is skipped once a phase is held — owner item C4                                                                                                                                                                                                                                                                                                             |
| TRY versus SET ASIDE salience                                         | M19                                                           | acceptable (§5.343)?                                                                                                                                                                                                                                                                                                                                                                                                         |
| **The U23 mast prompt box**                                           | Yard, Plot A's west ring (`u23-mast-prompt-plot-a-west-ring`) | U23 accepted it "for this integration"; framed again on the final source — the named state (prompt over the plate) shows at 1280 × 720; the 800 × 600 frame caught the plot paused with the plates down, so the item is re-judged at 1280 × 720 only (the final visual review). Your disposition after the walkthrough (accept for collection, or a later presentation amendment with a mockup) is a G.3 item (6; VIS-2 = a) |
| M05 competing briefed tasks                                           | Concourse ep 1                                                | is walking between briefed stations acceptable as latency (I-2 = a: accepted for this walkthrough only; a decision is required before collection)?                                                                                                                                                                                                                                                                           |
| M22 report lines                                                      | Workshop return                                               | report 1 reads "Coolant coupling — line check" and "Excavation field — survey record" (I-1 = a, `m22-setbacks-v4`); report 2 still has "Relay coupling — recovered" (finding F-B4)                                                                                                                                                                                                                                           |
| The incident desk's results pages                                     | Concourse                                                     | each page lands on its text; NEXT by TAB or an arrow key and ENTER, or by a click (the label and footer no longer promise ENTER — the final fix round); with HELP focused, `b` still lands page 1 on HELP (M14 GP-1, uncorrected — owner item C3)                                                                                                                                                                            |
| The evidence table's (M15) and protocol console's (M16) results pages | Laboratory                                                    | NEXT still lands on an actionable control, so a second ENTER can skip or close the results (C-8 for M15 / M16, uncorrected — owner item C2)                                                                                                                                                                                                                                                                                  |
| Noor's yard briefing                                                  | Yard, on entry                                                | the longest dialogue runs past the bottom of the canvas at both viewports (its last instruction line is cut) and the "C — Scan" chip is drawn over the third choice; the three choices stay readable and selectable (finding F-C3; `RoomScene.ts` / `fieldActionKeys.ts` are outside this run's allowlist — owner item C5)                                                                                                   |
| The completion notice's first second                                  | Core                                                          | while its controls are held back, the body already says the data was received and the footer still says it is being sent (F-B10; `CoreChamberScene.ts` outside the allowlist)                                                                                                                                                                                                                                                |
| The held screens of M18, M19 and M20                                  | Laboratory, Yard, Workshop after a reload                     | LEAVE, the only control, is not focused (TAB focuses it; ESC leaves) — recorded, not changed                                                                                                                                                                                                                                                                                                                                 |
| Fonts                                                                 | everywhere                                                    | Windows fonts only (Courier New and Lucida Console fallback passes framed); other platforms not verified (D-3 = a; G.3 item 7)                                                                                                                                                                                                                                                                                               |

## 5. Rows that are not PASS, accepted limitations and open questions

The full status of every acceptance row (A-1–A-12, V-1–V-12, IR-1–IR-8),
its evidence kind and evidence path is in `U24-END-TO-END-REPORT.md` §3.
Listed here with their status:

- **Rows not PASS** (report §3):
  - V-2 **FAIL** — C-8 for M15 / M16 and the M14 GP-1 focus pattern remain
    reproduced (their remedies lie outside the completion allowlist; owner
    items C2 / C3); gaps: keyboard-only NPC dialog and field HUD evidenced
    by S2 / S1, not S5; 1280 × 720 only as far as S1 and the pointer-RESUME
    test go. Corrected in this run: RESUME by pointer (F-B9), C-6, C-8 for
    M14;
  - V-3 **PARTLY** — the M05 valid-zero cell (the register defines no
    treatment of a 0 ms start latency; owner item A2); every other named gap
    of Part B is covered by a fixture at HEAD or re-read under r3 (report §4);
  - V-4 **PARTLY** — layer R (the independent recount): every primary's
    disposition matches production and every primary matches L2; the
    comparisons that still differ are diagnosed and undecided (structured
    shapes the register does not define, register-silent denominators,
    two production departures from stated markers — owner items A8–A12;
    report §12);
  - V-6 **PARTLY** — the route steps without a frame (above); the settled
    completion notice is now framed; non-Windows fonts satisfy the clause by
    D-3 = a; F-B10 minors unchanged;
  - V-7 **PARTLY** — C-8 for M15 / M16 and M14 GP-1 still reproduced; C-2
    not reproduced (by inspection);
  - V-9 **FAIL** — one regression of this run's own change: the M14 route
    spec (outside the allowlist) presses ENTER on the results page as NEXT,
    which the C-8 landing made neutral (owner item C7); the backlog
    corrections themselves are verified;
  - V-11 **EXCEPTION-CONDITIONS-MET (P-1)**, never PASS — every pre-commit
    check exit 0; every post-commit verify-unit exit 1 with only the ten
    untracked `.agents/` / `.codex/` files, hash-identical;
  - V-12 **EXCEPTION on (e)** (D-1 b, 25 October 2026, limited to F-B1);
    (a)–(d) PASS;
  - IR-3 **PARTLY** — the scientific reviewer's per-entry register check
    was not run (the owner's direction of 25 October 2026);
  - IR-4 **FAIL** on the diagnosed comparisons (32 / 32 / 39 / 42 of 45
    match in every field for S1 × 2, S2, S3; what differs is shape,
    register-silent denominators and the F-C4 / F-C5 markers) and IR-7
    **FAIL** on one mutation case (X-PLI-1, finding F-C1) — none resolved
    by the writer (report §3, §12).
- **Regression outcomes** (the single final pass on the final source, 99
  specs once each; report §9.2): 84 pass, 15 fail. Of the 15: one is this
  run's own regression (the M14 route spec's ENTER-as-NEXT, C7); two pass
  when run alone (load artefacts); the M07 settle group passes against a
  fresh dev server (a harness artefact of the long-lived servers, D14) and
  its A-10 tests pass against the Part A evidence root; the keep-alive
  export test is F-B1; the rest are pre-existing (identical at the
  `060758c` baseline: the M13 route's stale R5 expectation, the Deck-door
  closure test, the A-12 S-M07f 800 × 600 frame test, six legacy capture
  specs; one legacy capture spec's baseline is inconclusive). Baseline
  provenance is never counted as acceptance.
- **Findings for the owner** (report §7): F-B1 (excepted for V-12 (e) only;
  a pre-collection blocker); F-B2 / F-B7 / F-B8 resolved by RL-0 … RL-4;
  F-B3 corrected under D-2 a; F-B4, F-B5, F-B6 unchanged; F-B9 corrected;
  F-B10 unchanged (the settled notice now framed); F-C1 (a reload-check
  record naming another page load is read differently by the RL-4 and the
  RL-1 families — owner item A7); F-C2 (the recount's shape and
  denominator questions, A8–A11); F-C3 (Noor's yard briefing, pre-existing,
  C5); F-C4 / F-C5 (production exports `null` where the register defines
  markers for M01 and M05, A12); the gameplay review's M-1 (the M14 results
  copy) corrected in the fix round; the measurement-adjacent
  observations (the ESC time excluded as `unusable_controls`, the frame
  helper's movement inside M23, default focus across measured choices).
- **Reproduced cross-task candidates (V-7):** C-6 and C-7 corrected for M15
  and M16; C-8 corrected for M14; **C-8 for M15 / M16 and the M14 GP-1
  pattern remain** (owner items C2 / C3); C-2 as defined did not reproduce.
- **The owner items of this run** (bundled in the handoff; none resolved
  by the writer): scientific A1 (the M reason text for M14–M20), A2 (the
  M05 valid zero), A3 (open decision B2), A4–A6 (the analyst's gaps), A7
  (F-C1), A8–A12 (the recount's shape, denominator and marker questions);
  acceptance B1 (inspection-only M-screen coverage), B2 (D-1 b applied
  within scope); dependencies outside the allowlist C1–C9 (C5 Noor's
  briefing, C6 the completion notice's footer, C7 the M14 route spec's
  ENTER-as-NEXT, C8 the M13 route spec's stale R5 expectation, C9 the A-12
  S-M07f 800 × 600 test, pre-existing); awareness items D1–D14.
- **U23 verification exceptions that bear on the route** (U23 acceptance
  §3, rows 1–3): unchanged from Part B.
- **The assignment coupling** (AS-1 = a): one bit of the session id drives
  the two-option form and order factors of ten rows (M01, M02, M06, M08,
  M12, M13, M17, M21, M22, M24). U25 is scheduled before collection (not
  authorised); U24's evidence for those rows is "pre-correction scheme
  (single-bit)".
- The M04 extractor gap (REG §5.216); the M17 criterion decision (REG
  §5.87–5.88): criterion values are not to be read until it is decided.
- The legacy capture specs (superseded by the U24 full-route frames; not
  rewritten, I-3 = a); the legacy rows in `returnEpisodeModel.ts`; the
  `final_scientific_gates` M08 schedule exception.
- The compact export's omission rule (raw events dropped above 60 000
  bytes) — and F-B1.
- No postMessage channel to Qualtrics: the return is by URL only (S6).
- "Not scientifically validated" applies to every row.
- The M07 questions (M07-Q), unresolved before collection.

## 6. Prerequisites before participant collection (G.3) — all open

1. G.2 (every U24 row PASS or excepted by name): V-2, V-3, V-4 / IR-4 /
   IR-7, V-6, V-7, V-9 as listed above.
2. U23 item 5b and AS-1 (U25, then the refresh of the stale U24 evidence).
3. The correction or named exception of every reproduced cross-task
   candidate: C-8 for M15 / M16 and the M14 GP-1 pattern (C-6, C-7 and C-8
   for M14 corrected in this run; C-2 not reproduced).
4. The M05 competing-task rule (I-2).
5. The M04 extractor gap (REG §5.216) and the M17 criterion decision
   (REG §5.87–5.88).
6. Your disposition of the U23 mast-prompt colour (VIS-2), after this
   walkthrough.
7. A non-Windows font check.
8. A production-build check with a real (test) Qualtrics flow.
9. The privacy and security gate (`docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`)
   — including the DEV template's external request (finding F-B6).
10. M07-Q (the three questions).
11. A participant-bundle export check (this run's exports are the
    participant pipeline's own requests, but from the DEV server with a mock
    ingest).
12. Your disposition of G4 (the bench opens live but inert after the review).
13. The `pilot_records` `:734` stop (not reproduced in this run's traced
    runs; mechanism and rate as the Part B closeout left them).
14. F-B1 — the page-hide keep-alive export (excepted for V-12 (e) only;
    D-1 b names it an explicit pre-collection blocker).

## 7. After the walkthrough

Your notes go to a new decision record; U24 resolves nothing from them. The
next units are yours to choose: U25 (the assignment correction), the
corrections outside this run's allowlist (C-8 for M15 / M16, M14 GP-1, the
held coupling panel's objective line, the Laboratory display under a held
phase), the scientific items A1–A7, any presentation amendments, the M05
rule, and the findings in the report §7.
