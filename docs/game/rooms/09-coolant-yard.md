# Coolant Yard (`proto_coolant_yard`)

Status: PROVISIONAL — action-assessment rebuild Units 2 + 4. Not an
assessment station (no station-registry entry); every identifier is
`proto_*` raw telemetry with no canonical event names and no scoring.

## Purpose

Exterior work yard of the coolant red line (the first-shift mission's
main repair arc). Hosts:

- **Free scanner use (C)** anywhere inside the staked survey sector —
  the scanner is a reusable field tool, not a scripted marker click.
  Sweep = the true actionable radius (90 px); results are neutral:
  no signal / faint return with bearing / actionable return (deposit
  staked for digging).
- **Physical digging (D)** of staked deposits: timed spade work,
  terrain visibly changes (spoil mound + churned ground), yields follow
  the fixed controlled deck (2 pipe segments, 1 elbow, 1 ore, 1 scrap,
  1 empty pocket — identical cells and yields for every participant).
- **M23 (provisional)** — frozen coupling housing: hard-but-attainable
  extraction with visible 0-100 progress. Three genuinely useful
  strategies (spade work always progresses; heat canister and pry bar
  from the supply crate shorten it). Own module
  (`src/measurement/m23Excavation.ts`), own `proto_m23_*` family.
- **M26 (provisional)** — Reclaimed Sector: a small staked-off bounded
  area that is objectively empty. Certificate readout at the
  Reclamation Post → participant's own verification scan → explicit
  acknowledgement opens the window → ONLY post-acknowledgement in-bounds
  scan/dig acts are M26 evidence (`proto_m26_*`); pre-acknowledgement
  searching is secondary. A neutral useful alternative (continue the
  parts run) is always visible; leaving immediately is a valid outcome.

- **M24 (provisional, Unit 4)** — Recycler Catchment rig (SW corner):
  the F-key electromagnet winch. Useful phase = a FIXED six-pull reward
  deck (2 scrap, 1 ore, 1 credit chit, 1 empty, 1 rare display piece)
  whose ORDER is counterbalanced per session and recorded; rewards are
  cosmetic reclaim credits only (visible tally chip; nothing eases any
  scored task). The deck then empties BY CONSTRUCTION — no pull,
  jackpot included, can occur afterwards. Exhaustion presents on the
  rig readout, is verified by the participant's own scanner sweep (C at
  the rig), and the M24 window opens only at the explicit
  acknowledgement; only subsequent identical casts are M24 evidence
  (`proto_m24_*`). Stopping and continuing stay equally accessible; a
  neutral alternative records when the participant moves on. The
  post-assessment ice-bore free-play salvage (Survey Terrace) is
  untouched and still locked behind Final Core.

## Connections

- North-west doorway → Survey Terrace (`field`), east gate on the
  terrace side at (672, 320).
- North-east doorway → Pump House (`proto_pump_house`).

## Measurement boundaries

- `proto_yard_*` events are route/context telemetry owned by no item.
- M23 owns only housing acts; M26 owns only post-ack in-bounds acts;
  neither reads or writes any other module's state. The M↔Q crosswalk
  is an open research-owner decision — these are 26-battery
  provisional analogues, never canonical.
- Yard rewards never alter any later primary opportunity's entry state.

## Debug

`?scene=coolant_yard` direct launch (mechanics gate politely without
the requisitioned scanner/spade). Probes: `__playerProbe`,
`__actionHints`, `__measurementValidity`, `__lastRoomFeedbackText`.
Spec: `e2e/coolant_yard_route.spec.ts`.
