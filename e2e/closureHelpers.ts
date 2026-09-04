/**
 * Utility & Core closure e2e drivers (evidence-led pilot v2, Unit 6).
 *
 * Real keyboard/pointer input only, position-synced on the DEV
 * `__playerProbe`; read-only DEV probes (`__closureProbe`,
 * `__feedPanelProbe`, `__deckProbe`, `__coreChamberProbe`,
 * `__workSurfaceProbe`, `__pilotCoverage`); never a teleport, never a
 * state mutation through the window. The spine to the deck is the Unit 5
 * endpoint (return shift signed off at the Work Order Board).
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { designToPage, hold, press, selectPromptOption } from './helpers';
import {
  concourseToDeck,
  expectStage,
  interactAt,
  openPromptAt,
  PILOT,
  useDoor,
  walkTo,
  workshopToConcourse,
} from './pilotHelpers';
import {
  type ConcourseOptions,
  enterConcourseWithOffers,
  exteriorShift,
  lastPromptBody,
  type MastHistory,
  promptCardLabels,
  RETURN,
  returnInside,
  signOffReturnShift,
  surface,
  valeReturnCheckIn,
  waitSurface,
  workshopRestorationShift,
} from './returnHelpers';

export { lastPromptBody, promptCardLabels, surface, waitSurface };

/** Participant-facing text on the closure surfaces must never carry these. */
export const CLOSURE_FORBIDDEN_TEXT =
  /proto_|\bM(0[1-9]|1[0-9]|2[0-6])\b|\bQ\d{2}\b|\bscore|\btrait|persist|resilien|grit|\bvalid|invalid|censor|\bhigh\b|\blow\b|\bpass\b|fail|hire|hiring|rank|percent|good candidate|desirab/i;

/* ------------------------------------------------------------------ *
 * Probes
 * ------------------------------------------------------------------ */

export interface ClosureProbe {
  utility_state: string;
  feeds: {
    coolant: { travel: number; open: boolean; actions: number };
    calibration: {
      index: number;
      engaged: boolean;
      misaligned_attempts: number;
      actions: number;
    };
    distribution: {
      coupler: string;
      travel: number;
      seated: boolean;
      short_attempts: number;
      returns_to_tray: number;
      actions: number;
    };
  };
  core: {
    state: string;
    review_openings: number;
    stand_downs: number;
    armed_at_ms: number | null;
    confirmed_at_ms: number | null;
    stable_at_ms: number | null;
    rejected: number;
  };
  record_closed: boolean;
  review_armed: boolean;
  readiness: {
    ready: boolean;
    blockers: { kind: string; hint: string | null }[];
    counts: Record<string, number>;
    items: {
      item: string;
      status: string;
      class: string;
      routeTerminal: boolean;
    }[];
    externalQuestionnairePending: boolean;
    dev_inspection: boolean;
  };
  context: {
    gameplay_route_closed: boolean;
    research_record_closed: boolean;
    research_readiness_terminal: boolean;
    external_questionnaire_pending: boolean;
    qualtrics_completion_performed: false;
  };
  dev_inspection: boolean;
}

export async function closureProbe(page: Page): Promise<ClosureProbe> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __closureProbe?: ClosureProbe | null })
        .__closureProbe ?? null,
  );

  if (probe === null) {
    throw new Error('__closureProbe unavailable');
  }

  return probe;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FeedPanelProbe {
  open: boolean;
  feed: string | null;
  ready: boolean;
  value: number;
  target: number;
  coupler: string | null;
  feedback: string | null;
  dev_inspection: boolean;
  geometry: {
    wheel: { x: number; y: number; r: number } | null;
    lever: Rect | null;
    track: { x: number; y0: number; y1: number } | null;
    engage: Rect | null;
    coupler: Rect | null;
    socket: Rect | null;
    tray: Rect | null;
    rail: { x0: number; x1: number; y: number } | null;
  };
}

export async function feedPanel(page: Page): Promise<FeedPanelProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __feedPanelProbe?: FeedPanelProbe | null })
        .__feedPanelProbe ?? null,
  );
}

export async function waitFeedPanel(page: Page, open: boolean, feed?: string) {
  await page.waitForFunction(
    ({ expected, wanted }) => {
      const probe = (
        window as unknown as {
          __feedPanelProbe?: { open: boolean; feed: string | null } | null;
        }
      ).__feedPanelProbe;

      return (
        (probe?.open ?? false) === expected &&
        (wanted === undefined || !expected || probe?.feed === wanted)
      );
    },
    { expected: open, wanted: feed },
    { timeout: 8000 },
  );
  await page.waitForTimeout(250);
}

export interface DeckProbe {
  utility_state: string;
  feed_chips: Record<string, string>;
  manifold: string;
  door_open: boolean;
  board: string;
  dev_label_visible: boolean;
}

export async function deckProbe(page: Page): Promise<DeckProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __deckProbe?: DeckProbe | null }).__deckProbe ??
      null,
  );
}

export interface CoreChamberProbe {
  core_state: string;
  visual_state: string;
  review_open: boolean;
  completion_open: boolean;
  kai_texture: string | null;
  status_console: string;
  dev_label_visible: boolean;
}

export async function chamberProbe(
  page: Page,
): Promise<CoreChamberProbe | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __coreChamberProbe?: CoreChamberProbe | null })
        .__coreChamberProbe ?? null,
  );
}

export async function lastFeedback(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      (window as unknown as { __lastRoomFeedbackText?: string | null })
        .__lastRoomFeedbackText ?? null,
  );
}

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

/** Approach offsets (44 px; D-V2-1 rule — no other interactable nearer). */
export const DECK_APPROACH = {
  reviewPanel: { x: 0, y: 44 },
  coolantValve: { x: 0, y: -44 },
  calibrationBreaker: { x: 0, y: -44 },
  distributionBus: { x: 0, y: -44 },
  coreDoor: { x: 0, y: 44 },
  westDoor: { x: 40, y: 0 },
} as const;

export const CORE_APPROACH = {
  core: { x: 0, y: 44 },
  kai: { x: 0, y: 44 },
  southDoor: { x: 0, y: -40 },
} as const;

export type FeedName = 'coolant' | 'calibration' | 'distribution';

const FEED_SITE: Record<
  FeedName,
  { at: { x: number; y: number }; off: { x: number; y: number } }
> = {
  coolant: { at: PILOT.deck.coolantValve, off: DECK_APPROACH.coolantValve },
  calibration: {
    at: PILOT.deck.calibrationBreaker,
    off: DECK_APPROACH.calibrationBreaker,
  },
  distribution: {
    at: PILOT.deck.distributionBus,
    off: DECK_APPROACH.distributionBus,
  },
};

/** Game design space (800×600) → page pixel (V4: via __designSpace). */
async function toCanvas(page: Page, x: number, y: number) {
  return designToPage(page, x, y);
}

/* ------------------------------------------------------------------ *
 * Spine: the Unit 5 endpoint → the Utility Deck
 * ------------------------------------------------------------------ */

export interface DeckSpineOptions {
  concourse?: Partial<ConcourseOptions>;
  calibration?: boolean;
  mast?: MastHistory;
}

/**
 * Dock → Concourse (offers as asked) → Workshop restoration → Exterior
 * shift → the ONE purposeful return → Vale → Workshop return sign-off →
 * Concourse → Utility Deck at stage `deck_closure`. No closure work is
 * done by this driver.
 */
export async function routeToUtilityDeck(
  page: Page,
  tag: string,
  options?: DeckSpineOptions,
) {
  await enterConcourseWithOffers(page, tag, {
    watch: options?.concourse?.watch ?? 'decline',
    promise: options?.concourse?.promise ?? 'decline',
    readGauge1: options?.concourse?.readGauge1 ?? false,
  });
  await workshopRestorationShift(page, {
    startCalibration: options?.calibration ?? false,
  });
  await exteriorShift(page, options?.mast ?? 'none');
  await returnInside(page);
  await valeReturnCheckIn(page);
  await signOffReturnShift(page);
  await walkTo(page, PILOT.workshop.board.x, RETURN.laneY, { yFirst: true });
  await workshopToConcourse(page);
  await concourseToDeck(page);
  await expectStage(page, 'deck_closure');
}

/* ------------------------------------------------------------------ *
 * Deck: review panel
 * ------------------------------------------------------------------ */

export async function openReviewPanel(page: Page) {
  await openPromptAt(page, PILOT.deck.reviewPanel, {
    approachOffset: DECK_APPROACH.reviewPanel,
  });

  const body = await lastPromptBody(page);

  expect(body).not.toMatch(CLOSURE_FORBIDDEN_TEXT);

  return { body, labels: await promptCardLabels(page) };
}

/** Two-step record closure at the panel (arm, reopen, confirm). */
export async function closeStationRecord(page: Page) {
  const first = await openReviewPanel(page);

  expect(first.labels[0]).toMatch(/^Close the station record/);
  await selectPromptOption(page, 1);
  await page.waitForTimeout(400);
  expect((await closureProbe(page)).review_armed).toBe(true);
  expect((await closureProbe(page)).record_closed).toBe(false);

  const second = await openReviewPanel(page);

  expect(second.body).toContain('CONFIRM RECORD CLOSURE');
  await selectPromptOption(page, 1);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          __closureProbe?: { record_closed: boolean } | null;
        }
      ).__closureProbe?.record_closed === true,
    undefined,
    { timeout: 8000 },
  );
  await page.waitForTimeout(300);
  await expectStage(page, 'core_stabilise');
}

/* ------------------------------------------------------------------ *
 * Deck: feeds
 * ------------------------------------------------------------------ */

export async function approachFeed(page: Page, feed: FeedName) {
  const { at, off } = FEED_SITE[feed];

  // The clear y = 340 lane above the south machinery blocks, then down.
  await walkTo(page, at.x + off.x, at.y + off.y, { yFirst: false });
}

/** E at the feed station; resolves with the panel open (retried). */
export async function openFeedPanel(page: Page, feed: FeedName) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await approachFeed(page, feed);
    await press(page, 'Space');

    const opened = await waitFeedPanel(page, true, feed).then(
      () => true,
      () => false,
    );

    if (opened) {
      return (await feedPanel(page))!;
    }
  }

  throw new Error(`feed panel ${feed} did not open`);
}

/** E at the feed station expecting a REFUSAL (no panel); returns the feedback. */
export async function attemptFeedRefused(page: Page, feed: FeedName) {
  const { at, off } = FEED_SITE[feed];

  const before = await lastFeedback(page);

  // Positive wait for the refusal line itself (never a bare sleep); the
  // press is retried like every other driver (SwiftShader input-loss
  // precedent) so a swallowed key never reads a stale line as a refusal.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await interactAt(page, at, { approachOffset: off });

    const refused = await page
      .waitForFunction(
        (previous) => {
          const text =
            (window as unknown as { __lastRoomFeedbackText?: string | null })
              .__lastRoomFeedbackText ?? null;

          return text !== null && text !== previous;
        },
        before,
        { timeout: 3000 },
      )
      .then(
        () => true,
        () => false,
      );

    if (refused) {
      await page.waitForTimeout(250);
      expect((await feedPanel(page))?.open ?? false).toBe(false);

      return lastFeedback(page);
    }
  }

  throw new Error(`feed ${feed} was not refused (no new feedback line)`);
}

async function waitFeedReady(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __feedPanelProbe?: { ready: boolean } | null })
        .__feedPanelProbe?.ready === true,
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
}

async function stepBackFromPanel(page: Page) {
  await press(page, 'Enter');
  await waitFeedPanel(page, false);
}

/** Keyboard path for one feed (hold / steps / discrete commands). */
export async function raiseFeedKeyboard(page: Page, feed: FeedName) {
  await openFeedPanel(page, feed);

  switch (feed) {
    case 'coolant':
      await hold(page, 'ArrowRight', 2600);
      break;
    case 'calibration': {
      for (let step = 0; step < 7; step += 1) {
        await press(page, 'ArrowUp');
      }

      expect((await feedPanel(page))?.value).toBe(7);
      await press(page, 'Enter');
      break;
    }
    case 'distribution':
      await press(page, 'Space'); // lift
      expect((await feedPanel(page))?.coupler).toBe('rail');
      await hold(page, 'ArrowRight', 2400);
      await press(page, 'Space'); // seat
      break;
  }

  await waitFeedReady(page);
  await stepBackFromPanel(page);
}

/** Pointer path for one feed (drag the wheel / lever / coupler). */
export async function raiseFeedPointer(page: Page, feed: FeedName) {
  const probe = await openFeedPanel(page, feed);

  switch (feed) {
    case 'coolant': {
      const wheel = probe.geometry.wheel!;
      const radius = wheel.r - 4;
      const start = await toCanvas(page, wheel.x + radius, wheel.y);

      await page.mouse.move(start.x, start.y);
      await page.mouse.down();

      // Clockwise around the hub, 24 steps per quarter turn, until open.
      for (let step = 1; step <= 140; step += 1) {
        const angle = (step * Math.PI) / 48;
        const point = await toCanvas(
          page,
          wheel.x + Math.cos(angle) * radius,
          wheel.y + Math.sin(angle) * radius,
        );

        await page.mouse.move(point.x, point.y);

        if (step % 12 === 0 && (await feedPanel(page))?.ready) {
          break;
        }
      }

      await page.mouse.up();
      break;
    }
    case 'calibration': {
      const lever = probe.geometry.lever!;
      const track = probe.geometry.track!;
      const from = await toCanvas(
        page,
        lever.x + lever.w / 2,
        lever.y + lever.h / 2,
      );
      const targetY = track.y1 - (7 / 10) * (track.y1 - track.y0);
      const to = await toCanvas(page, lever.x + lever.w / 2, targetY);

      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, {
        steps: 8,
      });
      await page.mouse.move(to.x, to.y, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      expect((await feedPanel(page))?.value).toBe(7);

      const engage = probe.geometry.engage!;
      const button = await toCanvas(
        page,
        engage.x + engage.w / 2,
        engage.y + engage.h / 2,
      );

      await page.mouse.click(button.x, button.y);
      break;
    }
    case 'distribution': {
      const coupler = probe.geometry.coupler!;
      const socket = probe.geometry.socket!;
      const from = await toCanvas(
        page,
        coupler.x + coupler.w / 2,
        coupler.y + coupler.h / 2,
      );
      const to = await toCanvas(
        page,
        socket.x + socket.w / 2,
        socket.y + socket.h / 2,
      );

      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 10 });
      await page.mouse.move(to.x, to.y, { steps: 10 });
      await page.mouse.up();
      break;
    }
  }

  await waitFeedReady(page);
  await stepBackFromPanel(page);
}

export async function raiseAllFeeds(page: Page, mode: 'keyboard' | 'pointer') {
  for (const feed of ['coolant', 'calibration', 'distribution'] as const) {
    if (mode === 'keyboard') {
      await raiseFeedKeyboard(page, feed);
    } else {
      await raiseFeedPointer(page, feed);
    }
  }

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
}

/* ------------------------------------------------------------------ *
 * Core door / chamber
 * ------------------------------------------------------------------ */

/** E at the Core door expecting it SEALED; returns the feedback line. */
export async function attemptCoreDoorSealed(page: Page) {
  await interactAt(page, PILOT.deck.coreDoor, {
    approachOffset: DECK_APPROACH.coreDoor,
  });
  // Positive wait for the sealed line (never a bare sleep).
  await page.waitForFunction(
    () =>
      /^Core sealed/.test(
        (window as unknown as { __lastRoomFeedbackText?: string | null })
          .__lastRoomFeedbackText ?? '',
      ),
    undefined,
    { timeout: 6000 },
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __playerProbe?: { scene: string } | null })
          .__playerProbe?.scene,
    ),
  ).toBe('utility_core_deck');

  const feedback = await lastFeedback(page);

  expect(feedback).toMatch(/^Core sealed/);
  expect(feedback).not.toMatch(CLOSURE_FORBIDDEN_TEXT);

  return feedback;
}

export async function enterCoreChamber(page: Page) {
  await useDoor(page, PILOT.deck.coreDoor, 'core_chamber', {
    approachOffset: DECK_APPROACH.coreDoor,
  });
}

export async function leaveCoreChamber(page: Page) {
  await useDoor(page, PILOT.core.southDoor, 'utility_core_deck', {
    approachOffset: CORE_APPROACH.southDoor,
  });
}

export async function openCorePrompt(page: Page) {
  await openPromptAt(page, PILOT.core.core, {
    approachOffset: CORE_APPROACH.core,
  });

  const body = await lastPromptBody(page);

  expect(body).not.toMatch(CLOSURE_FORBIDDEN_TEXT);

  return { body, labels: await promptCardLabels(page) };
}

/** Opens the synchronisation review surface from the Core prompt. */
export async function openSyncReview(page: Page) {
  const { labels } = await openCorePrompt(page);
  const index = labels.findIndex((label) =>
    /synchronisation review/i.test(label),
  );

  expect(index).toBeGreaterThanOrEqual(0);
  await selectPromptOption(page, index + 1);
  await waitSurface(page, true, 'core_sync_review');

  const probe = (await surface(page))!;

  expect(`${probe.title}\n${probe.status}`).not.toMatch(CLOSURE_FORBIDDEN_TEXT);

  for (const element of probe.elements) {
    expect(element.label).not.toMatch(CLOSURE_FORBIDDEN_TEXT);
  }

  return probe;
}

export async function waitCoreState(
  page: Page,
  state: string,
  timeout = 12_000,
) {
  await page.waitForFunction(
    (expected) =>
      (
        window as unknown as {
          __closureProbe?: { core: { state: string } } | null;
        }
      ).__closureProbe?.core.state === expected,
    state,
    { timeout },
  );
  await page.waitForTimeout(250);
}

export async function waitCompletionNotice(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((
        window as unknown as {
          __coreChamberProbe?: { completion_open: boolean } | null;
        }
      ).__coreChamberProbe?.completion_open ?? false) === expected,
    open,
    { timeout: 12_000 },
  );
  await page.waitForTimeout(250);
}
