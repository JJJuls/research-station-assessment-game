/**
 * DEV-only inspection surface (Information Processing foundation).
 *
 * `window.__ipModules` mirrors every module's raw state container, its
 * validity-register record, form and entry-state identifiers, and the
 * declared event families — read-only, stripped from production builds
 * (`__playerProbe` / `__measurementValidity` precedent). It never exposes
 * an item score because none exists.
 */

import { serializeOpportunities } from '../measurement/validity';
import { declaredIpEventTypes } from './telemetry';

type ProbeSource = () => Record<string, unknown>;

const sources = new Map<
  string,
  { source: ProbeSource; opportunityId: string }
>();

declare global {
  interface Window {
    __ipModules?: {
      modules: Record<string, Record<string, unknown>>;
      validity: ReturnType<typeof serializeOpportunities>;
      event_families: Record<string, readonly string[]>;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__ipModules = null;
}

export function registerIpProbeSource(
  id: string,
  opportunityId: string,
  source: ProbeSource,
) {
  sources.set(id, { source, opportunityId });
}

/** Refreshes the probe (call after any module state change). */
export function refreshIpProbe() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const modules: Record<string, Record<string, unknown>> = {};
  const opportunityIds = new Set<string>();

  for (const [id, entry] of sources) {
    modules[id] = entry.source();
    opportunityIds.add(entry.opportunityId);
  }

  window.__ipModules = {
    modules,
    validity: serializeOpportunities().filter((record) =>
      opportunityIds.has(record.opportunity_id),
    ),
    event_families: declaredIpEventTypes(),
  };
}
