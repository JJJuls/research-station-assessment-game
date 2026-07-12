# Model-Independent Debugging Checklist

Ordered triage for any failure in this repository. Every entry is a
verified root cause from Wave 1 / Sprint A — check these BEFORE forming a
new hypothesis. Works for any model or human; no conversation context
required.

## 0. Before debugging anything

- `git status` — more than one uncommitted coherent unit means recover
  state first (checkpoint discipline).
- `npm.cmd run lint:tsc` — a type error explains most "weird" runtime
  behavior; Playwright timeouts on a broken build are noise.
- Is a dev server already on port 5173? Playwright reuses it
  (`reuseExistingServer`) — a stale server serves stale code; restart it
  after changing game source.

## 1. Playwright test fails

| Symptom                                                | First check                                                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| First test of a run times out in boot, no canvas       | SwiftShader launch args missing/removed from `playwright.config.ts` (WebGL fails on the first context of every fresh headless Chromium) |
| `waitForEventCount`/transition wait hangs forever      | Baseline captured AFTER the triggering action (count race) — must be before                                                             |
| Journey wedges mid-Hub at varying stations             | Bespoke route bypassing `hubToNorthWestAnchor`; console block / doorway pockets                                                         |
| Key press has no effect                                | Tap instead of hold (`JustDown` misses taps — hold ≥150 ms); or intro typewriter still active (prompts suppressed)                      |
| One-shot event asserted once, seen twice               | `completeReturnFlow` called mid-journey (it appends `objective_completed`); or session id reused across tests                           |
| Option assertion fails on text                         | Prettier/label drift is NOT possible (labels frozen) — you are asserting a paraphrase; use the room doc's exact label                   |
| `--grep` dies with `'C:\Program' is not recognized`    | Space in the grep pattern (Windows cmd quoting) — single-word patterns only                                                             |
| Event count/scene assertions off by one after re-entry | Using absolute counts instead of count-aware waits; re-entries increment per-entry events                                               |

## 2. Commit fails

- Pre-commit runs tsc + lint-staged. ESLint `no-console` rejects
  `console.log` in e2e — remove debug logging before committing.
- lint-staged REVERTS the staged state on failure — re-stage after fixing.
- Prettier reformats markdown/JSON on commit; a later `Edit` that fails to
  match means the on-disk file changed — re-read it.

## 3. Game misbehaves in browser

- Read the Vite client error stream / browser console FIRST (the historical
  "cold-Vite flake" was a renderer error visible there the whole time).
- Probe live state via the dev-only debug API: `window.researchRuntime`
  (`getEvents`, `getMissionState`, `getSummary`, `completeDebugSession`).
- Expected-value questions: writers→readers matrix in
  `docs/architecture/CROSS-ROOM-INTEGRATION.md`; lifetimes in
  `docs/architecture/STATE-AND-SESSION-CONTINUITY.md`; routes/spawns in
  `docs/architecture/transition-inventory.json`.
- `hazard_status` having no reader, the Hazard board line staying
  `pending`, and `unresolved_objectives` being empty are NOT defects —
  documented design (D1 / reserved vocabulary).

## 4. Node/tooling

- Node scripts resolve modules from the script's own path — debug scripts
  must live inside the repo (delete before commit).
- Shell is PowerShell 5.1 via an RTK hook — no `&&` chains in PowerShell
  syntax; Bash tool available for POSIX.

## 5. Before claiming "fixed"

1. Re-run ONLY the failing spec until green.
2. tsc + production build.
3. Full suite once (phase boundary or done-claim only).
4. Evidence: what failed, root cause, why the fix is safe, where verified.
5. A green build is necessary, not sufficient — runtime evidence required
   for any "works" claim (CLAUDE.md).
