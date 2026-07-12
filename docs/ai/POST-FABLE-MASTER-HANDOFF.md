# Post-Fable Master Handoff

Single authoritative continuation document, written at the end of the
final temporary Fable window (2026-07-13). Allows any capable model
(Sonnet, Codex, GPT-5.6, …) or human to continue with NO access to any
Claude conversation. Where this file and `git log` disagree, `git log`
and `docs/expansion/ACTIVE-EXPANSION-STATE.md` (updated per commit) win.

## 1. Repository state

- **Branch**: `fable-autonomous-game-build-v1` (all work local; nothing
  pushed; no PRs).
- **Protected branch**: `fable-final-game-prep-from-prototype` @
  `e8a8994` — untouched; never modify, never force-push.
- **Verified base tag**: `hazard-control-verified-201c8fa` (Wave 1: all
  8 stations implemented + runtime-verified).
- **V1 slice frozen at** `556e273`; `public/` assets unchanged since.
- **Stack**: Phaser 3 + TypeScript + Vite; Windows; use `npm.cmd`.

## 2. Sprint A commit ledger (chronological, all local)

| SHA       | Content                                              |
| --------- | ---------------------------------------------------- |
| `2c455c7` | A1 transition contract + `transition-inventory.json` |
| `6424697` | A2 state/session continuity contract                 |
| `54ba3e8` | A2 continuity spec + SwiftShader WebGL flake fix     |
| `76c91f2` | A3 journey helpers + NW-anchor hub routes            |
| `167837e` | A3 full-door-ring navigation smoke                   |
| `71cadfb` | A3 state/handoff checkpoint                          |
| `278f9ef` | A4 three participant journeys + evidence             |
| `d58ddd7` | A5 cross-room integration contract                   |
| `9d6406d` | A6 room-acceptance + connected-journey templates     |
| `fe325db` | A6 station conventions + debugging checklist         |
| `3ee9424` | A6 prettier-mangle fix                               |
| `d6a5a84` | Phase 5 technical stimulus-freeze audit              |
| `1c3f492` | Phase 6 Sonnet continuation guide                    |
| `900cd61` | Phase 4 lifecycle audit + launch-failure spec        |

Sprint A touched ONLY `docs/`, `e2e/`, and `playwright.config.ts` —
zero `src/` changes since `201c8fa`. No Sprint B commits exist yet.

## 3. World inventory

Eight stations (single source of truth `src/world/stationRegistry.ts`;
coordinates/doors/spawns/entry-events in
`docs/architecture/transition-inventory.json`): archive_room,
systems_repair_room, engineer_hub, inventory_prep_room,
hazard_control_room, optional_side_repair_bay, interruption_corridor,
final_core_room — plus Dock (tutorial/start) and Hub (door ring + status
board). Routes: `?scene=` params per registry + `dock`/`hub`/`archive`/
`prototype` static; unknown/absent → dock fallback (documented intent).

## 4. Architecture contracts (read before touching anything)

- `docs/architecture/CONNECTED-WORLD-TRANSITION-CONTRACT.md` (A1)
- `docs/architecture/STATE-AND-SESSION-CONTINUITY.md` (A2 — store
  lifetimes, one-shot flags, reload semantics)
- `docs/architecture/CROSS-ROOM-INTEGRATION.md` (A5 — writers→readers
  matrix; Hazard three-layer split)
- `docs/architecture/STATION-IMPLEMENTATION-CONVENTIONS.md` (A6 —
  registration/state-lifetime conventions, fragile points,
  no-further-centralization ruling)
- `docs/architecture/PARTICIPANT-LIFECYCLE.md` (Phase 4)
- `docs/ai/DEBUGGING-CHECKLIST.md` — first stop for ANY failure
- `docs/testing/ROOM-ACCEPTANCE-TEMPLATE.md`,
  `docs/testing/CONNECTED-JOURNEY-TEMPLATE.md` — before writing tests

## 5. Tests

- Commands: `npx playwright test` (full, ~30 min, serial 1 worker);
  `npx playwright test e2e/<file>` targeted; `npm.cmd run lint:tsc`;
  `npm.cmd run build`; dev server `npm.cmd run start` (5173, reused).
- **Current count: 38 tests / 14 spec files, all passing.**
  Phase-boundary full run (36 tests then collected): Playwright
  `.last-run.json` status "passed", 0 failed, 31.7 min;
  `e2e/participant_lifecycle.spec.ts` (2) added after, 2/2 targeted PASS.
- SwiftShader launch args in `playwright.config.ts` are load-bearing.

## 6. Defect status

- **Known technical defects: none.** Every audit (A1, A2, A5, Phase 4,
  Phase 5) closed with zero demonstrated defects with authoritative
  semantics. Sprint A fixed test-infrastructure defects only (WebGL
  first-context flake, count-race, hub route wedging).
- Documented non-defects (do NOT "fix"): double `setCurrentRoom`;
  silent dock fallback; Hazard board line permanently `pending`;
  `unresolved_objectives` unused vocabulary; `hazard_status` having no
  reader.

## 7. Unresolved scientific decisions (user-owned — never decide)

1. Dock idle threshold + definition (`DOCK_IDLE_HELP_THRESHOLD_MS`).
2. Q24/Q25 `construct_id` for abandon/return events.
3. `engineer_report_submitted_supervised` mapping.
4. `interruption_alert_acknowledged` mapping.
5. **Beat-13 scoring bundle (D2)** — NOT implemented, by instruction;
   includes `strategy_revision_count` prudence-mixing and the A4
   inventory organization naming split (legacy vs canonical event names
   in the frozen formulas).
6. `task_started` Q05/Q15 dual-listing.
7. **Hazard→Final Core consequence** (`hazard_issue_created/resolved`,
   `final_hazard_issue`) — state is available and verified, nothing
   consumes it, semantics unspecified (`CROSS-ROOM-INTEGRATION.md` §3).
8. Asset-audit dispositions: Dock decor-airlock control-error inflation
   (MAJOR), Archive shelf geometry undercount, salience minors.
9. D2–D8 in `docs/expansion/reviews/WAVE1-USER-DECISION-BRIEF.md`.

## 8. Status of gated work

- **Beat-13 scoring**: not started; gated on D2 ruling; top-tier model.
- **Independent Hazard review**: pending; assigned to Sonnet
  (`SONNET-CONTINUATION-GUIDE.md` S1; scope `317e07b..201c8fa`).
- **Stimulus freeze**: NOT approved. Technical portion audited clean
  (`docs/research/STIMULUS-FREEZE-TECHNICAL-AUDIT.md`); remaining
  technical tasks T1–T4 there; scientific gate items in
  `docs/research/stimulus-freeze-checklist.md`.

## 9. Work split

- **Sonnet**: Hazard review (S1); suite upkeep/extension (S2–S3);
  pre-pilot T1–T3; route tuning. See `SONNET-CONTINUATION-GUIDE.md`.
- **Codex**: mechanical spec authoring from `transition-inventory.json`
  plus the A6 templates; repo-wide CRLF/lint cleanup (353 pre-existing,
  never blocking).
- **User**: every item in §7; PixelLab approvals (T4); freeze approval.
- **Top-tier model**: Beat-13 implementation (after D2);
  Hazard→Final Core consequence (after ruling); any change to canonical
  event semantics, ScoringManager, QualtricsBridge, or
  CanonicalEventContext.

## 10. Exact next recommended task

Sonnet: run the independent Hazard review (S1). User: rule on D2 (the
pilot-critical gate) and the Dock decor-airlock disposition. After D2:
Beat-13 bundle by a top-tier model per V3 + the decision brief.

## 11. Ranked implementation backlog (all known work, in order)

| #   | Item                                                                                                      | Owner                           | Blocked by               |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------ |
| 1   | Independent Hazard review (S1)                                                                            | Sonnet                          | —                        |
| 2   | D2 Beat-13 ruling + Dock decor-airlock disposition                                                        | User                            | —                        |
| 3   | Remaining rulings: idle threshold, Q24/Q25 construct, D3–D8, shelf geometry                               | User                            | —                        |
| 4   | Beat-13 scoring bundle (incl. inventory naming + forced-path quality + strategy_revision_count decisions) | Top-tier                        | 2                        |
| 5   | Hazard→Final Core consequence implementation                                                              | Top-tier                        | User ruling on semantics |
| 6   | Qualtrics return preview (Beat 14)                                                                        | Top-tier/Sonnet                 | 4                        |
| 7   | Archive exit-door texture (T4)                                                                            | Sonnet + user PixelLab approval | —                        |
| 8   | Freeze commit, then T1 bundle re-hash, T2 version pair, T3 archived suite run                             | Sonnet                          | 2–5, freeze approval     |
| 9   | `research-data-reviewer` approval of the freeze checklist                                                 | User-triggered review           | 8                        |
| 10  | CRLF/lint repo cleanup (non-blocking)                                                                     | Codex                           | —                        |

Items 1–3 can start immediately and in parallel. Nothing in this table
is optional before pilot except item 10.
