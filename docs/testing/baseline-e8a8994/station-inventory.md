# Station inventory at baseline commit e8a8994

Source: `src/data/researchInteractions.ts` + `src/scenes/Main.tsx` `addMpsInteractions()`.
Exactly **9 research stations** + 1 non-research template leftover. All live in the single
`Main` scene as proximity stations (72 px interaction radius, SPACE to open, keys 1/2/3
to choose) positioned relative to the Tuxemon-map spawn point.

| #   | Station identifier         | Label              | room_id                                | Position (rel. spawn) |
| --- | -------------------------- | ------------------ | -------------------------------------- | --------------------- |
| 1   | `dockArrivalTutorial`      | Dock Tutorial      | `dock_arrival`                         | (-208, -96)           |
| 2   | `archiveAccessTerminal`    | Archive Terminal   | `archive_room`                         | (-128, -256)          |
| 3   | `systemsRepairFailure`     | Repair Panel       | `systems_repair_room`                  | (+32, -256)           |
| 4   | `hazardUncertaintyWarning` | Hazard Warning     | `hazard_control_room`                  | (+192, -256)          |
| 5   | `engineerReportBack`       | Engineer Hub       | `engineer_hub`                         | (+352, -256)          |
| 6   | `finalCoreIntegration`     | Final Core         | `final_core_room`                      | (+512, -256)          |
| 7   | `inventoryPrepChecklist`   | Inventory Prep     | `inventory_prep_room`                  | (-48, -96)            |
| 8   | `optionalSideRepair`       | Side Repair Bay    | `optional_side_repair_bay`             | (+112, -96)           |
| 9   | `interruptionCorridor`     | Comms Interruption | `interruption_corridor`                | (+272, -96)           |
| —   | `sign`                     | (template Sign)    | — (no room_id; not a research station) | Tiled object layer    |

Slice disposition (per approved plan §11): stations 1 and 2 are ported to real
DockScene/ArchiveScene; stations 3–9 remain prototype-only behind sealed Hub doors;
the full prototype (all 9 stations) stays reachable via `?scene=prototype`.
No research station may disappear.
