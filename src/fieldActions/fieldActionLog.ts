/**
 * Field-action log sink (field-actions foundation).
 *
 * Pure, dependency-free event emission for the fieldActions layer: the
 * hosting scene installs the real sink (researchRuntime.logInteraction)
 * once at create; the telemetry module and the three provisional
 * opportunity adapters emit through it. Keeping the runtime import out
 * of this layer follows the measurement-module convention
 * (src/measurement/m23Excavation.ts has no imports at all) and keeps
 * every module here loadable in Node-side domain tests, where specs
 * install a collector sink to assert exact emissions.
 */

export interface FieldActionLogPayload {
  scene: string;
  episode: string;
  event_type: string;
  object_id: string;
  metadata?: Record<string, unknown>;
}

type FieldActionLogSink = (payload: FieldActionLogPayload) => void;

let sink: FieldActionLogSink | null = null;

/** Installs the real sink (scene create) or a test collector. */
export function installFieldActionLogSink(next: FieldActionLogSink): void {
  sink = next;
}

/** Emits one raw event through the installed sink (no-op before install). */
export function emitFieldActionLog(payload: FieldActionLogPayload): void {
  sink?.(payload);
}

/** Test-only escape hatch. */
export function resetFieldActionLogSink(): void {
  sink = null;
}
