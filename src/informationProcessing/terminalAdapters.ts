/**
 * Registry of terminal task adapters (Information Processing foundation).
 *
 * Modules register their adapter at import time; the Signal Terminal
 * scene resolves the adapter for the task id it was launched with. The
 * registry holds no task state — every adapter reads from its module's
 * own authoritative store.
 */

import type { TerminalTaskAdapter } from './model';

const adapters = new Map<string, TerminalTaskAdapter>();

export function registerTerminalAdapter(adapter: TerminalTaskAdapter) {
  adapters.set(adapter.id, adapter);
}

export function getTerminalAdapter(id: string): TerminalTaskAdapter | null {
  return adapters.get(id) ?? null;
}

export function registeredTerminalTaskIds(): string[] {
  return [...adapters.keys()];
}
