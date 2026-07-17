# Canonical Q01-Q33 asset production — prompt pack

Status: **specification only — no binary was generated.** No PixelLab MCP
server (or any other approved image-generation tool) was available in the
producing session, so per the task contract this pack records everything a
future approved generation pass needs, and binary generation remains
**PENDING**. Branch `fable-canonical-asset-production-v1` (isolated
worktree), base `e9d3e21`.

Governance: generation itself stays gated by
`.claude/skills/pixellab-asset-pipeline/SKILL.md`
(`disable-model-invocation: true`) — running any prompt below still
requires explicit, standalone user approval for the specific pass, and the
target rooms' placeholder mechanics/logging must already work. Generated
outputs are **candidates, not approved production stimuli**; human approval
for every candidate is `PENDING`
(`canonical-asset-candidate-manifest.json`). Nothing in this pack changes
gameplay source, tests, event identifiers, scoring, Supabase, Qualtrics, or
the participant route.

Sources of truth used (see the production report §2 for the full list):
the canonical blueprint (`Q01-Q33-PLAYABLE-GAME-BLUEPRINT.md` §4 NPC
architecture, §5 gathering policy), the room/minigame contracts, the
admission/exclusion matrix, the e0684e9 visual-design pack ("Polar
Meridian" direction, room-by-room plan, NPC spec, minigame UX spec,
polish backlog), `docs/assets/pixellab-asset-manifest.md` (provenance
conventions, accepted-asset settings), and measured repository dimensions.

---

## 1. Shared generation contract

### 1.1 Style preamble (prepend to every prompt below)

> Top-down pixel art for a cold polar research outpost interior, consistent
> with an existing asset set: muted desaturated slate-blue and gunmetal
> palette, single color dark outline, basic shading, medium detail, low
> top-down view, clean readable silhouettes at 32 px tile scale. No text,
> no letters, no numbers, no logos, no watermark. Transparent background.

### 1.2 Fixed settings (from the accepted Wave 3 records)

| Setting      | Value                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tool         | PixelLab MCP — `create_map_object` (basic mode) for props/items/UI/effects; character pipeline (rotations + `walking-8-frames` + `breathing-idle` templates) for NPCs; tileset pipeline chained to interior-v3 base tiles for decals |
| View         | `low top-down`                                                                                                                                                                                                                       |
| Outline      | `single color outline`                                                                                                                                                                                                               |
| Shading      | `basic shading`                                                                                                                                                                                                                      |
| Detail       | `medium detail`                                                                                                                                                                                                                      |
| Seed         | n/a (API does not expose one) — record job/generation IDs instead                                                                                                                                                                    |
| Licence      | PixelLab subscription generation for this project                                                                                                                                                                                    |
| Tile grid    | 32×32 px (matches `tileset-outpost-interior-v3`)                                                                                                                                                                                     |
| Player scale | 96×96 px frame canvas, 32×42 px collision body                                                                                                                                                                                       |

### 1.3 Palette discipline (Polar Meridian — enforced, not advisory)

- Deck slate `#39465a` / bulkhead gunmetal `#2b3a4a` family for all
  structure; decor always darker/duller than the room's interactables
  (data-panels salience-inversion rule).
- Cyan `#5fd3c4` **only** on interactable/active-system cues — never
  decorative.
- Rust-orange remains **player-only** as the principal warm mid-tone; no
  other asset may use it.
- Amber/warning-orange **reserved for hazard/warning semantics** (Hazard
  Control assets, warning tag, warning pulse) — no decorative amber
  anywhere else.
- High contrast, keyboard-first readability; no colour-only state signal
  (every state also differs by shape/brightness/glyph).
- **No visual signalling of a scientifically "correct" choice** — the four
  ethical-scenario stations share one identical console visual; effects and
  UI states are valence-neutral (no green/red good/bad coding).

### 1.4 Candidate + contact-sheet rules

- ≥2 coherent variants (A/B) per priority asset; single variant permitted
  for optional/deferred assets.
- Output paths: `public/assets/generated/candidates/{npcs,items,props,ui,effects}/`
  — new paths only; **never overwrite** anything under the existing
  `public/assets/{characters,props,tiles,ui,pixellab}/` trees.
- Contact sheets: one per family at
  `public/assets/generated/contact-sheets/<family>-contact-sheet-NN.png`,
  2× scale, neutral `#101820` background, 2 px separators, each cell
  captioned with the candidate ID (text allowed on contact sheets only,
  never inside asset files).
- Record for every generated file: candidate ID, job/generation ID,
  SHA-256, dimensions, date — appended to
  `canonical-asset-candidate-manifest.json` (integration_status stays
  `NOT_INTEGRATED`, human_approval stays `PENDING`).
- Reject-don't-force: off-style outputs are logged as rejected with the
  reason, never integrated.

Prompt composition: `<style preamble> + <base prompt> + <variant delta>`.

---

## 2. Family 1 — NPC sprites

Pipeline: same as `player-researcher-v1` — per-direction 96×96 frames,
cardinal 4 directions loaded (8 generated is acceptable), idle 4 frames
(`breathing-idle`), walk 8 frames (`walking-8-frames`; optional for pilot —
M1 minimum is a static south idle), transparent background, player-matched
outline/scale so NPCs read as the same species of art. Suits stay
**cold-neutral** so no NPC reads warmer or more salient than the player.
No embedded text, no insignia legible as text, no resemblance to any real
or copyrighted character.

### NPC-KAI — Engineer Kai (Engineer Hub, station at 304,176)

Role cues without moral signalling: engineer's utility gear, no clipboard
of judgement, no "authority" costume. Personality per NPC spec: precise,
unhurried.

- Base prompt: "Station engineer character in a slate-teal insulated
  utility suit with a darker harness and small shoulder tool pouch,
  short practical hair, calm neutral expression, standing at ease,
  same body proportions and outline style as a 96x96 top-down pixel art
  researcher character."
- **NPC-KAI-A** delta: "slate-teal suit with thin gunmetal trim, sleeves
  rolled, a compact diagnostic tool clipped at the hip."
- **NPC-KAI-B** delta: "deeper teal-grey coverall with a light utility
  vest, work gloves tucked in the belt, no visible tools."

### NPC-VALE — Quartermaster Vale (Inventory/Prep, console at 320,176)

- Base prompt: "Station quartermaster character in a grey-green insulated
  work suit with a storage-webbing vest, practical build, neutral
  attentive expression, standing at ease, same proportions and outline
  style as the 96x96 top-down pixel art researcher character."
- **NPC-VALE-A** delta: "grey-green suit with a slate apron front and a
  small strap-secured pouch row across the chest."
- **NPC-VALE-B** delta: "muted olive-grey coverall with rolled cuffs and
  a single cross-body satchel strap, no apron."

### Optional (generate only if the pass has capacity; single variants)

- **NPC-NOOR-A** — Records Officer Noor (Archive, post-pilot embodiment,
  lowest priority per NPC spec §3.4): "Station records officer in a
  slate-blue administrative uniform jacket over a grey base layer,
  neat appearance, neutral professionally-weary expression, same
  proportions and outline style as the researcher character."
- **NPC-TECH-A** — neutral duty technician (unassigned background NPC,
  ENGAGEMENT_ONLY_UNSCORED, post-pilot): "Generic station technician in
  a plain cold-grey insulated jumpsuit with no markings, neutral face,
  same proportions and outline style as the researcher character."

Neutrality risks (all NPCs): no smiling/frowning asymmetry between Kai and
Vale (both neutral-calm); no colour warmth ranking; Vale must not look
"suspect" (Scenario D subject) — no dishevelled or furtive cues.

---

## 3. Family 2 — approved item/tool icons

Icon grid: **32×32 px canvas, content within 28×28**, transparent PNG,
readable at 1× against `#101820` panel background and the slate deck.
No rarity colours, no currency, no weapons, no fishing/farming tools.
Item identity comes from silhouette; any label plate is **blank** (labels
are rendered at runtime so wording can change without regenerating
stimuli). Consumers: contextual item registry (S3), carried-items HUD
(S4), inventory/prep slot board.

| ID           | Item                      | Traceability                               | Base prompt (after preamble)                                                                                     | A delta                               | B delta                                              |
| ------------ | ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| ITEM-CRED    | Access credential         | Archive Q13 (code/query episode substrate) | "Small station access credential card, slate-grey with a subtle cyan chip contact and a blank label plate."      | "flat keycard with chamfered corner"  | "rigid tag on a short clip, blank face"              |
| ITEM-TABLET  | Checklist/data tablet     | Q01 checklist use (+Q16 verification)      | "Handheld data tablet with a dark screen showing faint abstract list lines (no letters), gunmetal frame."        | "portrait tablet, thin bezel"         | "rugged tablet with corner bumpers and a hand strap" |
| ITEM-CALTOOL | Calibration tool          | Q02/Q03 correct-tool selection             | "Compact calibration instrument with a small dial and probe tip, gunmetal body, single cyan indicator dot."      | "pen-style probe with dial at base"   | "handheld meter with short probe lead"               |
| ITEM-COMP    | Repair component          | Q07/Q14/Q16 fetch-and-fit steps            | "Replaceable machine component module, boxy slate housing with visible connector pins and a handle notch."       | "cube module with two connector pins" | "flat cartridge module with a pull tab"              |
| ITEM-SEALKIT | Seal kit                  | Inventory kit item (Q01-Q03)               | "Small sealed maintenance kit pouch with a strap and a blank status plate, muted grey-blue fabric."              | "zip pouch with moulded corners"      | "hard clamshell mini-case with latch"                |
| ITEM-DATAMOD | Archive data module       | Q22 (log/record substrate)                 | "Data storage module, dark slate cartridge with a faint cyan activity strip and a blank index plate."            | "vertical cartridge with grip ridges" | "flat disk caddy with a window slot"                 |
| ITEM-SUPPLY  | Labelled supply container | Q01/Q03 bin placement                      | "Small supply canister with a prominent blank label plate, muted grey body with a slate lid."                    | "cylindrical canister"                | "rectangular tub with clip lid"                      |
| ITEM-WARNTAG | Warning tag               | Q12 (hazard semantics — amber allowed)     | "Warning tag: small amber-bordered tag with a blank face and a short attachment loop, matte finish, no symbols." | "diamond tag shape"                   | "rectangular tag with rounded corners"               |
| ITEM-MANUAL  | Manual/log                | Q22 manuals/logs/evidence                  | "Compact technical manual, dark cover with a blank spine plate and faint page edge lines, slate-blue binding."   | "ring-bound flip manual"              | "hard-cover log book with an elastic band"           |

Excluded by ruling (do **not** generate): sample container
(environmental/biological sample collection is EXCLUDED for the pilot —
admission matrix §2) and anomaly scanner (anomaly arc is
OPTIONAL_POST_PILOT with CANDIDATE events — do not build ahead of the
decision).

---

## 4. Family 3 — canonical room props

Conventions: generation canvas 32×32 / 48×48 / 64×64 per prop (PixelLab
trims transparent margins on export — the committed file is authoritative
for layout); footprint stated in 32 px tiles; every prop is duller than
cyan interaction cues except where it IS the interactable; **no prop moves
any station/door/spawn coordinate or interaction radius** at integration
time. Priority rooms: Engineer Hub, Inventory/Prep, Final Core, Systems
Repair, Hazard Control, Interruption Corridor.

### Engineer Hub

- **PROP-KAI-CONSOLE** (report-back terminal; Q09/Q10 delivery; canvas
  48×48, footprint 1×1): "Engineer's report console: standing work
  console with an angled dark screen showing faint abstract status rows
  (no letters), cable run to the floor, gunmetal frame with a single
  cyan power indicator."
  - A: "single-pillar console, screen facing south."
  - B: "console with a small side desk wing and document tray (blank)."
- **PROP-DUTYBOARD** (duty roster display; Q10/Q18 opportunity-visibility
  surface — labels-only rule, must never look like a score display;
  canvas 64×48, footprint 2×1): "Wall-mounted duty board: dark panel
  with abstract row separators and small neutral slot markers (no
  letters, no numbers, no bars that read as scores), gunmetal bezel."
  - A: "three-row board with subtle pin points."
  - B: "two-column board with faint grid lines."

### Shared ethical-scenario console (Hub allocation / Engineer calibration bench / Archive reconciliation desk / Inventory seal log)

- **PROP-SCENARIO-CONSOLE** (pilot ethics layer, unmapped by rule; canvas
  48×48, footprint 1×1). One visual used **identically at all four
  stations** — per-scenario distinct benches are rejected (art direction
  §2.4: the four decisions must stay visually equivalent; a distinct
  "calibration bench" prop would break salience uniformity, so the
  task-list entry "calibration bench components" is deliberately served
  by this shared console): "Freestanding station console with a flat
  angled top screen showing a faint neutral abstract diagram (no
  letters), slate body, thin gunmetal legs, one small cyan standby dot.
  Deliberately plain and symmetrical."
  - A: "lectern-style single pedestal."
  - B: "twin-pedestal desk form with a closed cable tray."
  - Neutrality risk (primary): must not look more/less "official",
    "warm", or "urgent" than canonical task stations; identical at all
    four sites; **no amber**.

### Inventory / Preparation

- **PROP-BINSET** (labelled storage bins; Q01/Q03; canvas 64×48,
  footprint 2×1, reads as 3 distinct bins): "Row of three open-top
  storage bins on a low rack, each with a large blank label plate,
  muted grey-blue bodies with slightly different lid colours in the
  same cold family (slate, grey-teal, gunmetal — differences visible in
  shape too: notch, handle, plain)."
  - A: "three equal square bins."
  - B: "three bins of slightly different widths with front cut-outs."
  - Accessibility note: bins must differ by shape marker as well as hue
    (no colour-only coding — admission matrix safeguard).
- **PROP-QM-CONSOLE** (checklist station / Quartermaster console; Q01;
  canvas 48×48, footprint 1×1): "Quartermaster's counter console: waist-
  high counter with an embedded dark checklist screen showing abstract
  tick-row lines (no letters, no check marks), storage cubbies below."
  - A: "counter with side clipboard hook (blank clipboard)."
  - B: "corner-form counter with a small parcel shelf."
- **PROP-KITCRATE** (kit crate; Q01-Q03; canvas 48×48, footprint 1×1):
  "Open field-kit crate with moulded interior slots visible from above,
  slate shell, blank stencil plate on the front, no contents."
  - A: "lid open against the back edge."
  - B: "lid removed, resting beside (single sprite)."
- **PROP-PREPBENCH** (prep bench; Q01-Q04 context; canvas 64×48,
  footprint 2×1): "Preparation workbench with a clean brushed-metal top,
  under-bench drawers, a small rail for hanging tools (empty), cold
  grey-blue tones."
  - A: "straight bench."
  - B: "bench with a raised back panel and pegboard holes (empty)."
- **PROP-CLUTTER-SET** (cleanup/restoration indicators — Q04 signal
  surface; **GATED: state-dependent visuals interact with the Q04
  measurement and need psychometric sign-off before integration**
  (visual plan §3.5); canvas 64×48 overlay aligned to PROP-PREPBENCH):
  "Bench clutter overlay: scattered sorting trays, loose wrappers and
  an open small pouch on a workbench top, muted dull tones, clearly
  untidy but not dirty or damaged."
  - A: "clutter concentrated on one bench half."
  - B: "clutter spread across the full top, lighter density."
  - Neutrality risk: clutter must read as _state_, not as _fault_ — no
    hazard colours, no broken items.

### Systems Repair

- **PROP-REPCONSOLE** (repair console/panel; Q14/Q21/Q24 episode host;
  canvas 48×48, footprint 1×1): "Wall repair panel with the cover swung
  open showing a dark module bay and dim diagnostic strip (no letters),
  gunmetal housing, one small cyan status dot."
  - A: "hinged cover open left."
  - B: "removed cover leaning at the base."
- **PROP-MANUAL-STATION** (repair-manual / evidence terminal; Q22; also
  reusable as Archive/Engineer evidence surface; canvas 32×48, footprint
  1×1): "Standing reader lectern with an open technical manual, pages
  showing faint abstract line blocks (no letters), slate frame."
  - A: "lectern with a small lamp arm (off)."
  - B: "wall-mounted flip-manual rack."
- **PROP-PARTSSHELF** (parts shelf — fetch-and-fit component source,
  Q07/Q14/Q16 substrate; also serves Side Repair; canvas 64×48,
  footprint 2×1): "Open parts shelf with a few boxy component modules
  in cubbies, each cubby with a blank tag plate, dull slate tones."
  - A: "two-tier shelf, sparse stock."
  - B: "three-tier narrow rack, one empty cubby."

### Hazard Control (amber semantics live here — and only here)

- **PROP-WARNPANEL** (hazard warning/control panel; Q12; canvas 48×48,
  footprint 1×1): "Hazard warning terminal: dark panel with a restrained
  amber warning chevron band across the top and a dim screen with
  abstract caution layout (no letters, no exclamation marks), gunmetal
  body."
  - A: "single chevron band, screen centred."
  - B: "amber corner wedges instead of a band, slightly wider panel."
  - Neutrality risk: warning must read _factual_, not alarming — no
    flashing framing, no red, restrained amber area (< ~15% of pixels).
- **PROP-ROUTECONSOLE** (route decision console; Q12 informed/unchecked
  continue host; canvas 48×48, footprint 1×1): "Route control console
  with a schematic-style dark map screen showing abstract path lines
  (no letters), two mechanical rocker controls, slate body, no amber."
  - A: "upright console."
  - B: "angled desk console with a guard rail."

### Final Core

- **PROP-CORE-INTERFACE** (integration console; Q11/Q28 host; canvas
  64×64, footprint 2×2): "Core integration console: broad standing
  console facing a reactor wall, wide dark screen with faint abstract
  status tiles (no letters), heavy cable trunks into the floor, cold
  slate and gunmetal, one cyan standby strip."
  - A: "single wide console."
  - B: "console with two narrow side towers."
- **PROP-CORE-MONITORS** (status-monitor wall, decor — must stay duller
  than the interface; canvas 64×48, footprint 2×1; single variant —
  decor): "Bank of dark wall monitors with very dim abstract readouts
  (no letters), matte bezels, no glow." _(A only)_

### Interruption Corridor

- **PROP-BEACON** (comms beacon — Comms AI delivery point; Q15/Q17/Q19;
  canvas 32×48, footprint 1×1): "Corridor comms beacon: slim pole-
  mounted unit with a ring antenna and a small dark message screen (no
  letters), one cyan ready dot, slate body."
  - A: "floor-standing pole."
  - B: "wall bracket unit with a short mast."
- **PROP-COMPETING-STATION** (competing-task station — the corridor's
  real second task; Q15 switch target; canvas 48×48, footprint 1×1):
  "Compact auxiliary work console with a small open access hatch and a
  dark screen (no letters), visually plainer and duller than a room's
  main console, slate-grey."
  - A: "hatch on the left face."
  - B: "hatch on top, tool clips on the side (empty)."
  - Neutrality risk (validity requirement): must not look more
    attractive/urgent than the original task's stations — the competing
    offer's balance is a measured property; keep it deliberately plain.

### Side Repair (off the priority list — optional capacity only)

- **PROP-UTILITYBOT-A** (Utility Bot; OPT arc owner Q07/Q16/Q20-weak;
  canvas 48×48, footprint 1×1; single variant): "Small squat utility
  robot on rubber treads, boxy slate shell with one round neutral
  optical sensor (not cute, not menacing), folded manipulator arm,
  single cyan status dot." _(A only)_

---

## 5. Family 4 — minigame UI assets

All UI sprites are **text-free bases** (wording rendered at runtime), cool
palette on `#101820`-compatible tones, and every stateful element ships a
horizontal 4-state strip in one file: `active | keyboard-focus |
disabled | completed`. States are distinguished by **shape/brightness,
never colour alone**: focus = 2 px light outline ring + corner ticks;
disabled = 40% brightness + diagonal notch; completed = filled slot glyph

- de-emphasised border (no green, no check-mark valence; "settled" not
  "rewarded"). Panel geometry serves the existing 800×600 FIT canvas and the
  560-640 px prompt panel (minigame UX spec Part B); 9-slice borders are
  16 px.

| ID            | Element                                                                                                                                                                                                                                          | Serves                                                             | Canvas                                         | Base prompt (after preamble)                                                                                                                                                     | A delta               | B delta                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------ |
| UI-PANEL9     | Prompt/dialog 9-slice frame                                                                                                                                                                                                                      | all prompt panels                                                  | 48×48 (16 px slices)                           | "Square UI panel frame for slicing: dark blue-black fill, thin gunmetal border with subtle corner rivets, flat, no gloss."                                                       | "plain border"        | "border with faint inner hairline"         |
| UI-SLOTCELL   | Inventory/prep slot board cell                                                                                                                                                                                                                   | per-item sort/place minigame (Q01-Q03), carried-items HUD          | 40×40 ×4 states (160×40)                       | "Single square item slot: recessed dark well with a thin slate rim."                                                                                                             | "rounded-corner well" | "chamfered-corner well"                    |
| UI-BINPLATE   | Labelled-bin interface plate                                                                                                                                                                                                                     | bin choice UI (Q01/Q03)                                            | 96×32 ×4 states (384×32)                       | "Wide blank label plate with a fastening screw at each end, matte grey-blue."                                                                                                    | "flat plate"          | "plate with a subtle bracket frame"        |
| UI-CHECKPANEL | Checklist/manual panel frame + row marker                                                                                                                                                                                                        | checklist (Q01), manuals (Q22)                                     | 48×48 frame + 16×16 ×4-state row marker strip  | "UI frame variant with a header band, plus a small square row-state marker: empty outline square, focus ring square, dimmed square, filled square (no check marks, no crosses)." | "square markers"      | "circular markers"                         |
| UI-EVIDENCE   | Evidence-comparison column frame + tab chip                                                                                                                                                                                                      | Evidence Ledger V1 (scenarios; Archive log comparison Q22)         | column header 300×24; tab chip 72×20 ×4 states | "Slim column header bar and a small rectangular tab chip, dark fill, thin border, flat."                                                                                         | "square tab corners"  | "trapezoid tab"                            |
| UI-SEQBUTTON  | Repair/calibration sequence key                                                                                                                                                                                                                  | repair sequence minigame (Q14), calibration steps                  | 32×32 ×4 states (128×32)                       | "Square mechanical key cap UI element, dark top with a thin rim, flat pixel style."                                                                                              | "flat cap"            | "slightly domed cap"                       |
| UI-WARNFRAME  | Warning inspection frame                                                                                                                                                                                                                         | hazard detail panel (Q12) — amber allowed                          | 48×48 (16 px slices)                           | "UI panel frame variant with a restrained amber top edge band on gunmetal border, dark fill, no symbols."                                                                        | "solid amber band"    | "amber corner wedges"                      |
| UI-RECORDCARD | Commit/confirm station-record card frame                                                                                                                                                                                                         | V3 Commit Record Console (all four scenarios + confirmable stages) | 64×48 (16 px slices)                           | "Bordered record-card frame: double hairline border, small header band, dark fill, flat and formal, no seal, no stamp."                                                          | "double border"       | "single heavy border with corner brackets" |
| UI-RESUME     | Interruption/resume indicator chip                                                                                                                                                                                                               | corridor + duty roster (Q15/Q17 return signposting)                | 24×24 ×4 states (96×24)                        | "Small circular chip with a neutral pause/return glyph made of two abstract bars and a curved arrow, monochrome slate on dark."                                                  | "bars + arrow glyph"  | "split-ring glyph"                         |
| UI-PROGRESS   | Neutral progress label chip (**GATED**: progress display only where scientifically approved — status-board additions are blocked on the research-owner + ADV-5 byte-pin decisions (backlog S1); generate last, integrate only after that ruling) | duty roster / status surfaces                                      | 72×20 ×2 states (pending/logged)               | "Small wide label chip, dark fill with thin border; second state visually 'settled': slightly dimmer fill, filled corner notch. No bars, no percentages, no stars."              | "rectangular chip"    | "chip with rounded ends"                   |

Accessibility floor: state strips must survive 1× rendering at the 800×600
canvas; focus state must be visible at 2 px outline against `#101820`;
nothing relies on hue alone.

---

## 6. Family 5 — interaction/feedback effects

Frame strips, transparent, cool-toned, valence-neutral. **No effect may
signal a desirable ethical choice**: the same effect set plays for every
option at every scenario console, and completion effects read as
"settled/recorded", never "rewarded" (no confetti, stars, coins, green
flashes).

| ID             | Effect                           | Serves                                                      | Frames/canvas                                    | Base prompt (after preamble)                                                                                                                           | A delta               | B delta                                          |
| -------------- | -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------ |
| FX-PULSE       | Nearest-interactable pulse       | uniform guidance (M4; replaces per-room salience variance)  | 4 frames 32×32 (128×32)                          | "Soft cyan ring pulse: thin circular ring expanding and fading over four frames, single hue #5fd3c4, no sparkle."                                      | "circular ring"       | "rounded-square ring matching a tile footprint"  |
| FX-PICKUP      | Pickup/collection feedback       | item pickup (Q01-Q03, Q07/Q16 steps)                        | 6 frames 32×32 (192×32)                          | "Brief collect feedback: small cyan ring collapsing to a dot with two rising faint motes, six frames, restrained."                                     | "ring collapse"       | "short upward shimmer, no ring"                  |
| FX-LOGGED      | Logged/completed marker          | one-shot stations' settled state                            | static + 2-frame settle, 24×24                   | "Small neutral 'recorded' marker: dim slate rounded tag with a filled corner notch, monochrome, calm; a two-frame settle from slightly bright to dim." | "tag with notch"      | "flat disk with an inset line"                   |
| FX-WARNPULSE   | Warning pulse                    | hazard warning visibility (Q12) — amber, hazard-only        | 4 frames 32×32 (128×32)                          | "Restrained amber edge pulse: thin amber ring brightening and dimming over four frames, matte, never flashing white."                                  | "ring"                | "chevron-shaped pulse matching the warning band" |
| FX-FOCUSRING   | Accessible keyboard focus ring   | all UI focus states                                         | static 40×40 (+ 2-frame subtle breathe optional) | "High-contrast keyboard focus ring: 2 px near-white dashed rectangle with corner ticks, crisp, no glow."                                               | "dashed rectangle"    | "solid rectangle with corner brackets only"      |
| FX-CONSEQ      | Neutral consequence reveal       | consequence panels (all rooms; identical for every outcome) | 4 frames 64×8 edge strip                         | "Neutral panel reveal: a thin cool grey-blue edge strip that sweeps from dim to steady in four frames, no colour shift, no flash."                     | "left-to-right sweep" | "centre-out sweep"                               |
| FX-OBJCOMPLETE | Room-objective completion marker | duty-roster line completion (labels-only surface)           | 3 frames 16×16 (48×16)                           | "Tiny neutral completion glyph: an outline square filling to a solid square over three frames, monochrome slate, no check mark, no green."             | "square fill"         | "circle fill"                                    |

---

## 7. Family 6 — optional environment tiles (only if existing tilesets cannot serve)

The Wang tilesets (`tileset-outpost-interior-v3`, `-dock-v3`, 32 px)
already cover floors/walls everywhere. This family is **overlay decals
only**, chained to the interior-v3 deck base (`06c4f6e8…`) so palette
continuity is structural; single variants; generate **only** when a
canonical module's layout actually needs the marking. No shoreline,
fishing, farming, combat, or open-world tiles.

| ID              | Decal                       | Serves                                      | Base prompt (after preamble; 32×32 overlay, transparent)                                                                  |
| --------------- | --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| TILE-MAINT-A    | Maintenance detail          | Repair/Side Repair dressing                 | "Floor overlay decal: recessed cable run channel with a small vent grate, dull slate tones, subtle."                      |
| TILE-STORAGE-A  | Storage/inventory marking   | Inventory bin zones (Q01/Q03 spatial logic) | "Floor overlay decal: thin pale outline rectangle marking a storage placement zone, worn matte paint look, no letters."   |
| TILE-HAZARD-A   | Hazard-zone marking         | Hazard Control only (amber semantics)       | "Floor overlay decal: restrained amber-and-slate diagonal hatch strip along one tile edge, worn matte paint, no symbols." |
| TILE-DATAWALL-A | Archive/data-wall variant   | Archive dressing                            | "Wall overlay decal: recessed data-conduit panel with faint dark cartridge slots, dimmer than any interactable, no glow." |
| TILE-COREMACH-A | Final Core machinery detail | Final Core dressing                         | "Wall overlay decal: heavy conduit flange cluster with bolted plates, dark gunmetal, matte, no glow."                     |

---

## 8. What a future generation pass must do (checklist)

1. Confirm explicit standalone approval for the specific family/room pass
   (PixelLab skill gate) and that target-room mechanics/logging work.
2. Generate A/B variants per priority asset with the settings in §1.2;
   record job IDs + SHA-256 per file into the candidate manifest.
3. Build per-family contact sheets (§1.4).
4. Run the validation battery (production report §6): dimensions, alpha,
   near-duplicate check, no accidental text/watermarks, no copyrighted
   resemblance, no excluded-feature content.
5. Leave every candidate `human_approval: PENDING` and
   `integration_status: NOT_INTEGRATED`; selection/integration is a
   separate, human-approved step (review checklist doc).
6. Never touch existing assets, gameplay source, tests, or event/scoring
   surfaces; integration later bumps `ASSET_SET_VERSION` per the
   frozen-stimuli rule.
