# Continuation handoff — Station 080 correction sprint

Written by Fable at the close of sprint session 1 (2026-09-18). Supersedes
`docs/verification/professional-world-rebuild-v3/CONTINUATION-HANDOFF.md`
for everything except its "Pitfalls carried forward" list, which still
holds in full.

## Exact state

- Branch `fable-professional-world-rescue-v2`, worktree
  `.claude/worktrees/fable-professional-world-rebuild`, unpushed. Start was
  `882189a`; this session's commits: `33f913c` (collision model, Dock,
  Concourse), `107c1b1` (Workshop), `13a2fec` (export), plus the final
  commit carrying this file (Yard rack solid, contextual chips, manifest,
  evidence, report). Tree clean at that commit.
- Nothing pushed, merged, tagged, deployed or deleted; no asset frozen; no
  asset-set version bump; no PixelLab generation; no open scientific
  decision resolved; no projection regenerated or promoted.
- Read first: `SPRINT-REPORT.md` (what is fixed / not done / not run),
  `COLLISION-AUDIT.md`, `EXPORT-AND-PERSISTENCE.md`,
  `OWNER-DECISION-REGISTER.md` (R1–R13).

## The new collision model in one paragraph

Avatar body = 22×14 feet box (origin x ± 11, y + 10 … + 24). Cell walls
('#', void, 'X') keep a 28 px skirt south of their south face, built as
static zones next to the tile layer (`StationMapBuilder.buildSolidBodies`),
so cell-authored rooms are vertically identical to before. Re-authored
rooms list `*_SOLIDS` pixel rectangles (no skirt; south edge 6 px short of
the painted base) and pass them as `layout.solids`; NPCs get `npcSolid`.
The pure model is `grid.ts` (`BODY`, `WALL_SKIRT`, `skirtRects`,
`bodyFits`, `gridOf(rows, solids)`). Author with the offline overlay
(scratch tool, not committed: node type-stripping dump of layouts +
registry → Pillow overlay), verify with `?collision=1` and
`e2e/collision_audit.spec.ts` (add the room to `ROOMS`).

## Exact next actions (in order)

1. **Owner:** R13 (PixelLab for the Yard / larger interiors — the single
   biggest unblocker), then R1–R4 (instrument scope, M↔Q binding,
   itemIdentity, route integration), R11/R12 (URL form, reload policy),
   R9. Paste the scoring-plan §6 note (the agent cannot write that file).
2. **Finish verification of this session's tree** (UNKNOWN, not green —
   list in `SPRINT-REPORT.md` §G): `pilot_yard`, `pilot_lab`, `pilot_deck`,
   `pilot_return`, `pilot_signal_incident`, `pilot_exterior_isolation`,
   `concourse_interaction_lifecycle`, `presentation_integration`,
   `m02_overlay_proof`, `world_v1_camera`, `world_v1_story`, lab / deck /
   core look tours, `persistence_physical`,
   `adversarial_reload_partial_state`, the legacy-route suites, then
   `v4_event_projection --retries=0` + `v3_projection_reference_delta`
   (expect the same five deltas; the Dock door anchor, gauge anchor and
   bundle reach are presentation geometry and must not change any event).
   Re-run `collision_audit` for the Concourse (sweep row corrected).
3. **Investigate the one unexplained flaky stall** (`pilot_records` test 2,
   island north-lane climb, (373,174)): reproduce alone; if it is the
   14 px feet box vs Phaser's tile separation bias (`TILE_BIAS` 16) at low
   frame rates, replace tile collision by static zones for wall cells too
   (the skirts already are).
4. **Recovery Yard rebuild** (A8) — design in `SPRINT-REPORT.md` "Not
   done"; one room unit; translate sites, M23 plot origin, `yardVia`,
   `pilot_exterior_models` literals together; re-anchor Post A / panel /
   Post B on the painted rack (walking distance inside the M26 window
   changes → note it for the owner before doing it).
5. Re-author Lab / Deck / Core / Yard-east props as pixel solids; add each
   to the audit spec; run the audit at 1920×1080 (`WV3_VIEWPORT`).
6. World-native loose-item sprites (A7); prompt / notification arbitration
   and small-text pass (D); matched before/after pairs and the route
   capture + recording (G) — and correct the recorder's manifest so it
   reports a measured frame rate, never the requested one.

## New pitfalls

- Editing `public/` also triggers a Vite full reload mid-run — treat it
  like `src/`.
- `npx prettier --write src/systems/*.ts` rewrites line endings of files
  you did not touch (CRLF working copies); format only the files you
  edited, or restore the others from the index.
- Shell heredocs with apostrophes inside a Python heredoc can be rejected
  by the pretool guard — write docs with the Write tool.
- `docs/research/scoring-plan.md` is write-protected for the agent.
- The detached launcher used this session (scratch, not committed):
  `bash run.sh <name> [ENV=…] -- <playwright args>` started through
  PowerShell `Start-Process`, writing `%TEMP%/s080/<name>.log` and
  `<name>.done`.
