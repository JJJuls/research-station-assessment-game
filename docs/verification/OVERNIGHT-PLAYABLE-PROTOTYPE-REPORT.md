# Overnight Playable Scientific Prototype — Implementation Report

- **Branch:** `fable-playable-prototype-overnight-v1`
- **Base:** `6154a82fd9e9b827dc01f70b73c9ae94c93f91fa` (NEXT-10 rulings adoption)
- **Final HEAD:** the Unit 5 commit containing this report (`git log -1`)
- **Date:** 2026-08-01
- **Author:** Claude Fable 5 (overnight autonomous build; execution brief
  "FABLE 5 — OVERNIGHT PLAYABLE SCIENTIFIC PROTOTYPE BUILD")

This is a **playable scientific prototype**, not a validated psychological
instrument. No canonical event name, scoring formula, weight, composite or
trait interpretation was added or changed; every new event is `proto_*`
raw prototype telemetry logged through the scenario-telemetry path (no
canonical context), and every new measurement mechanic implements a
research-owner-adopted NEXT-10 **measurement design** only.

## 1. Commits

| Commit     | Unit | Title                                                                    |
| ---------- | ---- | ------------------------------------------------------------------------ |
| `258ed20`  | 1    | feat(gameplay): add inventory interaction and action foundation          |
| `caf15c5`  | 2    | feat(gameplay): add NPC field recovery and repair route                  |
| `a91b549`  | 3    | feat(measurement): implement approved independent gameplay opportunities |
| `741eaf4`  | 4    | feat(visuals): improve outpost rooms NPCs and game feel                  |
| _(Unit 5)_ | 5    | test(gameplay): verify playable outpost prototype                        |

## 2. Systems implemented

### Gameplay foundation (Unit 1, `src/gameplay/`)

- **Item registry** (`items.ts`): player-facing catalogue (icons, tags,
  descriptions); disjoint from the untouched Q01-Q04 kit substrate
  (`src/data/itemRegistry.ts`).
- **Inventory** (`inventory.ts` + `InventoryHud.ts`): 10 visible slots,
  icons, pointer selection + TAB cycling, selected-item name, full-belt
  feedback, serialisable, session-lifetime, DEV probe `__inventoryProbe`.
- **Physical actions** (`actions.ts`): timed in-world actions (scan, dig,
  collect, install, close) with labelled progress bars at the work
  position; the player holds still while one runs; floating result text.
- **Task progression** (`tasks.ts`): typed offered/accepted/completed/
  declined/failed tasks driving a second HUD objective line
  (`__questObjectiveText`); objectives progress past Arrival.
- **NPC actors** (`Npc.ts` + `RoomScene.addNpc`): visible characters with
  drop shadow, idle bob, and proximity-only name chips.

### Core playable route (Unit 2)

Arrival → check-in → **Quartermaster Vale** (Hub requisition desk) →
physical collection from the **Field Equipment Locker** → **Exterior
Airlock** → **Survey Terrace** (`FieldScene`) → **Engineer Kai** briefing →
scan 4 survey markers → dig 2 flagged deposits (recovering a relay
coupling and a core sample) → 3-step tactile install at the **Antenna
Feed Housing** (steps surface) → sample delivery back to Kai → duty
roster continues to the four ethical-scenario decisions and Final Core.

### Approved measurement modules (Unit 3, `src/measurement/`)

See §4. All module state lives in dedicated per-item containers; SA-13
records live in `validity.ts` (DEV probe `__measurementValidity`).

### Visuals / game feel (Unit 4)

- Physics debug overlay gated behind an explicit `?debug` launch flag
  (participant-mode play never shows debug geometry, even on dev builds).
- Contextual labels: station/door/NPC name chips render only for the
  nearest in-range interactable — no permanent name banners.
- The three new rooms pad their grids with unreachable wall mass so the
  800×600 viewport has no dead black void; Hub density decor pass;
  duplicate Vale silhouette removed from the Inventory room.
- Carried from Units 1-2: visible inventory belt, in-world action
  progress bars, floating result text, NPC idle animation and reactions,
  steps-surface install minigame.

## 3. Playable route (how to play)

```
npm.cmd run start          # dev server (vite --open)
# optional launch params: ?participant_id=...&game_session_id=...
# physics debug overlay (dev only): add &debug=1
```

1. Dock: move to the marker, check in at the Arrival Terminal.
2. Hub: meet Quartermaster Vale (SW desk), take the field requisition,
   collect scanner/spade/sample case from the locker.
3. Exterior Airlock (south wall) → Survey Terrace: take Kai's briefing,
   scan the four markers, dig the two flagged deposits, install the relay
   coupling at the feed housing (east), deliver the core sample to Kai.
4. Bench maintenance (Hub): stow the returned tools at the Calibration
   Cabinet; after visiting another area, fetch the requested tool.
5. Optional station backlog: Utility Bay diagnostics (south door);
   Operations Annex planning/portfolio/closure work (south door);
   work-order board (Hub SW wall); telemetry cache (Survey Terrace).
6. Duty roster: the four station decisions (Hub allocation, Engineer
   calibration, Archive reconciliation, Inventory seal log), then Final
   Core synchronization.
7. Session summary: `window.researchRuntime.printSummary()` /
   `getEvents()`; validity register: `window.__measurementValidity`.

## 4. Q01-Q33 honest coverage table

Classifications: **IP** = implemented independent primary opportunity
(design-level; canonical events/scoring still open) · **SC** = implemented
shared Q29/Q31 construct · **SEC** = existing but secondary/contaminated
(per NEXT-09 register) · **QP** = questionnaire-primary · **BLK** =
blocked by an unresolved ruling · **ABS** = absent.

| Item | Status        | Notes                                                                                                                                                                                             |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q01  | SEC           | Existing Inventory checklist stream; NEXT-09 window-boundary declarations open.                                                                                                                   |
| Q02  | SEC           | Existing bench/bin stream; shared-stream ownership split open.                                                                                                                                    |
| Q03  | **IP**        | New Calibration Cabinet stow+retrieval (SA-12): standardised, Inventory-independent. Legacy Repair-Panel retrieval stays secondary.                                                               |
| Q04  | SEC           | Existing cleanup stream; standardised cleanup remediation not reached overnight.                                                                                                                  |
| Q05  | BLK           | Idle threshold undefined (D3).                                                                                                                                                                    |
| Q06  | SEC           | Duty-family events partial; open decisions.                                                                                                                                                       |
| Q07  | SEC           | Side Repair arc shared stream (Q07/Q16/Q20/Q32 edges); split open.                                                                                                                                |
| Q08  | SEC           | Corridor ignore branch + D3-blocked idle components.                                                                                                                                              |
| Q09  | SEC           | Report-accuracy substrate exists; SA-8 registration open; Q09→Q10 chain unremediated overnight.                                                                                                   |
| Q10  | SEC           | Accepted-duty follow-through intact; corridor no longer gated on it.                                                                                                                              |
| Q11  | **IP\***      | Standardised Final Core baseline issue (fc-baseline-v1) for every session; event ownership Q11/Q28 still open (\*entry-state standardisation implemented; primary evidence pending event ruling). |
| Q12  | SEC           | Hazard stream unchanged.                                                                                                                                                                          |
| Q13  | SEC           | Unchanged.                                                                                                                                                                                        |
| Q14  | SEC           | Unchanged.                                                                                                                                                                                        |
| Q15  | **IP\***      | Corridor de-gated: relay check-in scheduled for every participant; SA-9/SA-10/D6 ownership open.                                                                                                  |
| Q16  | SEC           | Side Repair arc; instance-vs-split open.                                                                                                                                                          |
| Q17  | **IP\***      | De-gated with Q15; co-fire ownership open (SA-9).                                                                                                                                                 |
| Q18  | QP            | Questionnaire-primary (frozen).                                                                                                                                                                   |
| Q19  | **IP\***      | De-gated; closure at Final Core; censoring recorded.                                                                                                                                              |
| Q20  | QP            | Questionnaire-primary (frozen).                                                                                                                                                                   |
| Q21  | SEC           | Unchanged.                                                                                                                                                                                        |
| Q22  | SEC           | Unchanged.                                                                                                                                                                                        |
| Q23  | SEC           | Unchanged.                                                                                                                                                                                        |
| Q24  | SEC           | Abandon/return family; D4 construct open.                                                                                                                                                         |
| Q25  | SEC           | As Q24.                                                                                                                                                                                           |
| Q26  | SEC           | Repeat-same-wrong-response family unchanged.                                                                                                                                                      |
| Q27  | **IP**        | New Utility Bay utility-stop module (SA-2): bounded useful cycles, standardised stop signal, neutral window; independent of Hazard/Side Repair.                                                   |
| Q28  | **IP\***      | Baseline guarantees the blocker + force option for every session; event ownership open.                                                                                                           |
| Q29  | **SC**        | One shared goal-horizon construct (SA-3): matched NPC-mediated + terminal-mediated situations, counterbalanced option order, single state container.                                              |
| Q30  | **IP**        | Two independent granularity instances (SA-4): Hub work-order board + Terrace telemetry cache, each with own window/state, counterbalanced.                                                        |
| Q31  | **SC**        | Same shared construct as Q29 — never a second score.                                                                                                                                              |
| Q32  | **IP**(expl.) | Distinct Active Project Portfolio module (SA-5); exploratory analogue; Q32 stays questionnaire-primary.                                                                                           |
| Q33  | **IP**(expl.) | Distinct Contract Closure Queue module (SA-6); self-selected optional closures; exploratory analogue; Q33 stays questionnaire-primary.                                                            |

**No item has an approved canonical game score.** "IP" means the adopted
measurement DESIGN is now playable with isolated state and raw proto\_\*
telemetry; tier-3 event naming and tier-4 scoring remain research-owner
decisions.

## 5. Tests and builds

- `npm.cmd run lint:tsc` (tsc --noEmit): **pass** at every unit boundary.
- `npm.cmd run build` (vite production build): **pass**.
- `npm.cmd run lint`: **pre-existing repo-wide failure** — every error is a
  prettier `Delete ␍` (CRLF) finding caused by this worktree's Windows
  line-ending checkout, present before this build. All files touched by
  this build were linted individually (eslint targeted runs + the
  lint-staged pre-commit hook) and are clean.
- Full Playwright suite (run in sequential chunks near completion, all on
  the final code state): **~127 tests passed, 0 failed** across all 41
  spec files, including:
  - new: `gameplay_foundation` (7), `field_route` (2),
    `measurement_boundaries` (5), `visual_snapshots` (1);
  - updated for the adopted rulings: `interruption_corridor_logging`
    (7/7 with the de-gated S5-S7 rewrites),
    `connected_participant_journeys` (de-gated abandonment pin),
    `route_g_telemetry` (baselines re-captured on current code; G-B
    stored without the allowlisted retrieval event, preserving its
    comparison contract), `proc_textures_determinism` (manifest pins for
    the 13 new textures), `final_core_summary` unchanged and green under
    the always-present baseline blocker.
- Known flake: `measurement_boundaries` › "Q29/Q31 one shared construct…"
  intermittently fails its FIRST attempt at the annex planning-terminal
  prompt when run after the Q27 test in the same worker (SwiftShader
  browser-context degradation genre) and passes on Playwright's automatic
  retry. Non-deterministic presentation-layer input loss only; no
  telemetry effect.

## 6. Visual verification / screenshots

Captured by `e2e/visual_snapshots.spec.ts` into
`docs/verification/screenshots/` (committed): dock arrival, Station Hub
(Vale/locker/decor/belt/objective lines), Vale requisition prompt, quest
HUD line, Survey Terrace, Utility Bay, Operations Annex, Inventory/Prep,
Final Core. Manually inspected for: no debug outlines, no permanent name
banners (contextual chips verified), no dead black void in the new
rooms, inventory belt and objective lines unclipped at 800×600, prompt
panels inside the viewport.

## 7. Known defects and limitations

- Legacy assessment rooms (Archive, Engineer, Final Core, etc.) still
  render a black band below their 640×416-ish maps at 800×600 — the
  new-room wall-padding treatment was deliberately not applied to frozen
  legacy rooms overnight (regression risk to the 100+ legacy tests).
- The interaction language remains proximity + SPACE + card panels;
  drag/drop and mouse-move-to-walk are not implemented (keyboard
  movement + pointer card selection only).
- The Survey Terrace reads as an interior chamber rather than a true
  exterior (tileset limitation; no exterior tile family exists in the
  committed set).
- Q03 retrieval offers on the next Hub visit after any other room —
  a participant who never returns to the Hub before Final Core would
  end with the retrieval censored (recorded as such in the SA-13
  register; no route enforcement was added).
- The `measurement_boundaries` first-attempt flake described in §5.
- Ethical scenarios, Hazard, Side Repair, Archive, Systems Repair keep
  their existing (partially contaminated per NEXT-09) streams — see §8
  remediation not reached.

## 8. Unresolved scientific gates (not resolved, by design)

- SA-7…SA-11 (exploratory labels, Q09 registration, SA-9 co-fire, SA-10
  IGNORE branch, requisition-checklist display), NEXT-10-Q1.
- D2-D8 (composites, idle threshold, D4 constructs, D5/D6/D7 mappings,
  stimulus-freeze dispositions), INT-1…INT-6.
- Event-schema (tier 3) and scoring-plan (tier 4) rulings for every
  proto\_\* candidate emitted by this prototype.
- Shared-stream ownership splits (inventory close-out, side-repair arc,
  archive, repair, corridor) and Q01/Q02/Q04 window declarations.
- Q04 standardised cleanup, Q09 report-equivalence remediation, archive/
  systems-repair/side-repair stream separation: **not reached overnight**
  (documented as remaining remediation).

## 9. Confirmation

Nothing was pushed, merged, tagged, deployed, or removed; no data was
sent to Supabase, Qualtrics, or any external service; production
configuration is untouched. All work is local commits on
`fable-playable-prototype-overnight-v1`.
