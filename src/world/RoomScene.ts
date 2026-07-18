import Phaser from 'phaser';

import { Depth, key } from '../constants';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import { getRemainingPilotDecisions, PILOT_DECISION_TOTAL } from '../scenarios';
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
  /**
   * Transient message shown after selection. Suppressed when `nextStage`
   * opens a follow-up stage (the stage panel replaces it) — chained
   * intermediate options should use an empty string.
   */
  feedback: string;
  getEventTypes: () => string[];
  onSelected?: () => void;
  /**
   * Optional follow-up prompt stage (U3): evaluated after this option's
   * events are logged and `onSelected` has run. Returning a stage opens it
   * immediately (same interaction context, same deterministic renderer);
   * returning null ends the prompt normally. Enables contract-required
   * multi-step flows (e.g. report choice → duty offer) without ever
   * randomising or reordering options.
   */
  nextStage?: () => PromptStage | null;
}

/** One prompt panel: fixed, deterministically ordered options (max 9). */
export interface PromptStage {
  /** Extra body text below the interaction label (in-fiction). */
  body?: string;
  options: PromptOption[];
}

interface ActivePrompt {
  interactionKey: InteractionKey;
  options: PromptOption[];
  panel: Phaser.GameObjects.Container;
}

/**
 * Phaser keydown event suffixes for the numeric option keys, in option
 * order. Prompt option count is capped at this list's length.
 */
const PROMPT_KEY_NAMES = [
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
] as const;

/**
 * Instruction line for an N-option prompt. Must stay byte-identical to the
 * V1 slice for 3 options: "Press 1, 2, or 3 to choose."
 */
function buildPromptInstruction(optionCount: number): string {
  const numbers = Array.from({ length: optionCount }, (_, i) => `${i + 1}`);

  if (numbers.length === 1) {
    return `Press 1 to choose.`;
  }

  if (numbers.length === 2) {
    return `Press 1 or 2 to choose.`;
  }

  const head = numbers.slice(0, -1).join(', ');

  return `Press ${head}, or ${numbers[numbers.length - 1]} to choose.`;
}

export interface RoomStationConfig {
  interactionKey: InteractionKey;
  label: string;
  x: number;
  y: number;
  /**
   * Committed prop texture key (Phase F). When the texture is loaded the
   * station renders as this sprite instead of the placeholder rectangle;
   * the interaction position/radius is unchanged either way (art swaps
   * never alter interaction regions — plan §10 check 6).
   */
  texture?: string;
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
  /** Committed prop texture key (see RoomStationConfig.texture). */
  texture?: string;
  target?: RoomTransitionTarget;
  /**
   * Sealed doors (unbuilt rooms) show this fiction-consistent message
   * instead of transitioning. Sealed-door interactions are
   * control/usability data only.
   */
  sealedMessage?: string;
  /** Event type logged on activation (documented in event-schema.md). */
  eventType?: string;
  /** Metadata attached to the door event (e.g. { door: target room_id }). */
  eventMetadata?: Record<string, unknown>;
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
 * Dev-only, read-only runtime-verification hooks (getMissionState()
 * precedent): expose the most recently rendered feedback/status-board
 * message text, and the active scene's live player position, so Playwright
 * specs can verify DISPLAYED content and drive real keyboard navigation that
 * synchronises on observed position instead of frame-rate-sensitive elapsed
 * time. Presentation/telemetry only — deliberately separate from
 * window.researchRuntime (not research data, not an event, not scoring),
 * strictly read-only (nothing reads these back into gameplay), and gated the
 * same way ResearchRuntime gates its own debug installer, so both are
 * dead-code-eliminated from production builds (import.meta.env.DEV === false).
 */
declare global {
  interface Window {
    __lastRoomFeedbackText?: string | null;
    __playerProbe?: { scene: string; x: number; y: number } | null;
    __routeObjectiveText?: string | null;
    __lastPromptBody?: string | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__lastRoomFeedbackText = null;
  window.__playerProbe = null;
  window.__routeObjectiveText = null;
  window.__lastPromptBody = null;
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
  private routeObjective!: Phaser.GameObjects.Text;
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

    // Route-objective HUD line (pilot route repair): the persistent duty
    // roster directive that makes the mandatory four-decision route legible
    // in-game. Allowed progress UI only — checklist/status labels (V3 §2):
    // a completion count and the next station, never scores, never
    // personality feedback, identical presentation for every participant.
    this.routeObjective = this.add
      .text(8, 8, '', {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '13px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    // Same pause affordance as the prototype scene; Menu resumes this room
    // via the resumeKey launch data.
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.menu, { resumeKey: this.scene.key });
    });

    this.populateRoom();
    this.onRoomEntered();
    this.refreshRouteObjective();
  }

  /**
   * The duty-roster directive for the current progress state. Reads the
   * EXPLICIT scenario completion state (pilotRoute.ts) plus two mission
   * facts (dock check-in, Final Core completion) — never event counts.
   */
  private buildRouteObjectiveText(): string {
    const mission = researchRuntime.sessionState.getMissionState();

    if (!mission.completed_rooms.includes('dock_arrival')) {
      return 'Duty roster: check in at the Arrival Terminal (Dock).';
    }

    const remaining = getRemainingPilotDecisions();
    const done = PILOT_DECISION_TOTAL - remaining.length;

    if (remaining.length > 0) {
      const next = remaining[0];

      return (
        `Duty roster: station decisions ${done}/${PILOT_DECISION_TOTAL} — ` +
        `next: ${next.stationLabel} (${next.roomLabel}).`
      );
    }

    if (!mission.completed_rooms.includes('final_core_room')) {
      return (
        `Duty roster: station decisions ` +
        `${PILOT_DECISION_TOTAL}/${PILOT_DECISION_TOTAL} — synchronize at ` +
        `the Final Core.`
      );
    }

    return 'Duty roster: mission cycle complete.';
  }

  /**
   * Recomputes the HUD line. Called on scene entry and after every prompt
   * selection — the only two moments its inputs can change (dock check-in,
   * scenario completion and Final Core completion all happen through
   * prompt options).
   */
  private refreshRouteObjective() {
    const text = this.buildRouteObjectiveText();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__routeObjectiveText = text;
    }

    this.routeObjective.setText(text);
  }

  /** Adds a proximity interaction station (prototype marker mechanics). */
  protected addStation(config: RoomStationConfig) {
    const marker = this.buildInteractableVisual(
      config.x,
      config.y,
      config.texture,
      0x1f7a8c,
      0x5fd3c4,
    );
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

  /**
   * Purely decorative set dressing: renders only when its committed
   * texture is loaded; never collides, never interacts, never obstructs
   * (placement is the room's responsibility per plan §10 decorative rule).
   */
  protected addDecor(x: number, y: number, texture: string) {
    if (this.textures.exists(texture)) {
      this.add.image(x, y, texture);
    }
  }

  /**
   * Prop sprite when its committed texture is loaded, placeholder
   * rectangle otherwise. Every interactable keeps the same cyan accent
   * cue (uniform affordance across objects and participants).
   */
  private buildInteractableVisual(
    x: number,
    y: number,
    texture: string | undefined,
    fillColor: number,
    strokeColor: number,
  ): Phaser.GameObjects.GameObject {
    if (texture !== undefined && this.textures.exists(texture)) {
      return this.add.image(x, y, texture);
    }

    return this.add
      .rectangle(x, y, 40, 40, fillColor, 0.8)
      .setStrokeStyle(2, strokeColor);
  }

  /** Adds a door (open transition or sealed bulkhead). */
  protected addDoor(config: RoomDoorConfig) {
    const isSealed = config.target === undefined;
    const marker = this.buildInteractableVisual(
      config.x,
      config.y,
      config.texture,
      isSealed ? 0x46586b : 0x3f5a66,
      isSealed ? 0x2b3a4a : 0x5fd3c4,
    );
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

  /**
   * Logs a pilot-scenario telemetry event (src/scenarios framework):
   * interaction context plus a first-class choice_value and free-form
   * metadata. Deliberately additive beside logRoomEvent — scenario events
   * are unmapped pilot telemetry (no CANONICAL_EVENT_CONTEXT entry exists
   * for them by governance), so this path never spreads canonical context.
   */
  protected logScenarioEvent(
    interactionKey: InteractionKey,
    eventType: string,
    context?: {
      choice_value?: string | number | null;
      metadata?: Record<string, unknown>;
    },
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
      choice_value: context?.choice_value,
      metadata: context?.metadata,
    });
  }

  protected showFeedbackMessage(message: string) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__lastRoomFeedbackText = message;
    }

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

    this.renderPromptStage(station.interactionKey, {
      body: station.promptBody,
      options: this.getPromptOptions(station.interactionKey),
    });
  }

  /**
   * Renders one prompt stage: numbered options in declared order, numeric
   * keys 1..N (N ≤ 9), fixed panel geometry. For ≤3 options the panel and
   * text are byte-identical to the V1-slice renderer (research constraint:
   * prompt presentation must not vary between rooms or participants —
   * option order is the author's declared order, never randomised).
   */
  private renderPromptStage(
    interactionKey: InteractionKey,
    stage: PromptStage,
  ) {
    const { options } = stage;

    if (options.length === 0 || options.length > PROMPT_KEY_NAMES.length) {
      throw new Error(
        `Prompt stage for "${interactionKey}" has ${options.length} options; expected 1-${PROMPT_KEY_NAMES.length}`,
      );
    }

    const interaction = researchInteractions[interactionKey];
    const { centerX } = this.cameras.main;
    const promptBody = stage.body ? `\n\n${stage.body}` : '';
    const optionText = options
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join('\n');
    const panelText = `${interaction.label}${promptBody}\n\n${optionText}\n\n${buildPromptInstruction(options.length)}`;

    // Dev-only, read-only displayed-prompt probe (__lastRoomFeedbackText
    // precedent): lets runtime verification assert rendered prompt content
    // (e.g. the Final Core route gate's remaining-decision list). Never
    // read back into gameplay; stripped from production builds.
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__lastPromptBody = panelText;
    }
    // 230px matches the V1 slice for up to 3 options; each further option
    // extends the panel by one 24px text row (deterministic, content-only).
    const panelHeight = 230 + Math.max(0, options.length - 3) * 24;
    const text = this.add.text(18, 16, panelText, {
      color: '#ffffff',
      font: '16px monospace',
      wordWrap: { width: 524 },
    });
    // The background must never be shorter than the wrapped text (long
    // stage bodies / wrapped option labels overflowed the fixed-height
    // rectangle — gameplay-review finding, FABLE-NEXT-04). Purely visual:
    // grows with rendered content, never shrinks below the V1 baseline.
    const background = this.add
      .rectangle(
        0,
        0,
        560,
        Math.max(panelHeight, Math.ceil(text.height) + 32),
        0x101820,
        0.96,
      )
      .setOrigin(0);
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

    for (let index = 0; index < options.length; index++) {
      this.input.keyboard!.on(
        `keydown-${PROMPT_KEY_NAMES[index]}`,
        this.promptKeyHandlers[index],
        this,
      );
    }
  }

  /**
   * One stable handler per numeric key so on/off pairs match exactly
   * (allocated once per scene instance; index = option position).
   *
   * OS key autorepeat is ignored (KeyboardEvent.repeat): a held numeric key
   * must select exactly once, never cascade through chained prompt stages
   * (U3 nextStage flows — duty offers, scenario briefings/evidence). Only
   * the initial physical keypress selects; discrete presses are unaffected.
   */
  private readonly promptKeyHandlers: ((event: KeyboardEvent) => void)[] =
    PROMPT_KEY_NAMES.map((_, index) => (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      this.selectPromptOption(index);
    });

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

    const nextStage = option.nextStage?.() ?? null;

    this.closePrompt();

    // Every progress state the duty-roster HUD reflects changes through a
    // prompt selection, so this is the one refresh point besides create().
    this.refreshRouteObjective();

    if (nextStage !== null) {
      this.renderPromptStage(interactionKey, nextStage);
      return;
    }

    this.showFeedbackMessage(option.feedback);
  }

  private closePrompt() {
    if (this.activePrompt !== null) {
      for (let index = 0; index < this.activePrompt.options.length; index++) {
        this.input.keyboard!.off(
          `keydown-${PROMPT_KEY_NAMES[index]}`,
          this.promptKeyHandlers[index],
          this,
        );
      }
    }

    this.activePrompt?.panel.destroy();
    this.activePrompt = null;
    this.stationLabels.setVisible(true);
  }

  private activateDoor(door: RoomDoorConfig) {
    if (door.eventType !== undefined) {
      this.logRoomEvent(
        door.interactionKey,
        door.eventType,
        door.eventMetadata !== undefined
          ? { metadata: door.eventMetadata }
          : undefined,
      );
    }

    if (door.target === undefined) {
      this.showFeedbackMessage(
        door.sealedMessage ??
          'This section is sealed — pressurisation pending.',
      );
      return;
    }

    // Exit hook fires before the transition so rooms can log
    // leave-in-progress states (e.g. archive_abandoned) with the player
    // still positioned in the room.
    this.onRoomExit();
    this.transitioning = true;
    transitionToRoom(this, door.target);
  }

  /** Called once when an open door is activated, before the transition. */
  protected onRoomExit(): void {}

  /**
   * Prototype parity (Main.tsx logObjectiveIfComplete): the legacy
   * objective_completed event fires exactly once per session, at the moment
   * BOTH the Archive and Systems Repair rooms are complete, and always with
   * the archive terminal's interaction context — matching the prototype's
   * payload byte-for-byte. Called from both rooms' completion paths so
   * either completion order emits it. The event is deliberately unmapped in
   * CANONICAL_EVENT_CONTEXT (V3 §5 vs MASTER_33_ALIGNMENT.md disagree on
   * its Q-listing — see the U4 header note).
   */
  protected logObjectiveCompletedIfBothDone() {
    const mission = researchRuntime.sessionState.getMissionState();

    if (
      !mission.completed_rooms.includes('archive_room') ||
      !mission.completed_rooms.includes('systems_repair_room')
    ) {
      return;
    }

    runOncePerSession('objective_completed', () => {
      this.logRoomEvent('archiveAccessTerminal', 'objective_completed');
    });
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

      // Out-of-range interaction attempt: no target reachable. Rooms that
      // track control errors (Dock baseline covariates) hook this.
      if (Phaser.Input.Keyboard.JustDown(this.player.cursors.space)) {
        this.onEmptyInteract();
      }

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

  /** SPACE pressed with no station/door in range. Default: no-op. */
  protected onEmptyInteract(): void {}

  update() {
    this.player.update();
    this.onRoomUpdate();
    this.updateProximity();

    // Dev-only, read-only position telemetry for runtime verification (see
    // the __playerProbe note above). Never read back into gameplay; stripped
    // from production builds. Placed last so it reflects this frame's final
    // player position after movement/physics have resolved.
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__playerProbe = {
        scene: this.scene.key,
        x: this.player.x,
        y: this.player.y,
      };
    }
  }

  /** Per-frame hook for room-specific instrumentation (e.g. Dock baselines). */
  protected onRoomUpdate(): void {}
}
