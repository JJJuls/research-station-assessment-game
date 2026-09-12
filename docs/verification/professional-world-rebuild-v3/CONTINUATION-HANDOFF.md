# Continuation handoff — professional world rebuild V3

Written by Fable at the context checkpoint of the second long-run session,
2026-09-13. A fresh session continues from here without reconstruction.
The previous checkpoint (`5027b08`) is superseded by this file.

## Exact state

- **Branch / worktree:** `fable-professional-world-rescue-v2` in
  `.claude/worktrees/fable-professional-world-rebuild` (unpushed).
- **HEAD:** see the top of `git log` — the docs/handoff commit on top of
  `731c947` (yard) on top of `1e76cf3` (laboratory + deck + chamber) on
  top of `5027b08`. Working tree CLEAN at the docs commit. Nothing
  pushed, merged, tagged, deleted; no open scientific decision resolved.
- **Two extra worktrees exist for HUMAN removal** (Claude never removes a
  worktree): `.claude/worktrees/fable-v3-runner` (detached at `1e76cf3`)
  and `.claude/worktrees/fable-v3-runner2` (detached at `731c947`). Each
  carries a `node_modules` junction to the main tree's `node_modules`.
  They were created so long functional suites could run on a frozen
  checkout while this worktree was edited (Vite's HMR reloads the page
  under a live Playwright run — an in-engine finding this session; see
  `REBUILD-REPORT.md`). Ports: 5341 here, 5342 runner, 5343 runner2.

## What this session landed

1. **Every remaining zone renders its painted plate** — Diagnostics
   Laboratory, Utility Deck, Core Chamber (`1e76cf3`) and the Exterior
   Recovery Yard (`731c947`), each with an audited coordinate book,
   registry entries, `PILOT_DOORS` on the baked doorways, a scene rewrite
   that hides every marker sprite and layers state over the painting, a
   pass-aware e2e router (`labVia` / `deckVia` / `coreVia` / `yardVia` +
   `*Approach` helpers deriving every offset from the registry) and a
   look spec (`e2e/world_v2_<room>_look.spec.ts`, rooms lab / deck /
   core / yard) that walks every audited approach on real input and
   captures 1280×720 frames under
   `docs/verification/professional-world-rebuild-v3/<room>-look/`.
2. **Geometry findings fixed in-engine** (the pre-derived books were not
   unquestionable): the laboratory's east bay joined its north lane
   through a 1 px slot (widened to a 32 px window; slot-width audit
   added to the checker set); the deck's Concourse-side spawn moved beside
   its door with re-audited review/door anchors; the chamber got a door
   pocket; the yard's apron/mast/rig anchors were re-derived until the
   nearest-wins audit passed.
3. **M23 plot translated with the yard** (presentation only): origin
   cols 26–32 / rows 3–8; size 7 × 6 and both target cells' relative
   positions unchanged; the pure models spec's sweep literals shifted by
   the same (+320, −160).
4. **Driver debt repaired en route:** the M18-history test's stale
   pre-rescue workshop literal (704,416) now uses the audited lattice
   bench approach.

## Verification at the yard commit (`731c947`)

- `tsc --noEmit`, `vite build`: pass. Pure suites 55/55 (`world_v1_registry`
  incl. all six zones, `spawn_clearance`, `pilot_route_model`,
  `world_v1_story_state`, `pilot_exterior_models`).
- Look specs: lab 1.8 min, deck 1.3 min, core 1.3 min, yard 6.9 min — all
  green on real input.
- Functional suites (frozen runners): results recorded in
  `REBUILD-REPORT.md` §"Session 2 functional runs" — read that section
  for what was green, what failed and what was still running when the
  session ended.

## Exact next actions (in order)

1. **Read the functional results** in `REBUILD-REPORT.md`; re-run any
   suite listed as unfinished from a frozen runner (`cd
.claude/worktrees/fable-v3-runner2 && PW_DEV_PORT=5343 npx playwright
test e2e/<spec>.spec.ts`). The runners are at older commits than HEAD
   only by the docs commit — `git -C <runner> checkout --detach <HEAD>` is
   fine before re-running.
2. **Full-route projection + captures at the final commit** (not done
   this session): `v4_event_projection` (label world-v3) compared against
   `world-v1-before` expecting the rescue's 0-diff; `pilot_closure_capture`
   for the deck feeds-up / Core stable before-after frames;
   `world_v2_slice_capture` pattern extended through the four new rooms for
   the 1920×1080 set and the real-input playthrough video (the procedural
   audio bed is already present in recordings).
3. **Open driver item carried forward:** `concourse_interaction_lifecycle`
   still drives pre-rescue Concourse legs (see the V3 report run-2 notes).
4. **Presentation polish backlog** (all optional, none blocking): the
   world state chips (`chip()` in the zone scenes) still read like labels —
   a shared environment-register style pass; the deck's manifold readout
   wraps to two lines; the yard's rig chip stacks over the rig prompt.

## Scientific standing (unchanged constraints)

- All world-v2 art PROVISIONAL, model-selected, not human-approved; asset
  set version not bumped (human decision). No PixelLab generation was
  spent this session (≈1220 remain).
- P1–P20 in `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` (incl. the
  zero-filled legacy summary B1/P2 and construct coverage P1) await the
  research owner. Nothing implemented from it.
- Presentation-only discipline held in every room unit: no event name,
  payload key, window, form, prompt/option/feedback text or scoring path
  changed; positions changed (rescue precedent). The one model-file edit
  (`m23ExcavationModel.M23_PLOT` origin + target cells) is a translation
  that preserves the fixture's size and relative geometry, documented in
  the file and the commit.

## Pitfalls carried forward

- **Never edit `src/` while a Playwright run is live in the same
  worktree**: Vite HMR reloads the page mid-test (two runs were lost to
  this before the frozen-runner pattern was adopted). e2e/docs edits are
  safe (not in the served graph).
- The nearest-wins rule needs anchors ≥ ~50 px apart for their ±12 px
  landing boxes; run `geom-check.mjs` AND `slot-check.mjs` (scratchpad
  pattern) — an 8 px BFS alone accepted a 1 px slot.
- **This machine cannot sustain more than one SwiftShader browser run**:
  two frozen runners plus the working tree's server produced dev-server
  start-up timeouts, 420 s walking stalls and timing-sensitive driver
  failures. Run ONE suite at a time; treat concurrent-run failures as
  UNKNOWN, never as regressions.
- Repo-wide CRLF: prettier/eslint run per file; lint-staged is the gate.
- Memory writes go through a scratchpad python script (PreToolUse guard).
- Capture specs overwrite historical evidence PNGs — check before a
  camera/story run touches `professional-world-v1/unit1/*`.
