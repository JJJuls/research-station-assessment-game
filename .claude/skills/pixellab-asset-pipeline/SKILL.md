---
name: pixellab-asset-pipeline
description: Use only when the user has explicitly approved a PixelLab asset-generation pass for Remote Outpost Assessment (e.g. "let's do the art pass now", "generate assets for the Archive room", "approved, go ahead with PixelLab"). Governs style-anchor generation, room-by-room asset generation, and asset-manifest documentation via PixelLab MCP. Do not self-invoke based on general room-building or polish conversation — this skill requires an explicit, standalone approval from the user before any asset generation step, and requires placeholder mechanics and logging to already work.
disable-model-invocation: true
---

# PixelLab Asset Pipeline

This skill governs the visual asset pass for Remote Outpost Assessment using
PixelLab through MCP, per Section 7 of
`docs/ai/fable-claude-final-game-build-contract-v3.txt`. It only runs after the
user has explicitly approved an asset pass — not as a natural extension of room
building or general polish requests.

## Why the gate exists

Asset generation is expensive (token/PixelLab usage), hard to undo cleanly once
assets are wired into scenes, and easy to reach for prematurely when a room still
has open mechanic or logging questions. The contract is explicit: confirm
mechanics and logging with placeholders _first_. Generating art before the
underlying task/event/scoring design is settled means redoing the art later, or
worse, freezing a design decision because re-generating art feels costly.

## Preconditions — verify before doing anything else

1. **Explicit approval this session.** Confirm the user has actually approved an
   asset pass for the specific room(s) in question, not just discussed art in the
   abstract.
2. **Placeholder mechanics work.** The room(s) targeted for asset generation must
   already have working placeholder mechanics and full event logging (verified via
   `room-builder`'s done test and ideally `playwright-game-verify`). If placeholders
   or logging aren't done yet, stop and say so — send the user back to
   `room-builder` first.
3. **Style anchor exists (or is being created now).** Confirm whether a style
   anchor and minimal station tile style already exist. If not, generating one is
   step 1, before any room-specific assets.

## Required sequence (Section 7)

1. Confirm mechanics and logging with placeholders (precondition above).
2. Generate one style anchor.
3. Generate the player sprite / researcher character.
4. Generate the minimal station tile style.
5. Generate assets room-by-room — never all rooms in one uncontrolled batch.
6. Save every asset prompt and its metadata in
   `docs/assets/pixellab-asset-manifest.md`.
7. Reject inconsistent assets rather than force them into the game — if a
   generated asset doesn't match the established style anchor/palette, discard and
   regenerate or report the mismatch rather than shipping it.

## Visual target (must match)

- Top-down 2D pixel art, 32x32-compatible tile scale.
- Remote research outpost / expedition station setting.
- Terminals, warning panels, repair panels, storage shelves, kit crates, NPCs,
  status monitors, final core/reactor.
- Consistent palette; interactables must stay visually readable at game scale.

## Forbidden

- Do not generate any asset without explicit user approval for this specific pass.
- Do not generate assets for a room whose mechanics/logging aren't confirmed
  working yet.
- Do not batch-generate assets for multiple rooms in one uncontrolled pass — one
  room (or the shared style anchor/player sprite step) at a time.
- Do not generate farming/crops, medieval fantasy, combat assets, corporate office
  cubicles, or player-power-upgrade visuals (Section 7 "Avoid" list).
- Do not mix isometric and top-down perspectives unless the user deliberately
  chooses and normalizes that decision.
- Do not force an inconsistent asset into the game to save time — reject and
  regenerate, or flag it.
- Do not skip updating `docs/assets/pixellab-asset-manifest.md` for any generated
  asset.
- Do not modify `package.json` or game logic/scoring code as part of an asset pass
  — this skill is visuals only.

## Expected output format

For each asset-generation step, report:

1. **Approval confirmation** — what the user approved and for which room/step.
2. **Precondition check** — placeholder mechanics/logging status for the target
   room.
3. **Assets generated** — what was generated (style anchor / player sprite / tile
   style / room-specific assets), with prompts used.
4. **Manifest update** — confirmation that `docs/assets/pixellab-asset-manifest.md`
   was updated with prompt + metadata for each new asset.
5. **Consistency check** — pass/fail against the established style anchor and
   palette; list any rejected assets and why.
6. **Next step** — what the next asset-pipeline step would be, awaiting further
   explicit approval before proceeding.
