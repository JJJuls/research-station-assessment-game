# Research-Owner Ruling Form — INT-1, INT-2, INT-5, D2

**Copy-paste form.** Fill in each field, mark **APPROVED** or **NOT APPROVED**, and
add rationale. This form issues the binding rulings; the analysis behind each choice
is in `docs/decisions/QUALTRICS-INTEGRATION-DECISION-PACK.md` (INT-1/2/5) and
`docs/decisions/D2-BEAT13-SCORING-DECISION-PACK.md` (D2). **Nothing here is adopted
until you mark it APPROVED.** No implementation may begin before the fields that gate
it are approved.

- Ruling issued by: `__________________` Date: `__________`
- Repository checkpoint this form was prepared against: branch
  `fable-autonomous-game-build-v1`, HEAD `24afcad`.

> **Recommended choice** is pre-marked `«REC»` per field. `«REC»` is a
> recommendation only and is **not** authorised until you approve it. "Custom
> ruling" is available on every field.

---

## Blocking-order note (what gates what)

- **Before ANY implementation**: INT-1 mechanism, INT-2 channel, INT-5 taxonomy, D2
  scope — Unit 0.
- **Before an internal developer test**: none of these (dev debug API already works).
- **Before a supervised usability test**: none _strictly_ (serve `npm run bundle`;
  accept no data returns) — but INT-5 `is_test`/`launch_mode` recommended so test
  sessions are taggable.
- **Before a research pilot**: INT-1, INT-2, INT-5, **D2 (deployment-gating)**, plus
  P0-3 persistence + INT-3 identity (separate forms).
- **Before formal participant data collection**: all of the above **+ reproducibility
  validated** (Unit 6) + codebook 1:1 + external DPIA/consent `[EXTERNAL]`.

---

## INT-1 — Completion & Qualtrics return mechanism

**Launch mode (blocking prerequisite)** — permitted: `standalone (whole-window)` /
`embedded (iframe)`. `«REC» standalone`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.1 Selected mechanism** — permitted: `A same-window return_url navigation` /
`B postMessage+ack (embedded)` / `C hybrid` / `D manual button only` / `custom`.
`«REC» A (primary) if standalone; switch to B or C if embedded`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**INT-1.2 Fallback rule** — permitted: `manual "Return to survey" panel on null/failed return` / `none` / `custom`.
`«REC» manual panel + "data may not have saved" message`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.3 Acknowledgement rule** — permitted: `none (fire-and-forget nav)` /
`postMessage ack required` / `custom`. `«REC» none for A; ack required if B/C`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-1.4 Retry rule** — permitted: `manual retry via fallback UI` / `auto-retry N times` / `none` / `custom`.
`«REC» manual retry via fallback UI`.

- Selected: `__________` N (if auto): `____` — APPROVED / NOT APPROVED

**INT-1.5 Allowed return origins/schemes** (INT-4 cross-dep) — permitted:
`http(s) only + host allow-list` / `http(s) only` / `unrestricted (current)` / `custom`.
`«REC» http(s) only + host allow-list`.

- Selected: `__________` Allow-list: `__________` — APPROVED / NOT APPROVED

**INT-1.6 Participant failure behaviour** — permitted: `show completion + failure message + manual link` / `silent` / `custom`.
`«REC» show completion + failure message + manual link`. (Ethics-review-relevant copy `[EXTERNAL]`.)

- Selected: `__________` Message copy: `__________` — APPROVED / NOT APPROVED

---

## INT-2 — Raw-event export channel

**INT-2.1 Selected channel** — permitted: `A HTTPS ingestion endpoint` /
`B Qualtrics embedded-data only` / `C parent-window messaging` /
`D hybrid (summary→Qualtrics + raw→endpoint)` / `E local durable queue→acked export` /
`F summaries-only (formally accepted)` / `custom`.
`«REC» D implemented via E (durable buffer + acked POST)`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**INT-2.2 Raw-event destination** — permitted: `study HTTPS endpoint` / `not exported (F)` / `custom`.
`«REC» study HTTPS endpoint`. Endpoint URL/owner `[EXTERNAL]`: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.3 Summary destination** — permitted: `Qualtrics via INT-1 return` / `endpoint only` / `both` / `custom`.
`«REC» Qualtrics via INT-1 return`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.4 Persistence-before-ack rule** — permitted: `durable local buffer, retain until acked (E)` / `single POST, no buffer` / `none` / `custom`.
`«REC» durable local buffer, retain until acked` (also discharges P0-3).

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.5 Idempotency rule** — permitted: `composite key participant_id+game_session_id+export_id` / `per-event seq (needs P1-9)` / `content hash` / `custom`.
`«REC» composite natural key`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.6 Retry rule** — permitted: `retry failed POST until acked/backoff` / `retry N` / `no retry` / `custom`.
`«REC» retry with backoff until acked`.

- Selected: `__________` N/backoff: `____` — APPROVED / NOT APPROVED

**INT-2.7 Data-minimisation rule** — permitted: `raw events (pseudonymous) + summary + mission state` / `summary only (F)` / `custom`.
`«REC» raw + mission state + summary (justified by reproducibility)`. DPIA/consent cover `[EXTERNAL]`: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-2.8 Reproducibility requirement** — permitted: `mandatory (every summary field recomputable from raw)` / `summaries-only accepted (scores NOT reproducible)` / `custom`.
`«REC» mandatory`.

- Selected: `__________` — APPROVED / NOT APPROVED

---

## INT-5 — Status taxonomy

**INT-5.1 Selected taxonomy** — permitted: `A combined enum` / `B orthogonal dimensions` / `C minimal (session_status+is_test)` / `custom`.
`«REC» B (orthogonal)`, or `C` for a first supervised test only.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.2 Approved status values** (tick/edit; `abandoned` held pending D3):

- `launch_mode`: `production` / `test` / `development` — approve set: `__________`
- `session_status`: `in_progress` / `completed` / `incomplete` / `error` — approve set: `__________`
- `completion_reason`: `terminal_room_reached` / `participant_exit` / `technical_error` — approve set: `__________`
- `export_status`: `pending` / `acknowledged` / `failed` — approve set: `__________`
- `return_status`: `pending` / `returned` / `failed` / `not_applicable` — approve set: `__________`
- APPROVED / NOT APPROVED

**INT-5.3 Approved state transitions** — permitted: `per pack §5.3 table` / `custom`.
`«REC» adopt §5.3 table`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.4 Incomplete-session rule** — permitted: `best-effort emit on early exit (needs INT-2 E)` / `infer downstream by absence-of-completion only` / `custom`.
`«REC» infer downstream now; best-effort emit once E lands`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.5 Invalid-launch rule** (ties INT-3) — permitted: `flag on session_status` / `handled entirely by INT-3` / `custom`.
`«REC» defer to INT-3 ruling`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.6 Export-failure rule** — permitted: `export_status=failed + retain buffer + retry` / `custom`.
`«REC» export_status=failed + retain + retry`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.7 Return-failure rule** — permitted: `return_status=failed + fallback UI` / `custom`.
`«REC» return_status=failed + fallback UI`.

- Selected: `__________` — APPROVED / NOT APPROVED

**INT-5.8 Test/development data rule** — permitted: `launch_mode axis; exclude non-production downstream` / `reserved participant_id prefix` / `custom`.
`«REC» launch_mode axis + exclude non-production in analysis`. Test signal source: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

---

## D2 — Beat-13 scoring

**D2.1 Selected scope** — permitted: `α minimal remediation` / `β full V3 §6 migration` / `custom`.
`«REC» α (β requires uncaptured signals/undocumented formulas → would invent science)`.

- Selected: `__________` Rationale: `__________` — APPROVED / NOT APPROVED

**D2.2 Beat-13 ruling — `game_inappropriate_persistence` 4th term** — permitted:
`6A add final_core_force_continue (V3 §6)` / `6B leave out` / `custom`.
`«REC» 6A`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2b `strategy_revision_count` prudence-mixing** — permitted:
`5A split hazard_info_checked out into its own prudence variable` / `5B leave mixed` / `custom`.
`«REC» 5A`. New prudence variable name: `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2c `final_quality_score` shape** — permitted:
`7A categorical + numeric` / `7B numeric only` / `7C categorical only` / `custom`.
**NO RECOMMENDATION — evidence insufficient.** If 7A/7B, supply the numeric
definition (category→value, issue netting, range, valence): `__________`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.2d Exploratory-label mechanism** — permitted:
`8A _exploratory suffix on field names` / `8B parallel exploratoryProxyLabels map` / `custom`.
`«REC» 8A (low-confidence; both acceptable, silence is not)`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.3 Repeated-response rule** — permitted: `count all occurrences (current)` /
`first-response only` / `final-response only` / `dedupe per task` / `custom`.
**NO RECOMMENDATION — undocumented; must be ruled.**

- Selected: `__________` Applies to: `__________` — APPROVED / NOT APPROVED

**D2.4 Incomplete-session scoring rule** — permitted:
`compute + export, tagged by INT-5 session_status` / `do not score incomplete` / `custom`.
`«REC» compute + export tagged`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.5 Missing-item rule** — permitted: `N/A for α (no rate variables)` /
`define per rate (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.6 Denominator rule** — permitted: `N/A for α` / `define per rate (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.7 Partial-score rule** — permitted: `N/A for α` / `define (β)` / `custom`.
`«REC» N/A for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.8 Composite-score rule** — permitted:
`family-scoped composites only, no global score (V3 §6)` / `custom`.
`«REC» family-scoped only, no global`. Retain `game_persistence_total`? YES / NO.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.9 Scoring-version identifier** — permitted: `<string you supply>` / `custom`.
**Required.** Value: `__________`.

- APPROVED / NOT APPROVED

**D2.10 Rounding rule** — permitted: `integers as-is (α)` / `define for floats (β)` / `custom`.
`«REC» integers as-is for α`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.11 Export-field rule** — permitted:
`α: existing 59 fields + persistence fixes + labels + scoring_version` / `custom`.
`«REC» α field set`.

- Selected: `__________` — APPROVED / NOT APPROVED

**D2.12 Researcher notes** (task semantics, valence, cautions to preserve):
`____________________________________________`

---

## Privacy/Security addendum (added by the pre-pilot privacy/security gate)

These fields were added by `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`
(analysis: `docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md`). They are
**new** and **not adopted**; each requires **owner or institutional approval**.
No existing field above was altered.

**PSA-1 — Test/production separation signal (PS-2)** — permitted:
`launch_mode axis (INT-5) + reserved test-id convention` / `custom`.
`«REC» launch_mode=production|test|development + exclude non-production in analysis`.
**Requires owner approval; gates L3.**

- Selected: `__________` Test signal source: `__________` — APPROVED / NOT APPROVED

**PSA-2 — Return-URL identity minimisation (PS-4)** — must the return URL echo
`participant_id`? permitted: `no (Qualtrics already holds the mapping)` /
`yes (echo participant_id)` / `custom`. `«REC» minimise — summary fields only`.
**Requires owner approval.** (Raw events must NEVER travel in a URL — fixed constraint.)

- Selected: `__________` — APPROVED / NOT APPROVED

**PSA-3 — Ingestion endpoint region/provider/retention (PS-5, PS-12) `[EXTERNAL]`**
— permitted: `institutionally-approved host+region+retention` / `no endpoint (summaries-only, F)` / `custom`.
**Requires institutional approval; gates L4.**

- Host/region: `__________` Provider: `__________` Retention: `__________`
  Approval ref `[EXTERNAL]`: `__________` — APPROVED / NOT APPROVED

**PSA-4 — Participant withdrawal / deletion procedure (X6) `[EXTERNAL]`** —
permitted: `institution/ethics-defined procedure` / `custom`.
**Requires ethics/institutional approval; gates L4.** No withdrawal right or
retention period is assumed by this repository.

- Procedure ref `[EXTERNAL]`: `__________` — APPROVED / NOT APPROVED

---

## Sign-off

- INT-1 complete: APPROVED / NOT APPROVED
- INT-2 complete: APPROVED / NOT APPROVED
- INT-5 complete: APPROVED / NOT APPROVED
- D2 complete: APPROVED / NOT APPROVED
- Privacy/Security addendum (PSA-1..PSA-4) complete: APPROVED / NOT APPROVED
- Signature: `__________` Date: `__________`

**Next authorised action after sign-off**: Unit 0 recorded → begin **Unit 1**
(empty-identity handling) verbatim from `PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md §19`,
then Units 2–7. Until every gating field above is APPROVED, **no production
integration or scoring implementation may begin.**
