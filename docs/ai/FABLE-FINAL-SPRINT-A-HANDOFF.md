# Fable Final Sprint A — Continuous Handoff

Authoritative continuation state for Sprint A (unattended Fable session,
2026-07-13). Updated at every phase boundary. Base checkpoint: `201c8fa`
(tag `hazard-control-verified-201c8fa`), branch
`fable-autonomous-game-build-v1`.

## Current HEAD

- See `git log` — this file is updated in/beside each checkpoint commit.
- Working state at last update: Phases A1–A5 complete.

## Commits produced in Sprint A

| SHA       | Phase | Content                                                 |
| --------- | ----- | ------------------------------------------------------- |
| `2c455c7` | A1    | Transition contract + machine inventory + this handoff  |
| `6424697` | A2    | State/session continuity contract (audit doc)           |
| `54ba3e8` | A2    | Continuity spec + WebGL first-context flake fix (infra) |
| `76c91f2` | A3    | Journey helpers + position-independent hub routes       |
| `167837e` | A3    | Connected-world navigation smoke (full door ring)       |
| `71cadfb` | A3    | State + handoff checkpoint                              |
| `278f9ef` | A4    | 3 connected participant journeys + evidence record      |
| (this)    | A5    | Cross-room integration contract + state/handoff update  |

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
- **A4 — Connected participant journeys**: 3/3 PASS through real doors
  (`e2e/connected_participant_journeys.spec.ts`), hazard/duty/interruption
  branches split across sessions for scientific validity. Zero game
  defects; zero console errors; mission-state, event-order, one-shot,
  metadata, and frozen-summary spot checks live-verified. Evidence:
  `docs/testing/connected-journey/CONNECTED-JOURNEY-EVIDENCE.md`.
- **A5 — Cross-room integration contract**:
  `docs/architecture/CROSS-ROOM-INTEGRATION.md` — writers→readers matrix
  for all mission fields (runtime-verification pointers per row),
  status-board rules, the three-layer Hazard→Final Core split
  (available / consumed:nothing / unspecified:user-owned), documented
  asymmetries. Zero technical defects with authoritative semantics.

## Current coherent unit

- A5 checkpoint (this commit). Next unit: Phase A6 robustness +
  delegation architecture.

## Exact next action

- Phase A6: (1) reusable templates for later models —
  `docs/testing/ROOM-ACCEPTANCE-TEMPLATE.md`,
  `docs/testing/CONNECTED-JOURNEY-TEMPLATE.md`, room-registration/
  state-lifetime conventions doc; (2) fragile-architecture notes +
  model-independent debugging checklist; (3) only demonstrated-defect
  fixes (invalid-route/reload already runtime-covered in A2 spec);
  (4) phase-boundary full Playwright suite run (36 tests).

## Tests passing

- Full suite **33/33 PASS (18.8m), zero retries** at `167837e`.
- A4 journeys **3/3 PASS** at `278f9ef` (suite now 36 tests; full-suite
  run scheduled at the A6 phase boundary).

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
9. **Inventory organization scoring naming split (found in A4)**:
   ScoringManager organization formulas count only the legacy option-3
   names (`inventory_kit_verified`/`inventory_cleanup_completed`/
   `inventory_workspace_sorted`); the chained systematic path emits only
   canonical names, so `organization_kit_verified` stays false on that
   path. Raw events fully logged (analytically recoverable). Whether the
   frozen formulas should also count canonical names is Beat-13 scope.

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
