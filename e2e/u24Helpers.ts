/**
 * U24 Part B — the connected route end to end (scenario drivers, evidence
 * capture and the L2 scenario expectation).
 *
 * Ordinary play only (plan §0 "Ordinary play"): real keyboard and pointer
 * input from the Dock, position-synced on the read-only DEV probes, through
 * the existing drivers (`walkTo`, `interactAt`, the per-row route acts
 * re-transcribed from the row route specs). Never `completeDebugSession`,
 * `?scene=`, `?route=legacy`, `?dev_closure=`, `?ip_form=`, `?module` /
 * `?freeplay`, injected state or the in-page `buildExportPayload` import.
 *
 * The export used for reproduction is the participant pipeline's own
 * request at the Core completion, captured by `page.route` on a
 * same-origin mock ingest (`launch_mode=test`); every request that is not
 * to localhost is aborted, so nothing leaves the machine.
 *
 * The L2 expectation (`S1_EXPECTATION`, `S2_EXPECTATION`) is a SCENARIO
 * expectation: hand-derived from the register formulas and the scripted
 * choices below. It never imports `src/measurement/features` and it does
 * not recount the exported raw events.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { M17_FORMS } from '../src/informationProcessing/syntaxForms';
import { M03_SPEC } from '../src/pilot/windows/m03RestoreModel';
import { M04_PIECES } from '../src/pilot/windows/m04CuttingModel';
import { M09_OFFER_LABELS } from '../src/pilot/windows/m09WatchModel';
import {
  M10_DELEGATE_LABELS,
  M10_HANDOVER_LABELS,
  M10_MENU_ENTRY_LABEL,
  M10_OFFER_LABELS,
  m10DelegateConfirmLabel,
} from '../src/pilot/windows/m10DeliveryModel';
import { M12_PRODUCTS } from '../src/pilot/windows/m12CheckModel';
import { WORKSHOP_SITES } from '../src/pilot/zoneSites';
import {
  closeStationRecord,
  enterCoreChamber,
  openSyncReview,
  raiseFeedKeyboard,
  raiseFeedPointer,
  waitCompletionNotice,
  waitCoreState,
} from './closureHelpers';
import {
  answerOpenCheck,
  APPROACH,
  continueUplinkExplanation,
  depleteDeck,
  ensureOutsideCompound,
  finishAtRig,
  leaveYard,
  magnetCycle,
  openSite,
  powerUpUplink,
  standOnPad,
  startAntenna,
  startSalvageTally,
  transmitAt,
  useSortingBench,
  waitContinuationClosed,
  waitDisconnect,
  YARD,
} from './exteriorHelpers';
import {
  clickPhysicalContainer,
  clickPhysicalObject,
  designToPage,
  driveAxisTo,
  getEvents,
  hold,
  physicalProbe,
  press,
  selectPromptOption,
} from './helpers';
import {
  clickTerminalButton,
  completeLatticeByKeyboard,
  composeByClick,
  dragChipToBin,
  ipModule,
  latticeNext,
  pipeProbe,
  typeCommand,
  waitBufferLength,
  waitPipeOpen,
  waitPipeView,
  waitTerminalOpen,
} from './ipHelpers';
import { completeDockTutorial } from './journey';
import {
  blurPage,
  chooseFailure,
  confirmStop,
  failFirst,
  focusPage,
  hidePage,
  m23Field,
  openPanel as m23OpenPanel,
  openPlot,
  openSeries,
  requestStop,
  scanHere,
  showPage,
  startPlot,
  stepAway,
  waitView as m23WaitView,
  walkInsidePlot,
  walkIntoPlot,
  worldPrompt,
  yardPromptBounds,
} from './m23Helpers';
import {
  ANNEX_DRIVER,
  annexPieceStand,
  answerLogbookOffer,
  clickPromptLabel,
  concourseToDeck,
  concourseToWorkshop,
  concourseVia,
  dockToConcourse,
  expectStage,
  interactAt,
  labApproach,
  openPromptAt,
  PILOT,
  promptLabels,
  registryApproach,
  selectPromptLabel,
  SETTLE_PAUSE_MS,
  useDoor,
  waitPromptLabel,
  waitScene,
  walkTo,
  workshopToConcourse,
  workshopVia,
  yardVia,
} from './pilotHelpers';
import {
  acknowledgeQuestionnaireNotice,
  assembleReport,
  attachCode,
  calibrationReturn,
  clickElement,
  codeFor,
  keyActivate,
  openWorkshopSurface,
  placeOutbound,
  placeThreeLines,
  pressBatchB,
  repairRelay,
  RETURN,
  signOffReturnShift,
  submitReport,
  surface,
  waitSurface,
  workshopApproach,
} from './returnHelpers';

/* ------------------------------------------------------------------ *
 * Launch, network isolation and the participant export
 * ------------------------------------------------------------------ */

/** Same-origin mock ingest (localhost only; fulfilled by the test). */
export const U24_INGEST_PATH =
  '/__u24-mock__/functions/v1/ingest-research-session';
export const U24_SURVEY_PATH = '/__u24-mock__/survey';
const U24_MOCK_KEY = 'sb_publishable_u24_mock_only';

export interface CapturedExport {
  /** The request body exactly as the page sent it. */
  body: string;
  /** Parsed envelope. */
  envelope: {
    export_id: string;
    page_load_index: number;
    payload: Record<string, unknown> & {
      raw_events?: unknown[];
      raw_events_omitted?: boolean;
    };
  } & Record<string, unknown>;
  keepalive: boolean;
  received_at: string;
}

export interface PipelineOptions {
  /** HTTP status the ingest answers with (default 201, acknowledged). */
  ingestStatus?: number;
  allowProductionInDev?: boolean;
  autoNavigateDelayMs?: number;
}

export interface Pipeline {
  exports: CapturedExport[];
  /** Hosts whose requests were aborted (never contacted). */
  blocked: string[];
  /** Navigations to the mock survey (caught locally). */
  surveyHits: string[];
}

function isLocal(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

/**
 * Installs the export configuration, the localhost-only network policy and
 * the mock ingest / survey before the first navigation.
 */
export async function installPipeline(
  page: Page,
  options: PipelineOptions = {},
): Promise<Pipeline> {
  const pipeline: Pipeline = { exports: [], blocked: [], surveyHits: [] };

  await page.addInitScript(
    ({ path, key, allowProductionInDev, autoNavigateDelayMs }) => {
      (
        window as unknown as { __researchExportConfig?: unknown }
      ).__researchExportConfig = {
        ingestUrl: path,
        publishableKey: key,
        timeoutMs: 4_000,
        allowProductionInDev,
        autoNavigateDelayMs,
      };
    },
    {
      path: U24_INGEST_PATH,
      key: U24_MOCK_KEY,
      allowProductionInDev: options.allowProductionInDev ?? false,
      autoNavigateDelayMs: options.autoNavigateDelayMs ?? 600_000,
    },
  );

  // Every request that is not to localhost is answered locally with an
  // empty body and recorded (plan §0 "No external contact": aborted or
  // fulfilled — fulfilled, so the DEV template's external script leaves no
  // console error); localhost passes through to the dev server.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (!isLocal(url)) {
      pipeline.blocked.push(url.host);
      await route.fulfill({ status: 200, body: '' });

      return;
    }

    await route.fallback();
  });

  await page.route(`**${U24_INGEST_PATH}`, async (route) => {
    const request = route.request();
    const body = request.postData() ?? '';
    const envelope = JSON.parse(body) as CapturedExport['envelope'];

    pipeline.exports.push({
      body,
      envelope,
      keepalive:
        (envelope.payload as { raw_events_omitted?: boolean })
          .raw_events_omitted !== undefined ||
        envelope.session_status === 'incomplete',
      received_at: new Date().toISOString(),
    });

    const status = options.ingestStatus ?? 201;

    await route.fulfill({
      status,
      contentType: 'application/json',
      body:
        status < 300
          ? JSON.stringify({
              ok: true,
              acknowledged: true,
              duplicate: false,
              export_id: envelope.export_id,
              server_received_at: new Date().toISOString(),
            })
          : JSON.stringify({ ok: false, error: { code: 'storage_failed' } }),
    });
  });

  await page.route(`**${U24_SURVEY_PATH}**`, async (route) => {
    pipeline.surveyHits.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>mock survey</title><p id="survey">survey</p>',
    });
  });

  return pipeline;
}

/** Launch parameters of a U24 scenario (synthetic identities only). */
export interface U24Launch {
  participant_id: string;
  game_session_id: string;
  launch_mode?: string;
  extra?: Record<string, string>;
}

/**
 * Boots the participant default (the Dock, the opening overlay) with a
 * FIXED synthetic identity — so both S1 viewports receive the same
 * assignment — and skips the opening with one key press.
 */
export async function bootU24(page: Page, launch: U24Launch) {
  const params = new URLSearchParams({
    participant_id: launch.participant_id,
    game_session_id: launch.game_session_id,
    launch_mode: launch.launch_mode ?? 'test',
    ...launch.extra,
  });

  await page.goto(`/?${params.toString()}`);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { open: boolean } | null;
        }
      ).__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(400);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
}

/* ------------------------------------------------------------------ *
 * Input counting and the per-stage log (V-1)
 * ------------------------------------------------------------------ */

export interface InputCounts {
  key_presses: number;
  key_downs: number;
  pointer_clicks: number;
  pointer_downs: number;
}

/**
 * Counts every keyboard and pointer act the drivers send, by wrapping the
 * page's own keyboard and mouse (the drivers' only input channel).
 */
export function instrumentInput(page: Page): InputCounts {
  const counts: InputCounts = {
    key_presses: 0,
    key_downs: 0,
    pointer_clicks: 0,
    pointer_downs: 0,
  };
  const keyboard = page.keyboard;
  const mouse = page.mouse;
  const keyPress = keyboard.press.bind(keyboard);
  const keyDown = keyboard.down.bind(keyboard);
  const click = mouse.click.bind(mouse);
  const dblclick = mouse.dblclick.bind(mouse);
  const down = mouse.down.bind(mouse);

  keyboard.press = async (...args: Parameters<typeof keyPress>) => {
    counts.key_presses += 1;

    return keyPress(...args);
  };
  keyboard.down = async (...args: Parameters<typeof keyDown>) => {
    counts.key_downs += 1;

    return keyDown(...args);
  };
  mouse.click = async (...args: Parameters<typeof click>) => {
    counts.pointer_clicks += 1;

    return click(...args);
  };
  mouse.dblclick = async (...args: Parameters<typeof dblclick>) => {
    counts.pointer_clicks += 2;

    return dblclick(...args);
  };
  mouse.down = async (...args: Parameters<typeof down>) => {
    counts.pointer_downs += 1;

    return down(...args);
  };

  return counts;
}

export interface StageRecord {
  step: string;
  stage: string | null;
  zone: string | null;
  elapsed_ms: number;
  input: InputCounts;
}

/** The per-stage log of V-1: stage, zone, elapsed time and input counts. */
export class StageLog {
  readonly records: StageRecord[] = [];
  private readonly started = Date.now();

  constructor(
    private readonly page: Page,
    private readonly counts: InputCounts,
  ) {}

  async mark(step: string) {
    const where = await this.page.evaluate(() => {
      const w = window as unknown as {
        __pilotProbe?: { stage: string } | null;
        __playerProbe?: { scene: string } | null;
      };

      return {
        stage: w.__pilotProbe?.stage ?? null,
        zone: w.__playerProbe?.scene ?? null,
      };
    });

    this.records.push({
      step,
      ...where,
      elapsed_ms: Date.now() - this.started,
      input: { ...this.counts },
    });
  }
}

/* ------------------------------------------------------------------ *
 * Frames (V-6): a JSON sidecar written immediately BEFORE each capture
 * ------------------------------------------------------------------ */

export class FrameRecorder {
  private index = 0;
  readonly names: string[] = [];

  constructor(
    private readonly page: Page,
    private readonly dir: string,
    private readonly viewport: string,
  ) {
    mkdirSync(dir, { recursive: true });
  }

  async shot(name: string, extra: Record<string, unknown> = {}) {
    this.index += 1;

    const file = `${String(this.index).padStart(3, '0')}-${name}`;
    const state = await this.page.evaluate(() => {
      const w = window as unknown as {
        __pilotProbe?: { stage: string } | null;
        __playerProbe?: { scene: string; x: number; y: number } | null;
        __workSurfaceProbe?: {
          open: boolean;
          surface_id?: string | null;
          title?: string;
        } | null;
        __inventoryUiProbe?: { open: boolean; mode?: string } | null;
        __worldPromptProbe?: { prompt: boolean; text?: string | null } | null;
        __promptCards?: { label: string }[] | null;
        __yardPromptProbe?: unknown;
      };

      return {
        stage: w.__pilotProbe?.stage ?? null,
        player: w.__playerProbe ?? null,
        work_surface: w.__workSurfaceProbe
          ? {
              open: w.__workSurfaceProbe.open,
              surface_id: w.__workSurfaceProbe.surface_id ?? null,
              title: w.__workSurfaceProbe.title ?? null,
            }
          : null,
        overlay: w.__inventoryUiProbe
          ? {
              open: w.__inventoryUiProbe.open,
              mode: w.__inventoryUiProbe.mode ?? null,
            }
          : null,
        world_prompt: w.__worldPromptProbe ?? null,
        prompt_cards: w.__promptCards?.map((card) => card.label) ?? null,
        yard_prompt_probe: w.__yardPromptProbe ?? null,
      };
    });

    writeFileSync(
      join(this.dir, `${file}.json`),
      JSON.stringify(
        {
          frame: file,
          viewport: this.viewport,
          captured_at: new Date().toISOString(),
          ...state,
          ...extra,
        },
        null,
        2,
      ),
    );
    await this.page.screenshot({ path: join(this.dir, `${file}.png`) });
    this.names.push(file);
  }
}

let activeFrames: FrameRecorder | null = null;

/** The spec's frame recorder for the running scenario (null: no frames). */
export function useFrames(recorder: FrameRecorder | null) {
  activeFrames = recorder;
}

/** A V-6 frame at a route point (a no-op without a recorder). */
export async function frame(name: string, extra: Record<string, unknown> = {}) {
  await activeFrames?.shot(name, extra);
}

/**
 * Captures the first view of a surface opened INSIDE a shared driver (one
 * the U24 boundary forbids changing): polls the read-only probes and takes
 * one frame when the surface or overlay is open. It sends no input.
 */
export async function frameWhenOpen(
  page: Page,
  id: string,
  name: string,
  timeout = 120_000,
): Promise<void> {
  if (activeFrames === null) {
    return;
  }

  const until = Date.now() + timeout;

  while (Date.now() < until) {
    const open = await page.evaluate((wanted) => {
      const w = window as unknown as {
        __workSurfaceProbe?: { open: boolean; surface_id?: string } | null;
        __inventoryUiProbe?: { open: boolean; mode?: string } | null;
      };

      return (
        (w.__workSurfaceProbe?.open === true &&
          w.__workSurfaceProbe.surface_id === wanted) ||
        (w.__inventoryUiProbe?.open === true &&
          w.__inventoryUiProbe.mode === wanted)
      );
    }, id);

    if (open) {
      await page.waitForTimeout(450);
      await frame(name);

      return;
    }

    await page.waitForTimeout(150);
  }
}

/* ------------------------------------------------------------------ *
 * Small shared probes
 * ------------------------------------------------------------------ */

type EventLike = {
  event_type: string;
  metadata?: Record<string, unknown>;
};

async function events(page: Page): Promise<EventLike[]> {
  return (await getEvents(page)) as EventLike[];
}

export async function countType(page: Page, type: string): Promise<number> {
  return (await events(page)).filter((event) => event.event_type === type)
    .length;
}

export async function waitType(
  page: Page,
  type: string,
  wanted: number,
  timeout = 8_000,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if ((await countType(page, type)) >= wanted) {
      return;
    }

    await page.waitForTimeout(200);
  }

  throw new Error(
    `timed out waiting for ${wanted} × ${type} (have ${await countType(page, type)})`,
  );
}

async function lastMeta(page: Page, type: string) {
  const found = (await events(page)).filter(
    (event) => event.event_type === type,
  );

  return found[found.length - 1]?.metadata ?? {};
}

async function elementLabel(page: Page, id: string): Promise<string> {
  return (
    (await surface(page))?.elements.find((element) => element.id === id)
      ?.label ?? ''
  );
}

async function playerAt(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __playerProbe?: { x: number; y: number } | null })
        .__playerProbe ?? null,
  );
}

/** Opens a work surface at a registry approach point (retried landing). */
async function openSurfaceAtApproach(
  page: Page,
  approach: { x: number; y: number },
  id: string,
  via: (x: number, y: number) => Promise<void>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await via(approach.x, approach.y);
    await interactAt(page, approach, { approachOffset: { x: 0, y: 0 } });

    if (
      await waitSurface(page, true, id).then(
        () => true,
        () => false,
      )
    ) {
      return;
    }
  }

  throw new Error(
    `surface ${id} did not open (player ${JSON.stringify(await playerAt(page))})`,
  );
}

/* ------------------------------------------------------------------ *
 * Inventory-overlay probe (M02, M03)
 * ------------------------------------------------------------------ */

interface OverlaySlot {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
}

interface OverlayProbe {
  open: boolean;
  mode: string;
  focus: { container_id: string; slot_index: number } | null;
  confirm_open?: boolean;
  m02c?: { phase: string; request_number: number | null } | null;
  m03t?: { phase: string } | null;
  slots: OverlaySlot[];
  buttons: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    enabled: boolean;
  }[];
}

async function overlay(page: Page): Promise<OverlayProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __inventoryUiProbe?: OverlayProbe | null })
        .__inventoryUiProbe ?? null,
  );
}

async function waitOverlay(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __inventoryUiProbe?: { open: boolean } | null })
        .__inventoryUiProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

async function clickSlot(page: Page, slot: OverlaySlot) {
  const point = await designToPage(
    page,
    slot.x + slot.w / 2,
    slot.y + slot.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

async function dragSlot(page: Page, from: OverlaySlot, to: OverlaySlot) {
  const a = await designToPage(page, from.x + from.w / 2, from.y + from.h / 2);
  const b = await designToPage(page, to.x + to.w / 2, to.y + to.h / 2);

  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 8 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function clickOverlayButton(page: Page, id: string) {
  const button = (await overlay(page))?.buttons.find((b) => b.id === id);

  if (button === undefined) {
    throw new Error(`overlay button ${id} not in probe`);
  }

  const point = await designToPage(
    page,
    button.x + button.w / 2,
    button.y + button.h / 2,
  );

  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(260);
}

/** Moves the overlay's keyboard focus to a slot with ArrowRight (bounded). */
async function focusOverlaySlot(
  page: Page,
  containerId: string,
  slotIndex: number,
) {
  // The overlay moves the focus linearly through its grids in probe order
  // and does not wrap: step towards the target (the m03_m04_route rule).
  for (let presses = 0; presses < 80; presses += 1) {
    const probe = (await overlay(page))!;
    const focus = probe.focus;

    if (focus?.container_id === containerId && focus.slot_index === slotIndex) {
      return;
    }

    const linear = (container: string, slot: number) =>
      probe.slots.findIndex(
        (s) => s.container_id === container && s.slot_index === slot,
      );
    const current =
      focus === null ? -1 : linear(focus.container_id, focus.slot_index);
    const target = linear(containerId, slotIndex);

    await page.keyboard.press(
      current === -1 || current < target ? 'ArrowRight' : 'ArrowLeft',
    );
    await page.waitForTimeout(90);
  }

  throw new Error(`keyboard focus never reached ${containerId}:${slotIndex}`);
}

function slotOf(probe: OverlayProbe, containerId: string, index: number) {
  const slot = probe.slots.find(
    (s) => s.container_id === containerId && s.slot_index === index,
  );

  if (slot === undefined) {
    throw new Error(`slot ${containerId}[${index}] not in probe`);
  }

  return slot;
}

function slotHolding(probe: OverlayProbe, definitionId: string) {
  const slot = probe.slots.find((s) => s.definition_id === definitionId);

  if (slot === undefined) {
    throw new Error(`${definitionId} is on no slot`);
  }

  return slot;
}

/* ================================================================== *
 * EPISODE 1 — Concourse (incident handover)
 * ================================================================== */

const CONCOURSE = {
  planBoard: registryApproach('concourse.plan_board'),
  incidentDesk: registryApproach('concourse.incident_desk'),
  qcPacket: registryApproach('concourse.qc_packet_o1'),
  gauge: registryApproach('concourse.monitor_gauge'),
  lamp: registryApproach('concourse.reading_desk_lamp'),
  laneY: 252,
} as const;

/**
 * Vale's chain with every offer accepted: briefing, the watch (M09), the
 * key card (M10 d1) with its alarm and recap, the lamp job (M05 o1).
 */
export async function valeChainAccept(page: Page) {
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await frame('npc-vale-briefing');
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await waitPromptLabel(page, 'I will take the watch.');
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await frame('npc-vale-watch-offer');
  await selectPromptLabel(page, 'I will take the watch.');
  await waitPromptLabel(page, 'I will take it to Kai.');
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, 'I will take it to Kai.');
  await waitPromptLabel(page, 'Alarm cleared — continue.');
  await page.waitForTimeout(400);
  await selectPromptOption(page, 1);
  await waitPromptLabel(page, 'Understood.');
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptOption(page, 1);
  await waitPromptLabel(page, 'Yes — I will take the lamp job.');
  await page.waitForTimeout(450);
  await frame('npc-vale-lamp-offer');
  await selectPromptLabel(page, 'Yes — I will take the lamp job.');
  await waitType(page, 'proto_m05_start_eligible', 1);
}

/**
 * M05 o1 (Unit 6): the lamp job FIRST, before the briefed stations (the
 * B-9 order), started at once; the 2 s work cycle completes it.
 */
export async function lampJob(page: Page) {
  await openSurfaceAtApproach(page, CONCOURSE.lamp, 'm05_lamp_job', (x, y) =>
    concourseVia(page, x, y),
  );
  await page.waitForTimeout(450);
  await frame('m05-lamp-first-view');
  await clickElement(page, 'start');
  await waitType(page, 'proto_m05_start_started', 1);
  await waitType(page, 'proto_m05_start_work_completed', 1);
  await frame('m05-lamp-done');
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** M01 o1 (Unit 5): one card placed by pointer, then the jobs worked. */
export async function planBoardBatch1(page: Page) {
  await openSurfaceAtApproach(
    page,
    CONCOURSE.planBoard,
    'm01_plan_board',
    (x, y) => concourseVia(page, x, y),
  );
  await frame('m01-board-first-view');
  await clickElement(page, 'card_isolate_loop');
  await clickElement(page, 'slot_0');
  await waitType(page, 'proto_m01_batch_card_placed', 1);
  await page.waitForTimeout(500);
  await frame('m01-board-card-placed');

  for (const [index, job] of [
    'isolate_loop',
    'replace_seal',
    'log_storm',
  ].entries()) {
    await clickElement(page, `do_${job}`);
    await waitType(page, 'proto_m01_batch_job_done', index + 1);
    await page.waitForTimeout(500);
  }

  await waitType(page, 'proto_m01_batch_window_closed', 1);
  await page.waitForTimeout(300);
  await frame('m01-board-done');
  await press(page, 'Escape');
  await waitSurface(page, false);
}

const DESK_SETTLE_MS = 400;

async function deskAnswer(page: Page, letter: 'a' | 'b' | 'c' | 'd' | 'n') {
  if (letter === 'n') {
    await page.keyboard.press('n');
  } else {
    await page.keyboard.press(letter);
    await page.waitForTimeout(150);
    await page.keyboard.press('r');
  }

  await page.waitForTimeout(DESK_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

async function deskNext(page: Page) {
  await page.waitForTimeout(DESK_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/**
 * M14 (Unit 17, the R1 script): packet 1 — D1 with its three sources then
 * A (correct), D2 A (wrong, none of its sources), D3 CANNOT SOLVE; packet
 * 2 — B (correct), C (correct), B (wrong); results, FINISH. 3 / 6.
 */
export async function incidentDesk(page: Page) {
  await incidentDeskToResults(page);
  await page.waitForTimeout(DESK_SETTLE_MS);
  await page.keyboard.press('Enter'); // NEXT (packet 2 results)
  await page.waitForTimeout(DESK_SETTLE_MS + 100);
  await page.keyboard.press('f'); // FINISH
  await waitSurface(page, false);
}

/** M14 up to the first results page (SHOW RESULTS pressed). */
export async function incidentDeskToResults(page: Page) {
  await openSurfaceAtApproach(
    page,
    CONCOURSE.incidentDesk,
    'm14_incident_desk',
    (x, y) => concourseVia(page, x, y),
  );
  await page.waitForTimeout(DESK_SETTLE_MS);
  await frame('m14-orientation');
  await page.keyboard.press('Enter'); // START PACKET 1
  await page.waitForTimeout(300);

  for (const key of ['1', '7', '4']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }

  await page.keyboard.press('a');
  await page.waitForTimeout(200);
  await frame('m14-p1-d1-sources-draft');
  await page.keyboard.press('r');
  await page.waitForTimeout(DESK_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await frame('m14-acknowledgement');
  await deskNext(page);
  await deskAnswer(page, 'a');
  await deskNext(page);
  await deskAnswer(page, 'n');
  await deskNext(page); // NEXT PACKET
  await deskAnswer(page, 'b');
  await deskNext(page);
  await deskAnswer(page, 'c');
  await deskNext(page);
  await deskAnswer(page, 'b');
  await waitType(page, 'proto_m14_integration_first_responses_completed', 1);
  await deskNext(page); // SHOW RESULTS
  await page.waitForTimeout(DESK_SETTLE_MS);
  await frame('m14-results');
}

/** M12 packet 1 landing (m12_check_route precedent: Vale's radius). */
async function openPacket1(page: Page) {
  const here = await playerAt(page);

  if (here === null || Math.abs(here.y - CONCOURSE.qcPacket.y) > 24) {
    await walkTo(page, 368, here?.y ?? 252);
    await walkTo(page, 368, CONCOURSE.qcPacket.y, { yFirst: true });
  }

  const landings = [
    { x: CONCOURSE.qcPacket.x, y: CONCOURSE.qcPacket.y },
    { x: CONCOURSE.qcPacket.x + 8, y: CONCOURSE.qcPacket.y - 10 },
    { x: CONCOURSE.qcPacket.x + 14, y: CONCOURSE.qcPacket.y - 16 },
    { x: CONCOURSE.qcPacket.x + 4, y: CONCOURSE.qcPacket.y - 20 },
  ];

  for (const landing of landings) {
    await walkTo(page, landing.x, landing.y, { tolerance: 6 });
    await page.waitForTimeout(200);

    const prompt = await page.evaluate(
      () =>
        (
          window as unknown as {
            __worldPromptProbe?: { text: string | null } | null;
          }
        ).__worldPromptProbe?.text ?? null,
    );

    if (prompt?.toLowerCase().includes('quality packet')) {
      await press(page, 'Space');
      await waitSurface(page, true, 'm12_qc_packet_o1');

      return;
    }
  }

  throw new Error('packet 1: no landing put the quality packet nearest');
}

/**
 * One quality packet: each field checked (pointer and keyboard by turn)
 * and judged; the faulty field's reference typed on the keypad; then
 * released. `judge` limits which fields are judged (by index): an
 * unjudged field is checked and left before release.
 */
async function workPacket(
  page: Page,
  occasion: 'o1' | 'o2',
  judge: readonly number[],
) {
  const opened = (await events(page)).filter(
    (event) => event.event_type === 'proto_m12_check_opportunity_opened',
  );
  const snapshot = opened[opened.length - 1]?.metadata
    ?.entry_state_snapshot as { form: 'form_a' | 'form_b' };
  const product = M12_PRODUCTS[occasion];
  const faultIndex = product.fault[snapshot.form].index;

  await frame(`m12-${occasion}-first-view`);

  let judged = await countType(page, 'proto_m12_check_field_judged');
  let checked = await countType(page, 'proto_m12_check_field_checked');

  for (const [index, field] of product.fields.entries()) {
    if (index % 2 === 0) {
      await clickElement(page, `check_${field.id}`);
    } else {
      await page.keyboard.press(`${index + 1}`);
    }

    checked += 1;
    await waitType(page, 'proto_m12_check_field_checked', checked);
    await page.waitForTimeout(450);

    if (!judge.includes(index)) {
      continue;
    }

    const faulty = index === faultIndex;

    if (faulty) {
      await clickElement(page, 'judge_differs');
    } else {
      await clickElement(page, 'judge_matches');
    }

    judged += 1;
    await waitType(page, 'proto_m12_check_field_judged', judged);

    if (faulty) {
      await page.waitForTimeout(300);

      for (const digit of field.reference) {
        await page.keyboard.press(digit);
        await page.waitForTimeout(150);
      }

      await page.waitForTimeout(250);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
    }
  }

  await frame(`m12-${occasion}-before-release`);
  await page.keyboard.press('r'); // release
  await waitType(page, 'proto_m12_check_released', occasion === 'o1' ? 1 : 2);
  await page.waitForTimeout(300);
  await frame(`m12-${occasion}-released`);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** M12 packet 1: all three fields checked and judged; released. */
export async function qualityPacket1(page: Page) {
  await openPacket1(page);
  await waitType(page, 'proto_m12_check_opportunity_opened', 1);
  await workPacket(page, 'o1', [0, 1, 2]);
}

/** Reads the gauge once (a swallowed press retried, a landed one never repeated). */
export async function readGaugeOnce(page: Page) {
  const reads = async () =>
    (await events(page)).filter(
      (event) =>
        event.event_type === 'pilot_station_opened' &&
        event.metadata?.station_id === 'monitor_gauge',
    ).length;
  const before = await reads();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await concourseVia(page, CONCOURSE.gauge.x, CONCOURSE.laneY);
    await driveAxisTo(page, 'y', CONCOURSE.laneY, 4);
    await driveAxisTo(page, 'x', CONCOURSE.gauge.x, 8);
    await interactAt(page, CONCOURSE.gauge, { approachOffset: { x: 0, y: 0 } });
    await page.waitForTimeout(500);

    if ((await reads()) > before) {
      return;
    }
  }

  throw new Error('the gauge read did not land');
}

/** Vale's prompt from the lane side of her desk. */
export async function openVale(page: Page) {
  await concourseVia(page, PILOT.concourse.vale.x, CONCOURSE.laneY);
  await driveAxisTo(page, 'y', CONCOURSE.laneY, 4);
  await walkTo(page, PILOT.concourse.vale.x, CONCOURSE.laneY);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 56 },
  });
}

/** Episode 1, engaged (S1). */
export async function episode1Engaged(page: Page) {
  await frame('room-dock-entry');
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await frame('room-concourse-entry');
  await valeChainAccept(page);
  await lampJob(page);
  await planBoardBatch1(page);
  await incidentDesk(page);
  await qualityPacket1(page);
  await readGaugeOnce(page); // M09 check 1
  await frame('m09-gauge-check-1');
  await openVale(page);
  await frame('npc-vale-handover');
  await selectPromptLabel(page, 'Handover confirmed — what is next?');
  await expectStage(page, 'workshop');
}

/* ================================================================== *
 * EPISODE 2 — Records Workshop (restoration shift)
 * ================================================================== */

const WORKSHOP = {
  laneY: 252,
  console: registryApproach('workshop.dispatch_console'),
  packet2: registryApproach('workshop.qc_packet_o2'),
  latticeLane: { x: 1193, y: 250 },
  latticeApproach: { x: 0, y: -50 },
  cutterStand: registryApproach('workshop.sample_cutter'),
} as const;

/** The Work Order Board's first card ("Take the orders." / the sign-off). */
export async function boardFirstCard(page: Page, stage: string) {
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });
  await frame(`board-to-${stage}`);
  await selectPromptOption(page, 1);
  await expectStage(page, stage);
  await walkTo(page, 1256, WORKSHOP.laneY, { yFirst: true });
}

const M02_TRAY = (n: number) => `m02c_tray_${n}`;

async function m02Requested(page: Page, index: number): Promise<string> {
  const presented = (await events(page))
    .filter(
      (event) => event.event_type === 'proto_m02_workspace_request_presented',
    )
    .map((event) => event.metadata ?? {})
    .filter((metadata) => metadata.request_index === index);

  return String(presented[0]?.requested_case);
}

async function m02Answered(page: Page, wanted: number) {
  await waitType(page, 'proto_m02_workspace_request_answered', wanted);
  await page.waitForTimeout(300);
}

/**
 * M02 (Unit 13): organise two cases (pointer drag, keyboard carry) and two
 * labels; hand over; six requests — 1 a wrong case (pointer), 2 the case
 * (keyboard), 3 Cannot locate (keyboard), 4 the case (pointer), 5 Cannot
 * locate (pointer), 6 the case (pointer). 3 / 6.
 */
export async function caseWorkspace(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await workshopVia(page, 188, 214);
    await interactAt(page, PILOT.workshop.filingDesk, {
      approachOffset: { x: 4, y: 44 },
    });

    if (
      await waitOverlay(page, true).then(
        () => true,
        () => false,
      )
    ) {
      break;
    }
  }

  let probe = (await overlay(page))!;

  expect(probe.mode).toBe('m02case');
  await frame('m02-organise-first-view');
  await dragSlot(
    page,
    slotHolding(probe, 'm02c_case_s14'),
    slotOf(probe, M02_TRAY(1), 0),
  );
  probe = (await overlay(page))!;

  const r07 = slotHolding(probe, 'm02c_case_r07');

  await clickSlot(page, r07);
  await focusOverlaySlot(page, r07.container_id, r07.slot_index);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await focusOverlaySlot(page, M02_TRAY(2), 0);
  await page.keyboard.press('Space');
  await waitType(page, 'proto_m02_workspace_case_moved', 2);
  await clickOverlayButton(page, 'm02c_label_1');
  await page.keyboard.press('l');
  await waitType(page, 'proto_m02_workspace_tray_labelled', 2);
  await page.keyboard.press('c'); // hand over
  await waitType(page, 'proto_m02_workspace_request_presented', 1);
  await page.waitForTimeout(600);
  await frame('m02-request-1');

  // 1: a wrong case by pointer.
  probe = (await overlay(page))!;

  const first = await m02Requested(page, 0);

  await clickSlot(
    page,
    probe.slots.find(
      (slot) => slot.definition_id !== null && slot.definition_id !== first,
    )!,
  );
  await clickOverlayButton(page, 'confirm_yes');
  await m02Answered(page, 1);

  // 2: the case by keyboard.
  const second = slotHolding(probe, await m02Requested(page, 1));

  await page.waitForTimeout(500);
  await focusOverlaySlot(page, second.container_id, second.slot_index);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await m02Answered(page, 2);

  // 3: Cannot locate by keyboard.
  await page.waitForTimeout(500);
  await page.keyboard.press('n');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await m02Answered(page, 3);

  // 4: the case by pointer.
  await page.waitForTimeout(500);
  await clickSlot(page, slotHolding(probe, await m02Requested(page, 3)));
  await clickOverlayButton(page, 'confirm_yes');
  await m02Answered(page, 4);

  // 5: Cannot locate by pointer.
  await page.waitForTimeout(500);
  await clickOverlayButton(page, 'm02c_cannot_locate');
  await clickOverlayButton(page, 'confirm_yes');
  await m02Answered(page, 5);

  // 6: the case by pointer; the series ends, the record shows.
  await page.waitForTimeout(500);
  await clickSlot(page, slotHolding(probe, await m02Requested(page, 5)));
  await clickOverlayButton(page, 'confirm_yes');
  await m02Answered(page, 6);
  await waitType(page, 'proto_m02_workspace_window_closed', 1);
  await page.waitForTimeout(400);
  await frame('m02-request-record');
  await press(page, 'Escape');
  await waitOverlay(page, false);
}

/**
 * M06 (Unit 7): practice by pointer, Begin by keyboard; order 1 correct;
 * order 2 wrong then corrected; order 3 skipped; order 4 by the digit
 * keys; explicit stop. 3 distinct correct orders.
 */
export async function dispatchConsole(page: Page) {
  await openSurfaceAtApproach(
    page,
    WORKSHOP.console,
    'm06_dispatch_console',
    (x, y) => workshopVia(page, x, y),
  );

  const compose = async (tokens: readonly string[]) => {
    for (const token of tokens) {
      await clickElement(page, `token_${token}`);
    }
  };
  const order = async (): Promise<string[]> => {
    const match = /·\s+(.+)$/.exec(await elementLabel(page, 'order'));

    if (match === null) {
      throw new Error('no M06 order readout');
    }

    return match[1].trim().split(/\s+/);
  };

  await frame('m06-practice-first-view');
  await compose(['OPEN', 'VALVE-C', 'AUTO']);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_practice_dispatched', 1);
  await compose(['HOLD', 'BUS-1', 'LOW']);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_ready_shown', 1);
  await page.waitForTimeout(450);
  await page.keyboard.press('b');
  await waitType(page, 'proto_m06_orders_order_presented', 1);
  await page.waitForTimeout(300);
  await frame('m06-work-period');
  await compose(await order());
  await page.keyboard.press('d');
  await waitType(page, 'proto_m06_orders_order_dispatched', 1);
  await page.waitForTimeout(300);

  const second = await order();
  const wrong = ['LOW', 'HIGH', 'AUTO', 'OFF'].find(
    (value) => value !== second[2],
  )!;

  await compose([second[0], second[1], wrong]);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_order_dispatched', 2);
  await page.waitForTimeout(300);
  await compose(second);
  await clickElement(page, 'dispatch');
  await waitType(page, 'proto_m06_orders_order_dispatched', 3);
  await page.waitForTimeout(500);
  await page.keyboard.press('k'); // skip order 3
  await waitType(page, 'proto_m06_orders_order_skipped', 1);
  await page.waitForTimeout(300);

  const rows: readonly (readonly string[])[] = [
    ['SET', 'OPEN', 'HOLD', 'ROUTE'],
    ['PUMP-2', 'VALVE-C', 'BUS-1', 'RELAY-N'],
    ['LOW', 'HIGH', 'AUTO', 'OFF'],
  ];

  for (const [row, token] of (await order()).entries()) {
    await page.keyboard.press(`${rows[row].indexOf(token) + 1}`);
    await page.waitForTimeout(150);
  }

  await page.keyboard.press('d');
  await waitType(page, 'proto_m06_orders_order_dispatched', 4);
  await page.waitForTimeout(500);
  // Explicit stop: the first press arms, the second confirms.
  await page.keyboard.press('q');
  await page.waitForTimeout(450);
  await page.keyboard.press('q');
  await waitType(page, 'proto_m06_orders_window_closed', 1);
  await page.waitForTimeout(300);
  await frame('m06-closed');
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** M12 packet 2: two of three fields judged (the third checked only); released. */
export async function qualityPacket2(page: Page) {
  await openSurfaceAtApproach(
    page,
    WORKSHOP.packet2,
    'm12_qc_packet_o2',
    (x, y) => workshopVia(page, x, y),
  );
  await waitType(page, 'proto_m12_check_opportunity_opened', 2);
  await workPacket(page, 'o2', [0, 1]);
}

/**
 * M13 (Unit 16, the R1 answers): network 1 sealed, network 2 open (an
 * unsealed layout), network 3 CANNOT SOLVE; results; FINISH. 1 / 3.
 */
export async function latticeBench(page: Page) {
  await workshopVia(page, WORKSHOP.latticeLane.x, WORKSHOP.latticeLane.y);
  await interactAt(page, PILOT.workshop.latticeBench, {
    approachOffset: WORKSHOP.latticeApproach,
  });
  await waitPipeOpen(page, true);

  const form = (await pipeProbe(page)).form as 'A' | 'B';

  await frame('m13-network-1-first-view');
  await completeLatticeByKeyboard(page, form, [
    'sealed',
    'open',
    'cannot_solve',
  ]);
  await frame('m13-acknowledgement-3');
  await latticeNext(page);
  await waitPipeView(page, 'results');
  await frame('m13-results');
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  await press(page, 'Escape');
  await waitPipeOpen(page, false);
}

/**
 * M03 occasion A (Unit 14): the roll loaded by keyboard, three cycles,
 * ONE tool to its rack by pointer; the panel closed (the first departure).
 */
export async function pressA(page: Page) {
  const at = PILOT.workshop.pressA;
  const c = M03_SPEC.a.containers;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await workshopVia(page, at.x, at.y + 44);
    await interactAt(page, at, { approachOffset: { x: 0, y: 44 } });

    if (
      await waitOverlay(page, true).then(
        () => true,
        () => false,
      )
    ) {
      break;
    }
  }

  expect((await overlay(page))?.mode).toBe('m03tools');
  await frame('m03-press-a-first-view');
  await press(page, 'Space');
  await page.waitForTimeout(250);
  await press(page, 'ArrowRight');
  await page.waitForTimeout(250);
  await press(page, 'Space');
  await page.waitForTimeout(300);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await press(page, 'c');
    await page.waitForTimeout(450);
  }

  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __inventoryUiProbe?: { m03t?: { phase: string } | null } | null;
        }
      ).__inventoryUiProbe?.m03t?.phase === 'tools_out',
    undefined,
    { timeout: 8_000 },
  );

  const probe = (await overlay(page))!;
  const tool = probe.slots.find(
    (slot) => slot.container_id === c.bench && slot.definition_id !== null,
  )!;
  const rack = probe.slots.find(
    (slot) => slot.container_id === c.rack && slot.definition_id === null,
  )!;

  await dragSlot(page, tool, rack);
  await waitType(page, 'proto_m03tools_tool_moved', 1);
  await frame('m03-press-a-one-tool-racked');
  await page.waitForTimeout(2_200);
  await press(page, 'Escape');
  await waitOverlay(page, false);
}

const CUTTER_APPROACH = {
  x: WORKSHOP.cutterStand.x - WORKSHOP_SITES.sampleCutter.x,
  y: WORKSHOP.cutterStand.y - WORKSHOP_SITES.sampleCutter.y,
};

function piecePlace(objectId: string) {
  const piece = M04_PIECES.find((entry) => entry.object_id === objectId)!;

  return {
    x: WORKSHOP_SITES.cutterScatter.x + piece.dx,
    y: WORKSHOP_SITES.cutterScatter.y + piece.dy,
  };
}

async function besidePiece(page: Page, objectId: string) {
  const stand = annexPieceStand(piecePlace(objectId));

  await workshopVia(page, stand.x, stand.y);
  await page.waitForTimeout(250);
}

async function toBin(page: Page) {
  const from = await playerAt(page);
  const west = from === null || from.x < ANNEX_DRIVER.doorX;
  const pocket = west ? ANNEX_DRIVER.binWest : ANNEX_DRIVER.binEast;

  await workshopVia(
    page,
    west ? ANNEX_DRIVER.westX : ANNEX_DRIVER.eastX,
    pocket.y,
  );
  await driveAxisTo(page, 'x', pocket.x, 6);
  await page.waitForTimeout(250);
}

async function disposeByPointer(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickPhysicalContainer(page, 'm04_disposal');

    if (((await physicalProbe(page))?.carried ?? null) === null) {
      return;
    }

    await page.waitForTimeout(400);
  }

  throw new Error('the bin did not take the carried piece');
}

async function cutCoupon(page: Page) {
  await workshopVia(page, WORKSHOP.cutterStand.x, WORKSHOP.cutterStand.y);
  await interactAt(page, PILOT.workshop.sampleCutter, {
    approachOffset: CUTTER_APPROACH,
  });
  await page.waitForTimeout(1_600);
}

/**
 * M04 job 1 and M07 (the m03_m04_route sequence): coupon 1 cut; the offcut
 * to the bin by pointer; the swarf lifted (keyboard) and still carried when
 * the calibration bench's first stage is carried out — job 1's first
 * departure (2 undisposed); the bench advanced to 2 / 6 and left; then the
 * carried swarf and the wrap go to the bin (late disposals).
 */
export async function couponOneAndBench(page: Page) {
  await cutCoupon(page);
  await frame('m04-job-1-pieces');
  await besidePiece(page, 'm04_offcut_a');
  await clickPhysicalObject(page, 'm04_offcut_a');
  await toBin(page);
  await disposeByPointer(page);
  await besidePiece(page, 'm04_swarf_a');
  await press(page, 'Space');
  await page.waitForTimeout(500);
  await Promise.all([
    calibrationReturn(page, 2),
    frameWhenOpen(page, 'm07_calibration_bench', 'm07-bench-episode-2'),
  ]);
  await waitType(page, 'proto_m04_cutting_first_departure', 1);
  await toBin(page);
  await disposeByPointer(page);
  await besidePiece(page, 'm04_wrap_a');
  await clickPhysicalObject(page, 'm04_wrap_a');
  await toBin(page);
  await disposeByPointer(page);
}

/**
 * M04 job 2: coupon 2 cut; the offcut lifted and dropped in the bin by
 * keyboard; the wrap lifted and carried out of the annex. Job 2's first
 * departure follows at the next station or the room exit (2 undisposed).
 */
export async function couponTwo(page: Page) {
  await cutCoupon(page);
  await frame('m04-job-2-pieces');
  await besidePiece(page, 'm04_offcut_b');
  await press(page, 'Space');
  await page.waitForTimeout(400);
  await toBin(page);
  await press(page, 'Space');
  await page.waitForTimeout(400);
  await besidePiece(page, 'm04_wrap_b');
  await press(page, 'Space');
  await page.waitForTimeout(400);
  await workshopVia(page, 1256, WORKSHOP.laneY);
}

/** Episode 2, engaged (S1); ends in the Concourse at `lab_briefing`. */
export async function episode2Engaged(page: Page) {
  await concourseToWorkshop(page);
  await frame('room-workshop-entry');
  await boardFirstCard(page, 'workshop_work'); // Take the orders.
  await caseWorkspace(page);
  await dispatchConsole(page);
  await qualityPacket2(page);
  await latticeBench(page);
  await pressA(page);
  await couponOneAndBench(page);
  await couponTwo(page);
  await boardFirstCard(page, 'lab_briefing'); // sign-off
  await workshopToConcourse(page);
}

/* ================================================================== *
 * EPISODE 3 — Diagnostics Laboratory (the signal incident)
 * ================================================================== */

const LAB_SETTLE_MS = 400;

/** Concourse north door → the laboratory (along the lane first). */
export async function concourseToLab(page: Page) {
  await driveAxisTo(page, 'y', CONCOURSE.laneY, 6);
  await driveAxisTo(page, 'x', PILOT.concourse.northDoor.x, 8);
  await concourseVia(
    page,
    PILOT.concourse.northDoor.x,
    PILOT.concourse.northDoor.y + 56,
  );
  await useDoor(page, PILOT.concourse.northDoor, 'diagnostics_laboratory', {
    approachOffset: { x: 0, y: 20 },
    yFirst: false,
  });
}

export async function openKai(page: Page) {
  await openPromptAt(page, PILOT.lab.kai, {
    approachOffset: await labApproach(page, PILOT.lab.kai),
  });
}

/** Opens a laboratory station whose DEV probe reports `open` (retried). */
async function openLabStation(
  page: Page,
  at: { x: number; y: number },
  check: () => Promise<boolean>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, {
      approachOffset: await labApproach(page, at),
    });

    const until = Date.now() + 4_000;

    while (Date.now() < until) {
      if (await check()) {
        await page.waitForTimeout(350);

        return;
      }

      await page.waitForTimeout(150);
    }
  }

  throw new Error(`lab station at ${at.x},${at.y} did not open`);
}

const terminalOpen = (page: Page) => async () =>
  (await page.evaluate(
    () =>
      (window as unknown as { __ipTerminalProbe?: { open: boolean } | null })
        .__ipTerminalProbe?.open === true,
  )) === true;

const surfaceOpen = (page: Page, id: string) => async () => {
  const probe = await surface(page);

  return probe?.open === true && probe.surface_id === id;
};

/** The console orientation (control): drag, click-composition, typed. */
export async function labOrientation(page: Page) {
  await openLabStation(page, PILOT.lab.orientation, terminalOpen(page));
  await frame('lab-orientation-first-view');
  await dragChipToBin(page, 'T1', 'ARCHIVE');
  await composeByClick(page, ['ROUTE', 'T2', 'RELAY']);
  await typeCommand(page, 'ROUTE T3 ARCHIVE');
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(400);
  await press(page, 'Escape');
  await waitTerminalOpen(page, false);
}

async function labKey(page: Page, key: string, settle = LAB_SETTLE_MS + 50) {
  await page.waitForTimeout(settle);
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

/** R / N opens the confirmation; a settled ENTER records. */
async function labRecord(page: Page, key: 'r' | 'n') {
  await page.keyboard.press(key);
  await page.waitForTimeout(LAB_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

async function labNext(page: Page) {
  await page.waitForTimeout(LAB_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/**
 * M15 (Unit 18, the R1 script): box 1 — TEST F twice, TEST G, wiring B,
 * Q1 C (correct), Q2 A (wrong); box 2 — TEST S, CANNOT TELL, Q1 CANNOT
 * SOLVE, Q2 C (correct). 2 / 4. Results, FINISH.
 */
export async function evidenceTable(page: Page) {
  await openLabStation(
    page,
    PILOT.lab.evidenceTable,
    surfaceOpen(page, 'm15_evidence_table'),
  );
  await frame('m15-orientation');
  await labNext(page); // START
  await labKey(page, '1');
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  await page.keyboard.press('b');
  await page.waitForTimeout(150);
  await frame('m15-box-1-tests-wiring-draft');
  await labRecord(page, 'r');
  await frame('m15-acknowledgement');
  await labNext(page); // FIRST QUESTION
  await labKey(page, 'c', LAB_SETTLE_MS);
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'r');
  await labNext(page);
  await labKey(page, 'a', LAB_SETTLE_MS);
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'r');
  await labNext(page); // NEXT BOX
  await labKey(page, '1');
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'n'); // CANNOT TELL (wiring)
  await labNext(page);
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'n'); // CANNOT SOLVE (S2-Q1)
  await labNext(page);
  await labKey(page, 'c', LAB_SETTLE_MS);
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'r');
  await waitType(page, 'proto_m15_systems_first_response', 4);
  await labNext(page); // SHOW RESULTS
  await page.waitForTimeout(LAB_SETTLE_MS);
  await frame('m15-results');
  await page.keyboard.press('Enter'); // NEXT BOX
  await page.waitForTimeout(LAB_SETTLE_MS + 100);
  await page.keyboard.press('Enter'); // FINISH
  await waitSurface(page, false);
}

/**
 * M16 (Unit 19, the R1 answers): the card, both examples, START; vials —
 * 1 (key), 4 (wrong), DON'T KNOW, 1 (key), 2 (wrong), 2 (key). 3 / 6.
 */
export async function protocolConsole(page: Page) {
  await openLabStation(
    page,
    PILOT.lab.protocolConsole,
    surfaceOpen(page, 'm16_protocol_console'),
  );

  const focus = async (id: string) => {
    for (let step = 0; step < 16; step += 1) {
      if ((await surface(page))?.focus === id) {
        return;
      }

      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
    }

    throw new Error(`M16 focus never reached ${id}`);
  };
  const activate = async (id: string) => {
    await page.waitForTimeout(LAB_SETTLE_MS + 50);
    await focus(id);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  };

  await frame('m16-card');
  await labNext(page); // SHOW EXAMPLE 1
  await frame('m16-example-1');
  await activate('next_example');
  await activate('start_vials');
  await page.waitForTimeout(LAB_SETTLE_MS + 120);
  await page.keyboard.press('Enter'); // confirm: vial 1

  for (const [index, drawer] of [1, 4, 0, 1, 2, 2].entries()) {
    await page.waitForTimeout(LAB_SETTLE_MS + 50);

    if (drawer === 0) {
      await labRecord(page, 'n');
    } else {
      await page.keyboard.press(String(drawer));
      await page.waitForTimeout(LAB_SETTLE_MS + 120);
      await labRecord(page, 'r');
    }

    await waitType(page, 'proto_m16_handling_first_response', index + 1);

    if (index === 0) {
      await frame('m16-acknowledgement');
    }

    if (index < 5) {
      await labNext(page);
    }
  }

  await labNext(page); // SHOW RESULTS
  await page.waitForTimeout(LAB_SETTLE_MS);
  await frame('m16-results');
  await page.keyboard.press('f');
  await page.waitForTimeout(400);

  if ((await surface(page))?.open === true) {
    await press(page, 'Escape');
  }

  await waitSurface(page, false);
}

/**
 * M17 on the route: the training rig — READY; baseline 1 the reference,
 * baseline 2 wrong; learning F T T T F T F T T F T T (the first run of
 * three ends at trial 4); transfer 1 the reference, transfer 2 wrong.
 */
export const M17_LEARNING_PLAN = [
  false,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  true,
] as const;

export async function trainingRig(page: Page) {
  await openLabStation(page, PILOT.lab.trainingRig, terminalOpen(page));

  const form = String((await ipModule(page, 'm17')).form) as 'A' | 'B';
  const trials = M17_FORMS[form].trials;
  const reference = async (index: number) => {
    for (const line of trials[index].reference) {
      await typeCommand(page, line);
    }

    await waitBufferLength(page, 2);
  };
  const wrong = async () => {
    await typeCommand(page, 'KAI A');
    await typeCommand(page, 'KAI B');
    await waitBufferLength(page, 2);
  };

  await frame('m17-rig-first-view');
  await clickTerminalButton(page, 'READY');
  await reference(0);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);
  await composeByClick(page, ['KAI', 'A']);
  await composeByClick(page, ['KAI', 'B']);
  await waitBufferLength(page, 2);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);

  for (const [index, correct] of M17_LEARNING_PLAN.entries()) {
    if (correct) {
      await reference(2 + index);
    } else {
      await wrong();
    }

    await clickTerminalButton(page, 'submit');
    await page.waitForTimeout(300);

    if (index === 0) {
      await frame('m17-learning-feedback');
    }

    await clickTerminalButton(page, 'NEXT');
    await page.waitForTimeout(200);
  }

  await reference(14);
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(300);
  await wrong();
  await clickTerminalButton(page, 'submit');
  await page.waitForTimeout(500);
  await press(page, 'Escape');
  await waitTerminalOpen(page, false);
}

/**
 * M18 (Unit 20, the R1 acts): case 1 — TEST A, TEST B, part 3, step 2
 * (correct); case 2 — TEST B, TEST C, CANNOT SOLVE, step 2; case 3 — no
 * test, part 4, step CANNOT SOLVE. 1 / 3. Results, FINISH.
 */
export async function diagnosticBoard(page: Page) {
  await openLabStation(
    page,
    PILOT.lab.diagnosticBoard,
    surfaceOpen(page, 'm18_diagnostic_board'),
  );

  const tab = async (id: string) => {
    await page.waitForTimeout(LAB_SETTLE_MS + 50);

    for (let step = 0; step < 20; step += 1) {
      if ((await surface(page))?.focus === id) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        return;
      }

      await page.keyboard.press('Tab');
      await page.waitForTimeout(60);
    }

    throw new Error(`M18 focus never reached ${id}`);
  };
  const draftRecord = async (key: string) => {
    await page.waitForTimeout(LAB_SETTLE_MS + 50);
    await page.keyboard.press(key);
    await page.waitForTimeout(LAB_SETTLE_MS + 120);
    await labRecord(page, 'r');
  };

  await frame('m18-card');
  await tab('start_case');
  await frame('m18-case-1');
  await labKey(page, 'a');
  await labKey(page, 'b');
  await draftRecord('3');
  await draftRecord('2');
  await tab('next');
  await labKey(page, 'b');
  await labKey(page, 'c');
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'n');
  await draftRecord('2');
  await tab('next');
  await draftRecord('4');
  await page.waitForTimeout(LAB_SETTLE_MS);
  await labRecord(page, 'n');
  await waitType(page, 'proto_m18_cases_case_completed', 3, 10_000).catch(
    () => undefined,
  );
  await tab('next'); // SHOW RESULTS
  await page.waitForTimeout(LAB_SETTLE_MS);
  await frame('m18-results');
  await page.keyboard.press('f');
  await page.waitForTimeout(400);

  if ((await surface(page))?.open === true) {
    await press(page, 'Escape');
  }

  await waitSurface(page, false);
}

/** Kai's deliveries menu (always his LAST card), settled. */
async function kaiDeliveries(page: Page, action: string) {
  await openKai(page);

  const labels = await promptLabels(page);

  expect(labels[labels.length - 1]).toBe(M10_MENU_ENTRY_LABEL);
  await selectPromptLabel(page, M10_MENU_ENTRY_LABEL);
  await waitPromptLabel(page, action);
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, action);
  await page.waitForTimeout(400);
}

/** Episode 3, engaged (S1); begins in the Concourse at `lab_briefing`. */
export async function episode3Engaged(page: Page) {
  await readGaugeOnce(page); // M09 check 2 (the lab pass)
  await concourseToLab(page);
  await frame('room-laboratory-entry');
  await openKai(page);
  await frame('npc-kai-briefing');
  await selectPromptLabel(page, 'Understood — and I will take the probe.');
  await expectStage(page, 'lab_work');
  await labOrientation(page);
  await evidenceTable(page);
  await protocolConsole(page);
  await trainingRig(page);
  await diagnosticBoard(page);
  // M10 d1: the key card handed to Kai directly; M11: the probe back.
  await kaiDeliveries(page, M10_HANDOVER_LABELS.d1);
  await openKai(page);
  await selectPromptLabel(page, 'Hand the field probe back to Kai.');
  await page.waitForTimeout(400);
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
}

/* ================================================================== *
 * EPISODE 4 — Recovery Yard (the exterior shift)
 * ================================================================== */

async function openYardSurface(
  page: Page,
  site: keyof typeof APPROACH,
  id: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureOutsideCompound(page);
    await yardVia(
      page,
      YARD[site].x + APPROACH[site].x,
      YARD[site].y + APPROACH[site].y,
    );
    await interactAt(page, YARD[site], { approachOffset: APPROACH[site] });

    if (
      await waitSurface(page, true, id).then(
        () => true,
        () => false,
      )
    ) {
      await page.waitForTimeout(LAB_SETTLE_MS + 50);

      return;
    }
  }

  throw new Error(`yard surface ${id} did not open`);
}

export async function openNoor(page: Page) {
  await ensureOutsideCompound(page);
  await openPromptAt(page, YARD.noor, { approachOffset: APPROACH.noor });
}

/** M05 o2: the flag job's start control, at once (the 2 s work completes it). */
export async function flagJob(page: Page) {
  await openYardSurface(page, 'flag', 'm05_flag_job');
  await frame('m05-flag-first-view');
  await clickElement(page, 'start');
  await waitType(page, 'proto_m05_start_started', 2);
  await waitType(page, 'proto_m05_start_work_completed', 2);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** M08 (Unit 2-R): practice; six slots — Work on 1, 3, 5, Rest on 2, 4, 6. */
export async function supportConsole(page: Page) {
  await openYardSurface(page, 'console', 'm08_support_console');

  const waitElement = async (id: string, timeout: number) =>
    page.waitForFunction(
      (wanted) =>
        (
          window as unknown as {
            __workSurfaceProbe?: { elements: { id: string }[] } | null;
          }
        ).__workSurfaceProbe?.elements.some((e) => e.id === wanted) === true,
      id,
      { timeout },
    );
  const sort = async () => {
    const reading = Number(
      (await elementLabel(page, 'reading')).replace(/\D+/g, ''),
    );

    await clickElement(page, reading >= 50 ? 'bin_a' : 'bin_b');
  };

  await frame('m08-practice-first-view');

  for (let i = 0; i < 4; i += 1) {
    await sort();
    await page.waitForTimeout(150);
  }

  await waitElement('continue', 5_000);
  await clickElement(page, 'continue');

  for (let slot = 1; slot <= 6; slot += 1) {
    await waitElement('choose_work', 8_000);

    if (slot === 1) {
      await frame('m08-choice');
    }

    const work = slot % 2 === 1;

    await clickElement(page, work ? 'choose_work' : 'choose_rest');

    if (work) {
      const until = Date.now() + 16_000;

      while (Date.now() < until) {
        if ((await elementLabel(page, 'reading')) === '') {
          break;
        }

        await sort();
        await page.waitForTimeout(400);
      }
    }

    if (slot < 6) {
      await waitElement('continue', 30_000);
      await clickElement(page, 'continue');
    }
  }

  await waitType(page, 'proto_m08_effort_window_closed', 1, 30_000);
  await page.waitForTimeout(300);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/**
 * M19 (Unit 21, the R1 acts): the check right first; line 1 — H3, H2, H1
 * TRY (the boundary), then FEED, H2 off, TRY (a further attempt, restored);
 * NEXT LINE; line 2 at its obstacle (the boundary), SET ASIDE. 1 / 2.
 */
export async function couplingPanel(page: Page) {
  await openYardSurface(page, 'coupling', 'm19_coupling_panel');

  const hotkey = (key: string) => labKey(page, key);
  const activate = async (id: string) => {
    await page.waitForTimeout(LAB_SETTLE_MS + 50);

    for (let step = 0; step < 20; step += 1) {
      if ((await surface(page))?.focus === id) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        return;
      }

      await page.keyboard.press('Tab');
      await page.waitForTimeout(60);
    }

    throw new Error(`M19 focus never reached ${id}`);
  };

  await frame('m19-card');
  await activate('continue');
  await hotkey('2');
  await hotkey('r');
  await frame('m19-check-recorded');
  await activate('start');

  for (const key of ['3', 't', '2', 't', '1', 't', '4', '2', 't']) {
    await hotkey(key);
  }

  await activate('next');

  for (const key of ['2', '2', '2', 't', '2', 't']) {
    await hotkey(key);
  }

  await hotkey('n');
  await page.waitForTimeout(LAB_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await frame('m19-both-lines-finished');
  await activate('finish');
  await waitSurface(page, false);
}

/**
 * The named U23 item of V-6 (U23 acceptance 4a; D-U24-1 VIS-2): Plot A's
 * west ring (the X4 stance, 848 / 348), short steps west until the foreign
 * Mast 04 prompt shows over the scanner plate; one frame whose sidecar
 * carries the prompt's live bounds (the B-12-corrected probe, refused while
 * the yard is paused) and the field readout's bounds. Positioning only:
 * no press is sent to the mast.
 */
export async function mastPromptItem(page: Page) {
  if (activeFrames === null) {
    return;
  }

  await yardVia(page, 848, 348);
  await page.waitForTimeout(300);

  for (let nudge = 0; nudge < 4; nudge += 1) {
    if (((await worldPrompt(page)).text ?? '').includes('Mast 04')) {
      break;
    }

    await hold(page, 'ArrowLeft', 30);
    await page.waitForTimeout(250);
  }

  const field = await m23Field(page);

  await frame('u23-mast-prompt-plot-a-west-ring', {
    named_item: 'U23 acceptance 4a — mast prompt box over the scanner plate',
    world_prompt_live: await worldPrompt(page),
    yard_prompt_bounds_live: await yardPromptBounds(page),
    field_hud: field,
  });
}

/**
 * M23 (Unit 23, the B-smoke and S2 acts): plot A opened, a scan, the
 * first failed dig, CONTINUE, a further scan (the continuation), the
 * selector STOP confirmed; plot B stopped before any opening. 1 / 1.
 */
export async function excavationPlots(page: Page) {
  await startPlot(page, 'plot_a', 'keyboard');
  await frame('m23-plot-a-opened');
  await scanHere(page, 'keyboard');
  await failFirst(page, 'keyboard');
  await frame('m23-failure-choice');
  await chooseFailure(page, 'continue', 'keyboard');
  await scanHere(page, 'keyboard');
  await mastPromptItem(page);
  await m23OpenPanel(page, 'keyboard');
  await m23WaitView(page, 'selector');
  await requestStop(page, 'plot_a', 'keyboard');
  await confirmStop(page, 'plot_a', 'keyboard');
  await requestStop(page, 'plot_b', 'keyboard');
  await confirmStop(page, 'plot_b', 'keyboard');
  await stepAway(page, 'keyboard');
}

/**
 * M24 / M26 (Unit 12, the boundary-route acts): the rig — depletion, a
 * pre-knowledge cast, the check right first, two casts, the bench, Finish
 * (2); the uplink — the disconnect, a wrong answer, the explanation, the
 * recheck right, two retries on A, Post B, the cap (2).
 */
export async function rigAndUplink(page: Page) {
  await startSalvageTally(page);
  await depleteDeck(page);
  await standOnPad(page);
  await magnetCycle(page, true);
  await openSite(page, 'rig');
  await frame('m24-rig-check');
  await answerOpenCheck(page, 'M24', 'correct');
  await standOnPad(page);
  await magnetCycle(page, true);
  await magnetCycle(page, true);
  await useSortingBench(page);
  await finishAtRig(page);
  await powerUpUplink(page);
  await transmitAt(page, 'uplinkA');
  await waitDisconnect(page);
  await openSite(page, 'panel');
  await frame('m26-panel-check');
  await answerOpenCheck(page, 'M26', 'wrong');
  await frame('m26-explanation');
  await continueUplinkExplanation(page);
  await answerOpenCheck(page, 'M26', 'correct');
  await transmitAt(page, 'uplinkA');
  await transmitAt(page, 'uplinkA');
  await transmitAt(page, 'uplinkB');
  await waitContinuationClosed(page, 'm26', 45_000);
}

/** M25 loops: three required, "more sweeps", two optional, an explicit stop. */
export async function sensorPost(page: Page) {
  await openYardSurface(page, 'sensorPost', 'm25_field_sensor_post');
  await frame('m25-post-first-view');

  for (let loop = 1; loop <= 3; loop += 1) {
    await clickElement(page, 'run_loop');
    await waitType(page, 'proto_m25_loops_loop_completed', loop, 10_000);
  }

  await waitType(page, 'proto_m25_loops_required_complete', 1);
  await page.waitForTimeout(600);
  await page.keyboard.press('c');
  await waitType(page, 'proto_m25_loops_optional_entered', 1);
  await clickElement(page, 'run_loop');
  await waitType(page, 'proto_m25_loops_loop_completed', 4, 10_000);
  await page.keyboard.press('r');
  await waitType(page, 'proto_m25_loops_loop_completed', 5, 10_000);
  await clickElement(page, 'finished');
  await waitType(page, 'proto_m25_loops_window_closed', 1);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** Episode 4, engaged (S1); begins in the lab at `exterior_briefing`. */
export async function episode4Engaged(page: Page) {
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await frame('room-yard-entry');
  await openNoor(page);
  await frame('npc-noor-briefing');
  await selectPromptLabel(page, 'Ready — and I will take the driver.');
  await expectStage(page, 'exterior_work');
  await waitPromptLabel(page, 'Yes — I will take the flag job.');
  await page.waitForTimeout(450);
  await selectPromptLabel(page, 'Yes — I will take the flag job.');
  await page.waitForTimeout(400);
  await flagJob(page);
  await startAntenna(page); // M20's outdoor preparation (both stages)
  await supportConsole(page);
  await couplingPanel(page);
  await excavationPlots(page);
  await rigAndUplink(page);
  await sensorPost(page);
  await openNoor(page);
  await selectPromptLabel(page, 'Hand the torque driver back to Noor.');
  await page.waitForTimeout(400);
  await openNoor(page);
  await selectPromptLabel(page, 'I am finished outside.');
  await expectStage(page, 'return_hub');
  await page.waitForTimeout(400);
  await frame('npc-noor-logbook-offer');
  await answerLogbookOffer(page, 'accept'); // M10 d2
}

/* ================================================================== *
 * EPISODE 5 — Return, revision and handover
 * ================================================================== */

/** Yard → laboratory: the logbook left with Kai (M10 d2, delegated). */
export async function delegateLogbookToKai(page: Page) {
  await leaveYard(page);
  await openKai(page);
  await selectPromptLabel(page, M10_MENU_ENTRY_LABEL);
  await waitPromptLabel(page, M10_DELEGATE_LABELS.d2);
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, M10_DELEGATE_LABELS.d2);
  await waitPromptLabel(page, m10DelegateConfirmLabel('d2'));
  await page.waitForTimeout(SETTLE_PAUSE_MS);
  await selectPromptLabel(page, m10DelegateConfirmLabel('d2'));
  await page.waitForTimeout(400);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await expectStage(page, 'return_hub');
}

/** Vale's return check-in, then the M25 belief question (anchor 3). */
export async function valeReturnWithQuestion(page: Page) {
  await openVale(page);
  await frame('npc-vale-return');
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);
  await expectStage(page, 'workshop_return');
  await page.waitForTimeout(600);
  await frame('npc-vale-m25-question');
  await selectPromptOption(page, 3);
  await waitType(page, 'proto_m25_belief_question_answered', 1);
  await page.waitForTimeout(400);
}

const M20_TARGET: Record<'m20_ch_a' | 'm20_ch_b', number[][]> = {
  m20_ch_a: [
    [2, 4, 3],
    [3, 1, 4],
    [4, 2, 1, 3],
    [1, 3, 4, 2],
    [3, 4, 2, 1, 4],
    [2, 1, 3, 4, 2],
  ],
  m20_ch_b: [
    [4, 1, 3],
    [2, 3, 1],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 2, 3, 1, 3],
    [1, 4, 2, 3, 4],
  ],
};

interface M20ProbeLike {
  notice: { channel_id: string } | null;
  channels: Record<
    string,
    {
      cells: number[];
      released_at_ms: number | null;
      cue_ended_at_ms: number | null;
    }
  >;
}

async function m20Probe(page: Page): Promise<M20ProbeLike> {
  return page.evaluate(
    () =>
      (window as unknown as { __m20FeedProbe?: M20ProbeLike | null })
        .__m20FeedProbe!,
  );
}

/** Aligns `channel` step `step` from the cells it holds now (keys), then G. */
async function m20Align(
  page: Page,
  channel: 'm20_ch_a' | 'm20_ch_b',
  step: number,
) {
  const current = (await m20Probe(page)).channels[channel].cells;
  const target = M20_TARGET[channel][step - 1];

  await page.waitForTimeout(LAB_SETTLE_MS + 50);

  for (let cell = 0; cell < target.length; cell += 1) {
    const presses = (target[cell] - current[cell] + 4) % 4;

    for (let k = 0; k < presses; k += 1) {
      await page.keyboard.press(String(cell + 1));
      await page.waitForTimeout(120);
    }
  }

  await labKey(page, 'g');
}

async function m20Wait(
  page: Page,
  check: (probe: M20ProbeLike) => boolean,
  timeout: number,
) {
  const until = Date.now() + timeout;

  while (Date.now() < until) {
    if (check(await m20Probe(page))) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error('M20 wait timed out');
}

async function openFeed(page: Page) {
  await workshopApproach(page, 'feedConsole');
  await openWorkshopSurface(page, 'feedConsole', 'm20_feed_console');
  await page.waitForTimeout(LAB_SETTLE_MS + 50);
}

/**
 * M20 (Unit 22, the R1 shape): channel A two steps (the hold), START B,
 * two steps (the hold); away at Press B through both silent windows and
 * both notices; then CONTINUE A and one ALIGN (the cued credit); B is not
 * resumed. 1 / 2.
 */
/** TAB to a surface element after the view settled, then ENTER. */
async function tabActivate(page: Page, id: string) {
  await page.waitForTimeout(LAB_SETTLE_MS + 50);

  for (let step = 0; step < 20; step += 1) {
    if ((await surface(page))?.focus === id) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      return;
    }

    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
  }

  throw new Error(`focus never reached ${id}`);
}

export async function feedConsoleHolds(page: Page) {
  await openFeed(page);
  await frame('m20-card');
  // The card lands on a neutral element; CONTINUE is reached by TAB.
  await tabActivate(page, 'continue');
  await m20Align(page, 'm20_ch_a', 1);
  await m20Align(page, 'm20_ch_a', 2);
  await labKey(page, 'b'); // START B
  await m20Align(page, 'm20_ch_b', 1);
  await m20Align(page, 'm20_ch_b', 2);
  await page.waitForTimeout(LAB_SETTLE_MS + 50);
  await frame('m20-both-held');
  await press(page, 'Escape');
  await waitSurface(page, false);
}

export async function feedConsoleCuedReturn(page: Page) {
  await workshopApproach(page, 'pressB');
  await m20Wait(
    page,
    (probe) =>
      probe.channels.m20_ch_a.released_at_ms !== null &&
      probe.channels.m20_ch_b.released_at_ms !== null,
    90_000,
  );
  await m20Wait(
    page,
    (probe) => probe.notice?.channel_id === 'm20_ch_a',
    60_000,
  );
  await frame('m20-notice-channel-a');
  await m20Wait(
    page,
    (probe) => probe.channels.m20_ch_a.cue_ended_at_ms !== null,
    20_000,
  );
  await m20Wait(
    page,
    (probe) => probe.notice?.channel_id === 'm20_ch_b',
    60_000,
  );
  await m20Wait(
    page,
    (probe) => probe.channels.m20_ch_b.cue_ended_at_ms !== null,
    20_000,
  );
  await openFeed(page);
  await labKey(page, 'a'); // CONTINUE A
  await m20Align(page, 'm20_ch_a', 3);
  await waitType(page, 'proto_m20_feed_cued_resumption', 1, 5_000).catch(
    () => undefined,
  );
  await page.waitForTimeout(LAB_SETTLE_MS + 50);
  await press(page, 'Escape');
  await waitSurface(page, false);
}

/** M01 o2: the return batch from the board, worked directly (planned 0). */
export async function returnBatch(page: Page) {
  await workshopVia(page, 1312, 178);
  await openPromptAt(page, PILOT.workshop.board, {
    approachOffset: { x: -32, y: 38 },
  });

  const labels = await promptLabels(page);

  await selectPromptOption(
    page,
    labels.indexOf('Open the return batch (three jobs).') + 1,
  );
  await waitSurface(page, true, 'm01_return_orders');
  await frame('m01-return-batch-first-view');

  for (const job of ['sort_spares', 'seal_spares_crate', 'count_hand_tools']) {
    await clickElement(page, `do_${job}`);
    await page.waitForTimeout(600);
  }

  await waitType(page, 'proto_m01_batch_window_closed', 2);
  await press(page, 'Escape');
  await waitSurface(page, false);
  await walkTo(page, 1256, WORKSHOP.laneY, { yFirst: true });
}

/**
 * M22 (the m22_setbacks_route acts): report 1 returned, acknowledged and
 * revised (the register, the codes), accepted; report 2 returned,
 * acknowledged, withdrawn; rating 1 answered (2), rating 2 declined.
 */
export async function reportDesk(page: Page) {
  const placed = await assembleReport(page);

  await submitReport(page);
  await frame('m22-report-1-returned');
  await press(page, 'k');
  await page.waitForTimeout(300);
  await clickElement(page, 'register_toggle');

  for (const [slot, lineId] of placed.entries()) {
    await attachCode(page, slot, codeFor(lineId));
  }

  await submitReport(page);
  await page.waitForTimeout(1_600);
  await placeThreeLines(page);
  await submitReport(page);
  await press(page, 'k');
  await page.waitForTimeout(300);
  await clickElement(page, 'withdraw_o2');
  await page.waitForTimeout(1_200);
  await press(page, '2');
  await page.waitForTimeout(1_200);
  await clickElement(page, 'rating_decline');
  await page.waitForTimeout(300);
  await frame('m22-after-ratings');
  await clickElement(page, 'leave');
  await waitSurface(page, false);
}

/** Episode 5, engaged (S1); begins in the yard at `return_hub`. */
export async function episode5Engaged(page: Page) {
  await delegateLogbookToKai(page);
  await readGaugeOnce(page); // M09 check 3
  await valeReturnWithQuestion(page);
  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
  await frame('room-workshop-return-entry');
  await feedConsoleHolds(page);
  await Promise.all([
    pressBatchB(page, { store: 3, exposureMs: 2_500 }), // M03 o2
    frameWhenOpen(page, 'm03tools', 'm03-press-b-first-view'),
  ]);
  await feedConsoleCuedReturn(page);
  await Promise.all([
    calibrationReturn(page, 3), // M07: 2 → 5 of 6
    frameWhenOpen(page, 'm07_calibration_bench', 'm07-bench-return'),
  ]);
  await Promise.all([
    repairRelay(page, { wrongFirst: true, fit: true }), // M21
    frameWhenOpen(page, 'm21_relay_bench', 'm21-relay-bench-first-view'),
  ]);
  await reportDesk(page); // M22
  await returnBatch(page); // M01 o2
  await placeOutbound(page);
  await acknowledgeQuestionnaireNotice(page);
  await frame('handover-desk-after-notice');
  await signOffReturnShift(page);
  await frame('board-return-sign-off');
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
  await frame('room-deck-entry');
}

/* ================================================================== *
 * EPISODE 6 — Utility Deck and Core
 * ================================================================== */

/** The review closure, the three feeds, the Core synchronised. */
export async function episode6Closure(page: Page) {
  await closeStationRecord(page);
  await frame('deck-record-closed');
  await raiseFeedKeyboard(page, 'coolant');
  await raiseFeedPointer(page, 'calibration');
  await raiseFeedPointer(page, 'distribution');
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __closureProbe?: { utility_state: string } | null;
        }
      ).__closureProbe?.utility_state === 'core_access_ready',
    undefined,
    { timeout: 8000 },
  );
  await frame('deck-feeds-up');
  await enterCoreChamber(page);
  await frame('room-core-entry');
  await openSyncReview(page);
  await frame('core-sync-review');
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await clickElement(page, 'confirm_sync');
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
  await frame('core-completion-notice');
}

/* ================================================================== *
 * S2 — the minimal route (every optional offer declined explicitly,
 * every optional station left unopened, only route-required beats)
 * ================================================================== */

async function answerChain(page: Page, label: string) {
  await waitPromptLabel(page, label);
  await page.waitForTimeout(450);
  await selectPromptLabel(page, label);
  await page.waitForTimeout(400);
}

/** Episodes 1 to 6 of S2, from the Dock to the Core completion notice. */
export async function scenarioS2(page: Page, log?: StageLog) {
  await scenarioS2UpToReview(page, log);
  await closeStationRecord(page);
  await frame('s2-deck-record-closed');
  await raiseFeedKeyboard(page, 'coolant');
  await raiseFeedKeyboard(page, 'calibration');
  await raiseFeedKeyboard(page, 'distribution');
  await enterCoreChamber(page);
  await openSyncReview(page);
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await keyActivate(page, 'confirm_sync');
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
  await log?.mark('S2 episode 6');
}

/** S2 from the Dock to the Utility Deck at `deck_closure` (no closure yet). */
export async function scenarioS2UpToReview(page: Page, log?: StageLog) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await expectStage(page, 'incident_handover');
  await answerChain(page, M09_OFFER_LABELS.decline);
  await answerChain(page, M10_OFFER_LABELS.d1.decline);
  await answerChain(page, 'No — leave the lamp job.');
  await openVale(page);
  await selectPromptLabel(page, 'Handover confirmed — what is next?');
  await expectStage(page, 'workshop');
  await log?.mark('S2 episode 1');
  await concourseToWorkshop(page);
  await boardFirstCard(page, 'workshop_work');
  await boardFirstCard(page, 'lab_briefing');
  await workshopToConcourse(page);
  await log?.mark('S2 episode 2');
  await concourseToLab(page);
  await openKai(page);
  await selectPromptLabel(page, 'Understood — no need for the probe.');
  await expectStage(page, 'lab_work');
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
  await log?.mark('S2 episode 3');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await selectPromptLabel(page, 'Ready — no need for the driver.');
  await expectStage(page, 'exterior_work');
  await answerChain(page, 'No — leave the flag job.');
  await openNoor(page);
  await selectPromptLabel(page, 'I am finished outside.');
  await expectStage(page, 'return_hub');
  await answerLogbookOffer(page, 'decline');
  await log?.mark('S2 episode 4');
  await leaveYard(page);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await openVale(page);
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
  await page.waitForTimeout(600);
  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
  await signOffReturnShift(page);
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
  await log?.mark('S2 episode 5');
}

/* ================================================================== *
 * S3 — three genuine reloads (800 × 600)
 *
 * After `page.reload()` the page load replays from the Dock (STATE-AND-
 * SESSION-CONTINUITY §4). Items administered in an earlier load hold their
 * offers and screens back (their own reload guards); the replay drivers
 * EXPECT that and never re-administer anything. If ordinary input cannot
 * finish the route after a reload, the driver throws with what it saw:
 * that is a finding (V-1 / V-5 (b)), never worked around.
 * ================================================================== */

/** A genuine reload (the page hides: the keep-alive export goes), then the Dock. */
export async function reloadToDock(page: Page) {
  await page.reload();
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __pilotOpeningProbe?: { open: boolean } | null;
        }
      ).__pilotOpeningProbe?.open === true,
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForTimeout(600);
  await press(page, 'Space');
  await waitScene(page, 'dock', 60_000);
  await page.waitForTimeout(1600);
}

/**
 * Answers an open prompt chain by preference until it closes: at each card
 * set the first preferred label present is chosen. A card set with none of
 * them is a finding (it is reported with its labels).
 */
async function answerChainBy(
  page: Page,
  preferred: readonly string[],
  limit = 8,
) {
  for (let step = 0; step < limit; step += 1) {
    await page.waitForTimeout(450);

    const labels = await promptLabels(page);

    if (labels.length === 0) {
      return;
    }

    const choice = preferred.find((label) => labels.includes(label));

    if (choice === undefined) {
      throw new Error(
        `S3 replay: no expected card among ${JSON.stringify(labels)}`,
      );
    }

    await selectPromptLabel(page, choice);
    await page.waitForTimeout(400);
  }
}

/** The minimal replay's preferred cards (declines, defers, route beats). */
const REPLAY_CARDS = [
  'Handover confirmed — what is next?',
  M09_OFFER_LABELS.decline,
  M10_OFFER_LABELS.d1.decline,
  'No — leave the lamp job.',
  'No — leave the flag job.',
  'Understood — no need for the probe.',
  'Ready — no need for the driver.',
  'I am done here — what is next?',
  'I am finished outside.',
  'Heading to the workshop.',
  'Understood.',
  'Ready.',
] as const;

/** From the Dock after a reload to the Workshop return (`workshop_return`). */
export async function replayToWorkshopReturn(
  page: Page,
  options: { loops?: boolean } = {},
) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await selectPromptOption(page, 1);
  await answerChainBy(page, REPLAY_CARDS);

  if ((await stageNow(page)) !== 'workshop') {
    await openVale(page);
    await answerChainBy(page, REPLAY_CARDS);
  }

  await expectStage(page, 'workshop');
  await concourseToWorkshop(page);
  await boardFirstCard(page, 'workshop_work');
  await boardFirstCard(page, 'lab_briefing');
  await workshopToConcourse(page);
  await concourseToLab(page);
  await openKai(page);
  await answerChainBy(page, REPLAY_CARDS, 1);
  await expectStage(page, 'lab_work');
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await expectStage(page, 'exterior_briefing');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await answerChainBy(page, REPLAY_CARDS);
  await expectStage(page, 'exterior_work');

  if (options.loops === true) {
    // The three required loops only (the M25 question becomes due).
    await openYardSurface(page, 'sensorPost', 'm25_field_sensor_post');

    const before = await countType(page, 'proto_m25_loops_loop_completed');

    for (let loop = 1; loop <= 3; loop += 1) {
      await clickElement(page, 'run_loop');
      await waitType(
        page,
        'proto_m25_loops_loop_completed',
        before + loop,
        10_000,
      );
    }

    await waitType(page, 'proto_m25_loops_required_complete', 1, 10_000);
    await press(page, 'Escape');
    await waitSurface(page, false);
  }

  await openNoor(page);
  await selectPromptLabel(page, 'I am finished outside.');
  await expectStage(page, 'return_hub');
  await page.waitForTimeout(450);

  if ((await promptLabels(page)).includes(LOGBOOK_DECLINE)) {
    await selectPromptLabel(page, LOGBOOK_DECLINE);
  }

  await leaveYard(page);
  await useDoor(page, PILOT.lab.southDoor, 'station_concourse', {
    approachOffset: await labApproach(page, PILOT.lab.southDoor),
  });
  await openVale(page);
  await selectPromptOption(page, 1);
  await expectStage(page, 'workshop_return');
}

const LOGBOOK_DECLINE = 'Better ask someone else.';

async function stageNow(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __pilotProbe?: { stage: string } | null })
        .__pilotProbe?.stage ?? null,
  );
}

/** From `workshop_return` (any prompt dismissed) to the Utility Deck. */
export async function returnToDeck(page: Page) {
  if ((await promptLabels(page)).length > 0) {
    await press(page, 'Escape');
    await page.waitForTimeout(400);
  }

  await concourseToWorkshop(page);
  await page.waitForTimeout(400);
  await signOffReturnShift(page);
  await walkTo(page, 1256, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
}

/** The feeds and the Core synchronised (the closure after the review). */
export async function deckToCore(page: Page) {
  for (const feed of ['coolant', 'calibration', 'distribution'] as const) {
    await raiseFeedKeyboard(page, feed);
  }

  await enterCoreChamber(page);
  await openSyncReview(page);
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await keyActivate(page, 'confirm_sync');
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
}

export interface S3Marks {
  reload_1: { stage: string | null; open_surface: string | null };
  reload_2: { stage: string | null; prompt: string[] };
  reload_3: { stage: string | null; record_closed: boolean };
}

/**
 * S3. Load 1: episodes 1 and 2 engaged, the lab entered, the M15 evidence
 * table started — reload 1 INSIDE the lab window. Load 2: the minimal
 * replay with the three required M25 loops; the return check-in shows the
 * M25 question (stage `workshop_return`; the calibration bench, opened in
 * load 1, held back) — reload 2 with the question open. Load 3: the replay
 * to the Deck review, the record closed — reload 3 before the Core. Load
 * 4: the replay to the Core.
 */
export async function scenarioS3(page: Page, log?: StageLog): Promise<S3Marks> {
  await episode1Engaged(page);
  await episode2Engaged(page);
  await readGaugeOnce(page);
  await concourseToLab(page);
  await openKai(page);
  await selectPromptLabel(page, 'Understood.');
  await expectStage(page, 'lab_work');
  await openLabStation(
    page,
    PILOT.lab.evidenceTable,
    surfaceOpen(page, 'm15_evidence_table'),
  );
  await labNext(page); // START
  await labKey(page, '1');
  await frame('s3-before-reload-1-m15-open');

  const reload1 = {
    stage: await stageNow(page),
    open_surface: (await surface(page))?.surface_id ?? null,
  };

  await log?.mark('S3 load 1 (before reload 1)');
  await reloadToDock(page);
  await log?.mark('S3 load 2 starts');
  await replayToWorkshopReturn(page, { loops: true });
  await page.waitForTimeout(800);
  await frame('s3-before-reload-2-m25-question');

  const reload2 = {
    stage: await stageNow(page),
    prompt: await promptLabels(page),
  };

  await log?.mark('S3 load 2 (before reload 2)');
  await reloadToDock(page);
  await log?.mark('S3 load 3 starts');
  await replayToWorkshopReturn(page);
  await returnToDeck(page);
  await closeStationRecord(page);
  await frame('s3-before-reload-3-record-closed');

  const reload3 = {
    stage: await stageNow(page),
    record_closed: true,
  };

  await log?.mark('S3 load 3 (before reload 3)');
  await reloadToDock(page);
  await log?.mark('S3 load 4 starts');
  await replayToWorkshopReturn(page);
  await returnToDeck(page);

  // The record may be closed again in this load or held as closed; the
  // review is offered as the route offers it.
  const labels = await page
    .evaluate(
      () =>
        (
          window as unknown as {
            __closureProbe?: { record_closed: boolean } | null;
          }
        ).__closureProbe?.record_closed ?? false,
    )
    .catch(() => false);

  if (!labels) {
    await closeStationRecord(page);
  }

  await deckToCore(page);
  await frame('s3-load-4-completion');
  await log?.mark('S3 load 4 complete');

  return { reload_1: reload1, reload_2: reload2, reload_3: reload3 };
}

/* ================================================================== *
 * S4 — focus and pause (800 × 600): blur and hidden during the M05 clock,
 * the ESC menu, HELP open and close, LEAVE and return
 * ================================================================== */

export interface S4Record {
  m05_started: Record<string, unknown>;
  esc_menu: { moved_while_menu_open: number; moved_after_resume: number };
  /** RESUME by pointer (recorded, never asserted; see `scenarioS4`). */
  esc_menu_pointer: {
    moved_while_menu_open: number;
    moved_after_resume_click: number;
    resumed_by_click: boolean;
  };
  help: { opened: string[]; closed: string[] };
  help_pointer: { opened: string[]; closed: string[] };
  /** A world station is entered by SPACE / E only: a click opens nothing. */
  station_pointer_entry: {
    prompt_visible: boolean;
    surface_opened: boolean;
    prompt_cards_opened: boolean;
  };
  leave_return: {
    decision_before: unknown;
    decision_after: unknown;
    surface_closed_events: number;
    surface_reopened_events: number;
  };
}

async function avatarX(page: Page): Promise<number> {
  return (await playerAt(page))?.x ?? Number.NaN;
}

/**
 * S4. The browser focus and visibility signals are produced the way the
 * game's own listeners read them (`blurPage` / `hidePage`, the m23Helpers
 * precedent): headless Chromium has no real window focus to lose.
 */
export async function scenarioS4(page: Page): Promise<S4Record> {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  await valeChainAccept(page);
  // The M05 o1 clock runs from eligibility: 3 s blurred, 3 s hidden.
  await blurPage(page);
  await page.waitForTimeout(3_000);
  await focusPage(page);
  await hidePage(page);
  await page.waitForTimeout(3_000);
  await showPage(page);
  await page.waitForTimeout(500);
  // The ESC menu (the world pause): the avatar does not move under it.
  await press(page, 'Escape');
  await page.waitForTimeout(800);
  await frame('s4-esc-menu');

  const x0 = await avatarX(page);

  await hold(page, 'ArrowLeft', 500);

  const x1 = await avatarX(page);

  await press(page, 'Escape');
  await page.waitForTimeout(800);
  await hold(page, 'ArrowLeft', 300);

  const x2 = await avatarX(page);

  // RESUME by pointer (U24-B review: V-2 pairs). The menu draws its Resume
  // button at design (400, 290) (`Menu.tsx`); the click and its effect are
  // recorded, not asserted — the menu shows no Resume control at 43f12de
  // either (B/diagnostics/ESC-MENU-CLASSIFICATION.md) — and ESC resumes
  // when the click did not.
  await press(page, 'Escape');
  await page.waitForTimeout(800);

  const x3 = await avatarX(page);

  await hold(page, 'ArrowRight', 300);

  const x4 = await avatarX(page);
  const resumeAt = await designToPage(page, 400, 290);

  await page.mouse.click(resumeAt.x, resumeAt.y);
  await page.waitForTimeout(800);
  await frame('s4-esc-menu-after-resume-click');

  const x5 = await avatarX(page);

  await hold(page, 'ArrowRight', 300);

  const x6 = await avatarX(page);
  const resumedByClick = Math.abs(x6 - x5) > 4;

  if (!resumedByClick) {
    await press(page, 'Escape');
    await page.waitForTimeout(800);
  }

  await lampJob(page);

  const started = await lastMeta(page, 'proto_m05_start_started');

  // HELP open and close on the incident desk; LEAVE mid-decision by
  // pointer, a walk away and back, the same decision on reopening.
  await openSurfaceAtApproach(
    page,
    CONCOURSE.incidentDesk,
    'm14_incident_desk',
    (x, y) => concourseVia(page, x, y),
  );
  await page.waitForTimeout(DESK_SETTLE_MS);
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  await frame('s4-desk-help-open');

  const opened = ((await surface(page))?.elements ?? []).map((e) => e.id);

  // ESC closes the help sheet, not the desk (the M14 R1 path).
  await page.waitForTimeout(DESK_SETTLE_MS + 100);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const closed = ((await surface(page))?.elements ?? []).map((e) => e.id);

  // HELP and CLOSE HELP by pointer.
  await page.waitForTimeout(DESK_SETTLE_MS);
  await clickElement(page, 'help');
  await page.waitForTimeout(300);
  await frame('s4-desk-help-open-pointer');

  const openedByPointer = ((await surface(page))?.elements ?? []).map(
    (e) => e.id,
  );

  await page.waitForTimeout(DESK_SETTLE_MS + 100);
  await clickElement(page, 'close_help');
  await page.waitForTimeout(300);

  const closedByPointer = ((await surface(page))?.elements ?? []).map(
    (e) => e.id,
  );

  await page.waitForTimeout(DESK_SETTLE_MS);
  await clickElement(page, 'start'); // START PACKET 1
  await page.waitForTimeout(300);
  await page.keyboard.press('1');
  await page.waitForTimeout(200);

  const decisionBefore = (
    await lastMeta(page, 'proto_m14_integration_decision_presented')
  ).decision_id;

  await page.waitForTimeout(DESK_SETTLE_MS);
  await clickElement(page, 'leave');
  await waitSurface(page, false);
  await frame('s4-desk-left');
  // Entering a station by pointer is absent (the controls card names
  // SPACE / E): beside the desk, with its prompt showing, a click on the
  // canvas centre (the camera follows the avatar) opens nothing.
  await page.waitForTimeout(600);

  const promptVisible = await page.evaluate(
    () =>
      (
        window as unknown as {
          __worldPromptProbe?: { prompt: boolean } | null;
        }
      ).__worldPromptProbe?.prompt ?? false,
  );
  const canvas = await page.locator('canvas').boundingBox();

  await page.mouse.click(
    canvas!.x + canvas!.width / 2,
    canvas!.y + canvas!.height / 2,
  );
  await page.waitForTimeout(1_500);
  await frame('s4-desk-pointer-entry-attempt');

  // A closed surface leaves its probe as `{ open: false, … }`, not null.
  const stationPointerEntry = {
    prompt_visible: promptVisible,
    surface_opened: (await surface(page))?.open ?? false,
    prompt_cards_opened: await page.evaluate(
      () =>
        ((window as unknown as { __promptCards?: unknown[] | null })
          .__promptCards ?? null) !== null,
    ),
  };

  // Away to the plan board's approach (no station opened), then back.
  await concourseVia(page, CONCOURSE.planBoard.x, CONCOURSE.planBoard.y);
  await page.waitForTimeout(1_500);
  await openSurfaceAtApproach(
    page,
    CONCOURSE.incidentDesk,
    'm14_incident_desk',
    (x, y) => concourseVia(page, x, y),
  );
  await frame('s4-desk-reopened');

  const decisionAfter = (
    await lastMeta(page, 'proto_m14_integration_decision_presented')
  ).decision_id;

  await page.waitForTimeout(DESK_SETTLE_MS);
  await press(page, 'Escape');
  await waitSurface(page, false);

  return {
    m05_started: started,
    esc_menu: { moved_while_menu_open: x1 - x0, moved_after_resume: x2 - x1 },
    esc_menu_pointer: {
      moved_while_menu_open: x4 - x3,
      moved_after_resume_click: x6 - x5,
      resumed_by_click: resumedByClick,
    },
    help: { opened, closed },
    help_pointer: { opened: openedByPointer, closed: closedByPointer },
    station_pointer_entry: stationPointerEntry,
    leave_return: {
      decision_before: decisionBefore,
      decision_after: decisionAfter,
      surface_closed_events: await countType(
        page,
        'proto_m14_integration_panel_left',
      ),
      surface_reopened_events: await countType(
        page,
        'proto_m14_integration_series_reopened',
      ),
    },
  };
}

/* ================================================================== *
 * S5 — pointer-only and keyboard-only passes (800 × 600)
 * ================================================================== */

/** M12 packet 1 with the pointer only: checks, judgements, keypad, release. */
export async function qualityPacket1Pointer(page: Page) {
  await openPacket1(page);
  await waitType(page, 'proto_m12_check_opportunity_opened', 1);

  const opened = (await events(page)).filter(
    (event) => event.event_type === 'proto_m12_check_opportunity_opened',
  );
  const form = (
    opened[0]?.metadata?.entry_state_snapshot as { form: 'form_a' | 'form_b' }
  ).form;
  const product = M12_PRODUCTS.o1;
  const faultIndex = product.fault[form].index;

  for (const [index, field] of product.fields.entries()) {
    await clickElement(page, `check_${field.id}`);
    await waitType(page, 'proto_m12_check_field_checked', index + 1);
    await page.waitForTimeout(450);
    await clickElement(
      page,
      index === faultIndex ? 'judge_differs' : 'judge_matches',
    );
    await waitType(page, 'proto_m12_check_field_judged', index + 1);

    if (index === faultIndex) {
      await page.waitForTimeout(300);

      for (const digit of field.reference) {
        await clickElement(page, `key_${digit}`);
      }

      await clickElement(page, 'key_confirm');
      await page.waitForTimeout(400);
    }
  }

  await frame('s5-m12-pointer-before-release');
  await clickElement(page, 'release');
  await waitType(page, 'proto_m12_check_released', 1);
  await page.waitForTimeout(300);
  await clickElement(page, 'leave');
  await waitSurface(page, false);
}

/** M02 with the keyboard only: two cases carried, a label, six answers. */
export async function caseWorkspaceKeyboard(page: Page) {
  await workshopVia(page, 188, 214);
  await interactAt(page, PILOT.workshop.filingDesk, {
    approachOffset: { x: 4, y: 44 },
  });
  await waitOverlay(page, true);

  let probe = (await overlay(page))!;

  for (const [index, caseId] of ['m02c_case_s14', 'm02c_case_r07'].entries()) {
    const from = slotHolding(probe, caseId);

    await focusOverlaySlot(page, from.container_id, from.slot_index);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await focusOverlaySlot(page, M02_TRAY(index + 1), 0);
    await page.keyboard.press('Space');
    await waitType(page, 'proto_m02_workspace_case_moved', index + 1);
    probe = (await overlay(page))!;
  }

  await page.keyboard.press('l');
  await waitType(page, 'proto_m02_workspace_tray_labelled', 1);
  await page.keyboard.press('c');
  await waitType(page, 'proto_m02_workspace_request_presented', 1);
  await frame('s5-m02-keyboard-request');

  for (let request = 0; request < 6; request += 1) {
    await page.waitForTimeout(500);

    if (request % 3 === 2) {
      await page.keyboard.press('n');
    } else {
      const target = slotHolding(probe, await m02Requested(page, request));

      await focusOverlaySlot(page, target.container_id, target.slot_index);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');
    await m02Answered(page, request + 1);
  }

  await waitType(page, 'proto_m02_workspace_window_closed', 1);
  await press(page, 'Escape');
  await waitOverlay(page, false);
}

/** M03 Press A with the pointer only: the roll dragged, PRESS ×3, one tool racked. */
export async function pressAPointer(page: Page) {
  const at = PILOT.workshop.pressA;
  const c = M03_SPEC.a.containers;

  await workshopVia(page, at.x, at.y + 44);
  await interactAt(page, at, { approachOffset: { x: 0, y: 44 } });
  await waitOverlay(page, true);

  let probe = (await overlay(page))!;

  await dragSlot(page, slotOf(probe, c.supply, 0), slotOf(probe, c.feed, 0));

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await clickOverlayButton(page, 'm03t_press');
    await page.waitForTimeout(450);
  }

  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __inventoryUiProbe?: { m03t?: { phase: string } | null } | null;
        }
      ).__inventoryUiProbe?.m03t?.phase === 'tools_out',
    undefined,
    { timeout: 8_000 },
  );
  probe = (await overlay(page))!;
  await dragSlot(
    page,
    probe.slots.find(
      (slot) => slot.container_id === c.bench && slot.definition_id !== null,
    )!,
    probe.slots.find(
      (slot) => slot.container_id === c.rack && slot.definition_id === null,
    )!,
  );
  await waitType(page, 'proto_m03tools_tool_moved', 1);
  await frame('s5-press-a-pointer');
  await page.waitForTimeout(2_200);

  const close = (await overlay(page))?.buttons.find((b) =>
    /close|leave/i.test(b.id),
  );

  if (close !== undefined) {
    await clickOverlayButton(page, close.id);
  } else {
    await press(page, 'Escape');
  }

  await waitOverlay(page, false);
}

/** M23 with the pointer only (the m23_plots S2 acts). */
export async function excavationPointer(page: Page) {
  await openSeries(page, 'pointer');
  await requestStop(page, 'plot_b', 'pointer');
  await confirmStop(page, 'plot_b', 'pointer');
  await openPlot(page, 'plot_a', 'pointer');
  await walkIntoPlot(page, 'plot_a');
  await failFirst(page, 'pointer');
  await chooseFailure(page, 'continue', 'pointer');
  await walkInsidePlot(page, 'plot_a');
  await scanHere(page, 'pointer');
  await frame('s5-m23-pointer-credit');
  await m23OpenPanel(page, 'pointer');
  await m23WaitView(page, 'selector');
  await requestStop(page, 'plot_a', 'pointer');
  await confirmStop(page, 'plot_a', 'pointer');
}

/** S5 from the Dock to the yard (the run need not complete the route). */
export async function scenarioS5(page: Page) {
  await completeDockTutorial(page, 1);
  await dockToConcourse(page);
  // NPC dialog by POINTER: Vale's chain, every card clicked.
  await openPromptAt(page, PILOT.concourse.vale, {
    approachOffset: { x: 0, y: 40 },
  });
  await page.waitForTimeout(450);
  await clickPromptLabel(page, (await promptLabels(page))[0]);
  await expectStage(page, 'incident_handover');

  for (const label of [
    'I will take the watch.',
    'I will take it to Kai.',
    'Alarm cleared — continue.',
    'Understood.',
    'Yes — I will take the lamp job.',
  ]) {
    await waitPromptLabel(page, label);
    await page.waitForTimeout(450);
    await clickPromptLabel(page, label);
    await page.waitForTimeout(400);
  }

  await frame('s5-npc-pointer-done');
  await lampJob(page);
  await qualityPacket1Pointer(page); // work surface, pointer only
  await incidentDesk(page); // work surface, keyboard only
  await openVale(page);
  await selectPromptLabel(page, 'Handover confirmed — what is next?'); // NPC keyboard
  await expectStage(page, 'workshop');
  await concourseToWorkshop(page);
  await boardFirstCard(page, 'workshop_work');
  await caseWorkspaceKeyboard(page); // overlay, keyboard only
  await pressAPointer(page); // overlay, pointer only
  await boardFirstCard(page, 'lab_briefing');
  await workshopToConcourse(page);
  await concourseToLab(page);
  await openKai(page);
  await selectPromptLabel(page, 'Understood.');
  await expectStage(page, 'lab_work');
  await openKai(page);
  await selectPromptLabel(page, 'I am done here — what is next?');
  await useDoor(page, PILOT.lab.airlock, 'exterior_recovery_yard', {
    approachOffset: await labApproach(page, PILOT.lab.airlock),
  });
  await openNoor(page);
  await page.waitForTimeout(450);
  await clickPromptLabel(page, 'Ready.');
  await expectStage(page, 'exterior_work');
  await waitPromptLabel(page, 'No — leave the flag job.');
  await page.waitForTimeout(450);
  await clickPromptLabel(page, 'No — leave the flag job.');
  await excavationPointer(page); // field HUD, pointer only
}

/* ================================================================== *
 * L2 — the SCENARIO expectation (V-4 layer L2)
 *
 * Hand-derived from the register's primary-feature formulas (REG §2 and
 * `registerV3.ts` feature text, transcribed below) and the scripted
 * choices of the drivers above. It is NOT a raw-event reproduction: it
 * says what the scripted behaviour should have produced, and the spec
 * compares it with the exported production rows. Nothing here imports
 * `src/measurement/features`.
 * ================================================================== */

export interface L2Expectation {
  feature_id: string;
  /**
   * Exact scalar value; an object whose listed keys must match (a subset);
   * or 'present' for a value that is not hand-derivable (a latency).
   */
  value: number | null | 'present' | Record<string, unknown>;
  numerator: number | null | 'any';
  denominator: number | null | 'any';
  /** One disposition, or the set the register allows for this case. */
  disposition: string | readonly string[];
  /** The derivation: formula (register) × scripted acts (driver). */
  basis: string;
}

/** S1 (engaged route), both viewports; the same synthetic identity. */
export const S1_EXPECTATION: readonly L2Expectation[] = [
  {
    feature_id: 'm01_planned_jobs',
    value: 1,
    numerator: 1,
    denominator: 6,
    disposition: 'observed',
    basis:
      'jobs placed before the first work action / 6: o1 one card placed then worked (1); o2 worked directly (0)',
  },
  {
    feature_id: 'm02_correct_first_retrievals',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
    basis:
      'correct first retrievals / 6 (Cannot locate = incorrect): 1 wrong, 2 right, 3 cannot, 4 right, 5 cannot, 6 right',
  },
  {
    feature_id: 'm03_tools_restored',
    value: 4,
    numerator: 4,
    denominator: 6,
    disposition: 'observed',
    basis:
      'tools at their home at first departure / 6: Press A 1 of 3 (one dragged to the rack), Press B 3 of 3',
  },
  {
    feature_id: 'm04_undisposed_pieces',
    value: 4,
    numerator: 4,
    denominator: 6,
    disposition: 'observed',
    basis:
      'pieces not disposed at first departure, carried included / 6: job 1 offcut binned, swarf carried, wrap lying at the bench stage (2); job 2 offcut binned, wrap carried, swarf lying (2)',
  },
  {
    feature_id: 'm05_start_latency',
    value: 'present',
    numerator: 'any',
    denominator: 'any',
    disposition: 'observed',
    basis:
      'per accepted occasion the focused ms to the first work action + status: both jobs accepted and started at once (status started ×2); the ms are not hand-derivable',
  },
  {
    feature_id: 'm06_unique_correct_orders',
    value: 3,
    numerator: 3,
    denominator: null,
    disposition: 'observed',
    basis:
      'distinct orders correct inside the 60 s budget: order 1 right, order 2 wrong then right, order 3 skipped, order 4 right, explicit stop',
  },
  {
    feature_id: 'm07_stages_completed',
    value: 5,
    numerator: 5,
    denominator: 6,
    disposition: 'observed',
    basis:
      'stages / 6 of an entered project at the review: 2 in episode 2, 3 more on the return',
  },
  {
    feature_id: 'm08_work_choice_fraction',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
    basis: 'Work / explicit choices: Work on slots 1, 3, 5; Rest on 2, 4, 6',
  },
  {
    feature_id: 'm09_due_checks_fulfilled',
    value: 3,
    numerator: 3,
    denominator: 3,
    disposition: 'observed',
    basis:
      'due checks read in their window / eligible: checks 1 (episode 1), 2 (laboratory pass), 3 (return) all read',
  },
  {
    feature_id: 'm10_obligations_fulfilled',
    value: 2,
    numerator: 2,
    denominator: 2,
    disposition: 'observed',
    basis:
      'accepted deliveries fulfilled or accountably delegated / accepted: d1 handed to Kai, d2 left with Kai (delegate)',
  },
  {
    feature_id: 'm11_unresolved_custodies',
    value: 0,
    numerator: 0,
    denominator: 2,
    disposition: 'observed',
    basis:
      'accepted custodies unresolved at first departure / accepted: the probe returned to Kai, the driver to Noor — a VALID ZERO',
  },
  {
    feature_id: 'm12_fields_verified',
    value: 5,
    numerator: 5,
    denominator: 6,
    disposition: 'observed',
    basis:
      'fields judged before release / 6: packet 1 three judged, packet 2 two judged (the third checked only)',
  },
  {
    feature_id: 'm13_first_solutions',
    value: 1,
    numerator: 1,
    denominator: 3,
    disposition: 'observed',
    basis:
      'networks solved on the first submission / 3: sealed, open (unsealed), CANNOT SOLVE',
  },
  {
    feature_id: 'm14_correct_first_integrations',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
    basis:
      'correct first decisions / 6: P1 A (key), A (wrong), CANNOT SOLVE; P2 B, C (keys), B (wrong)',
  },
  {
    feature_id: 'm15_correct_first_predictions',
    value: 2,
    numerator: 2,
    denominator: 4,
    disposition: 'observed',
    basis:
      'correct first predictions / 4: box 1 Q1 C (key), Q2 A (wrong); box 2 Q1 CANNOT SOLVE, Q2 C (key)',
  },
  {
    feature_id: 'm16_correct_first_applications',
    value: 3,
    numerator: 3,
    denominator: 6,
    disposition: 'observed',
    basis:
      "correct first applications / 6 (Don't know = incorrect): 1 key, 4 wrong, DON'T KNOW, 1 key, 2 wrong, 2 key",
  },
  {
    feature_id: 'm17_criterion_trial',
    value: { criterion_trial: 4, attained: true },
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
    basis:
      'the learning trial ending the first run of three consecutive correct ({criterion_trial, attained}): F T T T … ⇒ trial 4, attained',
  },
  {
    feature_id: 'm18_correct_first_diagnoses',
    value: 1,
    numerator: 1,
    denominator: 3,
    disposition: 'observed',
    basis:
      'correct first diagnoses / 3 (Cannot solve = incorrect): case 1 part 3 (key), case 2 CANNOT SOLVE, case 3 part 4 (wrong)',
  },
  {
    feature_id: 'm19_continuations',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
    basis:
      'a further executed TRY after the first boundary / lines with a boundary: line 1 continued (FEED, H2, TRY), line 2 set aside',
  },
  {
    feature_id: 'm20_cued_resumptions',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
    basis:
      'executed ALIGN after the notice / released, noticed, not resumed before it: A resumed after its notice, B not',
  },
  {
    feature_id: 'm21_restudy_revisions',
    value: 1,
    numerator: 1,
    denominator: 1,
    disposition: 'observed',
    basis:
      'relevant restudy AND a revised application / cases first applied incorrectly: case 1 wrong first, §4 restudied, revised; case 2 right first (outside the denominator)',
  },
  {
    feature_id: 'm22_revisions_begun',
    value: 1,
    numerator: 1,
    denominator: 2,
    disposition: 'observed',
    basis:
      'reports with a revision begun / requirements presented: report 1 revised (codes attached), report 2 withdrawn',
  },
  {
    feature_id: 'm23_continuations_after_failure',
    value: 1,
    numerator: 1,
    denominator: 1,
    disposition: 'observed',
    basis:
      'further search after the first failed dig / plots with a failed dig: plot A failed, CONTINUE, a scan (1); plot B stopped before any opening (outside)',
  },
  {
    feature_id: 'm24_postknowledge_casts',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
    basis:
      'casts after a passed check, the first included: check right first, two casts, then the bench and Finish',
  },
  {
    feature_id: 'm25_optional_repeats',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
    basis:
      'optional repeats after the three required loops: two optional loops, then an explicit stop',
  },
  {
    feature_id: 'm26_postknowledge_retries',
    value: 2,
    numerator: 'any',
    denominator: null,
    disposition: 'observed',
    basis:
      'Post A retries after a passed check, the first included: wrong, explanation, right, two transmissions on A, then Post B, the cap',
  },
];

// `REG:<n>` in the bases below is a line of the implementation register
// at 43f12de (the Unit 24-B record moves every line after 165 by 69);
// `ADD:<n>`, of the addendum at 43f12de (lines after 1563 move by 9).
const S2_IDS: readonly [string, string | readonly string[], string][] = [
  ['m01_planned_jobs', 'declined', 'presented, never opened (REG:6384)'],
  [
    'm02_correct_first_retrievals',
    ['declined', 'no_eligible_event'],
    'presented, never opened: REG:7116 declined; ADD:1569 names no declined case — register tension, both allowed',
  ],
  ['m03_tools_restored', 'declined', 'listed, never opened (REG:6809)'],
  [
    'm04_undisposed_pieces',
    'not_presented',
    'no coupon cut: a job never run is not presented (REG §5.172)',
  ],
  ['m05_start_latency', 'declined', 'both jobs declined (REG:6427)'],
  ['m06_unique_correct_orders', 'declined', 'never opened (REG:6545)'],
  [
    'm07_stages_completed',
    'no_eligible_event',
    'end presented, never entered: presented_not_entered at the review (M07-2 a; REG:288)',
  ],
  [
    'm08_work_choice_fraction',
    'declined',
    'presented, never opened (REG:6171)',
  ],
  ['m09_due_checks_fulfilled', 'declined', 'the duty declined (REG:5550)'],
  [
    'm10_obligations_fulfilled',
    'declined',
    'both deliveries declined (REG:5556)',
  ],
  ['m11_unresolved_custodies', 'declined', 'both loans refused (REG:6194)'],
  ['m12_fields_verified', 'declined', 'presented, never opened (REG:6629)'],
  [
    'm13_first_solutions',
    'not_presented',
    'never opened ⇒ not_presented (REG:4995)',
  ],
  [
    'm14_correct_first_integrations',
    'no_eligible_event',
    'briefed, never opened (ADD:490)',
  ],
  [
    'm15_correct_first_predictions',
    'no_eligible_event',
    'briefed, never opened (ADD:691)',
  ],
  [
    'm16_correct_first_applications',
    'no_eligible_event',
    'briefed, never opened (ADD:896)',
  ],
  [
    'm17_criterion_trial',
    'not_presented',
    'never opened ⇒ not_presented (REG:6702)',
  ],
  [
    'm18_correct_first_diagnoses',
    'no_eligible_event',
    'briefed, never opened (ADD:1131)',
  ],
  [
    'm19_continuations',
    'no_eligible_event',
    'never opened, never declined (REG:1362)',
  ],
  [
    'm20_cued_resumptions',
    'no_eligible_event',
    'never opened, never declined (REG:730)',
  ],
  ['m21_restudy_revisions', 'declined', 'presented, never opened (REG:7432)'],
  ['m22_revisions_begun', 'declined', 'presented, never opened (REG:7357)'],
  [
    'm23_continuations_after_failure',
    ['no_eligible_event', 'not_presented'],
    'brief, never opened; REG:505 reads two ways — both allowed, never declined',
  ],
  [
    'm24_postknowledge_casts',
    ['declined', 'no_eligible_event', 'not_presented'],
    'presented, never opened: NOT STATED unambiguously (REG:7262-7284)',
  ],
  ['m25_optional_repeats', 'declined', 'listed, never opened (REG:6291)'],
  [
    'm26_postknowledge_retries',
    ['declined', 'no_eligible_event', 'not_presented'],
    'presented, never opened: NOT STATED unambiguously (REG:7262-7284)',
  ],
];

/**
 * S2 (minimal route): every primary is null — never a zero — with the
 * register's disposition for the case (`B/diagnostics/S2-REGISTER-
 * DISPOSITIONS.md`); where the register is ambiguous the allowed set is
 * named and the ambiguity reported, never resolved.
 */
export const S2_EXPECTATION: readonly L2Expectation[] = S2_IDS.map(
  ([feature_id, disposition, basis]) => ({
    feature_id,
    value: null,
    numerator: null,
    denominator: 'any',
    disposition,
    basis,
  }),
);

export interface L2Row {
  feature_id: string;
  expected: L2Expectation;
  actual: {
    value: unknown;
    numerator: number | null;
    denominator: number | null;
    disposition: string;
  } | null;
  match: boolean;
  mismatches: string[];
}

/** Compares exported production rows with an L2 expectation (no recount). */
export function compareL2(
  expectation: readonly L2Expectation[],
  features: readonly {
    feature_id: string;
    value: unknown;
    numerator: number | null;
    denominator: number | null;
    disposition: string;
  }[],
): L2Row[] {
  return expectation.map((expected) => {
    const row = features.find((f) => f.feature_id === expected.feature_id);
    const mismatches: string[] = [];

    if (row === undefined) {
      return {
        feature_id: expected.feature_id,
        expected,
        actual: null,
        match: false,
        mismatches: ['feature row missing'],
      };
    }

    const scalar = typeof row.value === 'number' || row.value === null;

    if (expected.value === 'present') {
      if (row.value === null) mismatches.push('value null');
    } else if (expected.value !== null && typeof expected.value === 'object') {
      const actual = (row.value ?? {}) as Record<string, unknown>;

      for (const [key, wanted] of Object.entries(expected.value)) {
        if (actual[key] !== wanted) {
          mismatches.push(`value.${key} ${JSON.stringify(actual[key])}`);
        }
      }
    } else if (!scalar || row.value !== expected.value) {
      mismatches.push(`value ${JSON.stringify(row.value)}`);
    }

    if (expected.numerator !== 'any' && row.numerator !== expected.numerator) {
      mismatches.push(`numerator ${row.numerator}`);
    }

    if (
      expected.denominator !== 'any' &&
      row.denominator !== expected.denominator
    ) {
      mismatches.push(`denominator ${row.denominator}`);
    }

    const allowed =
      typeof expected.disposition === 'string'
        ? [expected.disposition]
        : expected.disposition;

    if (!allowed.includes(row.disposition)) {
      mismatches.push(`disposition ${row.disposition}`);
    }

    return {
      feature_id: expected.feature_id,
      expected,
      actual: {
        value: row.value,
        numerator: row.numerator,
        denominator: row.denominator,
        disposition: row.disposition,
      },
      match: mismatches.length === 0,
      mismatches,
    };
  });
}

export { lastMeta, promptLabels };
