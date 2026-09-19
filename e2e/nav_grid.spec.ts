/**
 * Grid navigator (pure): every audited yard approach is planned from the
 * spawn as a short run of axis-aligned legs over the pure collision model.
 */
import { expect, test } from '@playwright/test';

import { YARD_SITES, YARD_SPAWN } from '../src/pilot/zoneSites';
import { YARD_REGISTRY } from '../src/world/interactionRegistry';
import { bodyFits, gridOf, npcSolid } from '../src/world/layouts/grid';
import { YARD_LAYOUT, YARD_SOLIDS } from '../src/world/layouts/yard';
import { planPath } from './navGrid';

const GRID = gridOf(YARD_LAYOUT, [
  ...YARD_SOLIDS,
  npcSolid(YARD_SITES.noor.x, YARD_SITES.noor.y),
]);

test('yard: every approach is a handful of clear axis-aligned legs from the spawn', () => {
  for (const entry of YARD_REGISTRY) {
    // navigateTo's own rule: the comfortable margin first, the tight one
    // for a stand that hugs its prop (the coupling's north side).
    const path =
      planPath(GRID, YARD_SPAWN, entry.approach, { margin: 9, reach: 6 }) ??
      planPath(GRID, YARD_SPAWN, entry.approach, { margin: 2, reach: 6 });

    expect(path, entry.id).not.toBeNull();
    expect(path!.length, `${entry.id} legs`).toBeLessThanOrEqual(8);

    let at = {
      x: Math.round(YARD_SPAWN.x / 8) * 8,
      y: Math.round(YARD_SPAWN.y / 8) * 8,
    };

    for (const leg of path!) {
      expect(leg.x === at.x || leg.y === at.y, `${entry.id} axis-aligned`).toBe(
        true,
      );
      expect(bodyFits(GRID, leg.x, leg.y), `${entry.id} leg end fits`).toBe(
        true,
      );
      at = leg;
    }
  }
});
