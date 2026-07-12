# Cost-Controlled Agent Routing

Routing policy for AI work on Remote Outpost Assessment. Governs which model
tier handles which class of work, how reviewers are scheduled, and what gates
apply. This document controls _who does what_; the canonical build contract
(`docs/ai/fable-claude-final-game-build-contract-v3.txt`) still controls _what
is correct_, and `CLAUDE.md` still controls _how to work_. Nothing here relaxes
any scientific contract, scoring rule, or event-schema requirement.

## Model tiers and responsibilities

| Tier                   | Agent(s)                                                                                               | Responsibility                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fable (main agent)** | the interactive session itself                                                                         | Architecture and sequencing decisions, scientific interpretation of the Q01-Q33 contract, difficult implementation work, cross-room integration, and final synthesis of reviewer findings into decisions. Fable is never delegated away; it is the orchestrator. |
| **Sonnet**             | `research-data-reviewer`, `gameplay-implementation-reviewer` (and the gate-only `browser-qa-reviewer`) | The two substantive review passes: scientific/data-integrity review and gameplay/implementation review. Read-only findings reports; no edits, no commits, no nested agents.                                                                                      |
| **Haiku**              | `cheap-explorer`                                                                                       | Narrow read-only discovery only: file location, reference finding, inventories, concise factual summaries. Max 20 output lines. Never reviews, never judges, never edits.                                                                                        |

Model assignments are **explicit in each agent's frontmatter** (`model: sonnet`
/ `model: haiku`). Subagents must not silently inherit Fable, and conversely
this policy does **not** globally force all subagents to Haiku — each agent
carries its own assignment.

## Reviewer scope (summary)

- **`research-data-reviewer` (Sonnet, read-only, no shell):** scientific
  mappings, `study_item_ids` and `construct_id` correctness, canonical and
  legacy event names, success semantics, metadata completeness, append-only
  logging, scoring separation (adaptive vs. inappropriate persistence, no
  collapsed global score), Qualtrics contracts, and evidence completeness.
  Reports findings only.
- **`gameplay-implementation-reviewer` (Sonnet, read-only + verification
  shell):** routing, collisions, reachability, scene lifecycle, state
  restoration, transitions, controlled choices, cross-room integration,
  regression risks, and test evidence. May run the existing build, TypeScript,
  and test commands (`npm.cmd run build`, `npm.cmd run lint:tsc`, `npm.cmd run
lint`, existing tests); never edits or installs. Reports findings only.
- **`cheap-explorer` (Haiku, read-only, no shell):** discovery queries from the
  main agent that don't warrant Fable or Sonnet context.

## Scheduling rules

1. **Reviewers run sequentially.** One reviewer at a time, in the foreground.
   Never launch two reviewers in parallel, and never run a reviewer in the
   background while other work proceeds.
2. **No nested agents.** No agent in this setup may spawn subagents. Only the
   Fable main agent dispatches agents.
3. **RTK compresses shell output.** Shell/build/test output routed through the
   session is compressed by RTK; agents should not paste raw command output
   into reports beyond the lines needed as evidence.
4. **Concise outputs.** Reviewers return findings and evidence, not restated
   files or methodology narration; `cheap-explorer` is capped at 20 lines.

## Gated tooling

- **Playwright MCP** is disabled by default and enabled only at explicit
  runtime-verification gates requested by the user. `browser-qa-reviewer` (and
  the `playwright-game-verify` skill) operate only inside such a gate.
- **PixelLab MCP** stays disabled and is never invoked without explicit,
  standalone user approval for a specific asset pass
  (`pixellab-asset-pipeline` rules apply unchanged).

## Phase-transition checkpoints

Every phase transition (e.g. wave build -> review -> fix -> verify) requires:

1. a **clean Git working tree** on the working branch;
2. a **checkpoint commit** (and safety tag where the process calls for one)
   recording the phase's end state;
3. an explicit **repository handoff**: the next phase starts from that commit
   SHA, stated in the handoff report, so any phase can be rolled back to a
   known-good checkpoint (e.g. `wave-1b-verified-89e9597`).

No reviewer or explorer output may be acted on across a phase boundary without
that checkpoint existing first.

## Non-negotiables preserved

All scientific contracts remain in force regardless of which tier does the
work: Q01-Q33 traceability, no questionnaire-wording leakage, adaptive vs.
inappropriate persistence separation, exploratory-proxy labelling, no collapsed
global score, append-only raw event logging, and the Qualtrics launch/return
contract.
