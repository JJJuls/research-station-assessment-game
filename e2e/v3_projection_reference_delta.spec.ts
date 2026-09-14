/**
 * World V2 rebuild V3 — projection reference + audit-fix deltas (pure).
 *
 * The approved pre-rebuild reference (`world-v1-before.json`, recorded
 * BEFORE the session-1 scientific defect fixes `3a4ff96`) and the final
 * rebuild projection (`world-v3.json`) must differ by EXACTLY the five
 * documented audit-fix deltas and nothing else:
 *
 *   B6 (Dock route telemetry no longer swallowed):
 *     1. event_type_sequence: `pilot_zone_entered` inserted at index 4
 *        (the Dock's zone entry), length 154 → 155;
 *     2. event_counts.pilot_zone_entered 11 → 12;
 *   A3 (fixed option order + default focus exported with every NPC-beat
 *   choice — docs/verification/scientific-audit-2026-09/AUDIT-FINDINGS.md,
 *   docs/verification/scientific-audit-2026-09/QUALTRICS-LOGGING-REVIEW-B2-A3.md):
 *     3. payload_keys.pilot_npc_beat += `metadata.focus_default_position`;
 *     4. payload_keys.pilot_npc_beat += `metadata.option_count`;
 *     5. payload_keys.pilot_npc_beat += `metadata.option_position`.
 *
 * The test applies those five deltas to the reference and requires the
 * result to compare EQUAL to the current projection with the same
 * comparator the route spec uses — and, independently, that the raw
 * reference vs current comparison names only those fields. Promotion of
 * `world-v3.json` to the post-fix reference remains the research owner's
 * decision; this test never rewrites a baseline.
 *
 *   V3_PROJECTION_REFERENCE  reference file (default world-v1-before.json)
 *   V3_PROJECTION_CURRENT    current file  (default world-v3.json)
 */
import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { compareProjections, type ScientificProjection } from './v4Projection';

const DIR = 'docs/verification/professional-visual-v4/projection';
const REFERENCE =
  process.env.V3_PROJECTION_REFERENCE ?? `${DIR}/world-v1-before.json`;
const CURRENT = process.env.V3_PROJECTION_CURRENT ?? `${DIR}/world-v3.json`;

const A3_KEYS = [
  'metadata.focus_default_position',
  'metadata.option_count',
  'metadata.option_position',
];

function applyAuditFixDeltas(
  reference: ScientificProjection,
): ScientificProjection {
  const expected = JSON.parse(
    JSON.stringify(reference),
  ) as ScientificProjection;

  // B6: the Dock's own zone entry is one more event, at index 4.
  expected.event_type_sequence.splice(4, 0, 'pilot_zone_entered');
  expected.event_counts.pilot_zone_entered =
    (expected.event_counts.pilot_zone_entered ?? 0) + 1;

  // A3: three more payload keys on every NPC-beat choice (sorted key set).
  expected.payload_keys.pilot_npc_beat = [
    ...new Set([...expected.payload_keys.pilot_npc_beat, ...A3_KEYS]),
  ].sort();

  return expected;
}

test('v3 projection (pure): current = approved reference + exactly the five 3a4ff96 audit-fix deltas', () => {
  test.skip(
    !existsSync(REFERENCE) || !existsSync(CURRENT),
    `needs both ${REFERENCE} and ${CURRENT}`,
  );

  const reference = JSON.parse(
    readFileSync(REFERENCE, 'utf8'),
  ) as ScientificProjection;
  const current = JSON.parse(
    readFileSync(CURRENT, 'utf8'),
  ) as ScientificProjection;

  // The raw comparison names only the five documented deltas.
  const raw = compareProjections(reference, current);

  expect(raw.map((d) => d.field)).toEqual([
    'event_type_sequence',
    'event_type_sequence[4]',
    'event_counts.pilot_zone_entered',
    'payload_keys.pilot_npc_beat',
    'payload_keys.pilot_npc_beat[8]',
  ]);
  expect(current.event_type_sequence.length).toBe(
    reference.event_type_sequence.length + 1,
  );
  expect(current.event_type_sequence[4]).toBe('pilot_zone_entered');
  expect(current.event_counts.pilot_zone_entered).toBe(
    reference.event_counts.pilot_zone_entered + 1,
  );
  expect(
    current.payload_keys.pilot_npc_beat.filter(
      (key) => !reference.payload_keys.pilot_npc_beat.includes(key),
    ),
  ).toEqual(A3_KEYS);

  // Reference + the five deltas compares EQUAL to the current projection on
  // every scientific field (event identities, payload keys, window ids,
  // opportunities, validity values, form slots, coverage dispositions,
  // final stage, route summary).
  const differences = compareProjections(
    applyAuditFixDeltas(reference),
    current,
  );

  test.info().annotations.push({
    type: 'v3-projection-reference-delta',
    description: `${CURRENT} vs ${REFERENCE} + 5 audit-fix deltas: ${differences.length} difference(s); ${current.event_type_sequence.length} events, ${current.opportunity_ids.length} opportunities, ${current.window_ids.length} window ids`,
  });

  expect(differences).toEqual([]);
});
