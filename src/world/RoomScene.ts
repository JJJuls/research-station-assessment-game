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

interface PromptCard {
  background: Phaser.GameObjects.Rectangle;
  marker: Phaser.GameObjects.Text;
}

interface ActivePrompt {
  interactionKey: InteractionKey;
  options: PromptOption[];
  panel: Phaser.GameObjects.Container;
  cards: PromptCard[];
  focusedIndex: number;
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
 * FABLE-NEXT-06: the participant instruction no longer references number
 * keys — cards are the primary interaction (pointer, or arrow keys +
 * Enter). Keys 1-9 keep working as HIDDEN deterministic shortcuts
 * (docs/game/UI-PRESENTATION-CONTRACT.md §3); both input paths converge
 * on selectPromptOption, so duplicate emission is impossible.
 */
const PROMPT_INSTRUCTION =
  'Select an option — point and click, or use the arrow keys and Enter.';

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
    /**
     * FABLE-NEXT-06 semantic test hook: screen rects of the visible
     * choice cards of the open prompt (participant label text only —
     * never researcher language). DEV-only, read-only, cleared on close.
     */
    __promptCards?:
      | {
          index: number;
          label: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }[]
      | null;
    /**
     * FABLE-NEXT-06 status side panel probe: the current room's rendered
     * read-only status panel text (participant labels only). DEV-only.
     */
    __roomStatusText?: string | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__lastRoomFeedbackText = null;
  window.__playerProbe = null;
  window.__routeObjectiveText = null;
  window.__lastPromptBody = null;
  window.__promptCards = null;
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

  /**
   * NEXT-07 Phase 5 guidance pulse. Marker visuals keyed by their
   * station/door config so the proximity scan's nearest target can be
   * mapped back to its rendered marker; exactly one marker pulses at a
   * time (the currently nearest eligible in-range interactable), with
   * the Dock movement-target's committed tween values so guidance
   * strength is uniform everywhere. Pure presentation: pulsing never
   * logs, never gates input, never changes task state.
   */
  private interactableMarkers = new Map<
    RoomStationConfig | RoomDoorConfig,
    Phaser.GameObjects.GameObject
  >();
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private pulseMarker: Phaser.GameObjects.GameObject | null = null;

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
    this.interactableMarkers = new Map();
    this.pulseTween = null;
    this.pulseMarker = null;

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

    this.stationLabels.add([
      marker,
      ...this.buildLabelChip(config.x, config.y - 42, config.label),
    ]);
    this.interactableMarkers.set(config, marker);
    this.stations.push(config);
  }

  /**
   * NEXT-07 Phase 5: station/door label chip in the shared panel
   * language (panel fill @ 0.92 + 1 px border) instead of the raw black
   * text background. Label text content is byte-identical to the config
   * string; the chip is pure presentation behind it.
   */
  private buildLabelChip(
    x: number,
    y: number,
    text: string,
  ): Phaser.GameObjects.GameObject[] {
    const label = this.add
      .text(x, y, text, {
        color: '#fff',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    const chip = this.add
      .rectangle(
        x,
        y,
        Math.ceil(label.width),
        Math.ceil(label.height),
        0x101820,
        0.92,
      )
      .setStrokeStyle(1, 0x33475a);

    // Chip behind, text in front (container render order is add order).
    return [chip, label];
  }

  /**
   * NEXT-07 Phase 5: retargets the guidance pulse. Exactly one marker —
   * the currently nearest eligible in-range interactable — pulses with
   * the Dock movement-target's committed tween values (700 ms, alpha
   * 1→0.4, yoyo); passing null stops the pulse and restores full
   * alpha (the settled state is simply the absence of the pulse —
   * D-N07-2: no completed-state copy exists).
   */
  private setPulseMarker(marker: Phaser.GameObjects.GameObject | null) {
    if (marker === this.pulseMarker) {
      return;
    }

    if (this.pulseTween !== null) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }

    (this.pulseMarker as { setAlpha?: (a: number) => void } | null)?.setAlpha?.(
      1,
    );
    this.pulseMarker = marker;

    if (marker !== null) {
      this.pulseTween = this.tweens.add({
        targets: marker,
        alpha: { from: 1, to: 0.4 },
        duration: 700,
        repeat: -1,
        yoyo: true,
      });
    }
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
    this.stationLabels.add([
      marker,
      ...this.buildLabelChip(config.x, config.y - 42, config.label),
    ]);
    this.interactableMarkers.set(config, marker);
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
        lineSpacing: 4,
        padding: { x: 10, y: 6 },
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    // NEXT-07 Phase 6: 2200 ms display window (was 1600). Display-only
    // timer — it blocks no input and delays no event.
    this.time.delayedCall(2200, () => {
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
   * Renders one prompt stage as the FABLE-NEXT-06 card panel. Research
   * constraint (unchanged in substance): presentation is uniform across
   * rooms and participants — interaction salience must never vary — and
   * options render in their declared order, never randomised or
   * reordered. (The pre-NEXT-06 byte-identity constraint with the V1
   * numbered-list renderer is consciously superseded by the
   * UI-PRESENTATION-CONTRACT.)
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
    const panelText = `${interaction.label}${promptBody}\n\n${optionText}\n\n${PROMPT_INSTRUCTION}`;

    // Dev-only, read-only displayed-prompt probe (__lastRoomFeedbackText
    // precedent): lets runtime verification assert rendered prompt content
    // (e.g. the Final Core route gate's remaining-decision list). Never
    // read back into gameplay; stripped from production builds.
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__lastPromptBody = panelText;
    }

    // FABLE-NEXT-06 card panel (UI-PRESENTATION-CONTRACT.md par.2): header
    // text (title + in-fiction body, strings unchanged), one selectable
    // card per option (pointer hover/click; arrow keys + Enter; hidden
    // numeric shortcuts), visible non-colour-only focus state (thicker
    // cyan border + marker glyph), instruction line without number keys.
    const PANEL_WIDTH = 560;
    const PADDING = 18;
    const CARD_WIDTH = PANEL_WIDTH - PADDING * 2;
    const CARD_GUTTER = 22;
    const CARD_PAD_Y = 7;
    const CARD_GAP = 8;

    const children: Phaser.GameObjects.GameObject[] = [];
    const header = this.add.text(
      PADDING,
      PADDING,
      `${interaction.label}${promptBody}`,
      {
        color: '#ffffff',
        font: '16px monospace',
        lineSpacing: 4,
        wordWrap: { width: CARD_WIDTH - 12 },
      },
    );

    let cursorY = PADDING + Math.ceil(header.height) + 12;
    const cards: PromptCard[] = [];
    const cardRects: {
      index: number;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];

    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      const label = this.add.text(
        PADDING + CARD_GUTTER,
        cursorY + CARD_PAD_Y,
        `${index + 1}. ${option.label}`,
        {
          color: '#ffffff',
          font: '15px monospace',
          lineSpacing: 4,
          wordWrap: { width: CARD_WIDTH - CARD_GUTTER - 12 },
        },
      );
      const cardHeight = Math.ceil(label.height) + CARD_PAD_Y * 2;
      const background = this.add
        .rectangle(PADDING, cursorY, CARD_WIDTH, cardHeight, 0x1a2733, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x33475a);
      const marker = this.add
        .text(PADDING + 6, cursorY + CARD_PAD_Y, '\u25b8', {
          color: '#5fd3c4',
          font: '15px monospace',
        })
        .setVisible(false);

      background.setInteractive({ useHandCursor: true });
      background.on('pointerover', () => this.focusPromptCard(index));
      background.on('pointerdown', () => this.selectPromptOption(index));

      children.push(background, label, marker);
      cards.push({ background, marker });
      cardRects.push({
        index,
        label: option.label,
        x: centerX - PANEL_WIDTH / 2 + PADDING,
        y: 72 + cursorY,
        width: CARD_WIDTH,
        height: cardHeight,
      });
      cursorY += cardHeight + CARD_GAP;
    }

    const instruction = this.add.text(
      PADDING,
      cursorY + 12,
      PROMPT_INSTRUCTION,
      {
        color: '#9fb2c1',
        font: '14px monospace',
        lineSpacing: 4,
        wordWrap: { width: CARD_WIDTH },
      },
    );
    const panelHeight = cursorY + 12 + Math.ceil(instruction.height) + PADDING;
    const backdrop = this.add
      .rectangle(0, 0, PANEL_WIDTH, Math.max(230, panelHeight), 0x101820, 0.96)
      .setOrigin(0);
    const panel = this.add.container(centerX - PANEL_WIDTH / 2, 72, [
      backdrop,
      header,
      ...children,
      instruction,
    ]);

    panel.setDepth(Depth.AboveWorld);
    panel.setScrollFactor(0);
    this.stationLabels.setVisible(false);
    this.proximityPrompt.setVisible(false);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__promptCards = cardRects;
    }

    this.activePrompt = {
      interactionKey,
      options,
      panel,
      cards,
      focusedIndex: -1,
    };
    this.focusPromptCard(0);

    for (let index = 0; index < options.length; index++) {
      this.input.keyboard!.on(
        `keydown-${PROMPT_KEY_NAMES[index]}`,
        this.promptKeyHandlers[index],
        this,
      );
    }
    this.input.keyboard!.on('keydown-UP', this.promptFocusUpHandler, this);
    this.input.keyboard!.on('keydown-DOWN', this.promptFocusDownHandler, this);
    this.input.keyboard!.on('keydown-ENTER', this.promptConfirmHandler, this);
  }

  /**
   * Card focus (FABLE-NEXT-06): visible, non-colour-only state — the
   * focused card gets a thicker cyan border AND a marker glyph. Pure
   * presentation: focusing never logs and never changes task state.
   */
  private focusPromptCard(index: number) {
    if (this.activePrompt === null) {
      return;
    }

    const { cards } = this.activePrompt;

    if (cards.length === 0 || index < 0 || index >= cards.length) {
      return;
    }

    this.activePrompt.focusedIndex = index;

    for (let i = 0; i < cards.length; i++) {
      const focused = i === index;

      cards[i].background.setStrokeStyle(
        focused ? 2 : 1,
        focused ? 0x5fd3c4 : 0x33475a,
      );
      cards[i].background.setFillStyle(focused ? 0x22303e : 0x1a2733, 1);
      cards[i].marker.setVisible(focused);
    }
  }

  private readonly promptFocusUpHandler = (event: KeyboardEvent) => {
    if (event.repeat || this.activePrompt === null) {
      return;
    }

    const count = this.activePrompt.options.length;

    this.focusPromptCard((this.activePrompt.focusedIndex - 1 + count) % count);
  };

  private readonly promptFocusDownHandler = (event: KeyboardEvent) => {
    if (event.repeat || this.activePrompt === null) {
      return;
    }

    const count = this.activePrompt.options.length;

    this.focusPromptCard((this.activePrompt.focusedIndex + 1) % count);
  };

  private readonly promptConfirmHandler = (event: KeyboardEvent) => {
    if (event.repeat || this.activePrompt === null) {
      return;
    }

    this.selectPromptOption(this.activePrompt.focusedIndex);
  };

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
      this.input.keyboard!.off('keydown-UP', this.promptFocusUpHandler, this);
      this.input.keyboard!.off(
        'keydown-DOWN',
        this.promptFocusDownHandler,
        this,
      );
      this.input.keyboard!.off(
        'keydown-ENTER',
        this.promptConfirmHandler,
        this,
      );
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__promptCards = null;
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
   * FABLE-NEXT-06 shared status side panel
   * (docs/game/UI-PRESENTATION-CONTRACT.md par.2): a persistent read-only
   * room-state panel in the viewport margin right of the 640px room map.
   * Change-detected setText; glyph-based cues only (non-colour-only rule);
   * never an input surface, never a score display, never a new event
   * source. DEV probe: window.__roomStatusText.
   */
  protected addStatusSidePanel(): { setText: (value: string) => void } {
    const background = this.add
      .rectangle(650, 8, 146, 584, 0x101820, 0.92)
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    background.setStrokeStyle(1, 0x33475a);

    // NEXT-07 Phase 6: rule line separating the panel's one-line header
    // from its body (pure presentation; the text value is unchanged).
    this.add
      .rectangle(658, 34, 130, 1, 0x33475a)
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    const text = this.add
      .text(658, 16, '', {
        color: '#ffffff',
        font: '12px monospace',
        lineSpacing: 3,
        wordWrap: { width: 132 },
      })
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    let current = '';

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__roomStatusText = '';
    }

    return {
      setText: (value: string) => {
        if (value === current) {
          return;
        }

        current = value;
        text.setText(value);

        if (typeof window !== 'undefined' && import.meta.env.DEV) {
          window.__roomStatusText = value;
        }
      },
    };
  }

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
      // No interaction is eligible (prompt open / typewriter /
      // transition) — the guidance pulse ceases naturally (Phase 5).
      this.setPulseMarker(null);
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

    // Phase 5 guidance pulse: exactly the nearest eligible in-range
    // marker pulses; out of range, the pulse ceases (null clears it).
    this.setPulseMarker(
      nearest === null
        ? null
        : (this.interactableMarkers.get(
            nearest.kind === 'station' ? nearest.station! : nearest.door!,
          ) ?? null),
    );

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
    // FABLE-NEXT-06: the avatar holds still while a prompt is open — the
    // arrow keys belong to card focus there (presentation-only; selection
    // remains the only way a prompt closes, so no task state is affected).
    if (this.activePrompt === null) {
      this.player.update();
    } else {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    }

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
