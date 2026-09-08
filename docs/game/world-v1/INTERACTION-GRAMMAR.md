# Interaction, UI and motion grammar

Astra 2026-09-08. Original [state board](../../verification/professional-world-v1/astra-authority/interaction-states.svg), [HUD](../../verification/professional-world-v1/astra-authority/inventory-hud.svg) and [depth board](../../verification/professional-world-v1/astra-authority/depth-layers.svg).

## Five object states

| State                      | World appearance                                                                                                          | Sound                                                                        | Proximity/focus prompt                                                           | Transition                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Required interactive       | Consistent front control/handling face, reachable clear floor, restrained material contrast; route context names function | Silent idle; brief activation confirmation, not a reward chime               | One stable cue: “E / Space — Read terminal”; focus verb also in pointer target   | Active face changes to working surface using same eligibility                |
| Optional contextual        | Readable handle/page/seat form subordinate to landmark, no target beacon                                                  | Silent until inspected; short neutral content                                | “E / Space — Inspect …” only near/focused; optional status stated on opened card | Closes without changing route or primary status                              |
| Decorative/non-interactive | No control face, hover outline, focus stop or misleading task icon; clustered in storage/architectural recess             | Silent                                                                       | None; never consume E or pointer clicks as fake interactions                     | Only fixed crew-state changes                                                |
| Temporarily unavailable    | Same functional silhouette with physically closed cover/isolated connector; no animated lock                              | Silent idle; neutral activation response                                     | Only when inspected: “Inspect …”; then concise cause/availability condition      | Same object becomes usable at existing authorised stage, not on task success |
| Completed/restored         | Cover closed, stable surface, tools returned; low visual activity; actual completion only                                 | Single restrained completion sound if operationally needed; no looping chime | Optional “Inspect …” on focus; no repeated demand                                | Settles; actual measurement state remains source of truth                    |

“Required” is route functionality, not compulsory completion of optional behavioural opportunities. M03/M04 optional cleanup, M05 unsolicited initiation and M09/M10 accepted commitments must not inherit obligatory target cues. State-board examples illustrate the grammar, not new salience authority for those items.

## One-target arbitration

Retain registry architecture and extend it to all seven zones. Preserve current 72 worldpx activation eligibility until owner approves any item-specific difference; remove the misleading gap between registry metadata and runtime radius. Choose the nearest eligible operating face with unobstructed reach; stable tie-break by registry ID, small hysteresis only if it does not change accepted action. At most one prompt exists. A controller must never activate a different object merely because _some_ prompt is present.

Use a fixed lower context strip in the world safe area (one line, maximum 420 logical px), associated with the selected face by focus/clear proximity rather than an animated ring. It must not obscure feet, the operating face, hotbar or task source. Mouse activates only the currently reachable/focused face; no distant point-and-click teleport. Keyboard movement remains unchanged. Keep pointer/card controls equivalent where currently authorised; adding redundant world pointer activation requires focused parity tests and unchanged event meaning.

M04 debris ownership wins within its authorised cutter/debris context; normal station selection cannot steal disposal input. Workspace focus traps input, Escape returns focus to the invoking object, held keys are released. Standard verbs: Talk, Read, Inspect, Use, Open, Return. Custom meaningful verbs may replace “Use” (Scan/Dig) where already taught. Avoid “Use Kai”.

## Discovery without label walls

Architecture leads to a functional cluster; the operating face identifies its usable object; proximity supplies the exact verb. A brief arrival caption can name the zone once. No permanent object names, status ribbons, rings, arrows, ordinal Laboratory floor numbers or floating completion badges. In-world signage is architectural and infrequent; essential reading occurs in native UI, never tiny pixel text.

Mission card collapses after the stage transition or opens on request; one immediate action always wins over tutorial text. Initial design:≤2lines in a 360 logical-px panel, fade to a compact log control after 6s, manual reopen available. These timing/disclosure changes are proposals affecting guidance exposure: do not apply to M09 reminders or M05 opportunities until owner approves the exposure treatment. No M20 reminder is added.

Map is a static on-demand station plan with honest cardinal links, current zone and currently authorised next check-in. Avoid new task pins/checklists revealing optional observations. Preserve current map/reminder telemetry; return look-ahead OD-W1-6 remains held. A map can help navigation without announcing a missed voluntary action.

## Audio, motion and accessibility

Default idle scenery is still. Short door/vent actions follow visible causes, usually≤1.5s. At most one low-contrast ambient motion source in a viewport, outside task-reading zones; no random flicker, snow overlay or mandatory watching. Reduced-motion disables ambient loops and camera effects while retaining static state information. M05 current unequal motion is an owner issue, not permission to remove evidence from one occasion.

State combines silhouette, control-face structure and text; never colour alone. No flashing, reward jingles or pulsing urgency. Body text 18px/27px at supported native sizes, strong contrast; keyboard focus visible inside overlays. Large-text/alternative input design must preserve full source visibility and construct-relevant manipulation. Do not offer auto-solve, auto-sort measured workspaces, unlimited extra hints or outcome-directed guidance as accessibility.

## Active post-knowledge exception

M24 depletion and M26 disconnection are active measurement states, not completed or unavailable objects. Keep repeated casts/transmissions and the useful alternative equally accessible until the existing Noor finished-outside or Utility review boundary. Switching does not close the window; ordinary airlock departure pauses. Settled art must communicate physical state without suppressing further authorised actions or directing the preferred response.
