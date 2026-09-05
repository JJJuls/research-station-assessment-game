# Inventory item-purpose audit (World V1)

Every item definition that can exist in the participant's inventory on the
pilot route, or that a route surface can spawn, with its purpose, origin and
disposition for this pilot. The transactional engine, drag/drop, keyboard
equivalence, conservation, rollback, save/reload and the M02/M03 namespace
isolation are untouched. Implemented in U3 as `src/inventory/itemPurpose.ts`
(pure registry) and consumed by the hotbar, the I overlay and the world
container presentation.

Kinds: **tool**, **component**, **evidence**, **document**, **mission**
(temporary mission item). Dispositions: **keep**, **rename**,
**recontextualise**, **defer** (stays defined, not spawned on the route),
**remove from active pilot** (never spawned on the route; definition kept
for the legacy proving-ground scenes so no other test moves).

## 1. Route items (spawned or produced on the pilot route)

| Item id                         | Display name (after)  | Kind      | Origin on the route                                           | Permitted use                                      | Stack / split / transfer / discard | Final disposition                                               | Neutral tooltip (after)                                                       | Decision                                          |
| ------------------------------- | --------------------- | --------- | ------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| `field_scanner`                 | Field Scanner         | tool      | issued from the field-kit locker on the airlock apron (act 5) | C — scan (yard)                                    | 1 / no / no / **no**               | stays issued; returned to the locker at handover (presentation) | Handheld subsurface scanner. Reads density anomalies where you stand.         | recontextualise (visible locker; no silent issue) |
| `excavation_spade`              | Excavation Spade      | tool      | field-kit locker (act 5)                                      | D — dig (staked field)                             | 1 / no / no / **no**               | as above                                                        | Powered spade for frozen ground. Digs the cell you face.                      | recontextualise                                   |
| `relay_coupling`                | Relay Coupling        | evidence  | recovered by excavation (M23)                                 | placed in the outbound tray at the handover desk   | 1 / no / tray only / **no**        | outbound tray (act 6)                                           | Salvaged relay coupling from the field. Goes to the outbound tray in Records. | keep                                              |
| `relay_unit`                    | Relay Unit            | component | released from the relay bench (M21, act 6)                    | placed in the outbound tray                        | 1 / no / tray only / **no**        | outbound tray (act 6)                                           | Distribution relay unit from the relay bench. Goes to the outbound tray.      | keep                                              |
| `valve_seal`                    | Valve Seal            | component | yard supply crate (act 5)                                     | coupling service (M19 surface)                     | 1 / no / no / no                   | consumed or returned to the crate                               | Relief-valve seat ring from the yard crate. Fits the coolant coupling.        | keep (visible crate origin)                       |
| `heat_canister`                 | Heat Canister         | tool      | yard supply crate (act 5)                                     | coupling service (M19 surface)                     | 1 / no / no / no                   | consumed or returned to the crate                               | Single-use exothermic canister. Thaws a frozen fitting.                       | keep                                              |
| `scrap_plate`                   | Scrap Plate           | evidence  | magnet rig pull (M24)                                         | salvage tally / sorting bench                      | 1 / no / bench / no                | salvage tray                                                    | Bent alloy plate raised by the rig. Goes to the salvage tray.                 | keep                                              |
| `ore_chunk`                     | Ore Chunk             | evidence  | magnet rig pull (M24)                                         | salvage tally / sorting bench                      | 1 / no / bench / no                | salvage tray                                                    | Dense mineral chunk raised by the rig. Goes to the salvage tray.              | keep                                              |
| `flux_calibrator`               | Flux Calibrator       | tool      | magnet rig pull (M24, rare deck outcome)                      | salvage tally                                      | 1 / no / bench / no                | salvage tray                                                    | Bench calibration unit found in the debris. Goes to the salvage tray.         | keep                                              |
| `fuse_contact`                  | Fuse Contact          | component | storm resupply pallet, Records receiving bay (act 3)          | component locker (stow); assembly bench (optional) | 8 / yes / locker, bench / yes      | component locker                                                | Relay contact pin from the resupply. Stow in the component locker.            | recontextualise (one pallet, not floor crates)    |
| `relay_housing`                 | Relay Housing         | component | resupply pallet                                               | locker; bench (optional)                           | 2 / yes / locker, bench / yes      | component locker                                                | Empty relay cartridge shell from the resupply. Stow in the component locker.  | recontextualise                                   |
| `wire_spool`                    | Wire Spool            | component | resupply pallet                                               | locker                                             | 6 / yes / locker / yes             | component locker                                                | Insulated signal wire from the resupply. Stow in the component locker.        | recontextualise                                   |
| `insulation_wrap`               | Insulation Wrap       | component | resupply pallet                                               | locker                                             | 6 / yes / locker / yes             | component locker                                                | Thermal wrap for exposed line sections. Stow in the component locker.         | recontextualise                                   |
| `sample_vial`                   | Sample Vial           | component | resupply pallet ("sample kit")                                | locker; assembly bench press (optional)            | 4 / yes / locker, bench / yes      | component locker                                                | Open collection vial. Stow in the locker; the bench press caps it.            | recontextualise                                   |
| `seal_cap`                      | Seal Cap              | component | resupply pallet                                               | locker; bench (optional)                           | 8 / yes / locker, bench / yes      | component locker                                                | Crimp cap for one sample vial.                                                | recontextualise                                   |
| `fused_relay_cartridge`         | Fused Relay Cartridge | component | assembly bench output (optional)                              | locker                                             | 2 / yes / locker / yes             | component locker                                                | Bench-tested relay spare. Stow in the component locker.                       | keep (optional utility output)                    |
| `sealed_sample`                 | Sealed Sample         | component | assembly bench output (optional)                              | locker                                             | 4 / yes / locker / yes             | component locker                                                | Capped sample vial ready for the archive rack.                                | keep (optional utility output)                    |
| `m02c_case_*` (6)               | (unchanged)           | document  | M02 case workspace intake tray                                | M02 workspace only (bound namespace)               | 1 / no / workspace / no            | handed over inside the window                                   | (unchanged)                                                                   | keep — measurement object, never in the backpack  |
| `m03_*` residuals (5)           | (unchanged)           | mission   | M03 press occasions                                           | M03 press only (bound namespace)                   | 1 / no / press / no                | restored or left, inside the window                             | (unchanged)                                                                   | keep — measurement object                         |
| M04 debris (6 physical objects) | (unchanged)           | mission   | sample cutter job (M04)                                       | disposal chute (physical layer)                    | —                                  | disposed or left                                                | (unchanged)                                                                   | keep — measurement object                         |

## 2. Defined but not on the route

| Item id                                                                                   | Where defined / used                                      | Decision                                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `field_ration`, `spare_gasket`, `filter_cell`, `beacon_cell`                              | Inventory Lab demonstration items                         | remove from active pilot (never spawned on the route; definitions stay for the legacy lab) |
| `sample_case`, `core_sample`, `pipe_segment`, `pipe_elbow`, `pry_bar`, `coolant_coupling` | legacy embodied route (Field / Coolant Yard / Pump House) | remove from active pilot (legacy rooms only)                                               |
| `m02_doc_01…12`                                                                           | legacy M02 filing workstation                             | remove from active pilot (legacy)                                                          |

## 3. Presentation rules (U3)

- The **hotbar** appears only in the Exterior Recovery Yard (tools issued)
  and while a quick-use item is held elsewhere; the selected item's name
  shows for 1.5 s after a selection change.
- The **I overlay** (backpack mode) groups by kind, shows the item's purpose
  line and its permitted destination, and offers no sorting, no automatic
  arrangement and no hint inside a measured organisation window (M02
  workspace mode and the M03 press mode are unchanged surfaces).
- World containers: the **storm resupply pallet** (Records receiving bay,
  one container with the six spare types), the **field-kit locker** (airlock
  apron: the two tools, taken at Noor's briefing — the existing
  `ensureFieldTools` issue point becomes the locker's visible act), the
  **yard supply crate** (valve seal, heat canister), the **salvage tray**
  and the **outbound tray**. Every pickup shows a 2 s message naming the
  item and its home.
- Task-critical and evidence items (`relay_coupling`, `relay_unit`, the
  tools) are not discardable; a world drop from the overlay materialises a
  recoverable bundle at the participant's feet (unchanged engine rule).
