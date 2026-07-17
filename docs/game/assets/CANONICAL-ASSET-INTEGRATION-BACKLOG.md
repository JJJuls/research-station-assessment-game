# Canonical asset integration backlog

Ordered future work, all gated. Nothing here is scheduled by this
document — every batch needs (1) generated + human-approved candidates,
(2) explicit approval for the integrating beat, (3) the one-room-at-a-time
rule, (4) an `ASSET_SET_VERSION` bump per committed-asset change, and
(5) the three review agents on the integrating change. Generation itself
additionally needs the PixelLab skill gate (explicit standalone approval;
target-room mechanics/logging already working).

Standing constraints for every batch: no station/door/spawn coordinate or
interaction-radius changes; no event-identifier, scoring, Supabase,
Qualtrics, or route changes; no byte-pinned string changes; decor duller
than interactables; amber stays hazard-reserved; presentation changes that
shift measured distributions (panel geometry, evidence layout) land before
a pilot starts or between studies, never mid-sample.

## Batch 0 — generation passes (pre-integration)

Run as separate approved passes, in this order (mirrors the roadmap
Stage 4 sequence and the M1 backlog priority):

1. NPC pass: NPC-KAI-A/B + NPC-VALE-A/B (+ contact sheet). The
   highest-value single pass (backlog M1: the two human beats on the
   route stop being labelled rectangles).
2. Priority-room prop pass, one room per sub-pass: Engineer Hub →
   Inventory/Prep → Final Core → Systems Repair → Hazard Control →
   Interruption Corridor.
3. Item-icon pass (all nine icons in one pass — icons are room-agnostic
   registry substrate).
4. UI + effects pass (shared, room-agnostic).
5. Optional decal pass only if a module's layout proves to need it.

## Batch 1 — NPC embodiment (after NPC pass approval)

- Place approved Kai sprite at the existing Engineer Kai station
  (304,176 EngineerScene) and Vale beside the Quartermaster console
  (320,176 InventoryScene) as static images; labels unchanged.
- Files: `src/constants/assets.ts` (keys + ASSET_SET_VERSION),
  `EngineerScene.ts`, `InventoryScene.ts`, manifest update.
- Recommended first integration batch: smallest diff, biggest face-validity
  gain, no measurement surface.

## Batch 2 — canonical-station prop coverage (per room, six beats)

- Swap placeholder rectangles for approved props on existing stations:
  PROP-KAI-CONSOLE / PROP-DUTYBOARD (Engineer), PROP-QM-CONSOLE /
  PROP-BINSET / PROP-KITCRATE / PROP-PREPBENCH (Inventory),
  PROP-CORE-INTERFACE / PROP-CORE-MONITORS (Final Core),
  PROP-REPCONSOLE / PROP-MANUAL-STATION / PROP-PARTSSHELF (Systems
  Repair), PROP-WARNPANEL / PROP-ROUTECONSOLE (Hazard),
  PROP-BEACON / PROP-COMPETING-STATION (Corridor).
- One room per beat; texture additions to existing `addStation`/`addDecor`
  configs only.

## Batch 3 — shared scenario-console treatment

- One approved PROP-SCENARIO-CONSOLE variant applied identically at all
  four scenario stations (replaces the interim `prop-hub-console` reuse
  proposed in backlog M3). Uniformity check is the acceptance test.

## Batch 4 — guidance/feedback effects

- FX-PULSE (nearest-interactable, M4), FX-LOGGED (settled state),
  FX-FOCUSRING; then FX-PICKUP with the first per-item Inventory pass;
  FX-WARNPULSE with the Hazard beat; FX-CONSEQ with the S10 style
  unification. RoomScene is the shared touchy file — bundle carefully and
  audit specs for label-suffix collisions first.

## Batch 5 — minigame UI skins (with their host feature beats, not before)

- UI-SLOTCELL/UI-BINPLATE/UI-CHECKPANEL ride the Inventory per-item
  minigame beat (FABLE-NEXT-02 lineage).
- UI-SEQBUTTON rides the Systems Repair multi-cycle beat.
- UI-RECORDCARD rides the V3 Commit Record Console beat (S2).
- UI-RESUME rides the corridor rebuild (FABLE-NEXT-05).
- UI-PANEL9 / UI-WARNFRAME ride a presentation-only beat; note the
  panel-geometry-before-pilot rule.

## Blocked / decision-gated (do not schedule)

| Item                                                     | Blocking decision                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| PROP-CLUTTER-SET integration (Q04 tidy/cluttered states) | Psychometric sign-off on state-dependent bench visuals                                 |
| UI-PROGRESS on any status surface                        | Research-owner ruling on progress visibility + ADV-5 byte-pin re-baseline (backlog S1) |
| UI-EVIDENCE / Evidence Ledger V1                         | Ship between studies only; research-owner note on dwell-semantics change               |
| NPC-NOOR, NPC-TECH embodiment                            | Post-pilot; NPC spec §5                                                                |
| PROP-UTILITYBOT swap                                     | Side Repair off the priority list; with a Side Repair beat                             |
| Anomaly-scanner / sample-container items                 | EXCLUDED or CANDIDATE-gated (admission matrix); research-owner only                    |
| Any audio                                                | Whole-pipeline decision; zero audio assets exist by design today                       |
