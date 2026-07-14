# Supervised Usability Test Protocol

Operational protocol for **supervised usability testing** of the participant-
facing game using **synthetic / non-study data only**. Produced by the
participant-experience/accessibility gate
(`docs/ai/OPUS-PARTICIPANT-EXPERIENCE-ACCESSIBILITY-GATE.md`).

> **Scope guard.** This is a usability/technical shakedown, **not** a research
> pilot and **not** data collection. It uses fake identifiers, collects **no**
> study data (the game persists nothing and returns nothing — P0-3/P0-1), and
> requires a moderator present at all times. **This document deliberately
> contains NO consent, ethics, or debriefing language** — those are owned by the
> research team and the ethics process, not by this protocol.

## 1. Purpose

Gather human usability signal on the participant experience — comprehension of
controls, task prompts, navigation, progress, and recovery — and surface any
usability, legibility, input, or browser/device issue **before** the Qualtrics
integration sprint and before any real participant is involved. Specifically
validate the open human-signal items: PXA-3 (transient instructions), PXA-6
(edge door labels), PXA-7 (ESC pause clarity), and general first-run
comprehension.

## 2. Scope

- **In scope**: driving the built connected world (Dock → Hub → the 8 stations →
  Final Core) on a supported browser/device; observing and logging confusion and
  technical issues.
- **Out of scope**: any real participant identifier; any claim about scores or
  personality; any Qualtrics return/export; unsupervised sessions; non-desktop
  devices; non-Chromium browsers.

## 3. Non-study / synthetic-data requirement

- Launch **only** with synthetic identifiers, clearly fake, e.g.
  `?participant_id=USABILITY_T01&game_session_id=usab-2026-07-14-01&condition=pilotA`.
- Never enter a real participant ID, name, email, or any personal data anywhere.
- The game stores nothing and sends nothing; there is no dataset to retain from
  these sessions (see §12).

## 4. Moderator preparation

- Serve the **participant deployment artifact** `npm run bundle` (NOT
  `npm run build` — the latter ships an external script + GitHub ribbon, P1-6).
  Serve it locally (e.g. `vite preview`) or from a trusted static host.
- Confirm the tester machine meets §5; confirm the browser is Chromium-family
  and current.
- Have ready: this protocol, the participant instruction sheet (§7), the
  observation checklist (§8), the two issue forms (§9), and a timer.
- Pre-flight the build: open the game yourself once, confirm it boots to the
  Dock, movement/interaction work, and no console errors appear.
- Prepare a distinct synthetic launch URL per tester.

## 5. Participant (tester) device requirements

- Desktop or laptop; **viewport ≥1280×720** (1024×768 absolute minimum).
- Physical keyboard (required); mouse optional.
- **No phones/tablets/touch-only devices** (no touch controls; text unreadable).
- Adequate lighting and a display the tester can read comfortably.

## 6. Browser requirements

- **Current Chromium-family browser only** (Google Chrome or Microsoft Edge).
- **Do not** use Firefox or Safari/WebKit — unverified (PXA-1); results would be
  uninterpretable and must not be attributed to the game.
- Standalone browser tab, root-hosted, not embedded in another scrolling page.

## 7. Participant instructions (non-leading, read verbatim)

> "You'll be trying out a short computer task set on a research station. Use the
> **arrow keys or WASD** to walk around, **SPACE** to interact when you're next
> to something, and the **number keys** to choose an option when you're asked.
> There are no right or wrong answers and this isn't a test of you — we're
> testing whether the software is clear and easy to use. Please **think aloud**:
> say what you're looking at, what you expect to happen, and anything that
> confuses you. If something seems stuck or broken, just say so. You can stop at
> any time. I can't guide you through the tasks, but I'll help if something
> technical goes wrong."

Do not explain the tasks, hint at "correct" choices, or define in-game terms
(defer/abandon/revisit) beyond what the game shows — comprehension of those is
part of what is being tested.

## 8. Observation checklist (per tester)

Record for each: ☐ = observed, note timestamp + verbatim quote where useful.

- ☐ Understood how to move (without help) / needed help — did they read the 1.6 s
  instruction? (PXA-3)
- ☐ Understood SPACE-to-interact from the proximity prompt.
- ☐ Understood the numbered-choice prompt and "Press N … to choose."
- ☐ Found and understood the Status Board; understood "pending" vs "logged".
- ☐ Navigated Hub → a station → back without getting lost; any edge door label
  confusion (PXA-6).
- ☐ Understood what completing a station meant / whether they could revisit.
- ☐ Understood (or misread) defer vs abandon vs complete.
- ☐ Any moment they thought the game was stuck/frozen (esp. initial load —
  PXA-8).
- ☐ Reaction to an accidental/instructed ESC pause; recovered unaided? (PXA-7)
- ☐ Reached the Final Core / an end point; understood the current end-state
  (note: there is no explicit "finished / return to survey" screen — P0-1).
- ☐ Overall: could they complete the flow unaided? Points of hesitation.

## 9. Issue logging

### 9a. Technical issue form (one row per issue)

| Field                                  | Entry |
| -------------------------------------- | ----- |
| Session / tester ID (synthetic)        |       |
| Timestamp                              |       |
| Browser + version                      |       |
| OS + viewport                          |       |
| What happened (observable)             |       |
| Console/page error (if any)            |       |
| Reproducible? (Y/N/unknown)            |       |
| Screenshot captured?                   |       |
| Suspected severity (P0/P1/P2)          |       |
| Maps to existing finding? (PXA-#/P#-#) |       |

### 9b. Participant-confusion form (one row per confusion)

| Field                                             | Entry |
| ------------------------------------------------- | ----- |
| Session / tester ID (synthetic)                   |       |
| Timestamp + stage (Dock/Hub/room/…)               |       |
| What confused them (verbatim if possible)         |       |
| Did they recover unaided? (Y/N)                   |       |
| Moderator intervention needed? (see §10)          |       |
| Suspected cause (instruction/label/timing/layout) |       |
| Maps to existing finding?                         |       |

## 10. Permitted moderator intervention

- Fix **technical** faults only: relaunch after a crash/reload, correct the
  browser/URL, resolve a machine/display problem.
- Re-read the §7 instructions verbatim **once** if asked how to move/interact.
- Confirm neutral facts already shown on screen (e.g. "yes, use the number
  keys") **without** indicating which option to choose.
- Reassure that there are no right/wrong answers.

## 11. Prohibited moderator intervention

- Do **not** explain, hint at, or evaluate any in-game choice.
- Do **not** define defer/abandon/revisit/complete beyond on-screen text.
- Do **not** tell the tester where to go or what a station "is for".
- Do **not** alter any game text, option, or ordering (scientific content is
  frozen).
- Do **not** enter real identifiers or connect the session to any real study
  record.

## 12. Stopping criteria

Stop the individual session if: the tester asks to stop; a **P0-class** fault
recurs and blocks progress (tester cannot proceed, an unintended selection is
recorded, or the game becomes unresponsive with no recovery); the browser/device
turns out to be unsupported; or the tester shows distress. Stop the **whole
round** and escalate if the same P0-class fault reproduces across ≥2 testers.

## 13. Post-session data cleanup

- Because the game persists nothing and returns nothing, there is **no game
  dataset** to purge. Confirm no real identifier was entered anywhere.
- Close the tab (clears the in-memory session). Clear the browser tab/history if
  a synthetic URL should not linger on a shared machine.
- File the observation checklist and issue forms under the round's evidence
  folder; keep only synthetic identifiers in notes.

## 14. Evidence retention

- Retain: observation checklists, both issue forms, and any screenshots of
  faults (synthetic sessions only).
- Do **not** retain anything tying a note to a real person.
- Store alongside prior gate evidence under `docs/testing/…`; reference issues by
  finding ID so they feed the Max backlog.

## 15. Issue-severity triage

- **P0** — a tester was unable to proceed, recorded an unintended choice,
  unknowingly lost progress, could not perceive an essential instruction, or hit
  a browser/device-dependent behaviour → blocks pilot; escalate immediately.
- **P1** — controlled testing was fine but the issue must be fixed/bounded before
  _unsupervised_ pilot use (e.g. transient instructions PXA-3, loading indicator
  PXA-8).
- **P2** — clarity/convenience/hardening (e.g. edge labels PXA-6, ESC overlay
  PXA-7) that does not threaten task completion.

## 16. Readiness exit criteria (for this round)

The supervised usability round is "clean enough" to inform the next steps when:
testers complete the flow unaided on the supported environment; no **new
P0-class** usability fault reproduces; open P1s (PXA-3, PXA-8) have concrete
human evidence to guide the Max fixes; and every logged issue maps to a finding
ID for the backlog. This round does **not** by itself clear the pilot gate — the
data-pipeline P0 cluster and the owner rulings (PXA-X1/PXA-X2) remain
prerequisites for any real participant.
