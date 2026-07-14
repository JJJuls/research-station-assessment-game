# Participant Browser & Device Matrix

Evidence-based support boundary for the participant-facing game. Records **only
what has executable evidence** on the current environment. Produced by the
participant-experience/accessibility gate
(`docs/ai/OPUS-PARTICIPANT-EXPERIENCE-ACCESSIBILITY-GATE.md`). No support is
claimed beyond what is listed as VERIFIED.

## Operating environment (test bench)

- OS: Windows 10 Enterprise (19045).
- Node `v24.18.0`; Vite `8.0.10`; Phaser `3.90.0`; `@playwright/test` `1.61.1`.
- Rendering: headless Chromium under SwiftShader software GL
  (`--use-gl=angle --use-angle=swiftshader`, per `playwright.config.ts`) —
  deterministic WebGL boot.
- Artifact under test: `npm run bundle` (PROD, base `./`, no external hosts,
  no DEV/debug surfaces, no physics-debug overlay) served via `vite preview`
  on `:4173`; committed viewport regression runs against the Vite DEV server
  on `:5173`.
- Game scale: Phaser `Scale.FIT` + `CENTER_BOTH`, 800×600 (4:3) base,
  `pixelArt: true`, black background/letterbox.

## Browsers

| Browser                                                   | Version                                 | Status                        | Notes                                                                                                       |
| --------------------------------------------------------- | --------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Chromium                                                  | 1228 (+ `chromium_headless_shell` 1228) | **SUPPORTED — VERIFIED**      | Full smoke journey + viewport matrix + ESC recovery, zero page/console errors.                              |
| Google Chrome / Microsoft Edge (Chromium-family, current) | current stable                          | **RECOMMENDED (same engine)** | Same Blink/V8 engine as verified Chromium; treat as supported for supervised use. Not separately automated. |
| Firefox                                                   | —                                       | **UNVERIFIED**                | Gecko browser **not installed**; not installed for this gate. No evidence.                                  |
| WebKit / Safari                                           | —                                       | **UNVERIFIED**                | WebKit **not installed**; not installed for this gate. No evidence.                                         |

**Unsupported-environment statement**: any non-Chromium engine (Firefox, Safari/
WebKit, legacy browsers) is **unverified** — do not use it for research data
collection until it is explicitly verified with the retest journeys below. Data
comparability across engines is unknown (finding **PXA-1**).

## Devices / viewports

| Viewport  | Class         | Result                                                                                                                        |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1920×1080 | desktop       | **PASS** — canvas 1440×1080, side letterbox, 4:3, no overflow, no errors                                                      |
| 1536×864  | laptop        | **PASS** — canvas 1152×864, side letterbox                                                                                    |
| 1366×768  | laptop        | **PASS** — canvas 1024×768, side letterbox                                                                                    |
| 1280×720  | laptop        | **PASS** — canvas 960×720, side letterbox                                                                                     |
| 1024×768  | small desktop | **PASS** — canvas 1024×768, exact 4:3 fit, no letterbox                                                                       |
| 375×667   | phone-sized   | **LIMITATION (not supported)** — canvas 375×281, top/bottom letterbox, nothing clipped/overflowing, but text unreadably small |

- ~4 px vertical document overflow at all sizes (canvas inline-baseline gap) —
  cosmetic (PXA-9). **No horizontal overflow at any size.**
- **Minimum recommended participant environment**: desktop/laptop, current
  Chromium-family browser (Chrome/Edge), viewport **≥1280×720** (1024×768 the
  hard minimum), keyboard + (optional) mouse.
- **Explicitly unsupported**: phones, small tablets, and any viewport where the
  game text is not comfortably readable; touch-only devices (no touch controls
  exist — input is keyboard). No mobile support is claimed or implemented.

## Scaling settings

| Setting                          | Result                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Browser page zoom (canvas)       | Rescales the single canvas bitmap; FIT re-fits on resize; **no independent text reflow/enlargement** (all text is canvas-drawn) |
| Device-scale-factor 2 @ 1366×768 | Layout identical, higher-DPI render, no clipping / lost options / coordinate drift                                              |
| OS text scaling                  | **No effect on in-game text** (canvas) — accessibility limitation PXA-2                                                         |

## Input mechanisms

| Mechanism                                                                    | Status                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Keyboard — arrows / WASD (move), SPACE (interact), 1–9 (choose), ESC (pause) | **SUPPORTED & VERIFIED** — entire suite is keyboard-only; full game completable without a mouse  |
| Mouse / pointer                                                              | Optional; only the pause-menu "Resume" button is pointer-driven (keyboard ESC is the equivalent) |
| Touch                                                                        | **NOT SUPPORTED** — no touch controls                                                            |
| Screen reader / assistive tech                                               | **NOT SUPPORTED** — canvas-only, no DOM/ARIA (PXA-2 / PXA-X1)                                    |

## Journey coverage (VERIFIED on Chromium)

| Journey                                                                     | Result                      |
| --------------------------------------------------------------------------- | --------------------------- |
| Bundle loads, canvas renders, assets 200                                    | PASS                        |
| Launch-parameter parsing (`participant_id`, `game_session_id`, `condition`) | PASS                        |
| Hub navigation (door ring)                                                  | PASS                        |
| Task station (Archive) prompt + numbered decision                           | PASS                        |
| Decision station via number keys (exactly one decision)                     | PASS (ADV-7)                |
| Defer/return + abandon/return                                               | PASS (journeys, ADV-3)      |
| Interruption path — ESC pause + keyboard resume                             | PASS (this gate)            |
| Status board accuracy (text vs. mission state)                              | PASS (ADV-5)                |
| Reload behaviour (fresh reboot, progress lost — documented)                 | PASS (matches design; P0-3) |
| Zero page / unexpected console errors                                       | PASS (all viewports)        |
| Full connected world, keyboard-only                                         | PASS (whole 55-test suite)  |

## Screenshots / traces

Participant-representative screenshots were captured against the bundle and are
**regenerable** via the retest commands (kept in the gate scratchpad, not
committed to the repo): `dock-<w>x<h>.png` (each viewport), `narrow-375x667.png`,
`zoom-dsf2-1366x768.png`, `direct-hub-statusboard.png`, `direct-archive-prompt.png`,
`esc-1-paused.png`, `esc-3-moved-after-resume.png`. No traces were needed (no
failures).

## Retest instructions

```bash
# Committed viewport regression (any environment, dev server)
npx playwright test participant_viewport_display        # expect 6/6

# Full participant-representative visual matrix (bundle via preview)
CI=true npm.cmd run bundle
export NODE_PATH="C:/Users/Juls/Desktop/research-station-assessment-game/node_modules"
npx playwright test --config <scratchpad>/pxa.config.ts  # pxa_viewport, pxa_direct, pxa_esc

# To ADD a browser to the supported set (deliberate dependency decision — not
# done in this gate): install it, add a `projects` entry to a throwaway config,
# and re-run the journeys above on that project with zero errors before marking
# it VERIFIED here.
#   npx playwright install firefox        # (or webkit) — dependency decision
```

_No browser or device is claimed supported beyond the VERIFIED rows above._
