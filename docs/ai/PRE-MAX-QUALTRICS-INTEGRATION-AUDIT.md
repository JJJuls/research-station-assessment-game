# Pre-Max Qualtrics Integration Audit

Read-only architecture, evidence, and readiness audit of the complete research
deployment flow, produced to seed the upcoming Fable Max 5× integration sprint.
Companion contract: `docs/integration/QUALTRICS-END-TO-END-CONTRACT.md`.

> **Decision package (Unit 0) — added after this audit.** The user-owned
> decisions this audit surfaced (§8) are now decomposed into options,
> consequences, evidence-cited recommendations, and copy-paste ruling forms:
> `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` (INT-1 return
> mechanism, INT-2 raw-event export channel, INT-5 status taxonomy),
> `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md` (D2 / Beat-13 scoring),
> and `docs/decisions/RESEARCH-OWNER-RULING-FORM.md` (the form that issues the
> binding rulings). Every recommendation there is marked **RECOMMENDATION ONLY —
> NOT YET AUTHORISED**; no decision is adopted and no implementation has begun.
> Unit 0 completes when the ruling form is signed off.

> **Privacy/security gate — added after this audit.** A dedicated pre-pilot
> privacy, security and data-governance gate now extends this audit's §7 P0/P1
> register into a privacy/security `PS-0..PS-13` register with a data
> inventory, data-flow/trust-boundary model, an implementation-ready constraint
> set for the Max sessions, per-option (INT-1/2/5/D2) compatibility, and
> distinct L1–L4 readiness gates:
> `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`,
> `docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md`,
> `docs/operations/PILOT-DATA-GOVERNANCE-CHECKLIST.md`. It confirms this audit's
> deployment finding (the participant bundle strips the external `unpkg`
> dependency and GitHub ribbon; the ordinary build does not) and adds a
> Privacy/Security addendum (PSA-1..PSA-4) to the ruling form. No option or
> scientific decision was adopted.

## 1. Executive assessment

The **research data spine is sound**: launch parsing, immutable pseudonymous
identity, condition read-through, the full V3 §3.2 event payload, twelve-field
mission state, and — critically — a **pure, non-destructive scoring derivation**
that never mutates or discards the raw event log. The skill's primary invariant
(raw logs never overwritten by summaries) **holds**. The debug API is intact and
extended read-only. The Hazard D1 ruling is correctly implemented on the live
path.

The **deployment/return half of the pipeline does not exist in production**. The
only completion→summary→return→export routine (`completeDebugSession`) lives on
the `import.meta.env.DEV`-gated `window.researchRuntime`. A `vite build` artifact
never installs it, no code navigates to `return_url`, and raw events never leave
the browser (in-memory only; no `localStorage`/server sink). As built, a
production deployment sends **nothing** back to Qualtrics and loses all events on
reload. This is **known and decision-gated** (V3 Beat 14 "Qualtrics return
preview", backlog #6, gated on Beat-13/D2) — not a regression — but it is the
central P0 cluster the Max sprint must close, and much of it is **blocked on
user scientific/architecture decisions**, not just implementation.

**Verdict: NOT pilot-ready.** Two independent gates block an unsupervised pilot:
(1) the production completion/return/export path (P0, part decision-gated); and
(2) the Beat-13/D2 scoring bundle, which the decision brief already marks
"REQUIRED BEFORE ANY DEPLOYMENT". A tightly-supervised internal dev-server test
is possible today via the debug API.

## 2. Exact repository checkpoint

- Branch: `fable-autonomous-game-build-v1` (72 ahead of origin; nothing pushed).
- HEAD at audit start: `0c3529c` (ADV-5 status-board spec), clean tree.
- Protected branch `fable-final-game-prep-from-prototype @ e8a8994` — untouched.
- ADV-1…ADV-8 present in the last-10 log; all four P0 + all four P1 adversarial
  cases complete (per `FABLE-SPRINT-B-PART1-HANDOFF.md`).
- Test inventory: **49 tests / 22 spec files** (confirmed by `e2e/*.spec.ts`
  count). Full-suite run deferred to the Part-1 phase boundary (not run here).
  **Update (`474b7ee`, OPUS technical gate):** the full suite has since been
  run green **×2** (49/49, 0 retries, ~46 min each) with a passing production-
  artifact smoke — see `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`.
- Verification this audit: `npm.cmd run lint:tsc` **clean**; `npm.cmd run build`
  **passed** (89 modules, 1.92 s); `git diff --check` clean (docs-only changes).
- No uncommitted/unexpected tracked files at start; ignored artifacts only
  (`dist/`, `node_modules/`, `test-results/`, `.playwright-mcp/`,
  `.claude/settings.local.json`, `.husky/_/`).

## 3. Investigation scope

Reviewed: `src/systems/{EventLogger,SessionState,QualtricsBridge,ScoringManager,
ResearchRuntime,DataQualityTracker}.ts`, `src/world/{SceneRouter,RoomScene,
CanonicalEventContext}.ts`, `src/index.ts`, `src/scenes/*Scene.ts` + `Main.tsx`
(wiring only), `index.html`, `vite.config.mts`, `tsconfig.json`, `package.json`,
`scripts/bundle.sh`, `.env`, `.gitignore`, `playwright.config.ts`, the relevant
`e2e/*.spec.ts`, and the authoritative docs (V3 §3/§6/§9, event-schema,
scoring-plan, the two handoffs, `WAVE1-USER-DECISION-BRIEF.md`,
`ACTIVE-EXPANSION-STATE.md`). Grounded searches: persistence, return navigation,
runtime call sites, hazard event names, external network refs, sequence numbers.

## 4. Current end-to-end flow (one line per stage)

| Stage                    | Where                                                   | Status            |
| ------------------------ | ------------------------------------------------------- | ----------------- |
| Qualtrics launch URL     | (Qualtrics-side)                                        | [contract only]   |
| Query-param parse        | `QualtricsBridge:14-22`, `SessionState:44-55`           | [impl+verified]   |
| Participant/session init | `SessionState.metadata` (immutable, defensive copy)     | [impl+verified]   |
| Condition assignment     | read-through only; game never assigns                   | [impl+verified]   |
| Gameplay state           | `SessionState.missionState` (12 fields), room writers   | [impl+verified]   |
| Events                   | `EventLogger` append-only, full §3.2 payload            | [impl+verified]   |
| Score derivation         | `ScoringManager.computeSummary` (pure, non-destructive) | [impl+verified]   |
| Completion payload       | `completeDebugSession` (**DEV only**)                   | [missing in prod] |
| Event & score export     | `exportEventsJSON`/return-URL (**DEV only**)            | [missing in prod] |
| Return to Qualtrics      | `buildReturnUrl` built but **never navigated** in prod  | [missing in prod] |
| Downstream dataset       | summaries-only, once return exists; raw never exported  | [blocked/missing] |

## 5. Repository evidence (key anchors)

- No production return/export: `ResearchRuntime.ts:189-208` (DEV gate),
  `163-187` (`completeDebugSession`), `index.ts:10`; `FinalCoreScene.ts:326-327`
  (marks complete, no return). Grep: `buildReturnUrl` only in
  `QualtricsBridge.ts` + `ResearchRuntime.ts`.
- No persistence: zero `localStorage|sessionStorage` matches in `src/`;
  `SessionState`/`EventLogger`/`DataQualityTracker` in-memory.
- Empty-identity: `SessionState.ts:45-49` (`?? fallback`); frozen by
  `adversarial_hostile_launch.spec.ts:53-78`.
- Raw/summary separation intact: `ScoringManager.ts:75-224` reads a read-only
  `events` slice, mutates nothing; `EventLogger.getEvents` deep-copies out.
- Hazard D1: `HazardScene.ts:193` (both events), `CanonicalEventContext.ts:233`
  (`hazard_route_avoided: { study_item_ids: [] }`), `ScoringManager.ts:88`
  (`abandonment_count` = `hazard_avoidance`).
- Dual hazard impl: `Main.tsx:863` prototype emits **only** `hazard_avoidance`
  (no `hazard_route_avoided`); prototype is `?scene=prototype`, not the
  participant path (`SceneRouter.ts:14-31`).
- External build deps: `index.html:22-39,46-53`; confirmed present in
  `dist/index.html` after `vite build`; stripped only by `scripts/bundle.sh`
  (`BUNDLE=true … --base=./`).
- No `base`: `vite.config.mts` (absent). `asset_set_version`: `constants/assets.ts:9`,
  banner-only at `index.ts:20`.
- Playwright targets dev: `playwright.config.ts:17,30`.

## 6. Gap matrix

| Flow stage       | Contract       | Implementation       | Test           | Gap class               |
| ---------------- | -------------- | -------------------- | -------------- | ----------------------- |
| Launch parse     | V3 §3.4        | full                 | yes            | none                    |
| Identity         | V3 §3.2        | full                 | yes            | empty-identity decision |
| Condition        | V3 §1          | read-through         | yes            | none                    |
| Mission state    | V3 §3.1        | full                 | yes            | none                    |
| Events           | V3 §3.2        | full payload         | yes            | no seq #, no dedup      |
| Scoring          | V3 §6          | Wave-1 (pre-Beat-13) | yes            | Beat-13/D2 blocked      |
| Completion       | V3 §3.3/Beat14 | DEV only             | dev only       | **missing in prod**     |
| Return           | V3 §3.4/Beat14 | build-only, no nav   | dev only       | **missing in prod**     |
| Raw export       | skill/§6       | DEV only             | dev only       | **missing channel**     |
| Persistence      | (none stated)  | in-memory            | frozen-as-loss | **missing/decision**    |
| Dataset/codebook | —              | —                    | —              | **missing doc**         |
| Deploy shell     | —              | template leftovers   | none           | privacy/config          |

## 7. P0 / P1 / P2 issue register

Severity: **P0** blocks reliable pilot/data collection (loss, misID, invalid
scoring, irreproducibility, privacy, broken return). **P1** must resolve before
unsupervised pilot. **P2** improvement/resilience.

### P0

**P0-1 — No production completion→return→export path.**
Class: missing implementation (+ user decision on mechanism). Deployment impact:
total — Qualtrics receives nothing in a `vite build`. Research impact: no data
leaves the browser. Owner: **user decision (mechanism) → Max top-tier (impl)**.
Prereq decisions: production return mechanism; Beat-13/D2 (upstream, Beat 14).
Acceptance: in a `PROD` build, the terminal room fires a completion that
finalises the summary and (if `return_url`) returns the participant with all
embedded-data fields, with participant-visible failure handling. Verify: hosted
`preview` round-trip + a `PROD`-mode automated check. Evidence: §5.

**P0-2 — Raw events never exported in production; scores not reproducible.**
Class: scientific-validity risk (+ user decision on channel). Impact: the
downstream dataset would hold only derived summaries; the raw events they derive
from never reach it. Owner: **user decision (channel) → Max**. Prereq: choose
raw-event export channel (server POST / file / Qualtrics field / accept
summaries-only). Acceptance: every exported summary variable is reproducible from
exported raw data, OR the study formally records summaries-only. Verify:
reproduce a summary from an exported raw log offline. Evidence: `EventLogger`
in-memory, `exportEventsJSON` DEV-only.

**P0-3 — No state/event persistence; reload/crash loses all data.**
Class: verified technical risk (+ user decision on requirement). Impact: an
unsupervised participant refresh/crash silently loses the session. Owner:
**user decision (is recovery required?) → Max**. Acceptance: either durable
per-event persistence + resume, OR a formally accepted no-reload design with
participant guardrails (e.g. `beforeunload` warning). Verify: reload mid-session
and confirm the decided behaviour. Evidence: zero persistence in `src/`, ADV-2.

**P0-4 — Beat-13/D2 scoring bundle not landed (deployment-gating).**
Class: user-owned scientific decision → then implementation. Impact: the decision
brief marks D2 "REQUIRED BEFORE ANY DEPLOYMENT"; `final_core_force_continue` is
unscored, `strategy_revision_count` keeps documented construct-mixing, exploratory
proxies unlabelled, no scoring-version stamp. Owner: **user (D2 ruling) →
top-tier Max under `qualtrics-logging-review` + `research-data-reviewer`**.
Acceptance: per the ruled D2 scope; mandatory re-review. Verify: `final_core_summary.spec.ts`
Beat-13 additions. Evidence: `WAVE1-USER-DECISION-BRIEF.md` §D2.

### P1

**P1-5 — Empty-string launch identity bypasses fallback.**
Class: verified technical defect / user-owned intended behaviour. Impact:
`?participant_id=` → empty `participant_id`/`game_session_id` on every event and
in the summary → participant misidentification. P0 **if** a real Qualtrics launch
can emit an empty value; P1 if Qualtrics always populates. Owner: **user
(desired handling) → Max (Unit 1)**. Acceptance: empty identities are handled per
ruling (fall back / reject / flag) and enforced in `SessionState`. Verify: extend
`adversarial_hostile_launch.spec.ts`. Evidence: `SessionState.ts:45-49`.

**P1-6 — Default `build` ships external unpkg script + GitHub ribbon (+ base path).**
Class: deployment/config + privacy. Impact: participant browsers make an external
request to `unpkg.com` and see a ribbon to `remarkablegames/phaser-rpg`;
`vite build` also uses base `/` (breaks subpath hosting), while `npm run bundle`
uses `--base=./` and strips the script. The documented "production build" is not
the deployment build. Owner: **Sonnet/config (Unit 5)**. Acceptance: one
documented deployment command produces an artifact with no external network deps
and correct base. Verify: grep `dist/index.html` for external hosts (none).
Evidence: `index.html:22-39`, `bundle.sh`, `dist/index.html`.

**P1-7 — No completion-status taxonomy for Qualtrics.**
Class: missing contract/implementation. Impact: only `completed: boolean`; a
quit-mid-game participant never returns, so Qualtrics cannot distinguish
incomplete / failed / test. Owner: **user (taxonomy) → Max (Unit 3)**.
Acceptance: the return payload carries an explicit status field distinguishing
completed/incomplete/failed and flags test/pilot sessions. Verify: return-flow
spec asserts the status field. Evidence: `ScoringManager.ts:5-65`, `QualtricsBridge`.

**P1-8 — `asset_set_version` not in event/summary payloads.**
Class: missing implementation / traceability (touches frozen schema → needs
authorisation). Impact: per-record stimulus provenance not exportable. Owner:
**user (authorise field add) → Max**. Acceptance: `asset_set_version` on the
summary (and/or events) once authorised. Verify: assert the field. Evidence:
`constants/assets.ts:9`, `index.ts:20`, payload has none.

**P1-9 — No event sequence numbers; ordering by push order + ms timestamp.**
Class: potential integrity gap + missing test coverage. Impact: ms-granular ties
under rapid input rest on array order only; the append-only invariant harness
(ADV-9) is unimplemented. Owner: **Max (Unit 2)**. Acceptance: a monotonic
per-event sequence number (additive field) and/or an append-only invariant spec.
Verify: ADV-9 harness. Evidence: `EventLogger.ts`, ADV plan.

### P2

**P2-10 — Stale production HTML/template metadata.** Wrong `<title>Phaser RPG`,
template `<meta description>`, template PWA assets (`manifest.json`, `logo192`,
apple-touch), inert `gtag` scaffolding, `package.json` name/author/homepage.
Class: documentation/config (title is participant-visible). Owner: Sonnet/config
(Unit 5). Evidence: `index.html`, `package.json`.

**P2-11 — Prototype hazard path diverges from D1.** `Main.tsx` (`?scene=prototype`)
emits only legacy `hazard_avoidance`, not canonical `hazard_route_avoided`. Class:
accepted limitation (prototype is not the participant path) — recommend a guard or
explicit doc callout so it can never be a live launch. Evidence: `Main.tsx:863`.

**P2-12 — 1.37 MB single JS chunk (no code-splitting).** Class: accepted
limitation; load performance on slow participant connections. Evidence: build log.

**P2-13 — No global error boundary wiring uncaught errors to
`recordTechnicalError()`.** Class: resilience/coverage. Evidence: `DataQualityTracker.ts`.

## 8. Scientific-decision register (user-owned — do NOT decide)

| Id    | Decision                                                        | Blocks              | Source              |
| ----- | --------------------------------------------------------------- | ------------------- | ------------------- |
| D2    | Beat-13 scoring bundle (4 sub-items)                            | **any deployment**  | brief §D2           |
| D3    | Dock idle threshold/definition                                  | freeze/pilot        | brief §D3           |
| D4    | Q24/Q25 abandon/return `construct_id`                           | freeze              | brief §D4           |
| D5    | `engineer_report_submitted_supervised` mapping                  | non-blocking        | brief §D5           |
| D6    | `interruption_alert_acknowledged` mapping                       | non-blocking        | brief §D6           |
| D7    | `task_started` Q05/Q15 listing                                  | event-schema freeze | brief §D7           |
| D8    | Stimulus-freeze asset dispositions (item 1 MAJOR)               | pilot               | brief §D8           |
| INT-1 | Production return **mechanism** (redirect/button/poll)          | P0-1                | V3 §3.4, this audit |
| INT-2 | Raw-event **export channel** (server/file/field/summaries-only) | P0-2                | this audit          |
| INT-3 | Empty-identity handling                                         | P1-5                | ADV-6 handoff       |
| INT-4 | Non-`http(s)` return-scheme handling                            | P1-6/return         | ADV-6 handoff       |
| INT-5 | Completion-status taxonomy (complete/incomplete/failed/test)    | P1-7                | this audit          |
| INT-6 | Authorise `asset_set_version` payload field                     | P1-8                | this audit          |

## 9. Privacy / data-handling register

- Pseudonymous ids only; no PII collected by the game. [OK]
- Identities + `return_url` in URL/history/referrer. [note — host logging posture]
- External `unpkg` request + GitHub ribbon in default build. [P1-6]
- Inert `gtag` scaffolding + empty GA id — remove for research build. [P2-10]
- Debug/console output DEV-only. [OK]
- No data-retention/deletion policy documented (dataset governance owned by the
  study, not the game). [note]

## 10. Deployment register

- Two build commands with different artifacts: `vite build` (base `/`, external
  script kept) vs. `npm run bundle` (`--base=./`, script stripped, zips `dist/`).
  Deployment artifact is **undocumented/contradictory**. [P1-6]
- No `base` in `vite.config.mts`; static subpath hosting needs `./` or an explicit
  base. [P1-6]
- No `.env.production`; `VITE_APP_VERSION` = `package.json` `1.0.0-alpha`. [note]
- Vite default (no sourcemaps in prod; source not exposed). [OK]
- HTTPS assumed (Qualtrics embeds require it); no code assumption audited as
  broken. [note] No hosted round-trip has been run. [gap — Unit 5]

## 11. Automated-test coverage matrix

| Area                              | Spec(s)                                             | Verifies                                                                    | Coverage                    |
| --------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| Launch/params/debug API           | `launch_with_research_params`                       | 5-param parse, 7-method surface, dev return-URL preview, append-on-complete | dev only                    |
| Identity isolation                | `adversarial_session_isolation` (ADV-1)             | no cross-participant bleed                                                  | good                        |
| Reload                            | `adversarial_reload_partial_state` (ADV-2)          | loss (not recovery) frozen                                                  | freezes gap                 |
| Hostile launch/return             | `adversarial_hostile_launch` (ADV-6)                | dup/oversized/encoded/empty params, relative/blank/`javascript:` return     | good (dev)                  |
| Input spam                        | `adversarial_input_spam` (ADV-7)                    | one decision set, monotonic ts                                              | good                        |
| Direct launch→nav                 | `adversarial_direct_launch_navigation` (ADV-8)      | recovery route, metadata intact                                             | good                        |
| Hazard repeat                     | `adversarial_hazard_repeat_decisions` (ADV-4)       | last-write status, `abandonment_count`                                      | good                        |
| Status board                      | `adversarial_status_board_display` (ADV-5)          | board vs `getMissionState` byte-for-byte                                    | good                        |
| Per-room logging                  | `*_logging.spec.ts`, `final_core_summary`           | event emission per room                                                     | good                        |
| Lifecycle/continuity              | `participant_lifecycle`, `state_session_continuity` | metadata, store lifetimes                                                   | good                        |
| **Prod completion/return/export** | —                                                   | —                                                                           | **NONE (path is DEV-only)** |
| **Hosted Qualtrics round-trip**   | —                                                   | —                                                                           | **NONE**                    |
| **Raw-event export to dataset**   | —                                                   | —                                                                           | **NONE**                    |
| **Append-only invariant (ADV-9)** | —                                                   | —                                                                           | **planned, not built**      |

## 12. Pilot-readiness blockers (must clear before unsupervised pilot)

1. P0-1 production completion/return/export path (incl. INT-1 mechanism).
2. P0-2 raw-event export / reproducibility (incl. INT-2 channel).
3. P0-3 reload/crash data-loss decision + guardrail.
4. P0-4 Beat-13/D2 scoring bundle (deployment-gating per the brief).
5. P1-5 empty-identity handling (INT-3); P1-6 deployment build/privacy; P1-7
   completion-status taxonomy (INT-5).
6. D3 + D8-item-1 (freeze/pilot gates), hosted round-trip verification.

## 13. Recommended model / owner allocation

- **User (decisions first — unblock everything)**: D2, INT-1…INT-6, D3, D8-item-1.
- **Max top-tier (scoring + return)**: P0-1, P0-2, P0-4 (under `qualtrics-logging-review`
  - `research-data-reviewer`), P1-7, P1-8.
- **Max / Sonnet (state + events)**: P0-3, P1-5, P1-9.
- **Sonnet / config**: P1-6, P2-10..P2-13, hosted round-trip (Unit 5).
- **Review-only agents**: `research-data-reviewer`, `qualtrics-logging-review`,
  `browser-qa-reviewer` at each unit boundary.

## 14. Phased implementation plan (Max 5× sprint)

Dependency-aware; each unit is one bounded commit. Units 1–3 assume the relevant
INT/D decisions are ruled first (a decision unit may precede them).

**Unit 0 (user, no code): rule INT-1, INT-2, INT-5 + D2 scope.** Prereq for all
of return/export. Stopping: decisions recorded in the decision brief.

### Unit 1 — Launch params, identity, validation

- Objective: harden identity — resolve INT-3 (empty-identity), optional
  `condition` allow-list, no truncation regressions.
- Prereq: INT-3 ruling. Authorised scope: `SessionState.ts` identity handling +
  targeted spec. Prohibited: scoring, event names, Qualtrics contract, stimuli.
- Files: `src/systems/SessionState.ts`, `e2e/adversarial_hostile_launch.spec.ts`.
- Tests: extend the hostile-launch spec for the ruled empty-identity behaviour.
- Acceptance: ruled behaviour enforced + verified; tsc + build green.
- Commit boundary: one commit. Stopping: after identity unit. Model: Sonnet/Max.

### Unit 2 — Event persistence, sequencing, duplicate prevention, recovery

- Objective: durable per-event persistence (channel per INT-2 if server; else
  local buffer), monotonic sequence numbers (additive field), append-only
  invariant harness (ADV-9), reload/crash handling per P0-3 ruling.
- Prereq: INT-2, P0-3 rulings. Authorised: `EventLogger.ts` (additive seq +
  persistence hook), a new persistence adapter, `ResearchRuntime` wiring.
  Prohibited: mutating existing event semantics/names; scoring.
- Tests: ADV-9 append-only harness; reload-recovery spec (replaces the
  frozen-as-loss assertion per ruling).
- Acceptance: events survive reload per ruling; seq monotonic; tsc + build green.
- Commit boundary: one commit. Model: Max.

### Unit 3 — Completion payload, score/event export, Qualtrics return

- Objective: production completion trigger from `FinalCoreScene` → finalise
  summary → build & navigate `return_url` (mechanism per INT-1) with
  completion-status taxonomy (INT-5); export raw per INT-2; participant-visible
  failure handling.
- Prereq: Units 0–2, Beat-13/D2 (P0-4) for final summary shape. Authorised:
  `QualtricsBridge.ts`, `ResearchRuntime.ts`, `FinalCoreScene.ts`, a completion
  UI. Prohibited: changing subindex formulas outside the ruled D2 scope; renaming
  embedded-data fields.
- Tests: production-mode completion/return spec; return-status spec.
- Acceptance: `PROD` build returns to Qualtrics with all fields + status; raw
  exported; tsc + build green; `qualtrics-logging-review` pass.
- Commit boundary: one commit. Model: Max top-tier.

### Unit 4 — Malformed launches, reloads, re-entry, duplicate sessions, return failures

- Objective: adversarial coverage of the now-live production paths (INT-4 non-http
  scheme handling, duplicate returns, blocked navigation, re-entry).
- Prereq: Unit 3. Authorised: specs + minimal guards only.
- Acceptance: all edge behaviours ruled + asserted; tsc + build green.
- Commit boundary: one commit. Model: Sonnet/Max.

### Unit 5 — Deployment build, hosted round-trip, environment separation

- Objective: single documented deployment command producing a no-external-dep,
  correct-base artifact; fix HTML shell metadata (P2-10); hosted Qualtrics→game→
  Qualtrics round-trip.
- Prereq: Unit 3. Authorised: `index.html`, `vite.config.mts`, `scripts/`,
  deployment docs. Prohibited: `package.json` dep changes without explicit
  approval; scientific content.
- Acceptance: `grep dist/index.html` shows no external hosts; hosted round-trip
  verified; tsc + build green.
- Commit boundary: one commit. Model: Sonnet.

### Unit 6 — Dataset/codebook verification and scoring reproducibility

- Objective: 1:1 codebook ↔ `GameSummaryVariables` map; reproduce every summary
  var from an exported raw log; version + scoring stamps.
- Prereq: Units 2–3, Beat-13/D2. Acceptance: reproduction script matches
  production output. Model: Max + `research-data-reviewer`.

### Unit 7 — Full regression + formal pilot-readiness gate

- Objective: full Playwright suite (prod + dev), all P0/P1 closed, freeze gates
  (D3, D8-1) cleared. Acceptance: green suite + signed readiness checklist.
  Model: Sonnet + user gate.

## 15. Verification commands

```
npm.cmd run lint:tsc          # tsc --noEmit (must be clean)
npm.cmd run build             # vite build (must pass)
npm.cmd run bundle            # deployment artifact (BUNDLE=true, --base=./)
npm.cmd run preview           # serve a built artifact for a round-trip
npx playwright test e2e/<one>.spec.ts   # targeted only during a unit
git diff --check              # whitespace/conflict hygiene
grep -oE "unpkg\.com|github\.com" dist/index.html   # external-dep check
```

Do **not** run the full ~30-min Playwright suite or the ~10-min ADV-5 spec during
a unit; reserve the full suite for Unit 7 / phase boundary.

## 16. Rollback and recovery considerations

- All work is local on `fable-autonomous-game-build-v1`; nothing pushed. Each unit
  is one revertable commit. Never touch the protected branch `e8a8994`.
- `ScoringManager`/`QualtricsBridge`/`CanonicalEventContext` changes are the
  highest-risk (data integrity) — gate each behind `qualtrics-logging-review` and
  keep them isolated so a single `git revert <sha>` restores the prior contract.
- Persistence (Unit 2) must be additive: never let a persistence/adapter path
  mutate or drop the in-memory raw log (the skill's forbidden class).

## 17. Explicit exclusions (not done in this audit)

No production behaviour changed; no scientific content, stimuli, event names,
scoring formulas, or Qualtrics field names altered; no isolated code correction
applied (none met the "unambiguously authoritative intended behaviour" bar — every
candidate is user-decision-gated). No full Playwright suite, ADV-5 spec, hosted
deployment, or real Qualtrics collection run. No subagents, MCP, push, merge,
rebase, reset, or branch switch. No `package.json`/lockfile changes.

## 18. Final audit conclusion

The data-capture spine is trustworthy and the raw/summary invariant holds; the
**return/export/deployment half is absent in production and substantially blocked
on user decisions** (INT-1, INT-2, INT-5, D2) before any code can be written
correctly. The next sprint must begin with **Unit 0 (user decisions)**, then
proceed Unit 1→7. A fresh Fable session can start Unit 1 immediately from the
audit commit using §19 below without repeating discovery.

---

## 19. First Max 5× session prompt (copy-paste)

```
Perform exactly ONE bounded implementation unit: Unit 1 — Launch parameters,
participant/session identity, and validation — from
docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md §14. Do not begin any other unit.

Start state:
- repo: C:\Users\Juls\Desktop\research-station-assessment-game
- branch: fable-autonomous-game-build-v1 (the audit commit); working tree clean.
- Read first, in order: docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md (§7 P1-5,
  §8 INT-3, §14 Unit 1), docs/integration/QUALTRICS-END-TO-END-CONTRACT.md (§5,
  §6), CLAUDE.md, docs/ai/fable-claude-final-game-build-contract-v3.txt §3.2/§3.4,
  docs/expansion/reviews/WAVE1-USER-DECISION-BRIEF.md.

Prerequisite decision (INT-3): before writing code, confirm the user's ruling for
empty-string launch identities (?participant_id= → ''). If the ruling is NOT on
record in the decision brief, STOP and ask; do not invent handling. Documented
current behaviour: SessionState.ts:45-49 uses `?? fallback`, which guards only
null/undefined, so empty strings pass through verbatim
(adversarial_hostile_launch.spec.ts:53-78 freezes this).

Authorised scope (only):
- src/systems/SessionState.ts — enforce the ruled empty-identity behaviour
  (fall back to a generated id / reject / flag) for participant_id and
  game_session_id. Additive/minimal; keep the immutable-metadata + defensive-copy
  design; do not change game_version/condition fallbacks unless the ruling says so.
- e2e/adversarial_hostile_launch.spec.ts — update the empty-identity assertions to
  the ruled behaviour; add a case if the ruling adds a flag/field.

Preserve scientific invariants — do NOT touch: event names/semantics, study_item_ids,
construct_id, scoring formulas/weights, ScoringManager, QualtricsBridge,
CanonicalEventContext, Qualtrics embedded-data field names, stimuli, task options,
or any D2–D8 decision.

Prohibited: subagents/Task, MCP/PixelLab/Playwright-MCP, push, merge, rebase,
reset, branch switch, protected-branch edits, package.json/lockfile changes,
npm install, running the full Playwright suite or the ADV-5 spec, starting any
other unit.

Required verification before claiming done:
- npm.cmd run lint:tsc (clean)
- npm.cmd run build (passes)
- npx playwright test e2e/adversarial_hostile_launch.spec.ts (targeted, passes)
- git diff --check (clean); review every changed file.

Documentation: update docs/integration/QUALTRICS-END-TO-END-CONTRACT.md §5/§6 and
docs/expansion/ACTIVE-EXPANSION-STATE.md to reflect the ruled+enforced behaviour.

Finish: exactly ONE local commit (no push) with a descriptive message; report the
SHA, branch, clean tree, changed files, and the exact next unit (Unit 2). Then STOP.
```
