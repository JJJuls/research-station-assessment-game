# Remote Outpost Assessment — V1 vertical slice handoff

Date: 2026-07-11 · Branch `fable-autonomous-game-build-v1` (from checkpoint
`e8a8994`) · Protected branch `fable-final-game-prep-from-prototype` untouched.
Plan of record: the approved autonomous-build plan with the nine mandatory
scientific/reproducibility controls (Phase 0 baseline → Phase G verification +
post-G stimulus-freeze gate).

## What the slice is

A connected, art-complete, research-instrumented world:
**Dock / Arrival Bay** (`dock_arrival`, control-only) →
**Station Hub** (`station_hub`, control/usability navigation, 8 doors:
Archive open + 7 sealed) → **Archive Room** (`archive_room`, Q13/Q22–Q26
forced-failure manipulation), with the full prototype (`?scene=prototype`)
retaining all 9 research stations. PixelLab stimuli are frozen as
`outpost-assets-v1` (committed statics; PixelLab never called at runtime;
version embedded in the Phaser version banner).

## Phase commits (local only — never pushed)

| Phase | Commit                      | Content                                                                                                           |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 0     | `ff6d595`                   | Baseline fixture at `e8a8994` (`docs/testing/baseline-e8a8994/`)                                                  |
| A     | `fb4547b`                   | World infrastructure (CanonicalEventContext extraction byte-preserved, RoomScene, SceneRouter, StationMapBuilder) |
| B     | `d211ed8` (+docs `2f44261`) | DockScene canonical mini-game                                                                                     |
| C     | `244dfc1`                   | HubScene                                                                                                          |
| D     | `751cfb9`                   | ArchiveScene (audit-first port + additive canonical events)                                                       |
| E     | `7559d6c`                   | Playwright smoke suite (`e2e/`, 3 specs)                                                                          |
| F     | `687c2f4`                   | `outpost-assets-v1` integration (Wang dual-grid rendering; collision unaffected by art)                           |
| G     | this commit                 | Final verification evidence, freeze checklist, reviewer dispositions, e2e-helper robustness fix                   |

## Verification state (Phase G, this directory tree)

Evidence: `docs/testing/slice-evidence/phaseG/` (+ `final-verification/`).

- Build + tsc: PASS (logs archived).
- Consolidated browser verification (Playwright MCP): adaptive session
  (31 events, exact canonical+legacy order) and inappropriate-persistence
  session (repeat/abandon/return) both PASS with summary invariants matching
  the Phase 0 baseline: adaptive rev=1/blind=0/gip=0/fai=3 vs maladaptive
  blind=1/gip=1/rev=0/fai=−1. Separation invariant proven.
- Qualtrics: five launch params reflected everywhere; returnUrl preserves
  `return_url` and appends summary variables; raw log append-only; debug API
  = exactly the six contract methods.
- Console errors on fresh load: 0.
- Prototype fixture regression vs `docs/testing/baseline-e8a8994/`: PASS
  (all 9 stations, event-for-event).
- Asset SHA-256 audit: 18/18 manifest hashes match committed files
  (`asset-sha256-verification.txt`).
- Playwright suite: see `final-verification/playwright-suite-log.txt`;
  helper routes hardened against CPU-load under-shoot during Phase G.
- Evidence audit: `final-verification/browser-qa-evidence-audit.md` —
  **verified with minor gaps** (subagent unavailable; audited inline).
- `research-data-reviewer` asset audit: **Accept `outpost-assets-v1`, with
  conditions** — dispositions tracked in
  `docs/research/stimulus-freeze-checklist.md`.

## Open decisions (user-owned; never decided autonomously)

1. **Idle threshold + "idle" definition** for `tutorial_help_shown` /
   `baseline_idle_seconds` (`DOCK_IDLE_HELP_THRESHOLD_MS = null`, watcher
   disabled).
2. **`construct_id`** for `archive_abandoned` (Q24) and
   `archive_returned_after_failure` (Q24+Q25) — deliberately unset.
3. **Confirm the narrowed `archive_abandoned` trigger** (fires only after a
   failed attempt, not on any unresolved exit).
4. **Beat 13**: `strategy_revision_count` prudence-mixing fix
   (`hazard_info_checked`).
5. **Reviewer finding dispositions** (freeze checklist): dock decor-airlock
   control-error lure (MAJOR), archive salience inversion, signage cyan cue,
   archive exit-door texture, log-shelves interaction geometry.

## Hard gates before any participant

`docs/research/stimulus-freeze-checklist.md` must be fully checked and
approved by `research-data-reviewer`. The slice is developmental until then.
Any asset/gameplay change bumps `game_version`/`asset_set_version` and
reopens the gate. PixelLab requires fresh, explicit, standalone approval for
any future pass.

## Next build beats

Remaining rooms one at a time via `room-builder` (Systems Repair or Engineer
Hub next per contract sequencing), each: room doc → canonical events from
V3/event-schema → implementation → verification → review, exactly as this
slice did.
