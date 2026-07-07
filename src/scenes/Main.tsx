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
import { researchInteractions } from '../data/researchInteractions';
import { Player } from '../sprites';
import { state } from '../state';
import { researchRuntime } from '../systems';

interface Sign extends Phaser.Physics.Arcade.StaticBody {
  text?: string;
}

type MpsInteractionKey =
  | 'archiveAccessTerminal'
  | 'engineerReportBack'
  | 'hazardUncertaintyWarning'
  | 'inventoryPrepChecklist'
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

interface MpsState {
  archiveCompleted: boolean;
  archiveLastWrongCode: string | null;
  engineerReportSubmitted: boolean;
  hazardInfoChecked: boolean;
  inventoryPrepCompleted: boolean;
  objectiveCompleted: boolean;
  optionalSideRepairCompleted: boolean;
  repairCompleted: boolean;
  repairLastFailedSequence: string | null;
}

interface MpsStationConfig {
  interactionKey: MpsInteractionKey;
  label: string;
  x: number;
  y: number;
}

interface MpsStationRuntime extends MpsStationConfig {
  body: MpsStation;
}

export class Main extends Phaser.Scene {
  private activePrompt: ActivePrompt | null = null;
  private activeStation: MpsStationRuntime | null = null;
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private mpsState: MpsState = {
    archiveCompleted: false,
    archiveLastWrongCode: null,
    engineerReportSubmitted: false,
    hazardInfoChecked: false,
    inventoryPrepCompleted: false,
    objectiveCompleted: false,
    optionalSideRepairCompleted: false,
    repairCompleted: false,
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
    const stations: MpsStationConfig[] = [
      {
        interactionKey: 'archiveAccessTerminal',
        label: 'Archive Terminal',
        x: spawnX + 96,
        y: spawnY - 48,
      },
      {
        interactionKey: 'systemsRepairFailure',
        label: 'Repair Panel',
        x: spawnX + 224,
        y: spawnY - 48,
      },
      {
        interactionKey: 'hazardUncertaintyWarning',
        label: 'Hazard Warning',
        x: spawnX + 352,
        y: spawnY - 48,
      },
      {
        interactionKey: 'engineerReportBack',
        label: 'Engineer Hub',
        x: spawnX + 480,
        y: spawnY - 48,
      },
      {
        interactionKey: 'inventoryPrepChecklist',
        label: 'Inventory Prep',
        x: spawnX + 608,
        y: spawnY - 48,
      },
      {
        interactionKey: 'optionalSideRepair',
        label: 'Side Repair Bay',
        x: spawnX + 736,
        y: spawnY - 48,
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
    if (interactionKey === 'hazardUncertaintyWarning') {
      this.logMpsEvent(interactionKey, 'hazard_warning_seen');
    }

    if (interactionKey === 'engineerReportBack') {
      if (this.mpsState.engineerReportSubmitted) {
        this.showFeedbackMessage(
          'Engineer Kai has already logged your report. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'engineer_report_opened');
    }

    if (interactionKey === 'inventoryPrepChecklist') {
      if (this.mpsState.inventoryPrepCompleted) {
        this.showFeedbackMessage(
          'The checklist system has already logged your preparation. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'inventory_prep_opened');
    }

    if (interactionKey === 'optionalSideRepair') {
      if (this.mpsState.optionalSideRepairCompleted) {
        this.showFeedbackMessage(
          'The maintenance bot has already logged your side repair decision. Continue with the remaining station tasks.',
        );
        return;
      }

      this.logMpsEvent(interactionKey, 'side_repair_opened');
    }

    const options = this.getPromptOptions(interactionKey);
    const interaction = researchInteractions[interactionKey];
    const { centerX } = this.cameras.main;
    const promptBody =
      interactionKey === 'engineerReportBack'
        ? '\n\nThe station engineer asks for a status report before the next repair cycle. How do you respond?'
        : interactionKey === 'inventoryPrepChecklist'
          ? '\n\nThe checklist system asks you to prepare a repair kit before the next station cycle. How do you proceed?'
          : interactionKey === 'optionalSideRepair'
            ? '\n\nA maintenance bot flags an optional repair. It is not required for the main cycle, but completing it would improve station stability. What do you do?'
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
              const didRepeat = this.mpsState.archiveLastWrongCode === 'A17';

              this.mpsState.archiveLastWrongCode = 'A17';

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
              this.mpsState.archiveCompleted = true;
              this.logObjectiveIfComplete();
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
                this.mpsState.repairLastFailedSequence === 'default';

              this.mpsState.repairLastFailedSequence = 'default';

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
              this.mpsState.repairCompleted = true;
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
              this.mpsState.hazardInfoChecked = true;
            },
          },
          {
            label: 'Continue through warning',
            feedback: 'You proceeded after checking hazard information.',
            getEventTypes: () => [
              this.mpsState.hazardInfoChecked
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
    const interaction = researchInteractions[interactionKey];

    researchRuntime.logInteraction({
      scene: key.scene.main,
      episode: interaction.episode,
      event_type: eventType,
      object_id: interaction.object_id,
      x: this.player.x,
      y: this.player.y,
    });
  }

  private logObjectiveIfComplete() {
    if (
      this.mpsState.objectiveCompleted ||
      !this.mpsState.archiveCompleted ||
      !this.mpsState.repairCompleted
    ) {
      return;
    }

    this.mpsState.objectiveCompleted = true;
    this.logMpsEvent('archiveAccessTerminal', 'objective_completed');
  }

  private markEngineerReportSubmitted() {
    // One-shot guard prevents repeated assessment submissions from inflating responsibility scores.
    this.mpsState.engineerReportSubmitted = true;
  }

  private markInventoryPrepCompleted() {
    // One-shot guard prevents repeated assessment submissions from inflating organization scores.
    this.mpsState.inventoryPrepCompleted = true;
  }

  private markOptionalSideRepairCompleted() {
    // One-shot guard prevents repeated assessment submissions from inflating productiveness scores.
    this.mpsState.optionalSideRepairCompleted = true;
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
    this.updateMpsProximityPrompt();
  }
}
