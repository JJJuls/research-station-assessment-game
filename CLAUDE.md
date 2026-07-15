# CLAUDE.md

Instructions for Claude Code / Fable working in this repository. Read
`PROJECT_SPEC.md`, the canonical build contract
`docs/ai/fable-claude-final-game-build-contract-v3.txt` (V3), and
`docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` first. This file governs
_how_ to work. **No single document governs everything**: authority is
domain-specific — see "Authority hierarchy" below.

## Project

- Working directory: `C:\Users\Juls\Desktop\research-station-assessment-game`
- Branch: `fable-autonomous-game-build-v1` (current working branch)
- Expected checkpoint: `1ad66c2` immediately before the governance commit that
  introduced this section. Later commits are expected; a branch other than
  `fable-autonomous-game-build-v1` is not — stop and ask if you find one.
- Stack: Phaser 3 + TypeScript + Vite, existing top-down RPG foundation.
- Historical: earlier docs reference the branches
  `fable-final-game-prep-from-prototype` and
  `prototype/bfi-grit-behavioural-mapping`. Those are **historical evidence
  only** and never override the current branch or the current tree.

## Authority hierarchy (by domain)

Apply authority by domain. A document that governs one domain does not govern
the others, and a newer approved scientific decision supersedes an older
mechanic rationale **only within its own scientific domain** — it never silently
rewrites a production event name, a scoring formula, or the build discipline.

1. **Exact questionnaire content** — the final exact 33-item battery
   (`Original_question_items`, external). Governs item wording, scale
   membership, item direction, source-scale identity and the Q01-Q33 crosswalk.
   Never alter questionnaire wording or scoring direction.
2. **Behavioural translation** —
   `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`. Governs how
   each Q-item becomes a gameplay opportunity: player choices, measurement
   windows, behavioural reasoning, evidential-strength labels, known confounds,
   and questionnaire-primary vs exploratory treatment. Where it conflicts with
   an older mechanic rationale (V3 §5, `docs/research/MASTER_33_ALIGNMENT.md`),
   **this specification governs the rationale** — and the conflict becomes a
   recorded open decision, not an edit.
3. **Event names and payload contract** — `docs/research/event-schema.md`.
   Governs approved canonical production event names and payload conventions.
4. **Scoring and derived formulas** — `docs/research/scoring-plan.md`. Governs
   approved derived variables, formulas, weights, reverse-key handling and
   composite logic.
5. **Architecture and build discipline** — V3. Governs system architecture,
   room/task structure, build discipline, verification gates, and Git/agent
   workflow, except where a newer research-owner-approved scientific decision
   explicitly supersedes an older mechanic rationale.
6. **Historical material** — older handoffs, prototype notes, obsolete branch
   instructions and superseded decision records. Evidence only; they never
   override the current branch, the current code, the final 33-item battery, or
   the newer approved measurement specification.

### The scientific specification and what it does not approve

- `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` (Markdown) is
  the **machine-readable working source** — the file to read and cite.
- `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.docx` is the
  **human-review companion** for the research owner.
- **Neither document alone approves a production event name or a scoring
  formula.** Event names and derived indicators written in the specification are
  **candidates** unless they already match `docs/research/event-schema.md` /
  `docs/research/scoring-plan.md`. Never silently promote a candidate into a
  canonical production name or an approved formula — route it to the research
  owner via `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`.
- Approved scientific decisions already encoded (do not reopen or reinterpret):
  Q04 is cleanup/restoration, never planning-before-action; Q18/Q20/Q32/Q33 stay
  questionnaire-primary; Q27's primary analogue is continuation after an explicit
  utility-stop signal, and Hazard remains principally prudence/carefulness;
  Q29 and Q31 share one goal-horizon dimension and one choice is never two
  independent observations; Q30 is goal granularity, never inferred from
  carelessness or skipped preparation. Full detail and the open-decision queue
  live in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`.
- **No open decision may be resolved autonomously.** When a mechanic, event or
  formula is ambiguous, ask the research owner; do not guess and do not infer
  approval from a document's modification date.

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
  Exact wording may be used **only** for internal traceability (docs, comments,
  matrices), never in dialogue, prompts or choice labels.
- Do not compute or ship a single global "good player"/personality score, or merge
  adaptive and inappropriate persistence into one variable. Raw events, process
  variables and construct subindices must stay distinguishable, as must
  opportunity, choice, process, outcome and control variables.
- Do not promote a candidate event name or candidate derived indicator from
  `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` into production
  without an explicit event-schema / scoring-plan decision from the research owner.
- Do not resolve an entry in
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` autonomously, and do not
  invent a scientific mapping, weight or formula to unblock progress.

### The branch name is not an authorisation

`fable-autonomous-game-build-v1` names a branch, not a mandate. **Nothing in this
repository authorises uncontrolled autonomous development.** Every bounded
work-unit rule still applies in full: one room/task/transition per pass, explicit
approval before the next beat, documentation-only work stays documentation-only,
and a passing build is necessary but never sufficient for a "done" claim.

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
`docs/game/rooms/`, read the relevant Q-item entries in
`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` for the approved
behavioural rationale, pull exact canonical event names from
`docs/research/event-schema.md` (with V3 Section 4/5), confirm which derived
variables it feeds via `docs/research/scoring-plan.md`, and check the room's
current implementation status before rewriting anything. If the approved
rationale requires a mechanic whose events or formulas are not yet approved, say
so and stop — that is an event-schema and/or scoring-plan decision for the
research owner, not something to code around. After coding: report room, doc
path, changed files, events added/changed, scoring variables affected,
done-test result, and unresolved risks — then stop and wait for approval before
the next room.

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
