/**
 * Provisional telemetry adapter (Information Processing foundation).
 *
 * SCIENTIFIC BOUNDARY — read before editing:
 * - Every event here is PROVISIONAL (`proto_*` precedent): logged through
 *   `researchRuntime.logInteraction` with NO canonical-context entry, no
 *   `study_item_ids`, no `construct_id`, no `success` flag. Nothing here is
 *   an approved event-schema entry and no derived variable or score
 *   consumes these events.
 * - Each module owns exactly ONE family (`proto_m14_packet_*` …). The
 *   registry below makes the families disjoint by construction: a module
 *   declares its suffixes once and can only ever log declared names.
 * - The common tutorial family (`proto_ip_tutorial_*`) is never item
 *   evidence for any M13–M18 module.
 */

import { researchRuntime } from '../systems';

export type IpFamily =
  | 'proto_ip_tutorial'
  | 'proto_m13_lattice'
  | 'proto_m18_fault'
  | 'proto_m14_packet'
  | 'proto_m15_cipher'
  | 'proto_m16_protocol'
  | 'proto_m17_syntax'
  /** Station 080 Unit 9: the sixteen-trial learning series (v3 route). */
  | 'proto_m17_trials';

export const IP_SCENE = 'information_processing_lab';

const registry = new Map<IpFamily, Set<string>>();

export function ipEventType(family: IpFamily, suffix: string): string {
  return `${family}_${suffix}`;
}

/**
 * Declares the suffixes a family may log and returns the full event-type
 * names (frozen) for documentation and the disjointness tests.
 */
export function declareIpEvents(
  family: IpFamily,
  suffixes: readonly string[],
): readonly string[] {
  const set = registry.get(family) ?? new Set<string>();

  for (const suffix of suffixes) {
    set.add(suffix);
  }

  registry.set(family, set);

  return Object.freeze(suffixes.map((suffix) => ipEventType(family, suffix)));
}

/** All declared event types per family (tests). */
export function declaredIpEventTypes(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};

  for (const [family, suffixes] of registry) {
    out[family] = [...suffixes].map((suffix) => ipEventType(family, suffix));
  }

  return out;
}

/**
 * Logs one provisional event. Throws on an undeclared suffix so a typo
 * can never silently create a new name outside the family registry.
 */
export function logIpEvent(
  family: IpFamily,
  objectId: string,
  suffix: string,
  metadata: Record<string, unknown> = {},
) {
  const declared = registry.get(family);

  if (declared === undefined || !declared.has(suffix)) {
    throw new Error(`Undeclared ${family} event suffix: ${suffix}`);
  }

  researchRuntime.logInteraction({
    scene: IP_SCENE,
    object_id: objectId,
    episode: family,
    event_type: ipEventType(family, suffix),
    metadata,
  });
}

/** The research session id (counterbalance seed). */
export function ipSessionId(): string {
  return researchRuntime.sessionState.getMetadata().game_session_id;
}
