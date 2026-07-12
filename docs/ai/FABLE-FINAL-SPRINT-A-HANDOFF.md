# Fable Final Sprint A — Continuous Handoff

Authoritative continuation state for Sprint A (unattended Fable session,
2026-07-13). Updated at every phase boundary. Base checkpoint: `201c8fa`
(tag `hazard-control-verified-201c8fa`), branch
`fable-autonomous-game-build-v1`.

## Current HEAD

- See `git log` — this file is updated in/beside each checkpoint commit.
- Working state at last update: Phase A3 complete.

## Commits produced in Sprint A

| SHA       | Phase | Content                                                 |
| --------- | ----- | ------------------------------------------------------- |
| `2c455c7` | A1    | Transition contract + machine inventory + this handoff  |
| `6424697` | A2    | State/session continuity contract (audit doc)           |
| `54ba3e8` | A2    | Continuity spec + WebGL first-context flake fix (infra) |
| `76c91f2` | A3    | Journey helpers + position-independent hub routes       |
| `167837e` | A3    | Connected-world navigation smoke (full door ring)       |
| (this)    | A3    | State + handoff checkpoint                              |

## Completed phases

- **A1 — Connected-world transition contract**: full static audit; zero
  defects. `docs/architecture/CONNECTED-WORLD-TRANSITION-CONTRACT.md` +
  `transition-inventory.json`.
- **A2 — State/session continuity**: audit doc
  (`docs/architecture/STATE-AND-SESSION-CONTINUITY.md`, zero game defects,
  3 documented observations for user rulings) + 4-test continuity spec.
  **Infra defect fixed**: Phaser WebGL boot fails on the first context of a
  fresh headless Chromium (the misattributed "cold-Vite" flake) —
  SwiftShader forced in playwright.config.ts; suite now zero-retry.
- **A3 — Journey infrastructure**: `e2e/journey.ts` reusable helpers +
  full-door-ring navigation smoke. **Two infra defects fixed**: count-aware
  wait baseline must be captured before the triggering action; hub door
  routes normalize via a pocket-safe NW anchor (old mid-height clamps
  wedged on the console block / undershot from side-wall return spawns).

## Current coherent unit

- A3 checkpoint (this commit). Next unit: Phase A4 journeys.

## Exact next action

- Phase A4: author `e2e/connected_participant_journeys.spec.ts` — three
  sessions (hazard branches split): P1 adaptive completer (dock review 2,
  inventory systematic 2-1-1, engineer prepared+accept 2-1, side repair
  complete 3, interruption return 2, hazard informed 1 then 2, archive
  1-2-3, repair 1-2-3 [objective_completed parity], final core resolve 3,
  return flow); P2 shortcut/interrupted (dock skip 1, inventory shortcut 1,
  engineer unprepared+decline 1-2, interruption switch 1, repair
  fail-leave-return partial, hazard reckless 2, final core force 4); P3
  avoid/defer (dock practice 3, side repair defer 4 → return + complete 3,
  hazard avoid 3, interruption ignore 3, archive same-wrong 1-1 then 2-3,
  final core quick sync 1). Evidence in docs/testing/connected-journey/.

## Tests passing

- Full suite **33/33 PASS (18.8m), zero retries** at `167837e` (9
  legacy/wave specs + hazard + continuity + navigation smoke).

## Known failures

- None.

## Defects fixed in Sprint A

- Test infrastructure only; game code untouched. (1) WebGL first-context
  boot failure → SwiftShader in playwright.config.ts. (2) Count-after-action
  wait race → journey.ts captures baselines before acting. (3) Hub door
  route wedge/undershoot from side-wall spawns → NW-anchor normalization in
  helpers.ts.

## Unresolved scientific decisions (user-owned; unchanged this sprint)

1. Dock idle threshold/definition (D-open; `DOCK_IDLE_HELP_THRESHOLD_MS`).
2. `construct_id` for abandon/return events (Q24/Q25 family).
3. `engineer_report_submitted_supervised` mapping.
4. `interruption_alert_acknowledged` mapping.
5. Beat-13 scoring bundle (D2) — NOT implemented this sprint by instruction.
6. `task_started` Q05/Q15 dual-listing conflict.
7. Hazard→Final Core consequence semantics (`hazard_issue_created/resolved`,
   `final_hazard_issue`) — technically available state documented in A5;
   scientific consequence NOT invented.
8. Pending independent Hazard review — explicitly deferred to Sonnet.

## Sprint B priorities

- Beat-13 supervised scoring bundle once D2 is ruled.
- Qualtrics return preview (Beat 14).
- Hazard consequence propagation once semantics are ruled.
- Any defects surfaced by A4 journeys that need scientific rulings.

## Work suitable later for Sonnet

- Independent Hazard review (`317e07b..201c8fa` reviewer dispatch).
- Running/extending the connected-journey suite from A3 templates.
- Route tuning for any flaky Playwright choreography.

## Work suitable later for Codex

- Mechanical spec authoring from `docs/architecture/transition-inventory.json`
  - the A6 acceptance-test template (once they exist).
- ESLint/prettier cleanup of pre-existing repo-wide CRLF noise (353 errors,
  pre-existing; never blocking).

## Work still requiring top-tier reasoning

- Beat-13 scoring implementation (touches ScoringManager/QualtricsBridge —
  gated, scientifically sensitive).
- Any change to canonical event semantics or CanonicalEventContext.
- Hazard→Final Core consequence design (needs user ruling first).
