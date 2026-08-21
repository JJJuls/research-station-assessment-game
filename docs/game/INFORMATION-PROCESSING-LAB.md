# Information Processing Laboratory — design, audit and allowlist

Branch `fable-information-processing-minigames-v1` · base `eb87bd9`
(interactive inventory foundation). Developer proving ground reachable ONLY
via `?scene=information_processing_lab`; never on the participant route.

Everything here is **provisional `proto_*` measurement design**: theory-driven
behavioural analogues that generate item-local raw process data for later
empirical validation against the original BESSI items and competing
explanations. No item score, scale score, weight, formula or canonical event
name is created or claimed.

## 1. Frozen allowlist (whole mission, all five units)

```
src/informationProcessing/**
src/scenes/InformationProcessingLabScene.ts
src/scenes/index.ts                      (+ barrel export only)
src/constants/key.ts                     (+ scene keys only)
src/world/SceneRouter.ts                 (+ ?scene alias only)
src/measurement/m13PipePuzzle.ts         (pure validator extraction, behaviour-preserving)
src/measurement/index.ts                 (+ re-export of the extracted validator)
e2e/ipHelpers.ts
e2e/ip_engine.spec.ts
e2e/ip_pipe_suite.spec.ts
e2e/ip_decoder.spec.ts
e2e/ip_boundaries.spec.ts
e2e/ip_lab_flow.spec.ts
e2e/ip_visual_capture.spec.ts
docs/game/INFORMATION-PROCESSING-LAB.md
docs/verification/INFORMATION-PROCESSING-FOUNDATION-REPORT.md
docs/verification/screenshots-information-processing/**
```

Protected trees (never touched): `docs/scientific/**`, `docs/research/**`,
`docs/decisions/**`, `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`,
event schema, scoring plan, `ScoringManager`, `EventLogger`, `SessionState`,
`QualtricsBridge`, `package*.json`, `tsconfig.json`, `playwright.config.ts`,
`vite.config.mts`, `eslint.config.mts`, `.commitlintrc.json`, `.husky/**`,
`.claude/**`, `asset-candidates/**`, and every existing untracked file of the
main worktree.

## 2. Local audit (Unit 1)

| Searched for                           | Found                                                                                                                                                                                                                                                            | Decision                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pipe / manifold                        | `src/measurement/m13PipePuzzle.ts` (3×3 grid, standardised 9-piece set, flood-fill connectivity validator over a module singleton); `src/gameplay/manifoldTrench.ts` (in-world drag via `PhysicalManipulationLayer`, click-rotate); `proc-pipe-*` 32 px textures | **Reuse** the validator by extracting a pure `validatePipePlacements(placements)` (behaviour-preserving refactor of `validateM13Layout`); reuse the piece set/openings and the `proc-pipe-*` textures. The in-world trench stays on the Pump House route untouched; the lab board is a modal overlay with its own transactional state. |
| lattice                                | inactive "Signal Lattice" shell in `DiagnosticsLaboratoryScene`                                                                                                                                                                                                  | Narrative anchor only; the zone scene is not modified.                                                                                                                                                                                                                                                                                 |
| diagnosis / diagnostic / proto_m18     | `src/measurement/m18Diagnosis.ts` — four fixed readouts, four hypotheses, one-shot card-stack submission in `PumpHouseScene`                                                                                                                                     | Not reusable as the M18 mechanic (no tests, no reversible hypotheses, card answers). New engine built; counterbalance/validity pattern reused.                                                                                                                                                                                         |
| proto_m13                              | `proto_m13_bench_engaged … proto_m13_completed` logged from `PumpHouseScene`                                                                                                                                                                                     | Lab family uses the infix `proto_m13_lattice_*` so names never collide with the route family.                                                                                                                                                                                                                                          |
| command / terminal / parser / codebook | none (terminal = fiction labels only; no parser, buffer or codebook anywhere)                                                                                                                                                                                    | Net-new signal-command engine.                                                                                                                                                                                                                                                                                                         |
| drag / drop / keyboard                 | `InventoryOverlayScene` drag pipeline + keyboard parity; `keyGuard.ts`; `UiButton`; `theme.ts`; `openOverlay.ts` pause-and-launch                                                                                                                                | **Reuse** `guardKeyHandler`, `UiButton`, the theme tokens and the pause-and-launch pattern. The inventory store is never imported.                                                                                                                                                                                                     |
| prompt                                 | `RoomScene` prompt cards                                                                                                                                                                                                                                         | Not used — the mission forbids answer cards as the primary interaction.                                                                                                                                                                                                                                                                |
| validity register / measurement window | `src/measurement/validity.ts` (`declareOpportunity`, `markOpportunity*`, `assignCounterbalance`, `refreshValidityProbe`); `m02Filing.ts` window/active-time pattern                                                                                              | **Reuse** verbatim.                                                                                                                                                                                                                                                                                                                    |
| researchRuntime                        | `researchRuntime.logInteraction` + DEV `window.__*` probe convention                                                                                                                                                                                             | **Reuse**; new probes `__ipModules`, `__ipTerminalProbe`, `__ipPipeProbe`, `__ipDiagnosisProbe`.                                                                                                                                                                                                                                       |
| `?scene=` alias                        | `SceneRouter.SCENE_PARAM_TO_KEY`, barrel registration in `src/scenes/index.ts`                                                                                                                                                                                   | `information_processing_lab` alias; DEV-only `&module=` direct launch.                                                                                                                                                                                                                                                                 |
| PW_DEV_PORT                            | `playwright.config.ts`                                                                                                                                                                                                                                           | Focused runs use `PW_DEV_PORT=5199`.                                                                                                                                                                                                                                                                                                   |

External references consulted (read-only): Phaser 3 input/drag documentation
(https://docs.phaser.io/ — engine and docs MIT-licensed; no code copied).

## 3. Architecture

```
src/informationProcessing/
  model.ts            shared types: input mode, window status, SemanticCommand, grammar specs
  commands.ts         grammar + parser: typed text → SemanticCommand; command → canonical text;
                      validateCommand (the ONE validation both input modes pass through)
  programEngine.ts    transactional program buffer (append/remove/move/clear, validate-then-commit,
                      full rollback), snapshot/restore, generic signal-workspace evaluator
  telemetry.ts        per-family proto logger (episode = family), family registry for disjointness tests
  windowState.ts      shared window lifecycle helper (open/reopen/close/active_ms/submission count),
                      validity-register bridge (one record per module)
  tutorial.ts         common terminal orientation (proto_ip_tutorial_*; never item evidence)
  pipeBoardEngine.ts  PURE transactional pipe board + the two lattice forms (Node-importable,
                      no import.meta) — reuses validatePipePlacements from src/measurement/m13PipePuzzle.ts
  m13PipeNetwork.ts   M13 module store over the engine (proto_m13_lattice_*): window, raw counters,
                      bounded test runs, feedback, probe
  faultForms.ts       PURE fault forms A/B + consistency helpers (consistentHypotheses,
                      contradictionCount) — imports no M13 module
  m18FaultDiagnosis.ts M18 module store over the forms (proto_m18_fault_*): panels, tests,
                      reversible hypotheses, one-shot submission, entry snapshot
  m14PacketSaturation.ts / m15LayeredCipher.ts / m16ProtocolUpdate.ts / m17SyntaxAcquisition.ts
  probe.ts            DEV-only window.__ipModules aggregator
  ui/openIpOverlay.ts pause-and-launch + key wiring (inventory precedent)
  ui/ipTheme.ts       layout constants over the inventory theme tokens
  ui/SignalTerminalScene.ts  reusable terminal (incoming / codebook / palette / buffer / output /
                      console / composer + command line / submit) driven by a TerminalTaskAdapter
  ui/PipeBoardScene.ts       M13 board overlay (drag/rotate/place + keyboard cursor)
  ui/DiagnosisConsoleScene.ts M18 console overlay (evidence / tests / hypotheses)
src/scenes/InformationProcessingLabScene.ts  proving ground with seven stations
```

One authoritative state store per module; the UI never holds hidden state.
Mouse and keyboard produce the same `SemanticCommand` objects and call the
same store functions (`appendCommand` etc.), recording `input_mode`.

## 4. Event families (all provisional, episode = family, no canonical context)

| Module   | Opportunity id                      | Family                 | Tutorial?                |
| -------- | ----------------------------------- | ---------------------- | ------------------------ |
| Tutorial | `proto_ip_terminal_tutorial`        | `proto_ip_tutorial_*`  | excluded from every item |
| M13      | `proto_m13_lattice_construction`    | `proto_m13_lattice_*`  | —                        |
| M18      | `proto_m18_lattice_fault_diagnosis` | `proto_m18_fault_*`    | —                        |
| M14      | `proto_m14_packet_saturation`       | `proto_m14_packet_*`   | —                        |
| M15      | `proto_m15_layered_cipher`          | `proto_m15_cipher_*`   | —                        |
| M16      | `proto_m16_protocol_update`         | `proto_m16_protocol_*` | —                        |
| M17      | `proto_m17_syntax_acquisition`      | `proto_m17_syntax_*`   | —                        |

## 5. Decisions taken inside the contract (documented, reversible)

1. `src/informationProcessing/` rather than `src/measurement/informationProcessing/`:
   the accepted inventory foundation established "subsystem folder + `ui/`"
   for domain-plus-overlay subsystems; `src/measurement/` holds flat
   state-only modules.
2. Infix family names keep the lab families disjoint from the Pump House
   route families while remaining `proto_m13_*` … `proto_m18_*`.
3. Window closure: ESC leaves the overlay but keeps the window open for
   return (M02 precedent); an explicit "Stop task" (confirmed) closes it as
   `exited`; a bounded submission count closes it as `exhausted`; a valid
   submission closes it as `completed`. M18 becomes available once the M13
   window is closed by ANY route (sequencing, not performance gating).
4. Decoder modules (M14–M17) require the common tutorial for a valid
   opportunity: tutorial failed → `comprehension_failure`; tutorial never
   attempted → `invalid_entry_state` (recorded, never "low").
5. `I` does not close the terminal overlay (typed commands need letters);
   ESC closes every IP overlay; `I` additionally closes the pipe board and
   diagnosis console (inventory precedent).
6. Domain tests are Playwright specs importing pure modules (repository
   convention; no node:test harness for `src/` exists).
7. The bounded-unit skill's "stop before the next unit" rule is overridden
   by the mission's explicit authorisation to run Units 1–5 in sequence
   with one commit per unit.
8. Playwright's Node transform cannot parse `import.meta`; every module a
   Node-side spec imports (engines, forms, commands, programEngine) is kept
   `import.meta`-free; runtime stores (which need `import.meta.env.DEV` for
   probes/params) are exercised only through the browser.
9. `src/index.ts` registers scenes from `Object.values(scenes)`; module
   namespace objects enumerate exports **alphabetically**, so a scene whose
   class name sorts before its host renders beneath it (DiagnosisConsoleScene
   < InformationProcessingLabScene). Every IP overlay therefore calls
   `this.scene.bringToTop()` in `create()`.

## 6. Unit 2 — M13 lattice bench and M18 diagnosis console

- **M13 mechanic:** 3×3 mounts, standard nine-piece bench, fractured B2,
  FEED/INTAKE ports per form (A west→east, B north→south), drag or
  click-pick, right-click/R rotate, DEL/drop-on-bench return, keyboard
  focus ring across mounts+bench, explicit TEST FLOW (max 4 runs), neutral
  structural feedback (connected / valve inline / open-branch count),
  STOP TASK (confirmed) closes as `exited`.
- **M18 mechanic:** reference lattice (constant), fault brief, 4 evidence
  panels (E4 neutral), 3 reversible/repeatable tests, RULES reference panel,
  4 hypotheses with SELECT / RULE OUT (reversible), one explicit SUBMIT
  DIAGNOSIS. Form A: leak before intake; form B: supply restriction. Each
  wrong hypothesis is contradicted by ≥2 items; the correct one by none.
- **Independence:** `faultForms.ts`/`m18FaultDiagnosis.ts` import no M13
  module; the M18 entry snapshot is a pure function of the M18 form; the lab
  only _sequences_ (console refuses while the bench window is `open`), and
  solved / exhausted / exited / never-opened benches all open the identical
  console (proved by `ip_pipe_suite.spec.ts`).
- **Finding (outside allowlist, not fixed):** `src/world/RoomScene.ts`
  prompt number-key handlers are plain `keydown-*` listeners without
  `guardKeyHandler`; under slow frames Phaser's keyboard-queue replay can
  double-select and skip a card stage. Observed as an intermittent
  `pipe_diagnosis_setback.spec.ts` (Pump House) failure during this unit's
  runs (branch 2/5 fail, base 3/3 pass in a paired study); no changed line
  is on that path (the validator extraction is behaviour-preserving and its
  pure test passes). Routed to the route maintainers.
