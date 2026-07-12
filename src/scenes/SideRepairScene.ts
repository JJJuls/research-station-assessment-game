import { key } from '../constants';
import {
  SIDE_REPAIR_STATUS_ABANDONED_AFTER_START,
  SIDE_REPAIR_STATUS_COMPLETED,
  SIDE_REPAIR_STATUS_DEFERRED,
  SIDE_REPAIR_STATUS_IGNORED,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';

/**
 * Optional Side Repair Bay — V3 §4 Room 6,
 * docs/game/rooms/06-optional-side-repair-bay.md. Q07/Q16 (productiveness,
 * diligence), Q20 (Grit-S CI, weak/exploratory), Q29/Q32 (Goal-Time,
 * optional/exploratory). Voluntary effort beyond minimum requirements: not
 * required for progression, no gameplay power upgrade — only a visible
 * final-stability benefit.
 *
 * Ported audit-first from the prototype station: the three legacy options
 * (labels, feedback, event sequences) and the one-shot gate text are
 * preserved verbatim. Canonical events are added alongside
 * (stabiliser_option_offered on offer; stabiliser_accepted +
 * side_repair_accepted + side_repair_first_step on both start paths;
 * side_repair_abandoned_after_start beside the legacy
 * abandoned_after_difficulty; final_bonus_unlocked on completion).
 *
 * NEW per explicit V3 confound-control requirement: a 4th "formally defer"
 * option (side_repair_deferred) distinguishing strategic postponement from
 * abandonment — deferring does NOT complete the room, so the offer can be
 * revisited later; accepted/started/deferred/abandoned/completed stay
 * separate signals and are never collapsed. Appended after the legacy
 * options (their order/meaning is frozen; U3 N-option support).
 *
 * Deliberately unemitted: side_repair_step_completed (no multi-step
 * mechanic exists in this single-choice interface — inventing step
 * granularity is a task-design decision beyond an audit-first port) and
 * canonical side_repair_abandoned (never-accepted branch is the legacy
 * side_repair_ignored; the canonical name is not matrix-listed and its
 * never-accepted vs post-accept semantics are flagged in event-schema §4).
 */
export class SideRepairScene extends RoomScene {
  protected readonly roomId = 'optional_side_repair_bay';
  protected readonly roomInteractionKey: InteractionKey = 'optionalSideRepair';

  constructor() {
    super(key.scene.sideRepair);
  }

  protected getLayout(): RoomLayout {
    // 20×13 side bay: door to the Station Hub at the bottom-center (the
    // Hub's left-wall door leads here), utility bot alcove top-center,
    // parts shelves flanking.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.##....####....##.#',
        '#.##....####....##.#',
        '#..................#',
        '#..................#',
        '#.##....####....##.#',
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

  protected populateRoom(): void {
    // Utility Bot at the work console (top-center alcove). Placeholder
    // marker by design — no committed texture for this room in
    // outpost-assets-v1; a bot sprite is a future PixelLab decision.
    this.addStation({
      interactionKey: 'optionalSideRepair',
      label: 'Utility Bot',
      x: 10 * 32,
      y: 5.5 * 32,
      promptBody:
        'A maintenance bot flags an optional repair. It is not required for the main cycle, but completing it would improve station stability. What do you do?',
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved. A
        // DEFERRED decision does not close the offer — the defer branch
        // exists precisely so returning later stays possible.
        if (this.isDecisionLogged()) {
          this.showFeedbackMessage(
            'The maintenance bot has already logged your side repair decision. Continue with the remaining station tasks.',
          );
          return false;
        }

        this.logRoomEvent('optionalSideRepair', 'side_repair_opened');
        this.logRoomEvent('optionalSideRepair', 'stabiliser_option_offered');
        return true;
      },
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'optionalSideRepair',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'optional_side_repair_bay',
      },
    });
  }

  protected onRoomEntered(): void {
    // V3 flow step 1: the optional repair is DISCOVERED. Once per session
    // (discovery is a first-encounter fact; re-entries are navigation).
    // No canonical *_room_entered event exists for this room and no new
    // name may be invented — scene_start covers generic entry logging.
    runOncePerSession('side_repair_discovered', () => {
      this.logRoomEvent('optionalSideRepair', 'side_repair_discovered');
    });
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'optionalSideRepair') {
      return [];
    }

    // Options 1-3 ported verbatim from the prototype (labels, feedback,
    // legacy event order); canonical equivalents inserted adjacent to
    // their legacy alias. Option 4 (formal defer) is the contract-required
    // confound-control addition, appended so legacy order is untouched.
    return [
      {
        label: 'Ignore the optional repair and move on.',
        feedback:
          'You skip the optional repair. The main path remains open, but the station issue is left unresolved.',
        getEventTypes: () => ['side_repair_ignored', 'side_repair_low_effort'],
        onSelected: () => {
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_IGNORED,
          );
          this.markDecisionLogged();
        },
      },
      {
        label: 'Start the repair, but stop after the first difficulty.',
        feedback:
          'You begin the repair, but stop when the task becomes difficult.',
        getEventTypes: () => [
          'side_repair_started',
          'stabiliser_accepted',
          'side_repair_accepted',
          'side_repair_first_step',
          'side_repair_abandoned_after_difficulty',
          'side_repair_abandoned_after_start',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_ABANDONED_AFTER_START,
          );
          this.markDecisionLogged();
        },
      },
      {
        label: 'Work through the difficulty and complete the repair.',
        feedback:
          'You stay with the difficult repair until the issue is resolved.',
        getEventTypes: () => [
          'side_repair_started',
          'stabiliser_accepted',
          'side_repair_accepted',
          'side_repair_first_step',
          'side_repair_completed',
          'final_bonus_unlocked',
          'side_repair_productive_persistence',
        ],
        onSelected: () => {
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_COMPLETED,
          );
          this.markDecisionLogged();
        },
      },
      {
        label: 'Log the repair for later in the cycle.',
        feedback:
          'You log the stabiliser repair for later in the cycle. The bot notes the deferral.',
        getEventTypes: () => ['side_repair_deferred'],
        onSelected: () => {
          // Strategic postponement, NOT abandonment: the room is not
          // marked complete, so the bot's offer stays open for a return
          // visit (V3 confound-control requirement).
          researchRuntime.sessionState.setSideRepairStatus(
            SIDE_REPAIR_STATUS_DEFERRED,
          );
        },
      },
    ];
  }

  private markDecisionLogged() {
    // One-shot guard prevents repeated assessment submissions from
    // inflating productiveness scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('optional_side_repair_bay');
  }

  private isDecisionLogged(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('optional_side_repair_bay');
  }
}
