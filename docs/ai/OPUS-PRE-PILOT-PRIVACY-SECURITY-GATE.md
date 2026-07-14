# Opus Pre-Pilot Privacy & Security Gate

Bounded, evidence-grounded privacy / security / research-data-governance gate
run before any supervised testing, pilot, or formal participant data collection.
Documentation-only. Companion analysis:
`docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md` (data inventory, flow
model, `PS-n` register, constraint set) and
`docs/operations/PILOT-DATA-GOVERNANCE-CHECKLIST.md` (operational gates).

---

## 1. Executive verdict

**The current implementation does not itself leak or mishandle participant
data, but it also has no production data pipeline — and the participant-facing
readiness controls do not yet exist.** The privacy/security posture is:

- **Implemented behaviour**: sound and minimal. Data is in-memory only, no
  persistence, no network, no secrets; all debug/probe/analytics surfaces are
  verified absent from the production bundle. No direct identifiers are
  collected.
- **Deployment artifact**: **conditionally unsafe.** The participant-safe
  artifact is `npm run bundle` (externals stripped, base `./`). The ordinary
  `npm run build` — and the shape of the previously committed `dist/` — ships an
  external `unpkg.com` request and a `github.com` link and is **not** a
  participant artifact (**PS-1 / P1-6**).
- **Proposed integration**: the return/export machinery is unbuilt; its
  privacy/security controls (return-scheme allowlist, test/prod separation,
  durable-buffer isolation, endpoint constraints) are **missing contracts**, not
  bugs — they must be implemented, not invented, by the Max sessions.

**Readiness classification**

| Level                                        | Verdict                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **L1 internal dev testing**                  | **READY**                                                                                                                     |
| **L2 supervised usability (non-study data)** | **READY with conditions** — serve `npm run bundle`; accept no data returns; capture no real participant data                  |
| **L3 supervised research pilot**             | **NOT READY** — blocked by PS-0, PS-1, PS-2, PS-3 + P0-1/P0-2/P0-3 + INT-3/4/5 rulings + X1..X11                              |
| **L4 formal participant collection**         | **NOT READY** — additionally blocked by reproducibility (P0-2), codebook/`scoring_version` (D2), DPIA/withdrawal `[EXTERNAL]` |

**Real participant data collection is prohibited until PS-0/1/2/3 and the P0
cluster are closed and X1..X11 are confirmed.**

---

## 2. Repository checkpoint

- Branch: `fable-autonomous-game-build-v1`
- HEAD: `1f2c972aa7832876c8520204aad4efa66090e564`
- Working tree: **clean** at audit start (`git status --porcelain` empty)
- Latest 10 commits: `1f2c972, 24afcad, 474b7ee, 0c3529c, ec7d4e1, 034c05b,
653780d, db6380d, ff28f3d, 14bc470`
- Technical gate present: **yes** (`docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`)
- Integration audit present: **yes** (`docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md`)
- INT-1/2/5 decision pack present: **yes** (`docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md`)
- D2/Beat-13 pack present: **yes** (`docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md`)
- Research-owner ruling form present: **yes** (`docs/decisions/RESEARCH-OWNER-RULING-FORM.md`)
- Existing privacy/security/deployment docs: **none dedicated** (`docs/security/`
  and `docs/operations/` did not exist; privacy/security appeared only inside the
  audit §7 and decision-pack §6). This gate creates the dedicated set.
- Uncommitted/unexpected files at start: **none** (`dist/` is git-ignored per
  `.gitignore`).

---

## 3. Methods

- Static repository inspection (Read/Grep) of all data-handling source:
  `SessionState`, `QualtricsBridge`, `EventLogger`, `ResearchRuntime`,
  `ScoringManager`, `DataQualityTracker`, `SceneRouter`, `RoomScene`,
  `analytics`, `constants/env`, `index.ts`, `index.html`, `.env`,
  `vite.config.mts`, `scripts/bundle.sh`.
- Repo-wide greps for storage, network, external hosts, secrets, probes.
- Built-artifact inspection of both `npm run build` and the `BUNDLE=true …
--base=./` participant bundle.
- Dependency-lock present (`package-lock.json`); no scanner installed; `npm
audit` **not** relied on as proof of safety (not run in this gate).
- Cross-referenced the existing technical gate / integration audit / decision
  pack rather than re-deriving their P0/P1 findings.
- **Not run** (task constraint): full Playwright suite, ADV-5, real Qualtrics,
  external ingestion, active attacks.

---

## 4. Commands and evidence

```
git rev-parse --abbrev-ref HEAD        # fable-autonomous-game-build-v1
git rev-parse HEAD                     # 1f2c972…
git status --porcelain                 # (empty)

# storage / network / secrets — all clean in src/
grep -rn "localStorage|sessionStorage|indexedDB|document.cookie" src   # none
grep -rn "fetch(|XMLHttpRequest|WebSocket|sendBeacon|postMessage|EventSource" src  # none (only new URL/URLSearchParams)
grep -rn "(api_key|secret|token|password|bearer)" src                  # none

# ordinary build
npm run build
grep -oE "https?://[^\" ]+" dist/index.html      # unpkg.com + github.com
for p in researchRuntime __lastRoomFeedbackText unpkg googletagmanager gtag; do grep -c "$p" dist/assets/index-*.js; done  # 0,0,0,0,0
find dist -name '*.map'                            # (none)

# participant bundle
BUNDLE=true npm run build -- --base=./
grep -oE "https?://[^\" ]+" dist/index.html        # (none) — unpkg + ribbon stripped
grep -oE '(src|href)="[^"]+"' dist/index.html      # ./assets/…  (base ./)
grep -c dataLayer dist/index.html                  # 2 (inert gtag stub remains)
```

---

## 5. Current-exposure findings (implemented behaviour)

- **No persistence, no network, no secrets.** Grep confirms zero
  `localStorage`/`sessionStorage`/`indexedDB`/`cookie` and zero
  `fetch`/`XHR`/`WebSocket`/`sendBeacon`/`postMessage`/`EventSource` in `src/`.
  Events live only in `EventLogger`'s in-memory array (`EventLogger.ts:34-52`).
- **Identity** (`participant_id`, `game_session_id`, `condition`, `return_url`,
  `game_version`) is parsed from the launch URL (`SessionState.ts:40-56`,
  `QualtricsBridge.ts:14-22`); missing values fall back to `crypto.randomUUID`.
  Both identity fields are **pseudonymous**, supplied by Qualtrics — not direct
  identifiers.
- **Return URL** is _constructed_ (`buildReturnUrl`) but **never navigated to**
  in production; its only caller is the DEV-only `completeDebugSession`.
- **No direct identifiers** (name/email/IP/device) are collected by app code.

## 6. Build-versus-bundle findings

| Property                                           | `npm run build` (ordinary)   | `npm run bundle` (participant) |
| -------------------------------------------------- | ---------------------------- | ------------------------------ |
| External `unpkg.com` script                        | **present**                  | **stripped** (verified)        |
| `github.com` ribbon/link                           | **present**                  | **stripped**                   |
| Base path                                          | `/` (breaks subpath)         | `./`                           |
| Inert `gtag` stub                                  | present (no network)         | present (no network)           |
| `researchRuntime` / `__lastRoomFeedbackText` in JS | **absent (0)**               | **absent (0)**                 |
| Analytics (`googletagmanager`/`gtag`) in JS        | **absent (0)** — tree-shaken | **absent (0)**                 |
| Source maps                                        | none                         | none                           |

The committed `dist/` was an **ordinary build** and is therefore **not** a
participant-safe artifact. **PS-1 / P1-6.**

## 7. URL and identity findings

- `return_url` is parsed and, in the _proposed_ flow, would carry
  `participant_id` + `game_session_id` + all ~59 summary fields as query params
  → browser history, **Referer**, host logs, shared/copied URLs (**PS-4**).
- `buildReturnUrl` applies **no scheme/host allowlist** — a `javascript:` or
  off-site `return_url` would be constructed. Latent today (no navigation);
  becomes a live open-redirect/XSS sink the instant INT-1 navigation ships
  (**PS-0 / INT-4**). Only the try/catch → `null` guard exists.
- Empty-string identity is non-null and bypasses the fallback → possible
  cross-participant session collision (**PS-8 / P1-5 / INT-3**).
- `?scene=` launch routing (`SceneRouter.ts:14-31`) is an allow-mapped enum
  (unknown → default room); no path traversal or injection surface.

## 8. Storage and isolation findings

- **No browser storage of any kind.** Current cross-participant isolation on a
  shared device is incidental but real: a reload clears everything. The
  trade-off is **total data loss on reload/crash** (**PS-3 / P0-3**).
- The future durable buffer must satisfy the mandatory constraints in threat-
  model §7.5 (per-session namespace, schema version, expiry, ack-clear,
  incomplete-session preservation, corruption/quota handling, test/prod
  separation, cross-participant isolation, no unnecessary identifiers).

## 9. Network findings

- Participant bundle makes **no third-party requests** (verified: no external
  URLs in bundle `dist/index.html`; analytics tree-shaken; no `fetch`/beacon in
  JS). Ordinary build reaches `unpkg.com` (script) and links `github.com`.
- The audit finding that the participant bundle **strips the external unpkg
  dependency and the GitHub ribbon** is **explicitly confirmed** by this gate's
  own bundle build.
- No analytics/error-reporting/CDN/font/image third parties in the bundle.

## 10. Debug/probe findings

- `window.researchRuntime` (`ResearchRuntime.ts:189-208`) and
  `window.__lastRoomFeedbackText` (`RoomScene.ts:181-183,395-397`) are gated on
  `import.meta.env.DEV` and **verified absent (grep 0)** from both production
  artifacts. The DEV↔PROD boundary is currently sound.
- The inert `gtag` stub persists in the participant HTML (empty GA id, no
  network) — remove for the research build to eliminate ambiguity (**PS-9**).

## 11. Threat summary

Full register with actor/prerequisite/path/likelihood/impact is in threat-model
§6. Highest-priority evidence-grounded threats:

1. **Open-redirect/XSS via `return_url`** once INT-1 navigation ships (PS-0).
2. **Test/dev data entering the production dataset** — no `launch_mode` signal,
   random fallback ids look valid (PS-2).
3. **Irrecoverable data loss** on reload/crash — no persistence (PS-3).
4. **Wrong deployment artifact** — shipping `npm run build` exposes participants
   to a third-party request + link (PS-1).
5. **Return-URL identity/summary exposure** in history/Referer (PS-4).
6. **Undetectable duplicate export/submission** — no seq/idempotency (PS-7).

## 12. Privacy/security P0/P1/P2 register

| ID    | Sev               | Class                          | One-line                                                 | Maps         |
| ----- | ----------------- | ------------------------------ | -------------------------------------------------------- | ------------ |
| PS-0  | **P0** (on INT-1) | missing security contract      | `return_url` has no scheme/host allowlist                | INT-4        |
| PS-1  | **P0 @ L4**       | deployment/config              | ship `npm run bundle`, not `npm run build`               | P1-6         |
| PS-2  | **P0**            | test-data separation           | no `launch_mode`/test signal                             | INT-5, P1-7  |
| PS-3  | **P0**            | missing operational control    | no persistence → data loss / buffer isolation            | P0-3         |
| PS-4  | P1                | missing privacy contract       | return URL exposes id+summary in history/Referer         | INT-1/2      |
| PS-5  | P1                | missing security contract      | endpoint/postMessage controls (HTTPS/origin/ack/replay)  | INT-1B/INT-2 |
| PS-6  | P1                | deployment/config              | `bundle.sh` not cross-platform; artifact unreproducible  | —            |
| PS-7  | P1                | research-validity integrity    | no seq numbers / idempotency key                         | P1-9/INT-2.5 |
| PS-8  | P1                | missing security contract      | empty-string identity bypasses fallback                  | P1-5/INT-3   |
| PS-9  | P2                | deployment/config              | inert gtag stub in participant HTML                      | P2-10        |
| PS-10 | P2                | deployment/config              | stale template metadata (`Phaser RPG`, etc.)             | P2-10        |
| PS-11 | P2                | validity / accepted limitation | client-side scientific mappings visible (no PII/secrets) | —            |
| PS-12 | —                 | external verification          | IP/geo/region not in-repo                                | X4/X5        |
| PS-13 | —                 | no issue                       | no secrets, no source maps, empty GA id                  | —            |

## 13. External-verification register

X1 ethics protocol · X2 consent wording · X3 retention/deletion policy · X4
storage region · X5 approved providers · X6 withdrawal procedure · X7
data-access permissions · X8 breach/incident procedure · X9 Qualtrics summary-
field storage permission · X10 ingestion-service permission · X11 DPIA for raw
export. **None asserted satisfied.** (Detail: threat-model §10.)

## 14. Compatibility with INT-1/INT-2/INT-5/D2 options

Full matrix in threat-model §8. Summary: **no option is privacy/security-blocked
outright.** INT-1 A/B/C and INT-2 A/C/D/E are **compatible only with** the named
control sets (return allowlist, postMessage constraints, endpoint constraints,
buffer constraints). INT-1 D, INT-2 B/F, INT-5 B/C, and D2 α are compatible with
no extra privacy/security controls. Launch-mode (standalone vs embedded) is an
`[EXTERNAL]` decision that selects which control set applies. **No option
adopted.**

## 15. Required changes to the ruling form

The ruling form covers INT-1.5 return scheme/host allow-list but lacks explicit
fields for: **test/production separation signal (PS-2)**, **return-URL identity
minimisation (PS-4)**, **endpoint region/provider/retention approval
(PS-5/PS-12)**, and **participant-withdrawal/deletion `[EXTERNAL]` (X6)**. A new
**"Privacy/Security addendum"** section has been appended to the ruling form with
these four fields, each marked **requiring owner or institutional approval** and
**not adopted**. No existing field was altered.

## 16. Readiness classification

See §1. **L1 READY · L2 READY-with-conditions · L3 NOT READY · L4 NOT READY.**

## 17. Exact next actions

1. **Research owner**: complete `RESEARCH-OWNER-RULING-FORM.md` including the new
   Privacy/Security addendum (INT-3/INT-4 rulings gate PS-0/PS-8; INT-5 gates
   PS-2; INT-2 gates PS-3/PS-5).
2. **Owner/institution**: begin the X1..X11 external verifications (ethics,
   consent, region, providers, DPIA, withdrawal, incident path).
3. **For any L2 usability test now**: serve `npm run bundle` only; run the
   external-URL grep (governance checklist 2.2); collect no real data.
4. **Do not** start INT-1/INT-2/INT-5/D2 implementation until the gating fields
   are APPROVED (per the ruling form's blocking-order note).

## 18. Reproduction commands

```
git rev-parse HEAD                                   # 1f2c972…
grep -rn "localStorage|sessionStorage|indexedDB" src # none
grep -rn "fetch(|postMessage|sendBeacon" src         # none
npm run lint:tsc && npm run build
grep -oE "https?://[^\" ]+" dist/index.html          # ordinary: unpkg+github
for p in researchRuntime __lastRoomFeedbackText unpkg googletagmanager; do \
  grep -c "$p" dist/assets/index-*.js; done          # 0 0 0 0
BUNDLE=true npm run build -- --base=./
grep -oE "https?://[^\" ]+" dist/index.html          # bundle: (none)
find dist -name '*.map'                              # (none)
git diff --check
```

---

_Documentation-only gate. No source, test, scoring, event-schema, stimulus or
deployment-script file modified. No INT-1/INT-2/INT-5/D2 option adopted. No
scientific decision made._
