# Owner decision register — Station 080 correction sprint (2026-09-18)

Prepared by Fable. **Nothing in this register is resolved or implemented.**
Each entry names the exact affected Q/M item, current behaviour,
authoritative evidence, the choices, a recommendation, and the behavioural
and statistical consequence of each choice. Source analyses: the read-only
Q01–Q33 × M01–M26 crosswalk audit and the export/persistence audit run at
`882189a` (this sprint), on top of
`docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md` and
`docs/ai/PROPOSALS-SCIENTIFIC-REDESIGN-2026-09.md` (P1–P20).

Abbreviations: SA = `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`;
SPEC = `docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`;
XW = `docs/game/PILOT-M01-M26-IMPLEMENTATION-CROSSWALK.md`;
LED = `docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.md`;
PLAN = `docs/research/NEXT-09-ITEM-SEPARATION-AND-CARRYOVER-CONTROL-PLAN.md`;
ES / SP = `docs/research/event-schema.md` / `scoring-plan.md`.

## 0. Why no missing item was wired into the participant route this sprint

The sprint brief authorised implementing "all missing route integration
and task work that is already determined by owner-approved
specifications". The audit's strict reading of the authority record is
that **no such work is fully determined**:

- The battery is BFI-2 C Q01–Q12, Grit-S Q13–Q20, MPS-PDD Q21–Q25, MPS-IP
  Q26–Q28, Goal-Time Q29–Q33 (SPEC:17, :298, :516, :662, :754, :810).
- The participant route runs the 26-item **M battery** of the decision
  workbook: M01–M12 ≡ Q01–Q12 (identical wording, LED vs SPEC); M19=Q21,
  M20=Q25, M21=Q22, M22=Q24, M23=Q23, M24=Q27, M25=Q26, M26=Q28; M13–M18 =
  BESSI-192 Information Processing, **which is not in the battery**
  (LED:25-30; SA:78-84 fixes the battery as Q01–Q33).
- SA and the ruling form contain **no** mention of M01–M26, BESSI or
  D-X-1..4; the workbook calls its own rows "PROPOSED"; XW calls itself
  "not a scientific ruling" (XW:6). The M↔Q binding is open (XW D-X-2).
- SA §14 approves SA-1..SA-6, SA-12, SA-13, corridor de-gating and the
  Final Core baseline **at measurement-design level only**: "None of them
  approves … a canonical production event name … a derived variable,
  weight, threshold, formula … any implementation … building each remains
  a separately approved, bounded pass" (SA:906-914). Event-schema and
  scoring gates are OPEN (SA:1199-1209). Every `proto_*` name is absent
  from ES and SP.
- Route position, episode slot and time budget of any added window are
  unruled (SPEC:71-85 "TBD"; PLAN:477-501 "the cut decision is the
  research owner's"); the ledger budget is already 1535 s against the
  30-minute gate.

Wiring the developer-only `src/measurement/q*.ts` modules into the route
would therefore promote candidate event names, pick a route slot and a
budget cut, and choose between duplicate instruments (R5, R6) — each an
open decision. They remain developer-launch, contamination-stamped
modules. The end state stays a complete participant-accessible Q01–Q33
assessment; the path to it is R1–R7.

## 1. Register

### R1 — Pilot instrument scope (P1b / XW D-X-2). Affects Q13–Q20, Q29–Q33, M13–M18

- **Current:** route measures M01–M26; 13 battery items have no route
  window; ~390 s of item-owned time (M13–M18) measures an out-of-battery
  instrument.
- **Evidence:** LED:13-38; SA:78-84; XW:26-29, :589-592; AUDIT P1.
- **Choices:** (1) declare the 26-M subset as the pilot instrument, with an
  exported scope statement; (2) extend the route with windows for
  Q13–Q20/Q29–Q33; (3) replace the M13–M18 slots with battery-item windows.
- **Recommendation:** (3) as the target (budget-neutral: ~390 s freed vs
  ~8–10 min needed, PLAN:464-468), (1) only as an explicitly labelled
  interim.
- **Consequences:** (1) no criterion comparison for 13/33 items and ~25 % of
  active time without a questionnaire criterion; (2) breaks the 30-minute
  gate, adds fatigue/order confounds; (3) loses the ability covariate and
  creates new unpiloted windows that need their own validity evidence.

### R2 — M↔Q binding table (P1a). Affects M01–M12, M19–M26

- **Current:** binding exists only as identical wording; unapproved.
- **Choices:** approve the wording-identity table above / reject.
- **Recommendation:** approve (mechanically verifiable).
- **Consequence:** without it M-data cannot be joined item-wise to Q scores;
  every convergent-validity analysis is blocked.

### R3 — `itemIdentity` values (P1c, with SA-13 enumerations). Affects M01–M26

- **Current:** `coverageSchedule.ts:191` stamps `mission_brief` on all 26;
  allowed values `mission_brief | module_header | none` (`:97`); exported
  in `pilot_coverage.items[]`.
- **Evidence:** XW:58-76 lists other values but predates the v2 ledger and
  describes superseded mechanics; the code comment (`:89-91`) redefines
  `mission_brief` as "fixed by the decision workbook"; SA-13 reserves
  "field names, types, enumerations" for the event-schema ruling
  (SA:1106-1108). One internal inconsistency needs no ruling to _identify_:
  M08 and M11 have no scheduled opportunity (LED:20, :23) yet are stamped
  `mission_brief` although `none` is documented as "no scheduled
  opportunity" (`:95`).
- **Choices:** (a) keep uniform `mission_brief`; (b) XW values; (c) a new
  value (e.g. `decision_workbook`) for the 24 scheduled items and `none`
  for M08/M11.
- **Recommendation:** (c).
- **Consequence:** (a) exports a basis the repository record contradicts;
  (b) asserts "no wording recorded", which LED falsifies; (c) is a new
  enumeration value → needs the SA-13/event-schema ruling.
- **Not changed this sprint:** no value is unambiguous under tier 1–5
  authority, and the M08/M11 correction changes exported data, so it is
  bundled here rather than applied.

### R4 — Route integration of the SA-2..SA-6 / SA-12 modules. Affects Q03, Q04, Q16, Q23, Q27, Q29/Q31, Q30, Q32, Q33

- **Current:** modules exist (`src/measurement/q*.ts`), developer-launch
  only, stamped `contamination:developer_scene`; SA:913 / :1159-1160 still
  say they do not exist (stale — AUDIT B19).
- **Needs, in order (PLAN:521-531):** event-schema ruling (names, payloads,
  legacy-tag disposition) → SA-13 field contract → slot/budget/cut → scoring
  ruling.
- **Recommendation:** approve the `proto_*` families as "provisional,
  exported, unscored" for the pilot (the INT-2 precedent used for audit fix
  B2) and defer formulas; rule slots with R1.
- **Consequence:** yields raw exploratory data without indicators; without
  it the modules stay contaminated developer scenes and the 13 items stay
  unmeasured.

### R5 — Q27 double instrument. Affects Q27 (M24 magnet rig vs `q27UtilityStop`)

- **Choices:** designate M24 as the SA-2 instance / designate the utility bay.
- **Recommendation:** M24 (on the route; matches SA-2 per AUDIT:36); keep the
  utility bay developer-only.
- **Consequence:** running both creates a practised second zero-benefit
  exposure (order/contrast effect, XW:484-485).

### R6 — Q03 / Q04 / Q23 duplicates (M03/M04/M23 vs the q-modules)

- **Decision:** one primary per item (ruling §1). Owner must confirm whether
  M03's reset occasions satisfy SA-12's maintained-order/later-retrieval
  requirement; otherwise Q03 has no valid primary (SPEC:352).
- **Recommendation:** route M-windows as primaries where SA-12 is satisfied.

### R7 — Q13–Q17, Q19 (Grit PE/CI)

- **Needs:** the shared-stream ownership rulings (SPEC:534, :552, :588;
  PLAN:588-597) plus SA-9, SA-10 and D6. Corridor de-gating is
  design-approved only (SA:1114-1125). No recommendation is possible
  without the owner. Q18/Q20 stay questionnaire-primary (SA:130-152) — no
  route window is required for them.

### R8 — Workbook vs SPEC mechanics (tier-2 conflicts). Affects Q08, Q09, Q11, Q12, Q26

- **Current:** LED treats Q08/Q11 as questionnaire-primary (SPEC: Moderate /
  Strong behavioural), Q26 as a self-report probe (SPEC: Strong), Q12 as a
  QC error (SPEC: Hazard warning), Q09 as a monitor watch (SPEC: report-back).
- **Recommendation:** SPEC stays the rationale authority (CLAUDE.md tier 2);
  record each workbook mechanic as an approved alternative instance or
  downgrade its evidential label.
- **Consequence:** until ruled, convergent-validity claims for these items
  rest on analogues tier 2 did not approve.

### R9 — Entered-then-quit disposition (P13). Affects M13–M18 vs all other windows

- **Current:** pilot windows code an explicit stop `censored`
  (`windowKit.ts:250-284`); IP windows code it `missing/participant_absent`
  with `entered=true` (`informationProcessing/windowState.ts:217-224`); the
  IP `censored` branch has no caller.
- **Evidence:** the IP coding is **deliberate and documented**
  (`windowState.ts:15-16`; `docs/game/INFORMATION-PROCESSING-LAB.md` §5.3;
  XW:223-224) — but only in implementation-level documents that are
  explicitly not rulings; SA-13 requires only that completion, absence and
  censoring be distinguishable and reserves the enumeration.
- **Choices:** (1) recode IP explicit exit as `censored`; (2) keep both and
  document per-subsystem semantics; (3) keep dispositions, add an
  export-side derived flag `entered_then_quit` (already derivable as
  `entered && absent`).
- **Recommendation:** (3) now (no validity-rule change), (1) if the owner
  wants one vocabulary.
- **Consequence:** pooling `participant_absent` mixes "never took it up" with
  "took it up and abandoned" unless `entered` is used; (1) changes
  `invalid_reason`/coverage status in exported `proto_m1x_*` stop events.
- **Not changed this sprint** (a validity-rule change needs authority).

### R10 — Remaining P-series proposals (unchanged, all open)

P3 (M02 correctness gate), P4 (comprehension gates asserted), P5 (exterior
order counterbalancing), P6 (M24/M26 invalidation correlated with the
measure), P7 (M07 non-engagement), P8 (M12 oracle), P9 (never-name list),
P10 (M13 beacon), P14–P20. See the proposals document; nothing implemented.

### R11 — Export: what this sprint implemented vs what stays open (P2 / D2.11)

- **Implemented under the sprint's explicit export direction** (see
  `EXPORT-AND-PERSISTENCE.md`): non-observed summary fields are `null`
  with an explicit per-field disposition; `export_schema_version` and
  `summary_scope_version` ride every payload; the Qualtrics return URL
  carries the disposition word instead of a number for a non-observed
  field. `ScoringManager.computeSummary` and every scoring-plan formula
  are untouched; legacy/developer routes export exactly as before.
- **Still the owner's:** whether the return URL should _omit_
  non-applicable fields instead of carrying the disposition word (P2 alt 2
  vs alt 1); the exact field list that may ship to Qualtrics; a queryable
  `schema_version` column (migration + edge function).

### R12 — Reload and keep-alive (P11 / P12)

- **Implemented, record-only:** see `EXPORT-AND-PERSISTENCE.md`.
- **Still the owner's:** whether a reloaded session is analysable at all
  (P11 alt 2 hard-invalidate vs the record-only stamp); server-side
  precedence between several keep-alive rows of one page load
  (`QUALTRICS-HANDOFF.md:131-133`); a `visibilitychange→hidden` keep-alive
  for mobile/tab-discard (no `pagehide` fires there, so no server record
  exists at all).

### R13 — Art pipeline (presentation, not science)

- The painted plates are PixelLab generations. CLAUDE.md requires explicit,
  standalone approval for any PixelLab call; the sprint brief did not name
  PixelLab, so **no generation was spent**. Every art change this sprint is
  reproducible Pillow surgery on the existing paintings
  (`scripts/world-v2/plate_edits.py`) or engine-side layering.
- **Decision:** approve PixelLab regeneration for (a) a true open-exterior
  Recovery Yard plate and (b) larger interior plates, or accept the
  recomposed plates. Until then the asset set stays PROVISIONAL and
  unfrozen.
