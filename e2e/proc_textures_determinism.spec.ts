import { expect, test } from '@playwright/test';

import { KIT_ITEM_REGISTRY } from '../src/data/itemRegistry';
import {
  ICON_TEXTURES,
  itemIconTextureKey,
  PROCEDURAL_TEXTURE_MANIFEST,
} from '../src/world/proceduralTextures';
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
 * Pinned manifest snapshot. Grows only when a NEXT-07/NEXT-08 phase adds
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
  'proc-beacon-comms': { width: 32, height: 64 },
  'proc-core-interface': { width: 64, height: 56 },
  'proc-bot-utility': { width: 48, height: 48 },
  // NEXT-08 §3.3 proc-icon-* family: registry-item icons...
  'proc-icon-torque-driver': { width: 24, height: 24 },
  'proc-icon-diagnostic-probe': { width: 24, height: 24 },
  'proc-icon-coolant-cartridge': { width: 24, height: 24 },
  'proc-icon-fuse-pack': { width: 24, height: 24 },
  'proc-icon-patch-tape': { width: 24, height: 24 },
  'proc-icon-hex-spanner': { width: 24, height: 24 },
  'proc-icon-sealant-canister': { width: 24, height: 24 },
  'proc-icon-relay-board': { width: 24, height: 24 },
  'proc-icon-stabiliser-part': { width: 24, height: 24 },
  // ...and glyph icons (slot chip, manual, component, step states, log mark).
  'proc-icon-slot-chip': { width: 24, height: 24 },
  'proc-icon-manual': { width: 24, height: 24 },
  'proc-icon-component': { width: 24, height: 24 },
  'proc-icon-step-pending': { width: 20, height: 20 },
  'proc-icon-step-current': { width: 20, height: 20 },
  'proc-icon-step-done': { width: 20, height: 20 },
  'proc-icon-log-mark': { width: 16, height: 16 },
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

  test('NEXT-08 icon family covers the item registry and glyph set', () => {
    // Every inventory registry item resolves to a manifest icon via the
    // presentation-layer key mapping (itemRegistry.ts is not edited).
    for (const item of KIT_ITEM_REGISTRY) {
      expect(
        PROCEDURAL_TEXTURE_MANIFEST[itemIconTextureKey(item.item_id)],
        `missing icon for ${item.item_id}`,
      ).toBeDefined();
    }

    // Every named glyph icon is a manifest entry.
    for (const textureKey of Object.values(ICON_TEXTURES)) {
      expect(
        PROCEDURAL_TEXTURE_MANIFEST[textureKey],
        `missing glyph ${textureKey}`,
      ).toBeDefined();
    }
  });
});
