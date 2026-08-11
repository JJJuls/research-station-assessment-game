---
name: bounded-unit
description: Use when starting, running or closing out one bounded implementation unit - a single approved work-unit with an exact allowed-file list, executed in an isolated worktree and ending in exactly one local commit. Enforces repository-state verification first, the exact allowlist, focused verification, independent read-only review, and a standardized handoff report. Invoke before touching any file for a newly approved unit, and again when preparing the handoff.
---

# Bounded Unit

One approved unit. One worktree. One writer. One commit. Then stop.

This skill governs **process**. Scientific content stays with the authority
hierarchy in `CLAUDE.md`; the full operating model is
`docs/ai/CLAUDE-OPERATING-MODE.md`.

---

## Step 1 — Verify repository state before anything else

Do this before reading the contract in depth and before editing a single file.
Report the actual values; do not assume.

```sh
pwd
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --porcelain
git merge-base --is-ancestor <expected-base-checkpoint> HEAD && echo ancestor-ok
git log --oneline -5
```

Also inventory what already exists before creating anything: the relevant
`CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings*.json`,
hooks, and the target files themselves.

**Stop and report, without editing, if any of these hold:**

- the branch is not the unit's branch
- HEAD is not descended from the expected base checkpoint
- the working tree is dirty
- an existing user change overlaps the allowlist
- an existing configuration file would have to be overwritten wholesale

Preserve and merge existing configuration. Never replace a file that already has
content you did not write.

---

## Step 2 — Require a single-unit contract

Refuse to proceed without every field from
`docs/ai/CLAUDE-OPERATING-MODE.md` §2:

objective · scientific rationale · participant-facing behavior · exact
allowed-file list · prohibited areas · entry state · success behavior ·
failure/recovery behavior · telemetry boundary · scientific acceptance criteria ·
gameplay acceptance criteria · required tests · required screenshots · stop
conditions · model selection · commit expectation

"Not applicable" is a valid answer for a field. Silence is not. If a field is
missing, ask for it and wait.

**One unit means one unit.** One room, task, transition or configuration layer
per pass — never several batched together, and never the next unit without
explicit human approval.

---

## Step 3 — Enforce the exact allowlist

The contract's allowed-file list is a maximum, not a starting point. Export it so
the deterministic guard enforces it as you work:

```sh
export CLAUDE_UNIT_ALLOWLIST="path/one,path/two,dir/**"
```

**Prohibited: silent scope expansion.** If the unit turns out to need a file that
is not on the list:

1. Stop.
2. Report which file, why it is needed, and what is blocked without it.
3. Wait for the human to amend the contract.

Never add the file "just to make it work", never widen a directory prefix to
cover it, and never rewrite the allowlist yourself. A blocked unit reported
honestly is a better outcome than a completed unit that quietly grew.

Finishing the rest of the unit while one part is blocked is correct — do
everything that does not depend on the missing permission, then report exactly
what was left out and why.

---

## Step 4 — Focused verification

Run the commands the contract names, and only those. This unit's tests, not the
whole suite.

```sh
npm.cmd run lint:tsc
npm.cmd run build
# plus the unit's named specs / node --test targets
```

Then confirm the unit stayed inside its bounds:

```sh
node scripts/claude/verify-unit.mjs --allow <path> --allow <path> ...
git diff --check
```

A green build is **necessary, not sufficient**. If the contract requires runtime
evidence or screenshots, the unit is not verified until those exist.

Report failures with their actual output. Never claim a passing result you did
not observe.

---

## Step 5 — Independent read-only review

Where the unit's changes are relevant, request the matching reviewers. They are
read-only and report findings; they never fix.

| Change touches                                | Reviewer              |
| --------------------------------------------- | --------------------- |
| measurement, events, scoring, task structure  | `scientific-reviewer` |
| rooms, routes, interactions, participant copy | `gameplay-reviewer`   |
| anything requiring command execution          | `test-reviewer`       |
| screenshots or already-approved art           | `visual-reviewer`     |

Reviewer findings are **recommendations, not rulings**. A reviewer never approves
a scientific mapping, an event name, a formula or an asset.

Apply **bounded fixes** only: inside the allowlist, addressing cited findings.
**Maximum two review/fix rounds.** After the second round, stop and report the
open findings rather than starting a third.

Newly created agent files may need a fresh Claude session before they are
discoverable. If a reviewer cannot be invoked in the same session that created
it, that is a discovery limitation, not a defect — verify the file statically and
say plainly that a restart is required.

---

## Step 6 — Exactly one local commit

Stage each allowlisted file by explicit name:

```sh
git add <path-one>
git add <path-two>
git commit -m "<type>(<scope>): <subject from the contract>"
```

- **Never** `git add .`, `git add -A`, `git add -u`, or `git commit -a`.
- **Never** `--no-verify` or `--no-gpg-sign`. If a hook rejects the message, use
  the closest valid conventional-commit type and report the deviation.
- Exactly one commit. Create a new commit rather than amending.

---

## Step 7 — Stop before the human-only boundary

After the commit, **stop**. The following are human-only and Claude never
performs them:

**push · merge · tag · deploy · create a PR · delete a branch · remove or prune a
worktree · approve any scientific decision**

Do not begin the next unit. Do not "prepare" a push. Report and wait.

---

## Step 8 — Standardized handoff report

Close every unit with exactly this structure:

1. **Branch** and **base** (with the base checkpoint SHA)
2. **Commit SHA** and subject
3. **Changed files** — the exact list, matched against the allowlist
4. **What was built** — the objective in the observable terms of the result
5. **Events and scoring touched** — canonical names only; candidates marked
   provisional
6. **Verification results** — every command, its exit status, and its actual
   output summary; deterministic failures separated from flakes
7. **Reviewer findings** — resolved and unresolved, each cited
8. **Existing configuration preserved** — what was already there and was merged
   rather than overwritten
9. **Limitations and restart requirements** — stated accurately
10. **Deviations and things left out** — anything blocked, descoped or deferred,
    with the reason
11. **Confirmation of what did not change** — the prohibited trees
12. **Confirmation that nothing was pushed, merged, tagged, deployed, deleted or
    removed**

Report outcomes faithfully. If a step was skipped, say it was skipped. If tests
failed, show the output. Do not hedge a completed, verified result — and do not
report an unverified one as done.
