# Continuation handoff — Station 080 correction sprint

Written by Fable at the close of sprint session 2 (2026-09-19 to 09-21). Supersedes
the session-1 text of this file and
`docs/verification/professional-world-rebuild-v3/CONTINUATION-HANDOFF.md`
(whose "Pitfalls carried forward" list still holds in full).

## Exact state

- Branch `fable-professional-world-rescue-v2`, worktree
  `.claude/worktrees/fable-professional-world-rebuild`, unpushed.
  Session 1: `33f913c`, `107c1b1`, `13a2fec`, `bde6928`. Session 2:
  `7231845` (Lab / Deck / Core pixel solids), `478199e` (open Recovery
  Yard), `0b35ab91` (M04 debris sprites, driver lane-climb check), `c8dfd52d`
  (Workshop benches on pixel solids — the last product change), plus the
  final audit-tool / docs / evidence commit carrying this file. Tree clean at that
  commit.
- Nothing pushed, merged, tagged, deployed or deleted; no asset frozen; no
  asset-set version bump; no projection promoted; no open scientific
  decision resolved. PixelLab: owner-authorised on 2026-09-19 (register
  R13); 320–350 generations spent on the Yard only.
- Read first: `SPRINT-REPORT.md` (both sessions: fixed / not done / not
  run), `COLLISION-AUDIT.md`, `EXPORT-AND-PERSISTENCE.md`,
  `OWNER-DECISION-REGISTER.md` (R1–R15),
  `docs/game/world-v3/YARD-ART-PROVENANCE.md`.
- A scratch **frozen runner** (a plain copy, NOT a git worktree) may still
  exist at `%TEMP%/s080-runner` with a `node_modules` junction into the
  main checkout; it is disposable — delete the folder (remove the junction
  first with `rmdir`, never recursively through it).

## How the world is built now

- **Collision:** avatar = 22×14 feet box; cell walls keep a 28 px skirt
  (static zones); every participant room lists `*_SOLIDS` pixel rectangles
  (`layout.solids`); NPCs get `npcSolid`. Pure mirror: `layouts/grid.ts`.
  DEV overlay `?collision=1`; real-input audit
  `e2e/collision_audit.spec.ts` (all seven rooms in `ROOMS`).
- **Open rooms (the Yard is the template):** a composed ground plate
  (`scripts/world-v2/compose_yard_field.py`); free-standing prop sprites in
  a placement table (`YARD_PROPS`: top-left, size, base solids) drawn by the
  scene at foot-line depth; anchors derived from the sprite placement; and
  the grid navigator for drivers (`e2e/navGrid.ts`: BFS over the pure
  model, L-shortcutting, exact last legs). Keyed sprites:
  `scripts/world-v2/key_yard_props.py`; install:
  `scripts/world-v2/install_yard_assets.py`.
- **Evidence runs** go through a frozen copy so `src/` / `public/` can be
  edited meanwhile (Vite reloads on both); one browser at a time.

## Exact next actions (in order)

1. **Owner:** R14 (automation envelope on the open yard — the one red
   assertion), R15 (interior enlargement order and sizes), then R1–R4,
   R9, R11, R12. Paste the scoring-plan §6 note (file is write-protected
   for the agent; text in `EXPORT-AND-PERSISTENCE.md` §1).
2. **Finish what the report's session-2 verification lists as not run:**
   the legacy-route suites (the body change is global), the export browser
   suites (`participant_completion_handoff:1042` keep-alive flaky-pass is
   still unexplained), the collision audit at 1920×1080, the route capture
   and recording, matched before/after pairs. Everything else — all seven
   room audits, both projections (0 differences), the measurement-path
   suites after every collider commit — is green at `c8dfd52d`.
3. **Interior enlargement, one room per unit** (after R15): generate the
   enlarged plate (style reference = the room's own V2 plate), key or
   redraw its props as sprites, derive the book from the placement table,
   port the room's drivers to `navigateTo`, add the room to the audit.
4. Driver headroom for R14: `navigateTo` still stalls ~15× in the yard
   test (final exact legs pushing against prop solids at approach points
   that hug their prop, e.g. the coupling's north stand); plan the last leg
   AWAY from the solid or accept a landing inside the ±12 px box.
5. Polish list: mirrored-ground X patterns at the yard's mirror seams
   (x 688 / 1376, y 384 — cover with decor or generate a wider ground);
   weak side banks; prompt / notification arbitration and the small-text
   pass (D); matched before/after pairs; route capture + recording with a
   MEASURED frame rate in its manifest.

## New pitfalls

- Editing `public/` also triggers a Vite full reload mid-run.
- `npx prettier --write src/systems/*.ts` rewrites line endings of files
  you did not touch — format only what you edited.
- commitlint: subject must not start with a capital or contain
  sentence-case words at the start ("Laboratory …" failed); header ≤ 100.
- The pretool guard blocks recursive `rm` and shell text containing `>=`
  in heredocs aimed outside the repo — write scripts with the Write tool.
- PixelLab jobs expire after 8 h: old job ids cannot be re-fetched, so
  style references must be sent inline (base64). Do that from a SUBAGENT
  (it writes to a temp folder; the main session copies the results in) or
  the payloads flood the main context. 688×384 is the largest 16:9 canvas;
  larger scenes are composed from mirrored repeats.
- Snow-keying props out of a painting fails where they overlap the painted
  sky (tall props) — redraw those as sprites with the crop as reference.
- `docs/research/scoring-plan.md` is write-protected for the agent.
