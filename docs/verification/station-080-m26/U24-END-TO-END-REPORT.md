# U24 — Station 080 M01–M26 end-to-end report (Part B)

Prepared by the U24 Part B writer (`claude-opus-5-5`) on 22 October 2026,
from the evidence of the Part B session. Governing documents: the U24 package
(`U24-CONTRACT.md` Part B, `U24-VERIFICATION-AND-EVIDENCE-PLAN.md`,
`U24-BACKLOG-DISPOSITION.md`, amendment 3) and the owner's Part B ruling and
clarification of 22 October 2026 (verbatim in `UNIT-LOG.md` "U24 Part B").

**What this report is not.** It is not a scientific validation of any row,
not the final scientific closeout, and not clearance for participant
collection. Layer R of V-4 (the independent raw-event recount) is Part C
(RC-1 = a). Every row status follows plan §0.1: a reproduced defect stays
FAIL or BLOCKED until a correction is verified or the owner excepts it by
name; scheduling its fix later does not change the status.

**Evidence.** The Part B evidence is copied durably to
`C:\Users\Juls\.codex\visualizations\2026\10\21\u24-end-to-end-evidence\B`
by the handoff's copy-and-hash commands; paths below are relative to that
`B\` folder. Part A evidence is cited only under
`C:\Users\Juls\.codex\visualizations\2026\10\22\u24-part-a-43f12de-evidence`
("PA\" below).

## 1. Gate assessments

**G.1 — ready for an informed owner walkthrough: MET at this documentation
revision** (the documentation-only amendment of `cbc53dd`; the owner's
ruling of 23 October 2026, REG §5.403). History: at the Part B commit the
writer assessed G.1 met; the independent documentation review of 23
October (`…\u24-end-to-end-evidence\B-closeout\DOCUMENTATION-REVIEW.md`)
found V-11 without its final status and the `pilot_records` `:734` stop
presented as explained (N-1, N-2), and G.1 was held PENDING with V-10
PARTLY. The owner's ruling lets V-10 and G.1 close only when three
conditions hold, and they hold at this revision:

1. the corrected guide meets the existing walkthrough requirements —
   confirmed by the independent check of the final documentation
   (`…\u24-end-to-end-evidence\B-closeout-3\FINAL-DOCUMENTATION-CHECK.md`);
2. evidence preservation is verified — on 23 October the durable `B\`
   (1 864 of 1 864 files), `B-closeout\` (7 of 7), `B-closeout-2\` (59 of
   59, both traces) and the Part A evidence (4 870 of 4 870) matched their
   manifests;
3. the documentation revision is committed — this revision.

The conditions of the gate are as follows.

- Part A is committed (`43f12de`, owner-approved); Part B is committed in
  this revision, the documentation-only amendment of `cbc53dd` (its
  implementation and runtime evidence unchanged). The owner's named
  exception EX-B-734 (§3) covers the acceptance of this integration commit
  and the start of the walkthrough only.
- V-1 is PASS: S1 at both viewports and S2 complete by ordinary input.
- The guide exists and V-10 is PASS at this revision (§3).
- Every row that is not PASS, every finding, every regression outcome,
  every accepted limitation and every open prerequisite is listed in the
  guide with its status and reference.

G.1 is not a claim that U24 verification is complete, and it closes
nothing else: not G.2, not G.3, no other FAIL or PARTLY row and no
scientific implementation finding. The owner accepts or rejects it.

**G.2 — required U24 verification complete: NOT REACHED.** Layer R is Part C;
reproduced cross-task candidates (C-6, C-7, C-8 and the M14 GP-1 pattern)
and the pause menu's missing Resume control (F-B9) violate V-2 / V-3 until
corrected or excepted by name; V-6, V-7 and V-9 are PARTLY; V-3 has named
evidence gaps; V-5 (b) carries the findings F-B2, F-B7 and F-B8, and V-12 (e)
carries F-B1.

**G.3 — prerequisites before participant collection: NONE satisfied** (§8).

## 2. Scenarios run (ordinary play from the Dock unless labelled)

| Scenario                        | Viewport                 | What it did                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                                                                                              |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 engaged route                | 800 × 600 and 1280 × 720 | every offer accepted, every station worked with scripted choices (some wrong, some stopped), briefing order followed, the Core synchronised; the same synthetic identity at both viewports                                                                                                                                                                                                                                                                                                                                                                                       | completed to `complete` at both viewports; L1 byte-equal; L2 26 / 26 at both; the primary rows identical across the viewports at value level                                                                                                                                                                                                             | `logs\u24-02-s1-800.log`, `u24-03-s1-1280.log`; `exports\S1-*.json`; `reproduction\S1-*-L1.json`, `-L2.json`; `stage-logs\S1-*.json`; `frames\800x600\`, `frames\1280x720\` (91 each) |
| S2 minimal route                | 800 × 600                | every optional offer declined explicitly, every optional station left unopened, only route-required beats                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | completed; L1 byte-equal; L2 26 / 26; no participant act beyond the explicit declines (every other record `input_mode: 'system'`)                                                                                                                                                                                                                        | `u24-04-s2.log`; `exports\S2.json`; `reproduction\S2-L1.json`, `S2-L2.json`, `S2-record-classes.json`                                                                                 |
| S3 reloads                      | 800 × 600                | three genuine `page.reload()`s: inside the M15 evidence table (load 1); at Vale's return check-in in the Concourse with the M25 question open (load 2 — the plan's S3 names "inside the Workshop return with M25 / M07 open": this reload differs in place, and the M07 bench was not reopened after it); after the Deck review, before the Core (load 3); the route finished by ordinary input in load 4; the drivers decline an offer shown again, and a pure check over the export asserts that no opportunity was answered in two page loads                                 | completed in load 4; L1 byte-equal; lossless (747 events, no gap, no duplicate); three keep-alive attempts never delivered (F-B1)                                                                                                                                                                                                                        | `u24-05-s3.log`; `exports\S3.json`; `reproduction\S3-L1.json`, `V5bc-S3-integrity.json`, `S3-keepalive-attempts.json`; `stage-logs\S3-800x600.json`                                   |
| S4 focus and pause              | 800 × 600                | 3 s blur and 3 s hidden during the M05 clock — SYNTHETIC: dispatched `blur` / `visibilitychange` events with `document.hidden` overridden (the m23Helpers precedent; `visibilityState` is not overridden and `requestAnimationFrame` keeps running; headless Chromium has no real focus to lose); the ESC menu, resumed by ESC and (attempted) by a click at the Resume button's place; HELP open and close on the incident desk by key (`h`, ESC) and by pointer (HELP, CLOSE HELP); a click beside the desk with its prompt showing; LEAVE mid-decision by pointer, away, back | blur and hidden excluded from the clock (≈ 3.0 s each); the avatar frozen under the menu; ESC resumes, the click does not (F-B9, pre-existing); HELP opens and closes by key and by pointer; the click beside the desk opens nothing (a station is entered by SPACE / E only — the pointer path is absent, demonstrated); the decision kept on reopening | `r2-06-s4.log` (correction round 2; the scheduled `u24-06-s4.log` ran the earlier S4 without the pointer cases); `reproduction\S4.json`; `frames\S4-800x600\`                         |
| S5 pointer only / keyboard only | 800 × 600                | NPC dialog (Vale, pointer; "Handover confirmed", keyboard), work surface (M12 pointer; M14 keyboard), overlay (M02 keyboard; M03 Press A pointer), field HUD (M23 pointer; M23 keyboard in S1)                                                                                                                                                                                                                                                                                                                                                                                   | every recorded act in its window carries the single input mode used                                                                                                                                                                                                                                                                                      | `u24-07-s5.log`; `reproduction\S5-input-modes.json`; `frames\S5-800x600\`                                                                                                             |
| S6 synthetic launch             | 800 × 600                | `participant_id=SYN-U24-001`, `game_session_id=SYN-U24-S6`, `condition=pilot`, `game_version=u24-check`, `launch_mode=production` (DEV opt-in), `return_url` on the allow-listed https host (intercepted); the S2 route; the ingest answers 500                                                                                                                                                                                                                                                                                                                                  | three identical attempts, `export_status` failed, no automatic navigation; CONTINUE hands off with the summary and every status axis to the intercepted host                                                                                                                                                                                             | `u24-08-export-recovery.log`; `reproduction\V12-S6.json`; `exports\S6-ingest-500.json`                                                                                                |

Harness settings (disclosed; they gate the export only, never game state):
`installPipeline` injects the DEV `__researchExportConfig` (the mock ingest
address on the dev server's own origin) before the page loads, and S1–S5
launch with `launch_mode=test` so the participant pipeline sends its export;
every request to a non-localhost host is answered locally and recorded,
while localhost requests (any port) pass through unrecorded.

Automation times (S1 at 800 × 600; never a human estimate): ep 1 ≈ 2.5 min,
ep 2 ≈ 4.5, ep 3 ≈ 4, ep 4 ≈ 6.5, ep 5 ≈ 6, ep 6 ≈ 0.6; the stage logs hold
every step with zone, elapsed time and input counts.

## 3. Acceptance matrix (plan Part B; statuses per plan §0.1)

Every Playwright command ran once with `--retries=0` (scheduled pass:
`SONNET-PASS-REPORT.md`; correction rounds 1 and 2: `SONNET-ROUND1-REPORT.md`,
`SONNET-ROUND2-REPORT.md`). Reviews: `SCIENTIFIC-REVIEW.md`,
`GAMEPLAY-REVIEW.md`, `VISUAL-REVIEW.md` (R.2 substitutions, §10). A FAIL
below is pre-existing at 43f12de (proved under the baseline rule, cited)
and outside allowlist B unless stated otherwise.

| Row                                            | Status                                                                                                                                                                                                                                                       | Evidence kind                 | What holds, what does not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V-1 ordinary navigation                        | **PASS**                                                                                                                                                                                                                                                     | RUN + FRAME                   | S1 at 800 × 600 and 1280 × 720 and S2 reach `complete` by ordinary input from the Dock; per-stage logs; no teleport, scene jump, DEV closure or in-page export call (grep attached); the harness settings that gate the export are disclosed (§2). Steps without a frame are named in the guide                                                                                                                                                                                                                                                                                                                                                                                                                   | `logs\u24-02-s1-800.log`, `u24-03-s1-1280.log`, `u24-04-s2.log`; `stage-logs\`; `diagnostics\V1-no-debug-grep.txt`; `frames\`                                    |
| V-2 keyboard and pointer access                | **FAIL**                                                                                                                                                                                                                                                     | RUN + FRAME; C-2 INSPECTION   | Held: S4 (blur / hidden, the ESC menu pausing, HELP by key and by pointer, LEAVE and return; a station is not entered by pointer — the path is absent, demonstrated) and S5 (each surface kind by one input alone). FAIL: RESUME by pointer (F-B9: no visible Resume control, a click does not resume); C-8 (M15 results NEXT lands on FINISH); the M14 GP-1 focus pattern; C-6 (M16's clock runs on while the console is left). Gaps (PARTLY within the FAIL): keyboard-only NPC dialog and keyboard-only field HUD are evidenced by S2 and S1, not S5; at 1280 × 720 access is evidenced only as far as S1 uses it                                                                                              | `logs\r2-06-s4.log`, `u24-07-s5.log`; `reproduction\S4.json`, `S5-input-modes.json`; `diagnostics\ESC-MENU-CLASSIFICATION.md`, `V7-RESULTS.md`                   |
| V-3 availability and closure (26 × 6)          | **FAIL**, and PARTLY on named gaps                                                                                                                                                                                                                           | RUN + REUSED                  | §4. FAIL: the M16 cells broken by C-6 and C-7. PARTLY: the valid zero of M02, M05, M08, M12, M22, M26; M26 declined; the invalid / technical outcome of M08, M11, M26; the S3 cells of F-B2, F-B7, F-B8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | §4; `diagnostics\V3-REUSED-CELLS.md`                                                                                                                             |
| V-4 reproduction                               | **PARTLY — layer R pending Part C**                                                                                                                                                                                                                          | RUN                           | L1 byte-equal (S1 × 2, S2, S3); L2 26 / 26 (S1 × 2, S2), with the check strengths stated (§5); L3 rerun and passed; layer R is Part C (RC-1 = a)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | §5                                                                                                                                                               |
| V-5 export agreement, partitioning, recovery   | **FAIL** on (b)                                                                                                                                                                                                                                              | RUN                           | (a) held: the compact and full envelopes of the S1 end state carry identical `measurement_features`, `measurement_protocol`, `measurement_validity`; the compact sets `raw_events_omitted` (1 097) above 60 000 bytes (and still exceeds the browser's keep-alive limit, F-B1). (b) held: `page_load_index` 4, prior loads 1–3 carried apart, no participant answer counted in two loads. (b) not met: the M25 companion open at reload 2 reads `no_eligible_event` (F-B8); rows never presented read `interrupted`, not `not_presented` (F-B7: the register's §3 rule); F-B2 open. (c) held: lossless (747 events, no gap, duplicate or eviction). Baseline: S3 on 43f12de (`diagnostics\S3-BASE-COMPARISON.md`) | `logs\r1-07-export-recovery.log`; `reproduction\V5a-compact-vs-full.json`, `V5bc-S3-integrity.json`; `exports\S3.json`                                           |
| V-6 final visual evidence                      | **PARTLY**                                                                                                                                                                                                                                                   | FRAME                         | S1 frames at both viewports (91 each), S2–S6 frames, the fallback-font pass (Courier New, Lucida Console; the named text-dense windows fit), the named U23 mast-prompt item judged (legible, covers no scanner text, reads as a fourth scanner row — the owner's disposition, G.3 item 6). Gaps: the settled completion notice is not framed (only inside its 1200 ms delay); the steps without a frame (guide); non-Windows fonts not verifiable here (G.3 item 7). Defects recorded, not changed: F-B9 (MAJOR, pre-existing), F-B10                                                                                                                                                                             | `frames\`; `VISUAL-REVIEW.md`                                                                                                                                    |
| V-7 cross-task candidates                      | **PARTLY**                                                                                                                                                                                                                                                   | RUN (diagnostic) + INSPECTION | C-6, C-7, C-8 and the M14 GP-1 pattern reproduced, identical at 43f12de; C-2 as defined not reproduced — by INSPECTION only (the runtime help-sheet round trips do not test the candidate). Consequences: V-2 and V-3 FAIL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `diagnostics\V7-RESULTS.md`; `diag\v7-*.json`; `logs\v7-pass-*.log`                                                                                              |
| V-8 B-12 probe correction                      | **PASS**                                                                                                                                                                                                                                                     | RUN + FRAME                   | `m23_plots` (M23 layout group and X4) at both viewports exit 0; every paused-panel sidecar `world_prompt_bounds: null`; the live-yard bounds equal X4's and U23 r4's. (Visual note: at 1280 × 720 the reload-lock notice hides the live prompt — F-B10)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `logs\reg-m23_plots.log`; `v8-frames\`                                                                                                                           |
| V-9 backlog corrections                        | **PARTLY**                                                                                                                                                                                                                                                   | RUN + INSPECTION              | §9: every correction made within its limits; B-7's re-expressed U8-12 passes and the file's only failure is the base's (M08 schedule); B-8's premise did not hold (F-B3), so `pilot_route`, and `pilot_records` in the runs that reach `:854`, still fail at the base's assertion on the M05 decline records (the scheduled `pilot_records` run stopped earlier, at `:734`; EX-B-734, §3) — the owner's question                                                                                                                                                                                                                                                                                                  | §9                                                                                                                                                               |
| V-10 owner walkthrough guide                   | **PASS** at this documentation revision (owner ruling of 23 October 2026, REG §5.403: the corrected guide checked against the walkthrough requirements, evidence preservation verified, this revision committed; PARTLY from the closeout review until then) | INSPECTION                    | The guide opens with G.1 / G.2 / G.3; every framed step names its frame (all 72 names present at both viewports) and the sub-steps without a frame are named, so the plan's 'every route step is checked against an S1 frame' holds for the framed steps only (the gameplay review's M3 resolution: mark or frame); every non-PASS row, finding, regression outcome, limitation and open prerequisite is listed with its status and reference. The independent documentation review of 23 October found V-11 without its status, the `pilot_records` `:734` stop presented as explained and the regression outcomes without status words (N-1 to N-3); corrected in the closeout                                  | `OWNER-WALKTHROUGH-GUIDE.md`; `GAMEPLAY-REVIEW.md`; `..\B-closeout\DOCUMENTATION-REVIEW.md`                                                                      |
| V-11 static and scope                          | **EXCEPTION-CONDITIONS-MET (P-1)** — verify-unit exit 1, only FAIL lines the ten untracked .agents/ / .codex/ files; never PASS                                                                                                                              | RUN                           | `lint:tsc`, `build`, changed-file ESLint and `git diff --check` exit 0 in the scheduled pass and both rounds; the whole-branch scope audit found 0 paths outside the union of allowlists A and B; verify-unit exited 1 after the commit (§11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `logs\v11-*`, `r1-0[1-4]-*`, `r2-0[1-4]-*`; `logs\c-07-verify-unit.log`, `precommit-gate-hashes.json`, `postcommit-gate-hashes.json`, `branch-outside-union.txt` |
| V-12 synthetic launch, return, export handling | **FAIL** on (e)                                                                                                                                                                                                                                              | RUN                           | (a)–(d) held: the launch parameters in the export; the return-URL policy (https and the allow-listed host accepted; a foreign host and plain http refused with the reason; localhost in DEV only); the hand-off URL with the summary and every status axis, caught by interception; the ingest answering 500 → three attempts, `export_status` failed, no automatic navigation, CONTINUE hands off. (e) FAIL: the keep-alive compact export is never delivered (F-B1; `participant_completion_handoff` `:1094` fails identically at 43f12de)                                                                                                                                                                      | `logs\r1-07-export-recovery.log`; `reproduction\V12-S6.json`, `S3-keepalive-attempts.json`; `exports\S6-ingest-500.json`                                         |

The named commit-only exception (contract B.17): `pilot_return` M25
(expected `completed`, observed `pending`, `:211` at `:735`) and M21
(expected `open`, observed `pending`, `:828` at `:991`) fail with the same
assertions, values and steps at 43f12de (`logs\base-01-pilot-return-1.log`,
`base-02-pilot-return-2.log`; Part B `logs\reg-pilot_return.log`). The
approved driver changes on that path (B-5 `openFeedConsole`, B-20
`waitAdvanceEnabled`) left both failures unchanged; no root cause is
inferred. The exception satisfies no V-row.

**The named exception EX-B-734** (the owner, 23 October 2026; REG §5.403),
separate from the B.17 exception and from V-11, covers the stop of
`pilot_records.spec.ts` `:706` at `:734` for two purposes only: accepting
the Part B integration commit and beginning the owner walkthrough. As the
owner directed, it records that:

- the same assertion failed at the same step on untouched 43f12de;
- that baseline occurrence's trace shows the Case Workspace station taking
  the Space press instead of the bundle pickup;
- the original scheduled occurrence had no trace; its mechanism remains
  unproven;
- whether the cause is the test's positioning or a participant-facing
  interaction conflict remains unresolved (REG §5.219 records the Workshop
  floor near the cutter as lying within the 72 px ranges of the Case
  Workspace and other stations or within reach of the supply bundles);
- the observed run counts (1 stop in 3 runs on the work tree, 1 in 2 on
  43f12de) do not establish a failure rate.

EX-B-734 does not make the failed test PASS, does not establish harmless
flakiness and does not waive investigation before participant collection:
the issue stays in the pre-collection queue (§8, item 13). It satisfies no
V-row. Evidence:
`…\u24-end-to-end-evidence\B-closeout-2\PILOT-RECORDS-734-TARGETED-RUNS.md`.

## 4. V-3 — availability and closure, 26 rows × 6 outcomes

Each cell is one of: an export value of this session (S1 = both S1
exports, identical at value level; S2; S3 = page load 4 of S3); a REUSED
per-row test at 43f12de (`<spec>` `T<test line> @<assertion line>`, the
spec `e2e/<spec>.spec.ts`; every cited line is a 43f12de line — U24
changes only `m22_setbacks` among the cited specs (imports and one added
test), so its 43f12de lines are cited as they were; run in the regression
pass where the import-graph rule applies); "n/a" with the register's
reason; or **no evidence** (a named gap). "REG L<n>" is a line of the
register **at 43f12de** (Part B inserts 69 lines after REG line 165, so
every cited line after 165 now stands 69 lines later). Export values are
production outputs; their independent check is layer R (Part C). Rows
marked † are the ten assignment-coupled rows: their cells are
"pre-correction scheme (single-bit)" (AS-1 = a). M07's cells cite the
durable Part A root (plan V-3, amendment 3).

| Row   | observed                                   | valid zero                                                     | absent / not presented                                                                                      | declined                                           | interrupted                                                                             | invalid / technical                                                                                                |
| ----- | ------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| M01 † | S1 1 / 6                                   | `m01_batches` T298 @366                                        | `m01_batches` T456 @518                                                                                     | S2 declined                                        | `m01_batches` T456 @522 (S3: declined — F-B2)                                           | `m01_batches` T298 @450                                                                                            |
| M02 † | S1 3 / 6                                   | **no evidence**                                                | `m02_retrieval` T797 @801                                                                                   | S2 declined                                        | `m02_retrieval` T797 @806 (S3: declined — F-B2)                                         | `m02_retrieval` T797 @874                                                                                          |
| M03   | S1 4 / 6                                   | `m03_restore` T506 @568                                        | `m03_restore` T678 @681                                                                                     | S2 declined                                        | `m03_restore` T678 @686 (S3: declined — F-B2)                                           | `m03_restore` T603 @673                                                                                            |
| M04   | S1 4 / 6                                   | `m04_cutting` T823 @842                                        | S2 not_presented (no job run)                                                                               | n/a: a job never run is not presented (REG §5.172) | S3 interrupted (held back)                                                              | `m04_cutting` T911 @981                                                                                            |
| M05   | S1 started × 2 (latency record)            | **no evidence** (a latency record; a plain zero may not apply) | `m05_start` T527 @725                                                                                       | S2 declined                                        | S3 interrupted                                                                          | `m05_start` T527 @788                                                                                              |
| M06 † | S1 3                                       | `m06_orders_route` T394 @443 (browser)                         | `m06_orders` T469 @619                                                                                      | S2 declined                                        | `m06_orders` T469 @625 (S3: declined — F-B2)                                            | `m06_orders` T469 @656                                                                                             |
| M07   | S1 5 / 6; PA `A\exports\S-M07b.json` (A-3) | PA A-2 `A2_opened_left_at_zero`                                | S2 no_eligible_event (presented_not_entered); PA RX-1 / RX-2, `S-M07a.json`                                 | n/a: the bench has no decline (REG M07 row)        | S3 interrupted; PA RX-5 / RX-6 / RX-10, `S-M07c`, `S-M07e`, `S-M07f`                    | PA A-4 / RX-7 fixtures                                                                                             |
| M08 † | S1 3 / 6                                   | **no evidence**                                                | `m08_effort_choice` T281 @286                                                                               | S2 declined                                        | `m08_effort_choice` T281 @295                                                           | **no evidence**                                                                                                    |
| M09   | S1 3 / 3                                   | `m09_watch` T441 @454                                          | `m09_watch` T546 @550                                                                                       | S2 declined                                        | S3 interrupted                                                                          | `m09_watch` T782 @891                                                                                              |
| M10   | S1 2 / 2                                   | `m10_deliveries` T586 @673                                     | `m10_deliveries` T993 @996                                                                                  | S2 declined                                        | S3 interrupted                                                                          | `m10_deliveries` T1271 @1411                                                                                       |
| M11   | `m11_custody` T108 @175 (value 1, 1 / 2)   | **S1 0 / 2** (both returned)                                   | `m11_custody` T287 @292                                                                                     | S2 declined                                        | S3 interrupted                                                                          | **no evidence** (REG L6214: the technical record is the reload marker)                                             |
| M12 † | S1 5 / 6                                   | **no evidence** (REG L94 allows an observed 0)                 | `m12_check` T436 @589                                                                                       | S2 declined                                        | `m12_check` T436 @593 (S3: declined — F-B2)                                             | `m12_check` T436 @639                                                                                              |
| M13 † | S1 1 / 3                                   | `m13_networks` T2151 @2163                                     | S2 not_presented                                                                                            | n/a: never declined (REG L5218)                    | S3 interrupted                                                                          | `m13_networks` T2487 @2554                                                                                         |
| M14   | S1 3 / 6                                   | `m14_integration` T2078 @2094                                  | S2 no_eligible_event (briefed_not_opened)                                                                   | n/a: no refusal (REG L10057)                       | S3 interrupted                                                                          | `m14_integration` T2416 @2498                                                                                      |
| M15   | S1 2 / 4                                   | `m15_systems` T2840 @2860                                      | S2 no_eligible_event                                                                                        | n/a: never declined (REG L4239)                    | S3 interrupted (open at reload 1)                                                       | `m15_systems` T3210 @3241                                                                                          |
| M16   | S1 3 / 6                                   | `m16_handling` T2664 @2722                                     | S2 no_eligible_event — **FAIL (C-7)**: after the review the console comes back live and writes events (V-7) | n/a: never declined (REG L3671)                    | `m16_handling` T3045 @3065                                                              | `m16_handling` T3045 @3081; **FAIL (C-6)**: a left, unreopened series counts the time after leaving as `active_ms` |
| M17 † | S1 {criterion 4, attained}                 | n/a: criterion 3–12 (REG L99)                                  | S2 not_presented                                                                                            | n/a (REG L6697)                                    | S3 interrupted (never presented — F-B7)                                                 | `m17_trials` T331 @531                                                                                             |
| M18   | S1 1 / 3                                   | `m18_diagnosis` T3154 @3227                                    | S2 no_eligible_event                                                                                        | n/a: never declined (REG L2419)                    | `m18_diagnosis` T3565 @3594                                                             | `m18_diagnosis` T3565 @3682                                                                                        |
| M19   | S1 1 / 2                                   | `m19_lines` T1575 @1631                                        | S2 no_eligible_event (not_opened)                                                                           | n/a: never declined (REG L1362)                    | `m19_lines` T1447 @1456; T2030 @2058                                                    | `m19_lines` T1836 @1851; T1406 @1419                                                                               |
| M20   | S1 1 / 2                                   | `m20_returns` T4051 @4065                                      | S2 no_eligible_event (not_opened)                                                                           | n/a: never declined (REG L730)                     | `m20_returns` T4186 @4240                                                               | `m20_returns` T5157 @5161                                                                                          |
| M21 † | S1 1 / 1                                   | `m21_cases` T257 @312                                          | `m21_cases` T257 @411                                                                                       | S2 declined                                        | `m21_cases` T257 @415                                                                   | `m21_cases` T257 @450                                                                                              |
| M22 † | S1 1 / 2                                   | **no evidence** (@397 is 0 `incomplete`)                       | `m22_setbacks` T320 @519                                                                                    | S2 declined                                        | `m22_setbacks` T320 @523                                                                | `m22_setbacks` T320 @545; @458                                                                                     |
| M23   | S1 1 / 1                                   | `m23_plots` T3058 @3079                                        | S2 not_presented                                                                                            | n/a: never declined (REG L601)                     | S3 interrupted (never presented — F-B7)                                                 | `m23_plots` T3670 @3739                                                                                            |
| M24 † | S1 2                                       | `m24_m26_boundary` T672 @782                                   | S2 not_presented                                                                                            | `m24_m26_boundary` T672 @939                       | S3 interrupted (never presented — F-B7)                                                 | `m24_m26_boundary` T672 @739; @818                                                                                 |
| M25   | S1 2                                       | `m25_repetition` T439 @518                                     | `m25_repetition` T567 @608                                                                                  | S2 declined                                        | `m25_repetition` T567 @618 (S3: declined — F-B2; the companion open at reload 2 — F-B8) | `m25_repetition` T675 @817                                                                                         |
| M26   | S1 2                                       | **no evidence**                                                | S2 not_presented                                                                                            | **no evidence** (REG L7283 defines it)             | S3 interrupted (never presented — F-B7)                                                 | **no evidence** (REG L7271–7274 define it)                                                                         |

The REUSED test lines were located by a read-only lookup at 43f12de
(`diagnostics\V3-REUSED-CELLS.md`).

**V-3 status: FAIL** — the M16 cells broken by the reproduced candidates
C-6 and C-7 (pre-existing at 43f12de; V-7); and PARTLY on the named gaps
(the valid zero of M02, M05, M08, M12, M22 and M26; M26 declined; the
invalid / technical outcome of M08, M11 and M26) and on F-B2, F-B7 and
F-B8 (§7): S3's interrupted cells for M17, M23, M24 and M26 are rows never
presented in any load, not an interruption while open.

## 5. V-4 — reproduction, by layer (never merged)

| Layer                            | What it is                                                                                                                                                                                                                                                                             | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| L1, same code                    | each saved export's `raw_events` re-extracted in the test process (`extractMeasurementFeatures`, the context of the closed record and the export's page load) must equal its `measurement_features` byte for byte — determinism and log-only derivation, **not independence**          | byte-equal for S1 800 × 600, S1 1280 × 720, S2 and S3 (page load 4)                                                                                                                                                                                                                                                                                                                                                                                         | `reproduction\S1-*-L1.json`, `S2-L1.json`, `S3-L1.json`                                                 |
| L2, scenario expectation         | the primary rows against the expectation hand-derived in `e2e/u24Helpers.ts` from the register formulas and the scripted choices (S1) and from the register's dispositions (S2); the module imports nothing from `src/measurement` (a static check) — **not a raw-event reproduction** | S1 26 / 26 at both viewports; S2 26 / 26. The checks differ in strength: M05 is compared for a non-null value only (its "started × 2" basis is not compared; the export shows it); the numerator is not compared (`any`) for M17, M24, M25 and M26; in S2, M23 matched within a set of two register readings and M24 and M26 within a set of three of the four non-observed dispositions (REG §5.388); M02 matched its single register reading (`declined`) | `reproduction\S1-*-L2.json`, `S2-L2.json`; `diagnostics\S2-REGISTER-DISPOSITIONS.md`                    |
| R, independent raw-event recount | plan §R                                                                                                                                                                                                                                                                                | **pending Part C** (RC-1 = a)                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                       |
| L3, content oracles              | the existing M13–M20 and M23 pure oracles                                                                                                                                                                                                                                              | rerun: the eight pure oracle specs `m13_networks` … `m20_returns` 472 passed (correction round 1, `r1-08-l3-oracles`; no dependency of theirs changed, rerun for RUN evidence); the route specs `m13_networks_route` … `m20_returns_route` and `m23_plots` exit 0 in the regression pass                                                                                                                                                                    | `logs\r1-08-l3-oracles.log`; `logs\reg-m1*_route.log`, `reg-m20_returns_route.log`, `reg-m23_plots.log` |

**V-4 status: PARTLY — layer R pending Part C.**

## 6. Viewport coverage (plan §0.3, stated exactly)

| Evidence                                                                                       | 800 × 600                                               | 1280 × 720 |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| S1 engaged route (V-1, V-3, V-4, V-5 (a), V-6 frames)                                          | yes                                                     | yes        |
| S2 minimal, S3 reloads, S4 focus / pause, S5 pointer-only / keyboard-only, S6 synthetic launch | yes                                                     | **no**     |
| V-6 fallback-font pass ("Courier New", "Lucida Console": two S1 runs)                          | yes (`logs\u24-09-fonts.log`; `frames\font-*-800x600\`) | no         |
| V-8 M23 layout group and X4                                                                    | yes (`logs\reg-m23_plots.log`; `v8-frames\`)            | yes        |
| A-7 M07 route and bench frames (Part A)                                                        | yes                                                     | yes        |
| A-12 M07 reload runs (Part A)                                                                  | yes                                                     | no         |
| A-12 held-back screen frames (Part A)                                                          | yes                                                     | yes        |

Keyboard-only and pointer-only access (S5) and help, leave, pause and
return (S4) are evidenced at 800 × 600 only; at 1280 × 720 only as far as
S1 uses them. Extending S2–S6 to 1280 × 720 would be an expansion the owner
can request.

## 7. Findings for the owner (none resolved here)

- **F-B1 — the page-hide keep-alive export is never delivered
  (pre-existing).** The compact envelope still exceeds the browser's
  keep-alive limit after dropping every raw event (≈ 69 KB at the Dock,
  ≈ 124 KB at the route's end); Chromium refuses keep-alive bodies from
  about 60 000 bytes ("Failed to fetch"). S3's three reload keep-alives
  (90–101 KB) never reached the ingest; `participant_completion_handoff`
  `:1094` fails at `:1111` identically at 43f12de and after Part B. Cause
  outside allowlist B (`ResearchExportClient.ts` / payload size). REG §5.393.
- **F-B2 — a reloaded load's reading of a station worked earlier and only
  shown again.** Rows guarded at the participant's opening (M01, M02, M03,
  M06, M12, M25) read `declined` in a later page load that presents them again
  and leaves them unopened, although they were administered earlier; rows
  guarded at presentation read `interrupted` (§5.14). Open question. REG
  §5.394.
- **F-B3 — the bare-route check's M05 premise.** The bare route's M05
  records are the participant's explicit declines, not system records;
  `pilot_route` six-zone, and `pilot_records` supply bundles in the runs
  that reach `:854`, therefore still fail on them (REG §5.387; the scheduled
  `pilot_records` run stopped earlier, at `:734`, EX-B-734). Whether a bare
  route's explicit declines are tolerated is the owner's question.
- **F-B4 — report 2's "Relay coupling — recovered" line** states an outcome
  like the two report-1 lines I-1 corrected; not covered by the ruling;
  unchanged (REG §5.390).
- **F-B5 — further stale registry metadata** (eight more window labels and
  three `opens` values; descriptive only, no runtime reader; REG §5.386).
- **F-B6 — the DEV page template requests `unpkg.com`** (the GitHub-corners
  embed in `index.html`; skipped in a `BUNDLE=true` build). Answered
  locally in every U24 run; for the privacy and security gate (REG §5.396).
- **F-B7 — V-5 (b) "rows not yet presented are `not_presented`"** does not
  hold as written after a reload: M17, M23, M24 and M26, never presented in
  any of S3's four loads, read `interrupted` with "no current-load evidence
  after a reload", which is the register's shared rule (REG §3: "after a
  reload an item with no current-load evidence is `interrupted`"). The plan
  wording and the register rule differ; the difference is reported, not
  resolved. Related detail text: M13 (opened and answered in load 1) reads
  `interrupted` in load 4 with the detail "lattice bench never opened" —
  the disposition follows the register rule; only the detail text
  describes the current load alone.
- **F-B8 — the M25 question open at a reload.** In S3 load 2 the M25 loops
  window closed, then the normality-belief question was presented and its
  opportunity opened (`proto_m25_belief_question_presented`,
  `proto_m25_normality_belief` presented / `opportunity_opened`), with no
  closure before the reload. In load 4 the companion
  `m25_normality_belief` reads `no_eligible_event` ("not exposed to the
  repeat opportunity: post listed in the yard briefing, never opened") and
  its validity record reads `participant_absent` ("not exposed to the
  repeat opportunity (0 required loops completed)"), although three loops
  were completed in load 2. V-5 (b)'s clause "rows open at the reload are
  `interrupted`" (and REG §5.14) is not met for this companion. Observed
  case for the owner; no disposition proposed. `exports\S3.json`. REG
  §5.399.
- **F-B9 — the ESC pause menu shows no Resume control (pre-existing).** The
  menu shows "Sound: on" and the Controls card only; the Resume button and
  the dimming overlay are not drawn, the card runs off the canvas bottom,
  and a click where Resume is placed does not resume — byte-identical on
  43f12de at both viewports. ESC resumes. Both trees log
  `Invalid JSX type. Expected a class or function but got: undefined` at
  each ESC-menu run (`logs\escdiag-work.log`, `escdiag-base.log`,
  `r2-06-s4.log`); recorded, not diagnosed. V-2 FAIL (RESUME by pointer).
  `diagnostics\ESC-MENU-CLASSIFICATION.md`; REG §5.401.
- **F-B10 — further visual defects** (visual review, MINOR; none changed in
  U24; frames named in `VISUAL-REVIEW.md`): the completion notice is framed
  only inside its 1200 ms control delay, where its body ("received by the
  study server") and footer ("Please wait — the study data is being sent")
  disagree and S6's "use CONTINUE TO SURVEY" has no button yet — no frame
  shows the settled notice with its controls; under Lucida Console the M13
  footer collides with the button row; at 1280 × 720 the Yard's reload-lock
  notice hides the live stake prompt; notices, dialogs and toasts cover
  world prompts, chips, an exit door and the objects they concern (frames
  036, 039, 040, 084, 085, 088); 6–7 px or low-contrast text in inset work
  surfaces at 800 × 600 (footer key hints, M13 piece labels, the
  orientation sub-labels, M22 report lines, the Core review tiles); and
  cosmetic wraps and paddings.
- **Measurement-adjacent observations** (gameplay and visual reviews; for
  the owner, nothing resolved): in S4 the time under the ESC menu was
  excluded from the M05 clock as `unusable_controls` (3 339 ms in the
  scheduled run with one menu opening; 7 500 ms in round 2's S4 with two)
  while `explicit_pause` read 0 (`reproduction\S4.json`); the S1 frame helper for
  the named mast-prompt item moves the avatar inside the open M23 series
  (no M23 record results; the positioning time is inside the window); the
  default focus differs across measured choices (option 1 pre-highlighted
  in the M25 Likert item, M24 and M26; none in the M23 failure choice).
- **The register's S2 ambiguities** (M02, M23, M24 / M26; REG §5.388) and
  the cross-unit difference in the never-opened rule.
- **The owner's reload-policy directions (23 October 2026; REG §5.403).**
  Directions (a) to (h) for F-B2, F-B7 and F-B8 are owner-approved and
  require a bounded implementation specification before any correction.
  Nothing is implemented in U24 Part B, no row status changes, and no
  provisional event or indicator is promoted into the canonical schema.

## 8. G.3 — prerequisites before participant collection (contract §G.3)

| #   | Item                                                                                                                                                                                                                                        | Status                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | G.2                                                                                                                                                                                                                                         | NOT REACHED (§1)                                                                                                |
| 2   | U23 item 5b (the owner accepts the assignment audit as complete) and AS-1 (U25, then the refresh of audit §5)                                                                                                                               | OPEN — the audit is recorded as the inventory (REG §5.385), not accepted; U25 scheduled, not authorised         |
| 3   | correction or named exception of every reproduced cross-task candidate                                                                                                                                                                      | OPEN — C-6, C-7, C-8 and the M14 GP-1 pattern reproduced (pre-existing); C-2 as defined not reproduced          |
| 4   | the M05 competing-task rule (I-2)                                                                                                                                                                                                           | OPEN — accepted for the walkthrough only                                                                        |
| 5   | the M04 extractor gap (REG §5.216) and the M17 criterion decision (REG §5.87–5.88)                                                                                                                                                          | OPEN                                                                                                            |
| 6   | the owner's disposition of the U23 mast-prompt colour (VIS-2)                                                                                                                                                                               | OPEN — after the walkthrough; V-6 frames `u23-mast-prompt-plot-a-west-ring` at both viewports                   |
| 7   | a non-Windows font check                                                                                                                                                                                                                    | OPEN — not verifiable on this machine                                                                           |
| 8   | a production-build check with a real test-Qualtrics flow                                                                                                                                                                                    | OPEN                                                                                                            |
| 9   | the privacy and security gate                                                                                                                                                                                                               | OPEN — note F-B6                                                                                                |
| 10  | M07-Q: (i) data from builds before the L1 fix (only if such data will be analysed; nothing here implies that participant data exist), (ii) whether to record the departure route, (iii) a production guard for a return without a departure | OPEN (REG §5.384 (d))                                                                                           |
| 11  | a participant-bundle export check                                                                                                                                                                                                           | OPEN — Part B's exports are the participant pipeline's own requests, but from the DEV server with a mock ingest |
| 12  | the owner's disposition of G4 (the bench opens live but inert in the same load after the review)                                                                                                                                            | OPEN                                                                                                            |
| 13  | the `pilot_records` `:734` stop (added by the owner's ruling of 23 October 2026): the scheduled occurrence's mechanism, test positioning versus a participant-facing interaction conflict at the Workshop bundles, and a failure rate       | OPEN — excepted by EX-B-734 for the commit's acceptance and the walkthrough only (§3)                           |

## 9. Backlog corrections (V-9) and the regression set

| Item             | What was done                                                                                                 | Result                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 / B-2 / B-17 | registry `window` labels corrected after a no-consumer grep; `world_v1_registry` pins them                    | `reg-world_v1_registry` exit 0; F-B5 lists the stale labels not named                                                                                                                                                                                                         |
| B-4              | unused `couplingAct` / `completeCoupling` / `waitActs` removed                                                | static checks exit 0                                                                                                                                                                                                                                                          |
| B-5              | `openFeedConsole` re-expressed as the v3 console route; `resumeAntenna` removed                               | `pilot_return` test 3 passes; tests 1 and 2 fail as at 43f12de (the named exception, §3)                                                                                                                                                                                      |
| B-7              | U8-12 re-expressed to the current state                                                                       | passes; the file's one failure is the base's M08 schedule (`:139` at `:146`)                                                                                                                                                                                                  |
| B-8              | the bare-route check tolerates system records by exact type AND `input_mode: 'system'`; a pure negative probe | the probe passes; the premise did not hold (F-B3): `pilot_route`, and `pilot_records` in the runs that reach `:854`, still fail at the base's assertion on the three M05 decline records (REG §5.387; the scheduled `pilot_records` run stopped earlier, at `:734`, EX-B-734) |
| B-9              | `pilot_episodes_1_2` episode 1 order (the lamp job first)                                                     | `reg-pilot_episodes_1_2` exit 0 (it failed at 43f12de)                                                                                                                                                                                                                        |
| B-10             | `signal_incident_models` titles and comments                                                                  | exit 0                                                                                                                                                                                                                                                                        |
| B-11 (I-1 = a)   | M22 report 1 lines, `m22-setbacks-v4`, the handover text, the coupling option removed                         | `m22_setbacks` exit 0 (the I-1 test); report 2's line is F-B4                                                                                                                                                                                                                 |
| B-12             | the yard probe cleared on pause; the helper refuses unless the yard is live                                   | V-8 PASS                                                                                                                                                                                                                                                                      |
| B-14             | not reproduced; no change                                                                                     | REG §5.392                                                                                                                                                                                                                                                                    |
| B-15             | room doc 11's M05 row                                                                                         | inspection                                                                                                                                                                                                                                                                    |
| B-16             | the handoff test title                                                                                        | inspection                                                                                                                                                                                                                                                                    |
| B-20 (B-T1)      | `waitAdvanceEnabled`'s predicate `=== 'accent'` and its comment                                               | `reg-m07-settle` exit 0 (6 passed)                                                                                                                                                                                                                                            |

**The regression set** (78 specs by the import-graph rule plus the "M07
settle" group; `diagnostics\regression-set.txt`): 59 commands exit 0, 20 exit
1, each compared with 43f12de (REG §5.400): eleven fail identically there,
seven fail identically for an unset capture-output directory
(environmental), `pilot_closure` `:154` fails at the same step and
assertion on 43f12de in two of three full-route runs
(`diagnostics\PILOT-CLOSURE-154-CLASSIFICATION.md`), and `pilot_records`
`:706` did not fail identically: the scheduled run stopped at a
single-press pickup (`:734`), before the base's step, and captured no
state, trace or full event list, so that occurrence's own cause is not
shown; one diagnostic rerun (work tree only) passed `:734` and ended at the
base's `:854` failure (`diagnostics\PILOT-RECORDS-706-CLASSIFICATION.md`),
which does not explain the `:734` stop. In the Part B closeout of 23
October 2026, one owner-authorised targeted run per tree, with traces: a
fresh 43f12de extraction stopped at the same assertion and step, its trace
showing the single Space press taken by the Case Workspace station (no
pickup event); cbc53dd passed `:734` and failed at `:854`; observed: 1 stop
in 3 runs on the work tree, 1 in 2 on 43f12de; no U24 diff touches the
path (`…\u24-end-to-end-evidence\B-closeout-2\PILOT-RECORDS-734-TARGETED-RUNS.md`).
The scheduled occurrence is not shown to share that mechanism; whether the
defect lies in the test's positioning or in overlapping station and bundle
ranges is not established. The owner's named exception EX-B-734 (§3)
covers the stop for the commit's acceptance and the walkthrough only; it
stays in the pre-collection queue (§8, item 13). No failure was shown to be
attributable to U24's changes. The capture specs' 95 tracked screenshots
were restored from HEAD and their 19 new outputs deleted, after both sets
were preserved with hashes; the operations themselves were not logged (REG
§5.400).

## 10. Models and reviews

The writer was Opus 5.5 (`claude-opus-5-5`). Verification was run by
Sonnet 5.5 (`claude-sonnet-5-5`): the scheduled pass and the two correction
rounds. The reviews were read-only Opus 5.5 reviews: scientific, gameplay
and visual. No Fable was used in the unit itself (R-1, Part B ruling); in
the Part B closeout the owner authorised one fresh, read-only Fable review
of F-B2, F-B7 and F-B8 (`claude-fable-5-1`, 23 October 2026;
`…\B-closeout-2\FABLE-REVIEW-F-B2-F-B7-F-B8.md`). The project agent types
`test-reviewer`, `scientific-reviewer`, `gameplay-reviewer` and
`visual-reviewer` could not be invoked in this session. Each was replaced
by a general-purpose agent on the role's model, given the role file and an
explicit no-edit instruction (R.2 substitution). Correction rounds used:
two of two (P-2). Round 1 covered the scientific and gameplay findings and
the S4 pointer cases. Round 2 corrected the writer's own S4 driver, which
had read a closed surface as open. The reviewers' findings and their
dispositions are in the UNIT-LOG "U24 Part B".

## 11. Commit checks

The staged checks run before the commit and verify-unit after it, followed
by the whole-branch scope audit against `b46b76b` with the union of
allowlists A and B. Their results are in the Part B handoff
(`HANDOFF.md` in the evidence folder), not in this committed file. Under
P-1 = a, a verify-unit exit 1 whose only FAIL lines name the ten
inventoried `.agents/` / `.codex/` files reads EXCEPTION-CONDITIONS-MET,
never PASS. **Result** (added in the Part B closeout, 23 October 2026):
the staged checks exited 0 and the whole-branch scope audit found 0 paths
outside the union of allowlists A and B; verify-unit exited 1 after the
commit, its only FAIL lines the ten untracked `.agents/` / `.codex/` files,
hash-identical before and after the commit (`logs\c-07-verify-unit.log`,
`precommit-gate-hashes.json`, `postcommit-gate-hashes.json`,
`branch-outside-union.txt`). V-11 is therefore EXCEPTION-CONDITIONS-MET
(P-1), never PASS.
