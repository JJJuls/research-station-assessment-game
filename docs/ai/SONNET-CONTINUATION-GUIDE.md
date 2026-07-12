# Sonnet Continuation Guide

Task-level guide for Claude Sonnet (or a comparable model) continuing this
project after the final Fable window. Read
`docs/ai/POST-FABLE-MASTER-HANDOFF.md` first for repository state; this
file tells you HOW to work and which tasks are yours. No Claude
conversation context is required — everything you need is in the repo.

## Ground rules (non-negotiable)

1. CLAUDE.md governs: one room/task/transition per pass; no package.json
   edits; no npm install; no PixelLab; never push/PR/rebase/reset; never
   touch the protected branch (`fable-final-game-prep-from-prototype`).
2. Scientific boundaries: never alter/infer/invent study_item_ids,
   construct_id, scoring formulas, event semantics, option wording or
   ordering, timing thresholds, or Qualtrics contracts. If a task needs a
   ruling, STOP that task, document the exact decision needed, continue
   elsewhere.
3. Checkpoint discipline: smallest coherent unit → tsc → build →
   targeted tests → local commit → update
   `docs/expansion/ACTIVE-EXPANSION-STATE.md` → record exact next action.
4. A green build is necessary, not sufficient — runtime (Playwright)
   evidence is required for any "works" claim.

## Read-first map (in order, all current at Sprint A HEAD)

1. `docs/ai/POST-FABLE-MASTER-HANDOFF.md` — state, commits, splits.
2. `docs/ai/DEBUGGING-CHECKLIST.md` — BEFORE debugging anything.
3. `docs/testing/ROOM-ACCEPTANCE-TEMPLATE.md` +
   `docs/testing/CONNECTED-JOURNEY-TEMPLATE.md` — before writing tests.
4. `docs/architecture/STATION-IMPLEMENTATION-CONVENTIONS.md` — before
   touching any scene.
5. `docs/architecture/CONNECTED-WORLD-TRANSITION-CONTRACT.md`,
   `STATE-AND-SESSION-CONTINUITY.md`, `CROSS-ROOM-INTEGRATION.md`,
   `transition-inventory.json` — the world's factual contracts.

## Tasks assigned to you (in priority order)

### S1 — Independent Hazard Control review (user-requested, pending)

Review commits `317e07b..201c8fa` (Hazard Control implementation +
verification) as an independent reviewer: V3 §4/5 event conformance, D1
ruling conformance (`hazard_route_avoided` canonical, `study_item_ids`
[], no construct, no completion gate), option wording vs
`docs/game/rooms/` doc, scoring separation (info-check is prudence, NOT
mixed into persistence). Report findings; do NOT fix autonomously.
Reviewer rules: `.claude/agents/` + CLAUDE.md review-agent section.

### S2 — Keep the Playwright suite green

Run `npx playwright test` after any change. If a journey flakes, use the
debugging checklist §1 table first; route-tuning (timing legs in
`e2e/journey.ts` / `e2e/helpers.ts`) is yours to fix. Never weaken an
assertion to make a test pass.

### S3 — Extend journey coverage from the template

New participant-session specs must follow
`docs/testing/CONNECTED-JOURNEY-TEMPLATE.md`, especially the
session-splitting rule (mutually exclusive branches in separate
sessions).

### S4 — Technical pre-pilot tasks T1–T4

Listed in `docs/research/STIMULUS-FREEZE-TECHNICAL-AUDIT.md` §2. T4
(Archive exit-door texture) requires explicit user approval for any
PixelLab call — ask; do not self-invoke.

## Tasks NOT yours (do not start)

- Beat-13 scoring bundle (D2) and ANY ScoringManager/QualtricsBridge
  change — top-tier model + user ruling.
- Hazard→Final Core consequence (`hazard_issue_created/resolved`,
  `final_hazard_issue`) — user task-design decision; see
  `CROSS-ROOM-INTEGRATION.md` §3.
- D2–D8 rulings, idle thresholds, construct assignments — user-owned.
- Any git push, PR, or protected-branch operation.

## Environment quick facts

- Windows; use `npm.cmd`. Dev server: `npm.cmd run start` (port 5173;
  Playwright reuses it). Typecheck: `npm.cmd run lint:tsc`.
- Playwright: serial, 1 worker; SwiftShader args in the config are
  load-bearing (renderer determinism) — never remove.
- Pre-commit: tsc + lint-staged (ESLint `no-console` applies to e2e;
  prettier reformats docs — re-read files after commit before editing).
