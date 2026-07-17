# Canonical Q01-Q33 asset production report

Task: `FABLE-AUTONOMOUS-CANONICAL-Q01-Q33-ASSET-PRODUCTION.md` (Desktop).
Branch: `fable-canonical-asset-production-v1` (isolated worktree
`.claude/worktrees/canonical-asset-production`), base `e9d3e21` — the
current integrated development HEAD of `fable-autonomous-game-build-v1`.
Date: 2026-07-18. Docs/spec-only commit; no push, no merge.

## 1. Generation-tool availability (headline)

**No approved image-generation tool was available in the producing
session.** The PixelLab MCP server is not configured in this environment
(no `.mcp.json`, no `mcp__pixellab__*` tools; a deferred-tool search found
no image-generation capability), and no other approved generator exists in
the repo. Per the task contract, completion was **not fabricated**:

- Zero binary assets were generated. All candidate PNG paths in the
  manifest are planned paths; `public/assets/generated/**` contains only
  `.gitkeep` scaffolding.
- Zero contact sheets exist; their format is specified (prompt pack §1.4)
  and they are produced with the first real generation pass.
- The deliverable is a **complete prompt/specification pack**: every
  candidate is fully specified (prompt, variants, dimensions, frames,
  settings, traceability, risks), so an approved future pass can execute
  mechanically. **Binary generation remains PENDING**, and even when a
  tool is available, generation stays gated by the PixelLab skill's
  explicit-standalone-approval rule.

## 2. Sources used / missing

Used (all read in this pass):

1. `docs/game/Q01-Q33-PLAYABLE-GAME-BLUEPRINT.md` (identity, NPC
   architecture §4 incl. per-NPC asset needs, gathering policy §5,
   scenario separation §6).
2. `docs/game/Q01-Q33-REQUIREMENTS-TRACEABILITY-MATRIX.md` (structure and
   per-Q construct/direction rows used to cross-check the manifest's
   `q_ids`).
3. `docs/game/CANONICAL-ROOM-AND-MINIGAME-CONTRACTS.md` (per-room layout,
   minigame mechanics, NPC/system rows — the prop list's traceability
   source).
4. `docs/game/PLAYABLE-FOUNDATION-SYSTEMS-SPEC.md` (S1-S16; item
   registry, carried-items HUD, dialogue presentation constraints).
5. `docs/game/GAME-SYSTEM-ADMISSION-AND-EXCLUSION-MATRIX.md` (admission
   classes per asset; exclusion rulings incl. sample collection and
   anomaly arc).
6. `docs/game/Q01-Q33-IMPLEMENTATION-ROADMAP.md` (Stage 4 gated
   visual-production sequence).
7. Room docs `docs/game/rooms/00-08` (existence/status confirmed) and the
   full asset tree under `public/assets/` (inventory + measured PNG
   header dimensions).
8. Visual-design commit `e0684e9` (read via `git show`; on branch
   `fable-visual-npc-minigame-design-v1`): visual asset integration plan
   ("Polar Meridian" §2, room-by-room plan §3), NPC dialogue/role spec
   (Kai/Vale/Noor profiles, sprite plan), reusable minigame UX spec
   (panel geometry, state/feedback rules), pilot visual-polish backlog
   (M1-M5/S1-S5).
9. `docs/assets/pixellab-asset-manifest.md` (accepted-asset provenance
   conventions: tool modes, view/outline/shading settings, job-ID +
   SHA-256 recording, rejection-log discipline) and
   `src/constants/assets.ts` (texture keys, `ASSET_SET_VERSION` rule,
   player frame counts).

Missing / deliberately not mined:

- **PixelLab MCP / any image generator** — missing (above).
- **Locked Q01-Q33 workbooks**: a `Final Questionnaire Bohemia.docx`
  exists on the Desktop, but it was **deliberately not opened**: exact
  questionnaire wording must never influence player-facing stimuli (all
  candidates are text-free by specification), and every Q-ID mapping
  needed here is already encoded in the traceability matrix and room
  contracts. This is a wording-leakage safeguard, not a gap.
- `docs/game/ASSET-INTEGRATION-MANIFEST.json` from `e0684e9` was
  consulted indirectly via its companion plan; its inventory duplicates
  the on-disk verification done directly in this pass.

## 3. Repository dimension ground truth (measured this pass)

| Surface         | Measured                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Player frames   | 96×96 px (idle 4f, walk 8f, rotations; 8 dirs committed, cardinal 4 loaded); collision body 32×42 |
| Tilesets        | 128×128 Wang sheets, 16 tiles @ 32 px (interior-v3, dock-v3 + metadata JSON)                      |
| Committed props | 32×48 to 64×64 (12 props, Dock/Hub/Archive only)                                                  |
| NPC sprites     | none (`characters/npcs/` empty)                                                                   |
| UI assets       | none (`ui/` empty; all UI is runtime rectangles/text)                                             |
| Effects/audio   | none                                                                                              |
| Canvas          | 800×600 FIT, `pixelArt: true`; prompt panel 560 px; interaction radius 72 px                      |

The asset gap is therefore exactly: NPCs, item icons, props for the six
prop-less/partial rooms, all minigame UI, all effects — which is what the
six families cover.

## 4. Deliverables produced

| Path                                                                                                           | Content                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/game/assets/CANONICAL-ASSET-PROMPT-PACK.md`                                                              | Complete generation spec: shared style contract, fixed PixelLab settings, palette discipline, per-candidate prompts with A/B variant deltas, contact-sheet rules, future-pass checklist                                                                                                                                                          |
| `docs/game/assets/canonical-asset-candidate-manifest.json`                                                     | Machine-readable manifest: 53 asset records / **97 candidate IDs** with family, planned filename, dimensions, tile/frame size, animation, rooms, Q IDs or foundation class, admission classification, prompt, tool/settings, licence/provenance, neutrality + accessibility risk, `integration_status: NOT_GENERATED`, `human_approval: PENDING` |
| `docs/game/assets/CANONICAL-ASSET-REVIEW-CHECKLIST.md`                                                         | Human approval gate: style/palette/text/copyright/duplicate checks, neutrality checks (research owner), salience/accessibility checks, licensing, integration preconditions                                                                                                                                                                      |
| `docs/game/assets/CANONICAL-ASSET-INTEGRATION-BACKLOG.md`                                                      | Gated batches 0-5 + blocked/decision-gated table                                                                                                                                                                                                                                                                                                 |
| `public/assets/generated/candidates/{npcs,items,props,ui,effects}/`, `public/assets/generated/contact-sheets/` | Target directory scaffolding (`.gitkeep` only — no binaries, nothing overwritten)                                                                                                                                                                                                                                                                |

Candidate counts by family (verified against the parsed manifest): NPCs 6
(Kai A/B, Vale A/B, Noor, technician — last two optional), item icons 18
(9 icons × A/B), room props 34 (18 props; A/B for priority-room props,
single for two optional), minigame UI 20 (10 elements × A/B, each with
4-state strips), effects 14 (7 effects × A/B), optional decal tiles 5
(single variants). Total 97.

## 5. Scope compliance

- Excluded-feature rule respected: no fishing, farming, combat, weapon,
  shop, currency, romance, open-world, or collectable asset is specified;
  two task-listed items (sample container, anomaly scanner) were
  **refused by ruling** and recorded in the manifest's
  `excluded_by_ruling` with their admission-matrix rationale.
- "Calibration bench components" is served by the **shared scenario
  console** rather than a distinct bench, because the four ethical
  scenario stations must stay visually identical (art direction §2.4) —
  recorded in the manifest so the reviewer sees the reasoning.
- No gameplay source, test, event identifier, scoring, Supabase,
  Qualtrics, or route file was touched. No existing asset was modified.
  New paths only.
- No candidate was selected or integrated; every record is
  `human_approval: PENDING`.

## 6. Validation performed

- Manifest JSON parses (validated with Node `JSON.parse`).
- `git status` confirms only the new docs + `.gitkeep` scaffolding;
  `git diff --check` clean; explicit-file staging only.
- Binary checks (dimensions, alpha, near-duplicates, accidental
  text/watermarks) are **not applicable yet** — they are specified in the
  review checklist §1 and run at generation time.

## 7. Risks and concerns for the human reviewer

1. **Neutrality (highest):** scenario-console uniformity; duty-board and
   progress-chip "labels-only, never scores"; competing-station/beacon
   offer balance; Vale must not look suspect; consequence/completion
   effects valence-neutral. Each carries a per-record `neutrality_risk`.
2. **Salience:** decor duller than interactables everywhere (the
   data-panels inversion must not recur); uniform guidance strength.
3. **Accessibility:** no colour-only states; focus ring contrast; 32 px
   icon legibility; no strobe-risk animation; amber reserved.
4. **Licensing:** all generation must run under the project's PixelLab
   subscription with job-ID + SHA-256 provenance (Wave 3 convention); no
   reference imagery.
5. **Measurement-coupled visuals:** `PROP-CLUTTER-SET` (Q04),
   `UI-PROGRESS` (status-surface ruling + ADV-5), `UI-EVIDENCE`
   (mid-sample shipping ban) are generation-allowed but
   integration-blocked pending owner decisions.

## 8. Recommended first integration batch

Backlog Batch 1: **Kai + Vale NPC embodiment** (after the NPC generation
pass and human approval) — the M1 item; smallest diff, biggest
face-validity gain, zero measurement-surface contact. Then Batch 2 room
prop coverage starting with Engineer Hub (the biggest visual gap).
