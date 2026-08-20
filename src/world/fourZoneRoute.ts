import Phaser from 'phaser';

import { Depth, key } from '../constants';
import {
  sfxDoor,
  sfxUiSelect,
  startAmbience,
  stopAmbience,
  toggleAudioMuted,
  unlockAudio,
} from '../gameplay/audio';
import { wireInventoryOverlayKey } from '../inventory/ui/openOverlay';
import { Player } from '../sprites';
import { STATION_THEMES } from './proceduralTilesets';
import { RouteGuidanceHud } from './RouteGuidanceHud';
import type { BuiltRoomMap, RoomLayout } from './StationMapBuilder';
import { buildPlaceholderRoomMap } from './StationMapBuilder';

/**
 * Four-zone assessment route — route-preview controller (map foundation
 * unit).
 *
 * This file defines the FIXED participant route
 *
 *   Station Concourse → Diagnostics Laboratory → Exterior Recovery Yard
 *   → Utility & Core Deck → Core Chamber endpoint
 *
 * and the shared ZoneScene base the four zone scenes extend. It is a
 * NAVIGATION layer only:
 *
 * - no zone emits any research event (no researchRuntime import — the
 *   research measurement runtime is untouched by the entire route);
 * - inactive station shells show short neutral descriptions and never
 *   open answer cards, record item-level events, or gate anything;
 * - each zone has exactly one entrance (its spawn) and one forward
 *   transition; there is no backward door, so previous-zone
 *   backtracking is structurally unavailable;
 * - no transition depends on any task success — reaching the forward
 *   door is the only condition;
 * - no legacy room is reachable from the route (legacy scenes remain
 *   launchable only via the explicit developer `?scene=` aliases).
 *
 * Movement, collision, tilemap construction, theming, audio ambience
 * and the player controller are the existing proven systems
 * (Player, StationMapBuilder, proceduralTilesets, gameplay/audio).
 */

export interface ZoneDefinition {
  /** Internal zone key — also the Phaser scene key and `?scene=` alias. */
  zoneKey: string;
  /** Player-facing zone name (zone-title card). */
  displayName: string;
  /** The zone's single route-orientation objective line. */
  objective: string;
}

/** The fixed route order. Index n's forward transition targets index n+1. */
export const FOUR_ZONE_ROUTE: readonly ZoneDefinition[] = [
  {
    zoneKey: key.scene.stationConcourse,
    displayName: 'Station Concourse',
    objective: 'Route orientation: proceed to the Diagnostics Laboratory.',
  },
  {
    zoneKey: key.scene.diagnosticsLaboratory,
    displayName: 'Diagnostics Laboratory',
    objective:
      'Route orientation: proceed through the Exterior Airlock to the Recovery Yard.',
  },
  {
    zoneKey: key.scene.exteriorRecoveryYard,
    displayName: 'Exterior Recovery Yard',
    objective:
      'Route orientation: follow the service path to the Utility & Core Deck.',
  },
  {
    zoneKey: key.scene.utilityCoreDeck,
    displayName: 'Utility & Core Deck',
    objective: 'Route orientation: proceed to the Core Chamber.',
  },
];

/** Objective line shown once the Core Chamber endpoint is reached. */
export const ROUTE_COMPLETE_OBJECTIVE =
  'Route orientation complete — Core Chamber reached.';

/** Scene key of the zone after `zoneKey`, or null at the route's end. */
export function nextZoneSceneKey(zoneKey: string): string | null {
  const index = FOUR_ZONE_ROUTE.findIndex((zone) => zone.zoneKey === zoneKey);

  if (index === -1 || index === FOUR_ZONE_ROUTE.length - 1) {
    return null;
  }

  return FOUR_ZONE_ROUTE[index + 1].zoneKey;
}

/** An inactive station shell: inspectable, neutral description, no events. */
export interface ZoneShellConfig {
  /** Player-facing shell name (contextual chip, shown only in range). */
  label: string;
  /** Short neutral description shown on inspection (transient text). */
  description: string;
  x: number;
  y: number;
  /** Existing runtime texture key; placeholder rectangle when absent. */
  texture?: string;
}

interface ForwardConfig {
  x: number;
  y: number;
  label: string;
  /** Scene to start; null = Core Chamber endpoint (no exit beyond). */
  targetSceneKey: string | null;
  /** Neutral message when the endpoint itself is inspected. */
  endpointDescription?: string;
  /** Existing runtime texture for the transition marker. */
  texture?: string;
}

interface ProximityTarget {
  kind: 'shell' | 'forward';
  x: number;
  y: number;
  shell?: ZoneShellConfig;
}

const INTERACTION_RANGE = 72;
/** The destination beacon hides once the player is this close (arrival). */
const BEACON_ARRIVAL_RANGE = 120;
/** Endpoint completion radius (Core Chamber alcove mouth). */
const ENDPOINT_RANGE = 96;

/** Honour the OS reduced-motion preference (effects.ts precedent). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * DEV-only, read-only route-preview probe (__playerProbe precedent):
 * exposes the active zone, the rendered objective line, and the beacon/
 * legend visibility so Playwright specs can verify DISPLAYED guidance.
 * Never read back into gameplay; stripped from production builds.
 */
declare global {
  interface Window {
    __zoneProbe?: {
      zone: string;
      objective: string;
      legendVisible: boolean;
      beaconVisible: boolean;
      completed: boolean;
    } | null;
    /**
     * Last transient feedback line shown in the CURRENT zone (cleared on
     * every zone entry). Positive control for specs: proves an
     * inspection actually displayed its text (never read into gameplay).
     */
    __zoneFeedbackText?: string | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__zoneProbe = null;
  window.__zoneFeedbackText = null;
}

/**
 * Base scene for the four assessment-route zones. Reuses the proven
 * room infrastructure (character-grid tilemaps, themed procedural
 * tilesets, arcade collision, the Player controller, camera follow,
 * fade transitions, audio ambience) while replacing the measurement-
 * era prompt/logging surface with route-preview guidance:
 * inspection = transient neutral text, never a card panel, never an
 * event.
 */
export abstract class ZoneScene extends Phaser.Scene {
  /** This zone's key (scene key, zone key and route position). */
  protected abstract readonly zoneKey: string;

  protected player!: Player;
  protected roomMap!: BuiltRoomMap;
  protected hud!: RouteGuidanceHud;

  private shells: ZoneShellConfig[] = [];
  private forward: ForwardConfig | null = null;
  private beacon: Phaser.GameObjects.GameObject[] = [];
  private beaconShown = true;
  private completed = false;
  private transitioning = false;
  private activeTarget: ProximityTarget | null = null;
  private proximityPrompt!: Phaser.GameObjects.Text;
  private labelChip!: Phaser.GameObjects.Rectangle;
  private labelChipText!: Phaser.GameObjects.Text;
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private interactKeyE!: Phaser.Input.Keyboard.Key;

  /** Room layout grid; see StationMapBuilder for the character legend. */
  protected abstract getLayout(): RoomLayout;
  /** Player spawn in pixels (the zone's single entrance). */
  protected abstract getSpawn(): { x: number; y: number };
  /** Zone content: shells, forward transition, dressing. */
  protected abstract populateZone(): void;

  create() {
    this.shells = [];
    this.forward = null;
    this.beacon = [];
    this.beaconShown = true;
    this.completed = false;
    this.transitioning = false;
    this.activeTarget = null;
    this.feedbackMessage = null;
    this.feedbackTimer = null;

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__zoneFeedbackText = null;
    }

    const definition = FOUR_ZONE_ROUTE.find(
      (zone) => zone.zoneKey === this.zoneKey,
    );

    if (definition === undefined) {
      throw new Error(`Zone "${this.zoneKey}" is not on the four-zone route`);
    }

    const layout = this.getLayout();

    this.roomMap = buildPlaceholderRoomMap(this, layout);

    // Themed void colour beyond the map bounds — never a raw black band.
    if (layout.theme !== undefined) {
      this.cameras.main.setBackgroundColor(
        STATION_THEMES[layout.theme].voidColor,
      );
    }

    this.physics.world.setBounds(
      0,
      0,
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );

    const spawn = this.getSpawn();

    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, this.roomMap.layer);

    this.cameras.main.setBounds(
      0,
      0,
      this.roomMap.widthInPixels,
      this.roomMap.heightInPixels,
    );
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.hud = new RouteGuidanceHud(
      this,
      definition.displayName,
      definition.objective,
    );

    // Contextual interact hint — world-space, shown only near the
    // nearest eligible target (one consistent interaction language).
    this.proximityPrompt = this.add
      .text(0, 0, '', {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '14px monospace',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setVisible(false);

    // Contextual name chip for the nearest target (no permanent labels).
    this.labelChipText = this.add
      .text(0, 0, '', {
        color: '#fff',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setVisible(false);
    this.labelChip = this.add
      .rectangle(0, 0, 10, 10, 0x101820, 0.92)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld - 1)
      .setVisible(false);

    this.interactKeyE = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    // ESC pauses to the existing Menu scene (resume-in-place). OS key
    // autorepeat is ignored so a held ESC cannot oscillate pause/resume,
    // and ESC is inert during a forward-transition fade.
    this.input.keyboard!.on('keydown-ESC', (event: KeyboardEvent) => {
      if (event.repeat || this.transitioning) {
        return;
      }

      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.menu, { resumeKey: this.scene.key });
    });

    // Interactive inventory foundation — the minimum shared integration:
    // I opens the modal inventory overlay (pause-and-launch, Menu
    // precedent above). Presentation-only; the zone layer stays
    // event-free and the overlay scene owns all inventory behaviour.
    wireInventoryOverlayKey(this, {
      isEligible: () => !this.transitioning,
    });

    // Audio: existing procedural ambience per theme; M toggles mute.
    unlockAudio();
    this.input.keyboard!.once('keydown', () => unlockAudio());
    this.input.once('pointerdown', () => unlockAudio());
    this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
      if (!event.repeat) {
        toggleAudioMuted();
      }
    });
    startAmbience(layout.theme === 'exterior' ? 'exterior' : 'interior');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopAmbience());

    this.populateZone();

    if (this.forward === null) {
      throw new Error(
        `Zone "${this.zoneKey}" declared no forward transition (setForward)`,
      );
    }
  }

  /** Registers an inactive station shell (visual + contextual inspect). */
  protected addShell(config: ZoneShellConfig) {
    this.buildMarkerVisual(config.x, config.y, config.texture, false);
    this.shells.push(config);
  }

  /**
   * Declares the zone's single forward transition (or, with a null
   * target, the Core Chamber endpoint) and its destination beacon.
   */
  protected setForward(config: ForwardConfig) {
    if (this.forward !== null) {
      throw new Error(
        `Zone "${this.zoneKey}" declared a second forward transition`,
      );
    }

    this.forward = config;
    this.buildMarkerVisual(config.x, config.y, config.texture, true);
    this.buildBeacon(config.x, config.y);
  }

  /** Purely decorative dressing: renders only when the texture exists. */
  protected addDecor(x: number, y: number, texture: string) {
    if (this.textures.exists(texture)) {
      this.add.image(x, y, texture);
    }
  }

  /**
   * Ambient, inactive figure (already-integrated NPC art). Purely
   * decorative — no interaction, no quest, no measurement.
   */
  protected addAmbientFigure(x: number, y: number, texture: string) {
    this.addDecor(x, y, texture);
  }

  /** Subtle overhead signage (muted; never an interactable cue). */
  protected addSignage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, {
        color: '#7f95a8',
        font: '11px monospace',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld - 2);
  }

  /** Dull-amber safety light, breathing slowly (Dock beacon precedent). */
  protected addSafetyLight(x: number, y: number) {
    const light = this.add.rectangle(x, y, 4, 4, 0x9a7a3a, 0.9);

    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: light,
        alpha: { from: 0.9, to: 0.3 },
        duration: 2100,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Dark equipment foundation plate under an exterior work pad. */
  protected addFoundation(x: number, y: number, width: number, height: number) {
    this.add
      .rectangle(x, y, width, height, 0x4a5869, 0.55)
      .setStrokeStyle(1, 0x3d4956)
      .setDepth(-0.2);
  }

  /** Marker visual: existing texture, else the shared placeholder look. */
  private buildMarkerVisual(
    x: number,
    y: number,
    texture: string | undefined,
    isTransition: boolean,
  ) {
    if (texture !== undefined && this.textures.exists(texture)) {
      this.add.image(x, y, texture);
      return;
    }

    this.add
      .rectangle(
        x,
        y,
        40,
        40,
        isTransition ? 0x3f5a66 : 0x1f7a8c,
        isTransition ? 1 : 0.8,
      )
      .setStrokeStyle(2, 0x5fd3c4);
  }

  /**
   * The single destination beacon: a pulsing cyan ring at the forward
   * transition, hidden on arrival. Pure guidance presentation.
   */
  private buildBeacon(x: number, y: number) {
    const ring = this.add
      .rectangle(x, y + 44, 52, 20, 0x5fd3c4, 0.18)
      .setStrokeStyle(2, 0x5fd3c4)
      .setDepth(Depth.AbovePlayer);
    const arrow = this.add
      .text(x, y + 44, '▴', {
        color: '#5fd3c4',
        font: '14px monospace',
      })
      .setOrigin(0.5)
      .setDepth(Depth.AbovePlayer);

    this.beacon = [ring, arrow];

    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: this.beacon,
        alpha: { from: 1, to: 0.35 },
        duration: 700,
        repeat: -1,
        yoyo: true,
      });
    }
  }

  private setBeaconVisible(visible: boolean) {
    if (visible === this.beaconShown) {
      return;
    }

    this.beaconShown = visible;

    for (const part of this.beacon) {
      (part as Phaser.GameObjects.Rectangle).setVisible(visible);
    }
  }

  /** Transient neutral feedback line (top-centre; display-only timer). */
  protected showZoneFeedback(message: string) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__zoneFeedbackText = message;
    }

    // Cancel the previous message's removal timer so it cannot truncate
    // this newer message's display window.
    this.feedbackTimer?.remove();
    this.feedbackMessage?.destroy();
    this.feedbackMessage = this.add
      .text(400, 72, message, {
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

    this.feedbackTimer = this.time.delayedCall(2600, () => {
      this.feedbackMessage?.destroy();
      this.feedbackMessage = null;
      this.feedbackTimer = null;
    });
  }

  private interactJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.player.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.interactKeyE)
    );
  }

  private updateProximity() {
    // Read (and thereby clear) the interact JustDown flags EVERY frame:
    // Phaser's JustDown latches until read, so a press made with nothing
    // in range must never fire later, the moment a target enters range
    // (buffered-press guard).
    const interactPressed = this.interactJustPressed();

    if (this.transitioning) {
      this.activeTarget = null;
      this.proximityPrompt.setVisible(false);
      this.labelChip.setVisible(false);
      this.labelChipText.setVisible(false);
      return;
    }

    let nearest: ProximityTarget | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const shell of this.shells) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        shell.x,
        shell.y,
      );

      if (distance < INTERACTION_RANGE && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { kind: 'shell', x: shell.x, y: shell.y, shell };
      }
    }

    const forward = this.forward!;
    const forwardDistance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      forward.x,
      forward.y,
    );

    if (
      forwardDistance < INTERACTION_RANGE &&
      forwardDistance < nearestDistance
    ) {
      nearest = { kind: 'forward', x: forward.x, y: forward.y };
    }

    this.activeTarget = nearest;

    if (nearest === null) {
      this.proximityPrompt.setVisible(false);
      this.labelChip.setVisible(false);
      this.labelChipText.setVisible(false);
      return;
    }

    const label =
      nearest.kind === 'forward' ? forward.label : nearest.shell!.label;
    const action =
      nearest.kind === 'forward' && forward.targetSceneKey !== null
        ? 'SPACE / E — proceed'
        : 'SPACE / E — inspect';

    // Name chip above, action hint below it (both clamped into view).
    this.labelChipText
      .setText(label)
      .setPosition(Phaser.Math.Clamp(nearest.x, 60, 740), nearest.y - 58);
    this.labelChip
      .setSize(
        Math.ceil(this.labelChipText.width),
        Math.ceil(this.labelChipText.height),
      )
      .setPosition(this.labelChipText.x, this.labelChipText.y)
      .setVisible(true);
    this.labelChipText.setVisible(true);

    const promptHalf = this.proximityPrompt.width / 2 || 60;

    this.proximityPrompt
      .setText(action)
      .setPosition(
        Phaser.Math.Clamp(nearest.x, promptHalf + 2, 798 - promptHalf),
        nearest.y - 34,
      )
      .setVisible(true);

    if (interactPressed) {
      if (nearest.kind === 'shell') {
        sfxUiSelect();
        this.showZoneFeedback(nearest.shell!.description);
      } else if (forward.targetSceneKey !== null) {
        this.startForwardTransition(forward.targetSceneKey);
      } else {
        sfxUiSelect();
        this.showZoneFeedback(
          forward.endpointDescription ??
            'Core Chamber. Assessment route endpoint.',
        );
      }
    }
  }

  private startForwardTransition(targetSceneKey: string) {
    if (this.transitioning) {
      return;
    }

    this.transitioning = true;
    sfxDoor();

    const camera = this.cameras.main;

    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(targetSceneKey);
    });
    // Force-restart the shared fade effect (SceneRouter precedent): a
    // fade already in progress would otherwise swallow FADE_OUT_COMPLETE.
    camera.fadeEffect.start(true, 250, 0, 0, 0, true);
  }

  /** Core Chamber endpoint: completes on arrival, never on task success. */
  private updateEndpoint() {
    const forward = this.forward!;

    if (forward.targetSceneKey !== null || this.completed) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      forward.x,
      forward.y,
    );

    if (distance < ENDPOINT_RANGE) {
      this.completed = true;
      this.hud.setObjective(ROUTE_COMPLETE_OBJECTIVE);
      this.showZoneFeedback(
        'Core Chamber reached. The assessment route preview is complete.',
      );
    }
  }

  update() {
    if (this.transitioning) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
    } else {
      this.player.update();
    }

    this.updateProximity();
    this.updateEndpoint();

    // Beacon guidance: hidden once the player has arrived at the
    // destination (or the endpoint has completed).
    const forward = this.forward!;
    const arrival =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        forward.x,
        forward.y,
      ) < BEACON_ARRIVAL_RANGE;

    this.setBeaconVisible(!arrival && !this.completed);

    // DEV-only, read-only probes (__playerProbe shape matches RoomScene).
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__playerProbe = {
        scene: this.scene.key,
        x: this.player.x,
        y: this.player.y,
      };
      window.__zoneProbe = {
        zone: this.zoneKey,
        objective: this.hud.currentObjective(),
        legendVisible: this.hud.isLegendVisible(),
        beaconVisible: this.beaconShown,
        completed: this.completed,
      };
    }
  }
}
