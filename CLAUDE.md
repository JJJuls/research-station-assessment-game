# CLAUDE.md

Instructions for Claude Code / Fable working in this repository. Read
`PROJECT_SPEC.md` and the canonical contract
`docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3) first. This file
governs _how_ to work; V3 governs _what_ is correct.

## Project

- Working directory: `C:\Users\Juls\Desktop\research-station-assessment-game`
- Branch: `fable-final-game-prep-from-prototype` (created from
  `prototype/bfi-grit-behavioural-mapping`)
- Stack: Phaser 3 + TypeScript + Vite, existing top-down RPG foundation.

## Build / verify commands

- `npm.cmd run build` — production build (Vite). Must pass before any "done" claim.
- `npm.cmd run lint:tsc` — `tsc --noEmit`. Must pass before any "done" claim.
- `npm.cmd run lint` — ESLint; run when practical.
- `npm.cmd run start` — dev server (`vite --open`) for manual/browser verification.
- `npm.cmd run preview` — preview a production build.
- A passing build/typecheck is **necessary, not sufficient** — see
  `playwright-game-verify` / `browser-qa-reviewer` for runtime verification
  requirements before claiming a room or system "works."

## Allowed actions

- Read, inspect, and reason about any file in the repo.
- Create and edit documentation (`*.md` under the repo root and `docs/`).
- Implement one room/task/transition at a time in `src/`, once a beat has been
  explicitly approved and is past documentation-only Beat 1.
- Run `npm.cmd run build`, `lint:tsc`, `lint`, `start`, `preview`.
- Use project skills and review agents as scoped below.

## Disallowed actions (unless explicitly requested in the same turn)

- Do not edit `package.json` or `package-lock.json`.
- Do not run `npm install` or `npm audit fix`.
- Do not call PixelLab / generate any art asset.
- Do not use Playwright browser automation outside of the explicit verification
  beats where it's requested.
- Do not `git add`, `commit`, `push`, or open a PR.
- Do not start the next build beat without explicit approval.
- Do not implement more than one room in a single pass.
- Do not build all rooms, all docs beyond what's requested, or all tests in one
  uncontrolled batch.
- Do not create a broad autonomous/manager agent, an asset-generation agent with
  uncontrolled PixelLab access, or a GitHub push/release agent.
- Do not discard, rewrite, or bypass `EventLogger`, `SessionState`,
  `QualtricsBridge`, `DataQualityTracker`, `ScoringManager`, or `ResearchRuntime`
  without a concrete, stated, contract-tied reason.
- Do not show validated Q01-Q33 questionnaire wording in any player-facing text.
- Do not compute or ship a single global "good player"/personality score, or merge
  adaptive and inappropriate persistence into one variable.

## MCP rules

- **PixelLab MCP**: local-scope, token-gated. **Never call without explicit,
  standalone user approval for the specific room/step in the same session.**
  Requires placeholder mechanics and full event logging for the target room to
  already work. Governed by `.claude/skills/pixellab-asset-pipeline/SKILL.md`
  (`disable-model-invocation: true` — must be invoked deliberately, not
  auto-triggered).
- **Playwright MCP**: local-scope, for browser verification. Use only when a beat
  or the user explicitly calls for runtime/browser verification.
- **GitHub MCP**: not configured/required. Use standard Git CLI and the existing
  GitHub remote for any explicitly-requested Git operations; do not attempt to
  wire up GitHub MCP as a side effect of other work.

## One-room-at-a-time rule

Every room-implementation pass (`room-builder` skill) touches exactly one room,
task, or transition. Before coding: confirm/create the room's doc under
`docs/game/rooms/`, pull exact canonical event names from V3 Section 4/5 and
`docs/research/event-schema.md`, confirm which derived variables it feeds via
`docs/research/scoring-plan.md`, and check the room's current implementation
status before rewriting anything. After coding: report room, doc path, changed
files, events added/changed, scoring variables affected, done-test result, and
unresolved risks — then stop and wait for approval before the next room.

## Review-agent usage rules

Three project-local agents exist under `.claude/agents/`, all **review-only**
(they report findings; they do not edit files unless explicitly instructed in the
same request):

- `research-data-reviewer` — Q01-Q33 traceability, wording leakage, persistence
  separation, exploratory-proxy labelling, EventLogger/ScoringManager/
  SessionState/QualtricsBridge correctness. Invoke after any room, scoring, or
  logging change is claimed done.
- `gameplay-implementation-reviewer` — connected-world flow, room transitions,
  scene structure, task-state correctness, one-room-at-a-time discipline,
  preservation of existing logic, build safety. Invoke after a room/system
  implementation is claimed done.
- `browser-qa-reviewer` — checks that a "done" claim has actual browser/runtime
  evidence (not just a green build), debug-API exercise, Playwright spec
  coverage. Invoke whenever a room/system change is claimed "done" or "working."

Do not ask a review agent to implement fixes; route confirmed findings back to
the appropriate skill (`room-builder`, `qualtrics-logging-review`, etc.) or to the
user for a decision.

## Skill usage

- `research-game-architect` — architecture/sequencing questions, before writing
  room code.
- `room-builder` — implementing/modifying exactly one room, task, or transition.
- `psychometric-task-design` — any Q01-Q33-construct-to-mechanic decision; the
  scientific-validity gate.
- `qualtrics-logging-review` — any change to EventLogger, ResearchRuntime,
  ScoringManager, DataQualityTracker, SessionState, QualtricsBridge, or the
  `window.researchRuntime` debug API.
- `playwright-game-verify` — runtime/browser verification of a claimed-done room
  or system.
- `pixellab-asset-pipeline` — only after explicit, standalone approval for a
  specific asset-generation pass; never self-invoked.

## Git rules

- Never update git config.
- Never run destructive git commands (`push --force`, `reset --hard`,
  `checkout .`, `clean -f`, `branch -D`) unless explicitly requested.
- Never skip hooks (`--no-verify`, `--no-gpg-sign`) unless explicitly requested.
- Never force-push to `main`/`master`.
- Create new commits rather than amending, unless explicitly asked to amend.
- Only stage/commit files explicitly relevant to the requested change; never
  `git add -A`/`git add .` blindly.
- Never commit, push, or open a PR unless the user explicitly asks for that
  specific action in that turn — an earlier approval does not carry forward to a
  new request.
