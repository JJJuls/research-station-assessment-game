import { calibrationAnomalyScenario } from './definitions/calibrationAnomaly';
import { incidentReconciliationScenario } from './definitions/incidentReconciliation';
import { priorityAllocationScenario } from './definitions/priorityAllocation';
import { protocolBreachScenario } from './definitions/protocolBreach';
import { isScenarioCompleted } from './ScenarioController';

/**
 * The mandatory four-decision pilot route (FABLE-AUTONOMOUS-PILOT-ROUTE-
 * REPAIR): every participant must complete all four pilot scenarios before
 * Final Core synchronization. This table is the single presentation source
 * for that requirement — the route-objective HUD line (RoomScene) and the
 * Final Core route gate (FinalCoreScene) both read it, so the displayed
 * direction and the enforced gate can never disagree.
 *
 * Room labels are the Hub door labels (stationRegistry) so the direction
 * matches the door the player must take; 'Station Hub' hosts the
 * allocation console itself. Order is the development route order
 * (docs/game/PILOT-FOUR-SCENARIO-ROUTE.md); free-roaming completion in any
 * order is equally valid — the HUD simply directs to the FIRST pending
 * stop.
 *
 * Nothing here is scientific data: labels and ordering are presentation
 * constants, and completion state is the scenario framework's module state
 * (never SessionState — scenario progress must stay out of scored mission
 * fields and out of active_objectives, which feeds the Q18-relevant
 * objective_active event).
 */
export interface PilotRouteStop {
  scenarioId: string;
  /** In-fiction console label (matches the station's in-world label). */
  stationLabel: string;
  /** In-fiction location label (matches the Hub door ring labels). */
  roomLabel: string;
}

export const PILOT_SCENARIO_ROUTE: readonly PilotRouteStop[] = [
  {
    scenarioId: priorityAllocationScenario.id,
    stationLabel: priorityAllocationScenario.stationLabel,
    roomLabel: 'Station Hub',
  },
  {
    scenarioId: calibrationAnomalyScenario.id,
    stationLabel: calibrationAnomalyScenario.stationLabel,
    roomLabel: 'Engineer Hub',
  },
  {
    scenarioId: incidentReconciliationScenario.id,
    stationLabel: incidentReconciliationScenario.stationLabel,
    roomLabel: 'Archive',
  },
  {
    scenarioId: protocolBreachScenario.id,
    stationLabel: protocolBreachScenario.stationLabel,
    roomLabel: 'Inventory / Prep',
  },
];

/** Total number of mandatory pilot decisions on the route. */
export const PILOT_DECISION_TOTAL = PILOT_SCENARIO_ROUTE.length;

/**
 * Route stops whose scenario is not yet completed, in route order (empty
 * once every decision is logged). Reads EXPLICIT per-scenario completion
 * state only.
 */
export function getRemainingPilotDecisions(): PilotRouteStop[] {
  return PILOT_SCENARIO_ROUTE.filter(
    (stop) => !isScenarioCompleted(stop.scenarioId),
  );
}
