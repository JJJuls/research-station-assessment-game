# Story spine and restoration states

Astra authority 2026-09-08; preserve current navigation stages and research closure separation.

## Route and state contract

Keep existing stage identifiers:
arrival → handover_briefing → incident_handover → workshop → workshop_work → lab_briefing → lab_work → exterior_briefing → exterior_work → return_hub → workshop_return → deck_closure → core_stabilise → core_sync → complete.
These are navigation states, not performance grades. Route is Dock→Concourse→Records→Concourse→Lab→Yard→Lab→Concourse→Records→Concourse→Utility→Core. Local room loops do not add scene exits.

| Story beat          | Environmental cause / owner                                                                             | Participant-facing purpose                                                                                | Visible consequence and fail-forward                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Arrival             | Storm impact on weatherward roof/mast; shuttle pilot/arrival terminal                                   | Arrive as relief operations specialist; enter through sealed Dock                                         | Watch or skip leaves identical Dock state; transport stays visibly connected                                   |
| Vale handover       | Staff counter contains fixed storm log and routing docket                                               | Establish what the next watch can rely on; choose authorised optional commitments without moral judgement | Vale provides existing onward route whether optional promises accepted or declined                             |
| Early record work   | Independent incident packet, planning surface and prepared QC product                                   | Turn scattered operational records into an intelligible working dossier                                   | Fixed dossier transport beat advances; unfinished independent opportunities remain accurately recorded         |
| Workshop            | Damaged station logistics need traceable cases, fabrication and dispatch                                | Tools/records have destinations and roles                                                                 | Crew can carry unfinished work forward; optional cleanup never gates departure                                 |
| Signal incident     | A receiver/service uncertainty requires distinct reconstruction, protocol, transfer and diagnostic work | Explain enough about the incident to plan exterior service                                                | Fixed dispatch dossier supplies the same exterior facts for everyone, independent of correctness               |
| Exterior recovery   | Storm-damaged coolant, mast, uplink and recovery compounds                                              | Restore usable operations and document material state                                                     | Noor's existing handover advances even after stopped/unfinished tasks; zero-utility alternatives remain honest |
| Return and revision | Fixed incoming service report provides new evidence/criterion                                           | Revisit ongoing work, fulfil accepted commitments if chosen, revise the station record                    | Prior footprints make consequences recognisable; no extra reminder to M20 beyond authorised exposure           |
| Utility             | Station record is closed before feeds are raised                                                        | Prepare the Core through three fixed operational controls                                                 | Feed restoration depends only on non-scored closure controls, never item success                               |
| Core                | Ready baseline feeds support synchronisation                                                            | Hand an intelligible operating state to the next watch                                                    | Quiet acknowledgement and existing research handoff; no trait or score                                         |

## NPC responsibilities

Vale owns operational routing and initial handover. Noor owns exterior access/neutral safety orientation. Kai owns incident briefing and authorised component handover. Current Laboratory Kai remains eligible, including the return leg, until OD-W1-4/owner resolves the multiple-post issue. Do not remove the Laboratory recipient or invent a remotely fulfilled promise to make the story tidier. The proposed positions are physical posts, not new reminder schedules. No NPC follows the participant, comments on personality, praises persistence or hints toward a correct choice.

## Restoration is crew progress

Rename participant-facing area summaries such as “work done” to neutral state descriptions (“crew service phase”, “visited”, “record transferred”) where accurate. A passed route stage does not prove successful local work. Each room has two visual layers: fixed narrative crew state and item-owned state. Crew covers, distant windows, stable lights and packed transit crates may change by stage; measured debris, gauge state, task alternatives and source readability change only through existing module behaviour.

Before/after scenes must preserve later measurement difficulty and access. Do not auto-clean M03/M04, brighten only one M05 form, remove M24/M26 alternatives, supply answers from a prior task, or reward an indicative choice with a prettier/harder/easier next task.

## Opening replacement:16 seconds,8 frames

Original board: [opening-storyboard.svg](../../verification/professional-world-v1/astra-authority/opening-storyboard.svg).

| Time   | Camera / environmental action                                                                  | Narrative and text/audio purpose                                                   |
| ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0–2s   | Wide fixed oblique-free top-down plateau; full connected station silhouette and stormward mast | Location without exposition; low wind, no alarm                                    |
| 2–4s   | Recognisable shuttle enters along the cleared approach, aligned to Dock                        | Show transport and destination; optional short flight-radio “Station approach.”    |
| 4–6s   | Slow linear move toward Dock; same silhouette/roof connections remain in frame                 | Cause visible in bent mast, intact cleared lane; no random showcase props          |
| 6–8s   | Shuttle stops at berth; only landing light/door action                                         | Arrival has a physical endpoint; text “Relief watch • Station 080”                 |
| 8–10s  | Dock roof/foreground reveal along an authored cut, matching playable wall/airlock              | Reveal interior route; no dissolve to unrelated geometry                           |
| 10–12s | Player steps from seal to exact playable spawn; terminal and inward lane visible               | Role: “Operations handover is inside.” via station line; no assessment instruction |
| 12–14s | Camera reaches the exact Dock initial composition; temporary movement settles                  | Input legend appears only after locomotion enabled; world remains still            |
| 14–16s | Control releases at fixed end state; opening text fades                                        | First tutorial/skip-choice system owns next action, not a competing mission card   |

Timing is a design duration; existing authorised opportunity schedule starts only at its current gameplay triggers. Use one common finish function for watch/skip: same spawn, camera, inventory, tutorial availability, story stage and held-key release. No M01–M26 events before their actual opportunities. Existing opening lifecycle/covariate names remain unchanged; elapsed/caption exposure additions require owner decision OD-W1-5. Skipping never skips or completes a primary opportunity. A visible Skip control accepts keyboard and pointer; no unannounced input can bleed into check-in.

Participant Core review shows operational feeds and the existing arm/confirm controls. Suppress instrument bookkeeping such as recorded/not-observed counts and logging details in the display only; research readiness, stored state and export remain unchanged.
