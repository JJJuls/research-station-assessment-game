# Claude Operating Mode

How Claude Code works in this repository: the unit lifecycle, the contract every
unit must carry, model routing, permission and review policy, the verification
loop, and the current development order.

This document governs **process**. It does not govern scientific content,
questionnaire wording, event names or scoring formulas — those keep the
domain-specific authority hierarchy defined in `CLAUDE.md`. Nothing here
authorises autonomous scientific decisions.

---

## 1. The five-stage unit lifecycle

All work moves through five stages. A stage never starts before the previous one
has finished, and stage 5 is always performed by a human.

| #   | Stage                                | Owner                  | Ends when                                                    |
| --- | ------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| 1   | **Human-approved unit contract**     | Human                  | The contract in §2 is written and explicitly approved        |
| 2   | **Isolated implementation**          | One main Claude writer | The allowlisted files are changed and nothing else is        |
| 3   | **Focused verification**             | Same writer            | Typecheck, build and the unit's named tests/screenshots pass |
| 4   | **Independent read-only review**     | Reviewer subagents     | Reviewers report cited findings; bounded fixes are applied   |
| 5   | **Human acceptance and integration** | Human only             | The human accepts, then pushes/merges/tags/deploys           |

Claude stops after one local commit at the end of stage 4. It never crosses into
stage 5.

---

## 2. Required unit-contract fields

A unit may not begin until every field below is answered. "Not applicable" is a
valid answer; silence is not.

1. **Objective** — the single outcome, in one sentence.
2. **Scientific rationale** — which Q-items or constructs this serves, citing
   `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`, or an
   explicit statement that the unit is scientifically neutral.
3. **Participant-facing behavior** — what a participant sees and does. Must never
   contain validated questionnaire wording.
4. **Exact allowed-file list** — the complete enumeration of files that may be
   created or modified. This is the allowlist enforced in §6.
5. **Prohibited areas** — trees and files this unit must not touch.
6. **Entry state** — branch, base checkpoint, expected worktree cleanliness.
7. **Success behavior** — the observable end state that means "done".
8. **Failure/recovery behavior** — what the system does when the mechanic fails,
   is abandoned, or is interrupted.
9. **Telemetry boundary** — which canonical events from
   `docs/research/event-schema.md` this unit emits, and an explicit statement
   that no new canonical event name or derived variable is invented.
10. **Scientific acceptance criteria** — what must hold for the measurement to
    remain valid.
11. **Gameplay acceptance criteria** — what must hold for the experience to
    remain coherent.
12. **Required tests** — the exact commands and specs that must pass.
13. **Required screenshots** — the exact runtime evidence to capture, or "none".
14. **Stop conditions** — the circumstances under which Claude halts and reports
    instead of proceeding.
15. **Model selection** — which model handles the unit, per §3.
16. **Commit expectation** — the single commit subject, in conventional-commit
    form.

---

## 3. Model routing

Route by the nature of the work, not by the size of the budget.

| Model              | Use for                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Opus**           | Architecture, research reasoning, audit, scientific review, UX review, root-cause analysis, final review |
| **Fable**          | Large or difficult implementation — but only after the contract is approved                              |
| **Sonnet**         | Focused test execution, log analysis, mechanical checks, routine fixes                                   |
| **Cheaper models** | Narrow read-only discovery: locating files, inventories, reference lookups                               |

Rules:

- **Fable is reserved for complex implementation.** Never select Fable merely to
  consume quota, and never for design, review or discovery.
- Opus decides _what_ and _whether_; Fable builds; Sonnet checks.
- Discovery that only needs file locations belongs on the cheapest adequate
  model (`cheap-explorer`).
- A model choice is part of the unit contract (§2.15), not an in-flight
  improvisation.

---

## 4. Permission policy

| Activity                                                                    | Mode                                      |
| --------------------------------------------------------------------------- | ----------------------------------------- |
| Design, architecture, audit, scientific evaluation                          | Plan / read-only                          |
| Bounded implementation inside an isolated worktree                          | Auto mode, behind the deterministic guard |
| Push, merge, tag, deployment, branch/worktree deletion, scientific approval | **Human only**                            |

Auto mode is permitted **only** when all of the following hold:

1. The work happens in an isolated worktree on its own branch.
2. A human-approved unit contract with an exact allowlist exists.
3. The PreToolUse guard (`scripts/claude/pretool-guard.mjs`) is registered and
   active.
4. The unit has a defined stop condition and no self-prompting loop.

`bypassPermissions` is never used. Experimental agent teams are never enabled.
Indefinite implementation loops are never created.

Human-only operations, restated because they are the boundary that matters:
**push, merge, tag, deploy, delete a branch, remove or prune a worktree, and
approve any scientific decision.** Claude proposes; the human performs.

---

## 5. Review policy

- **One main writer.** Exactly one agent edits files in a unit. Concurrency in
  the writer seat causes lost edits and untraceable scope creep.
- **Reviewers are read-only.** They hold no Write or Edit tool and cannot
  delegate further. They report; they do not fix.
- **Findings must cite evidence** — a concrete file and line, a function, a
  canonical event name, a test name, or a screenshot. An uncited finding is an
  opinion and is treated as such.
- **Reviewer findings are recommendations, not rulings.** A reviewer never
  approves a scientific mapping, an event name, a formula or an asset. Those
  belong to the research owner. Where a reviewer believes a scientific decision
  is required, the correct output is an entry routed to
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`, not a resolution.

Project reviewers created for this operating layer:

| Agent                 | Model  | Scope                                                                                                                               |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `scientific-reviewer` | opus   | Construct representation, item locality, entry-state standardisation, contamination, missing/invalid handling, authority boundaries |
| `gameplay-reviewer`   | opus   | Route clarity, interaction quality, cognitive burden, recovery, accessibility, adult presentation, participant-facing coherence     |
| `test-reviewer`       | sonnet | Runs only explicitly requested typecheck/build/test commands; separates deterministic failures from flakes                          |
| `visual-reviewer`     | opus   | Screenshots and candidate assets: clipping, overlap, hierarchy, legibility, state communication, adult presentation                 |

The pre-existing reviewers (`research-data-reviewer`,
`gameplay-implementation-reviewer`, `browser-qa-reviewer`, `cheap-explorer`)
remain valid and are unchanged by this layer.

---

## 6. The controlled verification loop

```
implement
  → typecheck / build
  → focused tests
  → screenshots
  → reviewer findings
  → bounded fixes
  → one commit
  → STOP
```

**Maximum two review/fix rounds.** If findings remain open after the second
round, Claude stops and reports them rather than starting a third. Only an
explicit human authorisation extends the limit.

### Commands

```sh
npm.cmd run lint:tsc            # tsc --noEmit — must pass before any "done" claim
npm.cmd run build               # production build — must pass before any "done" claim
npm.cmd run lint                # ESLint, when practical
node --test scripts/claude/pretool-guard.test.mjs
```

A passing build is **necessary but never sufficient**. A room or system is only
"working" with runtime evidence, per `playwright-game-verify` and
`browser-qa-reviewer`.

### Unit verifier

`scripts/claude/verify-unit.mjs` is a read-only check that the unit stayed inside
its allowlist. It prints branch and HEAD, lists staged/unstaged/untracked
changes, compares every changed path against the supplied allowlist, detects the
fingerprint of broad staging (`git add .` / `git add -A`), runs `git diff
--check`, and exits non-zero on any violation. It never stages, commits or
modifies the repository.

```sh
# enumerate the allowlist explicitly
node scripts/claude/verify-unit.mjs \
  --allow CLAUDE.md \
  --allow .claude/settings.json \
  --allow "scripts/claude/**" \
  --allow docs/ai/CLAUDE-OPERATING-MODE.md

# or from a file, one entry per line ("#" starts a comment)
node scripts/claude/verify-unit.mjs --allowlist-file <path>

# or from the environment, shared with the PreToolUse guard
CLAUDE_UNIT_ALLOWLIST="CLAUDE.md,scripts/claude/**" node scripts/claude/verify-unit.mjs

# also audit the whole branch against its base checkpoint
node scripts/claude/verify-unit.mjs --allowlist-file <path> --base <base-ref>

# machine-readable summary
node scripts/claude/verify-unit.mjs --allowlist-file <path> --json
```

Exit codes: `0` clean, `1` violation found, `2` the verifier could not run.

Entries are repo-relative POSIX paths; a trailing `/**` makes an entry a
directory prefix.

### Deterministic guard

`scripts/claude/pretool-guard.mjs` runs as a `PreToolUse` hook on `Bash`,
`Write`, `Edit`, `MultiEdit` and `NotebookEdit`. It blocks (exit 2, reason on
stderr):

- `git push` in any form, including force pushes and `--delete`
- `git merge`, `rebase`, `cherry-pick`, `filter-branch`
- tag creation and deletion (`git tag --list` stays allowed)
- `git worktree remove` / `prune` / `move`
- branch deletion, rename and force-update
- `git reset --hard`, `git clean`, broad `git checkout .` / `git restore .`
- `git add .`, `git add -A`, `git add -u`, `git add :/`, and `git commit -a`
- hook-bypass flags (`--no-verify`, `--no-gpg-sign`)
- `git config` writes
- dependency installs/updates and publishes (`npm install`, `npm publish`, …)
- publication and deployment (`gh pr create`, `gh release`, `vercel deploy`, …)
- recursive deletion (`rm -rf`, `Remove-Item -Recurse`, `find … -delete`)
- writes to immutable research-owner material and protected operational files
- writes outside the active allowlist when `CLAUDE_UNIT_ALLOWLIST` is set

It allows read-only git inspection (`status`, `diff`, `log`, `show`,
`rev-parse`, `ls-files`, `branch --list`, `worktree list`, `tag --list`) and
staging by explicit file name. It normalises Windows, `C:/…` and Git-Bash
`/c/…` paths identically, scans compound commands and command substitutions, and
never echoes full command lines, file contents, environment contents or
authorization headers.

Guard behaviour is covered by `scripts/claude/pretool-guard.test.mjs`
(Node's built-in test runner, no dependencies).

### Configuration notes

`.claude/settings.json` registers the guard and constrains delegation. Two
details are easy to get wrong and were verified against the installed Claude Code
build (2.1.226/2.1.227, native, win32-x64):

- **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must stay unset.** The flag is read as
  a plain presence check, so setting it to `"0"` or `"false"` would _enable_
  agent teams, not disable them. Absence is the only correct way to keep them
  off. Never add this key.
- **`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` is set to `"1"`** (the product default
  is 3), which limits delegation to a single layer: the main writer may call a
  reviewer, and a reviewer may call no one. `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`
  is set to `"3"` (default 20). Both must be strings.

Nested delegation is additionally prevented per-agent: each reviewer's `tools:`
list replaces the default tool set, so no reviewer holds the Agent tool, and
none holds Write or Edit.

The `PreToolUse` hook applies to subagent tool calls as well as the main session,
and its matcher covers every tool that can mutate the tree
(`Bash|Write|Edit|MultiEdit|NotebookEdit`) — including the Bash calls made by
`test-reviewer`.

Verified live: the project hook is picked up without restarting the session, and
`$CLAUDE_PROJECT_DIR` expands correctly on Windows — a `git add -A` attempt was
blocked by the guard with its reason surfaced. Newly added **agent** files may
still require a fresh session before they appear in the Agent tool listing;
that is a discovery delay, not a defect.

---

## 7. Current development order

1. **Route coherence**
2. **Physical scan / dig**
3. **Dedicated organization workstation**
4. **Pipe-puzzle repair**
5. **Approved asset integration and visual cleanup**

One unit at a time, each with its own contract, worktree and branch, each
separated by human approval.

> **The action-assessment branch is an experimental checkpoint.** The success of
> this configuration unit is not evidence about that branch. Do not push or merge
> `fable-action-assessment-rebuild-v1` — or any branch based on it — merely
> because this operating layer landed cleanly. Integration of that work is a
> separate, human decision made on its own evidence.

---

## 8. Boundaries that never move

- Claude never makes research-owner decisions, and never resolves an entry in
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` autonomously.
- Candidate event names and candidate derived indicators stay **provisional**
  until the research owner promotes them into `docs/research/event-schema.md` or
  `docs/research/scoring-plan.md`.
- Validated Q01-Q33 questionnaire wording never appears in participant-facing
  text.
- No single global "good player" or personality score; adaptive and
  inappropriate persistence never merge into one variable.
- Claude never pushes, merges, tags, deploys, deletes a branch, or removes a
  worktree. Only a human does.
