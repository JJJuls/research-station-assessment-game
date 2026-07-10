import Phaser from 'phaser';
import { render } from 'phaser-jsx';

import { TilemapDebug, Typewriter } from '../components';
import {
  Depth,
  key,
  TilemapLayer,
  TilemapObject,
  TILESET_NAME,
} from '../constants';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import { Player } from '../sprites';
import { state } from '../state';
import { researchRuntime } from '../systems';

interface Sign extends Phaser.Physics.Arcade.StaticBody {
  text?: string;
}

type MpsInteractionKey =
  | 'archiveAccessTerminal'
  | 'dockArrivalTutorial'
  | 'engineerReportBack'
  | 'finalCoreIntegration'
  | 'hazardUncertaintyWarning'
  | 'inventoryPrepChecklist'
  | 'interruptionCorridor'
  | 'optionalSideRepair'
  | 'systemsRepairFailure';

interface MpsStation extends Phaser.Physics.Arcade.StaticBody {
  interactionKey?: MpsInteractionKey;
}

interface PromptOption {
  label: string;
  feedback: string;
  getEventTypes: () => string[];
  onSelected?: () => void;
}

interface ActivePrompt {
  interactionKey: MpsInteractionKey;
  options: PromptOption[];
  panel: Phaser.GameObjects.Container;
}

/**
 * Room-local/transient interaction state: retry-comparison data, one-shot
 * prompt guards, and prototype-only combined-objective tracking that no
 * other room needs to read. Cross-room completion state now lives in
 * SessionState's shared MissionState (researchRuntime.sessionState) — the
 * mark*Completed() methods below update both this local guard and the
 * shared MissionState.completed_rooms list, since they serve different
 * purposes (local prompt gating vs. cross-room/Final-Core readable state).
 */
interface LocalInteractionState {
  archiveLastWrongCode: string | null;
  dockArrivalTutorialCompleted: boolean;
  engineerReportSubmitted: boolean;
  finalCoreCompleted: boolean;
  hazardInfoChecked: boolean;
  inventoryPrepCompleted: boolean;
  interruptionCorridorCompleted: boolean;
  objectiveCompleted: boolean;
  optionalSideRepairCompleted: boolean;
  repairLastFailedSequence: string | null;
}

/**
 * One-shot guards for the four canonical Dock / Arrival Bay baseline-control
 * events (V3 §4 Room 0: dock_started, movement_instruction_shown,
 * first_movement, first_interaction). Kept separate from
 * LocalInteractionState because these guard baseline covariate logging that
 * happens outside the station-prompt flow (scene entry, free movement),
 * rather than prompt-option gating.
 */
interface DockBaselineState {
  dockStartedLogged: boolean;
  firstInteractionLogged: boolean;
  firstMovementLogged: boolean;
  movementInstructionShownLogged: boolean;
}

interface MpsStationConfig {
  interactionKey: MpsInteractionKey;
  label: string;
  x: number;
  y: number;
}

/**
 * Canonical V3 §3.2 context for a specific `event_type` string, keyed by the
 * exact (legacy) event_type currently logged in this file. Populated only
 * where docs/research/MASTER_33_ALIGNMENT.md's Q01-Q33 coverage matrix and/or
 * docs/research/event-schema.md's worked examples give an unambiguous
 * mapping — see the Beat 2B.2B report for the per-event source
 * justification. Event types with no entry here (e.g. Inventory/Prep,
 * Optional Side Repair, Interruption Corridor, Final Core) still receive
 * `room_id`/`task_id` via `researchInteractions`, just no `study_item_ids`/
 * `construct_id`/`success` — those rooms' current event names have no clear
 * canonical mapping yet per event-schema.md's alias tables.
 */
interface CanonicalEventContext {
  study_item_ids?: string[];
  construct_id?: string;
  success?: boolean | null;
  metadata?: Record<string, unknown>;
}

const CANONICAL_EVENT_CONTEXT: Partial<Record<string, CanonicalEventContext>> =
  {
    // Dock / Arrival Bay — control/usability data only (V3 §1 rule 1);
    // no Q-item or construct mapping exists for this room.
    dock_tutorial_opened: { study_item_ids: [] },
    dock_tutorial_skipped: { study_item_ids: [] },
    dock_instruction_shortcut: { study_item_ids: [] },
    dock_controls_reviewed: { study_item_ids: [] },
    dock_tutorial_completed: { study_item_ids: [] },
    dock_instruction_followed: { study_item_ids: [] },
    dock_movement_practiced: { study_item_ids: [] },
    dock_control_familiarisation: { study_item_ids: [] },
    // Beat 3B.1 — canonical V3 §4 Room 0 baseline-control events, additive
    // alongside the legacy dock_* events above (none renamed/removed/folded).
    dock_started: { study_item_ids: [] },
    movement_instruction_shown: { study_item_ids: [] },
    first_movement: { study_item_ids: [] },
    first_interaction: { study_item_ids: [] },

    // Archive Room (MASTER_33_ALIGNMENT.md Q13/Q22/Q23/Q26 "Events" columns).
    // success: false — docs/game/rooms/01-archive-room.md Task flow step 2:
    // "Player attempts a code/query — the naive first attempt fails."
    archive_wrong_code: {
      study_item_ids: ['Q13'],
      construct_id: 'adaptive_persistence',
      success: false,
    },
    // success: false — docs/game/rooms/01-archive-room.md Failure/edge
    // cases: "Player repeats the exact same wrong code: must log
    // archive_same_wrong_code_repeated" (a repeat of the failed attempt
    // described in Task flow step 2).
    archive_same_wrong_code_repeated: {
      study_item_ids: ['Q26'],
      construct_id: 'inappropriate_persistence',
      success: false,
    },
    archive_feedback_used: {
      study_item_ids: ['Q13', 'Q22'],
      construct_id: 'adaptive_persistence',
    },
    // study_item_ids/construct_id/success match the worked example in
    // event-schema.md §6 verbatim; also corroborated by
    // docs/game/rooms/01-archive-room.md Valid choices/actions: "Try a
    // revised archive query (success path)".
    archive_strategy_revision: {
      study_item_ids: ['Q13', 'Q22', 'Q26'],
      construct_id: 'adaptive_persistence',
      success: true,
    },
    // study_item_ids: Q06 (productiveness) and Q13 (adaptive persistence)
    // both list this event; construct_id intentionally left unset — see
    // report. success: true — docs/game/rooms/01-archive-room.md Task flow
    // step 5: "Completion flag sent to mission checklist when a revised
    // query succeeds."
    archive_completed: {
      study_item_ids: ['Q06', 'Q13'],
      success: true,
    },

    // Systems Repair Room (MASTER_33_ALIGNMENT.md Q06/Q14/Q21/Q22/Q23/Q26).
    // success: false — docs/game/rooms/02-systems-repair-room.md Task flow
    // step 2: "Player runs a repair sequence — default/first attempt
    // fails."
    repair_failed: {
      study_item_ids: ['Q14', 'Q21'],
      construct_id: 'adaptive_persistence',
      success: false,
    },
    // success: false — docs/game/rooms/02-systems-repair-room.md
    // Failure/edge cases: "Player repeats the exact same failed sequence:
    // must log repair_same_sequence_repeated".
    repair_same_sequence_repeated: {
      study_item_ids: ['Q26'],
      construct_id: 'inappropriate_persistence',
      success: false,
    },
    repair_manual_used: {
      study_item_ids: ['Q14', 'Q21', 'Q22'],
      construct_id: 'adaptive_persistence',
    },
    // success: true — docs/game/rooms/02-systems-repair-room.md Valid
    // choices/actions: "Apply revised repair sequence (success path)".
    repair_strategy_revision: {
      study_item_ids: ['Q14', 'Q21', 'Q23'],
      construct_id: 'adaptive_persistence',
      success: true,
    },
    // study_item_ids: Q06/Q14/Q21 all list this event; construct_id
    // intentionally left unset — see report. success: true — this event is
    // logged only as part of the same "Apply revised repair sequence
    // (success path)" option as repair_strategy_revision above (see
    // getPromptOptions() 'systemsRepairFailure' case), per
    // docs/game/rooms/02-systems-repair-room.md Valid choices/actions.
    repair_completed: {
      study_item_ids: ['Q06', 'Q14', 'Q21'],
      success: true,
    },

    // Engineer Hub — only events explicitly listed under Q09 in
    // MASTER_33_ALIGNMENT.md's "Events" column get a mapping;
    // engineer_clarification_requested and
    // engineer_report_submitted_unprepared have no Events-column listing
    // for any Q-row and are intentionally left unmapped — see report.
    engineer_report_opened: {
      study_item_ids: ['Q09'],
      construct_id: 'responsibility',
    },
    engineer_evidence_reviewed: {
      study_item_ids: ['Q09'],
      construct_id: 'responsibility',
    },
    engineer_report_submitted_prepared: {
      study_item_ids: ['Q09'],
      construct_id: 'responsibility',
    },

    // Hazard Control Room (MASTER_33_ALIGNMENT.md Q12/Q27/Q31).
    hazard_warning_seen: {
      study_item_ids: ['Q12'],
      construct_id: 'prudence',
    },
    // Q12 (prudence) and Q27 (inappropriate persistence) both list this
    // event; construct_id intentionally left unset — see report.
    hazard_info_checked: {
      study_item_ids: ['Q12', 'Q27'],
    },
    // study_item_ids: Q31's Events column in MASTER_33_ALIGNMENT.md lists
    // this exact event_type. construct_id: event-schema.md's naming
    // conventions define `goal_time_exploratory` for Goal-Time constructs
    // flagged optional/exploratory, matching Q31's Construct/Proxy-status
    // columns. No source assigns a success value to this exact event_type
    // (only the sibling hazard_reckless_continue has a documented example) —
    // success is intentionally omitted rather than extended by symmetry.
    hazard_informed_continue: {
      study_item_ids: ['Q31'],
      construct_id: 'goal_time_exploratory',
    },
    // study_item_ids/construct_id/success match the worked example in
    // event-schema.md §6 verbatim for this exact event_type;
    // metadata.info_checked_before_continuing is computed live from
    // localState.hazardInfoChecked (see getCanonicalEventContext), not
    // hardcoded here.
    hazard_reckless_continue: {
      study_item_ids: ['Q12', 'Q27', 'Q31'],
      construct_id: 'inappropriate_persistence',
      success: null,
    },
  };

interface MpsStationRuntime extends MpsStationConfig {
  body: MpsStation;
}

export class Main extends Phaser.Scene {
  private activePrompt: ActivePrompt | null = null;
  private activeStation: MpsStationRuntime | null = null;
  private dockBaselineState: DockBaselineState = {
    dockStartedLogged: false,
    firstInteractionLogged: false,
    firstMovementLogged: false,
    movementInstructionShownLogged: false,
  };
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private localState: LocalInteractionState = {
    archiveLastWrongCode: null,
    dockArrivalTutorialCompleted: false,
    engineerReportSubmitted: false,
    finalCoreCompleted: false,
    hazardInfoChecked: false,
    inventoryPrepCompleted: false,
    interruptionCorridorCompleted: false,
    objectiveCompleted: false,
    optionalSideRepairCompleted: false,
    repairLastFailedSequence: null,
  };
  private mpsStations: MpsStationRuntime[] = [];
  private player!: Player;
  private proximityPrompt!: Phaser.GameObjects.Text;
  private sign!: Sign;
  private stationLabels!: Phaser.GameObjects.Container;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super(key.scene.main);
  }

  create() {
    researchRuntime.logSceneStart(key.scene.main);

    this.tilemap = this.make.tilemap({ key: key.tilemap.tuxemon });

    // Parameters are the name you gave the tileset in Tiled and
    // the key of the tileset image in Phaser's cache (name used in preload)
    const tileset = this.tilemap.addTilesetImage(
      TILESET_NAME,
      key.image.tuxemon,
    )!;

    // Parameters: layer name (or index) from Tiled, tileset, x, y
    this.tilemap.createLayer(TilemapLayer.BelowPlayer, tileset, 0, 0);
    this.worldLayer = this.tilemap.createLayer(
      TilemapLayer.World,
      tileset,
      0,
      0,
    )!;
    const aboveLayer = this.tilemap.createLayer(
      TilemapLayer.AbovePlayer,
      tileset,
      0,
      0,
    )!;

    this.worldLayer.setCollisionByProperty({ collides: true });
    this.physics.world.bounds.width = this.worldLayer.width;
    this.physics.world.bounds.height = this.worldLayer.height;

    // By default, everything gets depth sorted on the screen in the order we created things.
    // We want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
    // Higher depths will sit on top of lower depth objects.
    aboveLayer.setDepth(Depth.AbovePlayer);

    this.addPlayer();

    // Set the bounds of the camera
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels,
    );

    render(<TilemapDebug tilemapLayer={this.worldLayer} />, this);
    this.addPrototypeInstruction();

    state.isTypewriting = true;
    render(
      <Typewriter
        text="WASD or arrow keys to move."
        onEnd={() => (state.isTypewriting = false)}
      />,
      this,
    );
    this.logMovementInstructionShownIfNeeded();

    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.pause(key.scene.main);
      this.scene.launch(key.scene.menu);
    });
  }

  private addPlayer() {
    // Object layers in Tiled let you embed extra info into a map like a spawn point or custom collision shapes.
    // In the tmx file, there's an object layer with a point named 'Spawn Point'.
    const spawnPoint = this.tilemap.findObject(
      TilemapLayer.Objects,
      ({ name }) => name === TilemapObject.SpawnPoint,
    )!;

    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);
    this.logDockStartedIfNeeded();
    this.addPlayerSignInteraction();
    this.addMpsInteractions(spawnPoint.x!, spawnPoint.y!);

    // Watch the player and worldLayer for collisions
    this.physics.add.collider(this.player, this.worldLayer);
  }

  private addPlayerSignInteraction() {
    const sign = this.tilemap.findObject(
      TilemapLayer.Objects,
      ({ name }) => name === TilemapObject.Sign,
    )!;

    this.sign = this.physics.add.staticBody(
      sign.x!,
      sign.y!,
      sign.width,
      sign.height,
    );
    this.sign.text = sign.properties[0].value;

    type ArcadeColliderType = Phaser.Types.Physics.Arcade.ArcadeColliderType;

    this.physics.add.overlap(
      this.sign as unknown as ArcadeColliderType,
      this.player.selector as unknown as ArcadeColliderType,
      (sign) => {
        if (this.player.cursors.space.isDown && !state.isTypewriting) {
          const stateBefore = String(state.isTypewriting);

          state.isTypewriting = true;

          const interaction = researchInteractions.sign;

          researchRuntime.logInteraction({
            scene: key.scene.main,
            episode: interaction.episode,
            event_type: interaction.event_type,
            object_id: interaction.object_id,
            x: this.player.x,
            y: this.player.y,
            state_before: stateBefore,
            state_after: String(state.isTypewriting),
          });

          render(
            <Typewriter
              text={(sign as unknown as Sign).text!}
              onEnd={() => (state.isTypewriting = false)}
            />,
            this,
          );
        }
      },
      undefined,
      this,
    );
  }

  private addMpsInteractions(spawnX: number, spawnY: number) {
    // Temporary prototype hub layout until proper room maps and door transitions are implemented.
    const stations: MpsStationConfig[] = [
      {
        interactionKey: 'dockArrivalTutorial',
        label: 'Dock Tutorial',
        x: spawnX - 208,
        y: spawnY - 96,
      },
      {
        interactionKey: 'archiveAccessTerminal',
        label: 'Archive Terminal',
        x: spawnX - 128,
        y: spawnY - 256,
      },
      {
        interactionKey: 'systemsRepairFailure',
        label: 'Repair Panel',
        x: spawnX + 32,
        y: spawnY - 256,
      },
      {
        interactionKey: 'hazardUncertaintyWarning',
        label: 'Hazard Warning',
        x: spawnX + 192,
        y: spawnY - 256,
      },
      {
        interactionKey: 'engineerReportBack',
        label: 'Engineer Hub',
        x: spawnX + 352,
        y: spawnY - 256,
      },
      {
        interactionKey: 'finalCoreIntegration',
        label: 'Final Core',
        x: spawnX + 512,
        y: spawnY - 256,
      },
      {
        interactionKey: 'inventoryPrepChecklist',
        label: 'Inventory Prep',
        x: spawnX - 48,
        y: spawnY - 96,
      },
      {
        interactionKey: 'optionalSideRepair',
        label: 'Side Repair Bay',
        x: spawnX + 112,
        y: spawnY - 96,
      },
      {
        interactionKey: 'interruptionCorridor',
        label: 'Comms Interruption',
        x: spawnX + 272,
        y: spawnY - 96,
      },
    ];

    this.stationLabels = this.add.container(0, 0);

    for (const stationConfig of stations) {
      const marker = this.add
        .rectangle(stationConfig.x, stationConfig.y, 40, 40, 0x1f7a8c, 0.8)
        .setStrokeStyle(2, 0xffffff);
      const label = this.add
        .text(stationConfig.x, stationConfig.y - 42, stationConfig.label, {
          backgroundColor: '#000',
          color: '#fff',
          font: '12px monospace',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);

      const station = this.physics.add.staticBody(
        stationConfig.x - 16,
        stationConfig.y - 16,
        32,
        32,
      ) as MpsStation;
      station.interactionKey = stationConfig.interactionKey;

      this.stationLabels.add([marker, label]);
      this.mpsStations.push({
        ...stationConfig,
        body: station,
      });
    }

    this.stationLabels.setDepth(Depth.AboveWorld);

    this.proximityPrompt = this.add
      .text(0, 0, 'Press SPACE to interact', {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '14px monospace',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setVisible(false);
  }

  private showMpsPrompt(interactionKey: MpsInteractionKey) {
    if (interactionKey === 'dockArrivalTutorial') {
      this.logFirstDockInteractionIfNeeded();

      if (this.localState.dockArrivalTutorialCompleted) {
        this.showFeedbackMessage(
          'The dock tutorial has already been logged. Continue with the station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'dock_tutorial_opened');
    }

    if (interactionKey === 'finalCoreIntegration') {
      if (this.localState.finalCoreCompleted) {
        this.showFeedbackMessage(
          'The core interface has already logged the final integration decision.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'final_core_opened');
    }

    if (interactionKey === 'hazardUncertaintyWarning') {
      this.logMpsEvent(interactionKey, 'hazard_warning_seen');
    }

    if (interactionKey === 'engineerReportBack') {
      if (this.localState.engineerReportSubmitted) {
        this.showFeedbackMessage(
          'Engineer Kai has already logged your report. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'engineer_report_opened');
    }

    if (interactionKey === 'inventoryPrepChecklist') {
      if (this.localState.inventoryPrepCompleted) {
        this.showFeedbackMessage(
          'The checklist system has already logged your preparation. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'inventory_prep_opened');
    }

    if (interactionKey === 'optionalSideRepair') {
      if (this.localState.optionalSideRepairCompleted) {
        this.showFeedbackMessage(
          'The maintenance bot has already logged your side repair decision. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'side_repair_opened');
    }

    if (interactionKey === 'interruptionCorridor') {
      if (this.localState.interruptionCorridorCompleted) {
        this.showFeedbackMessage(
          'The comms interruption has already been logged. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'interruption_opened');
    }

    const options = this.getPromptOptions(interactionKey);
    const interaction = researchInteractions[interactionKey];
    const { centerX } = this.cameras.main;
    const promptBody =
      interactionKey === 'engineerReportBack'
        ? '\n\nThe station engineer asks for a status report before the next repair cycle. How do you respond?'
        : interactionKey === 'dockArrivalTutorial'
          ? '\n\nThe dock system checks whether you understand the basic controls before station tasks begin. What do you do?'
          : interactionKey === 'finalCoreIntegration'
            ? '\n\nThe core interface asks you to review the station status before closing the mission cycle. How do you proceed?'
            : interactionKey === 'inventoryPrepChecklist'
              ? '\n\nThe checklist system asks you to prepare a repair kit before the next station cycle. How do you proceed?'
              : interactionKey === 'optionalSideRepair'
                ? '\n\nA maintenance bot flags an optional repair. It is not required for the main cycle, but completing it would improve station stability. What do you do?'
                : interactionKey === 'interruptionCorridor'
                  ? '\n\nA new comms alert interrupts your current station work with a different request. How do you respond?'
                  : '';
    const optionText = options
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join('\n');
    const background = this.add
      .rectangle(0, 0, 560, 230, 0x101820, 0.96)
      .setOrigin(0);
    const text = this.add.text(
      18,
      16,
      `${interaction.label}${promptBody}\n\n${optionText}\n\nPress 1, 2, or 3 to choose.`,
      {
        color: '#ffffff',
        font: '16px monospace',
        wordWrap: { width: 524 },
      },
    );
    const panel = this.add.container(centerX - 280, 72, [background, text]);

    panel.setDepth(Depth.AboveWorld);
    panel.setScrollFactor(0);
    this.stationLabels.setVisible(false);
    this.proximityPrompt.setVisible(false);

    this.activePrompt = {
      interactionKey,
      options,
      panel,
    };

    this.input.keyboard!.on('keydown-ONE', this.selectPromptOptionOne, this);
    this.input.keyboard!.on('keydown-TWO', this.selectPromptOptionTwo, this);
    this.input.keyboard!.on(
      'keydown-THREE',
      this.selectPromptOptionThree,
      this,
    );
  }

  private getPromptOptions(interactionKey: MpsInteractionKey): PromptOption[] {
    switch (interactionKey) {
      case 'archiveAccessTerminal':
        return [
          {
            label: 'Enter access code A17',
            feedback: 'Access failed. Terminal feedback available.',
            getEventTypes: () => {
              const didRepeat = this.localState.archiveLastWrongCode === 'A17';

              this.localState.archiveLastWrongCode = 'A17';

              return [
                'archive_attempt',
                didRepeat
                  ? 'archive_same_wrong_code_repeated'
                  : 'archive_wrong_code',
              ];
            },
          },
          {
            label: 'Read terminal feedback',
            feedback: 'Feedback reviewed.',
            getEventTypes: () => ['archive_feedback_used'],
          },
          {
            label: 'Try revised archive query',
            feedback: 'Archive query revised successfully.',
            getEventTypes: () => [
              'archive_attempt',
              'archive_strategy_revision',
              'archive_completed',
            ],
            onSelected: () => {
              researchRuntime.sessionState.markRoomCompleted('archive_room');
              this.logObjectiveIfComplete();
            },
          },
        ];

      case 'dockArrivalTutorial':
        return [
          {
            label: 'Skip the tutorial and continue.',
            feedback:
              'You skip the orientation. The station tasks remain available, but baseline comprehension is unclear.',
            getEventTypes: () => [
              'dock_tutorial_skipped',
              'dock_instruction_shortcut',
            ],
            onSelected: () => {
              this.markDockArrivalTutorialCompleted();
            },
          },
          {
            label: 'Review the controls and confirm readiness.',
            feedback:
              'You review the basic controls and confirm that you are ready to continue.',
            getEventTypes: () => [
              'dock_controls_reviewed',
              'dock_tutorial_completed',
              'dock_instruction_followed',
            ],
            onSelected: () => {
              this.markDockArrivalTutorialCompleted();
            },
          },
          {
            label: 'Practice movement briefly, then confirm readiness.',
            feedback:
              'You take a moment to practise movement before starting the station tasks.',
            getEventTypes: () => [
              'dock_movement_practiced',
              'dock_tutorial_completed',
              'dock_control_familiarisation',
            ],
            onSelected: () => {
              this.markDockArrivalTutorialCompleted();
            },
          },
        ];

      case 'engineerReportBack':
        return [
          {
            label: 'Submit a quick report from memory.',
            feedback:
              'You give a fast answer, but miss several uncertainties that should have been checked.',
            getEventTypes: () => [
              'engineer_report_submitted_unprepared',
              'engineer_responsibility_shortcut',
            ],
            onSelected: () => {
              this.markEngineerReportSubmitted();
            },
          },
          {
            label: 'Review station evidence, then report.',
            feedback:
              'You check the available evidence and give a clearer, more dependable report.',
            getEventTypes: () => [
              'engineer_evidence_reviewed',
              'engineer_report_submitted_prepared',
              'engineer_responsibility_adaptive',
            ],
            onSelected: () => {
              this.markEngineerReportSubmitted();
            },
          },
          {
            label: 'Ask Engineer Kai for clarification before reporting.',
            feedback:
              'You clarify expectations before reporting, reducing the risk of a misleading update.',
            getEventTypes: () => [
              'engineer_clarification_requested',
              'engineer_report_submitted_supervised',
              'engineer_responsibility_adaptive',
            ],
            onSelected: () => {
              this.markEngineerReportSubmitted();
            },
          },
        ];

      case 'finalCoreIntegration':
        return [
          {
            label: 'Start final synchronization immediately.',
            feedback:
              'You start synchronization quickly, but unresolved station issues remain unreviewed.',
            getEventTypes: () => [
              'final_core_quick_sync',
              'final_core_unresolved_issues_ignored',
              'final_core_low_quality_completion',
            ],
            onSelected: () => {
              this.markFinalCoreCompleted();
            },
          },
          {
            label: 'Review station status, then integrate completed work.',
            feedback:
              'You review the station status and integrate the completed work in a structured sequence.',
            getEventTypes: () => [
              'final_core_status_reviewed',
              'final_core_prior_results_integrated',
              'final_core_structured_completion',
            ],
            onSelected: () => {
              this.markFinalCoreCompleted();
            },
          },
          {
            label:
              'Resolve remaining issue flags before final synchronization.',
            feedback:
              'You address remaining issue flags before completing the final synchronization.',
            getEventTypes: () => [
              'final_core_status_reviewed',
              'final_core_remaining_issues_resolved',
              'final_core_high_quality_completion',
            ],
            onSelected: () => {
              this.markFinalCoreCompleted();
            },
          },
        ];

      case 'inventoryPrepChecklist':
        return [
          {
            label: 'Grab tools quickly without checking the list.',
            feedback:
              'You move quickly, but the kit is incomplete and the workspace is left unresolved.',
            getEventTypes: () => [
              'inventory_prep_shortcut',
              'inventory_required_item_missed',
              'inventory_disorganized_action',
            ],
            onSelected: () => {
              this.markInventoryPrepCompleted();
            },
          },
          {
            label: 'Open the checklist and pack the required tools in order.',
            feedback:
              'You follow the checklist and prepare the required tools in a clear order.',
            getEventTypes: () => [
              'inventory_checklist_used',
              'inventory_required_tools_packed',
              'inventory_systematic_prep',
            ],
            onSelected: () => {
              this.markInventoryPrepCompleted();
            },
          },
          {
            label: 'Sort the workspace and verify the kit before leaving.',
            feedback:
              'You leave the prep area tidy and verify that the repair kit is ready.',
            getEventTypes: () => [
              'inventory_workspace_sorted',
              'inventory_kit_verified',
              'inventory_cleanup_completed',
            ],
            onSelected: () => {
              this.markInventoryPrepCompleted();
            },
          },
        ];

      case 'interruptionCorridor':
        return [
          {
            label:
              'Switch fully to the new request and leave the previous task.',
            feedback:
              'You follow the new alert, but the previous task is left unfinished.',
            getEventTypes: () => [
              'interruption_new_task_chosen',
              'interruption_previous_task_abandoned',
              'interruption_focus_lost',
            ],
            onSelected: () => {
              this.markInterruptionCorridorCompleted();
            },
          },
          {
            label:
              'Acknowledge the alert, then return to the unfinished station task.',
            feedback:
              'You note the alert without losing track of the original task.',
            getEventTypes: () => [
              'interruption_alert_acknowledged',
              'interruption_returned_to_original_task',
              'interruption_focus_maintained',
            ],
            onSelected: () => {
              this.markInterruptionCorridorCompleted();
            },
          },
          {
            label:
              'Ignore the alert completely and continue without checking it.',
            feedback:
              'You stay focused, but you may miss relevant station information.',
            getEventTypes: () => [
              'interruption_alert_ignored',
              'interruption_single_task_focus',
              'interruption_possible_rigidity',
            ],
            onSelected: () => {
              this.markInterruptionCorridorCompleted();
            },
          },
        ];

      case 'optionalSideRepair':
        return [
          {
            label: 'Ignore the optional repair and move on.',
            feedback:
              'You skip the optional repair. The main path remains open, but the station issue is left unresolved.',
            getEventTypes: () => [
              'side_repair_ignored',
              'side_repair_low_effort',
            ],
            onSelected: () => {
              this.markOptionalSideRepairCompleted();
            },
          },
          {
            label: 'Start the repair, but stop after the first difficulty.',
            feedback:
              'You begin the repair, but stop when the task becomes difficult.',
            getEventTypes: () => [
              'side_repair_started',
              'side_repair_abandoned_after_difficulty',
            ],
            onSelected: () => {
              this.markOptionalSideRepairCompleted();
            },
          },
          {
            label: 'Work through the difficulty and complete the repair.',
            feedback:
              'You stay with the difficult repair until the issue is resolved.',
            getEventTypes: () => [
              'side_repair_started',
              'side_repair_completed',
              'side_repair_productive_persistence',
            ],
            onSelected: () => {
              this.markOptionalSideRepairCompleted();
            },
          },
        ];

      case 'systemsRepairFailure':
        return [
          {
            label: 'Run default repair sequence',
            feedback: 'Repair failed. Manual may help.',
            getEventTypes: () => {
              const didRepeat =
                this.localState.repairLastFailedSequence === 'default';

              this.localState.repairLastFailedSequence = 'default';

              return [
                'repair_attempt',
                didRepeat ? 'repair_same_sequence_repeated' : 'repair_failed',
              ];
            },
          },
          {
            label: 'Open repair manual',
            feedback: 'Manual reviewed.',
            getEventTypes: () => ['repair_manual_used'],
          },
          {
            label: 'Apply revised repair sequence',
            feedback: 'Repair sequence revised successfully.',
            getEventTypes: () => [
              'repair_attempt',
              'repair_strategy_revision',
              'repair_completed',
            ],
            onSelected: () => {
              researchRuntime.sessionState.markRoomCompleted(
                'systems_repair_room',
              );
              this.logObjectiveIfComplete();
            },
          },
        ];

      case 'hazardUncertaintyWarning':
        return [
          {
            label: 'Check hazard detail',
            feedback: 'Hazard details checked.',
            getEventTypes: () => ['hazard_info_checked'],
            onSelected: () => {
              this.localState.hazardInfoChecked = true;
            },
          },
          {
            label: 'Continue through warning',
            feedback: 'You proceeded after checking hazard information.',
            getEventTypes: () => [
              this.localState.hazardInfoChecked
                ? 'hazard_informed_continue'
                : 'hazard_reckless_continue',
            ],
          },
          {
            label: 'Avoid uncertain route',
            feedback: 'You avoided the uncertain route.',
            getEventTypes: () => ['hazard_avoidance'],
          },
        ];
    }
  }

  private selectPromptOptionOne = () => this.selectPromptOption(0);

  private selectPromptOptionTwo = () => this.selectPromptOption(1);

  private selectPromptOptionThree = () => this.selectPromptOption(2);

  private selectPromptOption(index: number) {
    if (this.activePrompt === null) {
      return;
    }

    const { interactionKey, options } = this.activePrompt;
    const option = options[index];

    for (const eventType of option.getEventTypes()) {
      this.logMpsEvent(interactionKey, eventType);
    }

    option.onSelected?.();
    this.closeMpsPrompt();
    this.showFeedbackMessage(option.feedback);
  }

  private closeMpsPrompt() {
    this.input.keyboard!.off('keydown-ONE', this.selectPromptOptionOne, this);
    this.input.keyboard!.off('keydown-TWO', this.selectPromptOptionTwo, this);
    this.input.keyboard!.off(
      'keydown-THREE',
      this.selectPromptOptionThree,
      this,
    );

    this.activePrompt?.panel.destroy();
    this.activePrompt = null;
    this.stationLabels.setVisible(true);
  }

  private logMpsEvent(interactionKey: MpsInteractionKey, eventType: string) {
    const interaction: ResearchInteraction =
      researchInteractions[interactionKey];

    researchRuntime.logInteraction({
      scene: key.scene.main,
      episode: interaction.episode,
      event_type: eventType,
      object_id: interaction.object_id,
      x: this.player.x,
      y: this.player.y,
      room_id: interaction.room_id,
      task_id: interaction.task_id,
      ...this.getCanonicalEventContext(eventType),
    });
  }

  /**
   * Looks up additive canonical V3 §3.2 context for a specific event_type
   * (see CANONICAL_EVENT_CONTEXT). `hazard_reckless_continue` also carries a
   * live-computed `info_checked_before_continuing` metadata flag, matching
   * the worked example in docs/research/event-schema.md §6 verbatim, rather
   * than a hardcoded value. No other event_type has a documented metadata
   * mapping, so none is added — in particular, `hazard_informed_continue`
   * has no worked example assigning it this (or any) metadata field.
   */
  private getCanonicalEventContext(
    eventType: string,
  ): CanonicalEventContext | undefined {
    const context = CANONICAL_EVENT_CONTEXT[eventType];

    if (context === undefined) {
      return undefined;
    }

    if (eventType === 'hazard_reckless_continue') {
      return {
        ...context,
        metadata: {
          info_checked_before_continuing: this.localState.hazardInfoChecked,
        },
      };
    }

    return context;
  }

  private logObjectiveIfComplete() {
    const missionState = researchRuntime.sessionState.getMissionState();

    if (
      this.localState.objectiveCompleted ||
      !missionState.completed_rooms.includes('archive_room') ||
      !missionState.completed_rooms.includes('systems_repair_room')
    ) {
      return;
    }

    this.localState.objectiveCompleted = true;
    this.logMpsEvent('archiveAccessTerminal', 'objective_completed');
  }

  private markEngineerReportSubmitted() {
    // One-shot guard prevents repeated assessment submissions from inflating responsibility scores.
    this.localState.engineerReportSubmitted = true;
    researchRuntime.sessionState.markRoomCompleted('engineer_hub');
  }

  private markDockArrivalTutorialCompleted() {
    // One-shot guard prevents repeated tutorial interactions from inflating baseline control variables.
    this.localState.dockArrivalTutorialCompleted = true;
    researchRuntime.sessionState.markRoomCompleted('dock_arrival');
  }

  /**
   * V3 §4 Room 0 baseline event: player enters the session at the Dock
   * spawn. Logged once per Main instance, guarded by dockBaselineState.
   */
  private logDockStartedIfNeeded() {
    if (this.dockBaselineState.dockStartedLogged) {
      return;
    }

    this.dockBaselineState.dockStartedLogged = true;
    this.logMpsEvent('dockArrivalTutorial', 'dock_started');
  }

  /**
   * V3 §4 Room 0 baseline event: the movement/control instruction
   * (the "WASD or arrow keys to move." typewriter intro) is displayed.
   */
  private logMovementInstructionShownIfNeeded() {
    if (this.dockBaselineState.movementInstructionShownLogged) {
      return;
    }

    this.dockBaselineState.movementInstructionShownLogged = true;
    this.logMpsEvent('dockArrivalTutorial', 'movement_instruction_shown');
  }

  /**
   * V3 §4 Room 0 baseline event: the player's first real movement of the
   * session, detected from live player velocity rather than the
   * "practice movement" dialogue option — that option logs the separate,
   * unchanged dock_movement_practiced event.
   */
  private logFirstMovementIfNeeded() {
    if (this.dockBaselineState.firstMovementLogged) {
      return;
    }

    const { velocity } = this.player.body;

    if (velocity.x === 0 && velocity.y === 0) {
      return;
    }

    this.dockBaselineState.firstMovementLogged = true;
    this.logMpsEvent('dockArrivalTutorial', 'first_movement');
  }

  /**
   * V3 §4 Room 0 baseline event: the player's first successful Dock
   * station interaction (in proximity range and pressed SPACE). Only
   * reachable via showMpsPrompt('dockArrivalTutorial'), so an out-of-range
   * SPACE press or a different station never triggers it.
   */
  private logFirstDockInteractionIfNeeded() {
    if (this.dockBaselineState.firstInteractionLogged) {
      return;
    }

    this.dockBaselineState.firstInteractionLogged = true;
    this.logMpsEvent('dockArrivalTutorial', 'first_interaction');
  }

  private markFinalCoreCompleted() {
    // One-shot guard prevents repeated final-core submissions from inflating integration scores.
    this.localState.finalCoreCompleted = true;
    researchRuntime.sessionState.markRoomCompleted('final_core_room');
  }

  private markInventoryPrepCompleted() {
    // One-shot guard prevents repeated assessment submissions from inflating organization scores.
    this.localState.inventoryPrepCompleted = true;
    researchRuntime.sessionState.markRoomCompleted('inventory_prep_room');
  }

  private markInterruptionCorridorCompleted() {
    // One-shot guard prevents repeated assessment submissions from inflating return-to-task scores.
    this.localState.interruptionCorridorCompleted = true;
    researchRuntime.sessionState.markRoomCompleted('interruption_corridor');
  }

  private markOptionalSideRepairCompleted() {
    // One-shot guard prevents repeated assessment submissions from inflating productiveness scores.
    this.localState.optionalSideRepairCompleted = true;
    researchRuntime.sessionState.markRoomCompleted('optional_side_repair_bay');
  }

  private addPrototypeInstruction() {
    this.add
      .text(
        12,
        570,
        'MPS Prototype: test Archive, Repair, and Hazard stations.',
        {
          backgroundColor: '#000',
          color: '#fff',
          font: '12px monospace',
          padding: { x: 6, y: 4 },
        },
      )
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
  }

  private showFeedbackMessage(message: string) {
    this.feedbackMessage?.destroy();

    const { centerX } = this.cameras.main;

    this.feedbackMessage = this.add
      .text(centerX, 72, message, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '15px monospace',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    this.time.delayedCall(1600, () => {
      this.feedbackMessage?.destroy();
      this.feedbackMessage = null;
    });
  }

  private updateMpsProximityPrompt() {
    if (this.activePrompt !== null || state.isTypewriting) {
      this.activeStation = null;
      this.proximityPrompt.setVisible(false);
      return;
    }

    this.activeStation = this.getNearestStationInRange();

    if (this.activeStation === null) {
      this.proximityPrompt.setVisible(false);
      return;
    }

    this.proximityPrompt
      .setPosition(this.activeStation.x, this.activeStation.y - 72)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.player.cursors.space)) {
      this.showMpsPrompt(this.activeStation.interactionKey);
    }
  }

  private getNearestStationInRange() {
    const interactionRange = 72;
    let nearestStation: MpsStationRuntime | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const station of this.mpsStations) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        station.x,
        station.y,
      );

      if (distance < interactionRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearestStation = station;
      }
    }

    return nearestStation;
  }

  update() {
    this.player.update();
    this.logFirstMovementIfNeeded();
    this.updateMpsProximityPrompt();
  }
}
