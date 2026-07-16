# Next Fable Implementation Unit

## Document status

Operational brief for the **next single bounded implementation unit**.
Produced by the documentation-only gap audit
`docs/research/audits/CURRENT-Q01-Q33-IMPLEMENTATION-GAP-AUDIT.md` (§19–§20).
This document authorises nothing by itself: the unit still requires the
normal explicit go-ahead before any code or config is touched, and all
CLAUDE.md bounded-work rules apply in full.

## Audited baseline

- Branch `fable-autonomous-game-build-v1`, HEAD `88a1635`, clean tree
  (untracked `claude-workflow-audit.txt` only).
- Latest committed full-suite evidence: 55/55 Playwright tests, zero
  retries, recorded at `1ad66c2` (one docs-only commit behind baseline).

## Authority references

- `CLAUDE.md` (work discipline; authority hierarchy).
- `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` (nothing in this unit
  touches any open decision).
- `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md` §10–§13, §17–§18
  (P1-6/P2-10 characterisation; artifact evidence and reproduction
  commands).
- `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md` §6 (PS-1) and
  `docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md` (constraint set).
- Gap audit §18.1 (U-A), §19 Unit 1, §20.

## Recommended first unit

**Canonical participant deployment artifact + shell-metadata cleanup**
(closes P1-6 / PS-1 and P2-10).

Make the participant-safe build the single documented deployment command and
remove the template shell metadata that participants can see, so that every
supervised test — and the eventual pilot — serves an artifact with **zero
external requests, no third-party branding, a correct product title, and a
subpath-safe base**.

## Why it is first

- It is the only item in the pre-pilot P0/P1/PS register that is fully
  **decision-independent** (every other register item is gated on
  INT-1…INT-6, D2–D8, P0-3 or SA-1…SA-7).
- Every later unit's verification (production smoke, supervised usability,
  pilot) must serve this artifact; doing it first means nothing downstream
  is verified against the wrong artifact.
- The five-day critical path is research-owner rulings (INT-1/2/5 + D2);
  this unit uses day 1 productively while those requests are out.

## Why it is currently unblocked

- No scientific mapping, behavioural interpretation, event name, payload
  field, study-item registration, scoring variable/formula/weight,
  questionnaire direction, or research-owner ruling is involved.
- The intended artifact behaviour is already explicit and proven: the
  technical gate demonstrated that `BUNDLE=true … --base=./` (i.e.
  `npm run bundle`) produces a zero-external-host, relative-base artifact
  and that all DEV/test surfaces are absent from it (gate §10–§13). The
  remaining work is canonicalisation and shell cleanup the gate explicitly
  scopes as config work (gate §17 P1-6 "Sonnet/config", §18 Unit 5 note:
  "do not over-build").

## Exact in-scope behaviour

1. `index.html`: participant-appropriate `<title>` — use the committed
   product name "Remote Outpost Assessment" (already the Phaser game title,
   `src/index.ts:15`) and a neutral/emptyable meta description; gate the
   inert gtag stub out of the participant bundle (same `BUNDLE` gating
   already used for the unpkg script and ribbon).
2. `public/` shell metadata: `manifest.json` name fields and template icon
   set (`logo192.png`, `logo512.png`, `favicon.ico`, `app-icon.png`,
   `robots.txt` as applicable) — replace names/remove leftovers so the
   served shell no longer identifies as "Phaser RPG | remarkablegames".
   Removing an icon is acceptable; adding new art is **not** (no asset
   generation).
3. Documentation: one authoritative deployment note (e.g. README section or
   `docs/operations/`) stating that `CI=true npm.cmd run bundle` (Windows)
   is the **only** participant deployment command and that `npm run build`
   output must never be served to participants.
4. Optional, only if trivially safe: set relative `base` in
   `vite.config.mts` so the ordinary build cannot silently produce a
   subpath-broken artifact (gate §18 marks this optional — skip if it
   perturbs the dev server or tests).

## Exact out-of-scope behaviour

- No `package.json` / `package-lock.json` edits (CLAUDE.md prohibition;
  the `bundle` script already exists).
- No INT-1 completion/return work, no persistence, no export channel, no
  status taxonomy, no end-of-experience screen.
- No `src/` gameplay, event, logging, scoring or SessionState changes
  (exception: none needed — if the unit appears to need a `src/` edit,
  stop and report).
- No event-schema or scoring-plan edits; no ruling resolved.
- No PixelLab / asset generation; no new icons or art.
- No test-suite restructuring; no Playwright run beyond the isolated
  verification below.
- No push, no PR; one local commit only, if and when the user asks for it.

## Relevant Q-items or controls

None. This unit touches no measurement surface. (Indirectly it protects all
33 items' data by ensuring participants are only ever served the clean
artifact — PS-1.)

## Likely source files to change

- `index.html` (title, description, gtag gating)
- `public/manifest.json`; possibly delete `public/logo192.png`,
  `public/logo512.png`, `public/app-icon.png` template icons
- `README.md` or `docs/operations/` deployment note
- Optional: `vite.config.mts` (`base: './'`)

## Existing tests likely to change

None expected — a repo-wide check for assertions on the page title or
manifest must be run before editing (static grep of `e2e/`); if any spec
asserts the old title, that spec's expectation is updated in the same unit
(presentation-only, no scientific data).

## Required new or changed tests

- No committed Playwright spec is required. Verification is
  artifact-inspection (below). Optionally, a small committed script or
  documented grep checklist under `docs/operations/` may record the checks;
  creating a full production-smoke spec stays out of scope (it belongs to
  the INT-gated Unit 3 wave).

## Approved event-schema implications

None. No event is added, renamed, re-tagged, or re-payloaded.

## Approved scoring-plan implications

None. No variable, formula, weight, or label changes.

## Scientific-decision implications

None. No SA/D/INT decision is touched, presumed, or narrowed. The unit must
stop and report if any step appears to require one.

## Participant-data implications

Positive only: removes the external `unpkg.com` request and `github.com`
link from anything a participant could be served (PS-1), and removes
misleading third-party branding (P2-10). No data is collected, moved, or
reshaped.

## Done criteria

1. `CI=true npm.cmd run bundle` produces `dist/` where:
   - `grep -oE "https?://[^\" ]+" dist/index.html` → no matches;
   - `<title>` is "Remote Outpost Assessment" (or ruled equivalent);
   - asset/manifest references are relative (`./…`);
   - no `dataLayer`/gtag stub in the participant bundle;
   - `researchRuntime`, `__lastRoomFeedbackText`, `__playerProbe`,
     source maps: all absent (unchanged from gate baseline).
2. `npm.cmd run build` and `npm.cmd run lint:tsc` pass.
3. The deployment command is documented in exactly one authoritative place.
4. No `src/`, `e2e/`, schema, scoring, or package file modified (unless a
   title-asserting spec was found — then only that expectation).

## Required verification

- Artifact greps above (technical gate §21 reproduction set) on both the
  ordinary build and the bundle.
- Serve the bundle once via `npm.cmd run preview` (or the gate's nested-path
  static-host method) and confirm boot to the Dock with zero console/page
  errors — manual/browser check, not a committed spec.
- `git diff` review confirming the changed-file list matches "Likely source
  files" exactly.

## Rollback or failure boundary

All changes are additive/config-local and revert with
`git revert <commit>`. If the optional `vite.config.mts` base change breaks
the dev server or any existing spec's `baseURL` assumption, drop that change
and ship the unit without it (it is explicitly optional). If any check in
"Done criteria" cannot be met without touching `src/` or `package.json`,
stop and report rather than widening scope.

## Unresolved risks

- A hidden consumer of the template manifest/icons (PWA install flows) —
  low; the app is not offered as a PWA to participants.
- Windows `bash`-based `bundle.sh` requires `CI=true` to skip `zip`/`open`
  (documented gate §11); the deployment note must state this.
- The title string is participant-visible; if the research owner prefers a
  different neutral title, that is a one-line follow-up — not a blocker
  (using the already-committed product name invents nothing).

## Research-owner approval required before coding?

**No scientific approval is required** (no measurement surface). The normal
explicit user go-ahead for the next build beat **is** required, per
CLAUDE.md ("Do not start the next build beat without explicit approval").
Dependency note: the far more consequential Unit 3 (production
completion→return→export) remains blocked on INT-1/INT-2/INT-5 — sending
those ruling requests on day 1 is the schedule-critical action alongside
this unit.
