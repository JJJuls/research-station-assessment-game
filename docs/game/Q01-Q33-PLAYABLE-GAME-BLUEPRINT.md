# Q01-Q33 Playable Game Blueprint — Remote Outpost Assessment

Canonical implementation blueprint and contract index for turning the
existing eight-room assessment foundation into a coherent, professionally
playable research game, with every proposed element derived from the
Q01-Q33 requirements or explicitly classified as non-scored.

Status: documentation only. Branch `fable-q01-q33-playable-blueprint-v1`
(isolated worktree), base `bfca741`, date 2026-07-17. Nothing here changes
code, tests, event schema, scoring, Supabase, Qualtrics, or resolves any
open decision (SA-1..SA-7, D2-D8, INT-1..INT-6 all remain research-owner
owned).

## 0. Document set

| Doc                                             | Content                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| This file                                       | Identity, flow, NPC architecture, gathering policy, ethical-scenario separation, timed route |
| `Q01-Q33-CURRENT-STATE-GAP-AUDIT.md`            | Current-state audit at `bfca741`                                                             |
| `Q01-Q33-REQUIREMENTS-TRACEABILITY-MATRIX.md`   | 33-item traceability rows                                                                    |
| `CANONICAL-ROOM-AND-MINIGAME-CONTRACTS.md`      | Per-module contracts incl. shared modules                                                    |
| `PLAYABLE-FOUNDATION-SYSTEMS-SPEC.md`           | Minimum connected-game systems                                                               |
| `GAME-SYSTEM-ADMISSION-AND-EXCLUSION-MATRIX.md` | Feature admission/exclusion                                                                  |
| `Q01-Q33-EVENT-AND-DATA-CONTRACT.md`            | Event classes, payload, versioning, scoring architecture                                     |
| `Q01-Q33-IMPLEMENTATION-ROADMAP.md`             | Stages 0-5                                                                                   |
| `q01-q33-feature-traceability.json`             | Machine-readable mappings                                                                    |
| `FABLE-NEXT-01..05` (repo root)                 | Implementation-ready task pack                                                               |

## 1. Canonical game identity

The game IS: a connected 2D top-down Remote Research Outpost (Phaser 3 +
TypeScript + Vite), room-based and controlled, professionally playable
rather than a disguised survey, ~14-18 minutes for the research route
(subject to usability testing), event-sequence instrumented,
Qualtrics-compatible, expandable later but scientifically frozen during
data collection.

The game is NOT: a Stardew clone, an open-world life sim, a fishing game,
a combat game, a farming sim, a shop/currency economy, a collectathon, or
a replacement for the existing research runtime
(EventLogger/SessionState/QualtricsBridge/DataQualityTracker/
ScoringManager/ResearchRuntime are extended, never discarded).

The Stardew/Fable reference is a production-method and
interaction-richness reference only — placeholder-first mechanics,
room-by-room passes, real object interactions — never a feature checklist.

Non-negotiable scientific rules (restated; authority:
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`): behavioural
analogue layer, not questionnaire replacement; validated items stay in
Qualtrics; no wording leakage; every element traces to Q01-Q33 or is
explicitly classified control/usability/engagement-only/optional/excluded;
an event is not an item score; no invented weights/thresholds/formulas; no
global score; seven separate domains (organisation, productiveness,
responsibility, prudence, adaptive persistence, inappropriate persistence
[maladaptive-positive], exploratory goal-time); Q04 = cleanup; Q18/Q20
questionnaire-primary; Q29-Q33 exploratory; Q29/Q31 one dimension; Q32
questionnaire-primary and long-term-oriented; no "more time = more
persistence"; opportunity/comprehension/accessibility/technical states
distinguishable from non-performance; Dock = control only; the four
ethical scenarios stay a separate exploratory layer.

## 2. Canonical assessment-world flow (verified)

The V3 flow is confirmed against the current tree — all ten areas exist
and are connected (gap audit §2):

Dock/Arrival → Station Hub → {Archive, Systems Repair, Engineer Hub,
Inventory/Prep, Hazard Control, Optional Side Repair, Interruption
Corridor} → Final Core.

Module roles are preserved exactly as the blueprint task states them
(Dock controls-only; Archive failure/revision; Repair difficulty
persistence; Engineer report-back/responsibility; Inventory organisation +
cleanup (+ goal granularity once SA-4 lands); Hazard prudence; Side Repair
optional work + anomaly arc; Corridor interruption/return; Final Core
integration/portfolio). The Station Hub organises objectives, routing,
NPC encounters and scenario placement, and remains control-only — it never
replaces a measurement module, and no ScoringManager formula may reference
a hub event (schema rule).

Recommended canonical route order (research route; free movement stays
legal, the duty-roster HUD directs):

Dock → Hub → Engineer Hub (report + duty + [HOR choice, post-SA-3]) →
Systems Repair → Archive → Inventory/Prep ([GRA choice #1, post-SA-4]) →
Hazard Control → Interruption Corridor (interruption of a genuinely
started/pending objective) → Optional Side Repair (discovery/offer stay
in-bay, preserving `side_repair_discovered` semantics; deferrable and
resumable; utility-stop stage post-SA-2) → Final Core. Directing the
duty-roster HUD along this order is a scheduled config unit (roadmap
Stage 3.8) — today the route table directs only the pilot-scenario stops.

Rationale: the duty and any horizon choice must exist **before** the
corridor (initial choice pre-interruption, closed decision); the corridor
needs a genuinely unfinished objective to interrupt; Side Repair must be
deferrable/resumable to express deferment vs abandonment; Final Core last.

## 3. System admission summary

Every proposed system is classified in
`GAME-SYSTEM-ADMISSION-AND-EXCLUSION-MATRIX.md` as one of
`MANDATORY_RESEARCH`, `MANDATORY_PLAYABLE_FOUNDATION`,
`OPTIONAL_POST_PILOT`, `CONTROL_OR_USABILITY`, `ENGAGEMENT_ONLY_UNSCORED`,
`EXCLUDED`, with purpose, Q mapping or non-scored class, contamination
safeguards and dependency stated. Headline: item inspection, contextual
item registry, kit preparation, labelled bins, checklists,
cleanup/restoration, repair tools/components, manuals/logs, NPC
report-back, accepted-duty follow-through, controlled interruptions,
warning inspection and optional side-task progression are admitted;
fishing, farming, combat, weapons, currency, shops/trading, romance,
social schedules, open-world exploration, unrelated collectables,
procedural filler and unjustified rarity are excluded.

## 4. NPC architecture

Only NPCs needed for orientation, task delivery, report-back,
interruption, warning/context, consequence, or neutral feedback. **No
relationship systems; NPC approval is never scored; dialogue is neutral
before decisions and factual after actions.** All dialogue is
placeholder-text now, PixelLab-visual later (Stage 4, gated).

| NPC/system                       | Room                  | Function                                                        | Task relationship                        | Pre-decision neutrality / post-action feedback                                         | Events (approved)   | Research risks                                                  | Asset needs (Stage 4)                             |
| -------------------------------- | --------------------- | --------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Station AI (arrival terminal)    | Dock                  | Orientation, tutorial, check-in                                 | Tutorial only (controls)                 | Neutral instructions; no evaluation                                                    | dock family         | None (control-only)                                             | Terminal sprite, portrait optional                |
| Status Board / duty-roster HUD   | Hub + global          | Objective routing, progress display                             | Displays state; assigns nothing          | Factual state only; allowed progress UI (checklist/status labels, no scores)           | hub family          | Must never leak scores or moralise                              | Board sprite                                      |
| Archive AI                       | Archive               | Failure feedback, information source                            | ARC module owner                         | Feedback factual, learnable; never scolding                                            | archive family      | Feedback wording must not moralise persistence                  | Terminal sprite                                   |
| Repair Manual / diagnostic panel | Systems Repair        | Difficult-information source                                    | REP module support                       | Manual factual                                                                         | repair family       | Reading-skill confound — concise text                           | Panel + manual sprites                            |
| **Engineer Kai** (named NPC)     | Engineer Hub          | Report request, duty assignment, later follow-through           | Q09/Q10 owner; duty source for Q18 proxy | Requests neutral; accepts decline without penalty; post-report factual acknowledgement | engineer family     | Social-desirability pressure — options never moral labels       | Character sprite + portrait (visual pack backlog) |
| **Quartermaster**                | Inventory/Prep        | Kit requirements, checklist source; (GRA choice host post-SA-4) | Q01-Q04 room owner                       | States requirements only                                                               | inventory family    | Label ambiguity; never comments on tidiness choices before exit | Character or console sprite                       |
| Hazard terminal                  | Hazard Control        | Warning + detail provision                                      | Q12 owner                                | Warning factual, risk framed neutrally (never fear)                                    | hazard family       | Framing bias                                                    | Terminal + signage                                |
| Utility Bot                      | Side Repair           | Optional-task offer, defer handling                             | OPT arc owner (Q07/Q16/Q20-weak)         | Offer states utility honestly; defer/decline respected without comment                 | side_repair family  | Curiosity/completionism confound — utility explicit             | Small bot sprite                                  |
| Comms AI (beacon)                | Interruption Corridor | Controlled interruption delivery                                | INT module owner                         | Competing offer balanced (not urgent/better by default)                                | interruption family | Offer balance is a validity requirement — metadata logs framing | Beacon sprite                                     |
| Core Interface AI                | Final Core            | Issue review, consequence display, closure                      | Q11/Q28 owner                            | Lists issues factually; forcing allowed without lecture; consequences shown neutrally  | final_core family   | Never a "final judgement" voice — no global evaluation          | Core interface sprite                             |

Ethical-scenario stations (allocation console, calibration bench,
reconciliation desk, seal log) remain separate pilot-layer interactables
with their own governance (§7).

## 5. Context-appropriate gathering and collection

Evaluation: a small amount of object gathering materially supports
canonical tasks and the connected-game feel; anything beyond that is
rejected. Admitted loops (each = opportunity, tool/interaction, item,
inventory use, consequence, telemetry, risk, placement):

1. **Repair components for Systems Repair / Side Repair steps**
   (MANDATORY_PLAYABLE_FOUNDATION for the multi-step arcs): fetch a
   component from a parts shelf and install it as one of the real steps.
   Q mapping: Q07/Q14/Q16 effort-step substrate. Items: 1-3 named
   components; held in the contextual item registry; consequence: step
   completion. Telemetry: existing step/`*_step_completed` events; no new
   names required for Side Repair (`side_repair_step_completed`
   schema-listed); Systems Repair step events would be CANDIDATES.
   Risk: dexterity/navigation confound — trivial walk, no timing.
2. **Labelled supplies for Inventory/Prep** (MANDATORY_RESEARCH): the
   per-item sort/placement mini-game IS a gathering-and-placing loop.
   Q01-Q03; approved events exist. Risk: label clarity (safeguarded).
3. **Records/data modules for Archive** (already present): log-shelf
   comparison (`archive_log_compared`) is the information-gathering act
   supporting Q22. No new items.
4. **Maintenance part for the accepted relay duty** (OPTIONAL_POST_PILOT,
   CANDIDATE events): making Q10's duty completion a physical
   fetch-and-fit act would strengthen the observed follow-through, but
   needs event-schema additions — flagged, not scheduled.
5. **Anomaly scanning/classification** (OPTIONAL_POST_PILOT, blocked):
   only as part of the Q20 staged anomaly arc, whose events are
   CANDIDATES; do not build ahead of the decision.
6. **Environmental/biological sample collection** (EXCLUDED for pilot):
   no canonical task requires it; admitting it would add untraceable
   collection gameplay. Reconsider post-pilot only with a research-owner
   mapping.

Rejected: decorative collectables, resource grinding, randomised drops,
rarity tiers, any loop copied from a reference game without a canonical
requirement.

## 6. Ethical-scenario separation (audit + decision)

The four scenarios (`priority_allocation` Hub, `calibration_anomaly`
Engineer Hub, `incident_reconciliation` Archive, `protocol_breach`
Inventory) are an independent exploratory ethical-behaviour layer:
configuration-driven ScenarioController, full raw telemetry
(`scenario_*` + `final_core_blocked_pending_decisions`), all events
unmapped (no `study_item_ids`, no `construct_id`), absent from
ScoringManager, never Q-mapped, never wording-leaking.

Findings and positions (decisions stay with the research owner):

1. **Independent experimental status — KEEP.** No `scenario_*` event may
   be used as Q01-Q33 evidence; thematic similarity (e.g. breach-reporting
   ↔ responsibility) is explicitly insufficient for mapping. Any
   promotion goes through event-schema/scoring-plan rulings.
2. **Priming/interference risk — REAL, UNRESOLVED.** Scenario C/D share
   rooms with the Archive code task and the Inventory kit task; whether
   scenario play before a canonical task shifts behaviour on it is a
   study-design question already flagged in
   `PILOT-FOUR-SCENARIO-ROUTE.md`. Mitigation options for the owner:
   (a) scenarios after the canonical route (post-Final-Core block), (b)
   separate session/arm, (c) counterbalanced ordering as an explicit
   condition. Recommendation: for any pilot that analyses Q01-Q33 game
   analogues, place scenarios **after** canonical modules or in a
   separate arm; the current interleaved route is acceptable only for
   ethics-layer-focused pilots.
3. **Timing conflict — MUST BE RULED.** The scenario layer alone runs
   ~8-12 min; the canonical Q01-Q33 route budget is ~14-18 min. Both in
   one session ≈ 22-30 min, exceeding the canonical budget. Options:
   separate arms/sessions; a reduced scenario subset; or an extended
   combined-session budget approved by the owner. Do not meet timing by
   deleting required Q opportunities (rule).
4. **Per-scenario disposition (recommendation only):** all four RETAIN as
   implemented (telemetry-complete, isolation-tested); none needs
   revision for the ethics layer itself; MOVE (route position) per item 2;
   DEFER only if the owner rules the combined session too long.
5. **Route-gate note:** the Final Core scenario-completion gate is pilot
   plumbing for the ethics layer. If a canonical-route pilot runs without
   scenarios, the gate must be configuration-disabled for that arm —
   listed as a Stage 3 config task, not a science decision.

## 7. Timed route and participant burden (14-18 min target)

Per-module budget (designed exposure from the tier-2 spec §1.4; estimates
for first-time participants; transitions measured from the connected
world):

| Module                | Designed exposure                 | Min valid exposure  | First-time estimate                                 | Optional/deferred                                          | Fatigue note            |
| --------------------- | --------------------------------- | ------------------- | --------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| Dock                  | 1-2 min                           | 0.5 min (skip path) | 1.5 min                                             | practice optional                                          | lowest load, opener     |
| Hub transit (total)   | —                                 | —                   | 1-1.5 min                                           | —                                                          | trivial                 |
| Engineer Hub          | 1-1.5 min (+follow-through later) | 45 s                | 1.5 min                                             | clarification optional                                     | low                     |
| Systems Repair        | 1.5-2.5 min                       | 1 min               | 2 min                                               | manual optional                                            | medium                  |
| Archive               | 1.5-2.5 min                       | 1 min               | 2 min                                               | log comparison optional                                    | medium                  |
| Inventory/Prep        | 1.5-2.5 min                       | 1 min               | 2.5 min (per-item game)                             | verification/cleanup are the measures, not optional extras | medium-high (placement) |
| Hazard Control        | 1-1.5 min                         | 30 s                | 1 min                                               | detail inspection is the measure                           | low                     |
| Interruption Corridor | embedded 1-2 min                  | 45 s                | 1.5 min                                             | —                                                          | low                     |
| Optional Side Repair  | 1.5-3 min, optional/distributed   | 0 (declinable)      | 2 min if taken                                      | entirely optional (that is the point)                      | medium                  |
| Final Core            | 1.5-2.5 min                       | 1 min               | 2 min                                               | resolution paths optional                                  | low-medium              |
| **Total**             |                                   | **~8 min floor**    | **~15-17.5 min with side repair; ~13-15.5 without** |                                                            |                         |

Timing interpretation rules: task clocks start at objective-presented +
control-restored; latency is primary only for initiation (Q05, blocked
D7); no universal more-time-more-persistence rule; module timings are
calibration data for the pilot, not scores. Optional gameplay placement:
the Side Repair bay stays reachable throughout and its task deferrable/
resumable (offer semantics stay in-bay), so declining or deferring never
blocks the route; post-SA modules (HOR/GRA/utility-stop)
add ~1-2 min total and fit inside the 18-min ceiling by consuming part of
the Inventory/Engineer budgets (re-time at pilot). Ethical scenarios are
NOT in this budget (§6 item 3).

## 8. What this blueprint does not do

- It approves no candidate event name, no formula, no weight, no
  threshold, no SA/D/INT resolution.
- It does not schedule blocked work ahead of its decisions (roadmap gates
  every such unit).
- It adds no player-facing text containing questionnaire wording; the
  situation descriptions in the contracts are in-fiction analogues.

## 9. First implementation task after pilot route repair

`FABLE-NEXT-01-CANONICAL-COVERAGE-GAP.md` (verification + low-risk
coverage closure), immediately followed by
`FABLE-NEXT-02-INVENTORY-PREP-Q01-Q04.md` (the highest-value unblocked
measurement substrate). Rationale in the roadmap Stage 1.
