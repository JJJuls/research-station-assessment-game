/**
 * Pilot coverage registry — runtime bridge (Unit 1).
 *
 * Reads the live SA-13 validity register (src/measurement/validity.ts) and
 * derives one coverage status per M01–M26 item via the pure schedule in
 * ./coverageSchedule.ts. Also owns the two session-scope facts the
 * participant route needs: the launch mode (participant vs developer) and
 * the Final Core explicit closure of still-open windows.
 *
 * Participant-facing code may call ONLY `pilotCompletionSummary` — item ids,
 * validity words and dispositions stay in the DEV probe
 * (`window.__pilotCoverage`) and the raw export.
 *
 * Contamination semantics (one rule, scientific review MAJ-3): a developer
 * scene entered in this page session marks every scheduled route
 * opportunity INVALID with reason `contamination` (validity.ts sets the
 * `contaminated` flag) and records a `contamination:developer_scene:<key>`
 * prior-exposure note — the session is a developer session and its route
 * windows are never primary-analysable. Participant sessions cannot reach a
 * developer scene (no participant navigation leads there).
 */
import {
  declareOpportunity,
  markOpportunityInvalid,
  recordPriorExposure,
  refreshValidityProbe,
  serializeOpportunities,
} from '../measurement/validity';
import { installExportAugmenter } from '../systems';
import type { PilotItemCoverage } from './coverageSchedule';
import {
  deriveCoverage,
  isTerminal,
  operationalCompletionSummary,
  PILOT_SCHEDULE,
} from './coverageSchedule';

export type PilotLaunchMode = 'participant' | 'developer';

interface PilotCoverageProbe {
  launch_mode: PilotLaunchMode;
  developer_scenes_visited: string[];
  items: PilotItemCoverage[];
  summary: ReturnType<typeof operationalCompletionSummary>;
  final_core_closed: boolean;
  final_core_closure: FinalCoreClosure | null;
}

declare global {
  interface Window {
    __pilotCoverage?: PilotCoverageProbe | null;
  }
}

let launchMode: PilotLaunchMode = 'participant';
const developerScenesVisited: string[] = [];
let finalCoreClosed = false;
let lastClosure: FinalCoreClosure | null = null;

/** Set once by the scene router from the resolved start scene. */
export function setPilotLaunchMode(mode: PilotLaunchMode, startScene: string) {
  launchMode = mode;

  if (mode === 'developer') {
    noteDeveloperSceneVisited(startScene);
  }
}

export function pilotLaunchMode(): PilotLaunchMode {
  return launchMode;
}

/**
 * A developer-only scene was entered in this page session. Every scheduled
 * route opportunity already declared is marked contaminated (invalid) with
 * a prior-exposure note; later declarations are stamped by
 * `stampContaminationNotes`, which hosts call after declaring.
 */
export function noteDeveloperSceneVisited(sceneKey: string) {
  if (!developerScenesVisited.includes(sceneKey)) {
    developerScenesVisited.push(sceneKey);
  }

  stampContaminationNotes();
}

export function developerScenesVisitedThisSession(): readonly string[] {
  return developerScenesVisited;
}

/**
 * Marks every declared scheduled opportunity contaminated (invalid) and
 * records the developer-scene notes. Idempotent.
 */
export function stampContaminationNotes() {
  if (developerScenesVisited.length === 0) {
    return;
  }

  const declared = new Set(
    serializeOpportunities().map((record) => record.opportunity_id),
  );

  for (const entry of PILOT_SCHEDULE) {
    for (const opportunityId of entry.opportunityIds) {
      if (!declared.has(opportunityId)) {
        continue;
      }

      for (const sceneKey of developerScenesVisited) {
        recordPriorExposure(
          opportunityId,
          `contamination:developer_scene:${sceneKey}`,
        );
      }

      markOpportunityInvalid(
        opportunityId,
        'contamination',
        `developer_scene:${developerScenesVisited.join(',')}`,
      );
    }
  }

  refreshPilotCoverageProbe();
}

export function pilotCoverage(): PilotItemCoverage[] {
  return deriveCoverage(serializeOpportunities());
}

/** Participant-safe operational summary (labels and counts only). */
export function pilotCompletionSummary() {
  return operationalCompletionSummary(pilotCoverage());
}

export function pilotFinalCoreClosed(): boolean {
  return finalCoreClosed;
}

export interface FinalCoreClosure {
  /** Entered but unfinished → censored (Core reached before the window closed). */
  censored: string[];
  /** Declared/offered but never entered → missing (participant_absent). */
  absent: string[];
  /** Never declared (zone never reached) → declared now, missing (no_opportunity). */
  noOpportunity: string[];
  /** Opportunity ids whose closure threw (recorded, never silently dropped). */
  errors: { opportunity_id: string; message: string }[];
}

/**
 * Final Core explicit closure (scientific review MAJ-2 coding):
 * - entered, unfinished → `censored`;
 * - declared, never entered → `participant_absent` (missing);
 * - never declared → declared with the schedule's owner label, then
 *   `no_opportunity` (missing);
 * - already-terminal records are NEVER overwritten.
 * Every branch is missing/censored evidence — never a low value. Each
 * closure is isolated so one failure cannot leave later windows unclosed.
 */
export function closePilotCoverageAtFinalCore(): FinalCoreClosure {
  const closure: FinalCoreClosure = {
    censored: [],
    absent: [],
    noOpportunity: [],
    errors: [],
  };
  const records = serializeOpportunities();

  for (const entry of PILOT_SCHEDULE) {
    for (const opportunityId of entry.opportunityIds) {
      const record =
        records.find(
          (candidate) => candidate.opportunity_id === opportunityId,
        ) ?? null;

      try {
        if (record === null) {
          declareOpportunity({
            opportunity_id: opportunityId,
            owner: `${entry.item} (pilot route; identity provisional)`,
            entry_state_version: 'never-declared-at-final-core',
          });
          markOpportunityInvalid(
            opportunityId,
            'no_opportunity',
            'zone never reached before the final core',
          );
          closure.noOpportunity.push(opportunityId);
          continue;
        }

        if (
          record.validity !== 'pending' ||
          record.completed ||
          record.censored
        ) {
          continue;
        }

        if (record.entered) {
          markOpportunityInvalid(
            opportunityId,
            'censored',
            'final core reached before the window closed',
          );
          closure.censored.push(opportunityId);
        } else {
          markOpportunityInvalid(
            opportunityId,
            'participant_absent',
            'offered but never entered before the final core',
          );
          closure.absent.push(opportunityId);
        }
      } catch (error) {
        closure.errors.push({
          opportunity_id: opportunityId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  finalCoreClosed = true;
  lastClosure = closure;
  refreshValidityProbe();
  refreshPilotCoverageProbe();

  return closure;
}

/** Whether every scheduled opportunity is terminal (after closure). */
export function pilotCoverageAllTerminal(): boolean {
  return pilotCoverage().every((item) => isTerminal(item.status));
}

export function refreshPilotCoverageProbe() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const items = pilotCoverage();

  window.__pilotCoverage = {
    launch_mode: launchMode,
    developer_scenes_visited: [...developerScenesVisited],
    items,
    summary: operationalCompletionSummary(items),
    final_core_closed: finalCoreClosed,
    final_core_closure: lastClosure,
  };
}

// Audit 2026-09 B2: the register and coverage ride EVERY export payload
// (production included) — previously they existed only in DEV window
// probes and died with the tab. Read-only snapshots at build time;
// module-load installation so no scene has to remember to wire it.
installExportAugmenter(() => {
  const items = pilotCoverage();

  return {
    measurement_validity: serializeOpportunities(),
    pilot_coverage: {
      launch_mode: launchMode,
      developer_scenes_visited: [...developerScenesVisited],
      items,
      summary: operationalCompletionSummary(items),
      final_core_closed: finalCoreClosed,
      final_core_closure: lastClosure,
    },
  };
});

/** Test-only escape hatch (page-session state otherwise). */
export function resetPilotCoverageState() {
  launchMode = 'participant';
  developerScenesVisited.length = 0;
  finalCoreClosed = false;
  lastClosure = null;
}
