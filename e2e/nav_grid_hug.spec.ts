/**
 * Grid navigator (pure): a plan must start from a position that hugs a
 * collider — the collision audit ends every push exactly there.
 */
import { expect, test } from '@playwright/test';

import { gridOf } from '../src/world/layouts/grid';
import { YARD_LAYOUT, YARD_SOLIDS } from '../src/world/layouts/yard';
import { planPath } from './navGrid';

test('a start 1 px off a collider still plans a way out', () => {
  const grid = gridOf(YARD_LAYOUT, YARD_SOLIDS);
  // Feet bottom 1 px above the coupling's solid (y 364): origin y 339.
  const path = planPath(grid, { x: 200, y: 339 }, { x: 896, y: 560 });

  expect(path).not.toBeNull();
});
