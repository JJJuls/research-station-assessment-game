# Canonical UI / Minigame Presentation Contract (FABLE-NEXT-06)

Phase 1 deliverable of `FABLE-NEXT-06-UNIFIED-PARTICIPANT-UI-MINIGAME-PRESENTATION.md`:
the audit of every participant-facing number-choice surface, the shared UI
primitives, the retained hidden numeric mappings, and the conversion
boundaries. This is a **presentation contract** — it changes no event
identifier, no payload, no mapping, no scoring rule, no task outcome, no
SessionState semantics.

## 1. Audit — participant-facing number-choice surfaces (canonical route)

Every number-choice interaction on the canonical route flows through **one
renderer**: `RoomScene.renderPromptStage` (`src/world/RoomScene.ts`) — the
U3 prompt panel (numbered option list + "Press 1..N to choose."). Surfaces:

| Room / surface                                     | Interaction stages (all via renderPromptStage)                                 | Emission points (unchanged by NEXT-06)                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Dock — arrival terminal                            | tutorial choice (skip / review / practice)                                     | events at prompt open (`onPromptOpened`) + option selection (`getEventTypes`) |
| Station Hub — Scenario B console                   | scenario stage chain (briefing → options → commit)                             | scenario framework logs per stage/selection                                   |
| Station Hub — status board                         | view-only text panel (Space to open; no options)                               | `station_hub_status_board_viewed` at open                                     |
| Archive — access terminal                          | code entry choices, feedback, revision; Scenario C desk                        | selection-time events incl. attempt counters                                  |
| Systems Repair — panel                             | sequence cycle options, manual, revision, defer                                | selection-time events with `attempt_number`                                   |
| Engineer Hub — Kai console                         | mode → report content (NEXT-04) → duty offer                                   | open + selection events; accuracy event in content `onSelected`               |
| Engineer Hub — calibration bench                   | Scenario A stage chain                                                         | scenario framework                                                            |
| Inventory / Prep — console                         | legacy options 1-3 + per-item option 4 flow (NEXT-02), review, verify, cleanup | per-item selection events, `missing_item`, cleanup events                     |
| Inventory / Prep — bins/crate/bench/seal log       | per-item place/inspect stages; Scenario D seal log                             | selection-time events                                                         |
| Hazard Control — console                           | info / continue / avoid options                                                | selection-time events (+ open `hazard_warning_seen`)                          |
| Side Repair Bay — utility bot/shelf                | offer (ignore/accept/defer), multi-step fetch/fit/check (NEXT-03)              | selection-time events with steps/cycles                                       |
| Interruption Corridor — beacon/checkpoint/junction | legacy 3 options; check-in chain; competing task chain (NEXT-05)               | open + selection events per the NEXT-05 binding table                         |
| Final Core — interface                             | route-gate lock stage; completion options 1-4                                  | open flags + selection-time closure events                                    |

**Off the canonical route (NOT converted, documented):**

- `src/scenes/Main.tsx` (`?scene=prototype`) — the preserved legacy
  prototype scene. Dev-only launch alias; participants never reach it on
  the canonical route (default start is the Dock). Its `showMpsPrompt`
  number UI is preserved verbatim under the audit-first rule.
- `src/scenes/Menu.tsx` — the ESC pause menu (resume-only). It is the
  **documented back behaviour** for every prompt (see §4).

## 2. Shared primitives (Phase 2)

One conversion point converts every surface: `renderPromptStage` becomes a
**visual choice-card panel** (mouse + keyboard), and the numbered text list
plus "Press 1..N to choose." ceases to be the primary interaction.

- **Panel shell** — slate panel (`#101820` base kept), title (interaction
  label), body text (in-fiction stage body, unchanged strings).
- **Choice cards** — one card per option: bordered card with wrapped label
  text and a small index badge. Mouse: hover focuses, click activates.
  Keyboard: Arrow Up/Down move focus, Enter activates. Focus state is
  **visible and non-colour-only**: thicker cyan border + a `▸` focus
  marker glyph (Polar Meridian: cyan = interactable affordance).
- **Instruction line** — "Select an option — point and click, or use the
  arrow keys and Enter." (replaces the number instruction).
- **Player freeze** — the avatar no longer moves while a prompt is open
  (arrow keys belong to card focus; presentation-only, no event/task-state
  impact — selection remains the only way a prompt closes).
- **Hidden numeric shortcuts** — keys 1-9 keep selecting options exactly
  as before, undisplayed: deterministic automated-test hooks and an
  accessibility/dev fallback. Both input paths converge on the single
  `selectPromptOption` handler, so **no duplicate events are possible**.
- **Semantic test hook** — DEV-only `window.__promptCards`
  (`[{ index, label, x, y, width, height }]`, screen coordinates) so
  mouse-path tests click real card rects without pixel guessing.
  Researcher-only language never appears in it (labels are participant
  text).
- **Status side panel** (Phases 3-5) — a compact, always-visible room
  state panel primitive (checklist rows / current-step / slot lines) used
  by Inventory (carried slot + bench contents; the mandated requisition
  display is SA-11 — a live packed-state list would pre-empt the
  checklist-consultation and verify-vs-skip measurements, so nothing is
  shown until the research owner rules),
  Repair (cycle count — deliberately NOT manual/guidance state, which
  would nudge and confound manual-use measurement), Side Repair
  (current-step indicator), Engineer (one-shot report state; duty outcome
  only after the offer was decided — no pending reminders), Hazard
  (valence-neutral route state: continued/rerouted, never
  informed/reckless), and Final Core (synchronization state only — the
  outstanding-flag list stays exclusive to the interface's blocker
  display so the panel never pre-empts the "review status" choice).
  Read-only rendering of existing SessionState / room task state; never a
  new input surface, never a score display.
  **The Interruption Corridor deliberately has NO status side panel**:
  (a) its 768px-wide map leaves no viewport margin, and (b) a persistent
  corridor panel would act as a pending-original reminder cue and alter
  the return-to-task measurement environment (same reasoning as the
  skipped duty-roster competing-task label). Corridor state is conveyed
  by the three station labels and the in-fiction prompt bodies only.

## 3. Retained numeric mappings (hidden)

All existing numeric key mappings (1-9) remain functional on every prompt
stage as **hidden developer/test/accessibility shortcuts**. They are not
shown in any participant instruction. Existing Playwright suites that
drive `press(page, 'N')` therefore remain valid behavioural paths
(explicitly allowed by the task file).

## 4. Boundaries — what is deliberately NOT changed

- **No Escape-dismiss on assessment prompts.** Several prompts emit events
  at open (`interruption_received`, `engineer_report_opened`,
  `final_core_blocker_shown`, …). A dismiss control would create
  opened-but-undecided states that cannot exist today — a task-state /
  event-timing change, which NEXT-06 forbids. ESC continues to open the
  pause menu (documented back behaviour); selection remains the only way a
  prompt closes.
- **No new events for hover/focus/panel-open.** Mere UI actions never log.
- **No text changes** to stage bodies, option labels, or feedback strings
  (only the instruction line and the panel's visual form change).
- **No drag-and-drop requirement** anywhere; click-select-and-place is the
  model (drag was not introduced at all).
- **No timers, no flashing, no time-critical interaction.**
- **`Main.tsx` prototype surface untouched** (off-route, dev-only).

## 5. Surfaces that cannot be converted without measurement change

One identified post-review: the task-mandated **Inventory requisition
checklist display** cannot show live packed state without changing the
measurement environment (SA-11 — research-owner ruling requested; the
shipped panel conservatively omits it). All other conversions: Every canonical surface is a selection among discrete
options whose semantics live in the selection handler, not the input
device. No conversion requires a new event identifier, a changed observed
moment, a scoring change, or a changed task outcome — **no operator stop
condition is triggered**.

## 6. Phased commits (per the task file)

1. Phase 1 — this contract (docs).
2. Phase 2 — shared primitives (`renderPromptStage` card panel + hooks).
3. Phase 3 — Inventory presentation (status side panel: carried slot +
   bench contents; requisition display withheld pending SA-11) +
   complete Inventory suite.
4. Phase 4 — Repair / Side Repair / Engineer presentation (current-step
   and report-state panels) + suites.
5. Phase 5 — Hazard / Interruption / Final Core presentation (status
   panels) + suites.
6. Phase 6 — coherence pass + full verification battery.

## 7. Candidate future asset replacements

Card textures, NPC portraits (Kai), station props and icons remain
**candidates** in the unapproved asset pack (`fable-canonical-asset-production-v1`);
this pass uses Phaser graphics primitives and the committed placeholder
style only. No PixelLab call, no fabricated provenance.

## 8. FABLE-NEXT-08 addendum (stage-surface presentation pass)

Recorded per NEXT-08 contract §3.6. Within the presentation domain only,
two §4 boundary statements above are consciously amended by the NEXT-08
unit (`FABLE-NEXT-08-RICH-MINIGAME-INTERFACES.md`); the §4 wording itself
stays as history.

1. **Drag-and-drop.** Drag remains **never required**. NEXT-08 §6.1
   authorised an _optional, redundant_ drag path in the Inventory
   minigame under the §5 telemetry invariants, with click-select-and-
   place staying the primary and complete model. That optional phase was
   **deferred in full under its own admissibility clause**: the specified
   bench drag source (a separate hands-free bench tray) was cut by the
   measured §7.4 readability adaptation, and adding drag to the existing
   pointerdown-synchronous activators would have altered selection-timing
   semantics (§5.2). No drag shipped; the §4 statement remains true of
   the shipped game.
2. **One renderer.** The one-renderer principle is preserved:
   `renderPromptStage` remains the single prompt renderer, now carrying
   an **optional, additive `PromptStage.presentation` layer** (NEXT-08
   §3.1) used by the four task minigames — task surfaces between header
   and cards, inline option icons, record-card and inset treatments, and
   a 560-640 px width clamp. Stages without a presentation render
   byte-for-byte as before. Every interactive surface element is a
   redundant activator of an existing option index converging on
   `selectPromptOption` (§3.2); hidden numeric shortcuts, arrows + Enter
   and card clicks work identically on every enriched stage, and the
   additive DEV probe `window.__minigameSurface` mirrors `__promptCards`.

Everything else in this contract is unchanged by NEXT-08: Escape-dismiss
stays absent, hover/focus/panel-open still never log, status side panels
stay read-only with their deliberate omissions (Repair's hidden manual
state; Inventory's SA-11 withholding; the Corridor's no-panel rule), the
choice-card-only surfaces (scenario consoles, status board, Corridor,
Final Core, duty offers) keep the unenriched NEXT-06 card panel, and no
gameplay string changed.
