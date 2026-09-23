/**
 * World V2 rebuild V3 — final full-route capture set.
 *
 * ONE continuous participant route on REAL input from the watched opening
 * to the stable Core (the same beats the closure suite and the scientific
 * projection drive: offers accepted, gauge read, calibration started,
 * partial antenna start, record closure, the three feeds, the Core
 * confirmation), through every rebuilt room — Dock, Concourse, Records
 * Workshop, Diagnostics Laboratory, Recovery Yard, Utility Deck, Core
 * Chamber — with establishing, interaction and before/after state frames
 * in each, camera-motion pairs (the camera probe is recorded with every
 * frame), and an optional in-page recording of the canvas WITH the
 * procedural audio (e2e/recording.ts; no black lead-in: it starts once
 * the opening has drawn).
 *
 *   WV3_VIEWPORT  WxH browser viewport (default 1280x720; 1920x1080 selects
 *                 the native full-HD canvas by itself)
 *   WV3_OUT       output directory (default professional-world-rebuild-v3/route/<WxH>)
 *   WV3_VIDEO=1   record <OUT>/route-<WxH>.webm
 *
 * A manifest (<OUT>/manifest.json) records the exact commit, viewport,
 * every frame with its scene / player / camera state, the recording
 * facts, the zone sequence, event count and final stage. No state
 * injection, no teleport; nothing here asserts pixels.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { DOCK_SITES } from '../src/pilot/zoneSites';
import {
  closeStationRecord,
  DECK_APPROACH,
  enterCoreChamber,
  feedPanel,
  openFeedPanel,
  openSyncReview,
  waitCompletionNotice,
  waitCoreState,
  waitFeedPanel,
} from './closureHelpers';
import {
  acceptMast,
  APPROACH as YARD_APPROACH,
  doMastStage,
  finishOutside,
  YARD,
} from './exteriorHelpers';
import { driveAxisTo, hold, press, selectPromptOption } from './helpers';
import {
  captureErrors,
  completeDockTutorial,
  expectNoRuntimeErrors,
} from './journey';
import {
  bootPilot,
  concourseToDeck,
  concourseToWorkshop,
  coreVia,
  deckVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  pilotProbe,
  useDoor,
  walkTo,
  workshopToConcourse,
  yardApproach,
  yardVia,
} from './pilotHelpers';
import { startRecording, stopRecording } from './recording';
import {
  clickElement,
  closeSurface,
  keyActivate,
  openPromptDiag,
  openWorkshopSurface,
  promptCardLabels,
  RETURN,
  returnInside,
  signOffReturnShift,
  workshopApproach,
} from './returnHelpers';

const VIEWPORT = (() => {
  const raw = process.env.WV3_VIEWPORT ?? '1280x720';
  const [w, h] = raw.split('x').map((value) => Number(value));

  return { width: w || 1280, height: h || 720 };
})();
const SIZE = `${VIEWPORT.width}x${VIEWPORT.height}`;
const OUT =
  process.env.WV3_OUT ??
  `docs/verification/professional-world-rebuild-v3/route/${SIZE}`;
const VIDEO = process.env.WV3_VIDEO === '1';

interface CameraProbeLike {
  scene: string;
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
  boundsWidth: number;
  boundsHeight: number;
  plate: { width: number; height: number; scale: number };
}

interface FrameRecord {
  index: number;
  name: string;
  file: string;
  bytes: number;
  t_ms: number;
  scene: string | null;
  stage: string | null;
  player: { x: number; y: number } | null;
  camera: {
    viewX: number;
    viewY: number;
    scale: number;
    bounds: { width: number; height: number };
  } | null;
}

const frames: FrameRecord[] = [];
const startedAt = Date.now();

async function stateOf(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as {
      __playerProbe?: { scene: string; x: number; y: number } | null;
      __cameraProbe?: CameraProbeLike | null;
      __pilotProbe?: { stage: string } | null;
    };

    return {
      scene: w.__playerProbe?.scene ?? w.__cameraProbe?.scene ?? null,
      stage: w.__pilotProbe?.stage ?? null,
      player:
        w.__playerProbe === null || w.__playerProbe === undefined
          ? null
          : {
              x: Math.round(w.__playerProbe.x),
              y: Math.round(w.__playerProbe.y),
            },
      camera:
        w.__cameraProbe === null || w.__cameraProbe === undefined
          ? null
          : {
              viewX: Math.round(w.__cameraProbe.viewX),
              viewY: Math.round(w.__cameraProbe.viewY),
              scale: w.__cameraProbe.plate.scale,
              bounds: {
                width: w.__cameraProbe.boundsWidth,
                height: w.__cameraProbe.boundsHeight,
              },
            },
    };
  });
}

/** Settled frame (the typewriter / tween settle every capture spec uses). */
async function snap(page: Page, name: string, settleMs = 350) {
  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }

  const file = `${String(frames.length + 1).padStart(2, '0')}-${name}.png`;
  const path = join(OUT, file);

  await page.screenshot({ path });

  const state = await stateOf(page);

  frames.push({
    index: frames.length + 1,
    name,
    file,
    bytes: statSync(path).size,
    t_ms: Date.now() - startedAt,
    ...state,
  });
}

/** Game design-space (800×600) → page pixel (v4_event_projection precedent). */
async function designPoint(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  const space = await page.evaluate(
    () =>
      (
        window as unknown as {
          __designSpace?: {
            offsetX: number;
            offsetY: number;
            scale: number;
            canvasWidth: number;
            canvasHeight: number;
          } | null;
        }
      ).__designSpace ?? null,
  );

  if (space === null) {
    return {
      x: box.x + (x * box.width) / 800,
      y: box.y + (y * box.height) / 600,
    };
  }

  return {
    x:
      box.x +
      ((space.offsetX + x * space.scale) * box.width) / space.canvasWidth,
    y:
      box.y +
      ((space.offsetY + y * space.scale) * box.height) / space.canvasHeight,
  };
}

async function waitReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
        .__feedPanelProbe?.ready === true,
    undefined,
    { timeout: 10_000 },
  );
}

async function waitSurfaceElement(
  page: Page,
  id: string,
  predicate: 'not-disabled' | 'done',
) {
  await page.waitForFunction(
    ([wanted, mode]) => {
      const state = (
        window as unknown as {
          __workSurfaceProbe?: {
            elements: { id: string; state: string }[];
          } | null;
        }
      ).__workSurfaceProbe?.elements.find((e) => e.id === wanted)?.state;

      return mode === 'done' ? state === 'done' : state !== 'disabled';
    },
    [id, predicate] as const,
    // Surface-clock re-render (see returnHelpers.waitStageDone): a wait
    // budget sized for the software renderer under load, not an assertion.
    { timeout: 20_000 },
  );
}

/** Kai's prompt: the first card that is NOT the handover (returnHelpers precedent). */
async function kaiBeat(page: Page, shot: string) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
  await snap(page, shot);

  const labels = await promptCardLabels(page);
  const index = labels.findIndex((label) => !/^Hand over/.test(label));

  expect(index).toBeGreaterThanOrEqual(0);
  await selectPromptOption(page, index + 1);
}

test('world V3 — full participant route capture with recording', async ({
  page,
}) => {
  test.setTimeout(2_400_000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(VIEWPORT);

  const errors = captureErrors(page);
  const commit = execSync('git rev-parse HEAD').toString().trim();
  let recording: Awaited<ReturnType<typeof startRecording>> | null = null;
  const recordingFile = join(OUT, `route-${SIZE}.webm`);

  // ——— Opening (watched to the end) ———
  await bootPilot(page, `wv3route_${VIEWPORT.width}`, {
    skipOpening: false,
  });

  if (VIDEO) {
    // The opening has drawn: the recording starts on a real frame. 10 fps
    // at 450 kbit/s keeps a ~25 min real-input route under the 100 MB
    // single-file ceiling of a hosted Git remote (the rescue's 3 min
    // recording weighed 12.9 MB at ~570 kbit/s).
    recording = await startRecording(page, recordingFile, {
      fps: 10,
      videoBitsPerSecond: 450_000,
    });
  }

  await page.waitForTimeout(900);
  await snap(page, 'opening-establishing', 0);
  await page.waitForTimeout(4600);
  await snap(page, 'opening-berth', 0);
  await page.waitForFunction(
    () =>
      (window as unknown as { __pilotOpeningProbe?: { open: boolean } | null })
        .__pilotOpeningProbe?.open === false,
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __dockProbe?: { arrival_playing: boolean } | null;
        }
      ).__dockProbe?.arrival_playing === false,
    undefined,
    { timeout: 30_000 },
  );

  // ——— Dock: arrival (emergency power), marker, check-in → power step-up ———
  await snap(page, 'dock-arrival-emergency-power');
  await walkTo(page, DOCK_SITES.marker.x, DOCK_SITES.marker.y, {
    tolerance: 24,
  });
  await snap(page, 'dock-marker-reached');
  // Back on the arrival spine before the terminal approach the tutorial
  // driver performs (its proven start position).
  await walkTo(page, DOCK_SITES.spawnArrival.x, DOCK_SITES.spawnArrival.y, {
    yFirst: true,
  });
  await completeDockTutorial(page, 1);
  await page.waitForTimeout(2400);
  await snap(page, 'dock-after-check-in-powered');

  // ——— Concourse: entry, Vale's briefing, the offers, the gauge, handover ———
  await dockToConcourse(page);
  await snap(page, 'concourse-entry');
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await snap(page, 'concourse-vale-briefing');
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await page.waitForTimeout(400);
  await snap(page, 'concourse-watch-offer');
  await selectPromptOption(page, 1); // watch: accept
  await page.waitForTimeout(400);
  await selectPromptOption(page, 1); // delivery promise: accept
  await page.waitForTimeout(400);
  await selectPromptOption(page, 1); // the standardised interruption
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // M05 (Unit 6): extra lamp job — decline
  await page.waitForTimeout(400);
  // South-lane discipline first (returnHelpers precedent): reach y 252 at
  // ±4 before the eastward leg, clear of the operations-desk row.
  await driveAxisTo(page, 'y', RETURN.concourse.loopY, 4);
  await driveAxisTo(page, 'x', RETURN.concourse.gauge.x, 8);
  await interactAt(page, RETURN.concourse.gauge, {
    approachOffset: { x: 0, y: -56 },
    yFirst: true,
  });
  await page.waitForTimeout(400);
  await snap(page, 'concourse-gauge-read');
  await walkTo(page, PILOT.concourse.vale.x, RETURN.concourse.loopY, {
    yFirst: true,
  });
  await openPromptDiag(page, PILOT.concourse.vale, { x: 0, y: 56 });
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop');
  await snap(page, 'concourse-handover-complete');

  // ——— Records Workshop: entry, board, calibration bench (before/after), sign-off ———
  await concourseToWorkshop(page);
  await snap(page, 'workshop-entry-east-door');
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await snap(page, 'workshop-work-order-board');
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_work');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await openWorkshopSurface(page, 'calibrationBench', 'm07_calibration_bench');
  await snap(page, 'workshop-calibration-bench-before');
  await waitSurfaceElement(page, 'advance', 'not-disabled');
  await clickElement(page, 'advance');
  await waitSurfaceElement(page, 'stage_1', 'done');
  await page.waitForTimeout(300);
  await snap(page, 'workshop-calibration-bench-after-stage-1');
  await closeSurface(page);
  await snap(page, 'workshop-mid-hall-camera-moved');
  await workshopApproach(page, 'board');
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'lab_briefing');
  await snap(page, 'workshop-signed-off');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);

  // ——— Diagnostics Laboratory: entry, Kai's beats, the airlock ———
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
  await snap(page, 'laboratory-entry');
  await kaiBeat(page, 'laboratory-kai-briefing');
  await expectStage(page, 'lab_work');
  await kaiBeat(page, 'laboratory-kai-exterior-briefing');
  await expectStage(page, 'exterior_briefing');
  await snap(page, 'laboratory-airlock-guidance');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });

  // ——— Recovery Yard: arrival, Noor, Mast 04 before/after, the drift pass, the field ———
  await snap(page, 'yard-airlock-arrival');
  await openPromptAt(page, PILOT.yard.noor, {
    approachOffset: await yardApproach(page, PILOT.yard.noor),
  });
  await snap(page, 'yard-noor-briefing');
  await selectPromptOption(page, 1);
  await expectStage(page, 'exterior_work');
  await page.waitForTimeout(450);
  await selectPromptOption(page, 2); // M05 (Unit 6): extra flag job — decline
  await page.waitForTimeout(300);
  await yardVia(
    page,
    YARD.mast.x + YARD_APPROACH.mast.x,
    YARD.mast.y + YARD_APPROACH.mast.y,
  );
  await snap(page, 'yard-mast-before');
  await acceptMast(page);
  await doMastStage(page, 1);
  await snap(page, 'yard-mast-after-stage-1');
  await yardVia(page, 900, 400);
  await snap(page, 'yard-open-field');
  await yardVia(page, 1224, 376);
  await snap(page, 'yard-recovery-field-camera-moved');
  // Back through the drift pass to Noor's audited approach before the
  // shift-end beat (finishOutside walks the last leg itself).
  await yardVia(
    page,
    YARD.noor.x + YARD_APPROACH.noor.x,
    YARD.noor.y + YARD_APPROACH.noor.y,
  );
  await finishOutside(page);
  await snap(page, 'yard-noor-shift-end');

  // ——— The purposeful return: lab → Concourse (Vale) → workshop sign-off → deck ———
  await returnInside(page);
  await snap(page, 'concourse-return-hub');
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await snap(page, 'concourse-vale-return-check-in');
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
  await signOffReturnShift(page);
  await snap(page, 'workshop-return-signed-off');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
  await snap(page, 'deck-arrival');

  // ——— Utility Deck closure: record, the three feeds (before/after), the Core door ———
  await closeStationRecord(page);
  await snap(page, 'deck-record-closed');

  await openFeedPanel(page, 'coolant');
  await snap(page, 'deck-coolant-valve-before');
  for (let chunk = 0; chunk < 10; chunk += 1) {
    await hold(page, 'ArrowRight', 700);

    const ready = await page.evaluate(
      () =>
        (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
          .__feedPanelProbe?.ready === true,
    );

    if (ready) break;
  }
  await waitReady(page);
  await snap(page, 'deck-coolant-valve-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  await openFeedPanel(page, 'calibration');
  await snap(page, 'deck-calibration-breaker-before');
  for (let step = 0; step < 7; step += 1) {
    await press(page, 'ArrowUp');
  }
  await press(page, 'Enter');
  await waitReady(page);
  await snap(page, 'deck-calibration-breaker-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  const bus = await openFeedPanel(page, 'distribution');

  await snap(page, 'deck-distribution-bus-before');

  const coupler = bus.geometry.coupler!;
  const socket = bus.geometry.socket!;
  const from = await designPoint(
    page,
    coupler.x + coupler.w / 2,
    coupler.y + coupler.h / 2,
  );
  const to = await designPoint(
    page,
    socket.x + socket.w / 2,
    socket.y + socket.h / 2,
  );

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 10 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await waitReady(page);
  expect((await feedPanel(page))?.coupler).toBe('seated');
  await snap(page, 'deck-distribution-bus-after');
  await press(page, 'Enter');
  await waitFeedPanel(page, false);

  await deckVia(page, 500, 220);
  await snap(page, 'deck-all-feeds-ready');
  await deckVia(
    page,
    PILOT.deck.coreDoor.x + DECK_APPROACH.coreDoor.x,
    PILOT.deck.coreDoor.y + DECK_APPROACH.coreDoor.y,
  );
  await snap(page, 'deck-core-door-open');

  // ——— Core Chamber: inactive, review, armed, synchronising, stable ———
  await enterCoreChamber(page);
  await coreVia(page, 344, 288);
  await snap(page, 'core-inactive');
  await openSyncReview(page);
  await snap(page, 'core-sync-review');
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await snap(page, 'core-confirmation-armed');
  await clickElement(page, 'confirm_sync');
  await waitCoreState(page, 'synchronizing', 5000).catch(() => undefined);
  await page.waitForTimeout(900);
  await snap(page, 'core-synchronising', 0);
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
  await snap(page, 'core-completion-notice');
  await keyActivate(page, 'close_notice');
  await waitCompletionNotice(page, false);
  await coreVia(page, 344, 288);
  await snap(page, 'core-stable');

  if (recording !== null) {
    await page.waitForTimeout(1500);
    await stopRecording(page);
  }

  // ——— Manifest ———
  const probe = await pilotProbe(page);
  const events = (await page.evaluate(() =>
    JSON.parse(
      (
        window as unknown as {
          researchRuntime: { exportEventsJSON: () => string };
        }
      ).researchRuntime.exportEventsJSON(),
    ),
  )) as
    | { event_type: string; metadata?: { to?: string } }[]
    | { events?: { event_type: string; metadata?: { to?: string } }[] };
  const list = Array.isArray(events) ? events : (events.events ?? []);
  const zones: string[] = [];

  for (const event of list) {
    if (event.event_type === 'pilot_door_used') {
      const to = String(event.metadata?.to ?? '');

      if (to.length > 0 && zones[zones.length - 1] !== to) {
        zones.push(to);
      }
    }
  }

  const cameraMotion = frames
    .map((frame, index) => ({ frame, previous: frames[index - 1] }))
    .filter(
      ({ frame, previous }) =>
        previous !== undefined &&
        previous.scene === frame.scene &&
        frame.camera !== null &&
        previous.camera !== null &&
        (frame.camera.viewX !== previous.camera.viewX ||
          frame.camera.viewY !== previous.camera.viewY),
    )
    .map(({ frame, previous }) => ({
      scene: frame.scene,
      from: { file: previous!.file, camera: previous!.camera },
      to: { file: frame.file, camera: frame.camera },
    }));

  const manifest = {
    generated_at: new Date().toISOString(),
    commit,
    viewport: VIEWPORT,
    canvas: await page.evaluate(() => {
      const canvas = document.querySelector('canvas');

      return canvas === null
        ? null
        : { width: canvas.width, height: canvas.height };
    }),
    recording:
      recording === null
        ? null
        : {
            file: `route-${SIZE}.webm`,
            bytes: statSync(recordingFile).size,
            ...recording,
          },
    wall_ms: Date.now() - startedAt,
    final_stage: probe?.stage ?? null,
    event_count: list.length,
    zone_sequence: zones,
    frames,
    camera_motion: cameraMotion,
    note: 'AUTOMATION run on real input (no state injection); frame timings are automation wall times, never a human duration claim.',
  };

  writeFileSync(
    join(OUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  expect(probe?.stage).toBe('complete');
  expect(zones.length, 'the route crossed zones').toBeGreaterThan(5);
  expect(cameraMotion.length, 'camera motion recorded').toBeGreaterThan(0);
  expectNoRuntimeErrors(errors);
});
