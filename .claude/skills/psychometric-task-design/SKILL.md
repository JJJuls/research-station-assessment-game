---
name: psychometric-task-design
description: Use when translating Q01-Q33 questionnaire constructs (BFI/Grit-S-derived organisation, productiveness, responsibility, prudence, persistence, Goal-Time preference, Consistency of Interest) into behavioural game mechanics, mini-games, event names, or derived/scoring variables for Remote Outpost Assessment. Trigger this whenever the user asks "how should we measure Q_", designs a new mini-game meant to stand in for a construct, names a personality/Grit/BFI construct directly, or asks whether a mechanic is a valid behavioural analogue. This is the scientific-validity gate for the project  -  use it before any construct-to-mechanic decision is finalized.
---

# Psychometric Task Design

You translate validated self-report constructs (Q01-Q33) into behavioural game
tasks without reproducing the questionnaire itself. The game is a **behavioural
analogue layer**, not a questionnaire replacement (build contract, Section 1). The
validated scales stay in Qualtrics as a post-game battery; the game produces
event-log indicators for convergent/discriminant validation against them.

## Read first — and know what each source governs

**`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` is the
authoritative behavioural-translation source.** Read the relevant Q-item entry
before proposing any mechanic or variable. It governs the gameplay opportunity,
the player choices, the measurement window, the behavioural reasoning, the
evidential-strength label, the known confounds, and whether the item is
questionnaire-primary or exploratory. Where it conflicts with an older mechanic
rationale (build contract §5, `docs/research/MASTER_33_ALIGNMENT.md`), **it
governs the rationale** — and the conflict becomes a research-owner decision, not
an edit you make.

Then read, for what the specification does _not_ govern:

- Build contract §1 (Non-Negotiable Scientific Position), §4 (per-room constructs
  and validity cautions), §5 (Q01-Q33 coverage matrix) — architecture and the
  older matrix.
- `docs/research/event-schema.md` — the **only** source of approved production
  event names.
- `docs/research/scoring-plan.md` — the **only** source of approved formulas.
- `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` — approved decisions and
  the open queue.

**Approved rationale ≠ approved event ≠ approved formula.** Event names and
derived indicators in the measurement specification are labelled _candidates_
there for a reason: they are design proposals. Never present a candidate as
canonical, and never let a candidate derived indicator function as an approved
scoring formula. When your design needs one, say which decision it needs
(event-schema, scoring-plan, or both) and stop.

**Exact questionnaire wording is for internal traceability only** — matrices,
docs, comments. It must never reach player-facing text. The exact 33-item battery
governs wording, direction and scale membership; you never alter them.

**New scientific ambiguities go to the research owner.** If the specification
does not settle a question, do not guess and do not infer an answer from a
document's modification date. Name the ambiguity, say which authority would have
to settle it, and stop.

## Why this discipline matters

A behavioural task that looks fine at a glance can silently fail as an instrument:
it can leak the questionnaire item, conflate two different constructs, measure
reading/puzzle skill instead of the intended construct, or collapse a nuanced
signal (e.g. persistence) into a single number that erases the difference between
healthy and maladaptive versions of the same behaviour. This skill exists to catch
those failures before they're built, not after.

## Required checks

1. **Trace to Q01-Q33 or label explicitly.** Every mechanic, event name, and
   derived variable must map to a specific Q-item/construct via Section 5, or be
   explicitly labelled as control/usability data (as in the Dock/Arrival Bay).
2. **No item wording leakage.** The mechanic's player-facing text (dialogue,
   terminal prompts, choice labels) must never restate a Q01-Q33 item's wording.
   Design a situational, in-fiction analogue of the behaviour instead.
3. **Keep subindices separate.** Never merge constructs into one score. At minimum
   preserve as distinct: organisation, productiveness, responsibility,
   prudence/carefulness, adaptive persistence, inappropriate persistence, and the
   optional goal-time/delayed-benefit proxy (Section 1, rule 5; Section 6).
4. **Adaptive vs inappropriate persistence are opposite-valence and must never
   share a combined variable.** Adaptive persistence (revision + re-engagement
   after failure) is desirable; inappropriate persistence (repeating the same
   failed action; forcing through an explicitly understood blocker; continuing
   after an explicit utility-stop / no-additional-benefit signal) is maladaptive -
   higher is _worse_, not better (Section 1, rule 6). When in doubt which bucket a
   behaviour belongs in, ask: did the player change their approach, or repeat/force
   it unchanged? Repetition/forcing -> inappropriate. Raw duration alone is neither
   persistence nor effort.
5. **Label exploratory proxies cautiously, every time they appear:**
   - **Goal-Time Preference / delayed-benefit proxy** - a short game cannot measure
     literal multi-year goal orientation. Any variable here (e.g.
     `delayed_benefit_investment`, `optional_future_benefit_score`,
     `final_stability_gain`) must be documented as optional/exploratory, not a
     direct Goal-Time measure.
   - **Grit-S Consistency of Interest (Q17-Q20)** - treat as partly weak/exploratory
     in a short game. Score **return-to-task and unresolved non-return**, not mere
     task-switching by itself - switching can be rational behaviour. Variables like
     `longitudinal_focus_proxy` must be flagged as weak/exploratory in any doc or
     comment describing them.
6. **Q04 is cleanup/disorder, not planning-before-action.** Q04 represents leaving
   a mess or failing to clean up. It must be implemented through explicit cleanup,
   restoration, or workspace-disorder behaviour - never through a
   planning-before-action mechanic.
7. **Engineer Hub / NPC Report-Back stays high priority and scope-limited.** It
   should add responsibility/dependability coverage (Q09-Q11) without altering the
   persistence scoring model elsewhere.
8. **Confounds are named, not ignored.** For rooms/mechanics with known confounds
   (e.g. Optional Side Repair: completionism/curiosity vs genuine voluntary
   diligence), log the distinguishing events separately (accepted, started,
   deferred, abandoned, completed) rather than collapsing them.
9. **Opportunity, choice, process, outcome and control stay distinguishable.** For
   every mechanic, state whether the participant was exposed to a valid,
   comprehensible opportunity; what they chose; the process (order, latency,
   feedback use, revision, return, abandonment, verification); the outcome; and
   which controls separate trait interpretation from navigation skill, reading
   speed, comprehension failure or technical interruption. No-opportunity,
   technical-interruption and comprehension-failure states must remain
   distinguishable from behavioural non-performance.

## Approved per-item treatment (encoded - do not reopen or reinterpret)

These are settled research-owner decisions. Design within them; if a design seems
to require breaking one, that is a signal to stop and ask, not to reinterpret.

- **Q18** (difficulty maintaining focus on projects lasting more than a few
  months) - the game can only provide a **weak goal-continuity proxy** across
  rooms and interruptions. **Questionnaire-primary.** Never describe the game
  variable as direct long-term-focus measurement.
- **Q20** (intense initial interest, later loss of interest) - the optional
  anomaly/project arc may give **very weak start-without-sustain** evidence. The
  game cannot establish "obsession" or actual loss of interest.
  **Questionnaire-primary. No bespoke validated Q20 game score is approved** - do
  not design one.
- **Q27** (continuing when there is no point) - the primary analogue is
  **continuation after an explicit utility-stop / no-additional-benefit signal**.
  The participant must receive clear information that further cycles provide no
  operational benefit; only then is continuation interpretable. **Hazard
  recklessness is not the primary Q27 analogue** - Hazard Control remains
  principally a **prudence/carefulness** situation.
- **Q29 and Q31** - one shared goal-horizon behavioural dimension, not two. The
  approved situation is a balanced choice between a **self-contained objective
  with immediate closure/benefit** and a **distributed objective of comparable
  total effort and value with delayed closure/benefit**. Options must **not** be
  labelled "short-term" or "long-term". The initial choice must be logged **before
  any interruption**. **Never count one choice as two independent behavioural
  observations for Q29 and Q31.** Both stay exploratory.
- **Q30** (preference for small goals / goal granularity) - repeated choices
  between **several independently closable smaller objectives** and **one
  integrated multi-component objective**, with total effort, benefit and
  difficulty approximately balanced. Prefer **at least two valid opportunities**
  before deriving a behavioural pattern. **Never infer Q30 from carelessness,
  skipped preparation, or Hazard behaviour.**
- **Q32** ("most of the goals I work on take years to finish") - **long-term
  oriented; not reverse-scored relative to long-term orientation.** The game can
  only provide a very weak extended-goal engagement proxy. **Questionnaire-primary.
  Do not create a distinct validated Q32 game score, and do not make a direct
  claim on its behalf.**
- **Q33** ("accomplished goals usually take only a few days") - **never inferred
  from rushing the Final Core, poor final quality, or unresolved issues.** Only
  **self-selected** goal-horizon/goal-granularity opportunities may contribute to
  an exploratory end-session portfolio; **required short tasks are not evidence of
  short-goal preference.** **Questionnaire-primary. Do not make a direct claim on
  its behalf.**
- **Q29-Q33 overall** - all remain in the final 33-item battery, and every in-game
  analogue is **exploratory**. Never represent them as measuring literal days,
  years, or lifelong goal patterns. Do not design five repetitive disguised
  questionnaire choices; prefer **shared behavioural dimensions and repeated
  natural choices**.

## Shared modules and non-independence

Shared evidence is shared, not multiplied. The Archive failure-and-revision
module, the Systems Repair difficulty module, the interruption/continuity module,
the optional anomaly arc, the goal-horizon module and the goal-granularity module
each feed several items. Design and document them as **shared evidence**: one
event sequence must never be counted as several independent item observations
(specification §8). Where a confound is known (e.g. completionism vs voluntary
diligence), keep the distinguishing events separate - accepted, started, deferred,
abandoned, returned, completed - rather than collapsing them.

## Forbidden

- Do not use exact or near-exact questionnaire item wording in any player-facing
  text.
- Do not compute a single combined persistence score mixing adaptive and
  inappropriate persistence (Section 6 explicitly forbids this).
- Do not compute one global personality score or one global "good player" score.
- Do not present a Goal-Time or Consistency-of-Interest variable as if it were a
  validated, direct measure - it must carry an exploratory/weak-proxy label
  wherever it's documented or surfaced.
- Do not treat raw time-on-task alone as "effort" or "persistence" - persistence
  must be tied to revision/re-engagement behaviour, not duration.
- Do not design a mechanic whose difficulty depends on reading ability, puzzle
  skill, or motor dexterity in a way that would confound the intended construct
  (see Archive/Repair validity cautions).
- Do not treat a candidate event name or candidate derived indicator from the
  measurement specification as approved. Approval lives in
  `docs/research/event-schema.md` and `docs/research/scoring-plan.md` only.
- Do not count one shared Q29/Q31 goal-horizon choice as two independent
  observations, and do not build a bespoke validated score for Q20, Q32 or Q33.
- Do not resolve a new scientific ambiguity yourself - route it to the research
  owner via `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`.

## Expected output format

For each construct-to-mechanic design decision, produce:

1. **Construct(s)** - Q-item id(s), name, and room.
2. **Approved rationale** - the Q-item's entry in the measurement specification
   this design follows, including its evidential-strength label and whether the
   item is questionnaire-primary or exploratory.
3. **Proposed mechanic** - the in-fiction behavioural task, described in terms of
   what the player does, not the underlying construct.
4. **Event names** - the exact **approved** event names from
   `docs/research/event-schema.md` this mechanic will log. Any name that exists
   only as a candidate must be labelled `CANDIDATE - needs event-schema decision`.
5. **Derived variables** - which **approved** subindices/proxies this feeds
   (`docs/research/scoring-plan.md`) and their valence (higher =
   better/worse/context-dependent). Any new indicator must be labelled
   `CANDIDATE - needs scoring-plan decision`.
6. **Decisions required** - explicitly: none / event-schema / scoring-plan / both.
7. **Validity notes** - confounds, exploratory/weak-proxy labels, shared-module and
   non-independence notes, and anything needing a validity caution in the room doc.
8. **Wording check** - explicit confirmation that no player-facing text restates
   questionnaire wording.

Hand off actual implementation to `room-builder`, and logging/scoring
verification to `qualtrics-logging-review`.
