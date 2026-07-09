---
name: psychometric-task-design
description: Use when translating Q01-Q33 questionnaire constructs (BFI/Grit-S-derived organisation, productiveness, responsibility, prudence, persistence, Goal-Time preference, Consistency of Interest) into behavioural game mechanics, mini-games, event names, or derived/scoring variables for Remote Outpost Assessment. Trigger this whenever the user asks "how should we measure Q_", designs a new mini-game meant to stand in for a construct, names a personality/Grit/BFI construct directly, or asks whether a mechanic is a valid behavioural analogue. This is the scientific-validity gate for the project — use it before any construct-to-mechanic decision is finalized.
---

# Psychometric Task Design

You translate validated self-report constructs (Q01-Q33) into behavioural game
tasks without reproducing the questionnaire itself. The game is a **behavioural
analogue layer**, not a questionnaire replacement (build contract, Section 1). The
validated scales stay in Qualtrics; the game produces event-log indicators for
convergent/discriminant validation against them. Read Section 1 (Non-Negotiable
Scientific Position), Section 4 (per-room constructs and validity cautions), and
Section 5 (Q01-Q33 coverage matrix) before proposing any mechanic or variable.

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
   failed action, forcing through a known blocker, reckless continuation past a
   warning) is maladaptive — higher is _worse_, not better (Section 1, rule 6).
   When in doubt which bucket a behaviour belongs in, ask: did the player change
   their approach, or repeat/force it unchanged? Repetition/forcing -> inappropriate.
5. **Label exploratory proxies cautiously, every time they appear:**
   - **Goal-Time Preference / delayed-benefit proxy** — a short game cannot measure
     literal multi-year goal orientation. Any variable here (e.g.
     `delayed_benefit_investment`, `optional_future_benefit_score`,
     `final_stability_gain`) must be documented as optional/exploratory, not a
     direct Goal-Time measure.
   - **Grit-S Consistency of Interest (Q17-Q20)** — treat as partly weak/exploratory
     in a short game. Score **return-to-task and unresolved non-return**, not mere
     task-switching by itself — switching can be rational behaviour. Variables like
     `longitudinal_focus_proxy` must be flagged as weak/exploratory in any doc or
     comment describing them.
6. **Q04 is cleanup/disorder, not planning-before-acting.** Confirm any Q04-linked
   mechanic is about tidying/resolving workspace state, never about a
   planning-ahead mechanic.
7. **Engineer Hub / NPC Report-Back stays high priority and scope-limited.** It
   should add responsibility/dependability coverage (Q09-Q11) without altering the
   persistence scoring model elsewhere.
8. **Confounds are named, not ignored.** For rooms/mechanics with known confounds
   (e.g. Optional Side Repair: completionism/curiosity vs genuine voluntary
   diligence), log the distinguishing events separately (accepted, started,
   deferred, abandoned, completed) rather than collapsing them.

## Forbidden

- Do not use exact or near-exact questionnaire item wording in any player-facing
  text.
- Do not compute a single combined persistence score mixing adaptive and
  inappropriate persistence (Section 6 explicitly forbids this).
- Do not compute one global personality score or one global "good player" score.
- Do not present a Goal-Time or Consistency-of-Interest variable as if it were a
  validated, direct measure — it must carry an exploratory/weak-proxy label
  wherever it's documented or surfaced.
- Do not treat raw time-on-task alone as "effort" or "persistence" — persistence
  must be tied to revision/re-engagement behaviour, not duration.
- Do not design a mechanic whose difficulty depends on reading ability, puzzle
  skill, or motor dexterity in a way that would confound the intended construct
  (see Archive/Repair validity cautions).

## Expected output format

For each construct-to-mechanic design decision, produce:

1. **Construct(s)** — Q-item id(s), name, and room.
2. **Proposed mechanic** — the in-fiction behavioural task, described in terms of
   what the player does, not the underlying construct.
3. **Event names** — exact raw event names this mechanic will log, cross-checked
   against Section 4/5 naming.
4. **Derived variables** — which subindices/proxies this feeds, and their valence
   (higher = better/worse/context-dependent).
5. **Validity notes** — confounds, exploratory/weak-proxy labels, and anything that
   needs a validity caution in the room doc.
6. **Wording check** — explicit confirmation that no player-facing text restates
   questionnaire wording.

Hand off actual implementation to `room-builder`, and logging/scoring
verification to `qualtrics-logging-review`.
