# Stimulus-freeze checklist (plan §17b)

The V1 slice is **developmental**. No pilot or formal participant may be run
until every item below is checked and `research-data-reviewer` approves the
completed document. Any change after freeze reopens this gate and bumps
`game_version`/`asset_set_version`.

| #   | Item                                                                                                                                                           | Status (2026-07-11)                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Final asset-manifest review — every asset has a complete record; no unmanifested art                                                                           | Manifest complete for `outpost-assets-v1` (12 props, 2 tilesets, player, anchor; hashes + lineage). **Not yet frozen** — later rooms will add assets. |
| 2   | Fixed asset hashes re-verified against the built bundle                                                                                                        | SHA-256 recorded per asset; bundle re-verification **pending freeze**                                                                                 |
| 3   | Fixed event schema — version-stamped, no pending renames for shipped rooms                                                                                     | Dock/Hub/Archive canonical + legacy documented; repair/hazard/etc. migrations pending their beats. **Pending**                                        |
| 4   | Fixed scoring version — formulas frozen with version identifier                                                                                                | ScoringManager untouched in slice; version stamp **pending Beat 13**                                                                                  |
| 5   | Fixed task parameters/timing thresholds — including the **user-supplied idle threshold + "idle" definition** (open parameter; idle watcher currently disabled) | **BLOCKED on user decision**                                                                                                                          |
| 6   | Fixed (`game_version`, `asset_set_version`) pair recorded                                                                                                      | `asset_set_version = outpost-assets-v1` in the Phaser version banner; final pair **pending freeze**                                                   |
| 7   | Reproducible production build (clean-checkout `dist/` hash or documented nondeterminism)                                                                       | **Pending freeze**                                                                                                                                    |
| 8   | Complete Playwright evidence archived against the frozen build                                                                                                 | Slice suite (3 specs, 6 tests) green at `687c2f4`; full-suite archive **pending freeze**                                                              |
| 9   | `research-data-reviewer` approval of this document                                                                                                             | **Pending**                                                                                                                                           |
| 10  | No silent gameplay/art changes after freeze                                                                                                                    | Rule acknowledged; enforcement via this gate                                                                                                          |

Also outstanding before freeze (from slice reviews): construct_id decision for
`archive_abandoned`/`archive_returned_after_failure` (Q24/Q25 — psychometric
decision routed to the user); confirmation of the narrowed `archive_abandoned`
trigger (requires a prior failed attempt); `strategy_revision_count`
prudence-mixing fix (Beat 13).

## Open dispositions from the `research-data-reviewer` asset audit

Verdict: **Accept `outpost-assets-v1`, with conditions.** Manifest corrections
for findings 4 and 6 are applied; the following need a user decision (or a
`room-builder` fix pass) before freeze:

1. **MAJOR — Dock decor airlock at the arrival spawn** is pixel-identical to
   the interactive Hub door; SPACE presses aimed at it are counted as control
   errors, inflating the `control_error_count` covariate for participants who
   reasonably try the "door" they just arrived through. Options: distinct
   inert texture, reposition, or accept-and-document as part of the covariate's
   definition. **Decision required before any pilot.**
2. **MINOR — salience inversion in the Archive**: decorative data-panels read
   brighter than the interactive log-shelves (manifest records corrected;
   art disposition pending).
3. **MINOR — Dock signage carries the cyan interactable cue** despite being
   decor (dilutes affordance uniformity).
4. **MINOR — open-door affordance inconsistency**: the Archive exit door has
   no committed texture and renders as a placeholder rectangle while other
   open doors use `prop-hub-door-frame`.
5. **Phase G addition — log-shelves interaction geometry**: the shelf collision
   block leaves only a narrow below-the-shelves window inside the 72 px
   interaction radius (side approaches bottom out at ~80 px). Verified
   reachable, but participants may fail to trigger the optional
   `archive_log_compared` step for purely geometric reasons, undercounting
   feedback/log use. Fix candidates: move the station anchor toward the block
   edge or widen the radius for this station only (measurement-affecting —
   user decision).
