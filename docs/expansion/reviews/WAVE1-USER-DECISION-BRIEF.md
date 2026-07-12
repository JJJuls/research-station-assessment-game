# Wave 1 User Decision Brief — Blocked Rulings

Prepared after the Wave 1 review gate (`WAVE1-REVIEW-GATE.md`, commit `c22ad7d`,
gate result CONDITIONAL PASS). This brief **presents** the open user-owned
decisions; it does not resolve, infer, or recommend any of them. Every option
listed below is taken verbatim-or-paraphrased from an existing project document;
no new options are proposed.

Sources: `WAVE1-REVIEW-GATE.md`, `WAVE1-RESEARCH-DATA-REVIEW.md`,
`WAVE1-GAMEPLAY-IMPLEMENTATION-REVIEW.md`, `docs/expansion/ACTIVE-EXPANSION-STATE.md`
("Unresolved issues" 1–8; issue 9 is cleared), `docs/expansion/REMAINING-STATION-INVENTORY.md`
(Station 4 + "Cross-station unresolved scientific parameters"),
`docs/expansion/WAVE-1B-VERIFICATION-PLAN.md` §7, `docs/game/rooms/05-hazard-control.md`,
`docs/research/event-schema.md` §4, `docs/research/scoring-plan.md` §8,
`docs/research/stimulus-freeze-checklist.md`, V3 contract §4/§5/§6/§10,
`docs/mps_vertical_slice.md`.

**Totals: 8 decisions. Required immediately: 1 (D1). Required before the supervised
scoring beat / any deployment: 1 (D2). Safely deferrable now: 6 (D3–D8), two of
which (D7, D8) gate the pilot/stimulus freeze rather than any build work.**

---

## Section A — Hazard Control decisions

### D1. `hazard_avoidance` canonical resolution — REQUIRED IMMEDIATELY (blocks Hazard Control)

1. **Exact question:** When the player chooses "avoid the uncertain route" in Hazard
   Control, how should the legacy `hazard_avoidance` event be represented in the
   canonical V3 event scheme: (a) propose a new canonical event
   `hazard_route_avoided` (an external V3 document change), or (b) fold the branch
   under the existing canonical `hazard_info_checked` with
   `metadata.outcome = "avoided"`?
2. **Affected:** legacy event `hazard_avoidance` (third prompt option); room
   `hazard_control_room`, task `hazard_route_decision`; legacy derived variable
   `abandonment_count` (defined as `hazard_avoidance` in
   `docs/mps_vertical_slice.md:61-62`); potentially a new canonical event name and
   its `study_item_ids`/`construct_id`.
3. **Current implemented state:**
   - Referenced in code only in the prototype scene: `src/scenes/Main.tsx:863`
     (avoid option emits `hazard_avoidance`), driven from
     `src/data/researchInteractions.ts:72-79` (`hazardUncertaintyWarning`,
     `room_id: 'hazard_control_room'`, `task_id: 'hazard_route_decision'`).
   - **No canonical context entry exists**: `src/world/CanonicalEventContext.ts`
     registers only `hazard_warning_seen` (195), `hazard_info_checked` (201),
     `hazard_informed_continue` (211), `hazard_reckless_continue` (220) —
     `hazard_avoidance` is absent.
   - No connected-world Hazard scene exists (no `src/scenes/*Hazard*`, no `hazard`
     scene key, `stationRegistry.ts:94-96` entry has no `sceneKey` — sealed door).
4. **Authoritative files/sections:** `docs/research/event-schema.md` §4 Hazard
   Control table (legacy-only row, line 235); `docs/game/rooms/05-hazard-control.md`
   lines 50–54 (the two options), 73–77 (edge-case constraints), 98–100 ("resolve…
   before or during this room's implementation beat");
   `REMAINING-STATION-INVENTORY.md` Station 4 (lines 216–260) and cross-station
   item 3 (430–432); V3 §4 Room 5; `ACTIVE-EXPANSION-STATE.md` unresolved issue 3.
5. **Why not autonomous:** it is a construct-mapping/canonical-naming decision —
   event-schema.md and the room doc explicitly route it to "user /
   psychometric-task-design decision", and option (a) modifies the authoritative V3
   contract, which is outside this repo's scope. CLAUDE.md forbids autonomous
   Q-item-to-mechanic decisions.
6. **Documented options (only these are on record):**
   - **(a)** Propose canonical `hazard_route_avoided` as a V3 addition
     (external document change).
   - **(b)** Fold under `hazard_info_checked` with `metadata.outcome = "avoided"`.
   - (Context recorded in the inventory, not an option ruling: under additive port
     discipline the legacy event could ship verbatim with the canonical question
     open, but the room doc's "before or during this room's implementation beat"
     wording makes this a stop-and-report parameter — hence this brief.)
7. **Consequences of each (as documented):**
   - **Candidate `study_item_ids`/`construct_id`:** none are documented for
     `hazard_avoidance` itself — the room's committed values cover only the four
     exact events (`hazard_warning_seen` → `prudence` Q12; `hazard_info_checked` →
     intentionally unset, Q12+Q27; `hazard_informed_continue` →
     `goal_time_exploratory` Q31; `hazard_reckless_continue` →
     `inappropriate_persistence` Q12/Q27/Q31). Any assignment for the avoid branch
     is itself part of this ruling.
   - **Leaving it effectively control-only / legacy-unmapped (option b):** no new
     canonical event; the avoid branch surfaces only through
     `hazard_info_checked`'s metadata; the room doc's edge cases still require
     avoid-after-checking vs. avoid-without-checking to be distinguishable in raw
     data; note that `hazard_info_checked` currently means "player checked
     details", so the fold's semantics are exactly what the ruling must define.
   - **Assigning it to a research construct via a new canonical event (option a):**
     requires the external V3 change first; the new entry's
     `study_item_ids`/`construct_id` must then be supplied by the user (nothing
     documented to copy); room doc constraints apply — avoidance must never be
     scored as reckless (recklessness requires _continuing_ uninformed) and
     avoid-after-checking is an informed, cautious choice distinct from both
     continue paths.
   - **Either way:** legacy `hazard_avoidance` is preserved verbatim (Station 4
     "Legacy events (preserve verbatim)"), and legacy `abandonment_count` continues
     to derive from it.
8. **Blocked work:** the entire Hazard Control beat — `HazardScene`, registry
   `sceneKey` flip, canonical additions (`hazard_room_entered`,
   `hazard_issue_created`, `hazard_issue_resolved`), cross-room
   `final_hazard_issue` propagation into Final Core (FinalCoreScene explicitly
   stubs "hazard consequence flags stay unemitted", `FinalCoreScene.ts:36`),
   `hazard_control_logging.spec.ts` (V3 §9), and the Hazard room doc's done test.
   This is the **only remaining Wave 1 build task**; nothing else can proceed
   autonomously (`ACTIVE-EXPANSION-STATE.md` "Exact next action (BLOCKED)").
9. **Timing: required immediately.** Explicitly required "before or during this
   room's implementation beat"; it is the gate's recommended next ruling.

**Exact ruling required before Hazard Control can be implemented:** choose (a)
or (b) above — and if (a), supply the new canonical event's
`study_item_ids`/`construct_id` (or direct that they stay unset/control-labelled).

---

## Section B — Beat-13 scoring decisions

### D2. Beat-13 scoring fixes bundle — REQUIRED BEFORE THE SUPERVISED SCORING BEAT / ANY DEPLOYMENT

1. **Exact question:** What is the approved scope and content of the supervised
   Beat-13 scoring beat (V3 §10 "Beat 13 — Full ScoringManager subindices")?
   Four user-flagged sub-items are on record:
   1. `strategy_revision_count` prudence-mixing fix — the current formula
      (`archive_strategy_revision + repair_strategy_revision + hazard_info_checked`,
      `docs/mps_vertical_slice.md:58-59`) folds a prudence event into an
      adaptive-persistence count (construct mixing; "user-flagged fix, do not
      touch autonomously", `REMAINING-STATION-INVENTORY.md:243-245`).
   2. `game_inappropriate_persistence` 4th term — adding `final_core_force_continue`
      per V3 §6's composite formula (review-gate finding RD-1, the gate's single
      major).
   3. `final_quality_score` shape.
   4. Exploratory-label mechanism — scoring-plan §8's two documented options:
      **(a)** rename surfaced variables with an `_exploratory` suffix (e.g.
      `goal_time_delayed_benefit_investment_exploratory`) or **(b)** ship a
      parallel `exploratoryProxyLabels: Record<string, string>` map alongside the
      summary (`docs/research/scoring-plan.md:159-162`).
2. **Affected:** `src/systems/ScoringManager.ts` (untouched since Beat 13 was
   deferred), `src/systems/QualtricsBridge.ts`; unemitted events
   `final_quality_score_computed`, `final_summary_previewed`,
   `qualtrics_return_previewed`; summary variables `strategy_revision_count`,
   `game_inappropriate_persistence`, `final_quality_score`, and every
   exploratory-proxy field's surfaced name.
3. **Current implemented state:** ScoringManager/QualtricsBridge confirmed
   zero-diff in the review range; the three Beat-13 events stay unemitted
   (asserted absent by specs); `final_core_force_continue` is emitted and logged
   raw but not summed into any summary variable.
4. **Authoritative files/sections:** V3 §6 (scoring contract) and §10 Beat 13;
   `docs/research/scoring-plan.md` §8 and §"Qualtrics" rules (lines 116–118);
   `REMAINING-STATION-INVENTORY.md` cross-station item 6 (437–439);
   `ACTIVE-EXPANSION-STATE.md` unresolved issue 6; review-gate RD-1.
5. **Why not autonomous:** CLAUDE.md forbids touching ScoringManager/QualtricsBridge
   without a contract-tied reason and forbids autonomous scoring decisions; the
   bundle is explicitly user-flagged "out of Wave 1A scope by design" and gated
   behind `qualtrics-logging-review` with user supervision.
6. **Documented options:** for sub-item 4, options (a)/(b) above; for sub-items
   1–3 the documents record the required _direction_ (V3 §6 formulas) but the
   bundle's scope, sequencing, and `final_quality_score` shape are left to the
   user's ruling — no enumerated alternatives exist on record.
7. **Consequences:** until the bundle lands, Final Core force-through actions are
   absent from the Qualtrics summary (RD-1) and `strategy_revision_count` keeps
   its documented construct mixing; the stimulus-freeze checklist item 4 (scoring
   version stamp) stays pending. Landing it requires a mandatory
   `research-data-reviewer` re-review plus the `qualtrics-logging-review` gate
   (review-gate §7).
8. **Blocked work:** the supervised Beat-13 scoring beat itself; the Beat-13
   additions to `final_core_summary.spec.ts` (verification-plan §4 item 5);
   downstream Beat 14 (Qualtrics return/summary preview).
9. **Timing:** not required before Hazard Control (review-gate §5); **required
   before any data-collection deployment** (gate condition 1) and before the
   stimulus freeze's scoring-version stamp.

---

## Section C — Other decisions (safely deferrable now)

### D3. Dock idle threshold / "idle" definition

1. **Exact question:** What idle threshold value and "idle" definition should
   drive `DOCK_IDLE_HELP_THRESHOLD_MS` (currently `null`, watcher disabled)?
2. **Affected:** `baseline_idle_seconds`, `tutorial_help_shown` watcher,
   `excessive_idle_after_instruction` (Interruption Corridor — unemitted).
3. **Current state:** watcher disabled; the three signals unemitted/uncaptured.
4. **Authoritative:** `ACTIVE-EXPANSION-STATE.md` issue 1;
   `REMAINING-STATION-INVENTORY.md` cross-station item 1;
   `stimulus-freeze-checklist.md` item 5 ("BLOCKED on user decision").
5. **Why not autonomous:** a measurement-defining task parameter (affects a
   data-quality covariate's meaning); explicitly user-supplied per the freeze
   checklist. (Also listed as an open parameter in the project memory since the
   V1 slice.)
6. **Documented options:** none enumerated — the documents record only that the
   value/definition must come from the user.
7. **Consequences:** while unset, no idle-based events/covariates are emitted
   anywhere (documented as deliberate); once set, the Interruption Corridor's
   `excessive_idle_after_instruction` can be wired in a room-scoped pass.
8. **Blocked work:** idle watcher enablement; `excessive_idle_after_instruction`
   emission; freeze-checklist item 5.
9. **Timing:** deferrable now; required before the stimulus freeze / pilot.

### D4. `construct_id` for abandon/return events (Q24/Q25 family)

1. **Exact question:** Should `archive_abandoned` (Q24),
   `archive_returned_after_failure` (Q24+Q25), `repair_abandoned`, and
   `repair_returned_after_failure` carry a `construct_id`, and if so which?
2. **Affected:** the four events' canonical registrations.
3. **Current state:** all four registered with `construct_id` intentionally unset
   (committed precedent "F1"; ports keep unset).
4. **Authoritative:** `ACTIVE-EXPANSION-STATE.md` issue 2;
   `REMAINING-STATION-INVENTORY.md` cross-station item 2;
   `stimulus-freeze-checklist.md` lines 21–24 ("psychometric decision routed to
   the user").
5. **Why not autonomous:** construct assignment is a psychometric ruling
   (psychometric-task-design gate).
6. **Documented options:** none enumerated beyond "unset (current precedent)" vs.
   "user supplies a construct"; no candidate construct value is documented.
7. **Consequences:** while unset, these events contribute traceable raw data
   (study_item_ids intact) but no construct-tagged scoring lane.
8. **Blocked work:** none — implementation shipped under the unset precedent.
9. **Timing:** deferrable; flagged as outstanding before the stimulus freeze.

### D5. `engineer_report_submitted_supervised` canonical mapping

1. **Exact question:** What canonical mapping (if any) should the legacy
   `engineer_report_submitted_supervised` event receive? The inventory records it
   as "needs a design decision, not a blind rename".
2. **Affected:** that legacy event (clarification-path report submission,
   Engineer Hub).
3. **Current state:** emitted verbatim in the ported report path, unmapped (no
   canonical registration).
4. **Authoritative:** `ACTIVE-EXPANSION-STATE.md` issue 4;
   `REMAINING-STATION-INVENTORY.md` lines 122–125, 148–150, cross-station item 4;
   `WAVE-1B-VERIFICATION-PLAN.md` §7 item 4; `docs/game/rooms/03-engineer-hub.md`
   lines 112–115.
5. **Why not autonomous:** an explicit canonical-mapping design decision routed to
   the user; additive-port discipline preserves the legacy event meanwhile.
6. **Documented options:** none enumerated — only "legacy stays verbatim/unmapped"
   (current) vs. a user-defined mapping.
7. **Consequences:** while unmapped, the event ships raw without
   `study_item_ids`/`construct_id`; documented as non-blocking.
8. **Blocked work:** none.
9. **Timing:** safely deferrable (explicitly "does not block implementation").

### D6. `interruption_alert_acknowledged` → `competing_task_viewed` mapping

1. **Exact question:** Should legacy `interruption_alert_acknowledged` map to the
   canonical `competing_task_viewed` (which is registered but deliberately
   unemitted pending this ruling)?
2. **Affected:** legacy `interruption_alert_acknowledged` (return path);
   canonical `competing_task_viewed` (Q17-linked,
   `consistency_of_interest_exploratory` per the wave registrations).
3. **Current state:** legacy event emitted verbatim; `competing_task_viewed`
   stays unemitted; mapping deferred under additive discipline.
4. **Authoritative:** `ACTIVE-EXPANSION-STATE.md` issue 5;
   `REMAINING-STATION-INVENTORY.md` cross-station item 5 and lines 332–336;
   `WAVE-1B-VERIFICATION-PLAN.md` §7 item 5.
5. **Why not autonomous:** explicit mapping decision (psychometric equivalence of
   "acknowledged the alert" and "viewed the competing task" is a scientific call).
6. **Documented options:** map it (emit `competing_task_viewed` alongside) vs.
   leave deferred — only these two states appear in the documents.
7. **Consequences:** while deferred, the Q17 exploratory lane receives no
   `competing_task_viewed` observations from this path.
8. **Blocked work:** none.
9. **Timing:** safely deferrable (explicitly non-blocking).

### D7. `task_started` Q-listing conflict (Q05 vs. Q05+Q15)

1. **Exact question:** Which listing governs `task_started`: V3 §5 (lists it under
   Q05 **and** Q15) or `MASTER_33_ALIGNMENT.md` (Q05 only)?
2. **Affected:** canonical `task_started` (would apply to Repair, Archive,
   Interruption).
3. **Current state:** unemitted and unregistered until resolved; specs assert its
   absence.
4. **Authoritative:** `ACTIVE-EXPANSION-STATE.md` issue 8;
   `WAVE-1B-VERIFICATION-PLAN.md` §7 item 7; V3 §5; `MASTER_33_ALIGNMENT.md`.
5. **Why not autonomous:** resolving a contradiction between two authoritative
   scientific documents is the user's call by definition.
6. **Documented options:** adopt the V3 §5 dual listing vs. adopt the
   MASTER_33_ALIGNMENT single listing — the two conflicting sources are the only
   documented positions.
7. **Consequences:** while unresolved, three rooms emit no `task_started`
   (documented, spec-asserted); resolution adds one event registration + emissions
   in a room-scoped pass.
8. **Blocked work:** `task_started` emission only.
9. **Timing:** safely deferrable; belongs with the event-schema freeze
   (freeze-checklist item 3).

### D8. Stimulus-freeze reviewer dispositions (asset audit)

1. **Exact question:** Rulings on the five open asset-audit dispositions in
   `stimulus-freeze-checklist.md`: (1) **MAJOR** — Dock decor airlock at the
   arrival spawn is pixel-identical to the interactive Hub door (inflates
   `control_error_count`); documented options: distinct inert texture, reposition,
   or accept-and-document as part of the covariate's definition. (2) MINOR —
   Archive salience inversion (art disposition). (3) MINOR — Dock signage carries
   the cyan interactable cue. (4) MINOR — Archive exit-door placeholder texture.
   (5) Log-shelves interaction geometry (fix candidates: move station anchor or
   widen radius for that station only — measurement-affecting).
2. **Affected:** `control_error_count` covariate (item 1),
   `archive_log_compared` counts (item 5), affordance uniformity (items 2–4);
   asset set `outpost-assets-v1`.
3. **Current state:** audit verdict "Accept `outpost-assets-v1`, with conditions";
   manifest corrections applied; all five dispositions pending.
4. **Authoritative:** `docs/research/stimulus-freeze-checklist.md` (lines 27–54);
   `ACTIVE-EXPANSION-STATE.md` issue 7; `REMAINING-STATION-INVENTORY.md`
   cross-station item 7.
5. **Why not autonomous:** items 1 and 5 are measurement-affecting (covariate
   definitions), and any art change routes through the PixelLab gate, which
   requires explicit standalone user approval.
6. **Documented options:** as itemised in field 1 (the checklist enumerates them
   per disposition).
7. **Consequences:** item 1 is marked "Decision required before any pilot";
   items 2–5 gate the freeze checklist, not the build.
8. **Blocked work:** the stimulus freeze itself; no Wave 1/Hazard build work.
9. **Timing:** safely deferrable now; required before participants ("gate
   participants, not this wave").

---

## Summary table

| #   | Decision                                       | Blocks build now?            | Required when                                       |
| --- | ---------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| D1  | `hazard_avoidance` canonical resolution        | **Yes — sole build blocker** | Immediately (before the Hazard Control beat)        |
| D2  | Beat-13 scoring bundle (4 sub-items)           | No                           | Before the supervised scoring beat / any deployment |
| D3  | Idle threshold/definition                      | No                           | Before stimulus freeze / pilot                      |
| D4  | Abandon/return `construct_id` (Q24/Q25)        | No                           | Before stimulus freeze                              |
| D5  | `engineer_report_submitted_supervised` mapping | No                           | Deferrable (non-blocking)                           |
| D6  | `interruption_alert_acknowledged` mapping      | No                           | Deferrable (non-blocking)                           |
| D7  | `task_started` Q05/Q15 dual-listing            | No                           | With event-schema freeze                            |
| D8  | Stimulus-freeze asset dispositions (5 items)   | No                           | Before any pilot (item 1 MAJOR)                     |
