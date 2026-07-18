# FABLE-NEXT-06 — Unified Participant UI and Minigame Presentation

## Purpose

Replace participant-facing typed-number interaction scaffolds with a coherent visual interaction layer across the canonical Remote Outpost assessment, while preserving the validated gameplay logic, telemetry, research mappings, persistence, and route behaviour established in FABLE-NEXT-02 through FABLE-NEXT-05.

This unit is a presentation and interaction-refinement pass. It must not redefine the psychological assessment, event model, scoring model, task outcomes, or questionnaire mappings.

## Starting point

Run only after FABLE-NEXT-04 and FABLE-NEXT-05 are complete, committed, verified, and free of blocking research-validity findings.

Branch from the sequential implementation tip containing:

- NEXT-02 Inventory and Preparation
- NEXT-03 Systems Repair and Side Repair persistence
- NEXT-04 Engineer Report-Back
- NEXT-05 Hazard, Interruption, and Final Core

Use the current canonical blueprint, room contracts, minigame contracts, event schema, traceability matrix, asset prompt pack, and the Polar Meridian visual direction as binding references.

## Primary objectives

### A. Shared participant UI framework

Create a reusable participant-facing interaction framework suitable for Phaser scenes. It should support:

- visual modal or panel surfaces;
- mouse selection;
- keyboard navigation;
- confirm, cancel, and back actions;
- visible focus state;
- concise contextual instructions;
- responsive layout within the supported game viewport;
- deterministic test hooks that do not expose researcher-only language to participants.

Prefer shared components and helpers over scene-specific duplicated UI.

Do not introduce a separate web application, external UI framework, or state-management dependency unless the repository already uses it and the change is clearly justified.

### B. Inventory and Preparation visual interface

Replace the participant-facing requirement to type numbered choices with a visual preparation interface containing, at minimum:

- requisition checklist;
- visible item grid or bench contents;
- one carried-item slot;
- labelled destination areas or destination cards;
- kit-crate contents;
- inspect, carry, place, return, review, verify, and cleanup actions;
- clear neutral indication of the current interaction target;
- review and correction flow;
- restore-versus-leave cleanup choice.

The visual interaction must continue to use the existing per-item state model and existing approved events.

Do not add a generic backpack, equipment statistics, rarity, crafting, weight limits, currency, shops, loot, or unrelated collection mechanics.

### C. Systems Repair and Side Repair presentation

Replace typed-number participant choices with visual task controls appropriate to the existing mechanics, such as:

- sequence or step cards;
- component slots;
- manual or evidence panel;
- attempt/revision controls;
- defer and resume controls;
- system-check control;
- current-step indicator.

Do not change the approved sequence logic, success requirements, failure logic, attempt numbering, abandonment semantics, or persistence model.

### D. Engineer Report-Back presentation

Present the Engineer interaction as an NPC-centred report-back interface using:

- dialogue or report cards;
- evidence-review panel;
- preparation state;
- clarification action where already approved;
- report submission controls;
- responsibility or supervision choices;
- persistent return state.

Do not add character evaluation labels, moralising feedback, trait language, or visual cues that disclose the intended construct.

### E. Hazard, Interruption, and Final Core presentation

Provide consistent visual surfaces for:

- warning inspection;
- hazard information review;
- informed or reckless continuation choices;
- interruption acknowledgement;
- task-switch or return decisions;
- Final Core status review;
- unresolved-issue handling;
- completion confirmation.

The interface must not change the route gate, completion requirements, event timing, task-state semantics, or consequence logic implemented in NEXT-05.

### F. Developer and automated-test compatibility

Participant-facing number entry should no longer be the primary interaction.

Existing numeric keyboard mappings may remain only as:

- hidden developer shortcuts;
- accessibility shortcuts;
- deterministic automated-test hooks.

They must not be shown as the main participant instruction unless required as an explicitly documented fallback.

Where existing Playwright tests depend on number keys, either preserve the hidden mapping or update helpers so the same behavioural path is exercised through stable semantic controls. Avoid brittle pixel-coordinate testing when a semantic test hook can be provided without changing participant behaviour.

## Visual direction

Use the established Polar Meridian direction:

- cold slate and gunmetal base;
- cyan reserved for interactable affordances;
- rust-orange as the principal warm player accent;
- amber reserved for hazards and warnings;
- high-contrast readable text;
- no red/green-only success signalling;
- no scores, trait labels, or construct-revealing feedback.

Use existing assets, CSS, Phaser graphics, or neutral placeholders. This task does not authorize selection of final generated stimuli from the unapproved asset-candidate pack.

Do not fabricate PixelLab provenance or claim generated assets exist when they do not.

## Research and telemetry boundaries

The following are frozen unless an explicit blocking defect requires an operator decision:

- event identifiers;
- event registration status;
- event payload compatibility;
- object_id semantics;
- attempt_number semantics;
- study-item mappings;
- construct mappings;
- scoring inputs;
- scoring rules;
- candidate derived-variable definitions;
- SessionState schema;
- mission-state meaning;
- persistence and reload semantics;
- Supabase ingestion;
- Qualtrics integration;
- ethical-scenario content;
- canonical route and Final Core gate.

Mere UI actions such as hover, focus, panel opening, or visual animation must not create new research events unless an already-approved event is explicitly defined for that observed action.

Do not duplicate events because both a visual control and a keyboard shortcut reached the same action.

## Accessibility requirements

Implement and verify:

- keyboard-only completion of every changed interface;
- visible focus indication;
- Escape or documented back behaviour;
- no interaction that requires drag-and-drop exclusively;
- mouse-click alternative to keyboard shortcuts;
- readable text at supported viewport sizes;
- non-colour cues for selection, warnings, and completion;
- no rapid flashing;
- no time-critical interaction introduced by the UI layer;
- stable controls after room exit and return.

Drag-and-drop may be offered as an enhancement only when click-select-and-place remains available.

## Required implementation sequence

### Phase 1 — Audit and UI contract

Before changing gameplay presentation:

1. inventory every participant-facing number-choice surface in the canonical route;
2. identify the underlying action functions and event-emission points;
3. define the shared UI primitives;
4. document which numeric mappings remain as hidden shortcuts;
5. identify any surface that cannot be converted without changing measurement logic.

Stop for an operator decision if a conversion requires new event identifiers, a scoring change, or a changed task outcome.

### Phase 2 — Shared primitives

Implement the smallest reusable UI substrate needed for:

- modal/panel shell;
- choice cards;
- item and destination slots;
- checklist;
- current-step/status display;
- confirmation and review surface;
- focus management;
- semantic test selectors.

Commit this phase separately.

### Phase 3 — Inventory conversion

Convert Inventory and Preparation first. Preserve all current automated and manual paths, including:

- legacy options 1–3 behaviour;
- per-item option 4 behaviour;
- misplacement and correction;
- verification skip;
- cleanup restore or leave;
- prepared_items propagation;
- Final Core missing-item semantics.

Commit this phase separately and run the complete Inventory suite before continuing.

### Phase 4 — Repair and Engineer conversion

Convert Systems Repair, Side Repair, and Engineer Report-Back using the shared primitives.

Preserve:

- attempt and cycle numbering;
- manual-guided success requirements;
- abandon, defer, return, and completion semantics;
- report preparation and supervision/responsibility semantics;
- one-shot and duplicate-prevention rules.

Commit this phase separately.

### Phase 5 — Hazard, Interruption, and Final Core conversion

Convert the remaining canonical decision surfaces.

Preserve:

- hazard information and continuation semantics;
- interruption and return semantics;
- Final Core route gate;
- unresolved issue handling;
- completion state;
- all existing ethical-scenario separation.

Commit this phase separately.

### Phase 6 — Coherence and regression pass

Perform a whole-route presentation review for:

- consistent controls;
- consistent vocabulary;
- no accidental construct disclosure;
- no stale number-choice instructions;
- no blocked exits or focus traps;
- no duplicate event emissions;
- no state loss on room transitions;
- no regression to Supabase, Qualtrics, or export behaviour.

## Verification requirements

Run all of the following:

- TypeScript no-emit check;
- ESLint on every changed source and test file;
- Prettier check;
- production build;
- traceability-matrix validation;
- git diff --check;
- focused Playwright tests for each converted room;
- complete Inventory suite;
- complete Repair and Side Repair suites;
- Engineer-focused suite;
- Hazard, Interruption, and Final Core suites;
- scenario route gate;
- status-board adversarial test;
- session-isolation test;
- connected participant journeys;
- research export test mode;
- any accessibility or keyboard-navigation tests added by this task.

Use one worker for fragile route tests unless the repository has already proven parallel execution safe.

Record exact test counts and durations.

## Manual acceptance routes

Provide concise operator instructions for at least:

1. Inventory correct path;
2. Inventory misplace, review, correct, and verify;
3. Inventory cleanup restore and leave outcomes;
4. Systems Repair fail, revise, consult manual, and succeed;
5. Side Repair complete, defer/resume, and abandonment;
6. Engineer prepared and unprepared report-back paths;
7. Hazard informed and reckless paths;
8. Interruption acknowledge, ignore, switch, and return paths;
9. Final Core blocked entry and valid completion;
10. keyboard-only completion of each changed interface;
11. mouse-only completion of each changed interface.

For each route, specify the expected research events and state outcome without exposing those expectations in the participant UI.

## Documentation requirements

Update only documentation directly affected by the new presentation layer, including as applicable:

- canonical UI/minigame presentation contract;
- changed room documents;
- test documentation;
- asset integration backlog;
- interaction-control documentation.

Do not alter questionnaire wording or locked research-source files.

Clearly distinguish:

- participant-visible UI;
- hidden developer shortcuts;
- automated-test hooks;
- candidate future asset replacements;
- remaining research-owner decisions.

## Stop conditions

Stop and report rather than guessing when:

- a visual conversion requires a new event identifier;
- an existing event would need to move to a materially different observed moment;
- an interaction would change a study-item mapping or construct interpretation;
- the current task state is insufficient to support the UI without a schema change;
- final asset selection would require human approval;
- a blocking accessibility conflict cannot be solved without changing assessment behaviour;
- NEXT-04 or NEXT-05 is incomplete or has blocking findings.

## Git and execution boundaries

- Work in one isolated worktree and branch.
- Branch from the verified NEXT-05 tip.
- Keep files LF using worktree-local configuration only.
- Do not change global or system Git configuration.
- Do not touch the main checkout.
- Do not push, merge, create a PR, rewrite history, or delete worktrees.
- Make separate local commits for the implementation phases described above.
- Leave a clean working tree.
- Report exact commits, changed files, verification evidence, manual routes, unresolved decisions, and recommended integration order.

## Completion criteria

This unit is complete only when:

- participant-facing typed-number entry is no longer the primary interaction for canonical minigames;
- all converted interfaces work by mouse and keyboard;
- hidden shortcuts do not duplicate research events;
- current task logic and telemetry remain behaviourally compatible;
- no research mapping or scoring boundary has changed;
- the full required verification battery is green;
- the working tree is clean;
- all work is committed locally and unpushed.
