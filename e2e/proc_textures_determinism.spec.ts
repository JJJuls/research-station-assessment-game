import { expect, test } from '@playwright/test';

import { PROCEDURAL_TEXTURE_MANIFEST } from '../src/world/proceduralTextures';
import { bootGame } from './helpers';

/**
 * NEXT-07 procedural-texture foundry determinism coverage (contract §5).
 *
 * The foundry's manifest is a frozen-stimuli surface: every participant
 * must see identical procedural textures. This spec (a) pins the manifest
 * key/dimension table so any change is a reviewed, deliberate diff, and
 * (b) asserts the runtime generated exactly the manifest — once — and
 * that a second ensureProceduralTextures call is a no-op (idempotence).
 *
 * Rides the existing Playwright harness; presentation-only DEV probe
 * (window.__procTextures), no events, no research data.
 */

/**
 * Pinned manifest snapshot. Grows only when a NEXT-07 phase adds
 * textures; every entry must match src/world/proceduralTextures.ts
 * exactly. Update deliberately, per phase — never loosen to a wildcard.
 */
const EXPECTED_MANIFEST: Record<string, { width: number; height: number }> = {
  'proc-npc-kai': { width: 64, height: 64 },
  'proc-npc-vale': { width: 40, height: 56 },
  'proc-console-quartermaster': { width: 40, height: 56 },
  'proc-console-wall': { width: 40, height: 56 },
  'proc-rack-tools': { width: 48, height: 56 },
  'proc-bin-consumables': { width: 48, height: 40 },
  'proc-shelf-electronics': { width: 48, height: 56 },
  'proc-bench-prep': { width: 64, height: 40 },
  'proc-crate-fieldkit': { width: 48, height: 48 },
  'proc-console-scenario': { width: 48, height: 52 },
  'proc-panel-warning': { width: 48, height: 48 },
};

interface ProcTexturesProbe {
  manifest: Record<string, { width: number; height: number }>;
  firstRun: string[];
  secondRunAdded: string[];
  textures: Record<string, { width: number; height: number }>;
}

test.describe('procedural texture foundry (NEXT-07)', () => {
  test('manifest is pinned, fully generated at Boot, and idempotent', async ({
    page,
  }) => {
    await bootGame(page, {
      participant_id: 'PT_PROC_TEXTURES',
      game_session_id: 'GS_PROC_TEXTURES',
    });

    // (a) The source manifest matches the pinned snapshot exactly.
    expect(PROCEDURAL_TEXTURE_MANIFEST).toEqual(EXPECTED_MANIFEST);

    const probe = await page.evaluate(
      () =>
        (window as unknown as { __procTextures?: ProcTexturesProbe })
          .__procTextures ?? null,
    );

    expect(probe).not.toBeNull();

    const expectedKeys = Object.keys(EXPECTED_MANIFEST).sort();

    // (b) Boot generated exactly the manifest keys on the first call...
    expect(probe!.manifest).toEqual(EXPECTED_MANIFEST);
    expect([...probe!.firstRun].sort()).toEqual(expectedKeys);

    // ...the second call added nothing (idempotence)...
    expect(probe!.secondRunAdded).toEqual([]);

    // ...and every generated texture has its manifest dimensions.
    expect(probe!.textures).toEqual(EXPECTED_MANIFEST);
  });
});
