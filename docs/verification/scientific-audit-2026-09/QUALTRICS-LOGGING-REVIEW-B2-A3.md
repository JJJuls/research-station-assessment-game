# Qualtrics-logging review — audit fixes B2 + A3 (2026-09-13)

Scope-focused review of the two pipeline-touching audit fixes (the full
pipeline audit is `AUDIT-FINDINGS.md`; this review covers only the diff).

## 1. Scope

- B2: `src/systems/ResearchRuntime.ts` (export augmenter installation +
  two payload fields), `src/systems/ResearchExportClient.ts`
  (`ResearchExportPayload.measurement_validity` / `pilot_coverage`,
  optional), `src/pilot/pilotCoverage.ts` (module-load augmenter
  installation).
- A3: `src/pilot/PilotZoneScene.ts` `npcBeatOptions` metadata.

## 2. Payload/field check

- A3 adds `option_position`, `option_count`, `focus_default_position`
  to the METADATA of `pilot_npc_beat` — unmapped route telemetry;
  additive; no existing key renamed or removed; no canonical event
  touched. PASS.
- B2 adds two OPTIONAL top-level export-payload fields, marked
  PROVISIONAL exactly like the INT-2 losslessness fields. No event
  payload changes. PASS.

## 3. Raw-vs-summary integrity

- The augmenter is read-only: `serializeOpportunities()` returns copied
  records (spread + copied `prior_exposure` array; `validity.ts:215-219`)
  and `pilotCoverage()` derives fresh items. Nothing mutates or truncates
  `raw_events`.
- Hardened after first draft: the payload assembles the two fields
  EXPLICITLY (never an object spread, so an augmenter can never shadow
  `raw_events`/`summary`), and an augmenter exception yields `undefined`
  fields rather than a failed export (`ResearchRuntime.augmented()`).
  PASS.

## 4. Debug API status

`printSummary` / `completeDebugSession` / `getEvents` / `printEvents` /
`exportEventsJSON` untouched by the diff. PASS (by inspection).

## 5. Qualtrics parameter handling

Launch parsing untouched. The return URL builds from SUMMARY fields only
(`QualtricsBridge.buildReturnUrl`) — the new payload fields deliberately
do NOT ride the URL (size, and no ruling authorises new URL fields).
PASS.

## 6. Scoring contract compliance

No scoring code touched; no candidate indicator implemented; the
register/coverage snapshots carry dispositions and operational counts,
never scores or trait values. PASS.

## 7. Issues found

- MINOR (accepted, documented): the compact keep-alive export gains
  ~5–10 KB from the two snapshots; its size-bounding loop truncates
  `raw_events` only, so the snapshots always survive — worst case
  slightly fewer raw events ride the keep-alive (they remain in the
  durable buffer and every later export; see also open proposal P12).
- NOTE: `pilot_coverage.items` carries reviewable operational labels
  (the same strings as the DEV probe). They go to the RESEARCH export
  only, never to the participant-facing return URL.

## 8. Recommended fixes

None outstanding for this diff. The wider export-contract questions
(zero-filled summary B1/P2; keep-alive freshness P12) remain
research-owner decisions and were deliberately not touched.
