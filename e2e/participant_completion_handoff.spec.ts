/**
 * Pilot V3 Unit 2 — participant completion, export and survey handoff.
 *
 * PROVISIONAL(INT-1 / INT-2 / INT-4 / INT-5): these tests pin the
 * mechanism the decision pack recommends, not a ruling. Pure tests cover
 * the status axes and the return-URL policy; browser tests drive the real
 * Core Chamber synchronisation (developer inspection launch, so the whole
 * closure runs in under a minute) with a mocked ingestion endpoint and a
 * same-origin mock survey page, and assert:
 *
 * - a production-mode participant bundle path exports once (201) with the
 *   status axes and mission state, clears the device buffer on
 *   acknowledgement, and navigates to the validated survey URL carrying
 *   the summary and the axes;
 * - transient server failures are retried with the same frozen bytes;
 * - a permanently failing export still hands off, with
 *   export_status=failed, and keeps the device buffer;
 * - a disallowed return host never navigates (fallback panel), and neither
 *   does an absent return URL;
 * - a page hide before completion sends a keep-alive `incomplete` export;
 * - development-mode launches never export and never navigate.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  DEFAULT_RETURN_URL_ALLOWED_HOSTS,
  hostAllowed,
  parseAllowedHosts,
  validateReturnUrl,
} from '../src/systems/QualtricsBridge';
import type {
  ResearchExportContext,
  ResearchExportPayload,
} from '../src/systems/ResearchExportClient';
import {
  KEEPALIVE_BODY_LIMIT_BYTES,
  ResearchExportClient,
} from '../src/systems/ResearchExportClient';
import {
  exportAllowed,
  resolveLaunchMode,
  SessionStatusMachine,
} from '../src/systems/SessionStatus';
import {
  chamberProbe,
  CLOSURE_FORBIDDEN_TEXT,
  closureProbe,
  enterCoreChamber,
  openSyncReview,
  raiseAllFeeds,
  waitCompletionNotice,
  waitCoreState,
} from './closureHelpers';
import { getEvents } from './helpers';
import { keyActivate, surface } from './returnHelpers';

const INGEST_PATH = '/__e2e-mock__/functions/v1/ingest-research-session';
const INGEST_ROUTE = `**${INGEST_PATH}`;
const SURVEY_PATH = '/__e2e-mock__/survey';
const SURVEY_ROUTE = `**${SURVEY_PATH}**`;
const MOCK_KEY = 'sb_publishable_e2e_mock_only';
const DEV_HOST = `localhost:${Number(process.env.PW_DEV_PORT ?? 5173)}`;

interface CapturedRequest {
  body: string;
}

interface EnvelopeLike {
  export_id: string;
  participant_id: string;
  game_session_id: string;
  launch_mode: string;
  session_status: string;
  completion_reason: string | null;
  export_sequence: number;
  page_load_index: number;
  payload: {
    summary: Record<string, unknown>;
    raw_events: unknown[];
    prior_page_load_events: unknown[];
    mission_state: Record<string, unknown>;
    environment: Record<string, unknown>;
    event_integrity: Record<string, unknown>;
    raw_events_omitted?: boolean;
  };
}

interface HandoffLike {
  phase: string;
  export_status: string;
  export_attempts: number;
  last_export: { status: string; reason?: string; attempts?: number } | null;
  return_status: string;
  return_refusal: string | null;
  return_url: string | null;
}

/* ------------------------------------------------------------------ *
 * Pure: status axes and return-URL policy
 * ------------------------------------------------------------------ */

test.describe('status axes (pure, PROVISIONAL INT-5)', () => {
  test('launch mode resolves from the explicit signal only', () => {
    expect(resolveLaunchMode('test', true)).toEqual({
      launch_mode: 'test',
      launch_mode_raw: 'test',
    });
    expect(resolveLaunchMode('production', true).launch_mode).toBe(
      'production',
    );
    expect(resolveLaunchMode(null, true).launch_mode).toBe('development');
    expect(resolveLaunchMode(null, false).launch_mode).toBe('production');
    // A typo never silently becomes test data, and stays auditable.
    expect(resolveLaunchMode('tset', false)).toEqual({
      launch_mode: 'production',
      launch_mode_raw: 'tset',
    });
  });

  test('export permission: test always, production only from a bundle unless opted in, development never', () => {
    expect(exportAllowed('test', true)).toBe(true);
    expect(exportAllowed('test', false)).toBe(true);
    expect(exportAllowed('production', false)).toBe(true);
    expect(exportAllowed('production', true)).toBe(false);
    expect(exportAllowed('production', true, true)).toBe(true);
    expect(exportAllowed('development', true)).toBe(false);
    expect(exportAllowed('development', false)).toBe(false);
  });

  test('session transitions are one-way and export/return retries cycle through failed', () => {
    const machine = new SessionStatusMachine('production');

    expect(machine.snapshot()).toEqual({
      launch_mode: 'production',
      session_status: 'in_progress',
      completion_reason: null,
      export_status: 'pending',
      return_status: 'pending',
    });
    expect(machine.isTerminal()).toBe(false);
    expect(machine.markCompleted()).toBe(true);
    expect(machine.isTerminal()).toBe(true);
    expect(machine.markIncomplete()).toBe(false); // completed is terminal
    expect(machine.markError()).toBe(false);
    expect(machine.snapshot().completion_reason).toBe('terminal_room_reached');

    expect(machine.setExportStatus('failed')).toBe(true);
    expect(machine.setExportStatus('pending')).toBe(true); // retry
    expect(machine.setExportStatus('acknowledged')).toBe(true);
    expect(machine.setExportStatus('failed')).toBe(false); // terminal

    expect(machine.setReturnStatus('not_applicable')).toBe(true);
    expect(machine.setReturnStatus('returned')).toBe(false);

    const exit = new SessionStatusMachine('test');

    expect(exit.markIncomplete('participant_exit')).toBe(true);
    expect(exit.snapshot()).toMatchObject({
      session_status: 'incomplete',
      completion_reason: 'participant_exit',
    });
  });
});

test.describe('return-URL policy (pure, PROVISIONAL INT-4)', () => {
  const production = {
    allowedHosts: [...DEFAULT_RETURN_URL_ALLOWED_HOSTS],
    allowLocalhost: false,
  };
  const dev = {
    allowedHosts: [...DEFAULT_RETURN_URL_ALLOWED_HOSTS],
    allowLocalhost: true,
  };

  test('defaults to the survey platform and accepts subdomains only', () => {
    expect(parseAllowedHosts(undefined)).toEqual(['qualtrics.com']);
    expect(parseAllowedHosts(' *.Example.org , .study.example.net ,')).toEqual([
      'example.org',
      'study.example.net',
    ]);
    // Single-label entries would allow a whole top-level domain: ignored.
    expect(parseAllowedHosts('com, localhost')).toEqual(['qualtrics.com']);
    expect(parseAllowedHosts('com, study.example.net')).toEqual([
      'study.example.net',
    ]);
    expect(hostAllowed('unimelb.au1.qualtrics.com', ['qualtrics.com'])).toBe(
      true,
    );
    expect(hostAllowed('qualtrics.com', ['qualtrics.com'])).toBe(true);
    expect(hostAllowed('qualtrics.com.evil.example', ['qualtrics.com'])).toBe(
      false,
    );
    expect(hostAllowed('notqualtrics.com', ['qualtrics.com'])).toBe(false);
  });

  test('https to an allowed host passes; everything else is refused with a reason', () => {
    expect(
      validateReturnUrl(
        'https://x.qualtrics.com/jfe/form/SV_1?study=ro',
        production,
      ),
    ).toMatchObject({ ok: true });
    expect(validateReturnUrl(null, production)).toEqual({
      ok: false,
      reason: 'absent',
    });
    expect(validateReturnUrl('   ', production)).toEqual({
      ok: false,
      reason: 'absent',
    });
    expect(validateReturnUrl('http://x.qualtrics.com/', production)).toEqual({
      ok: false,
      reason: 'scheme_not_allowed',
    });
    expect(validateReturnUrl('https://evil.example/', production)).toEqual({
      ok: false,
      reason: 'host_not_allowed',
    });
    expect(validateReturnUrl('javascript:alert(1)', production)).toEqual({
      ok: false,
      reason: 'scheme_not_allowed',
    });
    expect(
      validateReturnUrl('https://user:pw@x.qualtrics.com/', production),
    ).toEqual({
      ok: false,
      reason: 'credentials_present',
    });
    expect(validateReturnUrl('https://[bad', production)).toEqual({
      ok: false,
      reason: 'unparseable',
    });
  });

  test('DEV builds additionally accept localhost over http, production builds do not', () => {
    expect(
      validateReturnUrl('http://localhost:5173/return', dev),
    ).toMatchObject({ ok: true });
    expect(
      validateReturnUrl('/relative/return', dev, 'http://localhost:5173/'),
    ).toMatchObject({
      ok: true,
    });
    expect(
      validateReturnUrl('http://localhost:5173/return', production),
    ).toEqual({
      ok: false,
      reason: 'scheme_not_allowed',
    });
    expect(validateReturnUrl('http://evil.example/', dev)).toEqual({
      ok: false,
      reason: 'scheme_not_allowed',
    });
  });
});

/* ------------------------------------------------------------------ *
 * Pure: export client — keep-alive trimming, status override, families
 * ------------------------------------------------------------------ */

test.describe('export client (pure)', () => {
  function bigPayload(events: number): ResearchExportPayload {
    return {
      game_version: 'pure',
      asset_set_version: 'outpost-assets-v5',
      summary: { completed: false } as never,
      raw_events: Array.from({ length: events }, (_, index) => ({
        session_id: 'S',
        timestamp_ms: index,
        scene: 'pure',
        event_type: `proto_pure_event_${index}`,
        sequence: index + 1,
        page_load_index: 1,
        metadata: { padding: 'x'.repeat(400) },
      })),
      data_quality: {
        focus_loss_count: 0,
        focus_loss_seconds: 0,
        technical_error_count: 0,
      },
      technical_errors: { technical_error_count: 0 },
      page_load_index: 1,
      prior_page_load_events: [
        {
          session_id: 'S',
          timestamp_ms: 0,
          scene: 'pure',
          event_type: 'prior',
          sequence: 0,
        },
      ],
      event_integrity: {
        page_load_index: 1,
        first_sequence: 1,
        last_sequence: events,
        event_count: events,
        prior_page_load_event_count: 1,
        expected_event_count: events,
        sequence_gap_count: 0,
        sequence_duplicate_count: 0,
        durable_store: 'durable',
        durable_event_count: events,
        recovered_from_chunks: false,
        foreign_records_rejected: 0,
        store_evictions: 0,
      },
      mission_state: { current_room_id: 'pure' } as never,
      environment: { prefers_reduced_motion: null },
    };
  }

  function clientWith(
    payload: ResearchExportPayload,
    context: Partial<ResearchExportContext> = {},
  ) {
    return new ResearchExportClient({
      getContext: () => ({
        launch_mode: 'test',
        export_allowed: true,
        session_status: 'in_progress',
        completion_reason: null,
        ...context,
      }),
      getConfig: () => ({
        ingestUrl: 'http://ingest.local/x',
        publishableKey: 'k',
      }),
      getSessionIdentity: () => ({
        participant_id: 'P',
        game_session_id: 'S',
        page_load_index: 1,
      }),
      buildPayload: () => payload,
    });
  }

  function captureFetch() {
    const calls: { body: string; keepalive: boolean | undefined }[] = [];
    const original = globalThis.fetch;

    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      calls.push({
        body: String(init?.body),
        keepalive: init?.keepalive,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          acknowledged: true,
          duplicate: false,
          export_id: (JSON.parse(String(init?.body)) as { export_id: string })
            .export_id,
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    return { calls, restore: () => (globalThis.fetch = original) };
  }

  test('keep-alive freshness (P12): a later page hide with new events sends a fresh envelope; a retry without new events re-sends the same bytes', () => {
    const { calls, restore } = captureFetch();
    let lastSequence = 10;

    try {
      const client = new ResearchExportClient({
        getContext: () => ({
          launch_mode: 'test',
          export_allowed: true,
          session_status: 'in_progress',
          completion_reason: null,
        }),
        getConfig: () => ({
          ingestUrl: 'http://ingest.local/x',
          publishableKey: 'k',
        }),
        getSessionIdentity: () => ({
          participant_id: 'P_FRESH',
          game_session_id: 'S_FRESH',
          page_load_index: 1,
          last_sequence: lastSequence,
        }),
        buildPayload: () =>
          ({ ...bigPayload(1), marker: lastSequence }) as never,
      });
      const hide = () =>
        client.submitKeepalive({
          session_status: 'incomplete',
          completion_reason: 'participant_exit',
        });

      expect(hide()).toBe(true);
      expect(hide()).toBe(true); // same sequence: identical retry
      lastSequence = 25; // the participant kept playing
      expect(hide()).toBe(true);

      const bodies = calls.map((call) => call.body);
      const ids = bodies.map(
        (body) => (JSON.parse(body) as { export_id: string }).export_id,
      );

      expect(bodies[1]).toBe(bodies[0]);
      expect(ids[2]).not.toBe(ids[0]);
      expect(
        (JSON.parse(bodies[2]) as { payload: { marker: number } }).payload
          .marker,
      ).toBe(25);
    } finally {
      restore();
    }
  });

  test('a keep-alive export over the browser cap keeps the most recent events and says how many it dropped', () => {
    const { calls, restore } = captureFetch();

    try {
      const client = clientWith(bigPayload(400));

      expect(
        client.submitKeepalive({
          session_status: 'incomplete',
          completion_reason: 'participant_exit',
        }),
      ).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].keepalive).toBe(true);
      expect(Buffer.byteLength(calls[0].body, 'utf8')).toBeLessThanOrEqual(
        KEEPALIVE_BODY_LIMIT_BYTES,
      );

      const envelope = JSON.parse(calls[0].body) as {
        session_status: string;
        completion_reason: string;
        payload: {
          raw_events: { sequence: number }[];
          prior_page_load_events: unknown[];
          raw_events_omitted?: boolean;
          raw_events_omitted_count?: number;
        };
      };

      expect(envelope.session_status).toBe('incomplete');
      expect(envelope.completion_reason).toBe('participant_exit');
      expect(envelope.payload.raw_events_omitted).toBe(true);
      expect(envelope.payload.prior_page_load_events).toEqual([]);
      expect(envelope.payload.raw_events.length).toBeGreaterThan(0);
      expect(envelope.payload.raw_events.length).toBeLessThan(400);
      expect(envelope.payload.raw_events_omitted_count).toBe(
        400 - envelope.payload.raw_events.length,
      );
      // The most recent events survive, not the oldest.
      expect(envelope.payload.raw_events.at(-1)?.sequence).toBe(400);
    } finally {
      restore();
    }
  });

  test('a small keep-alive export carries every event untrimmed', () => {
    const { calls, restore } = captureFetch();

    try {
      clientWith(bigPayload(5)).submitKeepalive({
        session_status: 'incomplete',
        completion_reason: 'participant_exit',
      });

      const envelope = JSON.parse(calls[0].body) as {
        payload: { raw_events: unknown[]; raw_events_omitted?: boolean };
      };

      expect(envelope.payload.raw_events).toHaveLength(5);
      expect(envelope.payload.raw_events_omitted ?? false).toBe(false);
    } finally {
      restore();
    }
  });

  test('debug and participant completions freeze separate envelopes', async () => {
    const { calls, restore } = captureFetch();

    try {
      const client = clientWith(bigPayload(3), {
        session_status: 'completed',
        completion_reason: 'terminal_room_reached',
      });
      const debug = await client.submit({ attempts: 1, kind: 'debug' });
      const participant = await client.submit({ attempts: 1 });
      const participantAgain = await client.submit({ attempts: 1 });

      expect(debug.status).toBe('acknowledged');
      expect(participant.status).toBe('acknowledged');
      expect((debug as { export_id: string }).export_id).not.toBe(
        (participant as { export_id: string }).export_id,
      );
      expect((participantAgain as { export_id: string }).export_id).toBe(
        (participant as { export_id: string }).export_id,
      );
      expect(calls[2].body).toBe(calls[1].body);
    } finally {
      restore();
    }
  });
});

/* ------------------------------------------------------------------ *
 * Browser helpers
 * ------------------------------------------------------------------ */

function ackBody(exportId: string, duplicate: boolean) {
  return JSON.stringify({
    ok: true,
    acknowledged: true,
    duplicate,
    export_id: exportId,
    server_received_at: '2026-09-04T00:00:00.000Z',
  });
}

async function installConfig(
  page: Page,
  options: {
    allowProductionInDev?: boolean;
    timeoutMs?: number;
    /** Long enough to read the settled notice before the page navigates. */
    autoNavigateDelayMs?: number;
  } = {},
) {
  await page.addInitScript(
    ({ path, key, allowProductionInDev, timeoutMs, autoNavigateDelayMs }) => {
      (
        window as unknown as { __researchExportConfig?: unknown }
      ).__researchExportConfig = {
        ingestUrl: path,
        publishableKey: key,
        timeoutMs,
        allowProductionInDev,
        autoNavigateDelayMs,
      };
    },
    {
      path: INGEST_PATH,
      key: MOCK_KEY,
      allowProductionInDev: options.allowProductionInDev ?? false,
      timeoutMs: options.timeoutMs ?? 2_500,
      autoNavigateDelayMs: options.autoNavigateDelayMs ?? 5_000,
    },
  );
}

/** Idempotent ingest simulator with an optional scripted failure prefix. */
function installIngest(
  page: Page,
  captured: CapturedRequest[],
  failFirst = 0,
  failStatus = 503,
) {
  const seen = new Map<string, string>();
  let calls = 0;

  return page.route(INGEST_ROUTE, async (route) => {
    const request = route.request();
    const body = request.postData() ?? '';

    captured.push({ body });
    calls += 1;

    if (calls <= failFirst) {
      await route.fulfill({
        status: failStatus,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'storage_failed' } }),
      });
      return;
    }

    const envelope = JSON.parse(body) as EnvelopeLike;
    const previous = seen.get(envelope.export_id);

    if (previous === undefined) {
      seen.set(envelope.export_id, body);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: ackBody(envelope.export_id, false),
      });
      return;
    }

    await route.fulfill({
      status: previous === body ? 200 : 409,
      contentType: 'application/json',
      body:
        previous === body
          ? ackBody(envelope.export_id, true)
          : JSON.stringify({
              ok: false,
              error: { code: 'export_id_conflict' },
            }),
    });
  });
}

function installSurvey(page: Page) {
  return page.route(SURVEY_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>mock survey</title><p id="survey">survey</p>',
    }),
  );
}

/**
 * Developer inspection launch straight into the Utility Deck: the whole
 * closure (feeds → chamber → arm → confirm → stable) runs in well under a
 * minute, and the pipeline is exercised exactly as on the participant route
 * (the same finishRamp call).
 */
async function bootDeckInspection(
  page: Page,
  tag: string,
  extra: Record<string, string>,
) {
  const params = new URLSearchParams({
    participant_id: `PT_HANDOFF_${tag}`,
    game_session_id: `GS_HANDOFF_${tag}`,
    scene: 'utility_core_deck',
    dev_closure: 'inspect',
    ...extra,
  });

  await page.goto(`/?${params.toString()}`);
  await page.waitForFunction(
    () =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === 'utility_core_deck',
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(1200);
}

async function synchroniseCore(page: Page) {
  await raiseAllFeeds(page, 'keyboard');
  await enterCoreChamber(page);
  await openSyncReview(page);
  await keyActivate(page, 'arm_sync');
  await waitCoreState(page, 'confirmation_armed');
  await keyActivate(page, 'confirm_sync');
  await waitCoreState(page, 'stable', 20_000);
  await waitCompletionNotice(page, true);
}

function handoff(page: Page): Promise<HandoffLike> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { getHandoffState: () => unknown };
        }
      ).researchRuntime.getHandoffState() as never,
  );
}

function waitForNoticeElement(page: Page, id: string, timeout = 10_000) {
  return page.waitForFunction(
    (expected) =>
      (
        (
          window as unknown as {
            __workSurfaceProbe?: { elements: { id: string }[] } | null;
          }
        ).__workSurfaceProbe?.elements ?? []
      ).some((element) => element.id === expected),
    id,
    { timeout },
  );
}

function waitHandoffPhase(page: Page, phases: string[], timeout = 20_000) {
  return page.waitForFunction(
    (expected) =>
      expected.includes(
        (
          window as unknown as {
            __handoffProbe?: { phase: string } | null;
          }
        ).__handoffProbe?.phase ?? '',
      ),
    phases,
    { timeout },
  );
}

function waitForSurvey(page: Page, timeout = 20_000) {
  return page.waitForURL((url) => url.pathname === SURVEY_PATH, { timeout });
}

function surveyParams(page: Page) {
  return new URL(page.url()).searchParams;
}

/** Every line of the notice must pass the closure forbidden-text bar. */
function expectNoticeClean(notice: {
  title: string | null;
  status: string | null;
  elements: { label: string }[];
}) {
  expect(`${notice.title}\n${notice.status}`).not.toMatch(
    CLOSURE_FORBIDDEN_TEXT,
  );

  for (const element of notice.elements) {
    expect(element.label).not.toMatch(CLOSURE_FORBIDDEN_TEXT);
  }
}

function submitSessionExport(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { submitSessionExport: () => Promise<unknown> };
        }
      ).researchRuntime.submitSessionExport() as Promise<{
        status: string;
        duplicate?: boolean;
        export_id?: string;
        http_status?: number;
      }>,
  );
}

function eventStoreKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((key) =>
      key.startsWith('research-events:v1:'),
    ),
  );
}

/* ------------------------------------------------------------------ *
 * Browser: the participant pipeline
 * ------------------------------------------------------------------ */

test.describe('participant completion handoff (browser)', () => {
  test('production path: one acknowledged export with status axes, buffer cleared, automatic navigation to the validated survey URL', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page, { allowProductionInDev: true });
    await installIngest(page, captured);
    await installSurvey(page);
    await bootDeckInspection(page, 'prod', {
      launch_mode: 'production',
      condition: 'pilot',
      return_url: `http://${DEV_HOST}${SURVEY_PATH}?study=ro`,
    });

    expect(
      await page.evaluate(() =>
        (
          window as unknown as {
            researchRuntime: { getSessionStatus: () => unknown };
          }
        ).researchRuntime.getSessionStatus(),
      ),
    ).toMatchObject({
      launch_mode: 'production',
      session_status: 'in_progress',
      export_status: 'pending',
      return_status: 'pending',
    });

    // Nothing leaves the browser before the terminal state.
    expect(captured).toHaveLength(0);

    const eventsBefore = await getEvents(page);
    const keysBefore = await eventStoreKeys(page);

    expect(keysBefore.length).toBeGreaterThan(0);

    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled', 'navigating']);

    const settled = await handoff(page);

    expect(settled.export_status).toBe('acknowledged');
    expect(settled.last_export).toMatchObject({
      status: 'acknowledged',
      attempts: 1,
    });
    expect(settled.return_refusal).toBeNull();
    expect(settled.return_url).toContain(SURVEY_PATH);

    // The notice reflects the settled state, neutrally; the controls appear
    // a beat later, continue first (keyboard focus lands on it).
    await waitForNoticeElement(page, 'continue_survey');

    const notice = (await surface(page))!;
    const labels = notice.elements.map((e) => e.label);

    expect(notice.surface_id).toBe('core_completion_notice');
    expect(labels.join('\n')).toContain('received by the study server');
    expect(labels.join('\n')).toContain('Questionnaire handoff: prepared');
    expect(labels.join('\n')).toMatch(/opens automatically in \d+ s/);
    expect(notice.elements.map((e) => e.id)).toContain('continue_survey');
    expect(notice.elements.map((e) => e.id)).toContain('close_notice');
    expect(notice.focus).toBe('continue_survey');
    expectNoticeClean(notice);

    // Exactly one export, production-labelled, carrying the axes and the
    // reproducibility context. The summary is computed as completed.
    expect(captured).toHaveLength(1);

    const envelope = JSON.parse(captured[0].body) as EnvelopeLike;

    expect(envelope).toMatchObject({
      launch_mode: 'production',
      session_status: 'completed',
      completion_reason: 'terminal_room_reached',
      export_sequence: 1,
      page_load_index: 1,
      participant_id: 'PT_HANDOFF_prod',
    });
    expect(envelope.payload.summary.completed).toBe(true);
    expect(envelope.payload.raw_events.length).toBeGreaterThan(
      eventsBefore.length,
    );
    expect(envelope.payload.mission_state).toMatchObject({
      current_room_id: expect.any(String),
    });
    expect(envelope.payload.environment).toEqual({
      prefers_reduced_motion: false,
    });
    expect(envelope.payload.event_integrity).toMatchObject({
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
    });
    expect(
      (envelope.payload.raw_events as { event_type: string }[]).some(
        (event) => event.event_type === 'pilot_closure_stable',
      ),
    ).toBe(true);
    // The participant pipeline never logs the legacy debug completion.
    expect(
      (envelope.payload.raw_events as { event_type: string }[]).some(
        (event) => event.event_type === 'objective_completed',
      ),
    ).toBe(false);

    // The developer console retry is a distinct envelope family (debug),
    // so it can never resend stale bytes for the participant pipeline: it
    // gets its own export (201), and the participant export stays the
    // single acknowledged record.
    const debugRetry = await submitSessionExport(page);

    expect(debugRetry.status).toBe('acknowledged');
    expect(debugRetry.export_id).not.toBe(envelope.export_id);
    expect(captured).toHaveLength(2);

    // Automatic navigation (Option A) to the validated survey URL with the
    // summary variables and the PROVISIONAL(INT-5) axes.
    await waitForSurvey(page);

    const params = surveyParams(page);

    expect(params.get('study')).toBe('ro');
    expect(params.get('participant_id')).toBe('PT_HANDOFF_prod');
    expect(params.get('completed')).toBe('true');
    expect(params.get('game_inappropriate_persistence')).not.toBeNull();
    expect(params.get('launch_mode')).toBe('production');
    expect(params.get('session_status')).toBe('completed');
    expect(params.get('completion_reason')).toBe('terminal_room_reached');
    expect(params.get('export_status')).toBe('acknowledged');
    expect(params.get('return_status')).toBe('returned');
    expect(params.get('export_id')).toBe(envelope.export_id);
    expect(params.get('page_load_index')).toBe('1');

    // The device buffer is retained (count/age retention, never cleared on
    // acknowledgement — its sequence high-water mark must survive a later
    // page load); the navigation itself sent no keep-alive export because
    // the session was terminal.
    const keysAfter = await eventStoreKeys(page);

    expect(keysAfter.some((key) => key.includes('PT_HANDOFF_prod'))).toBe(true);
    expect(captured).toHaveLength(2);
  });

  test('an https survey URL on the allow-listed host is navigated to end to end', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page, { autoNavigateDelayMs: 1_000 });
    await installIngest(page, captured);
    await page.route('https://study.au1.qualtrics.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>qualtrics mock</title><p>survey</p>',
      }),
    );
    await bootDeckInspection(page, 'https', {
      launch_mode: 'test',
      return_url: 'https://study.au1.qualtrics.com/jfe/form/SV_1?Q_R=1',
    });
    await synchroniseCore(page);
    await page.waitForURL((url) => url.hostname === 'study.au1.qualtrics.com', {
      timeout: 30_000,
    });

    const url = new URL(page.url());

    expect(url.protocol).toBe('https:');
    expect(url.pathname).toBe('/jfe/form/SV_1');
    expect(url.searchParams.get('Q_R')).toBe('1');
    expect(url.searchParams.get('session_status')).toBe('completed');
    expect(url.searchParams.get('export_status')).toBe('acknowledged');
  });

  test('transient server failures are retried with identical bytes before the handoff', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured, 2);
    await installSurvey(page);
    await bootDeckInspection(page, 'retry', {
      launch_mode: 'test',
      return_url: `http://${DEV_HOST}${SURVEY_PATH}`,
    });
    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled', 'navigating'], 40_000);

    const settled = await handoff(page);

    expect(settled.export_status).toBe('acknowledged');
    expect(settled.last_export).toMatchObject({
      status: 'acknowledged',
      attempts: 3,
    });
    expect(captured).toHaveLength(3);
    expect(captured[1].body).toBe(captured[0].body);
    expect(captured[2].body).toBe(captured[0].body);
    expect((JSON.parse(captured[0].body) as EnvelopeLike).launch_mode).toBe(
      'test',
    );

    await waitForSurvey(page);
    expect(surveyParams(page).get('export_status')).toBe('acknowledged');
  });

  test('a permanently failing export never blocks the survey: export_status=failed rides on the return URL and the device buffer is kept', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured, 99);
    await installSurvey(page);
    await bootDeckInspection(page, 'fail', {
      launch_mode: 'test',
      return_url: `http://${DEV_HOST}${SURVEY_PATH}`,
    });
    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled', 'navigating'], 40_000);

    const settled = await handoff(page);

    expect(settled.export_status).toBe('failed');
    expect(settled.last_export).toMatchObject({
      status: 'failed',
      reason: 'unexpected_status',
      attempts: 3,
    });
    expect(captured).toHaveLength(3);

    await waitForNoticeElement(page, 'continue_survey');

    const notice = (await surface(page))!;
    const labels = notice.elements.map((e) => e.label).join('\n');

    expect(labels).toContain('kept on this device');
    expect(labels).toContain('mention the unsent data');
    expectNoticeClean(notice);
    // No automatic navigation after a failed export: the participant is
    // never carried past the recovery instruction.
    expect(settled.return_url).not.toBeNull();
    await page.waitForTimeout(2500);
    expect(new URL(page.url()).pathname).toBe('/');

    await keyActivate(page, 'continue_survey');
    await waitForSurvey(page);

    const params = surveyParams(page);

    expect(params.get('export_status')).toBe('failed');
    expect(params.get('session_status')).toBe('completed');
    expect(params.get('export_id')).toMatch(/^[0-9a-f-]{36}$/);

    // Buffer retained for later recovery (same origin, so readable here).
    const keys = await eventStoreKeys(page);

    expect(keys.some((key) => key.includes('PT_HANDOFF_fail'))).toBe(true);
  });

  test('a disallowed return host never navigates: fallback notice, no survey control, return_status=failed', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured);
    await bootDeckInspection(page, 'host', {
      launch_mode: 'test',
      return_url: 'https://evil.example/steal?x=1',
    });
    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled']);

    const settled = await handoff(page);

    expect(settled.export_status).toBe('acknowledged');
    expect(settled.return_status).toBe('failed');
    expect(settled.return_refusal).toBe('host_not_allowed');
    expect(settled.return_url).toBeNull();

    await waitForNoticeElement(page, 'close_notice');

    const notice = (await surface(page))!;

    expect(notice.elements.map((e) => e.id)).not.toContain('continue_survey');
    expect(notice.elements.map((e) => e.label).join('\n')).toContain(
      'could not be used here',
    );

    expectNoticeClean(notice);

    // Nothing navigates on its own either: the settled state carries no
    // destination at all (return_url null), so no timer and no control.
    await page.waitForTimeout(1500);

    const stayed = new URL(page.url());

    expect(stayed.host).toBe(DEV_HOST);
    expect(stayed.pathname).toBe('/');
    expect((await chamberProbe(page))?.completion_open).toBe(true);
    expect((await closureProbe(page)).core.state).toBe('stable');
  });

  test('an absent return URL is not_applicable: no navigation, neutral notice', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured);
    await bootDeckInspection(page, 'nourl', { launch_mode: 'test' });
    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled']);

    const settled = await handoff(page);

    expect(settled.return_status).toBe('not_applicable');
    expect(settled.return_refusal).toBe('absent');

    const notice = (await surface(page))!;

    expect(notice.elements.map((e) => e.label).join('\n')).toContain(
      'no survey link was provided',
    );
    expectNoticeClean(notice);
    await page.waitForTimeout(1500);
    expect(page.url()).toContain(DEV_HOST);
  });

  test('a page hide before completion sends one keep-alive incomplete export; a later load of the same identity carries the events forward', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured);
    await installSurvey(page);
    await bootDeckInspection(page, 'exit', { launch_mode: 'test' });

    const eventsBeforeExit = await getEvents(page);

    // Leaving the page mid-session (tab close / navigation away). The
    // keep-alive request completes after the page is gone; poll for it.
    await page.goto(`${SURVEY_PATH}?left=1`);
    await expect.poll(() => captured.length, { timeout: 10_000 }).toBe(1);

    const incomplete = JSON.parse(captured[0].body) as EnvelopeLike;

    expect(incomplete).toMatchObject({
      launch_mode: 'test',
      session_status: 'incomplete',
      completion_reason: 'participant_exit',
      page_load_index: 1,
    });
    expect(incomplete.payload.summary.completed).toBe(false);
    // A near-empty inspection session fits the keep-alive cap; the trimming
    // branch is proven in the pure client tests below.
    expect(incomplete.payload.raw_events_omitted ?? false).toBe(false);
    expect(incomplete.payload.raw_events.length).toBeGreaterThanOrEqual(
      eventsBeforeExit.length,
    );

    // The same identity comes back: page load 2 recovers everything and
    // its completion export is a new, distinct record.
    await bootDeckInspection(page, 'exit', { launch_mode: 'test' });

    expect(
      await page.evaluate(() =>
        (
          window as unknown as {
            researchRuntime: { getEventIntegrity: () => unknown };
          }
        ).researchRuntime.getEventIntegrity(),
      ),
    ).toMatchObject({
      page_load_index: 2,
      prior_page_load_event_count: incomplete.payload.raw_events.length,
      sequence_gap_count: 0,
    });

    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled']);

    expect(captured).toHaveLength(2);

    const completed = JSON.parse(captured[1].body) as EnvelopeLike;

    expect(completed.export_id).not.toBe(incomplete.export_id);
    expect(completed).toMatchObject({
      session_status: 'completed',
      page_load_index: 2,
    });
    expect(completed.payload.prior_page_load_events).toHaveLength(
      incomplete.payload.raw_events.length,
    );
  });

  test('development launches (no launch_mode) export nothing and navigate nowhere, and the notice stays neutral', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    const captured: CapturedRequest[] = [];

    await installConfig(page);
    await installIngest(page, captured);
    await installSurvey(page);
    await bootDeckInspection(page, 'dev', {
      return_url: `http://${DEV_HOST}${SURVEY_PATH}`,
    });
    await synchroniseCore(page);
    await waitHandoffPhase(page, ['settled', 'navigating']);

    const settled = await handoff(page);

    expect(settled.export_status).toBe('not_applicable');
    expect(settled.last_export).toMatchObject({
      status: 'refused',
      reason: 'launch_mode_not_allowed',
    });
    expect(captured).toHaveLength(0);

    const notice = (await surface(page))!;

    expect(notice.elements.map((e) => e.label).join('\n')).toContain(
      'no study server is configured',
    );

    // A validated return URL still hands off (development mode is about
    // export, not about the survey), carrying export_status=not_applicable.
    await waitForSurvey(page);
    expect(surveyParams(page).get('launch_mode')).toBe('development');
    expect(surveyParams(page).get('export_status')).toBe('not_applicable');
    expect(surveyParams(page).get('export_refusal')).toBe(
      'launch_mode_not_allowed',
    );
    expect(captured).toHaveLength(0);
  });
});
