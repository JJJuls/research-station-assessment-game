import { key } from '../constants';
import type { PlacementDestination, StorageBinId } from '../data/itemRegistry';
import {
  allItemsPlaced,
  carriedItemId,
  getBinLabel,
  getDestinationTag,
  getRegistryItem,
  itemsAtLocation,
  KIT_REQUIRED_ITEM_IDS,
  kitPreparationState,
  misplacedItemIds,
  missingKitItemIds,
} from '../data/itemRegistry';
import {
  FIELD_KIT_ITEM_ID,
  WORKSPACE_STATUS_DISORDERED,
  WORKSPACE_STATUS_TIDY,
} from '../data/missionVocabulary';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import { protocolBreachScenario, ScenarioController } from '../scenarios';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { CANONICAL_EVENT_CONTEXT, RoomScene } from '../world';

/**
 * Inventory / Preparation Room — V3 §4 Room 4,
 * docs/game/rooms/04-inventory-preparation-room.md,
 * docs/game/CANONICAL-ROOM-AND-MINIGAME-CONTRACTS.md §R4. Q01-Q04
 * organisation (Q04 = cleanup/disorder ONLY, never planning-before-acting)
 * + Q30 optional/exploratory Goal-Time shortcut proxy (SA-4 owns the live
 * Q30 tags — untouched here).
 *
 * Two coexisting interfaces (FABLE-NEXT-02):
 *
 * 1. LEGACY prompt paths — the three prototype options (labels, feedback
 *    strings, event sequences, one-shot gate text) are preserved verbatim,
 *    with their canonical alias events emitted additively (alias table,
 *    event-schema §4 Inventory). Existing specs and journeys drive these
 *    unchanged.
 * 2. PER-ITEM preparation mode (console option 4, contract §R4 target
 *    minigame) — the quartermaster releases the bench stock and the player
 *    collects registry items one at a time (src/data/itemRegistry.ts) and
 *    places each into a labelled storage bin or the field kit crate.
 *    Close-out at the console runs an unmissable bench review (the ONE
 *    correction opportunity — errors before it never count), then a
 *    verify-or-skip stage, then the explicit restore-vs-leave cleanup
 *    stage. Every close-out path, including the rushed one, ends at the
 *    cleanup stage, so disorder is always CHOSEN, never asserted.
 *
 * Emission placement notes (documented in the room doc):
 * - inventory_checklist_opened (Q01) fires only on checklist ACTIONS —
 *   the legacy "Open the checklist..." option and the per-item mode's
 *   "Check the kit requisition list." option — never on prompt open
 *   (shortcut players must not earn checklist credit).
 * - Per-item placements log exactly ONE event per act with `object_id` =
 *   registry item_id and `attempt_number`: bins log
 *   inventory_item_sorted_correct/inventory_item_misplaced, the kit crate
 *   logs correct_tool_selected/wrong_tool_selected. Placement feedback is
 *   neutral — errors are surfaced only at the review step.
 * - Correction telemetry is derivable (corrected re-placement = a correct
 *   placement event after inventory_item_misplaced/wrong_tool_selected
 *   with a higher attempt_number); inventory_item_corrected stays a
 *   CANDIDATE and is NOT emitted.
 * - readiness_verified stays deliberately unemitted: no distinct readiness
 *   action exists, and it must never be double-logged from the same click
 *   as inventory_verified_complete.
 */
declare global {
  interface Window {
    /**
     * FABLE-NEXT-06 Phase 3 DEV probe: the rendered prep status side
     * panel text (participant labels only). Read-only; never read back
     * into gameplay.
     */
    __prepStatusText?: string | null;
  }
}

export class InventoryScene extends RoomScene {
  protected readonly roomId = 'inventory_prep_room';
  protected readonly roomInteractionKey: InteractionKey =
    'inventoryPrepChecklist';

  /**
   * FABLE-NEXT-06 Phase 3: persistent read-only prep status side panel
   * (UI-PRESENTATION-CONTRACT.md par.2 "status side panel") — requisition
   * checklist, single carried slot, and bench contents rendered from the
   * existing kitPreparationState. Sits in the viewport margin right of
   * the 640px room map; never an input surface, never a score display,
   * glyph-based state cues (non-colour-only).
   */
  private prepStatusPanel: { setText: (value: string) => void } | null = null;
  private prepStatusValue = '';

  /**
   * Pilot Scenario D (colleague protocol breach) — additive station driven
   * by the src/scenarios framework; the quartermaster prep task and its
   * Q01-Q04/Q30 measurement are untouched. Recreated per scene instance;
   * progress lives at framework module scope.
   */
  private breachScenario: ScenarioController | null = null;

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
    // Quartermaster console (top-center alcove). NEXT-07 Phase 2:
    // procedural wall-console texture; position, radius, label, prompt
    // strings and events unchanged (art swaps never alter interaction
    // regions).
    this.addStation({
      interactionKey: 'inventoryPrepChecklist',
      label: 'Quartermaster Console',
      x: 10 * 32,
      y: 5.5 * 32,
      texture: 'proc-console-quartermaster',
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

    // Per-item preparation stations (FABLE-NEXT-02, contract §R4 layout:
    // prep bench, labelled bins, kit crate). Placement keeps every
    // interactable pair ≥72px apart and preserves the seal log, console
    // and Hub door as strict nearest targets on their audited approaches:
    // bins sit in the top corridor (y 64), the bench mirrors the seal log
    // on the right row-7 block, the kit crate floats in the open
    // south-west floor ≥115px from the seal log and ≥132px from the door.
    this.addStation({
      interactionKey: 'inventoryBinHandTools',
      label: 'Hand Tools Rack',
      x: 4 * 32,
      y: 2 * 32,
      texture: 'proc-rack-tools',
      promptBody: 'Labelled station storage.',
      onPromptOpened: () => this.openPerItemStation(),
    });
    this.addStation({
      interactionKey: 'inventoryBinConsumables',
      label: 'Consumables Bin',
      x: 10 * 32,
      y: 2 * 32,
      texture: 'proc-bin-consumables',
      promptBody: 'Labelled station storage.',
      onPromptOpened: () => this.openPerItemStation(),
    });
    this.addStation({
      interactionKey: 'inventoryBinElectronics',
      label: 'Electronics Shelf',
      x: 16 * 32,
      y: 2 * 32,
      texture: 'proc-shelf-electronics',
      promptBody: 'Labelled station storage.',
      onPromptOpened: () => this.openPerItemStation(),
    });
    this.addStation({
      interactionKey: 'inventoryPrepBench',
      label: 'Prep Bench',
      x: 16 * 32,
      y: 7.5 * 32,
      texture: 'proc-bench-prep',
      promptBody:
        'Requisition gear is staged on the bench, each piece tagged for the kit or a storage rack.',
      onPromptOpened: () => this.openPerItemStation(),
    });
    this.addStation({
      interactionKey: 'inventoryKitCrate',
      label: 'Field Kit Crate',
      x: 6 * 32,
      y: 10.5 * 32,
      texture: 'proc-crate-fieldkit',
      promptBody: 'The field kit crate sits open, ready to pack.',
      onPromptOpened: () => this.openPerItemStation(),
    });

    // Pilot Scenario D: supply airlock seal log on the left storage block
    // (4*32, 7.5*32), approached from the open row below — 194+ px from
    // the entry spawn, 202 px from the quartermaster console, and 230+ px
    // from the Hub door, so no 72 px interaction radius overlaps and each
    // interactable stays the strict nearest target on its own approach.
    this.breachScenario = new ScenarioController(protocolBreachScenario, {
      logScenarioEvent: (eventType, context) =>
        this.logScenarioEvent('inventorySealLog', eventType, context),
      showFeedback: (message) => this.showFeedbackMessage(message),
    });
    // NEXT-07 Phase 3: shared scenario-console texture (identical ×4;
    // set in place so the config's promptBody closure stays intact).
    const breachConfig = this.breachScenario.buildStationConfig({
      x: 4 * 32,
      y: 7.5 * 32,
    });

    breachConfig.texture = 'proc-console-scenario';
    this.addStation(breachConfig);

    // NEXT-07 Phase 2 dressing. The Quartermaster figure stands beside
    // (east of) the console — non-colliding, non-interactive decor with
    // no label (D-N07-1 resolved default: the console label carries the
    // role) and no cyan, clear of the bin-approach corridors (x 192-256
    // and 384-448) and of the console's south approach. Committed props
    // dress the flanking storage blocks (A2 reuse, visual plan §3.5),
    // duller than the room's stations.
    this.addDecor(372, 176, 'proc-npc-vale');
    this.addDecor(96, 128, 'prop-dock-crates');
    this.addDecor(512, 128, 'prop-archive-shelves');

    // Door back to the Station Hub.
    this.addDoor({
      x: 10 * 32, // center of the bottom '--'
      y: 11 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'inventoryPrepChecklist',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'inventory_prep_room',
      },
    });

    // FABLE-NEXT-06 Phase 3: prep status side panel (shared primitive).
    this.prepStatusPanel = this.addStatusSidePanel();
    this.prepStatusValue = '';
    this.refreshPrepStatusPanel();
  }

  /**
   * Recomposes the side panel from live kit state (change-detected; cheap
   * string build over 8 items). Called per frame from onRoomUpdate so
   * every prompt selection's effect is visible immediately.
   */
  private refreshPrepStatusPanel(): void {
    if (this.prepStatusPanel === null) {
      return;
    }

    // SA-11 (research-owner ruling pending): the NEXT-06 task mandates a
    // visible requisition checklist, but a live packed-state display
    // pre-empts the checklist-consultation and verify-vs-skip
    // measurements (research-data-review finding). Until ruled, the panel
    // deliberately shows only the fiction-self-evident state: what is in
    // hand and what is still on the bench. No requisition display here.
    const lines: string[] = ['PREP STATUS'];

    const carried = carriedItemId();

    lines.push('', 'Carried:');
    lines.push(
      carried === null ? '(hands free)' : getRegistryItem(carried).label,
    );

    const bench = itemsAtLocation('prep_bench');

    lines.push('', `Bench (${bench.length} out):`);
    for (const itemId of bench) {
      lines.push(`- ${getRegistryItem(itemId).label}`);
    }

    const value = lines.join('\n');

    if (value !== this.prepStatusValue) {
      this.prepStatusValue = value;
      this.prepStatusPanel.setText(value);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__prepStatusText = value;
      }
    }
  }

  protected onRoomUpdate(): void {
    this.refreshPrepStatusPanel();
  }

  protected onRoomExit(): void {
    // Leaving with the breach scenario entered but uncommitted is measured
    // abandonment telemetry (framework logs once per departure).
    this.breachScenario?.handleRoomExit();
  }

  protected onRoomEntered(): void {
    this.logRoomEvent('inventoryPrepChecklist', 'inventory_room_entered');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'inventorySealLog') {
      return this.breachScenario?.getRootOptions() ?? [];
    }

    if (interactionKey === 'inventoryPrepBench') {
      return this.buildBenchOptions();
    }

    if (interactionKey === 'inventoryKitCrate') {
      return this.buildDestinationOptions('inventoryKitCrate', 'kit_crate');
    }

    const binId = BIN_IDS_BY_INTERACTION[interactionKey];

    if (binId !== undefined) {
      return this.buildDestinationOptions(interactionKey, binId);
    }

    if (interactionKey !== 'inventoryPrepChecklist') {
      return [];
    }

    if (kitPreparationState.engaged) {
      return this.buildEngagedConsoleOptions();
    }

    // Legacy options verbatim (labels, feedback, event order); canonical
    // equivalents emitted directly after their legacy alias (alias table,
    // event-schema §4 Inventory). Option 4 (per-item preparation) is
    // additive AFTER them so every existing 1/2/3 choreography is
    // untouched.
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
      {
        // Per-item preparation mode (FABLE-NEXT-02). Selecting it emits NO
        // event: checklist credit belongs to checklist actions only, and
        // no approved name exists for mode engagement (its occurrence is
        // derivable from the per-item events that follow).
        label: 'Stage the kit yourself at the bench, item by item.',
        feedback:
          'The quartermaster releases the bench stock. Collect each item, place it where its tag says, and close out at this console.',
        getEventTypes: () => [],
        onSelected: () => {
          kitPreparationState.engaged = true;
        },
      },
    ];
  }

  // ————————————————————————————————————————————————————————————————————
  // Per-item preparation mode (FABLE-NEXT-02)
  // ————————————————————————————————————————————————————————————————————

  /**
   * Shared onPromptOpened gate for the bench, bins and kit crate: inert
   * until the quartermaster releases the stock, and closed out (with the
   * same one-shot protection as the console) after prep completion so
   * repeated interactions can never inflate placement counts.
   */
  private openPerItemStation(): boolean {
    if (this.isPrepCompleted()) {
      this.showFeedbackMessage('The prep cycle is closed out for this shift.');
      return false;
    }

    if (!kitPreparationState.engaged) {
      this.showFeedbackMessage(
        'The bench stock is racked and strapped. Use the quartermaster console to start preparation.',
      );
      return false;
    }

    return true;
  }

  /** Console options while per-item preparation is underway. */
  private buildEngagedConsoleOptions(): PromptOption[] {
    return [
      {
        label: 'Check the kit requisition list.',
        feedback: '',
        // Checklist ACTION — the only per-item-mode source of the Q01
        // checklist event (emission-placement rule).
        getEventTypes: () => ['inventory_checklist_opened'],
        nextStage: () => this.buildChecklistStage(),
      },
      {
        label: 'Close out the prep and report readiness.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          // Preventable-omission flags: each still-missing requisition
          // item is logged once per session, at the review that surfaces
          // it (object_id = item_id; unmapped raw telemetry per schema).
          for (const itemId of missingKitItemIds()) {
            if (!kitPreparationState.missing_item_logged.includes(itemId)) {
              kitPreparationState.missing_item_logged.push(itemId);
              this.logItemEvent(
                'inventoryPrepChecklist',
                'missing_item',
                itemId,
              );
            }
          }
        },
        nextStage: () => this.buildReviewStage(),
      },
    ];
  }

  private buildChecklistStage(): PromptStage {
    const lines = KIT_REQUIRED_ITEM_IDS.map(
      (itemId, index) => `${index + 1}. ${getRegistryItem(itemId).label}`,
    ).join('\n');

    return {
      body: `Kit requisition — pack into the kit crate, in this order:\n${lines}\n\nStray gear on the bench carries a rack tag naming its storage rack.`,
      options: [
        {
          label: 'Close the list.',
          feedback: '',
          getEventTypes: () => [],
        },
      ],
    };
  }

  /**
   * The unmissable bench review (contract §R4: the correction opportunity
   * is structurally guaranteed on every close-out path — its occurrence is
   * derivable from event order, and errors BEFORE it never count as trait
   * evidence). It lists the current staging issues once, without moral
   * framing, and lets the player go back and correct or proceed.
   */
  private buildReviewStage(): PromptStage {
    const issues = this.describeStagingIssues();

    if (issues.length === 0) {
      return {
        body: 'Bench review: every requisition item is packed and all stray gear is racked.',
        options: [
          {
            label: 'Proceed to the readiness check.',
            feedback: '',
            getEventTypes: () => [],
            nextStage: () => this.buildPerItemVerificationStage(),
          },
        ],
      };
    }

    return {
      body: `Bench review:\n${issues.join('\n')}`,
      options: [
        {
          label: 'Go back to the bench and adjust the staging.',
          feedback: 'You head back to the staging.',
          getEventTypes: () => [],
        },
        {
          label: 'Proceed to the readiness check anyway.',
          feedback: '',
          getEventTypes: () => [],
          nextStage: () => this.buildPerItemVerificationStage(),
        },
      ],
    };
  }

  /** Neutral staging-issue lines for the review body. */
  private describeStagingIssues(): string[] {
    const issues: string[] = [];
    const onBench = itemsAtLocation('prep_bench');
    const carried = carriedItemId();

    if (onBench.length > 0) {
      issues.push(
        `Still on the bench: ${onBench
          .map((itemId) => getRegistryItem(itemId).label)
          .join(', ')}.`,
      );
    }

    if (carried !== null) {
      issues.push(`In hand: ${getRegistryItem(carried).label}.`);
    }

    const missing = missingKitItemIds().filter(
      (itemId) => !onBench.includes(itemId) && itemId !== carried,
    );

    if (missing.length > 0) {
      issues.push(
        `Missing from the kit requisition: ${missing
          .map((itemId) => getRegistryItem(itemId).label)
          .join(', ')}.`,
      );
    }

    for (const itemId of misplacedItemIds()) {
      const item = getRegistryItem(itemId);
      const location = kitPreparationState.locations[itemId];
      const locationLabel =
        location === 'kit_crate'
          ? 'the kit crate'
          : `the ${getBinLabel(location as StorageBinId)}`;

      issues.push(
        `${item.label} is in ${locationLabel}; its tag says ${getDestinationTag(item)}.`,
      );
    }

    return issues;
  }

  /**
   * Per-item verification stage. The skip option stays plausible — a
   * time-saving choice, not an obviously wrong one (Q30 tags on these two
   * events are SA-4's question and are untouched here).
   */
  private buildPerItemVerificationStage(): PromptStage {
    return {
      body: 'The console offers a readiness verification before you close out.',
      options: [
        {
          label: 'Run the readiness verification before closing out.',
          feedback: '',
          getEventTypes: () => ['inventory_verified_complete'],
          nextStage: () => {
            const missing = missingKitItemIds().length;

            return this.buildPerItemCleanupStage(
              missing === 0
                ? 'Verification result: kit requisition complete.'
                : `Verification result: ${missing} requisition item${missing === 1 ? '' : 's'} missing.`,
            );
          },
        },
        {
          label: 'Skip the check and close out now.',
          feedback: '',
          getEventTypes: () => ['inventory_verification_skipped'],
          nextStage: () =>
            this.buildPerItemCleanupStage('You skip the readiness check.'),
        },
      ],
    };
  }

  /**
   * Per-item cleanup stage (Q04 = cleanup/disorder only). Terminates EVERY
   * close-out path — including the rushed one — so leaving the bench
   * covered is always an explicit choice, framed as plausible time-saving,
   * never a labelled "wrong" answer.
   */
  private buildPerItemCleanupStage(verifyFeedback: string): PromptStage {
    return {
      body: `${verifyFeedback}\n\nSorting trays and wrappers still cover the prep bench.`,
      options: [
        {
          label: 'Reset the bench before heading out.',
          feedback:
            'You reset the bench. The prep cycle is closed out for this shift.',
          getEventTypes: () => [
            'workspace_tidy_confirmed',
            'cleanup_completed',
          ],
          onSelected: () => {
            this.completePerItemPrep(WORKSPACE_STATUS_TIDY);
          },
        },
        {
          label: 'Head out and leave the bench as it is.',
          feedback: 'You head out. The bench stays covered behind you.',
          getEventTypes: () => ['workspace_left_disordered'],
          onSelected: () => {
            this.completePerItemPrep(WORKSPACE_STATUS_DISORDERED);
          },
        },
      ],
    };
  }

  /** Bench options: single-slot pickup, or set the carried item down. */
  private buildBenchOptions(): PromptOption[] {
    const carried = carriedItemId();

    if (carried !== null) {
      const item = getRegistryItem(carried);

      return [
        {
          label: `Set the ${item.label} back down on the bench.`,
          feedback: `You set the ${item.label} back on the bench.`,
          getEventTypes: () => [],
          onSelected: () => {
            kitPreparationState.locations[carried] = 'prep_bench';
          },
        },
        this.buildStepBackOption(),
      ];
    }

    const takeOptions = itemsAtLocation('prep_bench').map((itemId) => {
      const item = getRegistryItem(itemId);

      return {
        label: `Take the ${item.label} (${getDestinationTag(item)}).`,
        feedback: `You pick up the ${item.label}.`,
        getEventTypes: () => [],
        onSelected: () => {
          kitPreparationState.locations[itemId] = 'carried';
        },
      };
    });

    if (takeOptions.length === 0) {
      return [
        {
          label: 'The bench staging is empty.',
          feedback: 'Nothing is left on the bench.',
          getEventTypes: () => [],
        },
      ];
    }

    return [...takeOptions, this.buildStepBackOption()];
  }

  /**
   * Options for a placement destination (a labelled bin or the kit crate):
   * stow the carried item, or take a previously placed item back out for
   * correction. Taking an item back emits no event — the corrected
   * RE-placement (higher attempt_number) is the logged act.
   */
  private buildDestinationOptions(
    interactionKey: InteractionKey,
    destination: PlacementDestination,
  ): PromptOption[] {
    const carried = carriedItemId();
    const options: PromptOption[] = [];

    if (carried !== null) {
      const item = getRegistryItem(carried);
      const verb =
        destination === 'kit_crate'
          ? `Pack the ${item.label} into the kit.`
          : `Stow the ${item.label} here.`;

      options.push(
        {
          label: verb,
          // Neutral placement feedback — correctness is surfaced only at
          // the review step (first mistakes never count).
          feedback:
            destination === 'kit_crate'
              ? `You pack the ${item.label} into the kit crate.`
              : `You stow the ${item.label} in the ${getBinLabel(destination)}.`,
          getEventTypes: () => [],
          onSelected: () => {
            this.placeCarriedItem(interactionKey, carried, destination);
          },
        },
        {
          label: 'Keep hold of it.',
          feedback: '',
          getEventTypes: () => [],
        },
      );

      return options;
    }

    for (const itemId of itemsAtLocation(destination)) {
      const item = getRegistryItem(itemId);

      options.push({
        label: `Take the ${item.label} back out.`,
        feedback: `You take the ${item.label} back out.`,
        getEventTypes: () => [],
        onSelected: () => {
          kitPreparationState.locations[itemId] = 'carried';
        },
      });
    }

    options.push(this.buildStepBackOption());

    return options;
  }

  private buildStepBackOption(): PromptOption {
    return {
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    };
  }

  /**
   * One placement = one event (task-file payload rule): the kit crate logs
   * tool selection (Q03 rows), bins log sorting accuracy (Q01/Q02 rows);
   * `object_id` = registry item_id and `attempt_number` = this item's
   * placement count, so corrections are derivable from the event sequence
   * without any candidate event name.
   */
  private placeCarriedItem(
    interactionKey: InteractionKey,
    itemId: string,
    destination: PlacementDestination,
  ) {
    const item = getRegistryItem(itemId);
    const state = kitPreparationState;

    state.attempts[itemId] += 1;

    const eventType =
      destination === 'kit_crate'
        ? item.destination === 'kit_crate'
          ? 'correct_tool_selected'
          : 'wrong_tool_selected'
        : item.destination === destination
          ? 'inventory_item_sorted_correct'
          : 'inventory_item_misplaced';

    this.logItemEvent(
      interactionKey,
      eventType,
      itemId,
      state.attempts[itemId],
    );

    state.locations[itemId] = destination;

    if (
      destination === 'kit_crate' &&
      item.destination === 'kit_crate' &&
      !state.kit_first_placement_order.includes(itemId)
    ) {
      state.kit_first_placement_order.push(itemId);
    }

    this.logSequenceMilestones();
  }

  /**
   * Task-level sequence milestones, logged once per session with the
   * console's interaction context (room-task scope, not a single object):
   * - inventory_sequence_completed: the sort pass is finished — every
   *   registry item has been placed at some destination.
   * - inventory_sequence_followed: judged once, at the FIRST moment the
   *   kit holds all required items — it fires iff their first placements
   *   into the kit happened in checklist order. (The legacy alias path
   *   emits the same canonical name on option 2, mutually exclusive with
   *   this mode.)
   */
  private logSequenceMilestones() {
    const state = kitPreparationState;

    if (!state.sequence_completed_logged && allItemsPlaced()) {
      state.sequence_completed_logged = true;
      this.logRoomEvent(
        'inventoryPrepChecklist',
        'inventory_sequence_completed',
      );
    }

    if (
      !state.sequence_followed_evaluated &&
      missingKitItemIds().length === 0
    ) {
      state.sequence_followed_evaluated = true;

      const followed = state.kit_first_placement_order.every(
        (itemId, index) => itemId === KIT_REQUIRED_ITEM_IDS[index],
      );

      if (followed) {
        state.sequence_followed_logged = true;
        this.logRoomEvent(
          'inventoryPrepChecklist',
          'inventory_sequence_followed',
        );
      }
    }
  }

  /**
   * Per-item completion: the carried item (if any) returns to the bench,
   * prepared_items records the kit's actual contents (registry order) and
   * gains `field_kit` only when every required item is packed — the Final
   * Core missing-item flag derives from its absence, exactly as on the
   * legacy paths. The prepared_items field keeps its existing string[]
   * shape (task-file constraint: append-only, never retyped).
   */
  private completePerItemPrep(workspaceStatus: string) {
    const carried = carriedItemId();

    if (carried !== null) {
      kitPreparationState.locations[carried] = 'prep_bench';
    }

    for (const itemId of itemsAtLocation('kit_crate')) {
      researchRuntime.sessionState.addPreparedItem(itemId);
    }

    if (missingKitItemIds().length === 0) {
      researchRuntime.sessionState.addPreparedItem(FIELD_KIT_ITEM_ID);
    }

    researchRuntime.sessionState.setWorkspaceStatus(workspaceStatus);
    this.markPrepCompleted();
  }

  /**
   * logRoomEvent's payload shape with the `object_id` overridden to the
   * registry item_id and `attempt_number` attached (task-file payload
   * rule for per-item events). Canonical study_item_ids/construct_id
   * context still comes from CANONICAL_EVENT_CONTEXT — registrations
   * untouched; unregistered names (missing_item) stay unmapped raw
   * telemetry exactly like logRoomEvent would leave them.
   */
  private logItemEvent(
    interactionKey: InteractionKey,
    eventType: string,
    itemId: string,
    attemptNumber?: number,
  ) {
    const interaction: ResearchInteraction =
      researchInteractions[interactionKey];

    researchRuntime.logInteraction({
      scene: this.scene.key,
      episode: interaction.episode,
      event_type: eventType,
      object_id: itemId,
      x: this.player.x,
      y: this.player.y,
      room_id: interaction.room_id,
      task_id: interaction.task_id,
      attempt_number: attemptNumber,
      ...CANONICAL_EVENT_CONTEXT[eventType],
    });
  }

  // ————————————————————————————————————————————————————————————————————
  // Legacy option-2 chained stages (verbatim from the audit-first port)
  // ————————————————————————————————————————————————————————————————————

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

/** Bin interaction keys → bin ids (per-item placement routing). */
const BIN_IDS_BY_INTERACTION: Partial<Record<InteractionKey, StorageBinId>> = {
  inventoryBinHandTools: 'bin_hand_tools',
  inventoryBinConsumables: 'bin_consumables',
  inventoryBinElectronics: 'bin_electronics',
};
