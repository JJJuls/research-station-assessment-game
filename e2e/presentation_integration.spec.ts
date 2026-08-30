/**
 * Unit 7 — professional presentation integration (evidence-led pilot v2).
 *
 * Presentation-only checks: every promoted PROVISIONAL asset exists at its
 * recorded dimensions, the provenance record names every runtime file,
 * every v2 zone boots with the new art without a runtime error, an
 * overlay hides the world prompt (V1), and the reduced-motion / muted
 * boots stay clean. No measurement, event, window or score is touched or
 * asserted here — those suites are unchanged and run separately.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { UNIT7_STILL_URLS, UNIT7_STRIP_URLS } from '../src/constants/assets';
import { press } from './helpers';
import { captureErrors, expectNoRuntimeErrors } from './journey';
import { bootPilotScene, walkTo } from './pilotHelpers';

const STILL_DIMENSIONS: Record<string, [number, number]> = {
  'plv1-bot-standby': [96, 96],
  'plv1-bot-working': [96, 96],
  'plv1-core-coolant-column': [56, 132],
  'plv1-core-pillar-a': [32, 80],
  'plv1-core-pillar-b': [32, 80],
  'plv1-core-console': [56, 72],
  'plv1-utility-tower': [64, 80],
  'plv1-utility-panel': [64, 92],
  'plv1-utility-desk': [144, 56],
  'plv1-arch-door': [66, 74],
  'plv1-arch-vent': [66, 74],
  'plv1-arch-grille': [66, 74],
  'plv1-arch-pipes': [66, 68],
};

/** Independent reference for the strips (not the loader registry). */
const STRIP_DIMENSIONS: Record<string, [number, number]> = {
  'plv1-core-sync': [448, 96],
  'plv1-airlock-open': [672, 64],
  'plv1-antenna-signal': [448, 96],
  'plv1-fx-snowfall': [864, 96],
};

const PROVENANCE_DOC = path.resolve(
  'docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md',
);
// The Unit 5/6 player-action and effect sheets are recorded here.
const SELECTION_DOC = path.resolve(
  'docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md',
);
const RUNTIME_ROOT = path.resolve('public/assets/pixellab-runtime');

/** PNG IHDR → [width, height, colourType]. */
function pngHeader(buffer: Buffer): [number, number, number] {
  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buffer.subarray(12, 16).toString('ascii')).toBe('IHDR');

  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20), buffer[25]];
}

test.describe('Unit 7 presentation assets', () => {
  test('every promoted still and strip is served at its recorded size', async ({
    request,
  }) => {
    const stillKeys = Object.keys(UNIT7_STILL_URLS).sort();

    expect(stillKeys).toEqual(Object.keys(STILL_DIMENSIONS).sort());

    for (const [textureKey, url] of Object.entries(UNIT7_STILL_URLS)) {
      const response = await request.get(`/${url}`);

      expect(response.status(), url).toBe(200);

      const [width, height, colourType] = pngHeader(await response.body());

      expect([width, height], textureKey).toEqual(STILL_DIMENSIONS[textureKey]);
      // RGBA — every promoted still is transparent-background.
      expect(colourType, `${textureKey} colour type`).toBe(6);
    }

    expect(Object.keys(UNIT7_STRIP_URLS).sort()).toEqual(
      Object.keys(STRIP_DIMENSIONS).sort(),
    );

    for (const [textureKey, strip] of Object.entries(UNIT7_STRIP_URLS)) {
      const response = await request.get(`/${strip.url}`);

      expect(response.status(), strip.url).toBe(200);

      const [width, height, colourType] = pngHeader(await response.body());

      expect([width, height], textureKey).toEqual(STRIP_DIMENSIONS[textureKey]);
      expect(width, `${textureKey} strip width`).toBe(
        strip.frameWidth * strip.frames,
      );
      expect(height, `${textureKey} strip height`).toBe(strip.frameHeight);
      expect(colourType, `${textureKey} colour type`).toBe(6);
    }
  });

  test('the provenance record names every runtime file and carries the provisional label', () => {
    const doc = readFileSync(PROVENANCE_DOC, 'utf8');

    expect(doc).toContain('PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED');
    expect(doc).not.toMatch(
      /HUMAN-APPROVED: yes|approved by the research owner/i,
    );

    const runtimeFiles: string[] = [];

    for (const folder of ['robots', 'sequences', 'props', 'effects', 'npcs']) {
      for (const file of readdirSync(path.join(RUNTIME_ROOT, folder))) {
        runtimeFiles.push(`${folder}/${file}`);
      }
    }

    // Every runtime file is named in one of the two provenance records
    // (the Unit 5/6 sheets live in the selection document).
    const records = doc + readFileSync(SELECTION_DOC, 'utf8');

    for (const file of runtimeFiles) {
      expect(records, `provenance names ${file}`).toContain(
        path.basename(file),
      );
    }

    // Every Unit 7 URL in the registry points at a file that exists.
    const registryUrls = [
      ...Object.values(UNIT7_STILL_URLS),
      ...Object.values(UNIT7_STRIP_URLS).map((strip) => strip.url),
    ];

    for (const url of registryUrls) {
      const relative = url.replace('assets/pixellab-runtime/', '');

      expect(runtimeFiles, `runtime file for ${url}`).toContain(relative);
    }
  });
});

/** Collects the Unit 7 asset responses during a boot. */
function trackAssetResponses(page: Page): Map<string, number> {
  const seen = new Map<string, number>();

  page.on('response', (response) => {
    const url = response.url();

    if (url.includes('/assets/pixellab-runtime/')) {
      seen.set(url.slice(url.indexOf('/assets/')), response.status());
    }
  });

  return seen;
}

const ZONES = [
  'station_concourse',
  'records_workshop',
  'diagnostics_laboratory',
  'exterior_recovery_yard',
  'utility_core_deck',
] as const;

test.describe('Unit 7 zone boots', () => {
  for (const zone of ZONES) {
    test(`${zone} boots with the promoted art and no runtime error`, async ({
      page,
    }) => {
      const errors = captureErrors(page);
      const responses = trackAssetResponses(page);

      await bootPilotScene(page, `u7_${zone}`, zone);

      const title = await page.evaluate(
        () =>
          (window as unknown as { __pilotZoneTitle?: string | null })
            .__pilotZoneTitle ?? null,
      );

      expect(title, 'zone title card shown').not.toBeNull();

      for (const [url, status] of responses) {
        expect(status, `asset ${url}`).toBe(200);
      }

      // Every Unit 7 registry URL was requested by Boot (no manifest drift).
      for (const url of [
        ...Object.values(UNIT7_STILL_URLS),
        ...Object.values(UNIT7_STRIP_URLS).map((strip) => strip.url),
      ]) {
        expect(responses.has(`/${url}`), `Boot requested ${url}`).toBe(true);
      }

      expectNoRuntimeErrors(errors);
    });
  }

  test('core chamber boots (developer inspection) with the core column strip', async ({
    page,
  }) => {
    const errors = captureErrors(page);

    await page.goto(
      `/?participant_id=PT_PILOT_u7core&game_session_id=GS_PILOT_u7core_${Date.now()}&scene=core_chamber&dev_closure=inspect`,
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __coreChamberProbe?: unknown })
          .__coreChamberProbe !== undefined &&
        (window as unknown as { __coreChamberProbe?: unknown })
          .__coreChamberProbe !== null,
      undefined,
      { timeout: 60_000 },
    );
    // Probe-gated (no fixed sleep): the chamber publishes its objective
    // line on create.
    await page.waitForFunction(
      () =>
        (
          (window as unknown as { __routeObjectiveText?: string })
            .__routeObjectiveText ?? ''
        ).length > 0,
      undefined,
      { timeout: 10_000 },
    );

    const objective = await page.evaluate(
      () =>
        (window as unknown as { __routeObjectiveText?: string })
          .__routeObjectiveText ?? '',
    );

    // V5: inside the chamber the line never tells the participant to enter
    // the chamber they are standing in.
    expect(objective).not.toMatch(/Enter the Core Chamber/);
    expectNoRuntimeErrors(errors);
  });
});

test.describe('Unit 7 overlay lifecycle and display settings', () => {
  test('an overlay hides the world prompt; closing it restores the prompt (V1)', async ({
    page,
  }) => {
    const errors = captureErrors(page);

    await bootPilotScene(page, 'u7_prompt', 'utility_core_deck');

    // Coolant Feed Valve approach (room doc 13): the prompt appears in range.
    await walkTo(page, 160, 340);
    await page.waitForFunction(
      () =>
        (window as unknown as { __worldPromptProbe?: { prompt: boolean } })
          .__worldPromptProbe?.prompt === true,
      undefined,
      { timeout: 10_000 },
    );

    // M opens the station map (pause-and-launch overlay).
    await press(page, 'M');
    await page.waitForFunction(
      () =>
        (window as unknown as { __worldPromptProbe?: { prompt: boolean } })
          .__worldPromptProbe?.prompt === false,
      undefined,
      { timeout: 5_000 },
    );

    const probeWhileOpen = await page.evaluate(
      () =>
        (
          window as unknown as {
            __worldPromptProbe?: { prompt: boolean; chips: number };
          }
        ).__worldPromptProbe,
    );

    expect(probeWhileOpen?.prompt).toBe(false);
    expect(
      probeWhileOpen?.chips,
      'no label chip visible under an overlay',
    ).toBe(0);

    await press(page, 'Escape');
    await page.waitForFunction(
      () =>
        (window as unknown as { __worldPromptProbe?: { prompt: boolean } })
          .__worldPromptProbe?.prompt === true,
      undefined,
      { timeout: 5_000 },
    );

    expectNoRuntimeErrors(errors);
  });

  test('reduced motion: the yard, the deck and the chamber boot without error', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const errors = captureErrors(page);

    await bootPilotScene(page, 'u7_rm_yard', 'exterior_recovery_yard');
    await bootPilotScene(page, 'u7_rm_deck', 'utility_core_deck');
    // The chamber's held-frame branches (core column, ramp, ambient).
    await page.goto(
      `/?participant_id=PT_PILOT_u7_rm_core&game_session_id=GS_PILOT_u7_rm_core_${Date.now()}&scene=core_chamber&dev_closure=inspect`,
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __coreChamberProbe?: unknown })
          .__coreChamberProbe != null,
      undefined,
      { timeout: 60_000 },
    );
    expectNoRuntimeErrors(errors);
  });

  test('muted display setting: a zone boots without error', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('outpost_audio_muted', '1');
      } catch {
        // storage unavailable — the boot must still be clean
      }
    });

    const errors = captureErrors(page);

    await bootPilotScene(page, 'u7_muted', 'records_workshop');
    expectNoRuntimeErrors(errors);
  });
});
