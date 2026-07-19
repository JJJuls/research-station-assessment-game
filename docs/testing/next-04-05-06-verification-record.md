# Verification Record — Sequential FABLE-NEXT-04 / 05 / 06

Branch `fable-sequential-next-04-05-06-v2` (worktree
`.claude/worktrees/fable-sequential-next-04-05-06-v2`, base `3b855b7`).
All Playwright runs: headless Chromium, SwiftShader (`--use-gl=angle
--use-angle=swiftshader`), `PW_DEV_PORT=5301`, 1 worker, retries 1.

## Final full battery (NEXT-06 Phase 6)

- Command: `PW_DEV_PORT=5301 npx playwright test`
- State: final committed tree `86f6df0` (clean).
- Result: **102 passed, 0 failed — 1.7 h wall clock.**
- Count reconciliation: `npx playwright test --list` at the same state
  reports **"Total: 102 tests in 33 files"** — the run covered the entire
  suite. (A static `test(` grep undercounts by 4; the Playwright list is
  authoritative.)
- Slowest files: connected_participant_journeys 14.6m,
  interruption_corridor_logging 12.8m, adversarial_status_board_display
  9.4m, inventory_prep_logging 8.8m, final_core_summary 8.5m.

## Per-phase focused runs (durations as reported by Playwright)

| Phase         | Run                                                                                                            | Result                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEXT-04       | engineer_hub_logging (before + after panel fix)                                                                | 3/3 (1.6m) ×2, later 4/4 after the 0.5-accuracy test                                                                                                    |
| NEXT-04       | final_core_summary + interruption_corridor + adversarial_status_board                                          | 7/7 (20.3m)                                                                                                                                             |
| NEXT-04       | connected_participant_journeys                                                                                 | P1+P2 in batch (19.2m); P3 flaked under orchestrator-induced CPU load, then passed isolated (4.8m); P1 re-run with the state-varied accuracy pin (5.1m) |
| NEXT-05       | interruption_corridor_logging rebuild                                                                          | 5/5 (7.2m) → 6/6+final_core 3/3 (17.5m) → 7/7 after the frozen-gate discriminator (3.9m isolated)                                                       |
| NEXT-05       | regression battery (hazard 4, adversarial-hazard 1, engineer 4, final core 3, adversarial board 1, journeys 3) | 16/16 (37.0m)                                                                                                                                           |
| NEXT-05       | corridor-traversing extras (direct-launch nav, session isolation, world smoke, state/session continuity)       | 7/7 (5.8m)                                                                                                                                              |
| NEXT-06 P2    | participant_ui_cards (mouse/keyboard/numeric) + engineer suite                                                 | 7/7 (3.6m)                                                                                                                                              |
| NEXT-06 P3    | complete Inventory suite (inventory_prep_logging 8 + scenario_breach 2)                                        | 10/10 (10.4m)                                                                                                                                           |
| NEXT-06 P4    | repair 6 + side_repair 6 + engineer 4 + scenario_calibration 2                                                 | 17 passed, 1 latent NEXT-04 sweep miss in scenario_calibration (12.4m); after the sweep fix: calibration 2/2 + pilot_route 1/1 (4.6m)                   |
| NEXT-06 P5    | hazard 4 + corridor 7 + final core 3 + route gate 3                                                            | 17/17 (31.5m)                                                                                                                                           |
| NEXT-06 fixes | participant_ui_cards full                                                                                      | 7/7 (4.4m)                                                                                                                                              |

## Code gates (final state, all green)

`npm.cmd run lint:tsc`; ESLint on every changed source/test file;
`npm.cmd run build`; `node scripts/validate-traceability-matrix.mjs`
(165 events, 33 items, 59 summary variables); `git diff --check`;
Prettier on all touched docs. Known pre-existing (untouched at base):
Prettier drift in `docs/game/Q01-Q33-EVENT-AND-DATA-CONTRACT.md`.

## Reviewer verdicts (per phase, three reviewers each)

NEXT-04, NEXT-05, NEXT-06: research-data-reviewer,
gameplay-implementation-reviewer and browser-qa-reviewer each reported
**no BLOCKING findings**. All actionable MAJOR findings were fixed in-run
(NEXT-04 panel overflow; NEXT-05 commit-time opportunity freeze, terminal
closure guard, matrix refresh; NEXT-06 repair-wording neutrality,
inventory requisition withdrawal) or routed to the research owner
(SA-8, SA-9, SA-10, SA-11 — see
`docs/decisions/RESEARCH-OWNER-RULING-FORM.md`).

## Environment caveat

Running CPU-heavy tooling (tsc/eslint/build) concurrently with a
Playwright run causes timed-movement undershoot flakes (observed: P3
dock-tutorial leg). Keep the machine idle during suites.
