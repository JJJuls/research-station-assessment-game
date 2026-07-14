# Opus Participant-Experience, Accessibility, Browser-Compatibility & Device-Readiness Gate

Independent, bounded pre-pilot verification of the **participant-facing**
experience: usability, legibility, navigability, recoverability, browser
compatibility, viewport/scaling behaviour, input accessibility, and
canvas-accessibility exposure. This gate does **not** implement the Qualtrics
integration, does **not** adopt any INT-1/INT-2/INT-5/PSA/D2 decision, and does
**not** change any scientific contract, scoring, event semantics, stimulus,
option wording, or option ordering. It complements — does not supersede — the
technical gate (`OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`) and the
privacy/security gate (`OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`).

Companion / prior evidence: `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md`,
`docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`,
`docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md`,
`docs/integration/QUALTRICS-END-TO-END-CONTRACT.md`,
`docs/operations/PILOT-DATA-GOVERNANCE-CHECKLIST.md`,
`docs/testing/PARTICIPANT-BROWSER-DEVICE-MATRIX.md` (new, this gate),
`docs/operations/SUPERVISED-USABILITY-TEST-PROTOCOL.md` (new, this gate).

---

## 1. Executive verdict

The current participant-facing game is **sufficiently usable, legible,
navigable, recoverable, and browser-compatible on the verified environment
(desktop Chromium) to serve as the baseline for supervised usability testing and
the later Qualtrics integration sprint.** Phaser's `Scale.FIT` + `CENTER_BOTH`
renders the 800×600 (4:3) game correctly and without clipping or horizontal
overflow at every tested desktop viewport (1920×1080 → 1024×768) with zero page
or console errors; the full connected world is operable **entirely by keyboard**
(this is already proven — every one of the existing automated tests drives the
game only via keyboard); prompts and the status board are high-contrast and
legible; and an accidental ESC pause is fully recoverable by keyboard.

This gate does **not** move the pilot / formal-collection readiness line. Those
remain blocked by the previously-catalogued, decision-gated **data-pipeline P0
cluster** (P0-1 return/export, P0-2 raw export, P0-3 persistence, P0-4
Beat-13/D2) — none of which is in this gate's scope. On top of those, this gate
surfaces a small set of **participant-experience** items that must be **bounded
or ruled** before _unsupervised_ pilot use: the game is verified on **Chromium
only** (Firefox/WebKit are not installed and were not verified — a
browser-dependent-data risk unless the participant browser is pinned); there is
**no loading/progress indicator** during initial asset load (a slow connection
shows a black screen that can read as frozen); orientation and decision-feedback
messages are **transient (~1.6 s)**; and the game is **canvas-only with zero
DOM/ARIA exposure**, so assistive-technology usability is nil and depends on the
study's inclusion/accommodation criteria (external).

Readiness ladder (participant-experience dimension; see §16):

- **Internal developer testing — READY** (today, desktop Chromium).
- **Supervised usability testing (synthetic/non-study data) — READY, with
  conditions**: serve the `npm run bundle` artifact, on a current
  Chromium-family desktop browser (Chrome/Edge), at ≥1280×720 (1024×768 minimum),
  moderator present, synthetic identifiers, and everyone accepting that nothing
  is persisted or returned.
- **Supervised research pilot — NOT READY**: the data-pipeline P0 cluster
  (unchanged) **plus** the participant-experience items PXA-1/PXA-3/PXA-8 to be
  bounded and PXA-X1/PXA-X2 to be ruled.
- **Formal participant data collection — NOT READY**: all of the above plus the
  P1 cluster and a resolved accessibility-eligibility / cross-browser position.

No source-code correction was made (no participant-experience defect met the
"reproduced + unambiguously-authoritative-intended-behaviour + purely technical

- narrowly-scoped + provable" bar without touching frozen presentation). One
  **test-only** durable regression spec was added:
  `e2e/participant_viewport_display.spec.ts` (viewport FIT / no-overflow matrix).

---

## 2. Repository checkpoint

- Repository: `C:\Users\Juls\Desktop\research-station-assessment-game`
- Branch: `fable-autonomous-game-build-v1`
- HEAD at gate start: `a1be19d` (`docs(security): pre-pilot privacy, security and
data-governance gate`), working tree clean, ahead of origin by local commits
  only (no push).
- Protected branch `fable-final-game-prep-from-prototype` — untouched.
- Latest ten commits at start: `a1be19d`, `1f2c972`, `24afcad`, `474b7ee`,
  `0c3529c`, `ec7d4e1`, `034c05b`, `653780d`, `db6380d`, `ff28f3d`.
- Ignored-only untracked paths: `dist/`, `node_modules/`, `test-results/`,
  `.playwright-mcp/`, `.claude/settings.local.json`, `.husky/_/`. No unexpected
  tracked or generated files.
- Test inventory at start: **49 tests / 22 spec files**; after this gate's
  test-only addition: **55 tests / 23 spec files** (`npx playwright test --list`).

## 3. Methods and limitations

- **Environment**: Windows 10 (19045); Node `v24.18.0`; Vite `8.0.10`; Phaser
  `3.90.0`; `@playwright/test` `1.61.1`. Installed Playwright browsers:
  **Chromium `1228` + `chromium_headless_shell` `1228` only** — no Firefox, no
  WebKit binary present. Per the gate's constraints, **no browser was installed
  to enlarge the audit**.
- **Artifact under test**: the participant deployment artifact
  `npm run bundle` (PROD, base `./`, external unpkg script + GitHub ribbon
  stripped, `researchRuntime`/DEV probes absent, no arcade physics-debug
  overlay) served via `vite preview` on `:4173`. Visual/viewport/zoom/ESC
  evidence was captured against this artifact so screenshots are
  participant-representative. The committed viewport regression runs against the
  DEV server (`playwright.config` webServer) — canvas dimensions and page-overflow
  metrics are identical because the `Scale` config is shared; the only DEV/PROD
  visual delta (physics-debug overlay) does not affect canvas sizing.
- **Browser driving**: keyboard only (arrows/WASD/Space/number keys), using the
  held-key input rule (Phaser's `JustDown` can miss a fast tap, so keys are held
  ≥150 ms — see `e2e/helpers.ts`).
- **Limitations / what this gate did NOT do**: no Firefox/WebKit/Safari
  verification (unavailable, not installed); no real assistive-technology
  (screen-reader) session; no real mobile device; browser page-zoom on a
  canvas-rendered game only rescales the single `<canvas>` bitmap (the FIT logic
  re-fits on resize) — it cannot reflow or enlarge canvas text independently, so
  "text scaling" for canvas content is **not available** and browser zoom was
  assessed via device-scale-factor emulation and window resize, not OS text
  scaling; no formal WCAG/Section-508 conformance testing or claim; local load
  timings are **not** representative of participant internet speeds; no
  contrast ratios are asserted beyond what is computable from explicit colour
  values. This gate makes **no** legal, ethics, or institutional claim.

## 4. Participant task-flow inventory (Part A)

Exact participant-visible flow (source of truth: `src/scenes/*`,
`src/world/RoomScene.ts`, `src/sprites/Player.ts`, `src/world/SceneRouter.ts`):

| Stage               | Participant objective            | Visible instruction                                                                                                                                                                             | Controls                         | Success feedback                                                  | Error / recovery                                                             | Source                                                         | Test                                                                               |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Launch              | Game starts from a Qualtrics URL | none (loads to Dock)                                                                                                                                                                            | n/a                              | canvas boots to Dock                                              | any/no launch params → safe fallback identity; no crash                      | `index.ts`, `SessionState`, `SceneRouter.resolveStartSceneKey` | `launch_with_research_params`, `participant_lifecycle`, `state_session_continuity` |
| Loading             | Wait for assets                  | **none — black screen, no spinner** (PXA-8)                                                                                                                                                     | n/a                              | Dock fades in                                                     | slow load reads as frozen (no indicator)                                     | `Boot.ts`                                                      | — (no loading-state test)                                                          |
| Instructions (Dock) | Learn controls                   | "Station AI: WASD or arrow keys to move. Reach the highlighted marker." (**transient ~1.6 s**, PXA-3); pulsing "Move here" marker; on reach: "…check in at the Arrival Terminal (SPACE)." (3 s) | arrows/WASD move; SPACE interact | marker turns solid; hint text                                     | out-of-range SPACE = silent control-error count, no freeze                   | `DockScene.ts`                                                 | `movement_and_first_interaction`                                                   |
| Dock decision       | Complete arrival tutorial        | "Dock AI – Arrival Tutorial … What do you do?" + 3 numbered options + "Press 1, 2, or 3 to choose."                                                                                             | number keys 1–3                  | transient feedback per choice; room marked complete               | re-open after complete → "already logged" message; no double-count           | `DockScene.ts`                                                 | `state_session_continuity`, journeys                                               |
| Hub                 | Navigate to a station            | door labels around the ring; "Press SPACE to interact" near a door                                                                                                                              | arrows/WASD; SPACE at door       | fade-out → target room                                            | wrong direction is harmless; all doors open                                  | `HubScene.ts`, `stationRegistry.ts`                            | `connected_world_smoke`, journeys                                                  |
| Station selection   | Choose a station                 | in-fiction door labels (some edge labels clip until approached, PXA-6)                                                                                                                          | SPACE at door                    | room entry event + fade-in                                        | —                                                                            | `HubScene.ts`                                                  | journeys                                                                           |
| Room interaction    | Reach the station marker         | "Press SPACE to interact" when in 72 px range                                                                                                                                                   | arrows/WASD; SPACE               | prompt panel opens                                                | out-of-range SPACE inert (or dock control-error)                             | `RoomScene.updateProximity`                                    | per-room `*_logging` specs                                                         |
| Decision / task     | Choose an option                 | numbered options + "Press N … to choose."                                                                                                                                                       | number keys 1–N (N≤9)            | transient ~1.6 s feedback; chained follow-up stages where defined | rapid key spam → exactly one decision set (ADV-7)                            | `RoomScene.renderPromptStage/selectPromptOption`               | all `*_logging`, `adversarial_input_spam`                                          |
| Feedback            | Read outcome                     | transient text at top (~1.6 s)                                                                                                                                                                  | none                             | message then auto-clears                                          | slow readers may miss it (PXA-3)                                             | `RoomScene.showFeedbackMessage`                                | ADV-5 (via DEV probe)                                                              |
| Return to Hub       | Leave the room                   | door label + "Press SPACE to interact"                                                                                                                                                          | SPACE at door                    | fade → Hub, spawn inside the door                                 | abandon/return handled per room (no data corruption)                         | room `onRoomExit`, `SceneRouter`                               | `adversarial_archive_abandon_return`, journeys                                     |
| Progress / status   | Check progress                   | Status Board station → panel: "STATION STATUS / Arrival check-in: … / …: pending/logged"                                                                                                        | SPACE at board                   | transient board text                                              | Hazard line stays `pending` after completion (documented D1 consequence)     | `HubScene.buildStatusBoardText`                                | `adversarial_status_board_display`                                                 |
| Final completion    | Complete Final Core              | Final Core prompt + (if blockers) blocker list / force-continue option                                                                                                                          | number keys                      | transient feedback                                                | force-continue path exists; no hard gate                                     | `FinalCoreScene.ts`                                            | `final_core_summary`                                                               |
| Current end state   | —                                | **no explicit "you are finished / return to survey" screen in production** (completion→return path is DEV-only, P0-1)                                                                           | n/a                              | n/a                                                               | participant is left in the connected world; nothing is returned to Qualtrics | `ResearchRuntime.completeDebugSession` (DEV only)              | —                                                                                  |

Behaviour classification:

- **Participant-visible**: everything above except the DEV/test rows below.
- **Developer-only**: `window.researchRuntime` (7-method debug API),
  `completeDebugSession()` return-URL path — DEV-gated, **absent** from the
  bundle.
- **Test-only**: `window.__lastRoomFeedbackText` presentation probe — DEV-gated,
  absent from the bundle.
- **Planned but not implemented (participant-visible gap)**: production
  completion→return→export and an end-of-experience screen (P0-1); idle-help
  prompt (open scientific parameter, disabled); persistence (P0-3).

## 5. Browser matrix (Part B)

Full detail and retest steps in `docs/testing/PARTICIPANT-BROWSER-DEVICE-MATRIX.md`.

| Browser                                     | Status         | Evidence                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chromium 1228** (desktop, SwiftShader GL) | **VERIFIED**   | Bundle loads; canvas renders; assets 200; launch params parse; Hub navigation; task station (Archive) prompt; decision (number keys); defer/return; ESC interruption + recovery; status board accurate; **zero page/console errors** at every tested viewport; keyboard-only operation proven by the full 55-test suite. |
| **Firefox**                                 | **UNVERIFIED** | Not installed; not installed for this gate. No cross-browser evidence exists.                                                                                                                                                                                                                                            |
| **WebKit / Safari**                         | **UNVERIFIED** | Not installed; not installed for this gate. No cross-browser evidence exists.                                                                                                                                                                                                                                            |

Because only one engine is verified, **research data collected on any
non-Chromium engine would be of unknown comparability** (PXA-1). Reload behaviour
matches the documented in-memory design: a reload re-boots fresh from the URL and
**loses all in-session progress** (P0-3) — verified on Chromium.

## 6. Viewport and display matrix (Part C)

Measured against the participant bundle; canvas `getBoundingClientRect` vs.
`window.innerWidth/Height` and `documentElement.scrollWidth`:

| Viewport         | Canvas (px) | Letterbox                | Aspect | Horiz. overflow | Errors |
| ---------------- | ----------- | ------------------------ | ------ | --------------- | ------ |
| 1920×1080        | 1440×1080   | 240 px each side         | 1.333  | none            | none   |
| 1536×864         | 1152×864    | 192 px each side         | 1.333  | none            | none   |
| 1366×768         | 1024×768    | 171 px each side         | 1.333  | none            | none   |
| 1280×720         | 960×720     | 160 px each side         | 1.333  | none            | none   |
| 1024×768         | 1024×768    | **none (exact 4:3 fit)** | 1.333  | none            | none   |
| 375×667 (narrow) | 375×281     | 192 px top/bottom        | 1.333  | none            | none   |

Findings: `Scale.FIT` + `CENTER_BOTH` always keeps the whole game inside the
viewport, preserves 4:3, and never clips participant-critical content or
produces a horizontal scrollbar. Wider-than-4:3 viewports get **black side
letterbox bars**; taller viewports get top/bottom bars; 1024×768 is an exact
fit. A ~4 px vertical document overflow (canvas inline-baseline gap) can produce
a faint vertical scrollbar — cosmetic only (PXA-9). At the narrow phone-sized
viewport the game **degrades gracefully** (shrinks, fully visible, nothing
clipped) but text becomes unreadably small — this confirms the game is
**desktop/laptop-only** and must not be offered on phones (no mobile support is
claimed). Screenshots: `dock-<w>x<h>.png`, `narrow-375x667.png`,
`direct-hub-statusboard.png`, `direct-archive-prompt.png` (regenerable — §17).

## 7. Zoom and text-scaling (Part D)

- Browser **page zoom** on a FIT canvas rescales the single canvas bitmap and the
  FIT logic re-fits on the resulting resize; it does **not** reflow or
  independently enlarge canvas text. There is therefore **no per-element text
  scaling** for any in-game text (all game text is drawn into the canvas).
- Device-scale-factor 2 at 1366×768: layout identical (canvas 1024×768),
  higher-DPI render, no clipping, no lost options, no coordinate drift
  (`zoom-dsf2-1366x768.png`).
- Implication: participants who rely on OS/browser **text enlargement** cannot
  enlarge in-game text; the only lever is a larger display / smaller viewport
  distance. Recorded as an accessibility limitation (PXA-2), not redesigned here.

## 8. Keyboard and input accessibility (Part E)

- **Supported**: mouse/pointer is **not required** for gameplay. Movement =
  arrow keys **and** WASD (175 px/s, diagonals normalised); interaction = SPACE
  (proximity ≤72 px); decisions = number keys 1–N; pause = ESC.
- **Keyboard-only completion of the whole game is already proven**: every test in
  the 55-test suite drives the game exclusively via `page.keyboard`; **no test
  issues a mouse click**. The connected world (Dock → Hub → all 8 stations →
  Final Core, with returns/defers) is therefore fully keyboard-operable.
- **No duplicate decisions/transitions from keyboard**: rapid option-key spam
  yields exactly one decision event set and Space-spam stays inert
  (`adversarial_input_spam`, ADV-7); the held-key rule reflects that a single
  fast tap can be _missed_ (fail-safe), never doubled.
- **ESC interruption + recovery (verified this gate, bundle)**: ESC in a room
  pauses the scene and shows a canvas "Resume" affordance; ESC again resumes and
  movement/interaction work normally — **no keyboard trap**
  (`esc-1-paused.png`, `esc-3-moved-after-resume.png`).
- **Unreliable/absent**: there are **no DOM focus indicators** (all UI is
  canvas); **Tab** moves focus to browser chrome, not between in-game options
  (options are selected by number key, not focus traversal); the Menu "Resume"
  button responds to a mouse pointer only (keyboard users rely on ESC). Input
  before boot completes is buffered harmlessly (canvas not yet interactive);
  input during a fade/transition is guarded (`transitioning` flag, proximity
  suppressed). Browser shortcut conflict risk is low in the standalone
  (root-hosted) case because the page body does not scroll.

## 9. Canvas accessibility and semantic exposure (Part F)

**The entire participant experience is rendered in a single Phaser `<canvas>`.**
`phaser-jsx` renders even the pause Menu (`Overlay`, `Resume`) as **canvas game
objects**, not DOM. The only DOM nodes are the `<canvas>` itself and a
`<noscript>` fallback.

| Participant-critical content                                                                                           | Canvas          | DOM / ARIA equivalent |
| ---------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------- |
| Room title, instructions, task prompt, options, current selection, feedback, progress, status board, completion status | **canvas-only** | **none**              |

Consequences: **zero screen-reader discoverability**, no ARIA roles/labels, no
DOM focus management, no semantic structure. The DEV-only `researchRuntime` and
the test-only `__lastRoomFeedbackText` probe are **not** accessibility features
and are absent from the bundle (correctly **not** converted into participant
a11y surfaces by this gate).

Classification: this is **missing accessibility support** whose severity is an
**external eligibility/accommodation question** — whether it is a _blocker_
depends on the study's inclusion criteria and institutional accessibility policy,
which are not in the repository. See external item **PXA-X1**. It is not
assessable as a blanket P0 without those criteria; for a general-population
supervised usability test of the visual instrument it is a documented limitation,
not a stopper.

## 10. Visual legibility and interaction clarity (Part G)

- **Prompts / status board**: white (`#ffffff`) monospace on a near-opaque dark
  panel (`#101820` @ 0.96) → very high contrast; numbered options and the "Press
  N … to choose." line are clearly legible at all desktop viewports
  (`direct-archive-prompt.png`, `direct-hub-statusboard.png`). Word-wrap is set
  (≈520–524 px) so prompt text wraps rather than clipping.
- **Feedback**: same high-contrast style, top-centre, word-wrapped, **auto-clears
  after ~1.6 s** (PXA-3) — the main legibility risk is _duration_, not contrast.
- **Selected/disabled states**: options are transient (chosen by key, panel then
  closes); there is no persistent selected/disabled visual state to distinguish —
  acceptable for a single-choice prompt model.
- **Progress semantics**: the status board uses plain status words
  ("pending"/"logged") — no scores, no personality feedback (correct per V3 §2).
  "logged" (rather than "done"/"complete") is slightly technical but consistent.
- **Completion / return-to-hub obviousness**: completing a room does not
  auto-return; the participant must walk back to a door — obvious from the "Press
  SPACE to interact" affordance but not explicitly instructed.
- **Edge door labels** (PXA-6): side-wall/far Hub door labels can be clipped at
  the canvas horizontal edges depending on camera/player position (e.g.
  "Interruption C…", "Final Co…"); they become readable as the player approaches.
- Backgrounds are textured (tileset) but every text element sits on its own
  opaque/near-opaque plate, so text-over-image interference is low. No contrast
  ratio is asserted for text drawn over the textured floor because no
  participant-critical text is placed there.

## 11. Timing, waiting and progress feedback (Part H)

- **Initial load**: **no loading state or progress indicator** — during Boot
  asset load the participant sees a **black screen** (PXA-8). On the local
  broadband environment this is ~2–3 s; on a slow participant connection the
  ~1.37 MB JS chunk (353 kB gzip) + 2.3 MB total assets could stall visibly and
  read as frozen, with no spinner and no recovery cue.
- **Scene transitions**: a 200–250 ms camera fade — brief, clearly intentional.
- **Feedback duration**: fixed 1600 ms (PXA-3).
- **No long animations** block progress; the "Move here" marker pulses (700 ms
  yoyo — slow, low photosensitivity risk, see PXA-X4).
- **Duplicate input while waiting**: guarded (`transitioning` flag; proximity
  suppressed during prompts/typewriting; ADV-7 shows spam is inert/one-shot).
- **No production timeout** exists and none was invented.
- The only period a participant could reasonably believe the game is frozen is
  the **initial black-screen load** (PXA-8); every in-play wait is short and cued.

## 12. Error and recovery experience (Part I)

Exercised (Chromium): missing/empty/malformed launch params → safe fallback
identity, no crash (`participant_lifecycle`); direct standalone launch and
direct `?scene=` launch → boots correctly (`state_session_continuity`,
`adversarial_direct_launch_navigation`); unknown `?scene=` → Dock fallback, no
error; **reload at Hub / in a room → fresh reboot from URL, all in-session
progress lost** (P0-3, documented in-memory design); ESC interruption → pause +
keyboard-recoverable (§8); repeated selection / return to a completed room →
one-shot guards prevent double-count, "already logged" messaging; rapid input →
single decision (ADV-7); unsupported/narrow viewport → graceful letterbox (§6).

| Case                 | Visible result                     | State result           | Can continue?    | Silent-failure / dup risk             |
| -------------------- | ---------------------------------- | ---------------------- | ---------------- | ------------------------------------- |
| Reload mid-session   | fresh Dock                         | **progress lost**      | yes (restart)    | no dup; **silent data loss** (P0-3)   |
| Browser back/forward | reloads app (SPA-less)             | fresh reboot           | yes              | as reload                             |
| Duplicate tab        | independent fresh session          | isolated               | yes              | cross-session isolation holds (ADV-1) |
| Focus loss/return    | game keeps running                 | `focus_loss_*` counted | yes              | none                                  |
| ESC pause            | Resume affordance                  | scene paused           | yes (ESC/Resume) | none                                  |
| Malformed return_url | n/a in prod (return path DEV-only) | —                      | —                | P0-1 (no prod return)                 |

No decision-gated persistence or Qualtrics return path was implemented.

## 13. Performance and resource observations (Part J)

- Participant bundle: **142 files, 2.3 MB total**; primary JS chunk **1,374 kB
  (353 kB gzip)**; CSS 0.04 kB; `index.html` 0.82 kB; 125 PNGs (character
  walk/idle frames, props, tilesets — largest single asset the 192 kB tuxemon
  tileset); **no external hosts** (unpkg + ribbon stripped).
- Template PWA leftovers still ship (~150 kB): `logo512.png`, `app-icon.png`,
  `logo192.png`, `manifest.json` (P2-10 / PXA-10) — unused weight + a
  participant-visible template tab title "Phaser RPG | remarkablegames".
- Scene transitions and long-task responsiveness: smooth on the test
  environment; no memory-growth or duplicate-asset-loading anomaly observed over
  repeated station revisits (assets are Boot-loaded once).
- **Chunk-size warning classification (participant impact, not build noise)**: on
  a supervised desktop/broadband session the 1.37 MB chunk is a **P2** (one-time
  ~few-second first load). Its participant-facing sharp edge is the **absence of
  a loading indicator** (PXA-8), not the byte count itself. Local timings are not
  representative of participant internet speeds.

## 14. Instructions and supervised-session procedure (Part K)

A new participant can, from the in-game text alone, understand: what to do at the
Dock (move to marker, check in), how to move (WASD/arrows — **if they read the
1.6 s message**), how to interact (SPACE), and how to choose (number keys). They
can partially infer progress from the Status Board. They **cannot** reliably
learn from the game alone: that a station may be revisited, what "defer" vs.
"abandon" mean, that progress is lost on reload, what to do if it appears stuck,
what the current end-state is, or how to report a problem. These gaps are why a
**moderator + participant instruction sheet** are required — supplied in
`docs/operations/SUPERVISED-USABILITY-TEST-PROTOCOL.md`. No scientific task
wording was altered.

## 15. Coverage findings (Part L)

| Dimension                   | Current automated coverage                                             |
| --------------------------- | ---------------------------------------------------------------------- |
| Browsers                    | Chromium only (structural — others not installed)                      |
| Viewport sizes              | **NEW: `participant_viewport_display.spec.ts`** (5 desktop + 1 narrow) |
| Keyboard behaviour          | strong — whole suite is keyboard-only; ADV-7 dup-input                 |
| Focus behaviour             | focus-loss counting covered; no focus-indicator test (none exists)     |
| Zoom / scaling              | none automated (assessed manually this gate)                           |
| Loading / error visibility  | none (no loading state exists)                                         |
| Duplicate input             | ADV-7                                                                  |
| Canvas legibility           | ADV-5 asserts board text vs. state; contrast is visual-only            |
| Final-state clarity         | `final_core_summary` (events, not the missing end screen)              |
| Production-bundle behaviour | prior technical-gate prod smoke (3/3) + this gate's visual matrix      |

High-value missing tests (deferred — each needs a decision or is non-regression):
a cross-browser run (needs Firefox/WebKit install — a dependency decision); a
loading-indicator test (needs a loading state to exist first — a build change);
a Tab/focus-order test (needs a DOM/a11y layer to exist first). None were added
because they fail the test-only-addition policy (would require a new dependency
or a not-yet-existent feature). The viewport spec **was** added: deterministic,
durable, no dependency, no scientific decision.

## 16. P0 / P1 / P2 register (participant-experience)

Severity is scoped to the four readiness levels; data-pipeline P0-1..P0-4 and
P1-5..P1-9 / P2-10..P2-13 are carried by the technical gate and only
cross-referenced here.

| ID                     | Class                     | Title                                                                                                                               | Sev                                      | Browser/device | Blocks                        | Participant impact                                                   | Validity impact          | Repro                    | Current control              | Required control                                                                                                                            | Acceptance / verification                                                                                            | Owner                        |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------ | ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **PXA-1**              | verified browser-compat   | Verified on Chromium only; Firefox/WebKit/Safari unverified                                                                         | **P0 for L3/L4; P1-controllable for L2** | non-Chromium   | pilot, formal                 | possibly different rendering/input on other engines                  | browser-dependent data   | not installed            | none in code                 | pin a Chromium-family browser (Chrome/Edge) for all sessions **or** verify Firefox/WebKit before pilot                                      | run the smoke journeys + viewport matrix on each supported engine with 0 errors, or a documented single-browser lock | owner (browser policy) → Max |
| **PXA-2**              | missing accessibility     | Canvas-only; no DOM/ARIA/screen-reader exposure; no canvas text scaling                                                             | **P1/P2 (population-dependent)**         | all            | formal (population-dependent) | AT users cannot use the instrument                                   | n/a                      | §9                       | none                         | rule eligibility (PXA-X1); if AT support required, this is a major build item                                                               | ruled inclusion criteria + (if required) an accessibility plan                                                       | owner (ethics/recruitment)   |
| **PXA-3**              | verified usability        | Orientation + decision feedback transient (~1.6 s)                                                                                  | **P1**                                   | all            | pilot (unsupervised)          | slow readers miss the movement instruction or their choice's outcome | low (no data corruption) | `RoomScene`/`DockScene`  | moderator reads instructions | persistent/longer instruction or a re-showable controls cue (duration is a technical parameter; change is a design decision, not made here) | usability re-test with slow-reader persona; message legible until dismissed or ≥ configurable duration               | Max (technical)              |
| **PXA-8**              | verified usability / perf | No loading/progress indicator; black screen during initial asset load                                                               | **P1**                                   | all            | pilot (unsupervised)          | slow connection reads as frozen                                      | possible dropout         | `Boot.ts` (none)         | moderator on broadband       | add a loading state / progress or first-paint cue                                                                                           | a loading indicator is visible until the Dock renders; test on throttled network                                     | Max (technical)              |
| **PXA-6**              | verified usability        | Edge Hub door labels clip at canvas horizontal edges (position-dependent)                                                           | **P2**                                   | all            | —                             | brief ambiguity; readable on approach                                | none                     | §10                      | labels reappear on approach  | optional label reposition (touches frozen presentation — avoid without a ruling)                                                            | labels fully visible from the Hub centre                                                                             | owner/Max (presentation)     |
| **PXA-7**              | verified usability        | ESC pause overlay darkening weak (0.5α over a dark scene)                                                                           | **P2**                                   | all            | —                             | mild confusion on accidental ESC; fully recoverable                  | none                     | `Menu.tsx`               | ESC/Resume recovery          | stronger overlay / explicit "Paused" label                                                                                                  | overlay clearly reads as paused                                                                                      | Max (presentation)           |
| **PXA-9**              | accepted limitation       | ~4 px vertical page overflow (canvas inline baseline)                                                                               | **P2**                                   | all            | —                             | faint vertical scrollbar                                             | none                     | §6                       | none                         | `canvas { display:block }` if ever touched                                                                                                  | `scrollHeight ≤ innerHeight`                                                                                         | accepted                     |
| **PXA-10**             | documentation / config    | Participant-visible template tab title + unused PWA icons                                                                           | **P2**                                   | all            | —                             | wrong browser-tab title; ~150 kB waste                               | none                     | `index.html`, `public/*` | none                         | set participant title/favicon; drop unused icons (same as P2-10)                                                                            | tab title reads the study name; no template icons in `dist/`                                                         | Sonnet/config                |
| P0-1..P0-4, P1-5..P1-9 | (technical gate)          | data pipeline: return/export, raw export, persistence, Beat-13/D2, identity, taxonomy, provenance, sequencing, P1-6 deploy artifact | P0/P1                                    | all            | pilot, formal                 | —                                                                    | —                        | —                        | —                            | see technical gate                                                                                                                          | see technical gate                                                                                                   | user → Max                   |

**No new P0 that blocks L1 or L2.** L2 (supervised usability, synthetic data) is
reachable today with the stated conditions. PXA-1 is the only item that is P0 at
the _pilot_ level and is fully controllable at the _supervised_ level by pinning
the browser.

## 17. External-verification register

These depend on ethics approval, recruitment criteria, or institutional policy
and **cannot** be resolved from repository evidence:

| ID         | Question                                                                                                                                                                                   | Why external                  | Gates                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------- |
| **PXA-X1** | Do the study's inclusion criteria / institutional accessibility policy require assistive-technology (screen-reader / keyboard-AT / low-vision) usability? The game is canvas-only (PXA-2). | recruitment + ethics + policy | L3/L4 accessibility position |
| **PXA-X2** | Which participant browser(s) will be supported/pinned? (Verified: Chromium-family only.)                                                                                                   | study operations decision     | PXA-1 closure; L3/L4         |
| **PXA-X3** | Minimum participant device/viewport? (Verified desktop/laptop only; phones unsupported, ≥1024×768.)                                                                                        | recruitment                   | L3/L4 device policy          |
| **PXA-X4** | Any institutional photosensitivity constraint the pulsing marker / camera fades must meet? (Low risk; 700 ms pulse.)                                                                       | institutional safety policy   | L4 sign-off                  |
| **PXA-X5** | Participant reading level / language? (In-game text is English monospace.)                                                                                                                 | recruitment                   | instruction adequacy         |

## 18. Readiness classification (four levels, non-conflated)

1. **Internal developer testing — READY (today).** Desktop Chromium; whole suite
   green (55/55 with this gate's addition when run); full keyboard operation.
2. **Supervised usability testing (synthetic/non-study data) — READY, with
   conditions.** Serve `npm run bundle`; current Chromium-family desktop browser;
   ≥1280×720 (1024×768 min); moderator present; synthetic identifiers; accept no
   persistence / no data return (P0 cluster). Use the new protocol doc.
3. **Supervised research pilot — NOT READY.** Blocked by the unchanged
   data-pipeline P0 cluster **plus** PXA-1 (browser lock/verify), PXA-8 (loading
   indicator), PXA-3 (transient instructions), and a ruling on PXA-X1/PXA-X2.
4. **Formal participant data collection — NOT READY.** All of the above plus the
   P1 cluster (identity/taxonomy/provenance/sequencing), Beat-13/D2 scoring +
   codebook, and a resolved accessibility-eligibility / cross-browser position.

## 19. Exact next actions

1. **Research owner**: rule PXA-X1 (accessibility eligibility) and PXA-X2
   (supported/pinned participant browser); note PXA-X3/X4/X5.
2. **Supervised usability testing** may proceed now under
   `docs/operations/SUPERVISED-USABILITY-TEST-PROTOCOL.md` (synthetic data,
   `npm run bundle`, Chromium-family desktop) to gather human usability signal on
   PXA-3/PXA-6/PXA-7 and confirm instruction adequacy.
3. **Max sessions** (technical, non-scientific, alongside the data-pipeline
   units): PXA-8 loading indicator; PXA-1 cross-browser verification or a coded
   browser check; PXA-3 instruction persistence; PXA-10 participant title/icons.
   None require a scientific/stimulus/scoring/event change.
4. Keep the committed `e2e/participant_viewport_display.spec.ts` in the regression
   set; extend to any newly-supported browser once installed.

## 20. Reproduction commands

```bash
# Checkpoint
git rev-parse --abbrev-ref HEAD           # fable-autonomous-game-build-v1
git rev-parse HEAD
git status --porcelain                    # (clean)

# Static + inventory
npm.cmd run lint:tsc                       # clean
npm.cmd run build                          # ordinary build (chunk-size warning only)
CI=true npm.cmd run bundle                 # participant deployment artifact (dist/, base ./)
npx playwright test --list                 # 55 tests / 23 spec files

# Committed viewport regression (dev server)
npx playwright test participant_viewport_display   # 6/6

# Participant-representative visual/viewport/zoom/ESC evidence (bundle via preview)
#   config + specs live in the gate scratchpad; NODE_PATH points at the repo deps
export NODE_PATH="C:/Users/Juls/Desktop/research-station-assessment-game/node_modules"
npx playwright test --config <scratchpad>/pxa.config.ts   # pxa_viewport, pxa_direct, pxa_esc
#   → screenshots in <scratchpad>/shots/: dock-<w>x<h>.png, narrow-375x667.png,
#     zoom-dsf2-1366x768.png, direct-hub-statusboard.png, direct-archive-prompt.png,
#     esc-1-paused.png, esc-3-moved-after-resume.png
```

---

_Gate discipline: main Opus agent only; no subagents; no MCP; no push/merge/
rebase/reset/branch-switch; no protected-branch edits; no package.json/lockfile
changes; no new dependency/browser installs; no scientific/stimulus/scoring/
event-semantics changes; no INT-1/INT-2/INT-5/PSA/D2 decision adopted; no
Qualtrics completion/return/export implemented. One test-only regression spec
added; no source-code correction made._
