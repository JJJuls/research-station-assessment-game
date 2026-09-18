# Owner review package — professional world rebuild V3 (release candidate)

Prepared by Fable on 2026-09-15 at the close of session 4. Every artefact
listed here was produced from the **exact code commit `dba9a37`** (branch
`fable-professional-world-rescue-v2`, worktree
`.claude/worktrees/fable-professional-world-rebuild`, unpushed); the
documentation commit that carries this file follows `dba9a37` and touches no
code. Nothing was pushed, merged, tagged or deployed; the projection
reference was not promoted; the stimulus was not frozen; the asset-set
version was not bumped; no open scientific decision was resolved.

All paths below are relative to `docs/verification/professional-world-rebuild-v3/`
unless stated. Every capture is a real-input automation run (no state
injection, no teleport); timings are automation wall times, never a human
duration claim.

## 1. One strong establishing frame per room — 1280×720 with the matching 1920×1080 frame

The two route captures (`route/1280x720/`, `route/1920x1080/`) are the same
driver on the same commit at the two native canvases; frame numbers and
names correspond one-to-one, so every 720 frame has its 1080 twin under the
same name.

| Room / beat            | 1280×720                                                 | 1920×1080                                                 | What it shows                                                         |
| ---------------------- | -------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Opening                | `route/1280x720/01-opening-establishing.png`             | `route/1920x1080/01-opening-establishing.png`             | the watched opening, first drawn frame (also the video's first frame) |
| Dock                   | `route/1280x720/05-dock-after-check-in-powered.png`      | `route/1920x1080/05-dock-after-check-in-powered.png`      | the Dock after check-in, powered                                      |
| Concourse              | `route/1280x720/06-concourse-entry.png`                  | `route/1920x1080/06-concourse-entry.png`                  | arrival from the Dock, Vale at the operations desk                    |
| Records Workshop       | `route/1280x720/15-workshop-mid-hall-camera-moved.png`   | `route/1920x1080/15-workshop-mid-hall-camera-moved.png`   | the two-bay hall from the vestibule                                   |
| Diagnostics Laboratory | `route/1280x720/17-laboratory-entry.png`                 | `route/1920x1080/17-laboratory-entry.png`                 | entry through the Concourse north door                                |
| Recovery Yard          | `route/1280x720/26-yard-recovery-field-camera-moved.png` | `route/1920x1080/26-yard-recovery-field-camera-moved.png` | the east plate: field, gantry rig, bench                              |
| Utility Deck           | `route/1280x720/31-deck-arrival.png`                     | `route/1920x1080/31-deck-arrival.png`                     | arrival on the deck, feeds down                                       |
| Core Chamber           | `route/1280x720/46-core-stable.png`                      | `route/1920x1080/46-core-stable.png`                      | the stable Core after the confirmation                                |

## 2. Interaction examples (same names at both canvases)

- Dock: `03-dock-arrival-emergency-power` → `04-dock-marker-reached` → `05-dock-after-check-in-powered`.
- Concourse: `07-concourse-vale-briefing`, `08-concourse-watch-offer`, `09-concourse-gauge-read`, `10-concourse-handover-complete`, `29-concourse-vale-return-check-in`.
- Workshop: `12-workshop-work-order-board`, `13-workshop-calibration-bench-before`, `16-workshop-signed-off`, `30-workshop-return-signed-off`.
- Laboratory: `18-laboratory-kai-briefing`, `19-laboratory-kai-exterior-briefing`, `20-laboratory-airlock-guidance`.
- Yard: `22-yard-noor-briefing`, `23-yard-mast-before`, `27-yard-noor-shift-end`.
- Deck: `32-deck-record-closed`, `33-deck-coolant-valve-before`, `35-deck-calibration-breaker-before`, `37-deck-distribution-bus-before`, `40-deck-core-door-open`.
- Core: `42-core-sync-review`, `43-core-confirmation-armed`, `44-core-synchronising`, `45-core-completion-notice`.

## 3. Before / after progression pairs

| Progression                | Before                                 | After                                                                   |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Dock power step-up         | `03-dock-arrival-emergency-power`      | `05-dock-after-check-in-powered`                                        |
| Calibration bench, stage 1 | `13-workshop-calibration-bench-before` | `14-workshop-calibration-bench-after-stage-1`                           |
| Mast 04, outdoor stage 1   | `23-yard-mast-before`                  | `24-yard-mast-after-stage-1`                                            |
| Coolant valve              | `33-deck-coolant-valve-before`         | `34-deck-coolant-valve-after`                                           |
| Calibration breaker        | `35-deck-calibration-breaker-before`   | `36-deck-calibration-breaker-after`                                     |
| Distribution bus           | `37-deck-distribution-bus-before`      | `38-deck-distribution-bus-after`                                        |
| Deck readiness → Core door | `31-deck-arrival`                      | `39-deck-all-feeds-ready`, `40-deck-core-door-open`                     |
| Core                       | `41-core-inactive`                     | `43-core-confirmation-armed`, `44-core-synchronising`, `46-core-stable` |

## 4. Camera-motion pairs

`route/<size>/manifest.json` → `camera_motion`: every consecutive frame pair
inside one scene whose recorded world view moved (19 pairs at 720, 21 at
1080), each with the two frames' `viewX/viewY`, plate scale and bounds.
Readable examples: `14 → 15` (workshop: bench to mid-hall), `25 → 26` (yard:
drift pass to the recovery field), `39 → 40` (deck: feeds to the Core door).

## 5. Room suites — audited approach tours (every station prompt on real input)

Same commit, both canvases; each frame name is identical in
`<room>-look/` (1280×720) and `1920x1080/<room>-look/` (1920×1080).

| Room       | Frames | Tour result 720 / 1080                                                                  |
| ---------- | ------ | --------------------------------------------------------------------------------------- |
| Workshop   | 8      | 15/15 stations · 15/15 (one bounded re-approach at the sample cutter)                   |
| Laboratory | 14     | 9 stations + airlock and south door round-trips · same (one re-approach at Kai at 720)  |
| Deck       | 10     | 6 objects, sealed-door reason, west door · same (one re-approach at the Concourse door) |
| Core       | 9      | 3 objects, inactive prompt, deck round-trip, sealed way back · same                     |
| Yard       | 16     | 12 sites, drift pass, airlock round-trip · same                                         |

Landing precision and frame rate per station are in the run logs
(`[landing]` lines; see REBUILD-REPORT.md §"Session 4" §4): 9–11 fps at
720, 5.3–6.9 fps at 1080 under the software renderer.

## 6. Full-route video

> **Archival correction (2026-09-18, Station 080 correction sprint).** The
> statements below were checked against the file by the research owner and
> are corrected here; the original wording is kept underneath for the
> record.
>
> - The WebM **begins at the Dock, not at the watched opening** (the
>   recorder starts after the opening has drawn, and the first recorded
>   frames are the Dock).
> - Its **decoded average is approximately 6 fps, not 10 fps** — "10 fps"
>   was the recorder's requested capture rate, never a decoded measurement
>   (there is no ffmpeg on the build machine).
> - Its **audio track is very quiet**.
> - It proves **automated progression** through the route on real input
>   under a software renderer; it is **not evidence of participant-side
>   performance**. The owner's own accelerated Windows / Chrome 1920×1080
>   playtest was smooth.
> - This build is an **internal / supervised evaluation build**, not a
>   release candidate, until the scientific blockers in
>   `docs/verification/station-080-correction/OWNER-DECISION-REGISTER.md`
>   are closed. Read "release candidate" in this file's title accordingly.

- `route/1280x720/route-1280x720.webm` — 20,164,511 bytes, `video/webm;codecs=vp8,opus`,
  1280×720, 10 fps, **audio: true** (the DEV tap on the audio kit's master
  gain), one continuous real-input session from the watched opening to the
  stable Core (669,980 ms automation wall, 155 events, final stage
  `complete`, zone sequence Concourse → Workshop → Concourse → Laboratory →
  Yard → Laboratory → Concourse → Workshop → Concourse → Deck → Core).
- No black lead-in by construction: the recorder starts after the opening
  has drawn (`e2e/recording.ts`). No stall or navigation loop: the run never
  entered a helper's retry path (the manifest records every frame's scene,
  stage, player and camera state).
- No ffmpeg on the machine: the VP8/Opus track layout is asserted from the
  recorder's mime and the manifest, not by decoding the file. The original
  WebM is kept unmodified for external audio and motion inspection.
- The 1080 capture (`route/1920x1080/`) carries the 46 native frames and the
  manifest (no video: the recording is the 720 deliverable).

## 7. Scientific projection

- `docs/verification/professional-visual-v4/projection/world-v3.json` — the
  full participant route projection at the final commit (real input,
  800×600 viewport, label `world-v3`); `world-v3.diff.json` — its
  comparison against the approved pre-rebuild reference
  `world-v1-before.json`: **exactly five differences**.
- `docs/verification/professional-visual-v4/projection/world-v3-1080.json` —
  the same route at the 1920×1080 viewport, compared against `world-v3.json`:
  **0 differences** (155 events, 28 opportunities, 25 window ids) —
  resolution independence of the science, proven at the final commit.
- `e2e/v3_projection_reference_delta.spec.ts` (pure) proves
  `world-v3 = world-v1-before + the five deltas` with the route comparator
  itself — see REBUILD-REPORT.md §"Session 4" §5 for the run and the
  promotion recommendation.

## 8. Test matrix

See REBUILD-REPORT.md §"Session 4" §7 (every suite, result, wall time, and
whether it ran alone or beside the foreign browser).

## 9. Asset provenance

- `public/assets/world-v2/manifest.json` and
  `docs/game/world-v2/ASSET-PROVENANCE-REGISTER.md` — every painted plate
  (`public/assets/world-v2/plates/{dock,concourse,workshop,laboratory,deck,core,yard}-plate.png`),
  the opening and architecture sheets, with generator, prompt and selection
  record. All world-v2 art remains **PROVISIONAL, model-selected, not
  human-approved**; no PixelLab generation was spent in sessions 3–4; the
  asset-set version was not bumped.

## 10. Remaining limitations (candid)

- Automation environment: SwiftShader software GL at 9–11 fps (720) and
  5–7 fps (1080); every wall time is an automation figure. The yard
  envelope (300 s) is green alone twice (224 s, 235 s) and not guaranteed
  under concurrent load; the bench re-render waits were widened to 20 s.
  Two flaky-passes (M09 gauge read, workshop pickup press) and one
  intermittent queue failure (`adversarial_reload_partial_state`, green
  alone) belong to the documented input-miss class under load.
- Workshop book audit margin: the locker's ±12 px approach box has a corner
  where the `Sample kit` supply bundle wins nearest-wins (seen at 1080);
  bundles are not in the registry audit's candidate set — owner decision
  whether to move the pallet or the approach point (presentation geometry).
- Mast 04 state chip: at 720 the chip text runs past the canvas right edge
  at the audited approach; at 1080 the avatar overdraws its first
  characters (chips draw under figures by construction) — cosmetic, on the
  polish list with the state-chip register and the deck readout wrap.
- Developer inspection launch: the Core review opens but ARM is refused
  (keyboard and pointer) — developer-only path; the participant-path Core
  frames are the evidence of record.
- Spec tree type-strictness: 15 `tsc` diagnostics remain in specs outside
  `tsconfig.json`'s `include` (possibly-null probes, an untyped window
  field, two literal-type mismatches); the undefined-name class is at 0.
- A second Claude session replayed runner-2 suites concurrently during the
  first half of session 4 (`fable-v3-runner2`); the runner worktrees remain
  for human removal.
- P1–P20 scientific-redesign proposals, the automation-envelope
  re-baseline and the projection promotion remain research-owner decisions.
