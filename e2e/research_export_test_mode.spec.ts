import type { Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  bootGame,
  dockToHub,
  getEvents,
  hold,
  hubToStationDoor,
  press,
  waitForRoomEntry,
} from './helpers';

/**
 * Test-only game-to-Supabase export integration (development ingestion
 * unit). Every test mocks the network with a same-origin route intercept —
 * the live development endpoint is NEVER called from this suite.
 *
 * Contract under test (see docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md):
 * - only sessions launched with `launch_mode=test` may submit;
 * - the first envelope build is frozen; retries resend identical bytes
 *   with the same export_id (201 first, 200 duplicate after);
 * - transport results are typed and separate from research data quality;
 * - participant-style completion never touches the transport;
 * - completing/exporting never navigates (no Qualtrics redirect).
 */

// Same-origin mock endpoint: no CORS preflight, fully intercepted below.
const INGEST_PATH = '/__e2e-mock__/functions/v1/ingest-research-session';
const INGEST_ROUTE = `**${INGEST_PATH}`;
const MOCK_KEY = 'sb_publishable_e2e_mock_only';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ExportResultLike {
  status: 'acknowledged' | 'refused' | 'failed';
  reason?: string;
  duplicate?: boolean;
  export_id?: string | null;
  http_status?: number | null;
  error_code?: string | null;
  server_received_at?: string | null;
}

interface EnvelopeLike {
  export_id: string;
  participant_id: string;
  game_session_id: string;
  launch_mode: string;
  client_created_at: string;
  payload: {
    game_version: string;
    asset_set_version: string;
    summary: Record<string, unknown>;
    raw_events: unknown[];
    data_quality: Record<string, unknown>;
    technical_errors: Record<string, unknown>;
  };
}

interface CapturedRequest {
  body: string;
  apikey: string | undefined;
  contentType: string | undefined;
}

/** DEV-only config hook: injected before the app boots. */
async function installExportConfig(page: Page, timeoutMs = 5_000) {
  await page.addInitScript(
    ({ path, key, timeout }) => {
      (
        window as unknown as {
          __researchExportConfig?: {
            ingestUrl: string;
            publishableKey: string;
            timeoutMs: number;
          };
        }
      ).__researchExportConfig = {
        ingestUrl: path,
        publishableKey: key,
        timeoutMs: timeout,
      };
    },
    { path: INGEST_PATH, key: MOCK_KEY, timeout: timeoutMs },
  );
}

function ackBody(exportId: string, duplicate: boolean) {
  return JSON.stringify({
    ok: true,
    acknowledged: true,
    duplicate,
    export_id: exportId,
    server_received_at: '2026-07-16T00:00:00.000Z',
  });
}

function errorBody(code: string) {
  return JSON.stringify({ ok: false, error: { code, message: code } });
}

/**
 * Minimal simulation of the development Edge Function's idempotency: 201
 * on first sight of an export_id, 200 duplicate for identical bytes, 409
 * for the same export_id with different payload bytes.
 */
function installIngestSimulator(page: Page, captured: CapturedRequest[]) {
  const seen = new Map<string, string>();

  return page.route(INGEST_ROUTE, async (route) => {
    const request = route.request();
    const body = request.postData() ?? '';

    captured.push({
      body,
      apikey: request.headers()['apikey'],
      contentType: request.headers()['content-type'],
    });

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

    if (previous === body) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ackBody(envelope.export_id, true),
      });
      return;
    }

    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: errorBody('export_id_conflict'),
    });
  });
}

function completeDebugSession(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        researchRuntime: {
          completeDebugSession: () => {
            summary: Record<string, unknown>;
            returnUrl: string | null;
          };
        };
      }
    ).researchRuntime.completeDebugSession(),
  );
}

function submitSessionExport(page: Page): Promise<ExportResultLike> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            submitSessionExport: () => Promise<unknown>;
          };
        }
      ).researchRuntime.submitSessionExport() as Promise<never>,
  );
}

function getLastExportResult(page: Page): Promise<ExportResultLike | null> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: {
            getLastExportResult: () => unknown;
          };
        }
      ).researchRuntime.getLastExportResult() as never,
  );
}

function waitForExportResult(page: Page) {
  return page.waitForFunction(
    () =>
      (
        window as unknown as {
          researchRuntime: { getLastExportResult: () => unknown };
        }
      ).researchRuntime.getLastExportResult() !== null,
    undefined,
    { timeout: 15_000 },
  );
}

test.describe('research export (test mode only)', () => {
  test('test-mode completion sends the full frozen envelope once and handles the 201 acknowledgement', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    await installExportConfig(page);
    await installIngestSimulator(page, captured);
    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P1',
      game_session_id: 'E2E_EXPORT_S1',
      condition: 'pilot',
      game_version: 'e2e',
      return_url: 'https://example.org/return?study=ro',
      launch_mode: 'test',
    });

    const completion = await completeDebugSession(page);
    const eventsAtCompletion = await getEvents(page);

    await waitForExportResult(page);

    const result = await getLastExportResult(page);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('acknowledged');
    expect(result?.duplicate).toBe(false);
    expect(result?.http_status).toBe(201);
    expect(result?.export_id).toMatch(UUID_V4);

    // Exactly one transport request, carrying the documented headers.
    expect(captured).toHaveLength(1);
    expect(captured[0].apikey).toBe(MOCK_KEY);
    expect(captured[0].contentType).toContain('application/json');

    // Exact envelope shape.
    const envelope = JSON.parse(captured[0].body) as EnvelopeLike;

    expect(Object.keys(envelope).sort()).toEqual([
      'client_created_at',
      'export_id',
      'game_session_id',
      'launch_mode',
      'participant_id',
      'payload',
    ]);
    expect(Object.keys(envelope.payload).sort()).toEqual([
      'asset_set_version',
      'data_quality',
      'game_version',
      'raw_events',
      'summary',
      'technical_errors',
    ]);

    expect(envelope.export_id).toMatch(UUID_V4);
    expect(envelope.export_id).toBe(result?.export_id);
    expect(envelope.participant_id).toBe('E2E_EXPORT_P1');
    expect(envelope.game_session_id).toBe('E2E_EXPORT_S1');
    expect(envelope.launch_mode).toBe('test');
    expect(Number.isFinite(Date.parse(envelope.client_created_at))).toBe(true);

    // Payload comes from existing instrumentation, not invented values.
    expect(envelope.payload.game_version).toBe('e2e');
    expect(envelope.payload.asset_set_version).toBe('outpost-assets-v1');
    expect(Object.keys(envelope.payload.summary).sort()).toEqual(
      Object.keys(completion.summary).sort(),
    );
    expect(envelope.payload.summary.completed).toBe(true);
    expect(envelope.payload.summary.participant_id).toBe('E2E_EXPORT_P1');
    // The envelope was frozen synchronously inside completeDebugSession,
    // so its raw event log matches the log observed just after completion
    // (including the objective_completed record).
    expect(envelope.payload.raw_events).toHaveLength(eventsAtCompletion.length);
    expect(
      (envelope.payload.raw_events as { event_type: string }[]).some(
        (event) => event.event_type === 'objective_completed',
      ),
    ).toBe(true);
    expect(Object.keys(envelope.payload.data_quality).sort()).toEqual([
      'focus_loss_count',
      'focus_loss_seconds',
      'technical_error_count',
    ]);
    expect(envelope.payload.technical_errors).toEqual({
      technical_error_count: envelope.payload.data_quality
        .technical_error_count as number,
    });

    // No Qualtrics redirect: the return URL stays a console preview and the
    // page never navigates away from the game.
    expect(completion.returnUrl).toContain('https://example.org/return');
    expect(page.url()).toContain('localhost:5173');
    expect(page.url()).toContain('launch_mode=test');
  });

  test('a retry and a reload both reuse the frozen export_id and are acknowledged as duplicates (200)', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    await installExportConfig(page);
    await installIngestSimulator(page, captured);

    const launch = {
      participant_id: 'E2E_EXPORT_P2',
      game_session_id: 'E2E_EXPORT_S2',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    };

    await bootGame(page, launch);
    await completeDebugSession(page);
    await waitForExportResult(page);

    const first = await getLastExportResult(page);

    expect(first?.status).toBe('acknowledged');
    expect(first?.duplicate).toBe(false);

    // Same-page retry: identical bytes, same export_id, duplicate ack.
    const retry = await submitSessionExport(page);

    expect(retry.status).toBe('acknowledged');
    expect(retry.duplicate).toBe(true);
    expect(retry.http_status).toBe(200);
    expect(retry.export_id).toBe(first?.export_id);

    // Reload (same tab, same session identity): the envelope survives in
    // sessionStorage, so the resend is byte-identical — never a 409.
    await bootGame(page, launch);

    const afterReload = await submitSessionExport(page);

    expect(afterReload.status).toBe('acknowledged');
    expect(afterReload.duplicate).toBe(true);
    expect(afterReload.export_id).toBe(first?.export_id);

    expect(captured).toHaveLength(3);
    expect(captured[1].body).toBe(captured[0].body);
    expect(captured[2].body).toBe(captured[0].body);
  });

  test('distinct completed sessions receive distinct export identifiers', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    await installExportConfig(page);
    await installIngestSimulator(page, captured);

    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P3',
      game_session_id: 'E2E_EXPORT_S3A',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    });
    await completeDebugSession(page);
    await waitForExportResult(page);

    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P3',
      game_session_id: 'E2E_EXPORT_S3B',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    });
    await completeDebugSession(page);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime: { getLastExportResult: () => unknown };
          }
        ).researchRuntime.getLastExportResult() !== null,
      undefined,
      { timeout: 15_000 },
    );

    expect(captured).toHaveLength(2);

    const [envelopeA, envelopeB] = captured.map(
      (request) => JSON.parse(request.body) as EnvelopeLike,
    );

    expect(envelopeA.export_id).toMatch(UUID_V4);
    expect(envelopeB.export_id).toMatch(UUID_V4);
    expect(envelopeB.export_id).not.toBe(envelopeA.export_id);
    expect(envelopeA.game_session_id).toBe('E2E_EXPORT_S3A');
    expect(envelopeB.game_session_id).toBe('E2E_EXPORT_S3B');
  });

  test('server failures map to typed transport results (401, 403, 409, malformed, network, timeout)', async ({
    page,
  }) => {
    const scripted: Array<(route: Route) => Promise<void>> = [
      (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: errorBody('unauthorized'),
        }),
      (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: errorBody('development_endpoint_only'),
        }),
      (route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: errorBody('export_id_conflict'),
        }),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html>definitely not json</html>',
        }),
      (route) => route.abort('failed'),
      async (route) => {
        // Never respond inside the client's 2.5s timeout window; the abort
        // below only cleans up after the client has already given up.
        await new Promise((resolve) => setTimeout(resolve, 6_000));
        await route.abort('failed').catch(() => undefined);
      },
    ];
    let call = 0;

    await installExportConfig(page, 2_500);
    await page.route(INGEST_ROUTE, async (route) => {
      const handler = scripted[Math.min(call, scripted.length - 1)];

      call += 1;
      await handler(route);
    });

    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P4',
      game_session_id: 'E2E_EXPORT_S4',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    });

    await completeDebugSession(page);
    await waitForExportResult(page);

    const unauthorized = await getLastExportResult(page);

    expect(unauthorized?.status).toBe('failed');
    expect(unauthorized?.reason).toBe('unauthorized');
    expect(unauthorized?.http_status).toBe(401);

    const forbidden = await submitSessionExport(page);

    expect(forbidden.status).toBe('failed');
    expect(forbidden.reason).toBe('forbidden');
    expect(forbidden.http_status).toBe(403);
    expect(forbidden.error_code).toBe('development_endpoint_only');

    const conflict = await submitSessionExport(page);

    expect(conflict.status).toBe('failed');
    expect(conflict.reason).toBe('export_id_conflict');
    expect(conflict.http_status).toBe(409);

    const malformed = await submitSessionExport(page);

    expect(malformed.status).toBe('failed');
    expect(malformed.reason).toBe('malformed_response');
    expect(malformed.http_status).toBe(200);

    const network = await submitSessionExport(page);

    expect(network.status).toBe('failed');
    expect(network.reason).toBe('network_error');
    expect(network.http_status).toBeNull();

    const timeout = await submitSessionExport(page);

    expect(timeout.status).toBe('failed');
    expect(timeout.reason).toBe('timeout');
    expect(timeout.http_status).toBeNull();

    // Every failure kept the same frozen export_id for a later retry.
    expect(timeout.export_id).toBe(unauthorized?.export_id);
  });

  test('missing configuration refuses without any network activity', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    // No config override installed; the dev server env has no ingest vars.
    await installIngestSimulator(page, captured);
    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P5',
      game_session_id: 'E2E_EXPORT_S5',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    });

    await completeDebugSession(page);
    await waitForExportResult(page);

    const result = await getLastExportResult(page);

    expect(result?.status).toBe('refused');
    expect(result?.reason).toBe('missing_configuration');
    expect(captured).toHaveLength(0);
  });

  test('non-test launch modes refuse to send even with configuration present', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    await installExportConfig(page);
    await installIngestSimulator(page, captured);

    // Participant-style launch: no launch_mode param at all.
    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P6',
      game_session_id: 'E2E_EXPORT_S6',
      condition: 'pilot',
      game_version: 'e2e',
    });
    await completeDebugSession(page);
    await waitForExportResult(page);

    expect((await getLastExportResult(page))?.status).toBe('refused');
    expect((await getLastExportResult(page))?.reason).toBe(
      'launch_mode_not_test',
    );

    // Explicit non-test mode is refused just the same.
    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P6',
      game_session_id: 'E2E_EXPORT_S6B',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'production',
    });

    const explicit = await submitSessionExport(page);

    expect(explicit.status).toBe('refused');
    expect(explicit.reason).toBe('launch_mode_not_test');
    expect(captured).toHaveLength(0);
  });

  test('throwing sessionStorage falls back safely and keeps a stable export_id for the page lifetime', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    await installExportConfig(page);
    await installIngestSimulator(page, captured);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new Error('sessionStorage disabled for this e2e test');
        },
      });
    });

    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P7',
      game_session_id: 'E2E_EXPORT_S7',
      condition: 'pilot',
      game_version: 'e2e',
      launch_mode: 'test',
    });

    await completeDebugSession(page);
    await waitForExportResult(page);

    const first = await getLastExportResult(page);

    expect(first?.status).toBe('acknowledged');
    expect(first?.duplicate).toBe(false);

    // The in-memory fallback still guarantees idempotency within the page
    // lifetime: a retry resends the same bytes and gets the duplicate ack.
    const retry = await submitSessionExport(page);

    expect(retry.status).toBe('acknowledged');
    expect(retry.duplicate).toBe(true);
    expect(retry.export_id).toBe(first?.export_id);
    expect(captured).toHaveLength(2);
    expect(captured[1].body).toBe(captured[0].body);
  });

  test('participant-style completion through the Final Core never calls the transport', async ({
    page,
  }) => {
    const captured: CapturedRequest[] = [];

    // Config IS present — the launch mode alone must keep the exporter off.
    await installExportConfig(page);
    await installIngestSimulator(page, captured);

    await bootGame(page, {
      participant_id: 'E2E_EXPORT_P8',
      game_session_id: 'E2E_EXPORT_S8',
      condition: 'pilot',
      game_version: 'e2e',
    });

    await dockToHub(page);
    await hubToStationDoor(page, 'final_core_room');
    await waitForRoomEntry(page, 'final_core_entered');

    // Core spawn -> core interface: up clamps under the alcove, then force
    // through the blocker (option 4) to reach final_core_completed.
    await hold(page, 'ArrowUp', 900);
    await press(page, 'Space');
    await press(page, '4');

    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            researchRuntime: { getEvents: () => { event_type: string }[] };
          }
        ).researchRuntime
          .getEvents()
          .some((event) => event.event_type === 'final_core_completed'),
      undefined,
      { timeout: 20_000 },
    );

    // Participant completion finished; the exporter never woke up.
    expect(captured).toHaveLength(0);
    expect(await getLastExportResult(page)).toBeNull();
    expect(page.url()).toContain('localhost:5173');
  });
});
