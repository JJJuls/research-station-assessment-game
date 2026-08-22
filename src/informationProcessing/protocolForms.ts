/**
 * Pure protocol-update forms (Information Processing foundation, M16).
 *
 * `import.meta`-free for Node-side tests. A simple established protocol
 * (origin → destination) is familiarised on three reports; ONE genuinely
 * new, clearly stated rule is then revealed and must be applied to six
 * fresh reports, three of which the new rule governs. Forms are matched
 * (3 base, 6 application, 3 rule-governed, 2 of them origin-conflicting).
 */

import type { FormId, Fragment, GrammarSpec } from './model';

export const M16_DESTINATIONS = ['ARCHIVE', 'RELAY', 'HOLD'] as const;
export const M16_BASE_RULES: Record<string, string> = {
  NORTH: 'ARCHIVE',
  SOUTH: 'RELAY',
};
export const M16_NEW_RULE_ID = 'critical_override_hold';
export const M16_NEW_RULE_FLAG = 'CRITICAL';
export const M16_NEW_RULE_DESTINATION = 'HOLD';
export const M16_NEW_RULE_TEXT =
  'PROTOCOL UPDATE — reports marked !CRITICAL now go to HOLD, whatever their origin.';

export const M16_GRAMMAR: GrammarSpec = {
  id: 'm16-v1',
  verbs: [
    {
      verb: 'ROUTE',
      args: [
        { kind: 'fragment', label: 'report' },
        { kind: 'destination', label: 'destination' },
      ],
      summary: 'Send a report to a destination.',
    },
  ],
};

export interface ProtocolForm {
  base: readonly Fragment[];
  apply: readonly Fragment[];
}

function reports(
  prefix: string,
  spec: readonly [string, string, boolean][],
): Fragment[] {
  return spec.map(([origin, payload, critical], index) => ({
    id: `${prefix}${index + 1}`,
    channel: origin,
    payload,
    flags: critical ? [M16_NEW_RULE_FLAG] : [],
  }));
}

export const M16_FORMS: Record<FormId, ProtocolForm> = {
  A: {
    base: reports('B', [
      ['NORTH', 'rpt 14', false],
      ['SOUTH', 'rpt 22', false],
      ['NORTH', 'rpt 31', false],
    ]),
    apply: reports('R', [
      ['SOUTH', 'rpt 40', false],
      ['NORTH', 'rpt 45', true],
      ['NORTH', 'rpt 52', false],
      ['SOUTH', 'rpt 58', true],
      ['NORTH', 'rpt 63', true],
      ['SOUTH', 'rpt 71', false],
    ]),
  },
  B: {
    base: reports('B', [
      ['SOUTH', 'rpt 07', false],
      ['NORTH', 'rpt 19', false],
      ['SOUTH', 'rpt 26', false],
    ]),
    apply: reports('R', [
      ['NORTH', 'rpt 33', true],
      ['SOUTH', 'rpt 38', false],
      ['SOUTH', 'rpt 44', true],
      ['NORTH', 'rpt 49', false],
      ['NORTH', 'rpt 55', true],
      ['SOUTH', 'rpt 60', false],
    ]),
  },
};

/** Destination under the base protocol only (before the update). */
export function m16BaseDestination(fragment: Fragment): string {
  return M16_BASE_RULES[fragment.channel];
}

/** Destination under the updated protocol (base + the new rule). */
export function m16UpdatedDestination(fragment: Fragment): string {
  return fragment.flags?.includes(M16_NEW_RULE_FLAG)
    ? M16_NEW_RULE_DESTINATION
    : M16_BASE_RULES[fragment.channel];
}

export function m16RuleGoverned(fragment: Fragment): boolean {
  return fragment.flags?.includes(M16_NEW_RULE_FLAG) ?? false;
}
