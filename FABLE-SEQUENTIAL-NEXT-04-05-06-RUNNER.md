# FABLE Sequential Runner — NEXT-04, NEXT-05, NEXT-06

## Objective

Execute the three canonical task files sequentially in one isolated worktree and one sequential branch:

1. `FABLE-NEXT-04-ENGINEER-REPORT-BACK-Q09-Q10.md`
2. `FABLE-NEXT-05-HAZARD-INTERRUPTION-FINAL-CORE.md`
3. `FABLE-NEXT-06-UNIFIED-PARTICIPANT-UI-MINIGAME-PRESENTATION.md`

Do not run the phases in parallel. Each phase must build on the committed result of the previous phase.

## Starting point

Base the work on the current integrated `fable-autonomous-game-build-v1` HEAD.

Before editing:

- verify the three task files exist;
- verify the starting commit and branch;
- inspect `git status`;
- create one new isolated worktree and one new sequential branch;
- preserve LF line endings using worktree-local Git configuration only;
- do not change global or system Git configuration.

Suggested branch:

`fable-sequential-next-04-05-06-v2`

Suggested worktree:

`.claude/worktrees/fable-sequential-next-04-05-06-v2`

If either name already exists, choose a clearly related unused `-v3` name rather than deleting or reusing uncertain prior work.

## Phase 1 — NEXT-04

Read `FABLE-NEXT-04-ENGINEER-REPORT-BACK-Q09-Q10.md` and execute it fully.

Use the current locked Q01-Q33 sources, canonical blueprint, traceability matrix, room/minigame contracts, event/data contracts, and the integrated NEXT-02/NEXT-03 implementation as binding sources of truth.

Complete all implementation, documentation, focused tests, preservation tests, reviews, and validation required by the task.

Before proceeding to NEXT-05, require all of the following:

- no blocking research-validity finding;
- no blocking gameplay or browser-QA finding;
- TypeScript passes;
- changed-file ESLint passes;
- production build passes;
- traceability validation passes;
- `git diff --check` passes;
- required Playwright tests pass;
- working tree is clean;
- NEXT-04 is committed locally in one or more clearly labelled commits.

If any blocking decision or failure remains, stop after NEXT-04 and report it. Do not continue.

## Phase 2 — NEXT-05

Only after NEXT-04 meets every checkpoint above, read `FABLE-NEXT-05-HAZARD-INTERRUPTION-FINAL-CORE.md` and execute it fully on top of the NEXT-04 commits.

Preserve all validated Inventory, Systems Repair, Side Repair, Engineer, ethical-scenario, Supabase, Qualtrics, SessionState, telemetry, scoring-boundary, and participant-route guarantees.

Complete all implementation, documentation, focused tests, preservation tests, participant journeys, reviews, and validation required by the task.

Before proceeding to NEXT-06, require all of the following:

- no blocking research-validity finding;
- no blocking gameplay or browser-QA finding;
- TypeScript passes;
- changed-file ESLint passes;
- production build passes;
- traceability validation passes;
- `git diff --check` passes;
- required Playwright tests pass;
- working tree is clean;
- NEXT-05 is committed locally in a separate clearly labelled commit series.

If any blocking decision or failure remains, stop after NEXT-05 and report it. Do not continue.

## Phase 3 — NEXT-06

Only after NEXT-05 meets every checkpoint above, read `FABLE-NEXT-06-UNIFIED-PARTICIPANT-UI-MINIGAME-PRESENTATION.md` and execute it fully on top of the NEXT-05 commits.

This is the unified participant UI and minigame-presentation pass. Replace participant-facing typed-number scaffolds with visual mouse-and-keyboard interfaces while preserving existing task logic, event emissions, payload semantics, mappings, scoring boundaries, persistence, Supabase, Qualtrics, ethical scenarios, route gating, and Final Core behaviour.

Follow the task file's required phased commit structure and complete its full verification battery.

If a visual conversion requires a new event identifier, changed scoring rule, changed task outcome, final asset approval, or another research-owner decision, stop safely and report the blocker rather than guessing.

## Global boundaries

- Use one isolated worktree and one sequential branch.
- Do not touch the main checkout.
- Do not run phases in parallel.
- Do not spawn additional implementation agents unless a task file explicitly mandates a reviewer and the available environment supports it.
- Do not merge, push, create a PR, rewrite history, or delete worktrees.
- Keep one distinct commit series per NEXT phase so each phase can be reviewed or reverted independently.
- Do not invent event identifiers, registrations, item mappings, constructs, scoring rules, questionnaire wording, or psychological interpretations.
- Do not silently resolve research-owner decisions.
- Do not introduce generic RPG inventory, crafting, rarity, currency, shops, fishing, farming, combat, XP, open-world systems, or unrelated mechanics.
- Preserve observed-moment event timing and payload compatibility.
- Preserve LF line endings with worktree-local settings only.
- If the network or API fails, preserve the existing worktree and commits, then resume from the last clean checkpoint. Do not recreate or reset completed work.
- Do not push anything.

## Final report

At completion, report:

- exact worktree and branch;
- starting commit;
- commits grouped by NEXT-04, NEXT-05, and NEXT-06;
- changed files by phase;
- implemented mechanics and UI flows;
- event emissions and payload behaviour;
- persistence model;
- exact test commands, counts, and durations;
- build, lint, traceability, formatting, and diff-check results;
- reviewer findings;
- unresolved research-owner decisions;
- manual test instructions for every phase;
- recommended operator integration order;
- whether the working tree is clean.

If execution stops before NEXT-06, clearly state the last successfully committed phase and the exact blocker.
