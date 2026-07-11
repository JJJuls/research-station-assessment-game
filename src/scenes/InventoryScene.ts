import { key } from '../constants';
import {
  FIELD_KIT_ITEM_ID,
  WORKSPACE_STATUS_DISORDERED,
  WORKSPACE_STATUS_TIDY,
} from '../data/missionVocabulary';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { RoomScene } from '../world';

/**
 * Inventory / Preparation Room — V3 §4 Room 4,
 * docs/game/rooms/04-inventory-preparation-room.md. Q01-Q04 organisation
 * (Q04 = cleanup/disorder ONLY, never planning-before-acting) + Q30
 * optional/exploratory Goal-Time shortcut proxy. Interface deliberately
 * stays simple choice prompts — it must measure organisation, not
 * drag-and-drop skill (V3 validity caution).
 *
 * Ported audit-first from the prototype station: the three legacy options
 * (labels, feedback strings, event sequences, one-shot gate text) are
 * preserved verbatim. Canonical events are added alongside; the
 * contract-required separable sub-steps (verification prompt, cleanup/
 * confirm step) are implemented as chained U3 stages AFTER the systematic
 * path, whose legacy meaning ("open the checklist and pack in order")
 * asserted nothing about verification/cleanup. The shortcut and
 * sort-and-verify paths keep their legacy asserted outcomes and end
 * immediately — chaining choices after them would contradict what their
 * feedback text states.
 *
 * Emission placement note (documented in the room doc):
 * inventory_checklist_opened (Q01, organisation) fires on the "Open the
 * checklist..." option, NOT on prompt open — the alias table's mechanical
 * inventory_prep_opened rename would credit checklist use to shortcut
 * players and contaminate the Q01 signal; MASTER_33_ALIGNMENT.md defines
 * Q01 as checklist-driven behaviour, which is the option, not the prompt.
 * Per-item events (inventory_item_sorted_correct, inventory_item_misplaced,
 * wrong_tool_selected, prepared_tool_used, readiness_verified) remain
 * unemitted: no per-item mechanic exists in this simple interface, and
 * inventing one is a task-design decision beyond an audit-first port.
 */
export class InventoryScene extends RoomScene {
  protected readonly roomId = 'inventory_prep_room';
  protected readonly roomInteractionKey: InteractionKey =
    'inventoryPrepChecklist';

  constructor() {
    super(key.scene.inventory);
  }

  protected getLayout(): RoomLayout {
    // 20×13 prep room: door to the Station Hub at the bottom, quartermaster
    // console alcove top-center, storage racks and the prep bench flanking.
    return {
      grid: [
        '####################',
        '#..................#',
        '#..................#',
        '#.####..####..####.#',
        '#.####..####..####.#',
        '#..................#',
        '#..................#',
        '#.####........####.#',
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
    // Quartermaster console (top-center alcove). No committed texture for
    // this room in outpost-assets-v1 — placeholder marker by design.
    this.addStation({
      interactionKey: 'inventoryPrepChecklist',
      label: 'Quartermaster Console',
      x: 10 * 32,
      y: 5.5 * 32,
      promptBody:
        'The checklist system asks you to prepare a repair kit before the next station cycle. How do you proceed?',
      onPromptOpened: () => {
        // Prototype one-shot gate, exact feedback text preserved.
        if (this.isPrepCompleted()) {
          this.showFeedbackMessage(
            'The checklist system has already logged your preparation. Continue with the remaining station tasks.',
          );
          return false;
        }

        this.logRoomEvent('inventoryPrepChecklist', 'inventory_prep_opened');
        return true;
      },
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      interactionKey: 'inventoryPrepChecklist',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'inventory_prep_room',
      },
    });
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('inventoryPrepChecklist', 'inventory_room_entered');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'inventoryPrepChecklist') {
      return [];
    }

    // Legacy options verbatim (labels, feedback, event order); canonical
    // equivalents emitted directly after their legacy alias (alias table,
    // event-schema §4 Inventory).
    return [
      {
        label: 'Grab tools quickly without checking the list.',
        feedback:
          'You move quickly, but the kit is incomplete and the workspace is left unresolved.',
        getEventTypes: () => [
          'inventory_prep_shortcut',
          'inventory_required_item_missed',
          'missing_item',
          'inventory_disorganized_action',
          'workspace_left_disordered',
          'inventory_verification_skipped',
        ],
        onSelected: () => {
          // Kit incomplete: field_kit deliberately NOT added to
          // prepared_items (Final Core missing-item flag source).
          researchRuntime.sessionState.setWorkspaceStatus(
            WORKSPACE_STATUS_DISORDERED,
          );
          this.markPrepCompleted();
        },
      },
      {
        label: 'Open the checklist and pack the required tools in order.',
        feedback:
          'You follow the checklist and prepare the required tools in a clear order.',
        getEventTypes: () => [
          'inventory_checklist_used',
          'inventory_checklist_opened',
          'inventory_required_tools_packed',
          'correct_tool_selected',
          'inventory_systematic_prep',
          'inventory_sequence_followed',
        ],
        nextStage: () =>
          this.buildVerificationStage(
            'You follow the checklist and prepare the required tools in a clear order.',
          ),
      },
      {
        label: 'Sort the workspace and verify the kit before leaving.',
        feedback:
          'You leave the prep area tidy and verify that the repair kit is ready.',
        getEventTypes: () => [
          'inventory_workspace_sorted',
          'workspace_tidy_confirmed',
          'inventory_kit_verified',
          'inventory_verified_complete',
          'inventory_cleanup_completed',
          'cleanup_completed',
        ],
        onSelected: () => {
          researchRuntime.sessionState.addPreparedItem(FIELD_KIT_ITEM_ID);
          researchRuntime.sessionState.setWorkspaceStatus(
            WORKSPACE_STATUS_TIDY,
          );
          this.markPrepCompleted();
        },
      },
    ];
  }

  /**
   * Contract-required verification prompt (V3 Room 4 mini-game mechanics;
   * Q30 process signal). The skip option must stay plausible — a
   * time-saving choice, not an obviously wrong one (Goal-Time proxy
   * framing, optional/exploratory).
   */
  private buildVerificationStage(packFeedback: string): PromptStage {
    return {
      body: `${packFeedback}\n\nThe kit is packed. The quartermaster console offers a readiness verification before you leave.`,
      options: [
        {
          label: 'Run the readiness verification before leaving.',
          feedback: '',
          getEventTypes: () => ['inventory_verified_complete'],
          nextStage: () =>
            this.buildCleanupStage(
              'Kit verified: all required tools are present and secured.',
            ),
        },
        {
          label: 'Skip the check — the kit already follows the checklist.',
          feedback: '',
          getEventTypes: () => ['inventory_verification_skipped'],
          nextStage: () =>
            this.buildCleanupStage('You skip the readiness check.'),
        },
      ],
    };
  }

  /**
   * Contract-required cleanup/confirm step (Q04 = cleanup/disorder only).
   * Leaving the bench is framed as a plausible time-saving exit, never a
   * labelled "wrong" choice.
   */
  private buildCleanupStage(verifyFeedback: string): PromptStage {
    return {
      body: `${verifyFeedback}\n\nThe prep bench is still covered with sorting trays and wrappers.`,
      options: [
        {
          label: 'Sort the workspace before heading out.',
          feedback:
            'You leave the prep area tidy. The kit is ready for the next station cycle.',
          getEventTypes: () => [
            'workspace_tidy_confirmed',
            'cleanup_completed',
          ],
          onSelected: () => {
            researchRuntime.sessionState.addPreparedItem(FIELD_KIT_ITEM_ID);
            researchRuntime.sessionState.setWorkspaceStatus(
              WORKSPACE_STATUS_TIDY,
            );
            this.markPrepCompleted();
          },
        },
        {
          label: 'Head out and leave the bench as it is.',
          feedback: 'You head out. The bench stays cluttered behind you.',
          getEventTypes: () => ['workspace_left_disordered'],
          onSelected: () => {
            researchRuntime.sessionState.addPreparedItem(FIELD_KIT_ITEM_ID);
            researchRuntime.sessionState.setWorkspaceStatus(
              WORKSPACE_STATUS_DISORDERED,
            );
            this.markPrepCompleted();
          },
        },
      ],
    };
  }

  private markPrepCompleted() {
    // One-shot guard prevents repeated assessment submissions from
    // inflating organization scores (prototype comment preserved).
    researchRuntime.sessionState.markRoomCompleted('inventory_prep_room');
  }

  private isPrepCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('inventory_prep_room');
  }
}
