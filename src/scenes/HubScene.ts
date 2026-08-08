import { key } from '../constants';
import type { PhysicalPlacement } from '../gameplay';
import {
  AmbientWorker,
  collectLockerItem,
  FIELD_REQUISITION_TASK_ID,
  getGameItem,
  getTaskStatus,
  isRequisitionKitComplete,
  isRouteFinished,
  performWorldAction,
  PhysicalManipulationLayer,
  refreshRequisitionObjective,
  registerRouteTasks,
  remainingLockerItems,
  sfxComplete,
  sfxPickup,
  sfxUiSelect,
  showFloatingText,
} from '../gameplay';
import {
  acceptTask,
  completeTask,
  declineTask,
  registerTask,
} from '../gameplay/tasks';
import {
  assignCounterbalance,
  declareOpportunity,
  getQ03Tool,
  getQ30Instance,
  getRoomEntryLog,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  markQ03RetrievalOffered,
  markQ03StowOffered,
  markQ30DetailInspected,
  openQ03Slot,
  Q03_ENTRY_STATE_VERSION,
  Q03_OPPORTUNITY_ID,
  Q03_SLOTS,
  Q03_TOOLS,
  q03RetrievalEligible,
  q03RetrievalSummary,
  q03State,
  Q30_ENTRY_STATE_VERSION,
  q30InstanceAnswered,
  recordQ30Choice,
  refreshValidityProbe,
  stowQ03Tool,
  unstowedQ03Tools,
} from '../measurement';
import { priorityAllocationScenario, ScenarioController } from '../scenarios';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { getStationByRoomId, RoomScene, STATION_REGISTRY } from '../world';

/**
 * Station Hub — control/usability navigation area connecting the Dock to
 * the eight assessment rooms (approved plan §11). NOT a V3 assessment
 * room: every event here carries study_item_ids: [] and no construct_id,
 * and is excluded from construct scoring (event-schema.md §2,
 * "station_hub"). Re-entering the Hub never re-fires assessment-room
 * completion or Dock baseline events — those are guarded at session level.
 */
export class HubScene extends RoomScene {
  protected readonly roomId = 'station_hub';
  protected readonly roomInteractionKey: InteractionKey = 'stationHub';

  /**
   * Pilot Scenario B (priority allocation) — additive station driven by
   * the src/scenarios framework. Its scenario_* events are pilot telemetry
   * with study_item_ids/construct absent, so the Hub's "never Q-mapped"
   * rule is preserved. Recreated per scene instance; progress lives at
   * framework module scope.
   */
  private allocationScenario: ScenarioController | null = null;

  constructor() {
    super(key.scene.hub);
  }

  protected getLayout(): RoomLayout {
    // 26×16 radial hub: Dock airlock at the bottom, four doorways along
    // the top wall, one on each side wall at rows 6 and 9, central
    // console block.
    return {
      theme: 'hub',
      grid: [
        '##########################',
        '###--####--####--####--###',
        '#........................#',
        '#........................#',
        '#........................#',
        '#........................#',
        '-........................-',
        '#........................#',
        '#..........####..........#',
        '-........................-',
        '#........................#',
        '#........................#',
        '#........................#',
        '#........................#',
        '#####--#####--###--##--###',
        '##########################',
        '##########################',
        '##########################',
        '##########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Entering from a room door spawns just inside that door (registry
    // hubSpawn, placed outside the 72px interaction radius so an immediate
    // SPACE press cannot bounce the player back); default is the Dock
    // airlock at the bottom.
    const from =
      data?.spawn !== undefined ? getStationByRoomId(data.spawn) : undefined;

    // Returning from the overnight-prototype areas: just inside their
    // doors, outside the 72px radius (registry hubSpawn convention).
    if (data?.spawn === 'proto_field_site') {
      return { x: 6 * 32, y: 12 * 32 };
    }

    if (data?.spawn === 'proto_utility_bay') {
      return { x: 18 * 32, y: 12 * 32 };
    }

    if (data?.spawn === 'proto_ops_annex') {
      return { x: 22 * 32, y: 12 * 32 };
    }

    return from?.hubSpawn ?? { x: 13 * 32, y: 11.5 * 32 };
  }

  protected populateRoom(): void {
    // Door ring, driven by the station registry (array order = door order,
    // mirroring the V3 world structure list). Only rooms that exist as
    // scenes get a target — everything else is a sealed bulkhead
    // (fiction-consistent, control/usability logging only).
    for (const station of STATION_REGISTRY) {
      const isOpen = station.sceneKey !== undefined;

      this.addDoor({
        x: station.hubDoor.x,
        y: station.hubDoor.y,
        label: station.label,
        interactionKey: 'stationHub',
        texture: isOpen ? 'prop-hub-door-frame' : 'prop-hub-locked-door',
        ...(isOpen
          ? {
              target: {
                sceneKey: station.sceneKey!,
                roomId: station.roomId,
                spawn: 'station_hub',
              },
            }
          : {
              eventType: 'station_hub_sealed_door_attempted',
              eventMetadata: { door: station.roomId },
              sealedMessage: `${station.label} section is sealed — pressurisation pending.`,
            }),
      });
    }

    // Door back to the Dock (always open, center of the bottom '--').
    this.addDoor({
      x: 13 * 32,
      y: 14 * 32 + 16,
      label: 'Dock / Arrival Bay',
      texture: 'prop-hub-door-frame',
      interactionKey: 'stationHub',
      target: {
        sceneKey: key.scene.dock,
        roomId: 'dock_arrival',
        spawn: 'station_hub',
      },
    });

    // ——— Overnight-prototype field route (Unit 2): Vale + locker + airlock.
    registerRouteTasks();

    // Quartermaster Vale — visible NPC at the requisition desk (SW area,
    // clear of the status board, allocation console, and every door path).
    // Unit D: Vale visibly acknowledges a completed kit (pose swap only —
    // position, radius, prompts and events unchanged).
    this.addNpc({
      interactionKey: 'hubQuartermasterVale',
      label: 'Quartermaster Vale',
      npcName: 'Quartermaster Vale',
      texture: isRequisitionKitComplete() ? 'plv1-vale-ready' : 'plv1-vale',
      workFrames: ['plv1-vale', 'plv1-vale-b'],
      x: 4.5 * 32,
      y: 10.75 * 32,
      onPromptOpened: () => this.onValeOpened(),
    });

    // Field Equipment Locker beside the desk.
    this.addStation({
      interactionKey: 'hubFieldLocker',
      label: 'Field Equipment Locker',
      texture: 'proc-locker-field',
      x: 1.75 * 32,
      y: 10.75 * 32,
      onPromptOpened: () => this.onLockerOpened(),
    });

    // Exterior airlock to the Survey Terrace (new bottom-wall doorway).
    this.addDoor({
      x: 6 * 32,
      y: 14 * 32 + 16,
      label: 'Exterior Airlock',
      texture: 'prop-dock-airlock',
      interactionKey: 'stationHub',
      target: {
        sceneKey: key.scene.field,
        roomId: 'proto_field_site',
        spawn: 'station_hub',
      },
    });

    // ——— Unit 3 measurement-module areas (bottom-wall doorways).
    this.addDoor({
      x: 18 * 32,
      y: 14 * 32 + 16,
      label: 'Utility Bay',
      texture: 'prop-hub-door-frame',
      interactionKey: 'stationHub',
      target: {
        sceneKey: key.scene.utilityBay,
        roomId: 'proto_utility_bay',
        spawn: 'station_hub',
      },
    });
    this.addDoor({
      x: 22 * 32,
      y: 14 * 32 + 16,
      label: 'Operations Annex',
      texture: 'prop-hub-door-frame',
      interactionKey: 'stationHub',
      target: {
        sceneKey: key.scene.opsAnnex,
        roomId: 'proto_ops_annex',
        spawn: 'station_hub',
      },
    });

    // ——— Unit 3: Q03 Calibration Cabinet (SA-12 independent retrieval).
    declareOpportunity({
      opportunity_id: Q03_OPPORTUNITY_ID,
      owner: 'Q03',
      entry_state_version: Q03_ENTRY_STATE_VERSION,
    });
    registerTask({
      task_id: 'proto_bench_stowage',
      title: 'Bench maintenance',
      initialObjective:
        'Stow the three returned bench tools at the Calibration Cabinet (NE wall).',
    });
    registerTask({
      task_id: 'proto_bench_retrieval',
      title: 'Bench maintenance',
      initialObjective:
        'Fetch the Flux Calibrator from the Calibration Cabinet (NE wall).',
    });
    registerTask({
      task_id: 'proto_station_backlog',
      title: 'Station backlog',
      initialObjective:
        'Optional work is open at the Utility Bay and Operations Annex (south doors).',
    });
    this.addStation({
      interactionKey: 'hubCalibrationCabinet',
      label: 'Calibration Cabinet',
      texture: 'proc-cabinet-calibration',
      x: 20 * 32,
      y: 10 * 32,
      onPromptOpened: () => this.onCabinetOpened(),
    });
    this.initQ03Physical();

    // ——— Unit 3: Q30 instance 1 — Work Order Board (SA-4).
    declareOpportunity({
      opportunity_id: getQ30Instance('work_orders').opportunity_id,
      owner: 'Q30',
      entry_state_version: Q30_ENTRY_STATE_VERSION,
      counterbalance: this.q30OptionOrder(),
    });
    this.addStation({
      interactionKey: 'hubWorkOrderBoard',
      label: 'Work Order Board',
      texture: 'proc-board-workorders',
      x: 3 * 32,
      y: 13 * 32 + 12,
      onPromptOpened: () => this.onWorkOrderBoardOpened(),
    });

    // Mission status board (allowed progress UI: checklist/status labels,
    // V3 §2 — no scores, no personality feedback). Mounted on the central
    // console block.
    // Central console dressing (decorative).
    this.addDecor(12 * 32, 8.5 * 32, 'prop-hub-console');
    this.addDecor(14 * 32, 8.5 * 32, 'prop-hub-console');

    // Unit 4 density pass: corner/wall dressing so the hub reads as a
    // working concourse rather than an empty hall. Decorative only —
    // never colliding, clear of every station approach and door route,
    // duller than interactables (no cyan).
    this.addDecor(2.5 * 32, 4 * 32, 'prop-dock-crates');
    this.addDecor(23.5 * 32, 3 * 32, 'prop-archive-racks');
    this.addDecor(19 * 32, 12.75 * 32, 'prop-dock-crates');
    this.addDecor(9 * 32, 12.75 * 32, 'prop-archive-racks');

    // ——— Stardew-quality pass (Unit B): the hub as the centre of
    // station life. Everything below is deterministic set dressing —
    // fixed positions/loops, no collision, no interaction, no logging.

    // Soft ceiling light pools (under props; ambience only).
    this.addDecor(13 * 32, 7.2 * 32, 'proc-light-pool');
    this.addDecor(4.4 * 32, 10.6 * 32, 'proc-light-pool');
    this.addDecor(21.5 * 32, 5 * 32, 'proc-light-pool');
    this.addDecor(13 * 32, 13 * 32, 'proc-light-pool');

    // Exterior windows on the top wall between the door ring frames.
    this.addDecor(7 * 32, 46, 'proc-window-exterior');
    this.addDecor(13 * 32, 46, 'proc-window-exterior');
    this.addDecor(19 * 32, 46, 'proc-window-exterior');

    // Service pipes along the bottom wall face.
    this.addDecor(9 * 32, 14 * 32 + 12, 'proc-wall-pipes');
    this.addDecor(15.5 * 32, 14 * 32 + 12, 'proc-wall-pipes');

    // Reception counter east of the Dock airlock (arrival function).
    this.addDecor(15.5 * 32, 13 * 32, 'proc-desk-reception');

    // Crew corner (NE): galley, seating, hydroponics greens.
    this.addDecor(21.9 * 32, 4.6 * 32, 'proc-galley');
    this.addDecor(23.1 * 32, 6 * 32, 'proc-seat-bench');
    this.addDecor(20.6 * 32, 6.1 * 32, 'proc-seat-bench');
    this.addDecor(8.5 * 32, 2.4 * 32, 'proc-hydroponics');

    // Parked utility cart on the SE work floor.
    this.addDecor(19.4 * 32, 11 * 32, 'proc-cart-utility');

    // Small console status LEDs on the central block (dull tones only —
    // static positions, gentle alpha pulse; never the interactable cyan).
    for (const [x, y, color] of [
      [11.7 * 32, 8.85 * 32, 0x8a6a35],
      [14.3 * 32, 8.85 * 32, 0x3e6b74],
    ] as const) {
      const led = this.add.rectangle(x, y, 3, 3, color, 1);

      this.tweens.add({
        targets: led,
        alpha: { from: 1, to: 0.35 },
        duration: 1600,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    // Two ambient crew members on fixed patrol loops (pure decor; their
    // paths cross no station approach and they are never interactables).
    new AmbientWorker({
      scene: this,
      texture: 'proc-worker-hauler',
      waypoints: [
        { x: 20 * 32, y: 4.4 * 32 },
        { x: 23 * 32, y: 4.4 * 32 },
        { x: 23 * 32, y: 7.2 * 32 },
        { x: 20 * 32, y: 7.2 * 32 },
      ],
    });
    new AmbientWorker({
      scene: this,
      texture: 'proc-worker-tech',
      speed: 34,
      pauseMs: 1500,
      waypoints: [
        { x: 4 * 32, y: 4.7 * 32 },
        { x: 8 * 32, y: 4.7 * 32 },
        { x: 8 * 32, y: 7 * 32 },
        { x: 4 * 32, y: 7 * 32 },
      ],
    });

    this.addStation({
      interactionKey: 'stationHub',
      label: 'Status Board',
      texture: 'prop-hub-status-board',
      x: 13 * 32,
      y: 7.5 * 32,
      onPromptOpened: () => {
        this.logRoomEvent('stationHub', 'station_hub_status_board_viewed');
        this.showFeedbackMessage(this.buildStatusBoardText());
        return false;
      },
    });

    // Pilot Scenario B: priority allocation console on the SOUTH face of
    // the central console block, west end (11.5*32, 9.5*32) — 80 px from
    // the Dock-entry spawn (416, 368), keeping the registry rule that no
    // spawn lands inside a 72 px interaction radius, and 80+ px from the
    // status board (approached from the north), so each interactable stays
    // the strict nearest target on its own side. Clear of every door route
    // and of hubToStatusBoard's position-synced driving legs.
    this.allocationScenario = new ScenarioController(
      priorityAllocationScenario,
      {
        logScenarioEvent: (eventType, context) =>
          this.logScenarioEvent('hubPriorityAllocation', eventType, context),
        showFeedback: (message) => this.showFeedbackMessage(message),
      },
    );
    // NEXT-07 Phase 3: the shared scenario-console texture, identical
    // across all four ethical-scenario stations (uniform salience —
    // visual plan §2.4). Set in place on the controller's config so its
    // per-open promptBody closure keeps mutating the same object.
    const allocationConfig = this.allocationScenario.buildStationConfig({
      x: 11.5 * 32,
      y: 9.5 * 32,
    });

    allocationConfig.texture = 'proc-console-scenario';
    this.addStation(allocationConfig);
  }

  protected onRoomEntered(): void {
    // Per-entry navigation event (documented in event-schema.md §2);
    // deliberately NOT once-per-session — re-entries are legitimate
    // navigation data. Assessment/baseline events are guarded elsewhere.
    this.logRoomEvent('stationHub', 'station_hub_entered');

    const mission = researchRuntime.sessionState.getMissionState();

    if (!mission.completed_rooms.includes('dock_arrival')) {
      return;
    }

    // Q03 stow phase: offered identically to EVERY participant on the
    // first Hub visit after check-in (SA-12 standardised availability —
    // independent of Inventory behaviour and of every other item).
    if (!q03State.stow_offered) {
      markQ03StowOffered();
      markOpportunityOffered(Q03_OPPORTUNITY_ID);
      acceptTask('proto_bench_stowage');
      this.logScenarioEvent('hubCalibrationCabinet', 'proto_q03_stow_offered');
      refreshValidityProbe();
    }

    // Q03 retrieval phase: offered on a Hub visit after at least one
    // other room since the stow completed (same rule for everyone).
    if (q03RetrievalEligible()) {
      markQ03RetrievalOffered();
      acceptTask('proto_bench_retrieval');
      this.logScenarioEvent(
        'hubCalibrationCabinet',
        'proto_q03_retrieval_offered',
      );
      refreshValidityProbe();
    }

    // Optional-backlog guidance line (presentation only): points at the
    // Unit 3 module areas; completes once both areas have been visited.
    if (getTaskStatus('proto_station_backlog') === 'hidden') {
      acceptTask('proto_station_backlog');
    }

    const roomLog = getRoomEntryLog();

    if (
      getTaskStatus('proto_station_backlog') === 'accepted' &&
      roomLog.includes('proto_utility_bay') &&
      roomLog.includes('proto_ops_annex')
    ) {
      completeTask('proto_station_backlog');
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    // Pilot Scenario B prompt tree; the Status Board keeps short-circuiting
    // in its own onPromptOpened (no options ever render for it).
    if (interactionKey === 'hubPriorityAllocation') {
      return this.allocationScenario?.getRootOptions() ?? [];
    }

    if (interactionKey === 'hubQuartermasterVale') {
      return this.buildValeOfferOptions();
    }

    if (interactionKey === 'hubFieldLocker') {
      return this.buildLockerOptions();
    }

    if (interactionKey === 'hubCalibrationCabinet') {
      return this.buildCabinetOptions();
    }

    if (interactionKey === 'hubWorkOrderBoard') {
      return this.buildWorkOrderOptions();
    }

    return [];
  }

  // ————————— Unit 3: Q03 Calibration Cabinet (SA-12) —————————

  private onCabinetOpened(): boolean {
    if (!q03State.stow_offered) {
      this.showFeedbackMessage(
        'The calibration cabinet is sealed until the bench return is logged.',
      );
      return false;
    }

    markOpportunityEntered(Q03_OPPORTUNITY_ID);
    refreshValidityProbe();

    if (!q03State.stow_completed) {
      return true; // stow phase
    }

    if (!q03State.retrieval_offered) {
      this.showFeedbackMessage('The cabinet is in order.');
      return false;
    }

    if (q03State.retrieval_completed) {
      this.showFeedbackMessage('The cabinet is in order.');
      return false;
    }

    return true; // retrieval phase
  }

  private buildCabinetOptions(): PromptOption[] {
    if (!q03State.stow_completed) {
      return this.buildStowOptions();
    }

    return this.buildRetrievalOptions();
  }

  private buildStowOptions(): PromptOption[] {
    const options: PromptOption[] = unstowedQ03Tools().map((tool) => ({
      label: `Stow the ${tool.label}.`,
      feedback: '',
      getEventTypes: () => [],
      nextStage: (): PromptStage => ({
        body: `Where does the ${tool.label} go?`,
        options: Q03_SLOTS.map((slot) => ({
          label: `Place it on the ${slot.label}.`,
          feedback: `The ${tool.label} is stowed.`,
          getEventTypes: () => [],
          onSelected: () => {
            this.applyQ03Stow(tool.tool_id, slot.slot_id);
          },
        })),
      }),
    }));

    options.push({
      label: 'Close the cabinet.',
      feedback: 'You close the cabinet.',
      getEventTypes: () => [],
    });

    return options;
  }

  private buildRetrievalOptions(): PromptOption[] {
    const options: PromptOption[] = Q03_SLOTS.map((slot) => ({
      label: `Open the ${slot.label}.`,
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        this.applyQ03Open(slot.slot_id);
      },
    }));

    options.push({
      label: 'Close the cabinet.',
      feedback: 'You close the cabinet.',
      getEventTypes: () => [],
    });

    return options;
  }

  /**
   * Shared Q03 stow act (Unit 2): card path and physical drawer path both
   * converge here — one stow = one state change + one proto event,
   * whichever input produced it.
   */
  private applyQ03Stow(toolId: string, slotId: string) {
    stowQ03Tool(toolId, slotId);
    this.logScenarioEvent('hubCalibrationCabinet', 'proto_q03_tool_stowed', {
      metadata: { tool_id: toolId, slot_id: slotId },
    });

    if (q03State.stow_completed) {
      completeTask('proto_bench_stowage');
      this.logScenarioEvent(
        'hubCalibrationCabinet',
        'proto_q03_stow_completed',
        { metadata: { stowed: { ...q03State.stowed } } },
      );
    }
  }

  /** Shared Q03 retrieval open act (card + physical paths converge). */
  private applyQ03Open(slotId: string) {
    if (q03State.retrieval_completed) {
      return;
    }

    const found = openQ03Slot(slotId);

    this.logScenarioEvent('hubCalibrationCabinet', 'proto_q03_slot_opened', {
      metadata: { slot_id: slotId, contained_target: found },
    });

    if (found) {
      completeTask('proto_bench_retrieval');
      markOpportunityCompleted(Q03_OPPORTUNITY_ID);
      this.logScenarioEvent('hubCalibrationCabinet', 'proto_q03_retrieved', {
        metadata: { ...q03RetrievalSummary() },
      });
      refreshValidityProbe();
      this.showFeedbackMessage(
        'The Flux Calibrator goes into the bench chute. Request cleared.',
      );
    } else {
      this.showFeedbackMessage('Not in this compartment.');
    }
  }

  // ————— Physical-mechanics session (Unit 2): Q03 physical cabinet —————

  /**
   * Direct-manipulation upgrade of the SA-12 cabinet: the three returned
   * tools sit on a return tray as loose world objects; the participant
   * physically carries each to one of four visible drawer cells (stow),
   * and later opens drawer cells directly to search for the requested
   * tool (retrieval). Both physical acts converge on the SAME state
   * functions and proto events as the card path, which remains the
   * keyboard-accessible equivalent. Drawer contents are never displayed;
   * retrieval accuracy comes only from the participant's own stow memory/
   * organisation, exactly as in the card flow.
   */
  private physicalLayer: PhysicalManipulationLayer | null = null;
  /** Scene-transient physical carry (a tool lifted off the return tray). */
  private q03CarriedToolId: string | null = null;
  private q03PhaseSignature = '__unset__';

  private initQ03Physical() {
    // Drawer-cell visuals (persistent world state on the cabinet face).
    for (const slot of Q03_SLOTS) {
      const position = Q03_DRAWER_POSITIONS[slot.slot_id];

      this.addDecor(position.x, position.y, 'proc-drawer-cell');
    }

    this.physicalLayer = new PhysicalManipulationLayer({
      scene: this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      isEnabled: () => this.physicalInputEligible(),
      onPickup: (toolId) => this.q03PhysicalPickup(toolId),
      onPlace: (toolId, slotId) => this.q03PhysicalPlace(toolId, slotId),
      getCarried: () => {
        if (this.q03CarriedToolId === null) {
          return null;
        }

        const tool = getQ03Tool(this.q03CarriedToolId);

        return {
          object_id: tool.tool_id,
          label: tool.label,
          icon: Q03_TOOL_ICONS[tool.tool_id],
          category: 'bench_tool',
        };
      },
      onFeedback: (message) => this.showFeedbackMessage(message),
    });
    this.syncQ03Physical();
  }

  private q03PhysicalPickup(toolId: string): boolean {
    if (!q03State.stow_offered || q03State.stow_completed) {
      return false;
    }

    if (this.q03CarriedToolId !== null) {
      this.showFeedbackMessage(
        'Your hands are full — stow the tool you are carrying first.',
      );
      return false;
    }

    this.q03CarriedToolId = toolId;

    return true;
  }

  private q03PhysicalPlace(toolId: string, slotId: string): PhysicalPlacement {
    if (
      !q03State.stow_offered ||
      q03State.stow_completed ||
      this.q03CarriedToolId !== toolId
    ) {
      return { outcome: 'unavailable', feedback: 'The cabinet is in order.' };
    }

    this.q03CarriedToolId = null;
    this.applyQ03Stow(toolId, slotId);
    this.showFeedbackMessage(`The ${getQ03Tool(toolId).label} is stowed.`);

    return { outcome: 'accepted' };
  }

  /**
   * Re-renders the cabinet's physical surface from q03State. Change
   * detected on a phase signature; objects re-sync every call (cheap,
   * signature-guarded inside the layer).
   */
  private syncQ03Physical() {
    if (this.physicalLayer === null) {
      return;
    }

    const stowPhase = q03State.stow_offered && !q03State.stow_completed;
    const retrievalPhase =
      q03State.stow_completed &&
      q03State.retrieval_offered &&
      !q03State.retrieval_completed;
    const signature = `${stowPhase}:${retrievalPhase}`;

    if (signature !== this.q03PhaseSignature) {
      this.q03PhaseSignature = signature;
      this.physicalLayer.syncContainers(
        stowPhase
          ? Q03_SLOTS.map((slot) => ({
              container_id: slot.slot_id,
              label: slot.label,
              x: Q03_DRAWER_POSITIONS[slot.slot_id].x,
              y: Q03_DRAWER_POSITIONS[slot.slot_id].y,
              halfWidth: 14,
              halfHeight: 11,
            }))
          : [],
      );
    }

    if (stowPhase) {
      this.physicalLayer.syncObjects(
        Q03_TOOLS.filter(
          (tool) =>
            q03State.stowed[tool.tool_id] === undefined &&
            tool.tool_id !== this.q03CarriedToolId,
        ).map((tool) => ({
          spec: {
            object_id: tool.tool_id,
            label: tool.label,
            icon: Q03_TOOL_ICONS[tool.tool_id],
            category: 'bench_tool',
          },
          x: Q03_TRAY_POSITIONS[tool.tool_id].x,
          y: Q03_TRAY_POSITIONS[tool.tool_id].y,
        })),
      );
    } else if (retrievalPhase) {
      // Drawer cells become direct activators: opening one IS the search
      // act (uniform selection cue; result feedback mirrors the card path).
      this.physicalLayer.syncObjects(
        Q03_SLOTS.map((slot) => ({
          spec: {
            object_id: slot.slot_id,
            label: slot.label,
            icon: 'proc-drawer-cell',
            category: 'drawer',
          },
          x: Q03_DRAWER_POSITIONS[slot.slot_id].x,
          y: Q03_DRAWER_POSITIONS[slot.slot_id].y,
          activate: () => {
            sfxUiSelect();
            this.applyQ03Open(slot.slot_id);
          },
        })),
      );
    } else {
      this.physicalLayer.syncObjects([]);
    }
  }

  protected onRoomUpdate(): void {
    this.syncQ03Physical();
    this.physicalLayer?.update();
  }

  // ————————— Unit 3: Q30 instance 1 — Work Order Board (SA-4) —————————

  private q30OptionOrder(): 'small_first' | 'integrated_first' {
    return assignCounterbalance(
      researchRuntime.sessionState.getMetadata().game_session_id,
      'q30_work_orders',
      ['small_first', 'integrated_first'] as const,
    );
  }

  private onWorkOrderBoardOpened(): boolean {
    if (q30InstanceAnswered('work_orders')) {
      this.showFeedbackMessage(
        'The stores round is already structured and queued.',
      );
      return false;
    }

    this.logScenarioEvent('hubWorkOrderBoard', 'proto_q30_opened', {
      metadata: { instance_id: 'work_orders' },
    });
    markOpportunityEntered(getQ30Instance('work_orders').opportunity_id);
    refreshValidityProbe();

    return true;
  }

  private buildWorkOrderOptions(): PromptOption[] {
    const instance = getQ30Instance('work_orders');
    const order = this.q30OptionOrder();

    const choose = (
      choice: 'independent_small' | 'integrated_single',
      label: string,
    ): PromptOption => ({
      label,
      feedback: 'Logged. The stores round is structured and queued.',
      getEventTypes: () => [],
      onSelected: () => {
        const observation = recordQ30Choice('work_orders', choice, order);

        if (observation !== null) {
          this.logScenarioEvent(
            'hubWorkOrderBoard',
            'proto_q30_structure_chosen',
            { choice_value: choice, metadata: { ...observation } },
          );
          markOpportunityCompleted(instance.opportunity_id);
          refreshValidityProbe();
        }
      },
    });

    const small = choose('independent_small', instance.smallLabel);
    const integrated = choose('integrated_single', instance.integratedLabel);
    const ordered =
      order === 'small_first' ? [small, integrated] : [integrated, small];

    return [
      ...ordered,
      {
        label: 'Check the board details.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          markQ30DetailInspected('work_orders');
          this.logScenarioEvent(
            'hubWorkOrderBoard',
            'proto_q30_detail_inspected',
            { metadata: { instance_id: 'work_orders' } },
          );
        },
        nextStage: (): PromptStage => ({
          body: instance.detail,
          options: ordered,
        }),
      },
    ];
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'hubCalibrationCabinet') {
      if (!q03State.stow_completed) {
        return 'Three bench tools have come back from the field. Stow each one where you want it kept — the compartments are yours to organise.';
      }

      if (q03State.retrieval_offered && !q03State.retrieval_completed) {
        return 'Bench request slip: one Flux Calibrator, needed at the bench chute. The compartments sit exactly as you left them.';
      }

      return undefined;
    }

    if (interactionKey === 'hubWorkOrderBoard') {
      return getQ30Instance('work_orders').body;
    }

    return undefined;
  }

  // ——————————————— Overnight-prototype field route (Unit 2) ———————————————

  /**
   * Vale's prompt gate: the offer opens only while the requisition is not
   * yet accepted; every other state short-circuits to status feedback.
   * All proto_* emissions are raw prototype telemetry (scenario_* rule).
   */
  private onValeOpened(): boolean {
    this.logScenarioEvent('hubQuartermasterVale', 'proto_requisition_opened');

    if (isRouteFinished()) {
      this.showFeedbackMessage(
        'Vale: "Kai already called it in — feed restored and the sample logged. Tidy work."',
      );
      return false;
    }

    const status = getTaskStatus(FIELD_REQUISITION_TASK_ID);

    if (status === 'accepted') {
      const remaining = remainingLockerItems();

      this.showFeedbackMessage(
        remaining.length > 0
          ? `Vale: "Locker's open — still to collect: ${remaining
              .map((itemId) => getGameItem(itemId).label)
              .join(', ')}."`
          : 'Vale: "Kit\'s complete. Exterior airlock is on the south wall — Kai\'s waiting on the terrace."',
      );
      return false;
    }

    if (status === 'completed') {
      this.showFeedbackMessage(
        'Vale: "Kai\'s got the survey in hand out on the terrace. Anything he flags, you\'ll hear about."',
      );
      return false;
    }

    return true;
  }

  private buildValeOfferOptions(): PromptOption[] {
    const acceptOption: PromptOption = {
      label: 'Take on the field requisition.',
      feedback:
        'Vale unlocks the equipment locker beside the desk. "Scanner, spade, sample case. Bring yourself back in one piece."',
      getEventTypes: () => [],
      onSelected: () => {
        acceptTask(FIELD_REQUISITION_TASK_ID);
        refreshRequisitionObjective();
        this.logScenarioEvent(
          'hubQuartermasterVale',
          'proto_requisition_accepted',
        );
      },
    };

    return [
      acceptOption,
      {
        label: 'Ask what the job involves.',
        feedback: '',
        getEventTypes: () => [],
        nextStage: (): PromptStage => ({
          body: 'Vale: "Storm knocked out the terrace antenna feed and buried the survey grid. Kai needs a runner with a scanner and a spade — he\'ll brief you at the airlock side."',
          options: [
            acceptOption,
            {
              label: 'Not right now.',
              feedback: 'Vale nods. "The requisition stays on the ledger."',
              getEventTypes: () => [],
              onSelected: () => {
                declineTask(FIELD_REQUISITION_TASK_ID);
                this.logScenarioEvent(
                  'hubQuartermasterVale',
                  'proto_requisition_declined',
                );
              },
            },
          ],
        }),
      },
      {
        label: 'Not right now.',
        feedback: 'Vale nods. "The requisition stays on the ledger."',
        getEventTypes: () => [],
        onSelected: () => {
          declineTask(FIELD_REQUISITION_TASK_ID);
          this.logScenarioEvent(
            'hubQuartermasterVale',
            'proto_requisition_declined',
          );
        },
      },
    ];
  }

  private onLockerOpened(): boolean {
    if (getTaskStatus(FIELD_REQUISITION_TASK_ID) !== 'accepted') {
      this.showFeedbackMessage(
        'The locker is quartermaster-issued. Vale handles requisitions at the desk beside it.',
      );
      return false;
    }

    if (isRequisitionKitComplete()) {
      this.showFeedbackMessage('The issued shelf is cleared.');
      return false;
    }

    return true;
  }

  private buildLockerOptions(): PromptOption[] {
    const lockerX = 1.75 * 32;
    const lockerY = 10.75 * 32;
    const options: PromptOption[] = remainingLockerItems().map((itemId) => {
      const item = getGameItem(itemId);

      return {
        label: `Take the ${item.label}.`,
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          performWorldAction({
            scene: this,
            x: lockerX,
            y: lockerY,
            label: 'Collecting…',
            durationMs: 800,
            onComplete: () => {
              if (!collectLockerItem(itemId)) {
                this.showFeedbackMessage(
                  'Your equipment belt is full — make room first.',
                );
                return;
              }

              this.logScenarioEvent('hubFieldLocker', 'proto_item_collected', {
                metadata: { item_id: itemId },
              });
              sfxPickup();
              showFloatingText(this, lockerX, lockerY, `+ ${item.label}`);

              if (isRequisitionKitComplete()) {
                // Vale visibly reacts to the completed kit (Unit D).
                sfxComplete();
                this.setStationTexture(
                  'hubQuartermasterVale',
                  'plv1-vale-ready',
                );
                this.showFeedbackMessage(
                  'Kit complete. The Exterior Airlock is on the south wall — the Survey Terrace is through it.',
                );
              }
            },
          });
        },
      };
    });

    options.push({
      label: 'Close the locker.',
      feedback: 'You close the locker.',
      getEventTypes: () => [],
    });

    return options;
  }

  protected onRoomExit(): void {
    // Leaving the Hub with the allocation scenario entered but uncommitted
    // is measured abandonment telemetry (framework logs once per departure).
    this.allocationScenario?.handleRoomExit();
  }

  private buildStatusBoardText(): string {
    const mission = researchRuntime.sessionState.getMissionState();
    const done = (roomId: string) =>
      mission.completed_rooms.includes(roomId) ? 'logged' : 'pending';

    // Registry-driven board (U5): one line per OPEN station (in door-ring
    // order), then a single collective line while any station stays sealed.
    // Output is byte-identical to the V1 slice while Archive is the only
    // open room. Allowed progress UI only: status labels, never scores.
    const lines = [
      'STATION STATUS',
      `Arrival check-in: ${done('dock_arrival')}`,
    ];
    let anySealed = false;

    for (const station of STATION_REGISTRY) {
      if (station.sceneKey !== undefined) {
        if (station.statusBoardLabel !== undefined) {
          lines.push(`${station.statusBoardLabel}: ${done(station.roomId)}`);
        }
      } else {
        anySealed = true;
      }
    }

    if (anySealed) {
      lines.push('Remaining sections: sealed — pressurisation pending.');
    }

    return lines.join('\n');
  }
}

/**
 * Q03 physical-cabinet geometry (Unit 2, physical-mechanics session):
 * fixed drawer-cell and return-tray world positions around the cabinet
 * prop at (640, 320) — identical every session (frozen-stimuli rule).
 */
const Q03_DRAWER_POSITIONS: Record<string, { x: number; y: number }> = {
  slot_measurement: { x: 626, y: 304 },
  slot_optics: { x: 654, y: 304 },
  slot_fasteners: { x: 626, y: 332 },
  slot_general: { x: 654, y: 332 },
};

/** Return-tray positions of the three returned bench tools. */
const Q03_TRAY_POSITIONS: Record<string, { x: number; y: number }> = {
  flux_calibrator_bench: { x: 596, y: 364 },
  hex_gauge: { x: 628, y: 368 },
  lens_kit: { x: 660, y: 364 },
};

/** Tool icons (presentation mapping; flux calibrator reuses its glyph). */
const Q03_TOOL_ICONS: Record<string, string> = {
  flux_calibrator_bench: 'proc-icon-flux-calibrator',
  hex_gauge: 'proc-icon-hex-gauge',
  lens_kit: 'proc-icon-lens-kit',
};
