/**
 * Pilot V3 Unit 3 — the REAL client against an ISOLATED Supabase stack.
 *
 * Skipped unless `SUPABASE_LOCAL_INGEST_URL` and `SUPABASE_LOCAL_ANON_KEY`
 * are set (the local CLI stack: `supabase start`, API on :54321). Drives
 * the actual completion pipeline (developer inspection launch,
 * `launch_mode=test`) with the export config pointed at the live local
 * Edge Function, then reads the row back through PostgREST with the
 * service-role key and checks the write / duplicate / hash facts.
 *
 * Never points at a remote project: the URL must be a loopback host.
 */
import { createHash } from 'node:crypto';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  enterCoreChamber,
  openSyncReview,
  raiseAllFeeds,
  waitCompletionNotice,
  waitCoreState,
} from './closureHelpers';
import { keyActivate } from './returnHelpers';

const INGEST_URL = process.env.SUPABASE_LOCAL_INGEST_URL ?? '';
const ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_LOCAL_SERVICE_KEY ?? '';

function isLoopback(url: string): boolean {
  try {
    const host = new URL(url).hostname;

    return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
  } catch {
    return false;
  }
}

async function bootDeckInspection(page: Page, tag: string) {
  const params = new URLSearchParams({
    participant_id: `PT_LIVE_${tag}`,
    game_session_id: `GS_LIVE_${tag}`,
    scene: 'utility_core_deck',
    dev_closure: 'inspect',
    launch_mode: 'test',
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

test.describe('isolated Supabase round-trip (real client, local stack)', () => {
  test.skip(
    INGEST_URL === '' || ANON_KEY === '' || SERVICE_KEY === '',
    'set SUPABASE_LOCAL_INGEST_URL / SUPABASE_LOCAL_ANON_KEY / SUPABASE_LOCAL_SERVICE_KEY',
  );

  test('the completion pipeline writes one acknowledged row; a retry is a duplicate; the stored hash matches', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    expect(isLoopback(INGEST_URL)).toBe(true);

    const tag = `${Date.now()}`;
    const requests: { url: string; method: string }[] = [];

    page.on('request', (request) => {
      if (request.url().startsWith(INGEST_URL)) {
        requests.push({ url: request.url(), method: request.method() });
      }
    });

    await page.addInitScript(
      ({ url, key }) => {
        (
          window as unknown as { __researchExportConfig?: unknown }
        ).__researchExportConfig = {
          ingestUrl: url,
          publishableKey: key,
          timeoutMs: 15_000,
          autoNavigateDelayMs: 60_000,
        };
      },
      { url: INGEST_URL, key: ANON_KEY },
    );

    await bootDeckInspection(page, tag);
    await raiseAllFeeds(page, 'keyboard');
    await enterCoreChamber(page);
    await openSyncReview(page);
    await keyActivate(page, 'arm_sync');
    await waitCoreState(page, 'confirmation_armed');
    await keyActivate(page, 'confirm_sync');
    await waitCoreState(page, 'stable', 20_000);
    await waitCompletionNotice(page, true);
    await page.waitForFunction(
      () =>
        (
          window as unknown as {
            __handoffProbe?: { phase: string } | null;
          }
        ).__handoffProbe?.phase === 'settled',
      undefined,
      { timeout: 60_000 },
    );

    const handoff = await page.evaluate(
      () =>
        (
          window as unknown as {
            researchRuntime: { getHandoffState: () => unknown };
          }
        ).researchRuntime.getHandoffState() as {
          export_status: string;
          last_export: {
            status: string;
            duplicate?: boolean;
            export_id?: string;
            http_status?: number;
            attempts?: number;
          } | null;
        },
    );

    expect(handoff.export_status).toBe('acknowledged');
    expect(handoff.last_export).toMatchObject({
      status: 'acknowledged',
      duplicate: false,
      http_status: 201,
      attempts: 1,
    });

    // The POST was cross-origin (dev server → stack), so it succeeded only
    // because the preflight passed; Chromium does not surface preflights
    // as page requests, so the CORS contract is checked directly.
    expect(requests.map((request) => request.method)).toContain('POST');

    const preflight = await fetch(INGEST_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5352',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'apikey, content-type',
      },
    });

    expect([200, 204]).toContain(preflight.status);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
    expect(
      preflight.headers.get('access-control-allow-headers')?.toLowerCase(),
    ).toContain('apikey');

    const exportId = handoff.last_export?.export_id ?? '';

    // Retry from the developer console: distinct envelope family, its own
    // acknowledged row (201), never a stale duplicate of the pipeline's.
    const retry = await page.evaluate(
      () =>
        (
          window as unknown as {
            researchRuntime: { submitSessionExport: () => Promise<unknown> };
          }
        ).researchRuntime.submitSessionExport() as Promise<{
          status: string;
          export_id?: string;
          http_status?: number;
        }>,
    );

    expect(retry.status).toBe('acknowledged');
    expect(retry.http_status).toBe(201);
    expect(retry.export_id).not.toBe(exportId);

    // A second call of the same family is the frozen envelope → 200 duplicate.
    const retryAgain = await page.evaluate(
      () =>
        (
          window as unknown as {
            researchRuntime: { submitSessionExport: () => Promise<unknown> };
          }
        ).researchRuntime.submitSessionExport() as Promise<{
          status: string;
          duplicate?: boolean;
          http_status?: number;
          export_id?: string;
        }>,
    );

    expect(retryAgain).toMatchObject({
      status: 'acknowledged',
      duplicate: true,
      http_status: 200,
      export_id: retry.export_id,
    });

    // Read back through PostgREST with the service role (test-only key).
    const restUrl = INGEST_URL.replace(/\/functions\/v1\/.*$/, '/rest/v1');
    const response = await fetch(
      `${restUrl}/research_session_exports?export_id=eq.${exportId}&select=participant_id,game_session_id,launch_mode,session_status,completion_reason,export_sequence,page_load_index,payload,payload_hash`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );

    expect(response.status).toBe(200);

    const rows = (await response.json()) as {
      participant_id: string;
      launch_mode: string;
      session_status: string;
      completion_reason: string;
      export_sequence: number;
      page_load_index: number;
      payload: Record<string, unknown>;
      payload_hash: string;
    }[];

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      participant_id: `PT_LIVE_${tag}`,
      launch_mode: 'test',
      session_status: 'completed',
      completion_reason: 'terminal_room_reached',
      export_sequence: 1,
      page_load_index: 1,
    });
    expect((rows[0].payload.raw_events as unknown[]).length).toBeGreaterThan(5);
    expect(rows[0].payload.event_integrity).toMatchObject({
      sequence_gap_count: 0,
      sequence_duplicate_count: 0,
    });

    // The stored hash is the hash of the bytes the client sent: recompute
    // from the client's own frozen envelope (sessionStorage) and compare.
    const frozen = await page.evaluate(() =>
      Object.entries(sessionStorage)
        .filter(([key]) => key.startsWith('research-export:v2:'))
        .map(([key, value]) => ({ key, value })),
    );
    const pipelineEnvelope = frozen
      .map(
        (entry) =>
          JSON.parse(entry.value) as { export_id: string; payload: unknown },
      )
      .find((entry) => entry.export_id === exportId);

    expect(pipelineEnvelope).toBeDefined();

    const expectedHash = createHash('sha256')
      .update(JSON.stringify(pipelineEnvelope?.payload), 'utf8')
      .digest('hex');

    expect(rows[0].payload_hash).toBe(expectedHash);
  });
});
