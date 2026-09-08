# Camera and scale — Astra selection

Supersedes U1's fixed 1.25 assumption for future presentation implementation; entry build remains unchanged.

## Measured baseline

Tile 32 px. Researcher sheet 96×96, but the inspected south-facing visible body is 45 px high (walk/idle vary; isolated flecks excluded); transparent frame height is not player height. Physics body 32×42 with offset(32,30), speed 175px/s. Current world plate 1024×576 is scaled 1.25 into 1280×720. Current 1920 display CSS-fits the same canvas 1.5×. Five unrevised rooms 800×608 already show 112 px horizontal world margins at the current plate.

## Genuine alternatives

Measurements below use the 45 px visible body; replacement target 48 px is 6.67% in A.

| Option                         | World tiles at 720 /1080 | Player viewport height | Scaling                                                     | Landmarks/navigation                                                   | Room/task implications                                                                             | HUD / performance / cost / scientific risk                                                                                                                                                             |
| ------------------------------ | ------------------------ | ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A Fixed wide — SELECT          | 40×22.5 /40×22.5         | 6.25% /6.25%           | 32 px tile at 1×/1.5×; native output, texel-aware composite | Crossing plus neighbouring district edges; stable field across devices | Larger maps and separated districts required; doors may leave view but architectural spine remains | UI redrawn separately. Plate 3.52 MiB RGBA vs current 2.25. Medium/high migration cost, all small maps expand. Fractional edges require testing; equal visible exposure protects device comparability. |
| B U1 close follow              | 32×18 /32×18             | 7.81% /7.81%           | 1.25×/1.875×                                                | Larger body; threshold/landmark cropping in actual scale captures      | Small room view encourages adjacent task packing or frequent panning                               | Lowest camera cost but fails larger-area intent; more movement and reminder visibility changes. Current plate is not pixel-integer either.                                                             |
| C Physical 1:1 expanding field | 40×22.5 /60×33.75        | 6.25% /4.17%           | 1× source pixels at both sizes                              | 1080 sees many more destinations;720 still scrolls                     | Large rooms essential to fill 1080; smaller player and wider task exposure on large display        | Sharpest raw pixels, simple render; substantially unequal scene exposure/travel planning across devices, higher floor area and scientific migration risk.                                              |
| D Locked district camera       | 30×16.875 /30×16.875     | 8.33% /8.33%           | 960×540 at 1.333×/2×; camera locks to authored districts    | Stable while working; landmarks disappear at boundary cuts             | Room composed from linked screen-sized districts; transition corridors needed                      | Lower continuous camera motion, high boundary/state authoring cost; screen cuts and constrained framing increase disorientation and measure-dependent travel.                                          |

The camera comparison SVG shows a common Concourse geometry through each field. Runtime debug 1.0/1.25/1.5 captures test the current camera only; A/C/D are original proposed composition tests, not implemented camera claims.

## Weighted decision

Scores 1 poor–5 strong, explicit design judgement. Weights: orientation 25, measurement exposure 25, player/pixel readability 20, motion/accessibility 15, implementation/migration 10, performance 5.

| Option | Orientation | Exposure | Readability | Motion | Cost | Performance | Weighted /5 |
| ------ | ----------: | -------: | ----------: | -----: | ---: | ----------: | ----------: |
| A      |           5 |        5 |           4 |      4 |    3 |           4 |        4.40 |
| B      |           2 |        4 |           4 |      3 |    5 |           5 |        3.50 |
| C      |           4 |        1 |           3 |      4 |    3 |           3 |        2.90 |
| D      |           3 |        4 |           4 |      3 |    2 |           4 |        3.40 |

A earns the width needed for navigation without making display size an exposure manipulation. B's lower migration cost cannot outweigh the user diagnosis. C's genuinely native pixels do not compensate for unequal task visibility. D trades follow motion for cuts and a smaller field.

## Frozen implementation contract

1. World view 1280×720; native output 1280×720 or1920×1080, devicePixelRatio explicitly controlled. Same field, same logical world coordinates.
2. Keep world coordinates and 32 px tiles; no collider/movement rescaling. Never resize measurement plot geometry to match art.
3. Render world and UI separately. Preserve current 800×600 logical task-workspace geometry and action locations; fit to height at1.2/1.8 with native text. Centre workspace without cropping; side area is a deliberate modal backdrop, not a world margin.
4. Camera clamp to room bounds; all maps exceed view. Start inside the authored initial camera rectangle. Follow only beyond 128×80world-px dead zone.
5. Time-based damping candidate: alpha=1-exp(-dt/0.16s), approximate 95% settling 0.48s; freeze while modal. Snap final world sampling to source texels where compatible. Reduced-motion keeps no shake/zoom and may use firm bounded follow, subject to equal navigation exposure checks.
6. Keep semantic UI sizes stable across resolutions (18 px body at 720 →27 px at 1080). Large-text presentation cannot hide sources or create new memory requirements.
7. Do not scale a 1024 render texture to simulate a wider world; allocate the new plate and update camera/input transforms together.

## Honest pixel constraint

Identical field and unchanged pixel art cannot have uniform integer source-pixel blocks at both 1280 and 1920: the ratio is 1.5. A accepts unequal 1/2physical-pixel edge widths at 1080 with nearest/texel-aware composition; it does **not** promise perfect integer pixels. Compare stationary and slow pan sequences at both sizes; reject blurred interiors, ghosted contours or distracting shimmer. If it fails, stop at the camera unit for a documented rendering decision. Do not quietly revert to 1.25, change field by device, enlarge characters, or introduce black margins.

A complete 16 px-density art re-author with integer 2×/3× could solve that mathematical constraint, but doubles migration scope and changes collision/art relationships. It is not selected or included in the PixelLab brief.

## Performance and verification

Larger floor textures need chunked cached rendering (candidate 512/1024px chunks) and disposal when leaving a room; do not preload all giant baked floors. Maximum Yard floor 2560×1536 is 15 MiB before duplicate buffers; measure GPU memory, load time and frame time. Keep physics broadphase limited to actual footprints. No extra per-item ambient emitters.

Test both native viewports: entry, crossroad, operating face, tall-object occlusion, corner clamp, modal open/close, pointer transform and keyboard path. Compare 20/30/60fps follow response; target no sustained world blanking, no camera movement during stationary interaction and no input drift. Frame-time targets are design gates pending target hardware, not evidence that this audit established real-device performance.
