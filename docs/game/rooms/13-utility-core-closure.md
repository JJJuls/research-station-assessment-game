# Utility Deck & Core Chamber — episode 6 (evidence-led pilot v2, Unit 6)

Episode 6, "Utility & Core Closure" (sheet 11 row 6): the **non-scored**
finale — Utility Deck (`src/scenes/UtilityCoreDeckScene.ts`) → Core Chamber
(`src/scenes/CoreChamberScene.ts`). Pure model: `src/pilot/closure/utilityCoreClosure.ts`;
runtime session: `src/pilot/closure/closureSession.ts`; physical feed
overlay: `src/pilot/ui/FeedPanelScene.ts`. **No item window lives here**
(no `proto_*` family, no persistence trial, no score, no trait label).

## Scientific purpose and boundary

- Narrative closure, a physical payoff for the recovery work, a transparent
  data-quality status review, an explicit two-step confirmation and a
  visible station stabilisation.
- Core access depends on **opportunity terminality** in the live SA-13
  register — never on task success, correctness, magnet pulls, solved
  puzzles, recovered setbacks or a particular questionnaire response.
- Every event is `pilot_closure_*` route/closure context carrying
  `non_scored: true` and `closure_context_only: true` (unmapped, no
  canonical context, no study item, no `success` flag).
- No Qualtrics return is performed (future unit); the runtime's debug
  completion (summary/scoring path) is never called; no prior item record
  is mutated after the review (asserted by the route test).

## Readiness model (the Shift Review Panel)

The **explicit two-step record closure** on the Utility Deck is the
readiness step. It is the committed review-closure model of Units 2–5
(`closeEpisodeWindowsAtReview` + `closePilotCoverageAtFinalCore`), moved
from the old core console: never-entered windows record **missing with an
explicit reason**, entered-unfinished windows **censored with an explicit
reason** (`closed_at_review`), obligation/project windows their **completed
observation** (M07 end, M09 check, M10 unfulfilled, M20 presented-not-resumed),
M25 its **presentation record** — never a low value; already-terminal
records are never overwritten.

`deriveRouteReadiness(coverage, context)` is a **read** of the live
coverage: ready ⇔ the route reached `deck_closure` (Work Order Board
sign-off), the review ran, every scheduled opportunity is route-terminal
(completed / missing / invalid / censored / not scheduled / M25 external
pending) and no closure error is outstanding. `pending` and `open` are NOT
terminal; a genuinely open window seals the Core with a neutral location
hint (operational label; MAJ-9 stopping-rule windows M22/M24/M25/M26 are
never named). Participant words: _recorded_, _recorded with limited
evidence_, _not observed_, _technical state recorded_, _questionnaire
handoff: prepared_.

The five closure facts stay distinct (`ClosureContext`): gameplay route
closed · research record closed · research readiness terminal · external
questionnaire pending · Qualtrics completion performed (always `false` in
this unit).

## Utility Deck (25 × 19, utility theme)

| Site                | Tile (px)               | Approach (44 px) | Role                                                               |
| ------------------- | ----------------------- | ---------------- | ------------------------------------------------------------------ |
| Shift Review Panel  | (9, 4.5) → 288, 144     | below (288, 188) | two-step record closure; readiness readout afterwards              |
| Station Systems     | (5.5, 4.5) → 176, 144   | decor            | record OPEN/CLOSED + feeds up                                      |
| Coolant Feed Valve  | (5, 12) → 160, 384      | above (160, 340) | feed 1 — wheel through full travel (drag / hold →)                 |
| Calibration Breaker | (12.5, 12) → 400, 384   | above (400, 340) | feed 2 — lever to placard index 7, then ENGAGE (drag / ↑↓ + ENTER) |
| Distribution Bus    | (20, 12) → 640, 384     | above (640, 340) | feed 3 — coupler tray → rail → socket, SEAT (drag-drop / SPACE, →) |
| Core Feed Manifold  | (17.5, 4.5) → 544, 144  | decor            | three lamps ○/● + text line                                        |
| Core Chamber door   | (12.5, 3.75) → 400, 120 | below (400, 164) | gated: readiness + three feeds; lamp dormant/amber/cyan            |
| Concourse door      | (2, 8.5) → 64, 272      | east (104, 272)  | bidirectional, always open                                         |

Operational order coolant → calibration → distribution is stated by the
placards, the objective line and the feed chips; an out-of-order attempt is
refused neutrally ("Calibration line unpowered — open the coolant feed
valve first."); a feed completes exactly once; partial states persist across
scene transitions (session-scope singleton, like the route state). Floor
conduits from each feed to the alcove light cyan as each feed comes up.

Feed refusals before the closure stage / before the review say where to go
(Work Order Board / Shift Review Panel); they never name an item.

## Core Chamber (25 × 19, core theme)

| Site              | Tile (px)               | Approach (44 px) | Role                                                                      |
| ----------------- | ----------------------- | ---------------- | ------------------------------------------------------------------------- |
| Core              | (12.5, 9.3) → 400, 298  | below (400, 342) | inspect · open the synchronisation review · completion notice when stable |
| Kai               | (18.5, 8) → 592, 256    | below (592, 300) | neutral beat; `plv1-kai` → `plv1-kai-done` on stabilisation               |
| Core status       | (6.5, 8) → 208, 256     | decor            | feeds + Core state text                                                   |
| Utility Deck door | (12.5, 15.5) → 400, 496 | above (400, 456) | bidirectional; sealed only during the 2.4 s ramp                          |

Lifecycle (`CoreLifecycle`): `sealed → accessible → review_open →
confirmation_armed → synchronizing → stable`; every command validates its
source state; `stable` is final for every command. Two distinct actions
are required: ARM (button) then CONFIRM (a separate button; after arming
the keyboard focus sits on STAND DOWN, so a held or repeated ENTER stands
down rather than confirming). ESC while armed stands down and keeps the
review open; ESC again closes it (cancel-before-close). The ramp locks
world input for 2.4 s (300 ms under reduced motion), lights the sight
column and collar lamps, then the neutral completion notice opens; it can
be closed and reopened from the Core; the door, map and inventory keep
working; nothing re-synchronises.

## Route guidance

- `deck_closure`: "Utility Deck — Concourse east door: close the station
  record at the Shift Review Panel." (beacon: the panel)
- `core_stabilise`: "Bring the feeds up in order: coolant valve,
  calibration breaker, distribution bus." (beacon: the next feed, then
  the Core door)
- `core_sync` (flips on chamber entry): "Enter the Core Chamber — north
  door — and confirm synchronisation at the Core." (beacon: the Core)
- `complete`: "Shift complete — the Core is stable." (no beacon)

## Process data rule

Every `pilot_closure_*` event (feed refusals and their reasons, coupler
returns, stand-downs, arm→confirm latencies, door attempts) is non-scored
route/closure context. **This unit excludes all of it from analysis**: it
carries no declared opportunity, no standardised entry state and no
missing-data model, and it is never a proxy for prudence, persistence or
any construct. Whether it may be retained as usability/control data is an
open research-owner decision (report §13.14, OD-4).

## Developer launch

`?scene=utility_core_deck` / `?scene=core_chamber` are developer launches:
readiness rules apply normally (nothing is fabricated; the panel offers only
a return before the sign-off). `&dev_closure=inspect` (DEV build + developer
launch only) enables the visibly labelled inspection bypass: feeds and the
Core work, the record is **never** closed, no `proto_*` event and no
register write occur, and every `pilot_closure_*` event carries
`dev_inspection: true`. A participant boot ignores the parameter.

## Verification

Pure: `e2e/pilot_closure_models.spec.ts` (19). Route:
`e2e/pilot_closure.spec.ts` (3), `e2e/pilot_deck.spec.ts` (1, return_url
→ no navigation). Frames: `e2e/pilot_closure_capture.spec.ts` →
`docs/verification/screenshots-evidence-led-pilot-v2/35-*.png … 47-*.png`.
