import Phaser from 'phaser';

import { Depth, key } from '../constants';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import { Player } from '../sprites';
import { state } from '../state';
import { researchRuntime } from '../systems';
import type { CanonicalEventContext } from './CanonicalEventContext';
import { CANONICAL_EVENT_CONTEXT } from './CanonicalEventContext';
import type { RoomTransitionTarget } from './SceneRouter';
import { transitionToRoom } from './SceneRouter';
import type { BuiltRoomMap, RoomLayout } from './StationMapBuilder';
import { buildPlaceholderRoomMap } from './StationMapBuilder';

export type InteractionKey = keyof typeof researchInteractions;

export interface PromptOption {
  label: string;
  feedback: string;
  getEventTypes: () => string[];
  onSelected?: () => void;
}

interface ActivePrompt {
  interactionKey: InteractionKey;
  options: PromptOption[];
  panel: Phaser.GameObjects.Container;
}

export interface RoomStationConfig {
  interactionKey: InteractionKey;
  label: string;
  x: number;
  y: number;
  /** Extra prompt body text below the interaction label (in-fiction). */
  promptBody?: string;
  /**
   * Called when the prompt is opened via SPACE (before options render);
   * return `false` to suppress the prompt (e.g. one-shot "already done"
   * feedback paths, mirroring the prototype's showMpsPrompt gating).
   */
  onPromptOpened?: () => boolean;
}

export interface RoomDoorConfig {
  x: number;
  y: number;
  label: string;
  target?: RoomTransitionTarget;
  /**
   * Sealed doors (unbuilt rooms) show this fiction-consistent message
   * instead of transitioning. Sealed-door interactions are
   * control/usability data only.
   */
  sealedMessage?: string;
  /** Event type logged on activation (documented in event-schema.md). */
  eventType?: string;
  /** Interaction used for room_id/object_id context on door events. */
  interactionKey: InteractionKey;
}

interface ProximityTarget {
  x: number;
  y: number;
  kind: 'station' | 'door';
  station?: RoomStationConfig;
  door?: RoomDoorConfig;
}

/**
 * Once-per-session guards for canonical baseline events that must never
 * re-fire when a scene is re-entered (approved plan §11 Hub governance:
 * re-entry idempotence). Scene instances are recreated by scene.start(), so
 * these flags live at module scope for the lifetime of the page session —
 * matching the prototype's per-Main-instance guards, which in the connected
 * world must survive room transitions.
 */
const sessionOnceFlags = new Set<string>();

export function runOncePerSession(flag: string, fn: () => void) {
  if (sessionOnceFlags.has(flag)) {
    return;
  }

  sessionOnceFlags.add(flag);
  fn();
}

/**
 * Test-only escape hatch (unused in gameplay code; deliberately NOT
 * re-exported through the world barrel — specs import it directly).
 */
export function resetSessionOnceFlags() {
  sessionOnceFlags.clear();
}

/**
 * Base scene for real station rooms (Dock, Hub, Archive, ...). Ports the
 * prototype's proximity-station / SPACE-prompt / 1-2-3 option mechanics
 * from Main.tsx so every room shares identical interaction affordances
 * (research constraint: interaction salience must not vary between rooms
 * or participants). The prototype scene keeps its own copy untouched until
 * all rooms are ported.
 */
export abstract class RoomScene extends Phaser.Scene {
  /** Canonical room_id (event-schema.md §2) or documented control area id. */
  protected abstract readonly roomId: string;
  /** Interaction registry key used for scene-level events in this room. */
  protected abstract readonly roomInteractionKey: InteractionKey;

  protected player!: Player;
  protected roomMap!: BuiltRoomMap;

  private activePrompt: ActivePrompt | null = null;
  private activeTarget: ProximityTarget | null = null;
  private doors: RoomDoorConfig[] = [];
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private proximityPrompt!: Phaser.GameObjects.Text;
  private stationLabels!: Phaser.GameObjects.Container;
  private stations: RoomStationConfig[] = [];
  private transitioning = false;

  /** Room layout grid; see StationMapBuilder for the character legend. */
  protected abstract getLayout(): RoomLayout;
  /** Player spawn in pixels, possibly depending on the entry door. */
  protected abstract getSpawn(data?: { spawn?: string }): {
    x: number;
    y: number;
  };
  /** Room content: stations, doors, dressing. Called after map+player. */
  protected abstract populateRoom(): void;
  /** Prompt options per station, mirroring the prototype's switch. */
  protected abstract getPromptOptions(
    interactionKey: InteractionKey,
  ): PromptOption[];

  /**
   * Scene-entry logging hook. Default logs nothing beyond scene_start;
   * rooms with a canonical entry event (e.g. archive_room_entered) override
   * this. Runs on every entry — once-per-session semantics belong to
   * runOncePerSession inside the override.
   */
  protected onRoomEntered(): void {}

  create(data?: { spawn?: string }) {
    this.activePrompt = null;
    this.activeTarget = null;
    this.doors = [];
    this.stations = [];
    this.transitioning = false;
    this.feedbackMessage = null;

    researchRuntime.logSceneStart(this.scene.key);
    researchRuntime.sessionState.setCurrentRoom(this.roomId);

    this.roomMap = buildPlaceholderRoomMap(this, this.getLayout());
    this.physics.world.setBounds(
      0,
      0,
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );

    const spawn = this.getSpawn(data);

    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, this.roomMap.layer);

    this.cameras.main.setBounds(
      0,
      0,
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.stationLabels = this.add.container(0, 0);
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

    // Same pause affordance as the prototype scene; Menu resumes this room
    // via the resumeKey launch data.
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.menu, { resumeKey: this.scene.key });
    });

    this.populateRoom();
    this.onRoomEntered();
  }

  /** Adds a proximity interaction station (prototype marker mechanics). */
  protected addStation(config: RoomStationConfig) {
    const marker = this.add
      .rectangle(config.x, config.y, 40, 40, 0x1f7a8c, 0.8)
      .setStrokeStyle(2, 0x5fd3c4);
    const label = this.add
      .text(config.x, config.y - 42, config.label, {
        backgroundColor: '#000',
        color: '#fff',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);

    this.stationLabels.add([marker, label]);
    this.stations.push(config);
  }

  /** Adds a door (open transition or sealed bulkhead). */
  protected addDoor(config: RoomDoorConfig) {
    const isSealed = config.target === undefined;
    const marker = this.add
      .rectangle(
        config.x,
        config.y,
        40,
        40,
        isSealed ? 0x46586b : 0x3f5a66,
        0.9,
      )
      .setStrokeStyle(2, isSealed ? 0x2b3a4a : 0x5fd3c4);
    const label = this.add
      .text(config.x, config.y - 42, config.label, {
        backgroundColor: '#000',
        color: '#fff',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);

    this.stationLabels.add([marker, label]);
    this.doors.push(config);
  }

  /**
   * Logs a room event through ResearchRuntime with the same payload shape
   * as the prototype's logMpsEvent: researchInteractions context +
   * canonical study_item_ids/construct_id/success from
   * CANONICAL_EVENT_CONTEXT. Extra context (live metadata) merges last.
   */
  protected logRoomEvent(
    interactionKey: InteractionKey,
    eventType: string,
    extraContext?: Partial<CanonicalEventContext>,
  ) {
    const interaction: ResearchInteraction =
      researchInteractions[interactionKey];

    researchRuntime.logInteraction({
      scene: this.scene.key,
      episode: interaction.episode,
      event_type: eventType,
      object_id: interaction.object_id,
      x: this.player.x,
      y: this.player.y,
      room_id: interaction.room_id,
      task_id: interaction.task_id,
      ...CANONICAL_EVENT_CONTEXT[eventType],
      ...extraContext,
    });
  }

  protected showFeedbackMessage(message: string) {
    this.feedbackMessage?.destroy();

    const { centerX } = this.cameras.main;

    this.feedbackMessage = this.add
      .text(centerX, 72, message, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '15px monospace',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    this.time.delayedCall(1600, () => {
      this.feedbackMessage?.destroy();
      this.feedbackMessage = null;
    });
  }

  private openStationPrompt(station: RoomStationConfig) {
    if (station.onPromptOpened !== undefined && !station.onPromptOpened()) {
      return;
    }

    const options = this.getPromptOptions(station.interactionKey);
    const interaction = researchInteractions[station.interactionKey];
    const { centerX } = this.cameras.main;
    const promptBody = station.promptBody ? `\n\n${station.promptBody}` : '';
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
      interactionKey: station.interactionKey,
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

  private selectPromptOptionOne = () => this.selectPromptOption(0);

  private selectPromptOptionTwo = () => this.selectPromptOption(1);

  private selectPromptOptionThree = () => this.selectPromptOption(2);

  private selectPromptOption(index: number) {
    if (this.activePrompt === null) {
      return;
    }

    const { interactionKey, options } = this.activePrompt;
    const option = options[index];

    if (option === undefined) {
      return;
    }

    for (const eventType of option.getEventTypes()) {
      this.logRoomEvent(interactionKey, eventType);
    }

    option.onSelected?.();
    this.closePrompt();
    this.showFeedbackMessage(option.feedback);
  }

  private closePrompt() {
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

  private activateDoor(door: RoomDoorConfig) {
    if (door.eventType !== undefined) {
      this.logRoomEvent(door.interactionKey, door.eventType);
    }

    if (door.target === undefined) {
      this.showFeedbackMessage(
        door.sealedMessage ??
          'This section is sealed — pressurisation pending.',
      );
      return;
    }

    this.transitioning = true;
    transitionToRoom(this, door.target);
  }

  private updateProximity() {
    if (
      this.activePrompt !== null ||
      state.isTypewriting ||
      this.transitioning
    ) {
      this.activeTarget = null;
      this.proximityPrompt.setVisible(false);
      return;
    }

    const interactionRange = 72;
    let nearest: ProximityTarget | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const station of this.stations) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        station.x,
        station.y,
      );

      if (distance < interactionRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { x: station.x, y: station.y, kind: 'station', station };
      }
    }

    for (const door of this.doors) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        door.x,
        door.y,
      );

      if (distance < interactionRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { x: door.x, y: door.y, kind: 'door', door };
      }
    }

    this.activeTarget = nearest;

    if (this.activeTarget === null) {
      this.proximityPrompt.setVisible(false);
      return;
    }

    this.proximityPrompt
      .setPosition(this.activeTarget.x, this.activeTarget.y - 72)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.player.cursors.space)) {
      if (this.activeTarget.kind === 'station') {
        this.openStationPrompt(this.activeTarget.station!);
      } else {
        this.activateDoor(this.activeTarget.door!);
      }
    }
  }

  update() {
    this.player.update();
    this.onRoomUpdate();
    this.updateProximity();
  }

  /** Per-frame hook for room-specific instrumentation (e.g. Dock baselines). */
  protected onRoomUpdate(): void {}
}
