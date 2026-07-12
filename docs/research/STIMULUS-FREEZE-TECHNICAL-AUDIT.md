# Stimulus-Freeze Technical Audit (Sprint A, Phase 5)

Technical portion ONLY of the freeze gate
(`docs/research/stimulus-freeze-checklist.md`, plan §17b), executed
2026-07-13 at Sprint A HEAD. **This document does not approve the
scientific stimulus freeze, does not resolve D2–D8, and does not replace
the `research-data-reviewer` approval (checklist item 9).**

## 1. Technical verifications performed (all PASS)

1. **All eight research stations implemented and reachable** through real
   doors, entry AND return, runtime-verified (A3 full-door-ring smoke +
   A4 three participant journeys; evidence in
   `docs/testing/connected-journey/`).
2. **Asset manifest internally consistent — hashes re-verified today**:
   all 17 SHA-256 records in `docs/assets/pixellab-asset-manifest.md`
   (12 Wave-3 props, interior-v3 + dock-v3 tilesets, 3 representative
   player frames) match the committed files byte-for-byte at Sprint A
   HEAD. No unmanifested art: `public/` has ZERO changes since the V1
   slice freeze point `556e273` (Wave 1 stations reuse the manifested
   set + placeholder geometry).
3. **Version pair documented**: `ASSET_SET_VERSION = 'outpost-assets-v1'`
   (`src/constants/assets.ts`, surfaced in the Phaser banner via
   `Boot.ts`); `game_version` stamps every event
   (URL param → `VITE_APP_VERSION` → `unknown` fallback chain).
4. **Controlled options: stable wording and ordering.** Options render in
   the author's declared order (never randomized — `RoomScene`
   convention) and the room specs assert the frozen labels; the full
   suite passing means no option text or order drifted.
5. **Interaction geometry, routes, and collision stable**: no `src/`
   change since the verified checkpoint `201c8fa` (diff empty); geometry
   facts pinned in `docs/architecture/transition-inventory.json` and
   exercised by position-sensitive Playwright choreography — silent
   geometry drift would fail the suite.
6. **Test evidence reproducible**: SwiftShader-forced renderer makes runs
   deterministic (zero-retry suites since `54ba3e8`); all evidence docs
   name their commit and counts.
7. **Scientific contracts unchanged**: Sprint A touched only `docs/`,
   `e2e/`, and `playwright.config.ts`. EventLogger / ScoringManager /
   SessionState / QualtricsBridge / DataQualityTracker untouched since
   `201c8fa`.

## 2. Remaining work before pilot — technical (any capable model)

- **T1** Freeze-time bundle re-verification (checklist item 2): rebuild
  from a clean checkout at the freeze commit and re-hash `dist/` assets
  (or document nondeterminism). Blocked only on the freeze commit
  existing.
- **T2** Record the final (`game_version`, `asset_set_version`) pair and
  set `VITE_APP_VERSION` for the pilot build (item 6).
- **T3** Archive one full-suite Playwright run against the frozen build
  (item 8).
- **T4** Commit a real texture for the Archive exit door (open
  disposition 4 — placeholder rectangle; cosmetic but participant-facing).

## 3. Remaining work before pilot — user-owned scientific decisions

Unchanged by this audit; consolidated list:

1. Dock idle threshold + "idle" definition (checklist item 5; watcher
   disabled).
2. Dock decor-airlock `control_error_count` inflation (MAJOR asset-audit
   disposition — decision required before any pilot).
3. Archive log-shelves interaction-geometry undercount (Phase G
   disposition — measurement-affecting).
4. Salience/affordance minor dispositions (asset-audit 2–3).
5. Q24/Q25 `construct_id` for abandon/return events.
6. Beat-13 scoring bundle (D2) + event-schema/scoring version stamps
   (items 3–4) + the A4 inventory organization naming observation.
7. Hazard→Final Core consequence semantics (D1 follow-on; see
   `docs/architecture/CROSS-ROOM-INTEGRATION.md` §3).
8. Independent Hazard review (deferred to Sonnet).
9. `research-data-reviewer` approval of the completed checklist (item 9).

## 4. Pilot-blocking split

**Technically pilot-ready**: world connectivity, event pipeline,
metadata, return flow, asset integrity, reproducible evidence. **Not
pilot-ready** until: the scientific decisions above are ruled (at minimum
items 1, 2, and 9 of §3), the freeze commit is cut, and T1–T3 are run
against it. No pilot-blocking TECHNICAL defect is currently known.
