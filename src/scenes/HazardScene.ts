import { key } from '../constants';
import {
  HAZARD_STATUS_INFORMED_CONTINUE,
  HAZARD_STATUS_RECKLESS_CONTINUE,
  HAZARD_STATUS_ROUTE_AVOIDED,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { createRoomTaskState, RoomScene } from '../world';

/**
 * Cross-entry hazard task state (U2 factory; session lifetime). The
 * prototype keeps `hazardInfoChecked` in Main-scene local state for the
 * whole session, so the informed-vs-reckless classification must survive
 * scene restarts in the connected world too — checking details, stepping
 * out to the Hub, and returning to continue is still an informed
 * continuation (audit-first port of Main.tsx `localState.hazardInfoChecked`).
 */
const hazardTaskState = createRoomTaskState('hazard_control_room', () => ({
  infoChecked: false,
}));

/**
 * Hazard Control Room — V3 §4 Room 5, docs/game/rooms/05-hazard-control.md.
 * Q12 (prudence/careless warning handling), Q27 (inappropriate persistence:
 * continuation despite poor basis), Q31 (Goal-Time immediate-vs-informed
 * route, optional/exploratory). Measures consequence checking and decision
 * quality under uncertainty — never fear (V3 validity caution).
 *
 * Ported audit-first from the prototype station (Main.tsx
 * 'hazardUncertaintyWarning'): the three legacy options (labels, feedback
 * strings, event names), the warning-on-prompt-open emission, the
 * repeatable prompt (the prototype has NO one-shot decision gate — the
 * terminal stays interactive, so decision events remain repeatable exactly
 * as in the legacy scene), and the live
 * `metadata.info_checked_before_continuing` flag on
 * `hazard_reckless_continue` (event-schema.md §6 worked example) are all
 * preserved verbatim.
 *
 * Additive canonical events:
 * - `hazard_room_entered` — every entry (repair/inventory precedent;
 *   unmapped: no Events-column listing in MASTER_33_ALIGNMENT.md).
 * - `hazard_route_avoided` — USER RULING D1 (2026-07-12, Option A):
 *   emitted alongside the legacy `hazard_avoidance` on the avoid branch.
 *   Raw behavioural telemetry only (study_item_ids [], no construct, no
 *   success) — never construct-scored, never in ScoringManager formulas.
 *   `hazard_info_checked` stays reserved for actual information-checking;
 *   avoidance remains analytically distinguishable from info-checking,
 *   informed/reckless continuation, and task abandonment (each has its own
 *   event; no abandonment event exists in this room's legacy or canonical
 *   spec, so none is emitted).
 *
 * Deliberately unemitted (documented gap, docs/game/rooms/
 * 05-hazard-control.md failure/edge cases): `hazard_issue_created`,
 * `hazard_issue_resolved` (no documented emission semantics or resolve
 * mechanic — defining when a consequence issue is created/resolved is a
 * task-design decision, not an audit-first port) and the cross-room
 * `final_hazard_issue` (Final Core side). SessionState.hazard_status is
 * written from the three documented decisions so a future Final Core pass
 * can read the consequence state without re-deciding semantics.
 */
export class HazardScene extends RoomScene {
  protected readonly roomId = 'hazard_control_room';
  protected readonly roomInteractionKey: InteractionKey =
    'hazardUncertaintyWarning';

  constructor() {
    super(key.scene.hazard);
  }

  protected getLayout(): RoomLayout {
    // 20×13 control room: alert-terminal alcove top-center, equipment
    // banks flanking. Central approach lane kept clear per the Wave 1B
    // Side Repair runtime finding (a central block there overlapped the
    // spawn and sealed the only approach path).
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.##....####....##.#',
        '#.##....####....##.#',
        '#..................#',
        '#..................#',
        '#.##............##.#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#########--#########',
        '####################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the Hub door, outside the 72px interaction radius.
    return { x: 10 * 32, y: 8.5 * 32 };
  }

  /**
   * FABLE-NEXT-06 Phase 5: read-only hazard status side panel (shared
   * primitive). Deliberately VALENCE-NEUTRAL: the route decision is shown
   * as continued/rerouted only - never "informed"/"reckless" (moral or
   * construct labelling is forbidden), and whether information was
   * checked is never displayed (it is the measurement).
   */
  private statusPanel: { setText: (value: string) => void } | null = null;

  private refreshStatusPanel(): void {
    if (this.statusPanel === null) {
      return;
    }

    const status = researchRuntime.sessionState.getMissionState().hazard_status;
    const lines = ['HAZARD CONTROL', '', 'Sector route:'];

    if (
      status === HAZARD_STATUS_INFORMED_CONTINUE ||
      status === HAZARD_STATUS_RECKLESS_CONTINUE
    ) {
      lines.push('[x] continued');
    } else if (status === HAZARD_STATUS_ROUTE_AVOIDED) {
      lines.push('[x] rerouted');
    } else {
      lines.push('[ ] undecided');
    }

    this.statusPanel.setText(lines.join('\n'));
  }

  protected onRoomUpdate(): void {
    this.refreshStatusPanel();
  }

  protected populateRoom(): void {
    this.statusPanel = this.addStatusSidePanel();
    this.refreshStatusPanel();

    // Hazard alert terminal (top-center alcove). Placeholder marker by
    // design — no committed texture for this room in outpost-assets-v1;
    // art is a future PixelLab decision. Label matches the prototype
    // station label; warning framing stays station-consequence
    // information, never fear/anxiety (anti-leakage note in the room doc).
    this.addStation({
      interactionKey: 'hazardUncertaintyWarning',
      label: 'Hazard Warning',
      x: 10 * 32,
      y: 5.5 * 32,
      texture: 'proc-panel-warning',
      onPromptOpened: () => {
        // Prototype semantics preserved: the warning fires on every prompt
        // open (Main.tsx has no one-shot guard for this interaction).
        this.logRoomEvent('hazardUncertaintyWarning', 'hazard_warning_seen');
        return true;
      },
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'hazardUncertaintyWarning',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'hazard_control_room',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('hazardUncertaintyWarning', 'hazard_room_entered');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'hazardUncertaintyWarning') {
      return [];
    }

    // Options 1-3 ported verbatim from the prototype (labels, feedback,
    // legacy event names and their informed/reckless branch logic). The
    // only additive change is canonical hazard_route_avoided beside the
    // legacy hazard_avoidance on option 3 (user ruling D1).
    return [
      {
        label: 'Check hazard detail',
        feedback: 'Hazard details checked.',
        getEventTypes: () => ['hazard_info_checked'],
        onSelected: () => {
          hazardTaskState.get().infoChecked = true;
        },
      },
      {
        label: 'Continue through warning',
        feedback: 'You proceeded after checking hazard information.',
        // Logged in onSelected rather than getEventTypes so the reckless
        // branch can carry the live info_checked_before_continuing
        // metadata exactly as the prototype's getCanonicalEventContext
        // computes it (event-schema.md §6 worked example) — the option
        // still logs exactly one event per selection, same as legacy.
        getEventTypes: () => [],
        onSelected: () => {
          const { infoChecked } = hazardTaskState.get();

          if (infoChecked) {
            this.logRoomEvent(
              'hazardUncertaintyWarning',
              'hazard_informed_continue',
            );
            researchRuntime.sessionState.setHazardStatus(
              HAZARD_STATUS_INFORMED_CONTINUE,
            );
          } else {
            this.logRoomEvent(
              'hazardUncertaintyWarning',
              'hazard_reckless_continue',
              { metadata: { info_checked_before_continuing: infoChecked } },
            );
            researchRuntime.sessionState.setHazardStatus(
              HAZARD_STATUS_RECKLESS_CONTINUE,
            );
          }
        },
      },
      {
        label: 'Avoid uncertain route',
        feedback: 'You avoided the uncertain route.',
        // Legacy event first, canonical D1 addition adjacent (additive
        // port precedent). Telemetry-only context comes from
        // CANONICAL_EVENT_CONTEXT (study_item_ids [], no construct).
        getEventTypes: () => ['hazard_avoidance', 'hazard_route_avoided'],
        onSelected: () => {
          researchRuntime.sessionState.setHazardStatus(
            HAZARD_STATUS_ROUTE_AVOIDED,
          );
        },
      },
    ];
  }
}
