# FABLE-NEXT-08 — Rich Minigame Interfaces (task-surface presentation pass)

Status: **contract — no implementation has started in the session that
wrote it.** This document is the bounded, implementation-ready work
contract for giving the four participant-facing task minigames —
Inventory preparation, Systems Repair, Side Repair and the Engineer
report — graphical, tactile interfaces on top of the completed NEXT-07
visual baseline at commit `758eb7d`
(`fable-next-07-visual-prototype-v1`, `outpost-assets-v2`).

**Execution model** (identical to NEXT-07's): the committed contract
plus the explicit launch of an implementation agent against it
authorises all NEXT-08 phases. No per-phase human approval gate exists
between ordinary implementation phases: the agent proceeds to the next
phase automatically after (a) a clean local commit for the current
phase, (b) green phase-specific verification (§9), and (c) no blocking
reviewer finding. The agent stops and reports **only** on:

1. a genuine research-owner decision (a standing open decision from
   §10, or a newly discovered event-schema / scoring-plan question);
2. destructive ambiguity — two readings of this contract would produce
   materially different participant-facing results and neither is safe
   to pick;
3. telemetry risk — any indication that a change could alter an event,
   payload, observed moment, timing semantic, or measurement
   environment (§5);
4. an unavailable dependency that prevents safe completion of the
   current phase;
5. evidence that this contract cannot be followed without altering
   research mechanics.

Governing documents (authority per CLAUDE.md hierarchy — this contract
governs presentation only and defers to every higher authority):

- Presentation rules: `docs/game/UI-PRESENTATION-CONTRACT.md`
  (NEXT-06 card panel, status side panels, boundaries) as **amended by
  this contract within its own presentation domain** (§4.6 records the
  two deliberate amendments and schedules the addendum).
- Visual language: the NEXT-07 contract
  (`FABLE-NEXT-07-VISUAL-ASSETS-NPCS-GAME-FEEL.md`) and its durable
  record (`docs/game/NEXT-07-VISUAL-VERIFICATION-RECORD.md`) — Polar
  Meridian palette, foundry method, salience rules, all adopted
  verbatim as constraints.
- Prior minigame design material: `docs/game/REUSABLE-MINIGAME-UX-SPEC.md`
  at commit `e0684e9` (branch `fable-visual-npc-minigame-design-v1`,
  read via `git show`; not on this branch) — its "presentation-layer
  skin over the existing stage machine" method is adopted; its V1-V3
  scenario variants are **not** scheduled (§11).
- Behavioural rationale:
  `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`
  (Q01-Q04 Inventory; Q05/Q06/Q14/Q21/Q23-Q26 Repair; Q07/Q16/Q20/Q29
  Side Repair; Q09-Q11 Engineer). Nothing in this contract promotes any
  candidate event or indicator from it.
- Events / scoring / architecture: `docs/research/event-schema.md`,
  `docs/research/scoring-plan.md`, V3 — none of which this contract
  touches (§5).

---

## 1. Ground truth — audit at `758eb7d` (`outpost-assets-v2`)

Verified in this pass against the working tree.

**Shared prompt machine** (`src/world/RoomScene.ts`). Every
participant choice on the canonical route renders through one
function, `renderPromptStage(interactionKey, stage)`: a 560 px slate
panel at (centerX−280, 72) with a header (interaction label +
in-fiction body), one bordered choice card per option (index badge,
wrapped label), and the instruction line "Select an option — point and
click, or use the arrow keys and Enter." Inputs: pointer hover
focuses / click activates; Arrow Up/Down + Enter; hidden numeric keys
1-9. **All input paths converge on the single `selectPromptOption`
handler**, which synchronously logs the option's `getEventTypes()`,
runs `onSelected`, closes the prompt, and opens `nextStage` if
returned. `PromptOption`/`PromptStage` (exported from
`src/world/RoomScene.ts`) carry no presentation fields today. DEV
probes: `__promptCards` (card rects), `__lastPromptBody` (full panel
text), `__lastRoomFeedbackText`, `__roomStatusText`, `__playerProbe`,
`__routeObjectiveText`, `__procTextures`. Options render in declared
order, never reordered; option count ≤ 9.

**Visual baseline.** 800×600 FIT canvas, `pixelArt: true`; 14 frozen
`proc-*` textures (`src/world/proceduralTextures.ts`, fixed manifest,
idempotent `ensureProceduralTextures`, pinned by
`e2e/proc_textures_determinism.spec.ts`); committed-prop A2 reuse;
nearest-eligible interaction pulse; panel-language label chips;
read-only status side panels (x = 650, 146 px); 2200 ms feedback
toast; uniform player drop shadow. The Phase 7(a) vignette was
**removed** at `16556e2` and is absent from both the code and the
verification record at `758eb7d` (the record's stale "retained"
bullet was deleted at `758eb7d`). Room ambient loops and NPC idle
bobs: deferred to neither / none.

**The four minigames as implemented:**

- **Inventory preparation** (`src/scenes/InventoryScene.ts`,
  FABLE-NEXT-02): legacy console options 1-3 verbatim, plus per-item
  mode (option 4). Registry (`src/data/itemRegistry.ts`): 8 items — 5
  kit-required (checklist order) + 3 stray bin items; every item names
  its destination in plain text. Single carried slot. Stations: Prep
  Bench (take/set down), Hand Tools Rack / Consumables Bin /
  Electronics Shelf / Field Kit Crate (stow, take back out), console
  (checklist stage, close-out → unmissable bench review → verify-or-
  skip → restore-vs-leave cleanup). Emission rules: one placement =
  one event (`inventory_item_sorted_correct`/`inventory_item_misplaced`
  at bins, `correct_tool_selected`/`wrong_tool_selected` at the crate)
  with `object_id` = item_id and per-item `attempt_number`;
  `inventory_checklist_opened` only on checklist ACTIONS; placement
  feedback neutral — errors surface only at the review;
  `missing_item` once per session per item at the close-out review;
  sequence milestones judged at fixed moments; pick/set-down/take-back
  emit nothing; one-shot after completion. Scenario D seal log
  (scenario framework) shares the room and is untouched by NEXT-08.
- **Systems Repair** (`src/scenes/RepairScene.ts`, FABLE-NEXT-03 B):
  three panel options — deterministic failing default sequence; manual
  (also a separate Repair Manual station; either sets `manualGuided`);
  revised sequence (fails unguided as its own cycle, succeeds
  manual-guided). `attempt_number` on the canonical submission-family
  events; `didRepeat` compares against the immediately previous wrong
  submission only; abandon/return pair on exit/re-entry; status side
  panel shows cycle count and completion **and deliberately never
  manual/guidance state** (displaying it would nudge and confound
  manual-use measurement).
- **Side Repair** (`src/scenes/SideRepairScene.ts`, FABLE-NEXT-03 A):
  offer (ignore / accept / defer), then three observed steps —
  fetch (Parts Shelf) → fit → check (Utility Bot console). Defer keeps
  progress; exit after ≥ 1 step without defer = observed walk-away
  (abandonment pair at the door); offer events only while unaccepted;
  `side_repair_step_completed` once per step with `metadata.step`;
  status side panel shows the current step.
- **Engineer report** (`src/scenes/EngineerScene.ts`, FABLE-NEXT-04):
  mode options (quick / evidence review / clarification, verbatim) →
  report-content stage: four claims (`REPORT_CLAIMS`,
  `src/utils/reportAccuracy.ts`) in fixed template order, exactly one
  accurate; mode-specific help text (memory-only / station-log extract
  / Kai narrows scope); selecting a claim emits
  `engineer_report_accuracy_scored` once with its metadata; neutral
  identical acknowledgement; then the duty offer stage (accept /
  decline). Scenario A calibration bench shares the room, untouched.

**Choice-card-only surfaces** (unchanged by NEXT-08): Dock tutorial,
Hub Priority Allocation + status board, Archive terminal and desk, the
four ethical-scenario consoles (identical ×4), Hazard console,
Interruption Corridor stations, Final Core interface, the Engineer
duty offer, and every one-shot/sealed feedback path.

**Test infrastructure.** Playwright only (`e2e/`, 103 tests in 34
spec files at `758eb7d`, plus `helpers.ts`/`journey.ts`); no
unit-test runner; npm scripts `build`, `bundle`, `clean`, `lint`,
`lint:fix`, `lint:tsc`, `preview`, `start`; traceability validator
`node scripts/validate-traceability-matrix.mjs`.

**Net diagnosis.** Every task minigame is mechanically complete and
measurement-correct, but each renders as text lists inside one generic
card panel. The acts the research measures — placing a labelled item,
submitting a repair sequence, fetching and fitting a part, sending a
status update — are never _visible_ as acts. NEXT-08 makes them
visible without changing what is selectable, loggable, or skippable.

---

## 2. Minigames vs. choice cards — the scope boundary

NEXT-08 distinguishes two presentation families and touches only the
first:

1. **Participant-facing task minigames** — the four surfaces where the
   participant _does work on objects_: Inventory preparation, Systems
   Repair, Side Repair, Engineer report. These gain graphical task
   surfaces (§6) rendered by the same prompt machine.
2. **The shared choice-card system** — dialogue and decision surfaces
   where the participant _chooses among stances_: everything listed as
   "choice-card-only" in §1. These keep the NEXT-06 card panel exactly
   as it renders at `758eb7d`. In particular the four ethical-scenario
   consoles remain identical, unenriched card panels — enriching
   decision surfaces is a scenario-presentation programme of its own
   (REUSABLE-MINIGAME-UX-SPEC V1-V3) and stays in the backlog (§11).

Within a minigame, stages that are _dialogue_ (the Engineer duty
offer; the Side Repair offer stage's stance options; the Inventory
legacy options 1-3) keep plain cards. The rule of thumb this contract
applies throughout: **object-work gets object presentation; stance
choices get cards.**

---

## 3. Presentation architecture — the stage-surface model

One extension mechanism serves all four minigames.

### 3.1 The additive `presentation` field

`PromptStage` gains one **optional** field (name final at
implementation, e.g. `presentation?: StagePresentation`), consumed
only by `renderPromptStage`:

- When absent, the panel renders **byte-for-byte as today** — every
  choice-card surface in the game is structurally unchanged.
- When present, it may (a) render a **task surface** — icons, slots,
  trays, step tiles, document insets — between the header and the
  option cards, (b) attach an **inline icon** to individual option
  cards, and (c) widen the panel up to **640 px** (still inside the
  800 px canvas; NEXT-06 V1 precedent) when the surface needs it.
- The declared option list, option order, option labels, the
  instruction line, header text, card focus/selection behaviour and
  the keyboard model are **never** altered by a presentation.

### 3.2 The redundant-activator rule (hard)

Every interactive element a task surface adds is a **redundant
activator of an existing option index**: clicking an item icon, a
destination silhouette, or a slot tile calls the same
`selectPromptOption(index)` the option card's click already calls.
Task surfaces never introduce a second selection path, never a new
handler that logs, and never an act that has no corresponding option.
Consequences, all load-bearing:

- Hidden numeric shortcuts 1-9, arrows + Enter, and card clicks keep
  working identically on every enriched stage.
- `selectPromptOption` remains the single selection path; duplicate or
  reordered emission is structurally impossible.
- A stage with no eligible act for some element renders that element
  as inert (no pointer handler), never as a disabled-looking option.

### 3.3 Icon foundry additions

All new art is A1 procedural (NEXT-07 §3 asset-source rules adopted
verbatim: no PixelLab, no external/binary assets, no fabricated
provenance, Tuxemon untouched). `src/world/proceduralTextures.ts`
gains a `proc-icon-*` family — disjoint from `proc-*` station
silhouettes and committed `prop-*` — added to the frozen manifest and
covered by the existing determinism spec:

- **Item icons** (≈ 24×24, one per registry item, keyed from the
  presentation layer by `item_id` — `src/data/itemRegistry.ts` is not
  edited): torque driver, diagnostic probe, coolant cartridge, fuse
  pack, patch tape, hex spanner, sealant canister, relay board — plus
  the stabiliser part (Side Repair).
- **Glyph icons**: sequence-slot chip, manual/document, step-check
  tile states (pending / current / done — glyph-differentiated, never
  colour-only), log-extract corner mark.
- Shared drawing language per NEXT-07 §5 (1-2 px `#1d2937` outline,
  flat fills + one shade step, top-left light). **Identity only,
  never validity**: no icon variant, tint, or badge may encode
  correct/incorrect, complete/incomplete-as-judgement, or any praise/
  blame state. Cyan `#5fd3c4` only on interactable/focus affordances;
  no amber outside Hazard Control (which NEXT-08 does not touch).

### 3.4 Zero new participant-facing copy (hard)

NEXT-08 authorises **no new participant-facing strings**. Every text
element on a task surface reuses, verbatim, a string the same room
already shows at `758eb7d` (interaction labels, item labels and
destination tags, side-panel step lines, existing stage-body
sentences). Surfaces that would need a caption to be legible must be
designed so the existing header/body text carries it, or dropped.
Icons always appear **with** their existing text labels, never instead
of them. No validated Q01-Q33 wording anywhere. (This is deliberately
stricter than NEXT-07's one-card exception; it removes the entire
wording-approval surface from the unit.)

### 3.5 Determinism and probes

- Task surfaces are pure functions of existing state the participant
  can already see in text on that stage (or of static registry/
  template data). Fixed order everywhere (registry order, template
  order, step order); no randomness, no time/date dependence,
  identical for every participant and session.
- `__promptCards` keeps its exact shape and continues to list the
  option cards. One **additive** DEV-only, read-only probe may be
  introduced (`__minigameSurface`: rects + labels of task-surface
  activators, participant text only, cleared on close — `__promptCards`
  precedent) so Playwright can click surface elements without pixel
  guessing. `__lastPromptBody` must remain byte-identical for every
  stage: if a presentation renders body segments in styled insets, the
  probe still composes the same panel text it composes today.
- All other DEV probe shapes untouched.

### 3.6 Presentation-contract amendments (recorded here)

Two NEXT-06 boundary statements are consciously amended by this
contract **within the presentation domain only**; Phase 8 appends an
addendum note to `docs/game/UI-PRESENTATION-CONTRACT.md`
recording both (that file's §4 wording itself stays as history):

1. "No drag-and-drop requirement anywhere" → drag-and-drop remains
   **never required**, but §6.1 authorises an _optional, redundant_
   drag path in the Inventory minigame under §5's invariants.
   Click-select-and-place remains the primary and complete model.
2. The one-renderer principle is preserved but the renderer gains the
   optional presentation layer of §3.1.

Nothing else in the UI-PRESENTATION-CONTRACT is altered: Escape-dismiss
stays absent, hover/focus/panel-open still never log, status side
panels stay read-only with their existing deliberate omissions
(Repair's hidden manual state; Inventory's SA-11 withholding; the
Corridor's no-panel rule), and the Corridor gets no new surface.

---

## 4. Objective and priority order

Make the four task minigames read as tactile station work — visibly
manipulating items, components, parts and records — while the event
stream stays byte-compatible with `758eb7d`. Priorities:

1. **Inventory preparation** — the flagship: visible item icons,
   labelled destination surfaces, click-select-and-place, correction,
   verification and cleanup presentation (§6.1).
2. **Systems Repair** — tactile panel: component/sequence-slot
   schematic, manual glyphs, diagnostic readout (§6.2).
3. **Side Repair** — fetch-fit-check made visible: step tracker,
   part icon, work-order presentation (§6.3).
4. **Engineer report** — evidence and claim-selection surfaces:
   log-extract inset, record-style claim cards (§6.4).
5. **Optional drag-and-drop** (Inventory only) and the coherence /
   accessibility pass.

Rapid completion of a fully playable prototype outranks breadth:
every phase ships a coherent, telemetry-invariant improvement, and any
deferrable element (drag, decorative slot dressing) defers rather than
delaying the unit.

---

## 5. Telemetry-preservation requirements (hard, every phase)

1. **No event identifier, payload field, payload value, metadata key,
   or observed moment changes; no new events** — including for drag,
   hover, focus, icon clicks, or surface rendering. Mere UI actions
   never log. `attempt_number` semantics, `object_id` assignments,
   `metadata.step`, `engineer_report_accuracy_scored` metadata, and
   every emission-placement rule audited in §1 stay exactly as
   implemented.
2. **No timing-semantic changes.** Selection remains synchronous with
   the physical input act (click, key, or drop); no confirmation
   sub-step is added or removed; no input-blocking animation, delay,
   or transition sits between the act and `selectPromptOption`'s
   effects. Initiation-latency, dwell and decision-latency
   measurements must be arithmetically unaffected by presentation.
3. **No changes** to `EventLogger`, `SessionState`, `QualtricsBridge`,
   `DataQualityTracker`, `ScoringManager`, `ResearchRuntime`,
   `ResearchExportClient`, `CanonicalEventContext`, scenario
   definitions or `ScenarioController`, `pilotRoute.ts`,
   `stationRegistry.ts`, `SceneRouter`, `src/systems/`,
   `src/scenarios/`, `src/data/`, or `src/utils/reportAccuracy.ts`.
4. **No task-mechanic changes**: same options, same option counts,
   same stage graphs, same one-shot gates, same session-lifetime task
   state, same persistence rules (repair cycles, didRepeat, side-repair
   steps/defer/walk-away, per-item locations/attempts), same route
   outcomes (Final Core gating untouched). The single carried slot
   stays single; the deterministic repair failure stays deterministic;
   the review stage stays the one correction opportunity.
5. **No station/door/spawn coordinate, interaction-radius (72 px),
   layout grid, or collision change.** Task surfaces exist only inside
   the open prompt panel; the world stays spatial — no surface may let
   the participant act on a station they have not walked to (no
   cross-station placement board, no remote fetch).
6. **No gameplay-string changes and no new copy** (§3.4). Byte-pinned
   surfaces (status board, ADV-5) untouchable.
7. **No correctness leakage before the designed feedback moment**: no
   icon, highlight, sound, or animation may signal placement
   correctness before the Inventory review stage, repair-sequence
   validity before the existing failure feedback, claim accuracy at
   any time (the evaluation is silent), or manual/guidance state
   anywhere (Repair's `manualGuided` is never rendered).
8. **Measurement-neutral presentation** per NEXT-07 §4.7, adopted
   verbatim (cyan discipline, no state-dependent salience, no
   colour-only states, no flashing, no praise/blame valence, identical
   presentation for every participant), plus: enrichment must land
   with **equivalent treatment across all four task minigames at the
   unit's end state** — no task may end the unit visibly more
   "game-like" than the others, and no task surface may out-salience
   the scenario consoles' decision moments.
9. **Frozen-stimuli versioning**: `ASSET_SET_VERSION`
   (`src/constants/assets.ts`) is bumped **exactly once**
   (`outpost-assets-v2` → `outpost-assets-v3`) in the final
   verification/documentation commit. No participant research data may
   be collected from intermediate NEXT-08 commits; intermediate
   cross-room asymmetry is acceptable only because of this rule.
   Nothing lands mid-pilot: the completed baseline ships before any
   pilot data collection starts, or between studies.

---

## 6. The four interfaces

Exact pixel layout is implementation detail; the elements, their
information sources, and their activation wiring are contract.

### 6.1 Inventory preparation — graphical place-and-check

- **Bench stage** (Prep Bench, hands free): a bench-tray surface
  renders one icon + existing label ("Torque Driver" etc., with its
  existing destination tag text) per item currently on the bench, in
  registry order. Clicking a tray entry activates that item's existing
  "Take the …" option (§3.2). The existing option cards render below,
  each with its inline item icon. Carrying an item: the "Set the …
  back down" option card carries the item's icon; the tray shows the
  remaining bench items as inert entries.
- **Destination stages** (three bins + kit crate): the surface renders
  the destination's existing station silhouette texture
  (`proc-rack-tools` etc.) with its existing label, plus the carried
  item's icon when one is carried. Clicking the silhouette or the
  carried-item icon activates the existing stow/pack option. "Take the
  … back out" options (correction path) render with their item icons.
  "Keep hold of it." / "Step back." stay plain cards. **No destination
  ever previews whether a placement would be correct** (§5.7) — the
  tag text on the item remains the participant's only guide, exactly
  as today.
- **Console stages**: the checklist stage body (requisition list in
  checklist order) gains item icons beside its existing lines —
  content unchanged. The bench-review stage renders each existing
  issue line with the named item's icon; correction remains "go back
  to the bench and adjust" — the review surface itself is never a
  placement surface (the ONE-correction-opportunity structure and its
  event derivability are untouched). Verify-or-skip and
  restore-vs-leave cleanup stages keep plain cards (stance choices,
  §2) — cleanup presentation stays the existing in-fiction bench text,
  unadorned: bench-clutter visuals are the standing PROP-CLUTTER-SET/
  Q04 open decision (§11) and are not touched here.
- **Legacy options 1-3** and the seal-log scenario station: untouched.
- **Optional drag-and-drop** (own phase, deferrable): within a single
  open prompt only — dragging a tray entry onto its own "Take the …"
  option card (bench stage) or the carried icon onto the destination
  silhouette (destination stage) performs exactly the click activation
  of the same option, on drop, synchronously. Drop anywhere else: no-op, no
  event, item stays put visually. Drag never spans stations, rooms, or
  closed prompts; click-select-and-place remains fully sufficient; the
  instruction line does not change. If any part of drag cannot meet
  §5 exactly, the phase defers entirely (admissibility clause).

### 6.2 Systems Repair — tactile panel

- **Panel stage**: a schematic strip renders a static component/
  sequence-slot graphic (three slot chips + component glyphs — pure
  dressing, identical every visit) and a diagnostic readout that
  re-renders only what the status side panel already shows in text:
  the cycle count line and the awaiting/rejected/logged state line,
  verbatim strings. **It never renders which sequence is loaded,
  whether the manual was consulted, or any cue distinguishing the
  default from the revised sequence beyond the existing option
  labels** (§5.7). Option cards gain glyphs: sequence chip (options 1
  and 3), manual/document (option 2).
- **Manual consultation**: at `758eb7d` both manual surfaces (the
  panel's option 2 and the Repair Manual station) deliver their text
  as feedback toasts, and they **stay toasts** — converting a toast
  into a prompt stage would change prompt-flow structure and timing
  (§5.2), so no document-inset stage exists to build. The manual's
  tactile treatment is therefore limited to the manual/document glyph
  on option 2's card and in the schematic strip; toast text, duration
  and semantics are untouched.
- Submitting, failure/repeat/revision/completion events, didRepeat,
  abandon/return: bit-for-bit as audited in §1.

### 6.3 Side Repair — fetch-fit-check made visible

- **Work-console stages** (accepted task): a step-tracker strip of
  three tiles — labels reuse the side panel's exact step strings
  ("fetch the component", "fit the component", "run the system
  check") — with glyph-differentiated pending/current/done states
  mirroring `stepsCompleted` (state already shown in the side panel;
  never colour-only). The current step's option card carries a
  matching glyph; the defer option stays a plain card (stance).
- **Parts Shelf stage**: the stabiliser-part icon renders beside the
  existing collect option; after fetching, the part icon appears in
  the work-console step strip (carried state is already conveyed by
  existing feedback text).
- **Offer stage** (ignore / accept / defer): plain cards, unchanged —
  the voluntary-effort decision must not be made more attractive by
  presentation (Q07/Q29 opportunity framing).
- Offer-event gating, step events, defer semantics, walk-away
  detection at the door: untouched.

### 6.4 Engineer report — evidence and claim surfaces

- **Report-content stage**: the mode-specific help sentence renders as
  a visually distinct inset — a log-extract treatment in
  evidence-review mode, a plain inset in the other two modes — with
  byte-identical text and byte-identical `__lastPromptBody`
  composition. The four claim cards render in a record-card treatment
  (subtle border/header styling drawn from existing panel language;
  no header caption text — §3.4) with labels verbatim, fixed template
  order. **No fact-grid, tick-mark, or structured decomposition of the
  claims is added**: the comparison work between claims is the Q09
  measurement substance, and presentation must not do it for the
  participant.
- **Mode stage and duty offer stage**: plain cards, unchanged
  (stance/dialogue, §2).
- `engineer_report_accuracy_scored` emission, its metadata, the silent
  identical acknowledgement, and duty chaining: untouched.

---

## 7. Accessibility (hard, every enriched surface)

1. **Full input parity**: every act reachable by pointer (including
   any drag path) is reachable by the existing keyboard model
   (arrows + Enter; hidden 1-9), because every activator is redundant
   over an option (§3.2). Keyboard-only and mouse-only runs of every
   minigame must produce identical event sequences and payloads.
2. **Visible, non-colour-only focus** stays exactly the NEXT-06
   treatment on option cards; task-surface activators never take
   keyboard focus themselves (the cards are the focus order).
3. **Icons never replace text** (§3.4); state tiles are
   glyph-differentiated; no colour-only meaning anywhere.
4. **Readability floor**: existing text sizes unchanged; nothing under
   14 px monospace on new surfaces except reused 12 px label-chip
   styling; enriched panels must stay fully readable at 800×600 FIT in
   a small window.
5. **No timers, no dexterity, no flashing**: no task surface may
   require precision pointing, speed, or sustained input; drag is
   optional redundancy only; effort remains choice-based (steps are
   motorically trivial by design — Side Repair's documented rule
   generalises to all four).

---

## 8. Phased commits

**Structure: up to eight implementation commits (Phases 1-8; seven if
Phase 6 defers) plus one final verification/documentation commit.** Conventional commit style with a
`(NEXT-08 phase N)` suffix. One room per commit except the two
deliberately-isolated shared-file phases (1, 8 — `RoomScene`/foundry
substrate, NEXT-06/07 precedent). The agent proceeds automatically
under the Execution model.

### 8.0 Pre-flight (no commit)

1. Confirm the starting commit contains this contract; create **one**
   isolated worktree and **one** NEXT-08 implementation branch from it
   (§12 git boundary) — unless this contract's own branch is designated
   as the implementation branch at launch.
2. Re-verify every §1 reference (paths, npm scripts, spec files,
   probe names) at the actual base; where reality differs, reality
   governs and the deviation is recorded in the final report.
3. CRLF/formatting discipline: no repo-wide formatter runs, no
   whitespace-only churn; `git diff --check` clean at every commit.

### Phase 1 — substrate: presentation field + icon foundry

- Files: `src/world/RoomScene.ts` (optional `presentation` rendering,
  `__minigameSurface` probe), `src/world/proceduralTextures.ts` +
  manifest (icon families, §3.3), `e2e/proc_textures_determinism.spec.ts`
  (extended coverage), spec support in `e2e/helpers.ts` if needed.
- No scene adopts the field yet: zero visible change on any surface;
  full-suite-green is the phase's proof of structural safety.

### Phase 2 — Inventory click-select-and-place (§6.1, minus drag)

- Files: `src/scenes/InventoryScene.ts`, foundry only if an icon gap
  surfaces, `e2e/inventory_prep_logging.spec.ts` additions (mouse-path
  parity coverage via `__minigameSurface`).

### Phase 3 — Systems Repair tactile panel (§6.2)

- Files: `src/scenes/RepairScene.ts`, `e2e/repair_room_logging.spec.ts`
  additions.

### Phase 4 — Side Repair fetch-fit-check presentation (§6.3)

- Files: `src/scenes/SideRepairScene.ts`,
  `e2e/side_repair_logging.spec.ts` additions.

### Phase 5 — Engineer evidence and claim surfaces (§6.4)

- Files: `src/scenes/EngineerScene.ts`,
  `e2e/engineer_hub_logging.spec.ts` additions.

### Phase 6 — Inventory optional drag-and-drop (deferrable)

- Files: `src/world/RoomScene.ts` and/or `src/scenes/InventoryScene.ts`,
  focused spec additions. Own admissibility clause (§6.1): defers
  entirely rather than shipping any §5 compromise; a deferral here
  does not block Phases 7-8.

### Phase 7 — cross-minigame coherence and accessibility pass

- Files: the four scene files and/or `RoomScene` presentation code
  only. Content: equalise treatment density across the four minigames
  (§5.8), keyboard/mouse parity audit against §7, salience check
  against the scenario consoles, fixes found by reviewers.

### Phase 8 — presentation-contract addendum (docs)

- Files: `docs/game/UI-PRESENTATION-CONTRACT.md` (the §3.6 addendum
  note), the four room docs under `docs/game/rooms/` (presentation
  paragraphs), `docs/game/REUSABLE-MINIGAME-UX-SPEC.md` is **not**
  edited (it lives on another branch).

### Final commit — verification/documentation

- Files: `src/constants/assets.ts` (single bump to
  `outpost-assets-v3`, §5.9), a durable NEXT-08 verification record
  under `docs/game/` (NEXT-07 record precedent). Full suite, manual
  routes (§9), full reviewer set, final report. Any fix a final gate
  forces lands in its own preceding commit; gates then re-run.

---

## 9. Testing and verification expectations

**Per implementation commit, all green before moving on:**

1. `npm.cmd run lint:tsc` and `npm.cmd run build`.
2. `node scripts/validate-traceability-matrix.mjs`.
3. `git diff --check`.
4. Focused Playwright specs: Phase 1 —
   `proc_textures_determinism.spec.ts`, `participant_ui_cards.spec.ts`,
   `connected_world_smoke.spec.ts`; Phase 2/6 —
   `inventory_prep_logging.spec.ts` + `scenario_breach_logging.spec.ts`
   (shared room); Phase 3 — `repair_room_logging.spec.ts`; Phase 4 —
   `side_repair_logging.spec.ts`; Phase 5 —
   `engineer_hub_logging.spec.ts` +
   `scenario_calibration_logging.spec.ts` (shared room); Phases 6-7 —
   the four room specs + `participant_ui_cards.spec.ts` +
   `connected_world_smoke.spec.ts`; Phase 8 — docs only, gates 1-3.
5. `npm.cmd run lint` where the script exists at the base.
   Never add or replace a lint framework or test runner.

**Spec-change discipline**: existing assertions may be _extended_ and
presentation-geometry assertions _updated to track the new layout_;
assertions on event types, order, payloads, `__lastPromptBody` text,
or task state may never be weakened or deleted. New mouse-path
coverage must assert event-sequence equality with the keyboard path.

**Full-suite policy**: the complete suite (103 tests in 34 spec files
at `758eb7d`; use the actual count at the base) runs at Phase 1
(shared-renderer change — broad regression risk) and once more at the
final integrated state; per-room phases run focused specs only.

**Runtime verification**: `playwright-game-verify` evidence per
logical phase; a green build is never runtime evidence. Note the
NEXT-07 finding that the SwiftShader environment is frame-budget
sensitive: task surfaces should prefer pre-generated textures over
per-frame drawing, and any suite flakiness triggers the same
systematic-investigation route NEXT-07 used before any test change.

**Review-agent cadence** (review-only; findings route back per
CLAUDE.md): `gameplay-implementation-reviewer` + `browser-qa-reviewer`
after Phases 1, 2, 3-4 (block), 5, 6, 7; `research-data-reviewer`
after every phase that touches shared `RoomScene` code or a
measurement-adjacent surface (Phases 1, 2, 5, 6, 7 — plus any phase a
reviewer flags); the full three-reviewer set at the final state. A
blocking finding is fix-in-place (new commit, gates re-run) or an
Execution-model stop if the fix would violate §5.

**Telemetry-invariance check** (§10 Route E): after Phase 1, after
Phase 6 (if shipped), and at the final state.

---

## 10. Manual acceptance routes

Visual checks on a production build (`npm.cmd run preview`); event
checks on `npm.cmd run start` (DEV probes +
`window.researchRuntime.getEvents()`). Routes A-D spot-checked as
phases land, performed in full at the final state.

- **Route A — Inventory parity.** Complete the per-item flow twice in
  fresh sessions: once mouse-only (tray/silhouette clicks; drag where
  Phase 6 shipped), once keyboard-only (hidden numerics/arrows).
  Diff `getEvents()`: event types, order, `object_id`s,
  `attempt_number`s identical. Verify: neutral placement feedback,
  no correctness cue before the review stage, review icons match the
  named items, cleanup stage unranked.
- **Route B — Repair honesty.** Default fail → unguided revised fail →
  alternate again (didRepeat vs fresh-fail behaviour per §1) → manual
  → revised success. Verify the schematic never distinguishes
  loaded-sequence or manual state, the diagnostic strip only mirrors
  the side panel's text, and cycle counts match.
- **Route C — Side Repair steps.** Accept → fetch → defer → exit →
  return → fit → check; step tiles track `stepsCompleted` exactly;
  separately: accept → fetch → leave without defer → abandonment pair
  fires once at the door, as at `758eb7d`.
- **Route D — Engineer surfaces.** One full run per mode: extract
  inset only carries the existing mode text; claims verbatim, fixed
  order; acknowledgement identical for accurate and inaccurate claims;
  duty offer renders as plain cards.
- **Route E — telemetry invariance.** Replay the NEXT-07 Route D
  scripted route plus one per-item Inventory placement and one
  Side Repair step against `758eb7d`'s capture: event-type sequence
  and payload keys identical; the only diff is the single
  `asset_set_version` value at the completed baseline.
- **Route F — uniformity and neutrality sweep.** The four scenario
  consoles render byte-identically to `758eb7d` (screenshots); the
  four minigame surfaces show equivalent enrichment density; cyan/
  amber discipline holds; nothing flashes; nothing ranks a choice.

---

## 11. Standing open decisions — untouched

This contract resolves nothing scientific and reopens nothing. It must
not touch: SA-8..SA-11 (including SA-11 — **no requisition/packed-state
display appears on any new surface**), D2-D8, INT-1..6, ADV-5, S1
status-board content, UI-PROGRESS, the Evidence Ledger / scenario
presentation variants (V1-V3), PROP-CLUTTER-SET/Q04 visuals (no
bench-clutter visual of any kind ships in NEXT-08 — §6.1),
audio, minimap, NPC dialogue systems,
the 97-candidate external asset pack (stays `NOT_GENERATED`), diagonal
player frames, and every candidate event/indicator named in the Q-spec
(`inventory_item_corrected`, `readiness_verified`,
`side_repair_abandoned`, `side_repair_returned`, etc. stay unemitted).
A richer repair mechanic in which participants physically assemble
sequences from components — the one plausibly "more tactile" step
beyond §6.2 — would create new choice semantics and new events; it is
**explicitly out of scope** and, if wanted later, is an event-schema /
scoring-plan decision for the research owner, not a presentation pass.
If any phase turns out to require one of these, that is Execution-model
stop condition 1.

---

## 12. Non-goals (this contract will not)

- Generate, download, or claim any external/binary image, font, or
  audio asset; call PixelLab; present procedural art as anything else.
- Add, rename, retime, or re-payload any event; add any new
  participant-facing string; alter any mechanic, mapping, scoring
  boundary, attempt/persistence rule, gate, or route outcome (§5).
- Enrich any choice-card-only surface (§2), any scenario stage, the
  status board, the pause menu, or the Interruption Corridor.
- Move any station/door/spawn; change any radius, grid, or collision.
- Touch `Main.tsx`, Tuxemon assets, `package.json`/lockfile,
  `src/systems/`, `src/scenarios/`, `src/data/`,
  `src/utils/reportAccuracy.ts`, or any byte-pinned string.
- Introduce world-level drag, cross-station placement, timers,
  dexterity demands, or mouse-driven movement.
- Resolve any standing open decision (§11).
- **Git boundary:** one isolated worktree, one NEXT-08 branch, local
  phased commits only; never merge, push, open a PR, rewrite existing
  history, or modify the main checkout.

---

## 13. Completion definition

NEXT-08 is complete when:

1. Phases 1-5, 7, 8 commits (and Phase 6 or its recorded deferral) are
   present on the NEXT-08 branch, plus the final verification/
   documentation commit carrying the single `ASSET_SET_VERSION` bump
   to `outpost-assets-v3`.
2. All per-commit gates passed on every commit; the full suite is
   green at Phase 1 and at the final integrated state; runtime
   verification evidence exists per phase; the full three-reviewer set
   reports no unresolved blocking finding; Routes A-F are accepted.
3. Keyboard-only and mouse-only runs of all four minigames produce
   identical event streams (Route A discipline applied to each).
4. The event stream is byte-compatible with `758eb7d` except the
   single `asset_set_version` value (Route E).
5. The working tree is clean, and the final report lists: phases
   landed, files changed, `proc-icon-*` keys added, spec deltas,
   reviewer outcomes, Route E diff, and every deferral with reasons.

If the sequence stops early under a stop condition, every landed phase
stands alone as a coherent, telemetry-invariant improvement, and the
stop report replaces the final report. Expected end state: a
playthrough in which preparing the kit, repairing the panel, fixing
the stabiliser and reporting to Kai each look and feel like handling
real station objects — and the research pipeline cannot tell the
difference.
