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
  // Stardew-quality pass (Unit D): NPC reaction poses + core machinery.
  'proc-npc-kai-work': { width: 64, height: 64 },
  'proc-npc-kai-done': { width: 64, height: 64 },
  'proc-npc-vale-ready': { width: 40, height: 56 },
  'proc-core-column': { width: 40, height: 90 },
  // Stardew-quality pass (Unit C): Survey Terrace worksite art.
  'proc-antenna-damaged': { width: 32, height: 64 },
  'proc-antenna-repaired': { width: 32, height: 64 },
  'proc-station-module': { width: 96, height: 60 },
  'proc-ground-disturbed': { width: 40, height: 24 },
  'proc-footprints': { width: 10, height: 8 },
  // Stardew-quality pass (Unit B): station-life dressing props.
  'proc-window-exterior': { width: 48, height: 26 },
  'proc-wall-pipes': { width: 48, height: 18 },
  'proc-seat-bench': { width: 40, height: 22 },
  'proc-hydroponics': { width: 40, height: 42 },
  'proc-galley': { width: 48, height: 34 },
  'proc-desk-reception': { width: 56, height: 36 },
  'proc-cart-utility': { width: 42, height: 28 },
  'proc-worker-hauler': { width: 40, height: 52 },
  'proc-worker-tech': { width: 40, height: 52 },
  'proc-light-pool': { width: 120, height: 64 },
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
  // Overnight-prototype gameplay icons (src/gameplay/items.ts, Unit 1).
  'proc-icon-field-scanner': { width: 24, height: 24 },
  'proc-icon-excavation-spade': { width: 24, height: 24 },
  'proc-icon-sample-case': { width: 24, height: 24 },
  'proc-icon-core-sample': { width: 24, height: 24 },
  'proc-icon-relay-coupling': { width: 24, height: 24 },
  'proc-icon-flux-calibrator': { width: 24, height: 24 },
  // Overnight-prototype field props (Unit 1).
  'proc-locker-field': { width: 48, height: 56 },
  'proc-scan-node': { width: 34, height: 38 },
  'proc-dig-mound': { width: 40, height: 28 },
  // Overnight-prototype measurement-module stations (Unit 3).
  'proc-cabinet-calibration': { width: 48, height: 56 },
  'proc-board-workorders': { width: 48, height: 42 },
  'proc-board-portfolio': { width: 56, height: 52 },
  'proc-desk-closure': { width: 56, height: 40 },
  // Physical-mechanics session (Unit 2): organisation-suite art.
  'proc-icon-hex-gauge': { width: 24, height: 24 },
  'proc-icon-lens-kit': { width: 24, height: 24 },
  'proc-drawer-cell': { width: 28, height: 22 },
  'proc-icon-packing-wrap': { width: 24, height: 24 },
  'proc-icon-mount-clamp': { width: 24, height: 24 },
  'proc-icon-panel-shim': { width: 24, height: 24 },
  'proc-disposal-unit': { width: 44, height: 48 },
  'proc-rack-fieldtools': { width: 44, height: 48 },
  'proc-crate-components': { width: 44, height: 40 },
  // Physical-mechanics session (Unit 3): Ridge Annex artifact survey.
  'proc-npc-noor': { width: 40, height: 56 },
  'proc-survey-stake': { width: 24, height: 36 },
  'proc-survey-stake-flagged': { width: 24, height: 36 },
  'proc-survey-stake-clear': { width: 24, height: 36 },
  'proc-specimen-case': { width: 56, height: 40 },
  'proc-case-tray': { width: 28, height: 22 },
  'proc-notebook-stand': { width: 44, height: 40 },
  'proc-icon-ice-core': { width: 24, height: 24 },
  'proc-icon-basalt': { width: 24, height: 24 },
  'proc-icon-biosample': { width: 24, height: 24 },
  // Physical-mechanics session (Unit 4): persistence-deepening art.
  'proc-rig-intake': { width: 44, height: 48 },
  'proc-gauge-card': { width: 32, height: 40 },
  'proc-machine-fault': { width: 46, height: 44 },
  'proc-machine-fixed': { width: 46, height: 44 },
  // Physical-mechanics session (Unit 6): work-cycle B-poses.
  'proc-npc-kai-work-b': { width: 64, height: 64 },
  'proc-npc-vale-b': { width: 40, height: 56 },
  'proc-npc-noor-b': { width: 40, height: 56 },
  'proc-bot-utility-b': { width: 48, height: 48 },
  // Physical-mechanics session (Unit 7): ice-bore salvage art.
  'proc-ice-bore': { width: 48, height: 52 },
  'proc-icon-scrap-bolt': { width: 24, height: 24 },
  'proc-icon-tin-panel': { width: 24, height: 24 },
  'proc-icon-coolant-slug': { width: 24, height: 24 },
  'proc-icon-sensor-husk': { width: 24, height: 24 },
  'proc-icon-ice-pearl': { width: 24, height: 24 },
  // Action-assessment rebuild (Unit 2): coolant-yard survey art.
  'proc-icon-pipe-segment': { width: 24, height: 24 },
  'proc-icon-pipe-elbow': { width: 24, height: 24 },
  'proc-icon-ore-chunk': { width: 24, height: 24 },
  'proc-icon-scrap-plate': { width: 24, height: 24 },
  'proc-icon-heat-canister': { width: 24, height: 24 },
  'proc-icon-pry-bar': { width: 24, height: 24 },
  'proc-icon-coolant-coupling': { width: 24, height: 24 },
  'proc-housing-frozen': { width: 52, height: 44 },
  'proc-sector-post': { width: 16, height: 34 },
  'proc-reclamation-post': { width: 40, height: 52 },
  'proc-crate-supply': { width: 48, height: 40 },
  // Action-assessment rebuild (Unit 3): manifold puzzle + pump stations.
  'proc-pipe-straight': { width: 32, height: 32 },
  'proc-pipe-elbow': { width: 32, height: 32 },
  'proc-pipe-tee': { width: 32, height: 32 },
  'proc-pipe-valve': { width: 32, height: 32 },
  'proc-pipe-cap': { width: 32, height: 32 },
  'proc-pipe-slot': { width: 36, height: 36 },
  'proc-pipe-slot-broken': { width: 36, height: 36 },
  'proc-valve-relief': { width: 40, height: 40 },
  'proc-diag-board': { width: 44, height: 52 },
  'proc-icon-valve-seal': { width: 24, height: 24 },
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
