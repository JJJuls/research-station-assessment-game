# Export, persistence and data safety — Station 080 correction (2026-09-18)

Implements the owner-directed export correction. **No event name, event
payload key, scoring formula, weight, threshold or validity rule changed.**
`ScoringManager.computeSummary` is byte-identical; everything below happens
at the export boundary or is record-only.

## 1. Absent is never zero (`src/systems/SummaryScope.ts`)

Problem (audit B1 / P2): `computeSummary` counts legacy event names and
defaults to `0` / `false`. On the pilot route 43 of the 59 summary fields
are fed only by rooms the route never reaches, so a completing participant
exported `game_persistence_total=0`, `organization_prep_count=0`, … —
zeros that read as observed low-trait evidence.

Every export now masks the summary per feeding family:

| Disposition      | Meaning                                                                                  | Value      |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------- |
| `observed`       | the family was offered and answered in this page load                                    | the number |
| `not_applicable` | the active route cannot offer the family at all                                          | `null`     |
| `no_opportunity` | in scope, but never opened in this session (terminal export)                             | `null`     |
| `censored`       | opened, no answer by a terminal export                                                   | `null`     |
| `interrupted`    | in scope, no answer in THIS page load and earlier loads exist (summary counts this load) | `null`     |
| `pending`        | in scope, session still running (keep-alive envelope)                                    | `null`     |

Every word except `observed` already exists in the validity register /
coverage vocabulary; `observed` deliberately is not `valid`. Masking is per
family, so **no composite can be manufactured from missing inputs**.
Identity, context, completion and data-quality fields are always observed.

Payload additions (inside `payload`, because the ingest function stores the
payload verbatim and drops unknown envelope keys): `export_schema_version`
(`2026-09.1`), `summary_dispositions`, `summary_scope` (`pilot_route_v1` |
`legacy_full`), `summary_scope_version`. The Qualtrics return URL carries
the disposition word in place of a value (never a number, never `"null"`).
Developer launches (including `?route=legacy`) keep the full numeric
summary — their specs and data are unchanged.

Proof: `e2e/summary_scope.spec.ts` (pure) — pilot scope with no events ⇒
exactly 43 fields `null` / `not_applicable`; no field with a disposition
other than `observed` carries a number or boolean; a never-offered Dock
check-in is `no_opportunity`, an unanswered one `censored`, a running one
`pending`, a reloaded one `interrupted`; no scope ⇒ byte-identical to
`computeSummary`; the URL form contains no `null`.

## 2. Reload during an open window (P11 — record-only part)

Facts (behaviour unchanged): identity, event `sequence`, a 1-based
`page_load_index` and earlier loads' events persist (durable store); the
pilot route, windows, validity register and coverage are page-session state
and restart. After a reload the closure therefore codes pre-reload work
`no_opportunity` / `participant_absent`, and a redone window codes `valid`
a second time — two accounts of one opportunity are exportable (load-1
keep-alive row vs load-2 completed row).

Implemented: every export's `pilot_coverage` now carries `page_load_index`
and `reloaded`, and the summary uses `interrupted`, so an analyst can always
separate first-exposure data. **Not implemented (owner decision R12):**
per-opportunity `prior_exposure` reload stamps in the validity register, or
hard invalidation of reloaded sessions — both write new values into the
exported register. Note for that decision: P11's text says
`page_load_index > 0`; the index is 1-based, so the condition is `> 1`, and
with a `memory_only` / `degraded` store it stays 1 across reloads (flag via
`event_integrity.durable_store`).

## 3. Page hide / restore and keep-alive freshness (P12)

Facts: the only export trigger is `pagehide` (non-persisted, non-terminal);
there is no `pageshow` or `visibilitychange` export. Alt-tab does not fire
`pagehide`, so the audit's "minute-2 alt-tab freezes the record" scenario
does not occur. A stale resend did occur when `pagehide` fired without the
page dying, or when the durable store was degraded (index stuck at 1 while
sessionStorage survived).

Implemented: the compact keep-alive envelope is frozen per (identity,
`page_load_index`, status, kind, **last event sequence**). A later pagehide
with new events builds a fresh envelope (new `export_id`, new row); a retry
with no new event re-sends identical bytes (server dedupe still answers
200). Only the latest compact envelope is kept in storage. Full and debug
envelope keys are unchanged. Analysis picks the latest row per (identity,
`page_load_index`) by `event_integrity.last_sequence`. **Open (R12):** a
`visibilitychange → hidden` keep-alive for mobile / tab discard, where
`pagehide` may never fire and no server record exists at all.

## 4. Entered-then-quit (P13)

Not changed — the IP windows' `participant_absent` + `entered=true` coding
is deliberate and documented, and recoding is a validity-rule change
(register R9). "Took it up and abandoned" is derivable as
`entered && absent` from the exported register.

## 5. itemIdentity

Not changed — no value is unambiguous under tier 1–5 authority (R3).

## 6. Production readiness

**Not production-ready.** No configured synthetic end-to-end submission was
possible: the checkout has no `.env.local` (ingest URL / publishable key)
and no linked Supabase project. All export proof here is pure or
mock-route. This remains an internal / supervised evaluation build.
