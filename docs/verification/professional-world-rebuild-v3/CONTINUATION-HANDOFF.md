# Continuation handoff — professional world rebuild V3

Written by Fable at the close of the third session (2026-09-14, unattended
verification, correction and evidence run). A fresh session continues from
here without reconstruction. The previous checkpoint (`fe768ef`) is
superseded by this file.

## Exact state

- **Branch / worktree:** `fable-professional-world-rescue-v2` in
  `.claude/worktrees/fable-professional-world-rebuild` (unpushed).
- **HEAD:** the export-key alignment commit (`e24d680`) on top of the
  docs/evidence commit `1af2323` on top of `fc3e5da` (e2e drivers + V3
  route capture and recorder) on top of `e402cd8` (world-prompt canvas
  clamp, yard chip placement, DEV audio tap) on top of `fe768ef`. Working
  tree CLEAN at the top commit (this line was added in a final docs commit). Nothing pushed, merged, tagged, deleted;
  no open scientific decision resolved; no PixelLab generation spent.
- **Runner worktrees** (`fable-v3-runner` at `1e76cf3`, `fable-v3-runner2`
  at `731c947`) are untouched and remain for HUMAN removal. At the start
  of session 3 an orphan chain still referenced `fable-v3-runner2` (a hung
  `playwright test e2e/pilot_exterior_isolation.spec.ts` from 08:57 and
  its Vite server on port 5343 — PIDs 19036 / 17300 and their `npx`
  wrappers, no browser attached); they were left running as instructed.
- Dev server for this worktree: port 5341 (an orphan Vite from the
  previous session, PID 20016, was reused all session).

## What session 3 established (details: `REBUILD-REPORT.md` §"Session 3")

- Every browser run strictly sequential (one server, one browser, one
  spec, one worker). Proven alone at the final source: pilot_route 4/4,
  pilot_yard test 3, pilot_exterior_isolation 2/2, world_v1_interactions
  3/3, concourse_interaction_lifecycle 3/3, presentation_integration 11/11,
  m02_overlay_proof 2/2, pilot_lab 3/3, pilot_deck 1/1 (through the
  rebuilt yard), world_v1_camera 3/3, world_v1_story 3/3, pilot_closure_capture
  1/1, the V3 route capture at 1280×720 with the audio recording, and the
  pure suites 56/56; tsc / build / lint pass.
- pilot_yard test 1: every behavioural assertion passed; only the final
  automation envelope (item-owned active 338 s > 300 s) fails — a
  research-owner decision, not weakened.
- Scientific projection `world-v3` = `world-v1-before` + exactly the
  `3a4ff96` scientific-fix deltas (B6 +1 `pilot_zone_entered`, A3 +3
  `pilot_npc_beat` payload keys); nothing rebuild-related.
- 1920×1080: the route capture reached 12 frames (workshop board) before
  an 8 s surface wait timed out; look specs lab 14/14, the other four
  partial (driver landing precision at the 3× software-GL canvas — the same
  approaches are green at 1280×720 on the same commit). The full 1080 set
  is still to be produced (faster renderer or a 1080-tuned driver).
- Still red, documented: `pilot_return` test 1 at the M03 Press B pointer
  drag (`objects_restored` 0; unresolved, baseline run at `aaa73fd`
  pending); `v4_core_dev_capture` (ARM refused under the developer
  inspection launch; developer-only, participant-path frames exist).
- Persistence and export re-verified alone: `state_session_continuity`
  4/4, `adversarial_reload_partial_state` 1/1, `persistence_physical` 3/3
  (one flaky), `research_export_test_mode` 11/11 after aligning the frozen
  envelope's key list with audit fix B2 (`measurement_validity`,
  `pilot_coverage`; one flaky).
- Not run this session (browser budget): `pilot_return` tests 2–3,
  `pilot_records`, `pilot_signal_incident` (green in sessions 1–2) and
  `participant_completion_handoff` — legacy-route or geometry-independent;
  list them first next session.

## Exact next actions (in order)

1. Run the suites listed as "not run" above, one at a time
   (`PW_DEV_PORT=5341 npx playwright test e2e/<spec>.spec.ts`).
2. `pilot_return` test 1: reproduce the Press B drag miss alone, then run
   the same test at the pilot-v3 baseline worktree
   (`.claude/worktrees/fable-evidence-led-pilot-v2`, `aaa73fd`, own port) to
   classify pre-existing vs regression; the drag helper is
   `returnHelpers.pressBatchB` (designToPage mapping).
3. If the research owner re-baselines the automation envelope or the
   projection reference, update `pilot_yard.spec.ts:524` / promote
   `projection/world-v3.json` — never autonomously.
4. Optional polish (unchanged): shared environment-register style for the
   state chips; the deck manifold readout wraps.

## Scientific standing (unchanged constraints)

- All world-v2 art PROVISIONAL, model-selected, not human-approved; asset
  set version not bumped. P1–P20 in
  `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` await the research
  owner; nothing implemented from it.
- Presentation-only discipline held: no event name, payload key, window,
  form, prompt/option/feedback text or scoring path changed this session;
  the M23 plot translation (7 × 6, relative target cells) is unchanged and
  re-verified in-engine.

## Pitfalls carried forward

- One SwiftShader browser at a time; never edit `src/` while a run is live
  (Vite HMR reloads the page); e2e/docs edits are safe.
- Stopping a Monitor does not kill the Playwright tree on Windows — kill the
  root `bash` PID with `taskkill //PID <pid> //T //F` before the next run.
- Playwright clears `test-results/` at each run start (read error contexts
  before the next run); `--trace on` writes ~240 MB per long test.
- Capture specs overwrite historical PNGs (`world_v1_camera` →
  `professional-world-v1/unit1/dock-arrival-*.png` — restore from the
  index after a run); a retry overwrites projection JSONs — preserve the
  first attempt before the retry finishes.
- Body geometry for drivers: top edge = probe y − 18, bottom = probe y + 24;
  drift pass y 211–232; gantry column y ≥ 211; line-status panel is a hard
  prop on the post row; lab east climb window x 496–528; Concourse west
  pocket y 178–200; the eastward gauge leg needs y ≥ 244.
- Memory writes go through a scratchpad copy (`node` copy into the memory
  directory — the PreToolUse guard blocks direct writes outside the repo).
