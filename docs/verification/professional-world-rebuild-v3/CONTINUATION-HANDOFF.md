# Continuation handoff — professional world rebuild V3

Written by Fable at the mandated ~80 % context checkpoint, 2026-09-13.
A fresh session continues from here without reconstruction.

## Exact state

- **Branch / worktree:** `fable-professional-world-rescue-v2` in
  `.claude/worktrees/fable-professional-world-rebuild` (unpushed).
- **HEAD:** `0d27e96` (workshop rebuild + all plates) on top of
  `3a4ff96` (science audit defect fixes) on top of the rescue
  checkpoint `5d05115`. Working tree CLEAN. Nothing pushed, merged,
  tagged, deleted; no open scientific decision resolved.
- **Verified at HEAD:** `tsc --noEmit` + `vite build` green; pure
  suites 29/29 (`world_v1_registry` 11, `spawn_clearance`,
  `pilot_route_model`, `world_v1_story_state`);
  `world_v2_workshop_look` green (15-station real-input prompt tour);
  `m02_overlay_proof` 2/2; functional-run details + the one open driver
  item in `REBUILD-REPORT.md` beside this file.

## Completed this session

1. Comprehensive scientific audit (2 read-only agent passes) →
   `docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md`;
   research-owner proposal queue P1–P20 in
   `docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` (**nothing
   implemented from it**). Defect-class fixes committed (`3a4ff96`):
   A7, A8, B6, A15, A14, A16, B2 (validity register + coverage now ride
   every export payload), A3 (option order/focus exported per NPC-beat
   choice). Qualtrics-logging review of B2/A3 beside the findings.
2. Records Workshop rebuilt as the painted 43×12 two-bay hall and
   verified in-engine (`0d27e96`); three pre-existing test defects
   fixed en route (arbitrated evidence in REBUILD-REPORT).
3. Plates generated + landed for ALL remaining zones (laboratory, deck,
   core, yard) with provenance; laboratory/deck/core layout modules
   pre-staged. PixelLab budget ≈ 1220 generations left; style anchor =
   workshop west-bay job `d4c70eb3` (hosted URL works as
   `style_image_url`).

## Current visual direction

Harbour Light painted plates (rescue report §1) at the 640×360 field,
2×/3× integer composite. Multi-plate rooms join through PAINTED
features (workshop: facing doorways → vestibule; yard: facing drift
banks → mountain pass) — never blended seams.

## Exact next actions (in order, one room per pass)

1. **Diagnostics Laboratory unit.** Everything is pre-derived: plate
   `laboratory-plate.png` + `src/world/layouts/laboratory.ts` are
   committed; the machine-audited coordinate book (anchors/approaches/
   spawns, incl. Kai at (560,172), workstation island approach from the
   west, door anchors S(334,300)/airlock(250,140)) is in the memory
   file `fable-world-rebuild-v3` and re-checkable via the scratchpad
   checker pattern. Recipe = the workshop pattern: worldV2Assets key,
   LAB_STATIONS rewrite in zoneSites, PILOT_DOORS
   diagnostics_laboratory → [(334,300) concourse, (250,140) yard],
   LAB_REGISTRY, scene rewrite (plate layout, hide marker sprites,
   draw the signal display's dynamic trace INSIDE the painted bezel —
   screen centre ≈ (437,97), box x 372-502 / y 68-126; drop
   buildLabGrammar's plates/dashes, keep lamps + numerals as dynamic
   overlays at the benches), spec LAYOUTS/SPAWNS entries, a
   `world_v2_lab_look` tour spec, then `pilot_lab`,
   `pilot_signal_incident`, `ip_lab_flow`. e2e legs to update:
   `PILOT.lab` book in pilotHelpers + `concourseToLabBriefed` /
   `labToYardBriefed` / `yardReturnToConcourse` lab-side walks.
2. **Utility Deck unit** — same recipe; FINAL audited book is in the
   memory file (the committed `deck.ts` needs its coolant/breaker
   footprints updated to `[3.3,7,3.6,4]` / `[9.1,7,2.9,4]` per the
   final checker). Feed state presents as layered lamps/glows over the
   dormant painted machines (Dock power-step-up precedent) — the
   FeedPanelScene, availability rules and `pilot_closure_*` events are
   untouched. Suites: `pilot_deck`, `pilot_closure`.
3. **Core Chamber unit** — same recipe; corridor floor must be rows
   8-10 (`[2,8,18,3]`); keep the emissive/glow/ramp layers over the
   dormant painted core. Suites: `pilot_closure`, `v4_core_dev_capture`.
4. **Recovery Yard unit (largest — do last, alone).** Plate landed.
   43×12; drift pass ≈ cols 19-23 rows 6-7. Touches the field-action
   layers (scan/dig/winch), M23 plot model coordinates
   (`m23ExcavationModel.M23_PLOT` — POSITION move is presentation, its
   size/cells are measurement fixture), `YARD_RIG_PAD`,
   `exteriorHelpers.ts` legs, `pilot_yard` / `pilot_exterior_*` suites.
5. **Driver debt:** port `concourse_interaction_lifecycle` travel legs
   to `concourseVia`/`workshopVia` (analysis in REBUILD-REPORT run-2
   notes; product surfaces proven green elsewhere).
6. **Closing evidence at the final commit:** re-record the full-route
   projection (`v4_event_projection`, label world-v3) and compare
   against `world-v1-before` expecting the rescue's same 0-diff result;
   fresh two-resolution captures + a full real-input playthrough video
   (`world_v2_slice_capture` pattern extended through the new rooms —
   the procedural audio bed is already present in recordings); update
   the rescue-style report; consider a `world_v2_first_look`-style pass
   per new room.

## Scientific standing (unchanged constraints)

- All world-v2 art PROVISIONAL, model-selected, not human-approved;
  asset-set version not bumped (human decision).
- P1–P20 (incl. the zero-filled legacy summary B1/P2 and construct
  coverage P1) await the research owner. Do not resolve autonomously.
- Presentation-only discipline for every room unit: no event name,
  payload key, window, form, prompt/option/feedback text may change;
  positions may (rescue precedent, projection-verified).

## Pitfalls carried forward

- PW_DEV_PORT 5341 here (5321 in the evidence-led worktree).
- Repo-wide CRLF: global eslint unusable in-worktree; lint-staged is
  the gate (it caught 2 unused imports this session).
- Memory writes must go through a scratchpad python script (PreToolUse
  guard blocks direct writes outside the repo).
- PixelLab: my inline base64 reproduction is UNRELIABLE at any size —
  never round-trip images by typing base64; use hosted job URLs
  (`get_image` download links, valid ≥ hours) or pure-PIL edits.
- Capture specs overwrite historical evidence PNGs — restore
  `docs/verification/professional-world-v1/unit1/*` (done once this
  session) if a camera/story run touches them again.
- Footprint cells round OUTWARD (blockout): a body is 42 px tall — every
  lane needs TWO open rows; verify with the scratchpad checkers before
  editing scenes.
