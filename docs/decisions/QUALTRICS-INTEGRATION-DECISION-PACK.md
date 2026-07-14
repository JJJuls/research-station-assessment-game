# Qualtrics Integration Decision Pack — INT-1, INT-2, INT-5

Bounded, evidence-grounded **pre-implementation** decision package for the three
integration decisions that block the production completion/return/export path.
This document **prepares** rulings; it **adopts none**. Every recommendation is
marked **RECOMMENDATION ONLY — NOT YET AUTHORISED**. The research owner issues
binding rulings via `docs/decisions/RESEARCH-OWNER-RULING-FORM.md`.

- **Repository checkpoint**: branch `fable-autonomous-game-build-v1`, HEAD
  `24afcad` (`docs(gate): opus overnight pre-pilot technical gate`), clean tree.
- **Companion analyses (authoritative evidence)**:
  `docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md` (audit §5 evidence anchors,
  §7 P0/P1 register, §8 decision register),
  `docs/integration/QUALTRICS-END-TO-END-CONTRACT.md` (§12 completion, §13
  return, §14 dataset, §16 failure), `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`
  (§10–§13 artifact/runtime evidence).
- **Scientific sibling**: `docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md`
  (D2 governs the _shape_ of the summary these mechanisms transport; INT-1/2/5
  are the transport, D2 is the payload science).

---

## 0. Authority and evidence hierarchy

Decisions are settled against this order of authority (highest first):

1. **External ethics / institutional / legal policy** — NOT in the repository.
   Flagged throughout as _external verification requirements_, never asserted as
   settled facts (IRB data-handling, hosting jurisdiction, retention/deletion,
   participant consent copy).
2. **V3 canonical contract** — `docs/ai/fable-claude-final-game-build-contract-v3.txt`
   §3.2 (event payload), §3.3 (debug API), §3.4 (launch/return: _"prepare/preview
   summary variables for Qualtrics without overwriting raw logs"_), §6 (scoring),
   §10 Beat 14 (Qualtrics return/summary preview).
3. **Current implementation** — the live source is authoritative for _what the
   game does today_ (`src/systems/QualtricsBridge.ts`, `ResearchRuntime.ts`,
   `EventLogger.ts`, `SessionState.ts`, `ScoringManager.ts`,
   `src/scenes/FinalCoreScene.ts`).
4. **Integration contract + audit + technical gate** — descriptive of current
   behaviour and the required target; do not themselves decide open questions.
5. **This pack** — options and recommendations only; adopts nothing.

_Fact vs inference is labelled inline throughout: `[FACT: <path:line>]` = verified
from source/evidence; `[INFERENCE]` = reasoned consequence; `[EXTERNAL]` = must be
verified outside the repository._

---

## 1. Current production gap (shared root cause for INT-1/2/5)

`[FACT]` The **launch → gameplay → event → in-memory-score** half of the pipeline
is implemented and verified. The **completion → return → export** half exists
**only** on the DEV-gated `window.researchRuntime` debug API and is **absent from
any `vite build` / PROD artifact**.

| Element                                               | Status                                          | Evidence                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `return_url` parsed at launch                         | present                                         | `QualtricsBridge.ts:14-22` (parses 5 params)                                                                  |
| Summary built from raw events (pure, non-destructive) | present                                         | `ResearchRuntime.getSummary` `:107-115`; `ScoringManager.computeSummary` `:75-224`                            |
| Return URL builder (`buildReturnUrl`)                 | present but **only invoked by DEV path**        | `QualtricsBridge.ts:28-46`; sole caller `completeDebugSession` `ResearchRuntime.ts:175`                       |
| Completion trigger in the terminal room               | **absent** — marks state only, no return/export | `FinalCoreScene.ts:326-327` (sets `final_core_status`, no completion payload)                                 |
| Code that **navigates** to `return_url`               | **absent in PROD**                              | grep: `buildReturnUrl` only in `QualtricsBridge.ts` + `ResearchRuntime.ts`; no `location.assign/href =` to it |
| Raw-event export channel                              | **DEV only** (`exportEventsJSON`)               | `ResearchRuntime.ts:159-161`, installed only under `import.meta.env.DEV` `:190,196`                           |
| Any persistence (localStorage/IndexedDB/server)       | **none**                                        | audit §5: zero `localStorage\|sessionStorage` in `src/`; `EventLogger` in-memory `:34-52`                     |
| Completion-status field beyond `completed: boolean`   | **none**                                        | `ScoringManager.ts:10` (`completed: boolean` is the only status)                                              |
| DEV surfaces in PROD bundle                           | correctly **stripped**                          | gate §12 (`researchRuntime` 0 hits in prod JS)                                                                |

`[INFERENCE]` Consequence: **as built today, a production deployment returns
nothing to Qualtrics and loses every raw event on reload/close.** This is
_known and decision-gated_ (V3 Beat 14, gated on Beat-13/D2) — not a regression —
but it is the P0 cluster (audit §7 P0-1, P0-2, P0-3, P1-7). INT-1/INT-2/INT-5 are
the three user-owned rulings that must be issued before this half can be written
correctly.

---

## 2. Shared assumptions (apply to all three decisions)

- `[FACT]` Launch is via a hosted URL with query params
  `participant_id, game_session_id, condition, return_url, game_version`
  (`QualtricsBridge.ts:14-22`, contract §4/§5). Identity is pseudonymous; **no
  PII** is collected by the game (contract §17).
- `[FACT]` HTTPS is assumed (Qualtrics embeds require it); no code asserts
  otherwise (audit §10).
- `[FACT]` `buildReturnUrl` resolves _relative_ `return_url` against the app
  origin and appends **every** `GameSummaryVariables` key as a query param; it
  returns `null` on null/empty/whitespace/unparseable URL and does **not** enforce
  `http(s)` (`QualtricsBridge.ts:28-46`; INT-4, separate ruling).
- `[FACT]` The canonical deployment artifact today is `npm run bundle` (relative
  base, no external deps), **not** `npm run build` (gate §11, P1-6). All INT-1/2
  runtime behaviour must be verified against the `bundle` artifact.
- `[EXTERNAL]` Whether the game is launched **standalone** (browser redirect to a
  new page) or **embedded** (iframe inside the Qualtrics survey) is a
  Qualtrics-survey-design choice **not encoded in the repository**. It materially
  changes which INT-1 mechanism is even applicable and must be confirmed by the
  research owner (see INT-1 §3.6). Current code makes no iframe/postMessage
  assumption either way.
- `[EXTERNAL]` Data-controller obligations (retention, deletion, cross-border
  hosting, DPIA) are institutional policy, not repository facts.

---

## 3. INT-1 — Production completion & Qualtrics return mechanism

**Exact question.** By what mechanism does a _production_ build (a) trigger
completion from the terminal room, (b) finalise the summary, and (c) hand the
summary back to Qualtrics / return the participant — with participant-visible
failure handling?

**What is already true (do not re-decide).** `[FACT]` The summary is built purely
and non-destructively (`getSummary`), and a return URL with all summary fields is
_already builder-ready_ (`buildReturnUrl`). The missing pieces are the
**production completion trigger** and the **navigation/handoff mechanism**.

### 3.1 Option matrix

| #   | Option                                                                                                                                                | Applicable launch mode    | Qualtrics-side work                                                                                 | Repo support today                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A   | **Validated same-window `return_url` navigation** (redirect the whole window to `buildReturnUrl(summary)`)                                            | Standalone (whole-window) | Define embedded-data fields = summary keys; set a "continue" URL as `return_url`                    | High — `buildReturnUrl` exists; needs a nav call + prod completion trigger |
| B   | **Parent-window `postMessage` with acknowledgement** (game `postMessage`s summary to the Qualtrics parent; parent JS writes embedded data + advances) | Embedded (iframe)         | Custom JS in the survey to `addEventListener('message')`, validate origin, write embedded data, ack | Low — **no `postMessage` code exists anywhere** in `src/`                  |
| C   | **Hybrid: message-first, navigation-fallback** (try `postMessage`+ack; if no ack within a bound, fall back to A)                                      | Either                    | Both B's listener _and_ A's continue URL                                                            | Low–medium — needs B's code + A's nav + ack timer                          |
| D   | **Explicit manual "Return to survey" button** (participant clicks; button performs A)                                                                 | Standalone                | Same as A                                                                                           | Medium — needs completion UI + nav                                         |

_Rejected/limited:_ Qualtrics-side _polling_ of embedded data is not viable —
Qualtrics cannot poll an external app's memory; the app must _push_. Not tabled.

### 3.2 Per-option analysis (INT-1 required fields 1–20)

**Option A — same-window `return_url` navigation** (RECOMMENDED as primary; see §3.5)

1. **Runtime flow**: terminal room fires completion → `getSummary(true)` finalises
   → `buildReturnUrl(summary)` → `window.location.assign(url)`.
2. **Game responsibilities**: detect terminal completion; finalise summary; build
   URL; navigate; render failure UI if URL is `null`.
3. **Qualtrics responsibilities**: define embedded-data fields named exactly the
   summary keys `[FACT: ScoringManager.ts:5-65]`; provide a valid continue
   `return_url`; read embedded data from the returning query string.
4. **Launch params required**: `return_url` (mandatory for return); identity params
   for stamping.
5. **Origin validation**: `return_url` currently unrestricted incl. non-`http(s)`
   (`QualtricsBridge.ts:35`); INT-4 (allow-list / scheme enforcement) should gate
   this — **cross-dependency**.
6. **Acknowledgement**: none — navigation is fire-and-forget; the browser either
   lands on Qualtrics or it does not. `[INFERENCE]` "did Qualtrics receive it" is
   confirmable only downstream (a returning response exists).
7. **Retry**: none native; a failed nav leaves the participant on the game page →
   the failure UI (field 9) must offer a manual retry.
8. **Duplicate-completion prevention**: needs a one-shot completion guard
   (`FinalCoreScene` already has `markFinalCoreCompleted` one-shot precedent
   `[FACT: contract §8]`); without it a re-entry could re-navigate.
9. **Participant-visible failure**: if `buildReturnUrl` → `null` (absent/invalid
   `return_url`), show "your session is complete; data may not have been returned
   automatically" + manual link. **Required new UI.**
10. **Standalone launch**: works natively (whole-window redirect).
11. **Embedded launch**: `[INFERENCE]` a whole-window `location.assign` from inside
    an iframe navigates the **iframe**, not the survey — Qualtrics would not see
    the return. **A is unsuitable if launched embedded** without `target=_top`.
12. **Browser/hosting**: HTTPS static host; URL-length ceiling ~2k–8k
    `[EXTERNAL: browser/Qualtrics limit]` — ~59 short fields is well within
    `[INFERENCE]`, but no guard exists (contract §13).
13. **Security**: `return_url` is attacker-controllable in the launch URL; open
    redirect / `javascript:` risk unless INT-4 constrains scheme/host.
14. **Privacy**: summary values (pseudonymous) travel in the URL → browser
    history/referrer/host logs (contract §17). No PII, but note host logging.
15. **Testability**: high — deterministic; a PROD-mode Playwright spec can assert
    the post-completion URL carries all summary keys.
16. **Complexity**: low — one nav call + one-shot guard + failure UI.
17. **Failure modes**: absent/invalid `return_url`; iframe context; URL too long;
    blocked navigation.
18. **Architecture compat**: high — uses the existing bridge verbatim.
19. **Effect on later deploy**: minimal; base-path/host handled by Unit 5.
20. **Acceptance criteria**: in a `bundle` PROD build, completing the terminal room
    navigates to `return_url` with **all** `GameSummaryVariables` keys present and
    correct; absent/invalid `return_url` shows the failure UI and never white-screens.

**Option B — parent-window `postMessage` + acknowledgement**

1. **Flow**: completion → summary → `window.parent.postMessage({type,summary}, targetOrigin)`
   → parent validates origin, writes embedded data, `postMessage`s an ack →
   game resolves.
2. **Game resp.**: finalise summary; post to a **validated** target origin; await
   ack with timeout; render failure UI on timeout.
3. **Qualtrics resp.**: **custom survey JS** to listen, validate `event.origin`,
   write embedded data (`Qualtrics.SurveyEngine.setEmbeddedData`), post ack, advance.
4. **Params**: an **allowed parent origin** must be known/configured (new param or
   constant) — not currently parsed.
5. **Origin validation**: **mandatory both directions** — game validates ack
   origin; parent validates message origin. `[FACT]` none exists today.
6. **Acknowledgement**: explicit ack message — the _only_ option with a real
   delivery confirmation.
7. **Retry**: feasible — re-post on missing ack up to N times.
8. **Duplicate prevention**: include an idempotency key (identity + completion id)
   so a re-post is deduped parent-side.
9. **Participant failure**: on ack timeout, show failure UI / fallback.
10. **Standalone launch**: **not applicable** — no parent window to message.
11. **Embedded launch**: the _correct_ mechanism for iframe embedding.
12. **Browser/hosting**: requires the survey to embed the game in an iframe on the
    same top-level Qualtrics page; HTTPS both sides.
13. **Security**: strong _if_ origins are validated; a wildcard `'*'` target origin
    would leak the summary to any parent — must be a fixed allow-list.
14. **Privacy**: summary stays in `postMessage` payload (not the URL) — _better_
    URL/referrer hygiene than A.
15. **Testability**: medium — needs a harnessed parent frame in the spec.
16. **Complexity**: high — new messaging module + Qualtrics-side JS + ack protocol.
17. **Failure modes**: origin mismatch, no listener, ack lost, popup/iframe blocked.
18. **Architecture compat**: medium — additive module; does not touch the bridge's
    URL path.
19. **Effect on later deploy**: couples deployment to an embedded survey design.
20. **Acceptance**: embedded game posts summary to the validated parent origin,
    receives ack, and the survey advances with all embedded-data fields set;
    origin-mismatch messages are rejected and logged.

**Option C — hybrid message-first + navigation-fallback**

- Superset of A+B: attempt B; on ack timeout or standalone context, perform A.
- Fields 1–20 = the _union_ of A and B. Advantages: works in **both** launch
  modes; strongest delivery guarantee. Costs: highest complexity (two code paths,
  two Qualtrics configurations, an ack timer + fallback state machine), largest
  test surface, and two failure taxonomies to reason about.
- **Acceptance**: in embedded mode, ack path succeeds; in standalone mode, nav
  fallback fires; ack-timeout in embedded mode falls back to nav; all paths land
  the full summary; duplicate delivery is deduped by idempotency key.

**Option D — manual "Return to survey" button** — as A but participant-initiated.
Adds one deliberate click (avoids surprise redirect; better for
"data-saved" reassurance) at the cost of participants who close the tab without
clicking → no return `[INFERENCE]`. Best as A's _failure fallback UI_, not the
sole mechanism.

### 3.3 One-required vs configurable vs primary+fallback

- **One required mechanism**: simplest to build/verify, but brittle — a wrong
  launch-mode assumption breaks return entirely.
- **Configurable** (`?return_mode=redirect|postmessage`): flexible but doubles the
  test matrix and defers the launch-mode decision that the study must make anyway.
- **Primary + defined fallback**: robust; matches the existing `null`-return branch
  that already needs a fallback UI.

### 3.4 Irreversibility / data effects (INT-1)

- **Reversible / versionable**: the _mechanism itself_ is code — changeable before
  data collection, and even mid-study with a `game_version` bump (already stamped
  on every record `[FACT: ResearchRuntime.ts:123-131]`).
- **Affects participant experience**: yes — redirect vs button vs iframe advance is
  participant-visible. Ethics-review-relevant copy (the failure message) `[EXTERNAL]`.
- **Affects already-collected data**: none collected yet — no migration cost now.
- **Hard dependency**: INT-4 (return-scheme/host validation) and the launch-mode
  confirmation (§2, §3.6).

### 3.5 INT-1 RECOMMENDATION — **NOT YET AUTHORISED**

> **RECOMMENDATION ONLY — NOT YET AUTHORISED.**
> Adopt **a primary mechanism with a defined fallback**:
> **primary = Option A (validated same-window `return_url` navigation)**, **fallback
> = Option D (participant-visible "Return to survey" panel + "data may not have
> saved" message)** whenever `buildReturnUrl` returns `null` or navigation cannot
> proceed.
> **Condition**: this assumes a **standalone (whole-window) launch**. **If the study
> launches the game embedded in an iframe, switch the primary to Option B
> (`postMessage` + ack) or adopt Option C (hybrid)** — Option A cannot return from
> inside an iframe (§3.2 A.11).
> **Rationale (not convenience)**: A reuses the already-verified, non-destructive
> `buildReturnUrl` verbatim, is the canonical Qualtrics "redirect to external
> content then continue" pattern, and is fully testable in a PROD build; B's
> messaging/ack machinery is only _necessary_ when embedded, which the current
> architecture does not assume. Pair with INT-4 scheme/host validation to close the
> open-redirect risk.

### 3.6 Blocking external input required for INT-1

`[EXTERNAL]` **Launch mode** (standalone vs embedded) — the single fact that
selects A vs B/C. **Must be confirmed by the research owner / Qualtrics survey
designer before Unit 3.**

---

## 4. INT-2 — Raw-event export channel

**Exact question.** By what channel do raw events (and the derived summary) reach a
durable dataset, such that **every exported summary variable is reproducible from
exported raw data** (audit P0-2), or the study formally records _summaries-only_?

**Core constraint** `[FACT/INFERENCE]`: the return-URL channel (INT-1) can carry
the **~59-field summary** but **cannot carry the raw event log** — a full session
is many events, each with the full V3 §3.2 payload `[FACT: EventLogger.ts:1-32]`,
which exceeds any safe URL length and Qualtrics embedded-data practicality. Raw
events therefore need a **separate channel** from the summary.

### 4.1 Can raw data live in each transport?

| Transport                                    | Raw events?                                                                                                        | Summary?               | Verdict                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------------- |
| **URL / `return_url` query**                 | **No** — length-prohibitive, logged in history/referrer                                                            | Yes (~59 short fields) | Summary only                       |
| **Qualtrics embedded data**                  | **No** — impractical at raw volume; field-count/length limits `[EXTERNAL]`                                         | Yes                    | Summary only                       |
| **`postMessage` payload**                    | **Marginal** — no hard size limit, but requires embedded launch + parent capable of forwarding raw JSON to storage | Yes                    | Only if embedded + parent forwards |
| **Dedicated ingestion request (HTTPS POST)** | **Yes** — JSON body, batched, durable                                                                              | Yes                    | Raw + summary                      |

### 4.2 Option matrix (INT-2)

| #   | Channel                                                        | Raw dest.                                            | Summary dest.       | Infra required                         |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- | ------------------- | -------------------------------------- |
| A   | **Dedicated HTTPS ingestion endpoint**                         | POST JSON to study server                            | same or via INT-1   | A hosted endpoint + store `[EXTERNAL]` |
| B   | **Qualtrics embedded data only**                               | — (not carried)                                      | embedded data       | none beyond INT-1                      |
| C   | **Parent-window messaging to Qualtrics**                       | parent forwards                                      | embedded data       | embedded launch + parent glue          |
| D   | **Hybrid: summary→Qualtrics (INT-1) + raw→ingestion endpoint** | POST to server                                       | Qualtrics via INT-1 | ingestion endpoint                     |
| E   | **Local durable queue → acknowledged export**                  | localStorage/IndexedDB buffer, flush+ack to endpoint | via INT-1           | endpoint + client buffer               |
| F   | **Summaries-only by design** (formally accepted)               | **not exported**                                     | Qualtrics via INT-1 | none                                   |

### 4.3 Per-option analysis (INT-2 required fields 1–25, compressed)

Shared where noted; divergences called out.

- **1 destination / 2 transport / 3 payload**: A/D/E → study HTTPS endpoint, POST,
  JSON batch of `RawGameEvent[]` + summary envelope. B/F → Qualtrics embedded data,
  redirect query, ~59 scalar fields, **no raw**. C → `postMessage` JSON to parent
  then parent→store.
- **4 payload-size**: URL/embedded (B/C/F) bounded & small; POST (A/D/E) effectively
  unbounded (batched).
- **5 raw preservation**: A/D/E **yes**; B/C/F **no** (C only if parent persists).
- **6 session-state preservation**: mission state (`SessionState.getMissionState`
  `[FACT: contract §8]`) can ride in the envelope for A/D/E; not in B/F.
- **7 summary handling**: all options ship the summary; only A/D/E also ship raw.
- **8 acknowledgement**: A/D/E → HTTP 2xx + receipt id; B/F → none (fire-and-forget
  redirect); C → parent ack.
- **9 retries / 10 idempotency / 11 dup-prevention**: A/D/E can retry a failed POST;
  idempotency via a natural key (see §4.5). B/F: a duplicate return re-sets the same
  embedded data (idempotent by overwrite) but loses nothing/gains nothing.
- **12 offline / temporary failure**: only **E** (durable local buffer) survives a
  transient network failure before ack; A/D lose the batch if the single POST fails
  and the participant leaves.
- **13 reload / 14 crash / 15 incomplete-session**: `[FACT]` today **any** reload
  loses everything (no persistence, audit P0-3). Only **E** addresses this — it is
  the natural join point with the P0-3 persistence decision. A/D without a buffer
  still lose a mid-session crash; B/F never had raw to lose.
- **16 pseudonymous identity**: all use `participant_id`/`game_session_id` only; no
  PII `[FACT: contract §17]`.
- **17 authentication**: A/D/E endpoint needs at least a shared secret / signed
  token to prevent spoofed ingestion `[EXTERNAL]`; B/C/F inherit Qualtrics auth.
- **18 privacy / data-minimisation**: raw events are richer than the summary → a
  raw channel widens the data surface; must be justified by the reproducibility
  requirement and covered by consent/DPIA `[EXTERNAL]`. F is the most
  data-minimising but sacrifices reproducibility.
- **19 auditability / 20 reproducibility**: A/D/E → **full reproducibility** (raw
  present); B/C(store)/ → summary auditable only; **F → NOT reproducible** (explicit
  scientific trade-off).
- **21 testability**: A/D/E → mockable endpoint asserts payload; B/F → assert return
  URL only.
- **22 infra / 23 complexity**: F lowest; B low; A/D medium (endpoint); E highest
  (buffer + flush + ack + resume) but also **solves P0-3**.
- **24 failure modes**: endpoint down (A/D/E), CORS/mixed-content, auth reject, quota
  (localStorage) for E, lost redirect for B/F.
- **25 acceptance**: for A/D/E — a reproduction script recomputes **every**
  `GameSummaryVariables` field from the exported raw log and matches the exported
  summary byte-for-byte (audit P0-2, Unit 6); for F — the study record formally
  states "summaries only; scores not reproducible from exported data."

### 4.4 Recommended separation of concerns

Keep these as **distinct structures** (do not collapse — mirrors the raw-vs-summary
invariant that already holds `[FACT: contract §11]`):

1. **Raw event record** — `RawGameEvent` append-only `[FACT: EventLogger.ts:1-32]`.
2. **Mission / session state** — `SessionState.missionState` (12 fields)
   `[FACT: contract §8]`.
3. **Derived scoring summary** — `GameSummaryVariables` `[FACT: ScoringManager.ts:5-65]`.
4. **Completion envelope** — identity + status taxonomy (INT-5) + counts + a
   client-generated `export_id` + `game_version` + (proposed) `asset_set_version`
   (INT-6) + `scoring_version` (D2).
5. **Export acknowledgement / receipt** — server-issued receipt id + timestamp;
   drives `export_status` (INT-5).

### 4.5 Draft export-envelope schema (NON-AUTHORITATIVE)

Fields marked `[repo]` are supported by existing evidence; `[proposed]` require
approval; `[D2]`/`[INT-5]`/`[INT-6]` depend on the named ruling.

```jsonc
{
  "export_id": "<uuid>", // [proposed] client-generated, idempotency key
  "schema_version": "envelope-v1", // [proposed]
  "participant_id": "<pseudonymous>", // [repo] SessionState.metadata
  "game_session_id": "<pseudonymous>", // [repo]
  "condition": "<arm|default>", // [repo]
  "game_version": "<stamp>", // [repo] SessionState/VITE_APP_VERSION
  "asset_set_version": "outpost-assets-v1", // [INT-6] not in payloads today (P1-8)
  "scoring_version": "<stamp>", // [D2] stimulus-freeze item 4, not yet stamped
  "launch_mode": "production|test|development", // [INT-5]
  "session_status": "completed|incomplete|...", // [INT-5]
  "completion_reason": "<enum>", // [INT-5]
  "started_at_ms": 0, // [repo] SessionState.metadata.started_at_ms
  "elapsed_seconds": 0, // [repo]
  "summary": {
    /* GameSummaryVariables */
  }, // [repo] ScoringManager
  "mission_state": {
    /* 12 fields */
  }, // [repo] SessionState.getMissionState
  "events": [
    /* RawGameEvent[] */
  ], // [repo] EventLogger.getEvents (raw)
  "event_count": 0, // [proposed] server-verifiable
}
```

### 4.6 Idempotency strategy candidates

| Strategy                                | Key                                            | Pro                                              | Con                                                                                          |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Composite natural key** (RECOMMENDED) | `participant_id + game_session_id + export_id` | Stable, dedups retries and duplicate completions | Needs a client-generated `export_id`                                                         |
| Per-event sequence key                  | `game_session_id + seq_no`                     | Fine-grained dedup                               | Requires the P1-9 monotonic seq number (not built) — **dependency on Unit 2**                |
| Content hash                            | `sha256(envelope)`                             | No new field                                     | A retried identical batch hashes same, but any field drift (e.g. elapsed_seconds) defeats it |

### 4.7 INT-2 RECOMMENDATION — **NOT YET AUTHORISED**

> **RECOMMENDATION ONLY — NOT YET AUTHORISED.**
> Adopt **Option D (hybrid) implemented via the Option E mechanism**: **summary →
> Qualtrics via the INT-1 return channel**; **raw events + mission state + summary →
> a dedicated HTTPS ingestion endpoint**, buffered in a **local durable append-only
> queue** and flushed with **server acknowledgement**, retained until acked.
> Idempotency = **composite natural key** (`participant_id + game_session_id +
export_id`).
> **Rationale (validity, not convenience)**: only a POST channel can carry raw
> events, and reproducibility (audit P0-2) requires the raw events in the dataset;
> the local durable buffer simultaneously discharges the P0-3 reload/crash data-loss
> risk (they are the same engineering seam), so this is the _only_ option that makes
> scores reproducible **and** survives an unsupervised participant's reload.
> **Fallback for record**: if no ingestion endpoint can be stood up, **Option F
> (summaries-only)** is the only repo-native alternative — but it must be a
> **formally recorded scientific decision** that game-derived scores are **not
> reproducible from exported data**, not a silent default.
> **Blocking external requirement** `[EXTERNAL]`: standing up the ingestion endpoint
> (host, auth, storage, retention) and its DPIA is **institutional/infra work
> outside this repository** and gates the recommended option.

---

## 5. INT-5 — Completion / launch / export / return status taxonomy

**Exact question.** What status model lets Qualtrics and the downstream dataset
distinguish completed vs incomplete vs failed vs test sessions, and technical
export/return failures from participant behaviour? `[FACT]` Today the only status is
`completed: boolean` (`ScoringManager.ts:10`) — a quit-mid-game participant simply
never returns, so Qualtrics sees _nothing_, indistinguishable from a technical
failure (audit P1-7, contract §13).

### 5.1 Candidate models

- **Model A — one combined enumeration** (e.g. `status ∈ {completed, incomplete,
failed, test, export_failed, return_failed, ...}`).
- **Model B — separate orthogonal dimensions** (RECOMMENDED):
  `launch_mode`, `session_status`, `completion_reason`, `export_status`,
  `return_status`.
- **Model C — minimal two-field** (`session_status` + `is_test`) — a reduced B.

### 5.2 Per-model analysis (INT-5 required fields 1–18, compressed)

**Model A (combined enum)**

- **Permitted values / transitions**: one axis; every real combination
  (e.g. "completed but export failed") needs its own composite value → combinatorial
  blow-up. **Terminal vs non-terminal** blurred. **Test/dev separation** forces
  `test_*` duplicates of every value. **Participant-completion vs technical-failure
  vs export-failure vs return-failure** cannot be represented **simultaneously** —
  they are different axes crushed into one. **Downstream interpretation**: analysts
  must reverse-engineer orthogonal facts from one string. **Compat with raw/future
  persistence**: poor. **Acceptance**: rejected below.

**Model B (orthogonal dimensions)** — RECOMMENDED

1. **Permitted values** (proposed; `[repo]`/`[proposed]`/`[approval]` tagged):
   - `launch_mode`: `production` | `test` | `development` — `[proposed]`; `development`
     is `[repo]`-implied by the DEV gate, `test` needs a launch signal (a param or
     a reserved `participant_id` prefix) `[approval]`.
   - `session_status`: `in_progress` | `completed` | `incomplete` | `error` —
     `completed` is `[repo]` (boolean today); `incomplete`/`error` `[proposed]`;
     `abandoned` **requires a detection rule the study must supply** (see 5.4) → do
     **not** ship `abandoned` without that rule.
   - `completion_reason`: `terminal_room_reached` | `participant_exit` |
     `technical_error` `[proposed]`; any richer taxonomy `[approval]`.
   - `export_status`: `pending` | `acknowledged` | `failed` — driven by INT-2 ack
     `[proposed]`.
   - `return_status`: `pending` | `returned` | `failed` | `not_applicable` (no
     `return_url`) `[proposed]`.
2. **Transitions**: see §5.3 table.
3. **Terminal vs non-terminal**: `session_status` terminal at `completed`/`error`;
   `export_status`/`return_status` terminal at `acknowledged`/`failed` /
   `returned`/`failed`.
4. **Test/dev/prod separation**: the dedicated `launch_mode` axis — clean; analysts
   filter `launch_mode == production`.
   5–8. **Participant vs technical vs export vs return failure**: each is its **own
   axis** — fully distinguishable simultaneously.
5. **Incomplete-session**: `session_status = incomplete` **requires** the game to
   _emit_ something on early exit — impossible with a fire-and-forget redirect unless
   a `beforeunload`/`pagehide` best-effort export fires (ties to INT-2 Option E
   buffer). `[INFERENCE]` without persistence + best-effort flush, "incomplete" is
   only inferable _downstream_ by "launched but no completion record."
6. **Abandoned-session**: only via a **user-supplied timeout/inactivity rule**
   (5.4) — not invented here.
7. **Invalid-launch**: e.g. empty identity (INT-3) → `session_status` could carry a
   flag, but the _handling_ is INT-3's ruling — cross-dependency.
8. **Duplicate-return**: `return_status` idempotent (`returned` stays `returned`);
   an idempotency key (INT-2 §4.6) prevents a second export record.
9. **Retry**: `export_status`/`return_status` may cycle `pending → failed → pending`
   on retry, terminalising on success.
   14–15. **Downstream Qualtrics / dataset interpretation**: Qualtrics stores each axis
   as its own embedded-data field; the dataset filters/segments on independent axes.
10. **Compat with raw events**: additive — each axis is one summary/envelope field;
    no event-schema change required.
11. **Compat with future persistence**: aligns with INT-2 Option E (buffer knows
    `export_status`).
12. **Acceptance**: a completed production session, a participant-exit, a
    technical-error, and a test session are each distinguishable on the `launch_mode`
    - `session_status` (+ `completion_reason`) axes downstream, and an export/return
      failure is distinguishable from a participant outcome.

**Model C (minimal)** — `session_status` + `is_test`. Covers the _most urgent_ P1-7
need (distinguish complete/incomplete/test) at minimal cost, but cannot represent
export/return failure separately → weaker for INT-2 diagnostics.

### 5.3 State-transition table (Model B, proposed — NON-AUTHORITATIVE)

| Axis           | From → To                  | Valid?                          | Terminal?          | Retryable?       | User-visible?            | Recorded only? |
| -------------- | -------------------------- | ------------------------------- | ------------------ | ---------------- | ------------------------ | -------------- |
| session_status | `in_progress → completed`  | valid                           | completed=terminal | no               | yes (completion UI)      | —              |
| session_status | `in_progress → incomplete` | valid (needs early-exit signal) | terminal           | no               | maybe                    | yes            |
| session_status | `in_progress → error`      | valid                           | terminal           | no               | yes (failure UI)         | yes            |
| session_status | `completed → incomplete`   | **invalid**                     | —                  | —                | —                        | —              |
| export_status  | `pending → acknowledged`   | valid                           | terminal           | —                | no                       | yes            |
| export_status  | `pending → failed`         | valid                           | non-terminal       | **yes**          | maybe                    | yes            |
| export_status  | `failed → acknowledged`    | valid (after retry)             | terminal           | —                | no                       | yes            |
| return_status  | `pending → returned`       | valid                           | terminal           | —                | yes (lands on Qualtrics) | —              |
| return_status  | `pending → failed`         | valid                           | non-terminal       | **yes** (manual) | yes (fallback UI)        | yes            |
| return_status  | `pending → not_applicable` | valid (no `return_url`)         | terminal           | —                | yes                      | yes            |
| launch_mode    | (set once at launch)       | immutable                       | terminal           | no               | no                       | yes            |

### 5.4 What INT-5 must NOT invent

`[FACT]` No participant **timeout / idle / abandonment threshold** is authoritative
(D3 is explicitly unresolved — brief §D3; `DOCK_IDLE_HELP_THRESHOLD_MS = null`). The
`abandoned` value and any inactivity-based `completion_reason` therefore **must not
be shipped until the study supplies the rule**. This pack does **not** propose a
number.

### 5.5 INT-5 RECOMMENDATION — **NOT YET AUTHORISED**

> **RECOMMENDATION ONLY — NOT YET AUTHORISED.**
> Adopt **Model B (separate orthogonal dimensions)**: `launch_mode`,
> `session_status`, `completion_reason`, `export_status`, `return_status`, with the
> permitted values in §5.2 (shipping only the `[repo]`/`[proposed]` values; holding
> `abandoned` and any inactivity-based reason until D3/a detection rule exists).
> **Rationale**: participant outcome, technical export failure, and return failure
> are genuinely independent facts; a combined enum (Model A) cannot represent them
> simultaneously and multiplies with a `test_*` prefix. Model B is additive (one
> field per axis), needs no event-schema change, and each field flows to Qualtrics
> via the existing `buildReturnUrl` key-serialisation.
> **Reduced-scope fallback**: if only the P1-7 minimum is wanted for a first
> supervised test, **Model C** (`session_status` + `is_test`) is an acceptable
> subset that can grow into B without breaking fields.
> **Dependencies**: `export_status` needs INT-2's ack; `return_status` needs INT-1;
> `session_status = incomplete` needs a best-effort early-exit emit (INT-2 Option E /
> P0-3); `abandoned` needs D3.

---

## 6. Shared privacy / security implications

- `[FACT]` Pseudonymous ids only; no PII collected (contract §17). Identities +
  `return_url` travel in the URL (history/referrer/host logs) — note host logging
  posture `[EXTERNAL]`.
- `[FACT]` Default `npm run build` ships an external `unpkg.com` request + GitHub
  ribbon (P1-6); use `npm run bundle`. Inert `gtag` scaffolding should be removed
  for a research build (P2-10).
- A raw-event ingestion endpoint (INT-2 A/D/E) **widens the data surface** and adds
  an auth/retention/host obligation `[EXTERNAL]` — DPIA/consent must cover it.
- `return_url` and any `postMessage` target origin are **attacker-influenceable** →
  INT-4 (scheme/host allow-list) is a **security cross-dependency** for INT-1.
- `[EXTERNAL]` Hosting jurisdiction, retention/deletion policy, and consent language
  are institutional, not repository, facts.

## 7. Implementation consequences (if the recommendations are later authorised)

- **INT-1 (A+D)**: a production completion trigger in `FinalCoreScene`, a one-shot
  guard, a nav call using existing `buildReturnUrl`, and a new completion/failure UI
  (audit Unit 3). Reuses the bridge unchanged.
- **INT-2 (D via E)**: a durable local queue adapter + an ingestion client +
  envelope assembly; additive to `EventLogger`/`ResearchRuntime`, **must never
  mutate the raw log** (skill invariant). Joins P0-3 (audit Unit 2) and P0-2 (Unit 6
  reproducibility).
- **INT-5 (B)**: additive fields on the summary/envelope; no event-schema change.
- All three are **reversible/versionable** pre-collection and stamped by
  `game_version`; none alters an existing scientific invariant.

## 8. Validation consequences

- New PROD-mode Playwright coverage: post-completion return URL carries all summary
  keys (INT-1); mocked-endpoint payload assertion + reproduction script (INT-2,
  Unit 6); status-field assertions per axis (INT-5).
- A **hosted round-trip** (Qualtrics → game → Qualtrics) is required for INT-1 and
  cannot be faked by the current dev-only suite (gate §13, Unit 5).

## 9. Unresolved inputs the owner must still provide

| Input                                                             | Blocks                    | Owner                            |
| ----------------------------------------------------------------- | ------------------------- | -------------------------------- |
| Launch mode (standalone vs embedded) `[EXTERNAL]`                 | INT-1 A/B/C selection     | research owner / survey designer |
| Ingestion endpoint feasibility (host/auth/retention) `[EXTERNAL]` | INT-2 D/E vs F            | institution / infra              |
| Whether reproducibility is mandatory or summaries-only accepted   | INT-2                     | research owner                   |
| D3 idle/abandonment rule                                          | INT-5 `abandoned`         | research owner (brief §D3)       |
| INT-3 empty-identity handling                                     | INT-5 invalid-launch flag | research owner (brief/ADV-6)     |
| INT-4 return-scheme/host allow-list                               | INT-1 security            | research owner                   |
| INT-6 `asset_set_version` payload authorisation                   | envelope provenance       | research owner                   |
| DPIA / consent covering raw-event export `[EXTERNAL]`             | INT-2                     | ethics/institution               |

---

## 10. Explicit non-adoption statement

**No decision in this document has been adopted.** Every INT-1 / INT-2 / INT-5
recommendation is marked **RECOMMENDATION ONLY — NOT YET AUTHORISED**. No source,
test, scoring, event-schema, or scientific-contract file has been changed. Binding
rulings are issued only via `docs/decisions/RESEARCH-OWNER-RULING-FORM.md`, after
which implementation may begin (Unit 0 → Units 1–7, audit §14). Implementation has
**not** begun.
