import Phaser from 'phaser';

import { key } from '../constants';
import type { PhysicalPlacement } from '../gameplay';
import {
  acceptSurveyBriefing,
  acceptTask,
  addInventoryItem,
  ANOMALY_NODE_IDS,
  burstParticles,
  cameraKick,
  completeInstallStep,
  DIG_YIELD,
  ensureSalvageSeed,
  FieldActionController,
  fieldRouteState,
  flaggedNodesPendingDig,
  getGameItem,
  hasInventoryItem,
  INSTALL_STEP_LABELS,
  isRouteFinished,
  isTaskAccepted,
  markNodeDug,
  markNodeScanned,
  markSampleDelivered,
  performWorldAction,
  PhysicalManipulationLayer,
  playActionAnimation,
  registerRouteTasks,
  registerTask,
  removeInventoryItem,
  ringPulse,
  salvageLog,
  salvagePullCount,
  SCAN_NODE_IDS,
  sfxComplete,
  sfxDig,
  sfxInstall,
  sfxMachineOn,
  sfxPickup,
  sfxScan,
  showFloatingText,
  snowfall,
  sparkle,
  startSalvageCast,
  SURVEY_RECOVERY_TASK_ID,
} from '../gameplay';
import {
  assignCounterbalance,
  closeQ04WindowOnExit,
  declareOpportunity,
  dropQ04Carried,
  getQ04MessObject,
  getQ04ReturnPoint,
  getQ30Instance,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  markQ16Offered,
  markQ30DetailInspected,
  pickUpQ04Object,
  placeQ04Object,
  presentQ04Mess,
  Q04_ENTRY_STATE_VERSION,
  Q04_OPPORTUNITY_ID,
  Q04_RETURN_POINTS,
  q04ClearedCount,
  q04RemainingObjects,
  q04SiteRestored,
  q04State,
  Q30_ENTRY_STATE_VERSION,
  q30InstanceAnswered,
  recordQ30Choice,
  refreshValidityProbe,
} from '../measurement';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
  StagePresentation,
  SurfaceStepTile,
} from '../world';
import { RoomScene, runOncePerSession } from '../world';

/**
 * Survey Terrace — overnight playable-prototype field area (Unit 2).
 *
 * The embodied field loop: Kai briefs the survey, the player scans four
 * survey markers with the field scanner, digs out the two flagged
 * deposits with the excavation spade, installs the recovered relay
 * coupling at the antenna feed housing (three-step tactile install), and
 * delivers the recovered core sample back to Kai.
 *
 * This is a gameplay/route area, NOT an assessment station: it has no
 * station-registry entry, `proto_field_site` is a provisional internal
 * area id (not an event-schema §2 room_id), and every event here is raw
 * prototype telemetry via logScenarioEvent (scenario_* precedent — no
 * canonical context, no Q-mapping, no scoring).
 */

/** Fixed marker positions (px), matched to the layout's open floor. */
const SCAN_NODE_POSITIONS: Readonly<Record<number, { x: number; y: number }>> =
  {
    1: { x: 5 * 32, y: 8.5 * 32 },
    2: { x: 3 * 32, y: 5 * 32 },
    3: { x: 13 * 32, y: 8.5 * 32 },
    4: { x: 18 * 32, y: 4 * 32 },
  };

const KAI_POSITION = { x: 13 * 32, y: 3 * 32 };
const FEED_HOUSING_POSITION = { x: 19 * 32, y: 8.5 * 32 };

export class FieldScene extends RoomScene {
  protected readonly roomId = 'proto_field_site';
  protected readonly roomInteractionKey: InteractionKey = 'fieldKaiSupervisor';

  /** Marker the currently open scan-node prompt belongs to. */
  private activeNodeId = 0;
  /** Per-node station configs so dig-state visuals can update in place. */
  private nodeMounds = new Map<number, boolean>();
  /** C/D/F field-action key language (Unit 1, action rebuild). */
  private actionController?: FieldActionController;

  constructor() {
    super(key.scene.field);
  }

  protected getLayout(): RoomLayout {
    // 25×19 exterior terrace: airlock back to the Hub at the top, rock
    // outcrops for density, open work floor. 'P' pads mark the deck
    // apron by the airlock (visual only). The play space is the original
    // 22×11 interior; the extra wall mass on the right/bottom fills the
    // 800×600 viewport so no dead black void renders (Unit 4) — it is
    // unreachable and changes no interior coordinate.
    // Unit C terrace expansion: the original 22×11 interior (rows 0-9)
    // keeps every wall cell and interactable coordinate EXACTLY as
    // committed; rows 10-13 open additional snowfield to the south
    // (walls only removed, never added, so every position-synced e2e
    // drive line stays clear) and the ridge line below is broken up so
    // the exterior reads as terrain rather than a wall slab.
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '#########--##############',
        '#........PP..........####',
        '#....................####',
        '#..##................####',
        '#....................####',
        '#...............##...####',
        '#....................####',
        '#.##.................####',
        '#....................####',
        '#.....................###',
        '#..##.............##..###',
        '#.....................###',
        '#......##.............###',
        '##................#######',
        '####.........############',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the Ridge Annex: just inside the south path, outside
    // the door's 72px radius (row 14 open floor).
    if (data?.spawn === 'proto_artifact_field') {
      return { x: 11 * 32, y: 14.5 * 32 };
    }

    // Returning from the Coolant Yard: just inside the east gate.
    if (data?.spawn === 'proto_coolant_yard') {
      return { x: 18.5 * 32, y: 10 * 32 };
    }

    // Just inside the airlock, outside the door's 72px radius.
    return { x: 10 * 32, y: 4 * 32 };
  }

  protected populateRoom(): void {
    registerRouteTasks();

    // Engineer Kai supervising the survey (visible NPC, Unit 1 actor).
    // Unit D: Kai's pose tracks the field task — briefing stance before
    // the survey, tablet-up while it runs, arm raised once the route is
    // done (pose swaps only; position/radius/prompts/events unchanged).
    this.addNpc({
      interactionKey: 'fieldKaiSupervisor',
      label: 'Engineer Kai',
      npcName: 'Engineer Kai',
      texture: isRouteFinished()
        ? 'plv1-kai-done'
        : isTaskAccepted(SURVEY_RECOVERY_TASK_ID)
          ? 'plv1-kai-work-a'
          : 'plv1-kai',
      workFrames: ['plv1-kai-work-a', 'plv1-kai-work-b'],
      x: KAI_POSITION.x,
      y: KAI_POSITION.y,
      onPromptOpened: () => this.onKaiOpened(),
    });

    // Four survey markers.
    for (const nodeId of SCAN_NODE_IDS) {
      const position = SCAN_NODE_POSITIONS[nodeId];

      this.addStation({
        interactionKey: 'fieldScanNode',
        label: `Survey Marker ${nodeId}`,
        texture: 'proc-scan-node',
        x: position.x,
        y: position.y,
        onPromptOpened: () => this.onScanNodeOpened(nodeId),
      });

      // Already-dug markers re-render their spoil mound on re-entry.
      if (fieldRouteState.dug_nodes.includes(nodeId)) {
        this.addDigMound(nodeId);
      }
    }

    // Antenna feed housing (install target). Unit C: its texture carries
    // the task's visible consequence — damaged until the coupling is
    // installed, repaired after (position/radius/events unchanged).
    this.addStation({
      interactionKey: 'fieldFeedHousing',
      label: 'Antenna Feed Housing',
      texture: fieldRouteState.coupling_installed
        ? 'proc-antenna-repaired'
        : 'proc-antenna-damaged',
      x: FEED_HOUSING_POSITION.x,
      y: FEED_HOUSING_POSITION.y,
      onPromptOpened: () => this.onFeedHousingOpened(),
    });

    // Airlock back to the Station Hub.
    this.addDoor({
      x: 10 * 32,
      y: 1 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'fieldKaiSupervisor',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'proto_field_site',
      },
    });

    // ——— Physical-mechanics session (Unit 7): post-assessment ice-bore
    // salvage (free play; src/gameplay/iceSalvage*.ts). Locked until the
    // primary route completes (Final Core) or an explicit DEV ?freeplay
    // launch flag; entirely outside measurement — no Q tags, no primary
    // inventory contact, deterministic seeded loot only.
    this.addStation({
      interactionKey: 'fieldIceBore',
      label: 'Ice Bore Winch',
      texture: 'proc-ice-bore',
      x: 2 * 32,
      y: 14 * 32,
      onPromptOpened: () => this.onIceBoreOpened(),
    });

    // ——— Physical-mechanics session (Unit 3): south path to the Ridge
    // Annex artifact survey (ArtifactSurveyScene). The offer task is
    // accepted identically for every participant at the first terrace
    // entry (standardised availability — a route position, never another
    // item's outcome).
    this.addDoor({
      x: 8 * 32,
      y: 15 * 32 + 16,
      label: 'Ridge Annex Path',
      texture: 'prop-hub-door-frame',
      interactionKey: 'artifactSurveyNoor',
      target: {
        sceneKey: key.scene.artifactSurvey,
        roomId: 'proto_artifact_field',
        spawn: 'proto_field_site',
      },
    });
    registerTask({
      task_id: 'proto_artifact_survey_offer',
      title: 'Artifact survey',
      initialObjective:
        'Surveyor Noor is staging a specimen sweep — Ridge Annex, south path.',
    });

    // ——— Action-assessment rebuild (Unit 2): east gate to the Coolant
    // Yard (the coolant red line's exterior work area).
    this.addDoor({
      x: 21 * 32,
      y: 10 * 32,
      label: 'Coolant Yard Gate',
      texture: 'prop-hub-door-frame',
      interactionKey: 'coolantYardArea',
      target: {
        sceneKey: key.scene.coolantYard,
        roomId: 'proto_coolant_yard',
        spawn: 'proto_field_site',
      },
    });

    // ——— Physical-mechanics session (Unit 2): Q04 standardised field
    // work-site cleanup (src/measurement/q04FieldCleanup.ts). The three
    // return points are always visible along the south path; the
    // standardised mess appears at install completion. Direct
    // manipulation only — no prompt stations, no canonical events, all
    // telemetry proto_* raw via the scenario path.
    declareOpportunity({
      opportunity_id: Q04_OPPORTUNITY_ID,
      owner: 'Q04',
      entry_state_version: Q04_ENTRY_STATE_VERSION,
    });

    for (const point of Q04_RETURN_POINTS) {
      this.addDecor(point.x, point.y, point.texture);
    }

    this.q04Layer = new PhysicalManipulationLayer({
      scene: this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      isEnabled: () => this.physicalInputEligible(),
      onPickup: (objectId) => this.q04Pickup(objectId),
      onPlace: (objectId, containerId) => this.q04Place(objectId, containerId),
      getCarried: () => {
        if (q04State.carried === null) {
          return null;
        }

        const object = getQ04MessObject(q04State.carried);

        return {
          object_id: object.object_id,
          label: object.label,
          icon: object.icon,
          category: object.category,
        };
      },
      onFeedback: (message) => this.showFeedbackMessage(message),
    });
    this.q04Layer.syncContainers(
      Q04_RETURN_POINTS.map((point) => ({
        container_id: point.container_id,
        label: point.label,
        x: point.x,
        y: point.y,
        accepts: [point.accepts],
      })),
    );
    this.syncQ04Objects();

    // ——— Unit 3: Q30 instance 2 — Telemetry Cache Console (SA-4, the
    // non-inventory granularity opportunity). Availability and wording
    // are fixed and independent of the route and every other item.
    declareOpportunity({
      opportunity_id: getQ30Instance('telemetry_cache').opportunity_id,
      owner: 'Q30',
      entry_state_version: Q30_ENTRY_STATE_VERSION,
      counterbalance: this.q30OptionOrder(),
    });
    this.addStation({
      interactionKey: 'fieldTelemetryCache',
      label: 'Telemetry Cache Console',
      texture: 'proc-console-wall',
      x: 5 * 32,
      y: 2.5 * 32,
      onPromptOpened: () => this.onTelemetryCacheOpened(),
    });

    // Worksite dressing (decorative only).
    this.addDecor(3 * 32, 2.5 * 32, 'prop-dock-crates');
    this.addDecor(20 * 32, 2 * 32, 'prop-dock-crates');

    // ——— Unit C exterior atmosphere (deterministic set dressing only).
    // Distant station structures on the unreachable ridge/wall mass give
    // the terrace a horizon and tie it back to the station.
    this.addDecor(22.6 * 32, 4.6 * 32, 'proc-station-module');
    this.addDecor(20.5 * 32, 15 * 32, 'proc-station-module');
    this.addDecor(23 * 32, 8.5 * 32, 'proc-beacon-comms');
    this.addDecor(2.5 * 32, 15.2 * 32, 'proc-beacon-comms');
    // South-field worksite props on the new open snow.
    this.addDecor(4.5 * 32, 11 * 32, 'proc-cart-utility');
    this.addDecor(16 * 32, 12.5 * 32, 'prop-dock-crates');
    // Already-disturbed ground re-renders on re-entry beside dug markers
    // (the mound handles the spoil; this keeps the terrain change).
    for (const nodeId of fieldRouteState.dug_nodes) {
      const position = SCAN_NODE_POSITIONS[nodeId];

      this.addDecor(position.x - 2, position.y + 18, 'proc-ground-disturbed');
    }

    // Ambient snowfall across the terrace (fixed seed — identical
    // weather for every participant; pure ambience).
    snowfall(this, {
      width: this.roomMap.widthInPixels,
      height: this.roomMap.heightInPixels,
      seed: 0x5eedf1ae,
      count: 38,
    });

    // ——— Unit 1 (action rebuild): the C/D/F key language as redundant
    // activators over the SAME scan/dig/cast flows the prompt cards use
    // (identical state mutation, identical telemetry — the NEXT-08 §3.2
    // redundant-activator pattern extended to action keys).
    this.actionController = new FieldActionController(this, () =>
      this.physicalInputEligible(),
    );
    this.actionController.setBindings([
      {
        key: 'C',
        label: 'Scan',
        getTarget: () => this.nearestScannableNode()?.position ?? null,
        perform: () => {
          const node = this.nearestScannableNode();

          if (node !== null) {
            this.startScanAction(node.nodeId);
          }
        },
      },
      {
        key: 'D',
        label: 'Dig',
        getTarget: () => this.nearestDiggableNode()?.position ?? null,
        perform: () => {
          const node = this.nearestDiggableNode();

          if (node !== null) {
            this.startDigAction(node.nodeId);
          }
        },
      },
      {
        key: 'F',
        label: 'Winch',
        getTarget: () => this.salvageRigTarget(),
        perform: () => this.startSalvageCastAction(),
      },
    ]);
  }

  /** Player-to-target reach for the C/D/F keys (station radius rule). */
  private withinActionReach(x: number, y: number): boolean {
    return (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= 72
    );
  }

  /** Nearest in-reach marker the scanner can read right now, if any. */
  private nearestScannableNode(): {
    nodeId: number;
    position: { x: number; y: number };
  } | null {
    if (
      !isTaskAccepted(SURVEY_RECOVERY_TASK_ID) ||
      !hasInventoryItem('field_scanner')
    ) {
      return null;
    }

    for (const nodeId of SCAN_NODE_IDS) {
      if (fieldRouteState.scanned_nodes.includes(nodeId)) {
        continue;
      }

      const position = SCAN_NODE_POSITIONS[nodeId];

      if (this.withinActionReach(position.x, position.y)) {
        return { nodeId, position };
      }
    }

    return null;
  }

  /** Nearest in-reach flagged deposit the spade can dig right now. */
  private nearestDiggableNode(): {
    nodeId: number;
    position: { x: number; y: number };
  } | null {
    if (!hasInventoryItem('excavation_spade')) {
      return null;
    }

    for (const nodeId of ANOMALY_NODE_IDS) {
      if (
        !fieldRouteState.scanned_nodes.includes(nodeId) ||
        fieldRouteState.dug_nodes.includes(nodeId)
      ) {
        continue;
      }

      const position = SCAN_NODE_POSITIONS[nodeId];

      if (this.withinActionReach(position.x, position.y)) {
        return { nodeId, position };
      }
    }

    return null;
  }

  /** Ice-bore rig position when F can cast here/now (unlock rule). */
  private salvageRigTarget(): { x: number; y: number } | null {
    if (!this.salvageUnlocked()) {
      return null;
    }

    const position = { x: 2 * 32, y: 14 * 32 };

    return this.withinActionReach(position.x, position.y) ? position : null;
  }

  /**
   * Unit C footprints: the player's own movement presses boot prints into
   * the snow, fading over a few seconds. Pure consequence-of-own-action
   * presentation (never a stimulus difference between participants).
   */
  private lastPrintAt = { x: 0, y: 0 };

  private stampFootprints(): void {
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.lastPrintAt.x,
      this.lastPrintAt.y,
    );

    if (distance < 30) {
      return;
    }

    this.lastPrintAt = { x: this.player.x, y: this.player.y };

    if (!this.textures.exists('proc-footprints')) {
      return;
    }

    const print = this.add
      .image(this.player.x, this.player.y + 20, 'proc-footprints')
      .setAlpha(0.55)
      .setDepth(-0.4);

    this.tweens.add({
      targets: print,
      alpha: 0,
      duration: 6000,
      ease: 'Linear',
      onComplete: () => print.destroy(),
    });
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('fieldKaiSupervisor', 'proto_field_site_entered');

    // Unit 3: the artifact-survey offer becomes visible for EVERY
    // participant at the first terrace entry (fixed route position).
    runOncePerSession('proto_artifact_survey_offer', () => {
      acceptTask('proto_artifact_survey_offer');
      this.logScenarioEvent('artifactSurveyNoor', 'proto_q16_offer_visible');
      markQ16Offered();
    });
  }

  protected onRoomUpdate(): void {
    this.stampFootprints();
    this.syncQ04Objects();
    this.q04Layer?.update();
    this.actionController?.update();
  }

  protected onRoomExit(): void {
    // A mess object in hand is set back down where it lay (put-back
    // semantics; never lost).
    if (q04State.carried !== null) {
      dropQ04Carried();
      this.logScenarioEvent('fieldFeedHousing', 'proto_q04_carried_set_down');
    }

    // The Q04 primary window closes at the FIRST terrace exit after the
    // mess was presented; the site state at that moment is the record.
    const snapshot = closeQ04WindowOnExit();

    if (snapshot !== null) {
      markOpportunityCompleted(Q04_OPPORTUNITY_ID);
      this.logScenarioEvent(
        'fieldFeedHousing',
        'proto_q04_site_state_at_exit',
        {
          metadata: { ...snapshot, restored: snapshot.remaining === 0 },
        },
      );
      refreshValidityProbe();
    } else if (q04State.mess_presented) {
      // Post-window exits: raw revisit telemetry only.
      this.logScenarioEvent('fieldFeedHousing', 'proto_q04_revisit_exit', {
        metadata: {
          cleared: q04ClearedCount(),
          remaining: q04RemainingObjects().length,
        },
      });
    }
  }

  // ————— Physical-mechanics session (Unit 2): Q04 site cleanup —————

  private q04Layer: PhysicalManipulationLayer | null = null;

  private syncQ04Objects(): void {
    this.q04Layer?.syncObjects(
      q04State.mess_presented
        ? q04RemainingObjects().map((object) => ({
            spec: {
              object_id: object.object_id,
              label: object.label,
              icon: object.icon,
              category: object.category,
            },
            x: object.x,
            y: object.y,
          }))
        : [],
    );
  }

  private q04Pickup(objectId: string): boolean {
    if (q04State.carried !== null) {
      this.showFeedbackMessage(
        'Your hands are full — set the item into its return point first.',
      );
      return false;
    }

    if (!pickUpQ04Object(objectId)) {
      return false;
    }

    this.logScenarioEvent('fieldFeedHousing', 'proto_q04_item_lifted', {
      metadata: { object_id: objectId },
    });

    return true;
  }

  private q04Place(objectId: string, containerId: string): PhysicalPlacement {
    const point = getQ04ReturnPoint(containerId);

    if (!placeQ04Object(objectId, containerId)) {
      return {
        outcome: 'unavailable',
        feedback: `That doesn't go in the ${point.label}.`,
      };
    }

    sparkle(this, point.x, point.y - 12);
    this.logScenarioEvent('fieldFeedHousing', 'proto_q04_item_cleared', {
      metadata: {
        object_id: objectId,
        container_id: containerId,
        cleared_count: q04ClearedCount(),
      },
    });

    if (q04SiteRestored()) {
      this.logScenarioEvent('fieldFeedHousing', 'proto_q04_site_restored');
      this.showFeedbackMessage('The work site is clear.');
    }

    return { outcome: 'accepted' };
  }

  /** Spoil-mound visual beside a dug marker (pure presentation). */
  private addDigMound(nodeId: number) {
    if (this.nodeMounds.get(nodeId) === true) {
      return;
    }

    const position = SCAN_NODE_POSITIONS[nodeId];

    this.nodeMounds.set(nodeId, true);
    this.addDecor(position.x + 34, position.y + 12, 'proc-dig-mound');
  }

  // ————————————————————————— Engineer Kai —————————————————————————

  private onKaiOpened(): boolean {
    this.logScenarioEvent('fieldKaiSupervisor', 'proto_field_briefing_opened');

    if (isRouteFinished()) {
      this.showFeedbackMessage(
        'Kai: "Good work out there. The feed is stable and the lab has its sample — check the duty roster for what\'s left."',
      );
      return false;
    }

    if (isTaskAccepted(SURVEY_RECOVERY_TASK_ID)) {
      if (
        fieldRouteState.dug_nodes.includes(4) &&
        hasInventoryItem('core_sample')
      ) {
        return true; // delivery prompt
      }

      this.showFeedbackMessage(this.buildKaiProgressHint());
      return false;
    }

    return true; // briefing prompt
  }

  private buildKaiProgressHint(): string {
    if (fieldRouteState.scanned_nodes.length < SCAN_NODE_IDS.length) {
      return 'Kai: "Run the scanner over all four survey markers first — the anomalies will flag themselves."';
    }

    if (flaggedNodesPendingDig().length > 0) {
      return 'Kai: "Two markers flagged. Dig them out with the spade and see what the terrace is hiding."';
    }

    if (!fieldRouteState.coupling_installed) {
      return 'Kai: "That coupling you turned up belongs in the antenna feed housing, east side."';
    }

    return 'Kai: "Bring me that core sample when you\'re ready."';
  }

  // ————————————————————————— Survey markers —————————————————————————

  private onScanNodeOpened(nodeId: number): boolean {
    this.activeNodeId = nodeId;

    const scanned = fieldRouteState.scanned_nodes.includes(nodeId);
    const dug = fieldRouteState.dug_nodes.includes(nodeId);
    const isAnomaly = ANOMALY_NODE_IDS.includes(nodeId);

    if (!isTaskAccepted(SURVEY_RECOVERY_TASK_ID) && !scanned) {
      this.showFeedbackMessage(
        'The survey marker is dormant. Engineer Kai coordinates the survey from the terrace platform.',
      );
      return false;
    }

    if (!scanned && !hasInventoryItem('field_scanner')) {
      this.showFeedbackMessage(
        'A subsurface reading needs the Field Scanner. Vale issues field equipment at the Hub requisition desk.',
      );
      return false;
    }

    if (scanned && !isAnomaly) {
      this.showFeedbackMessage('Scan logged — no anomaly under this marker.');
      return false;
    }

    if (scanned && isAnomaly && dug) {
      this.showFeedbackMessage(
        'The flagged deposit here is already recovered.',
      );
      return false;
    }

    if (scanned && isAnomaly && !hasInventoryItem('excavation_spade')) {
      this.showFeedbackMessage(
        'The flagged deposit needs the Excavation Spade. Vale issues field equipment at the Hub requisition desk.',
      );
      return false;
    }

    return true;
  }

  private buildScanNodeOptions(nodeId: number): PromptOption[] {
    const scanned = fieldRouteState.scanned_nodes.includes(nodeId);

    if (!scanned) {
      return [
        {
          label: 'Run a subsurface scan.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.startScanAction(nodeId),
        },
        {
          label: 'Leave the marker for now.',
          feedback: 'You step back from the marker.',
          getEventTypes: () => [],
        },
      ];
    }

    // Flagged anomaly, spade in hand: the dig action.
    return [
      {
        label: 'Dig out the flagged deposit.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startDigAction(nodeId),
      },
      {
        label: 'Leave the deposit for now.',
        feedback: 'You step back from the flagged marker.',
        getEventTypes: () => [],
      },
    ];
  }

  /**
   * One subsurface scan at a marker — the single flow behind BOTH the
   * prompt-card option and the C key (same state, same telemetry).
   * Cancellable: ESC aborts with no state change and no event.
   */
  private startScanAction(nodeId: number) {
    const position = SCAN_NODE_POSITIONS[nodeId];
    const started = performWorldAction({
      scene: this,
      x: position.x,
      y: position.y,
      label: 'Scanning…',
      durationMs: 1100,
      cancellable: true,
      onComplete: () => this.finishScan(nodeId),
    });

    if (started) {
      // Visible tool use + radial sweep while the scan runs.
      sfxScan();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: 'scan',
        icon: 'proc-icon-field-scanner',
        durationMs: 1100,
      });
      ringPulse(this, position.x, position.y, {
        endRadius: 46,
        rings: 2,
        durationMs: 520,
      });
    }
  }

  /**
   * One dig at a flagged deposit — the single flow behind BOTH the
   * prompt-card option and the D key. Cancellable before completion.
   */
  private startDigAction(nodeId: number) {
    const position = SCAN_NODE_POSITIONS[nodeId];
    const started = performWorldAction({
      scene: this,
      x: position.x,
      y: position.y,
      label: 'Digging…',
      durationMs: 1500,
      cancellable: true,
      onComplete: () => this.finishDig(nodeId),
    });

    if (started) {
      // Visible spade work: tool bubble + snow kicked up mid-dig.
      sfxDig();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: 'dig',
        icon: 'proc-icon-excavation-spade',
        durationMs: 1500,
      });
      burstParticles(this, position.x, position.y + 8, {
        colors: [0xc9d9e6, 0xaebfd0, 0x8fa1ab],
        seed: 0x5eedd160 + nodeId,
        count: 7,
        speed: 40,
      });
    }
  }

  private finishScan(nodeId: number) {
    const isAnomaly = ANOMALY_NODE_IDS.includes(nodeId);
    const position = SCAN_NODE_POSITIONS[nodeId];

    markNodeScanned(nodeId);
    this.logScenarioEvent('fieldScanNode', 'proto_scan_performed', {
      metadata: { node_id: nodeId, anomaly: isAnomaly },
    });

    // Result revealed in the world: one closing pulse at the marker.
    ringPulse(this, position.x, position.y, {
      endRadius: 30,
      rings: 1,
      durationMs: 420,
    });

    if (isAnomaly) {
      sparkle(this, position.x, position.y - 6);
      showFloatingText(this, position.x, position.y, 'Anomaly flagged');
      this.showFeedbackMessage(
        'The scanner flags a dense subsurface deposit — the marker is staked for digging.',
      );
    } else {
      showFloatingText(this, position.x, position.y, 'No anomaly');
      this.showFeedbackMessage('Scan logged — no anomaly under this marker.');
    }
  }

  private finishDig(nodeId: number) {
    const yieldItemId = DIG_YIELD[nodeId];
    const position = SCAN_NODE_POSITIONS[nodeId];

    if (yieldItemId !== undefined && !addInventoryItem(yieldItemId)) {
      this.showFeedbackMessage(
        'Your equipment belt is full — make room before recovering the deposit.',
      );
      return;
    }

    markNodeDug(nodeId);
    this.addDigMound(nodeId);
    // The terrain visibly changes: spoil burst, churned ground, a kick.
    sfxDig();
    burstParticles(this, position.x, position.y + 6, {
      colors: [0xc9d9e6, 0x8fa1ab, 0x5d6d80, 0x4a5869],
      seed: 0x5eedd1c0 + nodeId,
      count: 12,
      speed: 65,
    });
    cameraKick(this);
    this.addDecor(position.x - 2, position.y + 18, 'proc-ground-disturbed');
    this.logScenarioEvent('fieldScanNode', 'proto_dig_performed', {
      metadata: { node_id: nodeId, yield_item_id: yieldItemId ?? null },
    });

    if (yieldItemId !== undefined) {
      const item = getGameItem(yieldItemId);

      this.logScenarioEvent('fieldScanNode', 'proto_item_recovered', {
        metadata: { node_id: nodeId, item_id: yieldItemId },
      });
      sfxPickup();
      sparkle(this, position.x, position.y - 4);
      showFloatingText(this, position.x, position.y, `+ ${item.label}`);
      this.showFeedbackMessage(
        `Recovered: ${item.label}. ${
          yieldItemId === 'relay_coupling'
            ? 'It matches the antenna feed housing on the east side.'
            : 'The survey lab will want this delivered to Kai.'
        }`,
      );
    }
  }

  // ————————————————————————— Feed housing —————————————————————————

  private onFeedHousingOpened(): boolean {
    if (fieldRouteState.coupling_installed) {
      this.showFeedbackMessage(
        'The feed housing is sealed and the antenna feed reads nominal.',
      );
      return false;
    }

    const midInstall = fieldRouteState.install_steps_done > 0;

    if (!midInstall && !hasInventoryItem('relay_coupling')) {
      this.showFeedbackMessage(
        'The feed housing is missing its relay coupling. The flagged survey deposits may turn one up.',
      );
      return false;
    }

    return true;
  }

  private buildFeedHousingOptions(): PromptOption[] {
    const step = fieldRouteState.install_steps_done;
    const stepLabel = INSTALL_STEP_LABELS[step];
    const actionLabels = ['Aligning…', 'Seating…', 'Torquing…'];

    return [
      {
        label: `${stepLabel}.`,
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          performWorldAction({
            scene: this,
            x: FEED_HOUSING_POSITION.x,
            y: FEED_HOUSING_POSITION.y,
            label: actionLabels[step],
            durationMs: 900,
            onComplete: () => this.finishInstallStep(),
          });
        },
      },
      {
        label: 'Step away from the housing.',
        feedback: 'You step back from the feed housing.',
        getEventTypes: () => [],
      },
    ];
  }

  private finishInstallStep() {
    const stepsDone = completeInstallStep();

    this.logScenarioEvent('fieldFeedHousing', 'proto_install_step_completed', {
      metadata: {
        step: stepsDone,
        step_label: INSTALL_STEP_LABELS[stepsDone - 1],
      },
    });

    if (stepsDone === 2) {
      // The coupling is physically seated at step 2.
      removeInventoryItem('relay_coupling');
    }

    // Each completed step gives tactile feedback at the housing.
    sfxInstall();
    sparkle(this, FEED_HOUSING_POSITION.x, FEED_HOUSING_POSITION.y - 10);

    if (fieldRouteState.coupling_installed) {
      // Visible before/after: the tilted, dead mast becomes an upright,
      // braced antenna with a live tip light.
      sfxMachineOn();
      this.setStationTexture('fieldFeedHousing', 'proc-antenna-repaired');
      ringPulse(this, FEED_HOUSING_POSITION.x, FEED_HOUSING_POSITION.y - 20, {
        endRadius: 60,
        rings: 3,
        durationMs: 650,
      });
      cameraKick(this, 0.002);
      this.logScenarioEvent('fieldFeedHousing', 'proto_coupling_installed');
      showFloatingText(
        this,
        FEED_HOUSING_POSITION.x,
        FEED_HOUSING_POSITION.y,
        'Feed restored',
      );
      // Unit 2: the install's completion is the Q04 presentation moment —
      // the SAME standardised work-site disorder appears for every
      // participant, with a neutral, identical statement of the practice
      // and its return points. The work objective itself is complete and
      // the airlock stays available throughout.
      presentQ04Mess();
      markOpportunityOffered(Q04_OPPORTUNITY_ID);
      markOpportunityEntered(Q04_OPPORTUNITY_ID);
      this.logScenarioEvent('fieldFeedHousing', 'proto_q04_mess_presented', {
        metadata: { entry_state_version: Q04_ENTRY_STATE_VERSION },
      });
      refreshValidityProbe();
      this.showFeedbackMessage(
        'The relay coupling seats cleanly — the antenna feed hums back to life.\n\nPacking, clamps and shims still litter the work site. Station practice is to clear a site before heading in — the disposal unit, tool rack and component crate stand along the south path.',
      );
      this.logRouteCompletedIfFinished();
    } else {
      this.showFeedbackMessage(
        `${INSTALL_STEP_LABELS[stepsDone - 1]} — done. Continue the installation.`,
      );
    }
  }

  private logRouteCompletedIfFinished() {
    if (isRouteFinished()) {
      // Kai acknowledges the finished job whichever act closed it out
      // (pose swap only, Unit D). Restrained completion cue — identical
      // for every completion in the game.
      sfxComplete();
      this.setStationTexture('fieldKaiSupervisor', 'plv1-kai-done');
      this.logScenarioEvent('fieldKaiSupervisor', 'proto_route_completed');
    }
  }

  // ————————— Unit 3: Q30 instance 2 — Telemetry Cache Console —————————

  private q30OptionOrder(): 'small_first' | 'integrated_first' {
    return assignCounterbalance(
      researchRuntime.sessionState.getMetadata().game_session_id,
      'q30_telemetry_cache',
      ['small_first', 'integrated_first'] as const,
    );
  }

  private onTelemetryCacheOpened(): boolean {
    if (q30InstanceAnswered('telemetry_cache')) {
      this.showFeedbackMessage(
        'The cache upload is already structured and queued.',
      );
      return false;
    }

    this.logScenarioEvent('fieldTelemetryCache', 'proto_q30_opened', {
      metadata: { instance_id: 'telemetry_cache' },
    });
    markOpportunityEntered(getQ30Instance('telemetry_cache').opportunity_id);
    refreshValidityProbe();

    return true;
  }

  private buildTelemetryCacheOptions(): PromptOption[] {
    const instance = getQ30Instance('telemetry_cache');
    const order = this.q30OptionOrder();

    const choose = (
      choice: 'independent_small' | 'integrated_single',
      label: string,
    ): PromptOption => ({
      label,
      feedback: 'Logged. The upload queue is structured and running.',
      getEventTypes: () => [],
      onSelected: () => {
        const observation = recordQ30Choice('telemetry_cache', choice, order);

        if (observation !== null) {
          this.logScenarioEvent(
            'fieldTelemetryCache',
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
        label: 'Check the console details.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          markQ30DetailInspected('telemetry_cache');
          this.logScenarioEvent(
            'fieldTelemetryCache',
            'proto_q30_detail_inspected',
            { metadata: { instance_id: 'telemetry_cache' } },
          );
        },
        nextStage: (): PromptStage => ({
          body: instance.detail,
          options: ordered,
        }),
      },
    ];
  }

  // ————————————————————————— Prompt wiring —————————————————————————

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'fieldTelemetryCache') {
      return getQ30Instance('telemetry_cache').body;
    }

    if (interactionKey === 'fieldKaiSupervisor') {
      if (!isTaskAccepted(SURVEY_RECOVERY_TASK_ID)) {
        return (
          'Kai: "Glad Vale kitted you out. The terrace lost its antenna feed in the last storm and the survey grid is overdue: ' +
          'scan the four markers, dig out anything the scanner flags, and get the feed housing whole again."'
        );
      }

      return 'Kai holds out a gloved hand for the sample case.';
    }

    if (interactionKey === 'fieldFeedHousing') {
      return 'The housing panel is open. The mounting bracket, coupling seat and torque fitting are all accessible.';
    }

    return undefined;
  }

  protected getStagePresentation(
    interactionKey: InteractionKey,
  ): StagePresentation | undefined {
    if (interactionKey !== 'fieldFeedHousing') {
      return undefined;
    }

    // Install step tracker (NEXT-08 steps surface, redundant-activator
    // model — pure presentation over the same option).
    const tiles: SurfaceStepTile[] = INSTALL_STEP_LABELS.map(
      (label, index) => ({
        label,
        state:
          index < fieldRouteState.install_steps_done
            ? 'done'
            : index === fieldRouteState.install_steps_done
              ? 'current'
              : 'pending',
      }),
    );

    return { surface: [{ kind: 'steps', tiles }] };
  }

  // ————— Physical-mechanics session (Unit 7): ice-bore salvage —————

  private salvageUnlocked(): boolean {
    const routeComplete = researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('final_core_room');
    const freeplay =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('freeplay');

    return routeComplete || freeplay;
  }

  private onIceBoreOpened(): boolean {
    if (!this.salvageUnlocked()) {
      this.showFeedbackMessage('The ice bore is capped during the duty shift.');
      return false;
    }

    const seed = ensureSalvageSeed(
      researchRuntime.sessionState.getMetadata().game_session_id,
    );

    if (!this.salvageSeedLogged) {
      this.salvageSeedLogged = true;
      this.logScenarioEvent('fieldIceBore', 'proto_salvage_opened', {
        metadata: { seed },
      });
    }

    return true;
  }

  private salvageSeedLogged = false;

  /**
   * One full salvage cast at the bore — the single flow behind BOTH the
   * prompt-card option and the F key (identical deck, identical
   * telemetry). The F path initialises/logs the session seed exactly
   * like the prompt-open path so the two entries stay equivalent.
   */
  private startSalvageCastAction() {
    if (!this.salvageUnlocked()) {
      return;
    }

    const seed = ensureSalvageSeed(
      researchRuntime.sessionState.getMetadata().game_session_id,
    );

    if (!this.salvageSeedLogged) {
      this.salvageSeedLogged = true;
      this.logScenarioEvent('fieldIceBore', 'proto_salvage_opened', {
        metadata: { seed },
      });
    }

    startSalvageCast({
      scene: this,
      x: 2 * 32,
      y: 14 * 32,
      onResolved: (result) => {
        if (result.outcome === 'miss') {
          this.logScenarioEvent('fieldIceBore', 'proto_salvage_miss', {
            metadata: { ...salvageLog() },
          });
          this.showFeedbackMessage(
            'The magnet swings clear. The line comes up empty.',
          );
          return;
        }

        this.logScenarioEvent('fieldIceBore', 'proto_salvage_pull', {
          metadata: {
            catch_id: result.draw.catch_id,
            tier: result.draw.tier,
            pull_number: salvagePullCount(),
          },
        });
        this.showFeedbackMessage(
          `The winch brings up a ${result.draw.label}. It goes on the salvage rack.`,
        );
      },
    });
  }

  private buildIceBoreOptions(): PromptOption[] {
    return [
      {
        label: 'Lower the magnet.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startSalvageCastAction(),
      },
      {
        label: 'Check the salvage rack.',
        feedback: '',
        getEventTypes: () => [],
        nextStage: (): PromptStage => {
          const log = salvageLog();

          return {
            body:
              log.pulls.length === 0
                ? 'The salvage rack is empty.'
                : `On the salvage rack: ${log.pulls.join(', ')}.`,
            options: [
              {
                label: 'Back to the winch.',
                feedback: '',
                getEventTypes: () => [],
              },
            ],
          };
        },
      },
      { label: 'Step back.', feedback: '', getEventTypes: () => [] },
    ];
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'fieldIceBore') {
      return this.buildIceBoreOptions();
    }

    if (interactionKey === 'fieldScanNode') {
      return this.buildScanNodeOptions(this.activeNodeId);
    }

    if (interactionKey === 'fieldFeedHousing') {
      return this.buildFeedHousingOptions();
    }

    if (interactionKey === 'fieldTelemetryCache') {
      return this.buildTelemetryCacheOptions();
    }

    if (interactionKey !== 'fieldKaiSupervisor') {
      return [];
    }

    if (!isTaskAccepted(SURVEY_RECOVERY_TASK_ID)) {
      return [
        {
          label: 'Take the survey briefing.',
          feedback:
            'Kai marks the four survey points on your wrist display. "Scanner first, spade second. Shout if the grid surprises you."',
          getEventTypes: () => [],
          onSelected: () => {
            acceptSurveyBriefing();
            this.setStationTexture('fieldKaiSupervisor', 'plv1-kai-work-a');
            this.logScenarioEvent(
              'fieldKaiSupervisor',
              'proto_field_briefing_accepted',
            );
          },
        },
        {
          label: 'Ask what happened out here.',
          feedback: '',
          getEventTypes: () => [],
          nextStage: (): PromptStage => ({
            body: 'Kai: "Storm sheared the antenna feed and buried half the survey grid. The markers still transmit — they just need a scanner pass to read what\'s underneath."',
            options: [
              {
                label: 'Take the survey briefing.',
                feedback:
                  'Kai marks the four survey points on your wrist display. "Scanner first, spade second."',
                getEventTypes: () => [],
                onSelected: () => {
                  acceptSurveyBriefing();
                  this.setStationTexture(
                    'fieldKaiSupervisor',
                    'plv1-kai-work-a',
                  );
                  this.logScenarioEvent(
                    'fieldKaiSupervisor',
                    'proto_field_briefing_accepted',
                  );
                },
              },
              {
                label: 'Not yet — step back.',
                feedback: 'Kai nods. "The grid will keep a little longer."',
                getEventTypes: () => [],
              },
            ],
          }),
        },
      ];
    }

    // Delivery prompt (gated by onKaiOpened: sample recovered + carried).
    return [
      {
        label: 'Hand over the core sample.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.deliverSample(),
      },
      {
        label: 'Hold on to it a little longer.',
        feedback: 'Kai shrugs. "The lab queue isn\'t going anywhere."',
        getEventTypes: () => [],
      },
    ];
  }

  private deliverSample() {
    if (!removeInventoryItem('core_sample')) {
      this.showFeedbackMessage('The sample case is empty.');
      return;
    }

    markSampleDelivered();
    this.logScenarioEvent('fieldKaiSupervisor', 'proto_sample_delivered');
    sparkle(this, KAI_POSITION.x, KAI_POSITION.y - 10);
    showFloatingText(this, KAI_POSITION.x, KAI_POSITION.y, 'Sample delivered');
    this.showFeedbackMessage(
      'Kai seals the case and logs the recovery. "Clean work. The feed and the lab both owe you one."',
    );
    this.logRouteCompletedIfFinished();
  }
}
