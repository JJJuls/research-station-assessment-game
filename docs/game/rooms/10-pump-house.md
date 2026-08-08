# Pump House (`proto_pump_house`)

Status: PROVISIONAL — action-assessment rebuild Units 2-3 (Unit 4 adds
the pump restart interlock, M25). Every identifier is `proto_*`; no
canonical names, no scoring, no Q-item claims (the M↔Q crosswalk is an
open research-owner decision).

## Purpose

Interior head of the coolant red line, hosting three item-local
provisional measurement windows in strict sequence:

- **M13 — manifold reconstruction** (`proto_m13_*`,
  `src/measurement/m13PipePuzzle.ts`): a 3×3 floor-trench slot grid
  between FEED (west) and INTAKE (east) with a fractured centre mount
  forcing a routed run. The STANDARDISED PIECE SET (2 straights,
  4 elbows, 1 tee, 1 inline valve, 1 decoy end cap) is always complete
  at the bench regardless of any earlier gameplay outcome. Pointer
  path: drag pieces from the bench into mounts, click a seated piece to
  rotate it. Keyboard path (full equivalent): the Trench Console cards
  seat/rotate/return pieces and open the test flow. Submission
  validates real connectivity (sealed path + valve inline + no open
  branch); multiple layouts are valid; the puzzle can never
  auto-complete. M13 owns only placement/rotation/removal/submission.
- **M18 — pressure diagnosis** (`proto_m18_*`,
  `src/measurement/m18Diagnosis.ts`): after the sealed test flow, ONE
  standardised residual fault presents at the Diagnostic Board —
  constants identical for everyone and independent of the puzzle run,
  so puzzle success never implies the answer. Four checkable evidence
  readouts; one final diagnosis from counterbalanced option orders
  (recorded). Neutral hand-off regardless of correctness.
- **M22 — standardised setback** (`proto_m22_*`,
  `src/measurement/m22Setback.ts`): the prescribed relief-valve seal
  cracks on first seating — explained as external (batch-brittle,
  "not a workmanship issue"), identical for everyone. Recovery route
  stays open: fresh seal in the Coolant Yard supply crate; M22 owns
  only post-setback recovery behaviour. Leaving mid-window is a
  recorded neutral fact (it is the recovery route).

## Connections

- South doorway → Coolant Yard (`proto_coolant_yard`).

## Debug

`?scene=pump_house` direct launch. Probes: `__physicalProbe` (bench
pieces as objects, mounts as containers), `__promptCards`,
`__measurementValidity`. Spec: `e2e/pipe_diagnosis_setback.spec.ts`.
