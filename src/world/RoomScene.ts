import Phaser from 'phaser';

import { Depth, DepthLayer, key, worldDepth } from '../constants';
import type { ResearchInteraction } from '../data/researchInteractions';
import { researchInteractions } from '../data/researchInteractions';
import type { ControlsReferenceOptions } from '../gameplay';
import {
  cancelActiveWorldAction,
  ControlsReference,
  getActiveObjectiveLine,
  InventoryHud,
  isWorldActionActive,
  NpcActor,
  onInventoryChange,
  onTaskChange,
  serializeInventory,
  sfxDoor,
  sfxPromptOpen,
  sfxUiMove,
  sfxUiSelect,
  sfxUnavailable,
  startAmbience,
  stopAmbience,
  toggleAudioMuted,
  unlockAudio,
} from '../gameplay';
import { wireInventoryOverlayKey } from '../inventory/ui/openOverlay';
import { noteRoomEntered, refreshValidityProbe } from '../measurement';
import { MissionCard } from '../pilot/ui/MissionCard';
import { getRemainingPilotDecisions, PILOT_DECISION_TOTAL } from '../scenarios';
import { Player } from '../sprites';
import { state } from '../state';
import { researchRuntime } from '../systems';
import type { CanonicalEventContext } from './CanonicalEventContext';
import { CANONICAL_EVENT_CONTEXT } from './CanonicalEventContext';
import type { ObjectClass } from './interactionRegistry';
import { promptText } from './interactionRegistry';
import { ensureKitTextures, KIT_INDICATOR } from './kit/kitTextures';
import { STATION_THEMES } from './proceduralTilesets';
import type { RoomTransitionTarget } from './SceneRouter';
import { transitionToRoom } from './SceneRouter';
import type { BuiltRoomMap, RoomLayout } from './StationMapBuilder';
import { buildPlaceholderRoomMap } from './StationMapBuilder';
import {
  attachWorldPlate,
  DESIGN_WIDTH,
  fadeAllCameras,
  publishCameraProbe,
  type WorldPlate,
  worldToDesign,
} from './viewport';

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
  /**
   * FABLE-NEXT-08 stage-surface model (contract §3.1): optional,
   * presentation-only enrichment consumed exclusively by renderPromptStage.
   * Absent → the panel renders byte-for-byte as before NEXT-08. Present →
   * a task surface may render between the header and the option cards,
   * option cards may carry inline icons, and the panel may widen to
   * 640 px. The declared option list, order, labels, instruction line,
   * header text, focus/selection behaviour and keyboard model are never
   * altered by a presentation.
   */
  presentation?: StagePresentation;
}

/**
 * A task-surface row/element wired as a REDUNDANT ACTIVATOR (NEXT-08
 * §3.2): activating it calls the same selectPromptOption(index) the
 * option card's click already calls — never a second selection path,
 * never its own logging. `activates` omitted = inert dressing (rendered
 * identically, no pointer handler — never a disabled-looking option).
 */
export interface SurfaceActivator {
  /** Texture key from the proc-icon or proc family (identity only, §3.3). */
  icon?: string;
  /** Existing participant string, verbatim (zero-new-copy rule, §3.4). */
  label: string;
  /** Option index this element redundantly activates. */
  activates?: number;
}

/** Step-tracker tile (Side Repair §6.3): glyph-differentiated state. */
export interface SurfaceStepTile {
  /** Existing side-panel step string, verbatim. */
  label: string;
  /** Mirrors state already shown in text; never colour-only (§7.3). */
  state: 'pending' | 'current' | 'done';
}

/**
 * Task-surface elements (§6): each renders between the panel header and
 * the option cards, in declared order, as a pure function of existing
 * visible state — fixed order, no randomness, identical every session.
 */
export type StageSurfaceElement =
  | { kind: 'tray'; entries: SurfaceActivator[] }
  | {
      kind: 'station';
      /** Existing station silhouette texture (e.g. proc-rack-tools). */
      texture: string;
      /** Existing station label, verbatim. */
      label: string;
      activates?: number;
      /** Carried-item entry rendered beside the silhouette (§6.1). */
      carried?: SurfaceActivator;
    }
  | {
      kind: 'steps';
      tiles: SurfaceStepTile[];
      /** Fetched-part icon shown on one tile (§6.3), or absent. */
      partIcon?: { icon: string; tileIndex: number };
    }
  | {
      kind: 'schematic';
      /**
       * Diagnostic readout lines — verbatim re-renders of text the room's
       * status side panel already shows (§6.2); never sequence/manual
       * state.
       */
      readout: string[];
    };

/** NEXT-08 §3.1 optional presentation layer for one prompt stage. */
export interface StagePresentation {
  /** Panel width override, clamped to 560-640 px (§3.1). */
  panelWidth?: number;
  /** Task-surface elements rendered between header and option cards. */
  surface?: StageSurfaceElement[];
  /** Inline icon texture per option index (icons never replace text). */
  optionIcons?: Readonly<Partial<Record<number, string>>>;
  /** Option indices rendered with the record-card treatment (§6.4). */
  recordCards?: readonly number[];
  /**
   * Renders this exact substring of `body` inside a visually distinct
   * inset (§6.4). Text is byte-identical; __lastPromptBody composition is
   * unchanged. If the substring is absent from `body`, the stage falls
   * back to the plain default header (deterministic authoring guard; no
   * shipping stage takes this path).
   */
  bodyInset?: { text: string; treatment: 'plain' | 'log' };
  /**
   * Icons drawn beside body lines whose text matches `line` exactly
   * (§6.1 checklist/review) — body content itself is unchanged.
   */
  bodyLineIcons?: readonly { line: string; icon: string }[];
}

interface PromptCard {
  background: Phaser.GameObjects.Rectangle;
  marker: Phaser.GameObjects.Text;
}

/** NEXT-08 __minigameSurface probe row (see the Window declaration). */
interface MinigameSurfaceProbeEntry {
  kind: 'tray' | 'station' | 'steps' | 'schematic';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  activates: number | null;
  state?: 'pending' | 'current' | 'done';
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
  /**
   * World V1 interaction grammar (INTERACTION-GRAMMAR.md §4): the verb of
   * the one-line contextual prompt `E — <verb> <label>`. Stations without
   * a verb (zones not yet rebuilt) read `E — Use <label>`.
   */
  verb?: string;
  /**
   * World V1 availability rule: null = usable now; a short state string =
   * class 3 (inactive / future) — the prompt reads the state and E shows
   * it as a message instead of opening anything. Navigation/stage
   * predicates only; never a measurement outcome.
   */
  availability?: () => string | null;
  /** Stable registry id (interactionRegistry.ts), for probes and tests. */
  registryId?: string;
  /** Indicator lamp on the object's art (default: 'lamp'; NPCs: 'none'). */
  indicator?: 'lamp' | 'none';
}

/**
 * NPC station (overnight prototype, Unit 1): a normal proximity station
 * whose visual is a visible character (NpcActor) instead of a marker
 * rectangle, with a name chip shown only in interaction proximity.
 * Interaction/prompt/logging mechanics are identical to addStation.
 */
export interface RoomNpcConfig extends RoomStationConfig {
  /** In-fiction display name shown on proximity. */
  npcName: string;
  /** Disable the idle bob (console-mounted figures). */
  still?: boolean;
  /** Two-frame work cycle (Unit 6; see NpcActorConfig.workFrames). */
  workFrames?: readonly [string, string];
}

export interface RoomDoorConfig {
  x: number;
  y: number;
  label: string;
  /** Committed prop texture key (see RoomStationConfig.texture). */
  texture?: string;
  /** Frame of a strip texture to show (Unit 7: airlock iris open frame). */
  textureFrame?: number;
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
  /**
   * Dynamic gate (pilot Unit 6): evaluated on every activation of an
   * otherwise-open door. Returning a string keeps the door sealed THIS
   * time and shows that neutral operational message instead of
   * transitioning (the door event still logs, with `sealed: true`);
   * returning null opens it. Presentation/navigation only — a gate never
   * reads task performance and never closes a measurement window.
   */
  gate?: () => string | null;
  /** World V1: prompt verb (default "Go to"). */
  verb?: string;
  /** Stable registry id (interactionRegistry.ts). */
  registryId?: string;
  /**
   * World V1 availability rule for a door that never transitions (a sealed
   * class-3 door): the state string is the prompt and the E message.
   */
  availability?: () => string | null;
}

/** World V1 indicator lamp attached to an interactable's art. */
interface Indicator {
  lamp: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
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
    /** DEV-only (Unit 7): world prompt visibility (+ World V1 text). */
    __worldPromptProbe?: {
      prompt: boolean;
      chips: number;
      text?: string | null;
    } | null;
    __routeObjectiveText?: string | null;
    __lastPromptBody?: string | null;
    /**
     * Unit 1 gameplay probes (DEV-only, read-only, __playerProbe
     * precedent): the rendered gameplay-task objective line and a
     * serialised inventory snapshot. Never read back into gameplay.
     */
    __questObjectiveText?: string | null;
    __inventoryProbe?: {
      slots: (string | null)[];
      selected_index: number | null;
    } | null;
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
    /**
     * FABLE-NEXT-08 task-surface probe (__promptCards precedent): screen
     * rects + participant labels of the open stage's task-surface
     * elements, with the option index an activator redundantly activates
     * (null = inert dressing). DEV-only, read-only, cleared on close.
     */
    __minigameSurface?:
      | {
          kind: 'tray' | 'station' | 'steps' | 'schematic';
          label: string;
          x: number;
          y: number;
          width: number;
          height: number;
          activates: number | null;
          state?: 'pending' | 'current' | 'done';
        }[]
      | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__lastRoomFeedbackText = null;
  window.__playerProbe = null;
  window.__routeObjectiveText = null;
  window.__lastPromptBody = null;
  window.__promptCards = null;
  window.__minigameSurface = null;
  window.__questObjectiveText = null;
  window.__inventoryProbe = null;
}

/**
 * Base scene for real station rooms (Dock, Hub, Archive, ...). Ports the
 * prototype's proximity-station / SPACE-prompt / 1-2-3 option mechanics
 * from Main.tsx so every room shares identical interaction affordances
 * (research constraint: interaction salience must not vary between rooms
 * or participants). The prototype scene keeps its own copy untouched until
 * all rooms are ported.
 */
/** Flat floor dressing: rendered under every figure (Unit 7 depth sort). */
const FLOOR_DECOR = new Set([
  'proc-light-pool',
  'proc-ground-disturbed',
  'proc-footprints',
  'proc-dig-mound',
  'kit-light-pool-warm',
  'kit-light-pool-cold',
  'kit-light-pool-cyan',
  'kit-contact-shadow',
  'kit-hazard-strip',
  'kit-floor-lane',
  'kit-lane-edge',
]);

export abstract class RoomScene extends Phaser.Scene {
  /** Canonical room_id (event-schema.md §2) or documented control area id. */
  protected abstract readonly roomId: string;
  /** Interaction registry key used for scene-level events in this room. */
  protected abstract readonly roomInteractionKey: InteractionKey;

  protected player!: Player;
  protected roomMap!: BuiltRoomMap;
  /** World V1: the world plate (camera + composite) of this room. */
  protected plate!: WorldPlate;
  /** E — keyboard alias of SPACE for contextual interaction (Unit 1). */
  private interactKeyE!: Phaser.Input.Keyboard.Key;

  private activePrompt: ActivePrompt | null = null;
  private activeTarget: ProximityTarget | null = null;
  private doors: RoomDoorConfig[] = [];
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private proximityPrompt!: Phaser.GameObjects.Text;
  private missionCard!: MissionCard;
  private questObjective!: Phaser.GameObjects.Text;
  private stations: RoomStationConfig[] = [];
  private transitioning = false;

  /** Unit 1: visible NPC actors keyed by their station config. */
  private npcActors = new Map<RoomStationConfig, NpcActor>();

  /**
   * World V1: marker visuals keyed by their station/door config (prompt
   * placement, texture swaps) and the indicator lamp attached to each
   * (INTERACTION-GRAMMAR.md §1). Exactly one object per room — the
   * current guidance target — additionally carries the light pool.
   */
  private interactableMarkers = new Map<
    RoomStationConfig | RoomDoorConfig,
    Phaser.GameObjects.GameObject
  >();
  private indicators = new Map<RoomStationConfig | RoomDoorConfig, Indicator>();
  private guidancePool: Phaser.GameObjects.Image | null = null;
  private guidancePoolFor: RoomStationConfig | RoomDoorConfig | null = null;
  /** A scripted arrival owns the camera while true (presentation only). */
  protected cameraHeld = false;
  /** A scripted arrival owns the avatar while true (no participant input). */
  protected inputLocked = false;

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
    this.indicators = new Map();
    this.guidancePool = null;
    this.guidancePoolFor = null;
    this.npcActors = new Map();
    this.cameraHeld = false;
    this.inputLocked = false;

    researchRuntime.logSceneStart(this.scene.key);
    researchRuntime.sessionState.setCurrentRoom(this.roomId);
    // Unit 3 (SA-13): room-entry feed for order/position bookkeeping and
    // later-visit eligibility. Recording only — never gates anything.
    noteRoomEntered(this.roomId);
    refreshValidityProbe();

    // World V1 kit textures (idempotent; presentation only).
    ensureKitTextures(this);

    const layout = this.getLayout();

    this.roomMap = buildPlaceholderRoomMap(this, layout);

    this.physics.world.setBounds(
      0,
      0,
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );

    const spawn = this.getSpawn(data);

    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, this.roomMap.layer);

    // World V1 (docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md): every world
    // object is drawn into the world plate, whose camera follows the
    // avatar inside the room bounds; every `scrollFactor(0)` object
    // renders through the HUD camera in the 800×600 design space. A room
    // smaller than the plate (legacy proving grounds) is centred over the
    // theme's void colour.
    this.plate = attachWorldPlate(this, layout.field ?? 'legacy');
    this.plate.setBounds(
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );
    this.plate.snapTo(spawn.x, spawn.y);

    if (layout.theme !== undefined) {
      this.plate.setClearColor(STATION_THEMES[layout.theme].voidColor);
    }

    fadeAllCameras(this, 'in', 200);

    // NEXT-07 Phase 7a vignette: REMOVED under the contract's own
    // admissibility clause. The full-screen alpha-blended quad collapsed
    // the software-GL (SwiftShader) frame budget in the Playwright
    // verification environment, making chained prompt-stage key presses
    // flaky — bisected to the Phase 7 commit and reproduced/cleared by
    // toggling the vignette alone. Uniformity is preserved by absence
    // (identical treatment in every room: none).

    // The contextual prompt lives in the HUD design space and is projected
    // from the target's world position every frame — readable at one size
    // in every room, never scaled with the world. World V1: one line,
    // `E — <verb> <label>` (INTERACTION-GRAMMAR.md §4).
    this.proximityPrompt = this.add
      .text(0, 0, '', {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '15px monospace',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    // World V1 mission card (PROFESSIONAL-WORLD-DESIGN-V1 §6; U2
    // src/pilot/ui/MissionCard.ts): a compact card in the canvas's
    // top-left safe area — the act title and ONE next action — replacing
    // the wide objective banner. Allowed progress UI only: the next
    // reachable action, never scores, never personality feedback,
    // identical presentation for every participant.
    this.missionCard = new MissionCard(this);

    // Unit 1 gameplay-task objective line (second HUD line, under the
    // mission card): the FIRST accepted gameplay task's live objective.
    // Allowed progress UI only — in-fiction checklist text, never scores.
    this.questObjective = this.add
      .text(this.missionCard.left, this.missionCard.bottom + 4, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '14px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    const unsubscribeTasks = onTaskChange(() => this.refreshQuestObjective());
    const unsubscribeInventory = onInventoryChange(() => {
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__inventoryProbe = serializeInventory();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribeTasks();
      unsubscribeInventory();
    });

    // Unit 1 visible inventory belt — identical in every room. World V1:
    // shown only where the room says it is relevant (hotbarVisible).
    new InventoryHud(this, () => this.hotbarVisible());

    // Action-assessment rebuild Unit 1: persistent compact controls
    // legend (H toggles). Pilot zones start it hidden with the pilot key
    // list (mission §8: no permanent wall of controls).
    new ControlsReference(this, this.controlsReferenceOptions());

    // Interactive inventory overlay (I) — the single inventory system,
    // available in every room; inert while a prompt/action/transition owns
    // input (same eligibility rule as the physical layer).
    wireInventoryOverlayKey(this, {
      isEligible: () => this.physicalInputEligible(),
      launchData: () => this.inventoryOverlayLaunchData(),
    });

    // E is the keyboard alias of SPACE for contextual interaction (the
    // C/D/F field-action language groups E beside the action keys).
    this.interactKeyE = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__inventoryProbe = serializeInventory();
    }

    // Unit 7 (V1): every overlay pauses this scene with the proximity
    // prompt, the nearest label chip and the NPC name chips still visible,
    // so their fragments survived at the panel edges. Hide them on PAUSE;
    // updateProximity restores whatever is still in range on RESUME.
    const onPause = () => this.hideWorldPrompts();
    // V4 (C7): any state that changed inside an overlay is reflected in the
    // objective lines the moment the room resumes — in every room.
    const onResume = () => {
      this.refreshRouteObjective();
      this.refreshQuestObjective();
    };

    this.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, onPause);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
    });

    // ESC first cancels a cancellable timed world action (never leaves
    // the avatar frozen mid-action); otherwise it pauses to the Menu,
    // which resumes this room via the resumeKey launch data.
    this.input.keyboard!.on('keydown-ESC', () => {
      if (cancelActiveWorldAction()) {
        this.showFeedbackMessage('Action cancelled.');
        return;
      }

      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.menu, { resumeKey: this.scene.key });
    });

    // ——— Unit E audio: procedural ambience + cue unlock. The ambient bed
    // is presentation only; identical per room theme for everyone. M
    // toggles mute (client display setting).
    unlockAudio();
    this.input.keyboard!.once('keydown', () => unlockAudio());
    this.input.once('pointerdown', () => unlockAudio());
    if (this.muteKeyEnabled()) {
      this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
        if (!event.repeat) {
          toggleAudioMuted();
        }
      });
    }
    startAmbience(layout.theme === 'exterior' ? 'exterior' : 'interior');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopAmbience());

    this.populateRoom();
    this.onRoomEntered();
    this.refreshRouteObjective();
    this.refreshQuestObjective();
  }

  /** Recomputes the gameplay-task objective HUD line (Unit 1). */
  private refreshQuestObjective() {
    const line = this.questLineEnabled() ? getActiveObjectiveLine() : null;

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__questObjectiveText = line;
    }

    if (line === null) {
      this.questObjective.setVisible(false);
    } else {
      this.questObjective.setText(line).setVisible(true);
    }
  }

  // ——— Pilot-route presentation hooks (professional pilot, Unit 2). Each
  // has the legacy behaviour as its default so every existing room renders
  // byte-identically; PilotZoneScene overrides them.

  /** Whether the second (gameplay-task) HUD line is shown. */
  protected questLineEnabled(): boolean {
    return true;
  }

  /** Whether M toggles mute in this room (pilot zones use M for the map). */
  protected muteKeyEnabled(): boolean {
    return true;
  }

  /** Controls legend options (visibility / key list). */
  protected controlsReferenceOptions(): ControlsReferenceOptions | undefined {
    return undefined;
  }

  /** Right clamp for the proximity prompt (640-px rooms keep the panel margin). */
  protected promptClampMaxX(): number {
    return 638;
  }

  /**
   * World V1: whether the inventory belt may be shown in this room
   * (INVENTORY-ITEM-PURPOSE-AUDIT.md §3). Legacy rooms: always (the belt
   * still hides while empty); pilot zones decide per zone.
   */
  protected hotbarVisible(): boolean {
    return true;
  }

  /** World V1 mission-card title (act / area). Legacy rooms: none. */
  protected buildMissionCardTitle(): string {
    return '';
  }

  /**
   * World V1: whether the interactable is the route's current guidance
   * target (class 1). Legacy rooms have no route guidance; pilot zones
   * answer from the beacon model.
   */
  protected isGuidanceTarget(
    config: RoomStationConfig | RoomDoorConfig,
  ): boolean {
    void config;

    return false;
  }

  /** Derived object class (INTERACTION-GRAMMAR.md §2). */
  protected classOf(config: RoomStationConfig | RoomDoorConfig): ObjectClass {
    const state = config.availability?.() ?? null;

    if (state !== null) {
      return 'inactive';
    }

    return this.isGuidanceTarget(config) ? 'active' : 'optional';
  }

  /** Launch data for the I inventory overlay (pilot zones allow world drops). */
  protected inventoryOverlayLaunchData(): {
    mode: 'backpack';
    allowWorldDrop?: boolean;
  } {
    return { mode: 'backpack' };
  }

  /** Whether a door transition is in progress (read-only). */
  protected isTransitioning(): boolean {
    return this.transitioning;
  }

  /**
   * The duty-roster directive for the current progress state. Reads the
   * EXPLICIT scenario completion state (pilotRoute.ts) plus two mission
   * facts (dock check-in, Final Core completion) — never event counts.
   * Overridable: pilot zones show the pilot route objective instead.
   */
  protected buildRouteObjectiveText(): string {
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
  protected refreshRouteObjective() {
    const text = this.buildRouteObjectiveText();
    const title = this.buildMissionCardTitle();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__routeObjectiveText = text;
    }

    this.missionCard.set(title, text);
    // The second HUD line follows the card's height.
    this.questObjective.setY(this.missionCard.bottom + 4);
  }

  /** Design-space bottom edge of the mission card (zone title placement). */
  protected missionCardBottom(): number {
    return this.missionCard.bottom;
  }

  /** Design-space left edge of the mission card. */
  protected missionCardLeft(): number {
    return this.missionCard.left;
  }

  /**
   * World V1 (U2): sets the frame of a strip-textured door leaf by its
   * registry id (the docking airlock closing behind the arrival).
   * Presentation only — position, radius and availability are untouched.
   */
  protected doorImage(registryId: string): Phaser.GameObjects.Image | null {
    for (const door of this.doors) {
      if (door.registryId === registryId) {
        const marker = this.interactableMarkers.get(door);

        return marker instanceof Phaser.GameObjects.Image ? marker : null;
      }
    }

    return null;
  }

  protected setDoorFrameById(registryId: string, frame: number) {
    for (const door of this.doors) {
      if (door.registryId === registryId) {
        const marker = this.interactableMarkers.get(door);

        (marker as Phaser.GameObjects.Image | undefined)?.setFrame?.(frame);
      }
    }
  }

  /**
   * Adds a visible NPC as a proximity station (Unit 1): the NpcActor
   * sprite replaces the marker rectangle, the name chip appears only in
   * interaction proximity (contextual labelling), and prompt/logging
   * mechanics are exactly addStation's.
   */
  protected addNpc(config: RoomNpcConfig) {
    if (!this.textures.exists(config.texture ?? '')) {
      // Foundry texture missing (never expected — proc textures generate
      // at Boot): degrade to the standard station marker.
      this.addStation(config);
      return;
    }

    const npc = new NpcActor({
      scene: this,
      x: config.x,
      y: config.y,
      texture: config.texture!,
      name: config.npcName,
      still: config.still,
      workFrames: config.workFrames,
    });

    this.interactableMarkers.set(config, npc.sprite);
    this.npcActors.set(config, npc);
    this.stations.push(config);
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

    // Depth policy (layer 3): the marker is a world object sorted at its
    // foot line, so the avatar walks in front of it when standing south of
    // it and behind it when north — never hidden under a workstation.
    this.sortAtFootLine(marker, config.y);
    this.interactableMarkers.set(config, marker);
    this.stations.push(config);
    // World V1 production (mission §11): stations carry NO standing
    // indicator lamp — the object's own art states its class; the one
    // guidance cue is the floor pool under the current route target.
  }

  /**
   * World V1 indicator lamp (INTERACTION-GRAMMAR.md §1): a small lamp at
   * the top-right of the object's art whose colour is the derived class —
   * cyan (active), steel-white (optional), dark (inactive). Doors carry
   * their lamp in the lintel socket above the leaf. Presentation only.
   */
  private attachIndicator(
    config: RoomStationConfig | RoomDoorConfig,
    marker: Phaser.GameObjects.GameObject,
  ) {
    const bounds = (
      marker as Phaser.GameObjects.GameObject & {
        getBounds?: () => Phaser.Geom.Rectangle;
      }
    ).getBounds?.();
    const isDoor = this.doors.includes(config as RoomDoorConfig);
    const x = isDoor
      ? config.x
      : bounds !== undefined
        ? bounds.right - 6
        : config.x + 14;
    const y = isDoor
      ? (bounds?.top ?? config.y - 37) - 10
      : bounds !== undefined
        ? bounds.top + 4
        : config.y - 16;
    const glow = this.add
      .rectangle(x, y, 10, 6, KIT_INDICATOR.optional, 0.25)
      .setDepth(DepthLayer.WorldReadout);
    const lamp = this.add
      .rectangle(x, y, 5, 3, KIT_INDICATOR.optional, 1)
      .setDepth(DepthLayer.WorldReadout + 0.01);

    this.indicators.set(config, { lamp, glow });
  }

  /**
   * Per-frame indicator refresh: lamp colours follow the derived class; the
   * single guidance light pool sits under the current guidance target.
   */
  private updateIndicators() {
    let target: RoomStationConfig | RoomDoorConfig | null = null;

    for (const [config, indicator] of this.indicators) {
      const objectClass = this.classOf(config);

      const color =
        objectClass === 'active'
          ? KIT_INDICATOR.active
          : objectClass === 'inactive'
            ? KIT_INDICATOR.inactive
            : KIT_INDICATOR.optional;

      indicator.lamp.setFillStyle(color, 1);
      indicator.glow
        .setFillStyle(color, objectClass === 'inactive' ? 0.08 : 0.28)
        .setVisible(objectClass !== 'inactive');

      if (objectClass === 'active') {
        target = config;
      }
    }

    for (const config of this.stations) {
      if (!this.indicators.has(config) && this.classOf(config) === 'active') {
        target = config;
      }
    }

    if (target === this.guidancePoolFor) {
      return;
    }

    this.guidancePoolFor = target;
    this.guidancePool?.destroy();
    this.guidancePool = null;

    // Restrained spatial guidance (mission §11): one soft service-light
    // pool on the floor in front of the current route target — never a
    // ring, an arrow, a pulse or a cue on any other object.
    if (target !== null && this.textures.exists('kit-light-pool-cyan')) {
      this.guidancePool = this.add
        .image(target.x, target.y + 22, 'kit-light-pool-cyan')
        .setAlpha(0.5)
        .setDepth(DepthLayer.FloorDecal + 0.05);
    }
  }

  /**
   * V4 Unit 6: true when the point (x, y) lies inside the art bounds of
   * another interactable marker (station or door), i.e. a chip/prompt
   * placed there would caption the wrong object. Presentation only.
   */
  private belowPlacementCovered(x: number, y: number): boolean {
    for (const [config, marker] of this.interactableMarkers) {
      if (Math.abs(config.x - x) < 1 && Math.abs(config.y - (y - 40)) < 1) {
        continue;
      }

      const bounds = (
        marker as Phaser.GameObjects.GameObject & {
          getBounds?: () => Phaser.Geom.Rectangle;
        }
      ).getBounds?.();

      // Review V-2: the chip is ~90 world px wide — test its span, not
      // only its centre.
      if (
        bounds !== undefined &&
        (bounds.contains(x, y) ||
          bounds.contains(x - 44, y) ||
          bounds.contains(x + 44, y))
      ) {
        return true;
      }
    }

    return false;
  }

  /** Layer-4 depth for a marker/prop image or placeholder rectangle. */
  private sortAtFootLine(marker: Phaser.GameObjects.GameObject, y: number) {
    const sized = marker as Phaser.GameObjects.GameObject & {
      displayHeight?: number;
      setDepth: (depth: number) => unknown;
    };
    const half = (sized.displayHeight ?? 40) / 2;

    sized.setDepth(worldDepth(y + half));
  }

  /**
   * Purely decorative set dressing: renders only when its committed
   * texture is loaded; never collides, never interacts, never obstructs
   * (placement is the room's responsibility per plan §10 decorative rule).
   */
  protected addDecor(x: number, y: number, texture: string) {
    if (this.textures.exists(texture)) {
      const image = this.add.image(x, y, texture);

      // Unit 7 (V11): y-sorted depth at the prop's foot line so the avatar
      // walks behind tall props and in front of low ones; flat floor
      // dressing stays under everything (presentation only).
      image.setDepth(
        FLOOR_DECOR.has(texture)
          ? -0.2
          : worldDepth(y + image.displayHeight / 2),
      );
    }
  }

  // ——— World V1 kit placement helpers (presentation only) ———————————————

  /**
   * A kit prop anchored at its bottom-centre ground contact (foot line),
   * y-sorted with the actors (depth layer 3). Returns the image or null.
   */
  protected addKitProp(
    x: number,
    footY: number,
    texture: string,
    options?: { depth?: number; alpha?: number; tint?: number },
  ): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(texture)) {
      return null;
    }

    const image = this.add
      .image(x, footY, texture)
      .setOrigin(0.5, 1)
      .setDepth(options?.depth ?? worldDepth(footY));

    if (options?.alpha !== undefined) {
      image.setAlpha(options.alpha);
    }

    if (options?.tint !== undefined) {
      image.setTint(options.tint);
    }

    return image;
  }

  /** Fixed ground infrastructure (layer 2): rails, trays, low crates. */
  protected addGroundInfra(x: number, y: number, texture: string) {
    return this.addKitProp(x, y, texture, { depth: DepthLayer.GroundInfra });
  }

  /** Overhead architecture (layer 4): lintels, hanging elements. */
  protected addOverhead(x: number, y: number, texture: string) {
    if (!this.textures.exists(texture)) {
      return null;
    }

    return this.add.image(x, y, texture).setDepth(DepthLayer.Overhead);
  }

  /** Floor decal (layer 1): light pools, lanes, shadows. */
  protected addFloorDecal(
    x: number,
    y: number,
    texture: string,
    alpha = 1,
  ): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(texture)) {
      return null;
    }

    return this.add
      .image(x, y, texture)
      .setAlpha(alpha)
      .setDepth(DepthLayer.FloorDecal);
  }

  /**
   * A painted floor lane (tile-aligned): subtle plate tiles with edge
   * lines — architecture, never a translucent development rectangle.
   */
  protected addFloorLane(col: number, row: number, cols: number, rows: number) {
    const TILE = 32;

    for (let r = row; r < row + rows; r += 1) {
      for (let c = col; c < col + cols; c += 1) {
        this.addFloorDecal(c * TILE + 16, r * TILE + 16, 'kit-floor-lane');
      }
    }

    for (let c = col; c < col + cols; c += 1) {
      this.addFloorDecal(c * TILE + 16, row * TILE + 2, 'kit-lane-edge');
      this.addFloorDecal(
        c * TILE + 16,
        (row + rows) * TILE - 2,
        'kit-lane-edge',
      );
    }
  }

  /**
   * A wall sign: dark plate + small caps text on the wall band — the
   * architectural signage the guidance model prefers over floating labels.
   */
  protected addWallSign(x: number, y: number, text: string) {
    if (this.textures.exists('kit-sign-plate')) {
      this.add.image(x, y, 'kit-sign-plate').setDepth(DepthLayer.GroundInfra);
    }

    this.add
      .text(x, y, text.toUpperCase(), {
        color: '#b8c4cf',
        font: '9px monospace',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(DepthLayer.GroundInfra + 0.01);
  }

  /**
   * A door frame with its lintel lamp socket around a door leaf — the one
   * door family of the station. `orientation` 'h' for north/south walls,
   * 'v' for west/east walls.
   */
  protected addDoorFrame(x: number, y: number, orientation: 'h' | 'v') {
    const texture =
      orientation === 'h' ? 'kit-door-frame-h' : 'kit-door-frame-v';

    if (!this.textures.exists(texture)) {
      return;
    }

    this.add
      .image(x, orientation === 'h' ? y - 8 : y, texture)
      .setDepth(DepthLayer.Overhead);
  }

  /**
   * Unit 7 (V4): swaps the leaf art of the door leading to `sceneKey`
   * (open/closed variants). Presentation only — geometry and gate untouched.
   */
  protected setDoorTexture(sceneKey: string, texture: string) {
    if (!this.textures.exists(texture)) {
      return;
    }

    for (const door of this.doors) {
      if (door.target?.sceneKey === sceneKey) {
        const marker = this.interactableMarkers.get(door);

        (marker as Phaser.GameObjects.Image | undefined)?.setTexture?.(texture);
      }
    }
  }

  /** Unit 7: ends an NPC's two-frame work cycle before a fixed pose. */
  protected stopNpcWorkLoop(interactionKey: InteractionKey) {
    for (const [config, npc] of this.npcActors) {
      if (config.interactionKey === interactionKey) {
        npc.stopWorkLoop();
      }
    }
  }

  /**
   * Read access to a visible NPC's sprite for presentation-only tweens
   * (Unit D: idle work sway). Never used for interaction geometry.
   */
  protected npcSpriteFor(
    interactionKey: InteractionKey,
  ): Phaser.GameObjects.Image | null {
    for (const [config, npc] of this.npcActors) {
      if (config.interactionKey === interactionKey) {
        return npc.sprite;
      }
    }

    return null;
  }

  /**
   * Swaps a station's rendered texture in place (Unit C: visible world
   * consequences — e.g. damaged machinery becoming repaired). Pure
   * presentation: position, interaction radius, label and events are
   * untouched (art swaps never alter interaction regions).
   */
  protected setStationTexture(interactionKey: InteractionKey, texture: string) {
    if (!this.textures.exists(texture)) {
      return;
    }

    for (const station of this.stations) {
      if (station.interactionKey === interactionKey) {
        const marker = this.interactableMarkers.get(station);

        (marker as Phaser.GameObjects.Image | undefined)?.setTexture?.(texture);
      }
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

    if (config.texture !== undefined && this.textures.exists(config.texture)) {
      const image = marker as Phaser.GameObjects.Image;

      if (config.textureFrame !== undefined) {
        image.setFrame(config.textureFrame);
      }
    }

    // Depth policy: the door leaf sorts at its foot line (a wall-mounted
    // leaf on the north wall sits behind a figure walking through the
    // doorway). World V1: the class is carried by the lintel lamp, never
    // by a tint or a threshold bar.
    this.sortAtFootLine(marker, config.y);
    this.interactableMarkers.set(config, marker);
    this.doors.push(config);
    this.attachIndicator(config, marker);
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

    const centerX = DESIGN_WIDTH / 2;

    this.feedbackMessage = this.add
      .text(centerX, this.feedbackMessageY(), message, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '16px monospace',
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
      body: this.getPromptBody(station.interactionKey) ?? station.promptBody,
      options: this.getPromptOptions(station.interactionKey),
      presentation: this.getStagePresentation(station.interactionKey),
    });
  }

  /**
   * NEXT-09 Phase 2 adoption hook (getStagePresentation precedent): a room
   * may attach an in-fiction body to a station's INITIAL prompt stage at
   * open time (chained stages carry their own `body` on the returned
   * PromptStage). Default: undefined — the station's static `promptBody`
   * applies and every existing surface renders byte-identically.
   */
  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    void interactionKey;

    return undefined;
  }

  /**
   * NEXT-08 §3.1 adoption hook: a room may attach a StagePresentation to a
   * station's INITIAL prompt stage (chained stages carry their own
   * `presentation` field on the returned PromptStage). Default: none —
   * every surface renders exactly as before NEXT-08.
   */
  protected getStagePresentation(
    interactionKey: InteractionKey,
  ): StagePresentation | undefined {
    void interactionKey;

    return undefined;
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
    const centerX = DESIGN_WIDTH / 2;
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
    // FABLE-NEXT-08 (\u00a73.1): an optional stage presentation may widen the
    // panel to 640 px, render a task surface between header and cards,
    // and attach inline icons/treatments to cards \u2014 never altering the
    // option list, order, labels, instruction line, or input model.
    const presentation = stage.presentation;
    const PANEL_WIDTH =
      presentation?.panelWidth !== undefined
        ? Math.max(560, Math.min(640, Math.floor(presentation.panelWidth)))
        : 560;
    const PADDING = 18;
    const CARD_WIDTH = PANEL_WIDTH - PADDING * 2;
    const CARD_GUTTER = 22;
    const CARD_PAD_Y = 7;
    const CARD_GAP = 8;
    const panelX = centerX - PANEL_WIDTH / 2;
    const PANEL_Y = 72;

    const children: Phaser.GameObjects.GameObject[] = [];
    const surfaceProbe: MinigameSurfaceProbeEntry[] = [];

    let cursorY = this.renderPromptHeader(
      interaction.label,
      stage.body,
      presentation,
      PADDING,
      CARD_WIDTH,
      children,
    );

    if (presentation?.surface !== undefined) {
      for (const element of presentation.surface) {
        cursorY = this.renderSurfaceElement(
          element,
          PADDING,
          CARD_WIDTH,
          cursorY,
          panelX,
          PANEL_Y,
          options.length,
          children,
          surfaceProbe,
        );
      }

      cursorY += 4;
    }

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
      const iconKey = presentation?.optionIcons?.[index];
      const hasIcon = iconKey !== undefined && this.textures.exists(iconKey);
      const isRecord = presentation?.recordCards?.includes(index) === true;
      const labelYOffset = CARD_PAD_Y + (isRecord ? 6 : 0);
      const label = this.add.text(
        PADDING + CARD_GUTTER + (hasIcon ? 30 : 0),
        cursorY + labelYOffset,
        `${index + 1}. ${option.label}`,
        {
          color: '#ffffff',
          font: '15px monospace',
          lineSpacing: 4,
          wordWrap: {
            width: CARD_WIDTH - CARD_GUTTER - 12 - (hasIcon ? 30 : 0),
          },
        },
      );
      let cardHeight =
        Math.ceil(label.height) + CARD_PAD_Y * 2 + (isRecord ? 6 : 0);

      if (hasIcon) {
        cardHeight = Math.max(cardHeight, 30 + (isRecord ? 6 : 0));
      }

      const background = this.add
        .rectangle(PADDING, cursorY, CARD_WIDTH, cardHeight, 0x1a2733, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x33475a);
      const marker = this.add
        .text(PADDING + 6, cursorY + labelYOffset, '\u25b8', {
          color: '#5fd3c4',
          font: '15px monospace',
        })
        .setVisible(false);

      background.setInteractive({ useHandCursor: true });
      background.on('pointerover', () => this.focusPromptCard(index));
      background.on('pointerdown', () => this.selectPromptOption(index));

      children.push(background);

      if (isRecord) {
        // \u00a76.4 record-card treatment: a header band + rule drawn from the
        // existing panel language. Identical on every record card of the
        // stage \u2014 identity only, never a ranking or correctness cue.
        children.push(
          this.add
            .rectangle(PADDING, cursorY, CARD_WIDTH, 5, 0x101820, 1)
            .setOrigin(0),
          this.add
            .rectangle(PADDING, cursorY + 5, CARD_WIDTH, 1, 0x33475a, 1)
            .setOrigin(0),
        );
      }

      if (hasIcon) {
        // Inline option icon (\u00a73.3): identity beside the unchanged label
        // text \u2014 icons never replace text (\u00a73.4).
        children.push(
          this.add.image(
            PADDING + CARD_GUTTER + 14,
            cursorY + Math.round(cardHeight / 2),
            iconKey,
          ),
        );
      }

      children.push(label, marker);
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
        // V4 Unit 6 (review A-1): the keyboard-affordance line keeps the
        // body size at the 0.625 display scale.
        font: '15px monospace',
        lineSpacing: 4,
        wordWrap: { width: CARD_WIDTH },
      },
    );
    const panelHeight = cursorY + 12 + Math.ceil(instruction.height) + PADDING;
    const backdrop = this.add
      .rectangle(0, 0, PANEL_WIDTH, Math.max(230, panelHeight), 0x101820, 1)
      .setOrigin(0);
    const panel = this.add.container(panelX, PANEL_Y, [
      backdrop,
      ...children,
      instruction,
    ]);

    panel.setDepth(Depth.AboveWorld);
    panel.setScrollFactor(0);
    this.proximityPrompt.setVisible(false);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__promptCards = cardRects;
      window.__minigameSurface = surfaceProbe.length > 0 ? surfaceProbe : null;
    }

    this.activePrompt = {
      interactionKey,
      options,
      panel,
      cards,
      focusedIndex: -1,
    };
    sfxPromptOpen();
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
   * NEXT-08 header renderer. Default path (no bodyInset/bodyLineIcons):
   * byte-for-byte the pre-NEXT-08 single header text. The two decorated
   * paths re-render the SAME strings — the interaction label and the
   * stage body, unmodified — in styled blocks; __lastPromptBody is
   * composed earlier from stage.body and is untouched by any of this.
   * Returns the local cursor y where the next panel section starts.
   */
  private renderPromptHeader(
    interactionLabel: string,
    body: string | undefined,
    presentation: StagePresentation | undefined,
    padding: number,
    contentWidth: number,
    children: Phaser.GameObjects.GameObject[],
  ): number {
    const headerStyle = {
      color: '#ffffff',
      font: '16px monospace',
      lineSpacing: 4,
      wordWrap: { width: contentWidth - 12 },
    };
    const inset = presentation?.bodyInset;
    const lineIcons = presentation?.bodyLineIcons;

    if (
      inset !== undefined &&
      body !== undefined &&
      body.includes(inset.text)
    ) {
      // §6.4: one exact substring of the body renders inside a distinct
      // inset (log-extract or plain treatment); text is byte-identical.
      const at = body.indexOf(inset.text);
      const before = body.slice(0, at).replace(/\n+$/, '');
      const after = body.slice(at + inset.text.length).replace(/^\n+/, '');
      let cursorY = padding;
      const head = this.add.text(
        padding,
        cursorY,
        before.length > 0
          ? `${interactionLabel}\n\n${before}`
          : interactionLabel,
        headerStyle,
      );

      children.push(head);
      cursorY += Math.ceil(head.height) + 10;

      const isLog = inset.treatment === 'log';
      const insetTextX = padding + (isLog ? 16 : 10);
      const insetText = this.add.text(insetTextX, cursorY + 8, inset.text, {
        ...headerStyle,
        wordWrap: { width: contentWidth - (insetTextX - padding) - 30 },
      });
      const insetHeight = Math.ceil(insetText.height) + 16;
      const insetBox = this.add
        .rectangle(padding, cursorY, contentWidth, insetHeight, 0x101820, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x33475a);

      children.push(insetBox);

      if (isLog) {
        // Log-extract treatment (§6.4): left rule + corner mark glyph.
        children.push(
          this.add
            .rectangle(
              padding + 5,
              cursorY + 6,
              3,
              insetHeight - 12,
              0x33475a,
              1,
            )
            .setOrigin(0),
        );

        if (this.textures.exists('proc-icon-log-mark')) {
          children.push(
            this.add.image(
              padding + contentWidth - 14,
              cursorY + 12,
              'proc-icon-log-mark',
            ),
          );
        }
      }

      children.push(insetText);
      cursorY += insetHeight + 10;

      if (after.length > 0) {
        const tail = this.add.text(padding, cursorY, after, headerStyle);

        children.push(tail);
        cursorY += Math.ceil(tail.height) + 10;
      }

      return cursorY + 2;
    }

    if (lineIcons !== undefined && lineIcons.length > 0 && body !== undefined) {
      // §6.1: identity icons beside existing body lines (exact line-text
      // match); every line renders verbatim, icon or not.
      let cursorY = padding;
      const title = this.add.text(
        padding,
        cursorY,
        interactionLabel,
        headerStyle,
      );

      children.push(title);
      cursorY += Math.ceil(title.height) + 10;

      for (const line of body.split('\n')) {
        if (line.length === 0) {
          cursorY += 8;
          continue;
        }

        const iconKey = lineIcons.find((entry) => entry.line === line)?.icon;
        const hasIcon = iconKey !== undefined && this.textures.exists(iconKey);
        const text = this.add.text(
          padding + (hasIcon ? 30 : 0),
          cursorY,
          line,
          {
            ...headerStyle,
            wordWrap: { width: contentWidth - 12 - (hasIcon ? 30 : 0) },
          },
        );

        children.push(text);

        if (hasIcon) {
          children.push(
            this.add.image(
              padding + 12,
              cursorY + Math.round(Math.ceil(text.height) / 2),
              iconKey,
            ),
          );
        }

        cursorY += Math.ceil(text.height) + 4;
      }

      return cursorY + 8;
    }

    const header = this.add.text(
      padding,
      padding,
      body ? `${interactionLabel}\n\n${body}` : interactionLabel,
      headerStyle,
    );

    children.push(header);

    return padding + Math.ceil(header.height) + 12;
  }

  /**
   * NEXT-08 task-surface renderer (§6). Every interactive element is a
   * redundant activator of an existing option index (§3.2): pointerdown
   * calls the same selectPromptOption the option card's click calls, and
   * pointerover focuses the linked card (presentation only — focus never
   * logs). Elements without `activates` render identically but take no
   * pointer handler; an `activates` index outside the declared option
   * list is treated as inert too (Phase 7 authoring guard — a
   * mis-authored surface must never carry a hand cursor to a no-op).
   * Returns the local cursor y after the element.
   */
  private renderSurfaceElement(
    element: StageSurfaceElement,
    padding: number,
    contentWidth: number,
    startY: number,
    panelX: number,
    panelY: number,
    optionCount: number,
    children: Phaser.GameObjects.GameObject[],
    probe: MinigameSurfaceProbeEntry[],
  ): number {
    let cursorY = startY;
    const validActivates = (index: number | undefined): number | undefined =>
      index !== undefined && index >= 0 && index < optionCount
        ? index
        : undefined;

    switch (element.kind) {
      case 'tray': {
        for (const entry of element.entries) {
          const iconKey = entry.icon;
          const hasIcon =
            iconKey !== undefined && this.textures.exists(iconKey);
          const label = this.add.text(padding + 34, 0, entry.label, {
            color: '#ffffff',
            font: '15px monospace',
            lineSpacing: 4,
            wordWrap: { width: contentWidth - 46 },
          });
          const rowHeight = Math.max(32, Math.ceil(label.height) + 14);
          const row = this.add
            .rectangle(padding, cursorY, contentWidth, rowHeight, 0x101820, 1)
            .setOrigin(0)
            .setStrokeStyle(1, 0x33475a);

          label.setPosition(
            padding + 34,
            cursorY + Math.round((rowHeight - label.height) / 2),
          );
          children.push(row);

          if (hasIcon) {
            children.push(
              this.add.image(
                padding + 17,
                cursorY + Math.round(rowHeight / 2),
                iconKey,
              ),
            );
          }

          children.push(label);

          const entryActivates = validActivates(entry.activates);

          if (entryActivates !== undefined) {
            row.setInteractive({ useHandCursor: true });
            row.on('pointerover', () => this.focusPromptCard(entryActivates));
            row.on('pointerdown', () =>
              this.selectPromptOption(entryActivates),
            );
          }

          probe.push({
            kind: 'tray',
            label: entry.label,
            x: panelX + padding,
            y: panelY + cursorY,
            width: contentWidth,
            height: rowHeight,
            activates: entryActivates ?? null,
          });
          cursorY += rowHeight + 6;
        }

        return cursorY + 2;
      }

      case 'station': {
        const hasTexture = this.textures.exists(element.texture);
        const textureHeight = hasTexture
          ? this.textures.get(element.texture).getSourceImage().height
          : 40;
        const boxHeight = Math.max(64, textureHeight + 16);
        const row = this.add
          .rectangle(padding, cursorY, contentWidth, boxHeight, 0x101820, 1)
          .setOrigin(0)
          .setStrokeStyle(1, 0x33475a);

        children.push(row);

        if (hasTexture) {
          children.push(
            this.add.image(
              padding + 40,
              cursorY + Math.round(boxHeight / 2),
              element.texture,
            ),
          );
        }

        const label = this.add.text(padding + 80, 0, element.label, {
          color: '#ffffff',
          font: '15px monospace',
          lineSpacing: 4,
          wordWrap: { width: contentWidth - 92 },
        });

        label.setPosition(
          padding + 80,
          cursorY + Math.round((boxHeight - label.height) / 2),
        );
        children.push(label);

        const stationActivates = validActivates(element.activates);

        if (stationActivates !== undefined) {
          row.setInteractive({ useHandCursor: true });
          row.on('pointerover', () => this.focusPromptCard(stationActivates));
          row.on('pointerdown', () =>
            this.selectPromptOption(stationActivates),
          );
        }

        probe.push({
          kind: 'station',
          label: element.label,
          x: panelX + padding,
          y: panelY + cursorY,
          width: contentWidth,
          height: boxHeight,
          activates: stationActivates ?? null,
        });
        cursorY += boxHeight + 6;

        if (element.carried !== undefined) {
          // Carried-item row (§6.1): same redundant-activator wiring.
          cursorY = this.renderSurfaceElement(
            { kind: 'tray', entries: [element.carried] },
            padding,
            contentWidth,
            cursorY,
            panelX,
            panelY,
            optionCount,
            children,
            probe,
          );

          return cursorY;
        }

        return cursorY + 2;
      }

      case 'steps': {
        if (element.tiles.length === 0) {
          // Authoring guard (Phase 1 review finding): an empty tile list
          // must degrade to nothing, never to NaN layout arithmetic.
          return cursorY;
        }

        const gap = 8;
        const count = element.tiles.length;
        const tileWidth = Math.floor(
          (contentWidth - gap * (count - 1)) / count,
        );
        const labels = element.tiles.map((tile, index) =>
          this.add.text(
            padding + index * (tileWidth + gap) + 8,
            cursorY + 30,
            tile.label,
            {
              color: '#ffffff',
              font: '14px monospace',
              lineSpacing: 3,
              wordWrap: { width: tileWidth - 16 },
            },
          ),
        );
        const labelMax = Math.max(
          ...labels.map((label) => Math.ceil(label.height)),
        );
        const tileHeight = 30 + labelMax + 10;

        element.tiles.forEach((tile, index) => {
          const tileX = padding + index * (tileWidth + gap);
          const tileBox = this.add
            .rectangle(tileX, cursorY, tileWidth, tileHeight, 0x101820, 1)
            .setOrigin(0)
            .setStrokeStyle(1, 0x33475a);

          children.push(tileBox);

          // Glyph-differentiated state (never colour-only, §7.3).
          const glyphKey =
            tile.state === 'done'
              ? 'proc-icon-step-done'
              : tile.state === 'current'
                ? 'proc-icon-step-current'
                : 'proc-icon-step-pending';

          if (this.textures.exists(glyphKey)) {
            children.push(this.add.image(tileX + 16, cursorY + 16, glyphKey));
          }

          if (
            element.partIcon !== undefined &&
            element.partIcon.tileIndex === index &&
            this.textures.exists(element.partIcon.icon)
          ) {
            children.push(
              this.add.image(
                tileX + tileWidth - 16,
                cursorY + 16,
                element.partIcon.icon,
              ),
            );
          }

          children.push(labels[index]);
          probe.push({
            kind: 'steps',
            label: tile.label,
            x: panelX + tileX,
            y: panelY + cursorY,
            width: tileWidth,
            height: tileHeight,
            activates: null,
            state: tile.state,
          });
        });

        return cursorY + tileHeight + 8;
      }

      case 'schematic': {
        // §6.2: static slot/component dressing (identical every visit)
        // plus a readout that re-renders only strings the status side
        // panel already shows — never sequence or manual/guidance state.
        const readout = this.add.text(
          padding + 112,
          cursorY + 10,
          element.readout.join('\n'),
          {
            color: '#ffffff',
            font: '14px monospace',
            lineSpacing: 4,
            wordWrap: { width: contentWidth - 124 },
          },
        );
        const boxHeight = Math.max(72, Math.ceil(readout.height) + 20);
        const frame = this.add
          .rectangle(padding, cursorY, contentWidth, boxHeight, 0x101820, 1)
          .setOrigin(0)
          .setStrokeStyle(1, 0x33475a);

        children.push(frame);

        for (let slot = 0; slot < 3; slot++) {
          if (this.textures.exists('proc-icon-slot-chip')) {
            children.push(
              this.add.image(
                padding + 18 + slot * 30,
                cursorY + 22,
                'proc-icon-slot-chip',
              ),
            );
          }
        }

        if (this.textures.exists('proc-icon-component')) {
          children.push(
            this.add.image(padding + 26, cursorY + 52, 'proc-icon-component'),
          );
        }

        if (this.textures.exists('proc-icon-manual')) {
          children.push(
            this.add.image(padding + 58, cursorY + 52, 'proc-icon-manual'),
          );
        }

        children.push(readout);
        probe.push({
          kind: 'schematic',
          label: element.readout.join('\n'),
          x: panelX + padding,
          y: panelY + cursorY,
          width: contentWidth,
          height: boxHeight,
          activates: null,
        });

        return cursorY + boxHeight + 8;
      }
    }
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

    // Soft focus tick on every focus MOVE (not the initial focus with the
    // prompt-open swish; identical tick for every card — uniform cue).
    if (this.activePrompt.focusedIndex !== -1) {
      sfxUiMove();
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

    // Same one-physical-press rule as the numeric handlers (Unit 8).
    if (
      event.timeStamp === this.lastPromptSelectStamp &&
      Date.now() - this.lastPromptSelectAt < 0
    ) {
      return;
    }

    this.lastPromptSelectStamp = event.timeStamp;
    this.lastPromptSelectAt = Date.now();

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
  private lastPromptSelectStamp = -1;

  private lastPromptSelectAt = 0;

  private readonly promptKeyHandlers: ((event: KeyboardEvent) => void)[] =
    PROMPT_KEY_NAMES.map((_, index) => (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      // Unit 8 (P1 journey root cause): one PHYSICAL press must select
      // exactly once. A stage chained from this same press re-registers
      // these handlers, and the still-travelling keydown would otherwise
      // select the SAME NUMBER on the new stage (observed live: press 2
      // = checklist AND skip-verification). Ignore number keys briefly
      // after every stage render.
      if (
        event.timeStamp === this.lastPromptSelectStamp &&
        Date.now() - this.lastPromptSelectAt < 0
      ) {
        return;
      }

      this.lastPromptSelectStamp = event.timeStamp;
      this.lastPromptSelectAt = Date.now();
      this.selectPromptOption(index);
    });

  private selectPromptOption(index: number) {
    // Unit 8 FINAL cascade guard: a stage chained from this selection
    // re-registers the key handlers, and the same still-dispatching
    // physical event would re-enter here synchronously. Re-entrancy is
    // the exact discriminator - no timing heuristics.
    if (this.promptSelectionInProgress) {
      return;
    }

    this.promptSelectionInProgress = true;

    try {
      this.selectPromptOptionInner(index);
    } finally {
      this.promptSelectionInProgress = false;
    }
  }

  private promptSelectionInProgress = false;

  private selectPromptOptionInner(index: number) {
    if (this.activePrompt === null) {
      return;
    }

    const { interactionKey, options } = this.activePrompt;
    const option = options[index];

    if (option === undefined) {
      return;
    }

    // Uniform selection tick — byte-identical recipe for every option.
    sfxUiSelect();

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

    // Empty feedback = the option's onSelected surfaces its own message
    // (or none); rendering an empty banner would only flash a blank
    // chip and clobber the feedback the handler just showed.
    if (option.feedback !== '') {
      this.showFeedbackMessage(option.feedback);
    }
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
      window.__minigameSurface = null;
    }

    this.activePrompt?.panel.destroy();
    this.activePrompt = null;
  }

  private activateDoor(door: RoomDoorConfig) {
    const sealedNow =
      door.target !== undefined ? (door.gate?.() ?? null) : null;

    if (door.eventType !== undefined) {
      this.logRoomEvent(
        door.interactionKey,
        door.eventType,
        door.eventMetadata !== undefined || sealedNow !== null
          ? {
              metadata: {
                ...door.eventMetadata,
                ...(sealedNow !== null ? { sealed: true } : {}),
              },
            }
          : undefined,
      );
    }

    if (sealedNow !== null) {
      sfxUnavailable();
      this.showFeedbackMessage(sealedNow);
      return;
    }

    if (door.target === undefined) {
      sfxUnavailable();
      this.showFeedbackMessage(
        door.sealedMessage ??
          'This section is sealed — pressurisation pending.',
      );
      return;
    }

    sfxDoor();

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
      this.transitioning ||
      isWorldActionActive()
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

    const nearestConfig =
      nearest === null
        ? null
        : nearest.kind === 'station'
          ? nearest.station!
          : nearest.door!;

    // Unit 7 (visual review B1): the prompt and the name chip sit on the
    // far side of the target from the avatar — above it when approached
    // from below (the common case), below it when approached from above —
    // so they never cover the figure or the object they describe.
    const targetY =
      nearest === null
        ? null
        : nearest.kind === 'station'
          ? nearest.station!.y
          : nearest.door!.y;
    // V4 Unit 6 (Unit 2 review C1): the below-target placement is used
    // only when it does not land on another interactable's art (e.g. the
    // Concourse gauge chip over the Dock door leaf); otherwise the chip
    // and prompt stay above the target.
    const fromAbove =
      targetY !== null &&
      this.player.y < targetY - 8 &&
      nearestConfig !== null &&
      !this.belowPlacementCovered(nearestConfig.x, targetY + 40) &&
      !this.belowPlacementCovered(nearestConfig.x, targetY + 80);

    if (this.activeTarget === null) {
      // World V1: a room may offer an auxiliary prompt for a reachable
      // non-station object (a recoverable bundle) — same one-line grammar.
      const aux = this.auxPrompt();

      if (aux === null) {
        this.proximityPrompt.setVisible(false);
      } else {
        const anchor = worldToDesign(this, aux.x, aux.y - 40);
        const half = this.proximityPrompt.width / 2;

        this.proximityPrompt
          .setText(aux.text)
          .setPosition(
            Phaser.Math.Clamp(
              Math.round(anchor.x),
              half + 2,
              this.promptClampMaxX() - half,
            ),
            Math.max(80, Math.round(anchor.y)),
          )
          .setVisible(true);
      }

      // Out-of-range interaction attempt: no target reachable. Rooms that
      // track control errors (Dock baseline covariates) hook this.
      if (this.interactJustPressed()) {
        this.onEmptyInteract();
      }

      return;
    }

    // World V1: one line — `E — <verb> <label>`, or the object's state
    // when its availability rule says it is inactive now.
    const availabilityState = nearestConfig?.availability?.() ?? null;
    const verb =
      nearestConfig?.verb ??
      (this.activeTarget.kind === 'door' ? 'Go to' : 'Use');

    this.proximityPrompt.setText(
      promptText(verb, nearestConfig?.label ?? '', availabilityState),
    );

    // Design-space clamp: keep the prompt fully inside the HUD design
    // space (legacy rooms keep the right status-panel margin) with a 2px
    // margin.
    const promptHalf = this.proximityPrompt.width / 2;
    // Project the target into the HUD design space (the prompt is a HUD
    // object); the vertical offset is expressed in world pixels so the
    // prompt keeps the same clearance from the object at any scale.
    const anchor = worldToDesign(
      this,
      this.activeTarget.x,
      fromAbove ? this.activeTarget.y + 56 : this.activeTarget.y - 56,
    );

    this.proximityPrompt
      .setPosition(
        Phaser.Math.Clamp(
          Math.round(anchor.x),
          promptHalf + 2,
          this.promptClampMaxX() - promptHalf,
        ),
        // Never inside the mission-card band (design y < 80).
        Math.max(80, Math.round(anchor.y)),
      )
      .setVisible(true);

    if (this.interactJustPressed()) {
      if (availabilityState !== null) {
        // Class 3 (inactive / future): E states the object's state; it
        // never opens a surface (INTERACTION-GRAMMAR.md §1).
        sfxUnavailable();
        this.showFeedbackMessage(
          `${capitaliseFirst(nearestConfig?.label ?? '')}: ${availabilityState}.`,
        );
      } else if (this.activeTarget.kind === 'station') {
        this.openStationPrompt(this.activeTarget.station!);
      } else {
        this.activateDoor(this.activeTarget.door!);
      }
    }
  }

  /**
   * V4 (mission §18): a room may ignore the interact keys for a short
   * window after an overlay hands control back (the opening's skip press
   * must never leak into the first interaction). Presentation/input
   * hygiene only — nothing measured happens inside the window.
   */
  protected suppressInteractUntilMs = 0;

  /** SPACE and E converge on one contextual-interaction press (Unit 1). */
  private interactJustPressed(): boolean {
    // SPACE and E converge on one contextual-interaction press (Unit 1).
    // Pilot V3 tried consuming both flags every frame (V2 finding U8-4);
    // that changed corridor/relay outcomes in the legacy journeys, so the
    // base behaviour is kept and U8-4 stays a recorded finding.
    const pressed =
      Phaser.Input.Keyboard.JustDown(this.player.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.interactKeyE);

    return (
      pressed && !this.inputLocked && Date.now() >= this.suppressInteractUntilMs
    );
  }

  /** SPACE/E pressed with no station/door in range. Default: no-op. */
  protected onEmptyInteract(): void {}

  /**
   * World V1: an auxiliary one-line prompt for a reachable non-station
   * object when no station or door is in range (pilot zones: the nearest
   * recoverable bundle). Default: none.
   */
  protected auxPrompt(): { text: string; x: number; y: number } | null {
    return null;
  }

  /** Screen y of the transient feedback banner (rooms with a north-wall
   * door prompt lower it so the two never collide — Unit 7 V13). */
  protected feedbackMessageY(): number {
    return 128;
  }

  /**
   * Physical-layer eligibility (Unit 1, physical-mechanics session): a
   * direct-manipulation layer accepts pointer input only while no prompt
   * panel is open and no timed world action is running — the same
   * eligibility rule updateProximity applies to stations/doors.
   */
  protected physicalInputEligible(): boolean {
    return (
      this.activePrompt === null &&
      !state.isTypewriting &&
      !this.transitioning &&
      !isWorldActionActive()
    );
  }

  update(_time: number, delta: number) {
    // FABLE-NEXT-06: the avatar holds still while a prompt is open — the
    // arrow keys belong to card focus there (presentation-only; selection
    // remains the only way a prompt closes, so no task state is affected).
    // Unit 1: the avatar also holds still while a timed world action runs
    // (scan/dig/install progress bars are performed in place).
    if (
      this.activePrompt === null &&
      !isWorldActionActive() &&
      !this.inputLocked
    ) {
      this.player.update();
    } else if (!this.inputLocked) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    }

    // World V1: the plate camera follows the avatar (dead zone + time-based
    // damping; CAMERA-AND-SCALE-SPEC.md §5). A scripted arrival may hold
    // the follow while it owns the camera.
    if (!this.cameraHeld) {
      this.plate.follow(this.player.x, this.player.y, delta);
    }

    this.onRoomUpdate();
    this.updateProximity();
    this.updateIndicators();

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
      this.publishWorldPromptProbe();
      publishCameraProbe(this);
    }
  }

  /** DEV-only (Unit 7 V1 evidence): is the world prompt / any label chip
   * visible right now? Written every frame and on PAUSE. */
  private publishWorldPromptProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    // World V1: no contextual name chips exist any more (the prompt
    // carries the name); the probe keeps its shape for the specs.
    window.__worldPromptProbe = {
      prompt: this.proximityPrompt.visible,
      chips: 0,
      text: this.proximityPrompt.visible ? this.proximityPrompt.text : null,
    };
  }

  /** Per-frame hook for room-specific instrumentation (e.g. Dock baselines). */
  protected onRoomUpdate(): void {}

  /**
   * Unit 7 (V1): hides the proximity prompt. Called on scene PAUSE
   * (overlays) — pure presentation; the active target is re-derived on
   * the next update.
   */
  private hideWorldPrompts() {
    this.activeTarget = null;
    this.proximityPrompt.setVisible(false);
    this.publishWorldPromptProbe();
  }
}

function capitaliseFirst(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}
