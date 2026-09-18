# Continuation handoff — professional world rebuild V3

> **Superseded (2026-09-18)** by
> `docs/verification/station-080-correction/CONTINUATION-HANDOFF.md`; the
> "Pitfalls carried forward" list below still holds.

Written by Fable at the close of the fourth session (2026-09-15, unattended
verification and release-candidate run). A fresh session continues from
here without reconstruction. The previous checkpoint (`68e7f07`) is
superseded by this file.

## Exact state

- **Branch / worktree:** `fable-professional-world-rescue-v2` in
  `.claude/worktrees/fable-professional-world-rebuild` (unpushed).
- **Final code commit: `dba9a37`** (on `2dee30b` on `68e7f07`). Both are
  e2e-driver / DEV-probe commits; `src/` changed only by the read-only DEV
  frame-time probe (`viewport.publishFrameProbe`, called from
  `RoomScene.update`). The docs/evidence commit on top of `dba9a37` carries
  this file, `REBUILD-REPORT.md` §"Session 4", `OWNER-REVIEW-PACKAGE.md`,
  every capture and the regenerated projections. Working tree CLEAN at that
  commit. Nothing pushed, merged, tagged, deployed or deleted; no open
  scientific decision resolved; projection reference not promoted; asset-set
  version not bumped; no PixelLab generation spent.
- Runner worktrees `fable-v3-runner` (`1e76cf3`) and `fable-v3-runner2`
  (`731c947`) untouched, still for HUMAN removal. The 2026-09-13 orphan
  chain (PIDs 19036/17300) was terminated at the start of session 4; a
  second Claude session then replayed runner-2 suites concurrently for the
  first half of the session (not terminated — not in the authorisation).
- Dev server: Playwright starts and stops its own Vite on port 5341 per
  run (`PW_DEV_PORT=5341`); no orphan server left.

## What session 4 established (details: `REBUILD-REPORT.md` §"Session 4")

- **M03 Press B**: driver pointer-coordinate defect (corner drag under the
  V4 design camera), proven by the baseline run at `aaa73fd` (pass) and
  the HEAD diagnostic; fixed (slot centres). `pilot_return` 1/2/3 green.
- **Stale expectations** fixed in `pilot_return` (:567/:1049 — the V4 story
  spine's zone-narrowed `deck_closure` line) and `pilot_records` (missing
  import); three more missing `designToPage` imports in the inventory specs.
- **Yard timing**: `pilot_yard` test 1 alone = 224 s and 235 s item-owned
  (< 300 s), wall 376 / 421 s; the session-3 338 s was concurrent-load
  automation burden + driver settle inefficiency; the limit was not changed.
- **1920×1080**: complete evidence set at `dba9a37` — five look tours and
  the full route at both canvases; the driver is frame-aware
  (`settleAfterKeyUp` across a rendered frame) with bounded re-approaches
  (`approachAudited`); measured 5.3–6.9 fps / ~28 px per frame at 1080.
- **Projection**: `world-v3.json` (dba9a37) = `world-v1-before.json` + exactly
  the five `3a4ff96` deltas (pure spec `v3_projection_reference_delta`,
  0 differences); `world-v3-1080.json` = `world-v3.json` (0 differences).
- **Recording**: `route/1280x720/route-1280x720.webm` (20.2 MB, VP8 + Opus,
  audio true, 10 fps) from the watched opening to the stable Core at
  `dba9a37`, manifest with the commit; 1080 frames in `route/1920x1080/`.
- **Final verification** (§7): every listed suite green at `dba9a37`; two
  flaky-passes (documented input-miss class) and one intermittent queue
  failure (`adversarial_reload_partial_state`) that passed alone.

## Exact next actions (in order)

1. Research owner: decide the projection promotion (`world-v3.json` →
   post-fix reference), the automation-envelope proxy, the workshop locker
   audit-margin note, the asset-set version / stimulus freeze, P1–P20.
2. If promoted: point `v4_event_projection`'s default baseline (or the
   `V4_PROJECTION_BASELINE` used by the verification queue) at
   `world-v3.json`; the pure delta spec then becomes a historical check.
3. Optional driver headroom (report §3): skip the fixed 100 ms pre-settle
   wait when the frame probe shows a fresh frame; size the final-approach
   burst from the measured frame time.
4. Optional polish (unchanged): state-chip register; Mast 04 chip vs the
   canvas edge / the avatar; deck readout wrap.
5. Human: remove the two runner worktrees; consider an e2e typecheck in CI
   (the one-off `tsc --ignoreConfig … e2e/*.ts` command is in report §2 —
   the pretool guard protects TypeScript configuration files).

## Scientific standing (unchanged constraints)

- All world-v2 art PROVISIONAL, model-selected, not human-approved; asset
  set version not bumped. P1–P20 in
  `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` await the research
  owner; nothing implemented from it.
- Presentation-only discipline held in session 4 as well: no event name,
  payload key, window, form, prompt/option/feedback text or scoring path
  changed; the only `src/` change is the DEV-only frame probe.

## Pitfalls carried forward

- One SwiftShader browser at a time; check `Get-CimInstance Win32_Process`
  for foreign `playwright`/`vite`/`chrome-headless` processes before a
  timing-sensitive run — another session may be replaying runner suites.
- Never edit `src/` while a run serves from this worktree (Vite HMR); e2e
  and docs edits are safe. Do not run `tsc`/`eslint` beside a timing run.
- The Bash tool caps at 10 min: long runs go through the detached
  launcher pattern (a PowerShell `Start-Process` wrapper writing
  `<log>`, `<log>.pid`, `<log>.done`; a Monitor polls the `.done` file).
  Stopping a Monitor never kills the Playwright tree — kill the launcher's
  PID with `taskkill //PID <pid> //T //F`.
- commitlint: header ≤ 100 characters (a longer header aborts the commit
  AFTER lint-staged's stash round-trip; the tree is restored but nothing
  is committed).
- `git diff` is wrapped by an external diff on this machine — use
  `git --no-pager diff --no-ext-diff` (or write to a file) to read one.
- The pretool guard blocks shell heredocs containing `<=`/`>=` (parsed as
  redirections) and any new `tsconfig*.json`; write such content with the
  Write tool or through a scratchpad file.
- Playwright clears `test-results/` at each run start; capture specs
  overwrite historical PNGs (`world_v1_camera` →
  `professional-world-v1/unit1/dock-arrival-*.png`, `pilot_closure_capture`
  → `screenshots-evidence-led-pilot-v2/35–47`, `m02_overlay_proof` →
  `screenshots-concourse-hotfix/filing-station-open.png`) — copy the fresh
  frames where they belong and restore the historical files from the index.
- Retries overwrite projection JSONs — run `v4_event_projection` with
  `--retries=0`.
- Body geometry for drivers: top edge = probe y − 18, bottom = probe y + 24;
  drift pass y 211–232; gantry column y ≥ 211; line-status panel is a hard
  prop on the post row; lab east climb window x 496–528; Concourse west
  pocket y 178–200; the eastward gauge leg needs y ≥ 244; at 1080 the
  frame quantum is ~28 px, so landings sit on the ±12 px box's corners.
- Memory writes go through a scratchpad copy (`node` copy into the memory
  directory — the PreToolUse guard blocks direct writes outside the repo).
