/**
 * V4 — offline scientific-projection comparison (pure, no browser).
 *
 * Compares two projection files written by v4_event_projection.spec.ts
 * field by field with the same comparator the route spec uses, so a
 * reviewer can re-check a recorded run without driving the route again.
 *
 *   V4_PROJECTION_BASELINE   baseline file (default: baseline-v3.json)
 *   V4_PROJECTION_CURRENT    file to compare (default: current.json)
 */
import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { compareProjections, type ScientificProjection } from './v4Projection';

const DIR = 'docs/verification/professional-visual-v4/projection';
const BASELINE =
  process.env.V4_PROJECTION_BASELINE ?? `${DIR}/baseline-v3.json`;
const CURRENT = process.env.V4_PROJECTION_CURRENT ?? `${DIR}/current.json`;

test('v4 projection compare (pure): the recorded run matches the baseline on every scientific field', () => {
  test.skip(
    !existsSync(BASELINE) || !existsSync(CURRENT),
    `needs both ${BASELINE} and ${CURRENT}`,
  );

  const baseline = JSON.parse(
    readFileSync(BASELINE, 'utf8'),
  ) as ScientificProjection;
  const current = JSON.parse(
    readFileSync(CURRENT, 'utf8'),
  ) as ScientificProjection;
  const differences = compareProjections(baseline, current);

  test.info().annotations.push({
    type: 'v4-projection-compare',
    description: `${CURRENT} vs ${BASELINE}: ${differences.length} difference(s); ${current.event_type_sequence.length} events, ${current.opportunity_ids.length} opportunities`,
  });

  expect(differences).toEqual([]);
});
