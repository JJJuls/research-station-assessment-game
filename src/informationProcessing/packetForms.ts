/**
 * Pure packet forms + rules (Information Processing foundation, M14).
 *
 * Phaser-free, runtime-free and `import.meta`-free so Node-side tests can
 * import it directly. Equivalent forms: 4 practice + 12 scored packets,
 * 4 per channel, 3 URGENT, identical stable rules.
 */

import type { FormId, Fragment, GrammarSpec } from './model';

export const M14_DESTINATIONS = ['ARCHIVE', 'RELAY', 'HOLD'] as const;
export const M14_CHANNELS = ['ALPHA', 'BETA', 'GAMMA'] as const;

/** The stable rules: channel map + one visible override flag. */
export const M14_RULES: Record<string, string> = {
  ALPHA: 'ARCHIVE',
  BETA: 'RELAY',
  GAMMA: 'HOLD',
};
export const M14_URGENT_DESTINATION = 'RELAY';

export const M14_GRAMMAR: GrammarSpec = {
  id: 'm14-v1',
  verbs: [
    {
      verb: 'ROUTE',
      args: [
        { kind: 'fragment', label: 'packet' },
        { kind: 'destination', label: 'destination' },
      ],
      summary: 'Send a packet to a destination.',
    },
  ],
};

export interface PacketForm {
  practice: readonly Fragment[];
  scored: readonly Fragment[];
}

function packets(
  prefix: string,
  spec: readonly [string, string, boolean][],
): Fragment[] {
  return spec.map(([channel, payload, urgent], index) => ({
    id: `${prefix}${index + 1}`,
    channel,
    payload,
    flags: urgent ? ['URGENT'] : [],
  }));
}

/** Equivalent forms: 4 practice + 12 scored; 4 per channel; 3 URGENT. */
export const M14_FORMS: Record<FormId, PacketForm> = {
  A: {
    practice: packets('Q', [
      ['ALPHA', 'hdr 1A', false],
      ['BETA', 'hdr 3C', false],
      ['GAMMA', 'hdr 7E', false],
      ['ALPHA', 'hdr 9B', true],
    ]),
    scored: packets('P', [
      ['BETA', 'blk 40', false],
      ['ALPHA', 'blk 12', false],
      ['GAMMA', 'blk 77', true],
      ['ALPHA', 'blk 08', false],
      ['GAMMA', 'blk 51', false],
      ['BETA', 'blk 66', false],
      ['ALPHA', 'blk 23', true],
      ['GAMMA', 'blk 19', false],
      ['BETA', 'blk 84', false],
      ['ALPHA', 'blk 35', false],
      ['GAMMA', 'blk 02', false],
      ['BETA', 'blk 90', true],
    ]),
  },
  B: {
    practice: packets('Q', [
      ['GAMMA', 'hdr 2D', false],
      ['ALPHA', 'hdr 5F', false],
      ['BETA', 'hdr 8A', true],
      ['BETA', 'hdr 4C', false],
    ]),
    scored: packets('P', [
      ['ALPHA', 'blk 61', false],
      ['GAMMA', 'blk 27', false],
      ['BETA', 'blk 13', true],
      ['GAMMA', 'blk 88', false],
      ['ALPHA', 'blk 45', true],
      ['BETA', 'blk 09', false],
      ['GAMMA', 'blk 72', false],
      ['ALPHA', 'blk 30', false],
      ['BETA', 'blk 56', false],
      ['GAMMA', 'blk 94', true],
      ['ALPHA', 'blk 17', false],
      ['BETA', 'blk 38', false],
    ]),
  },
};

/** The correct destination of a packet under the stable rules. */
export function m14CorrectDestination(fragment: Fragment): string {
  return fragment.flags?.includes('URGENT')
    ? M14_URGENT_DESTINATION
    : M14_RULES[fragment.channel];
}
