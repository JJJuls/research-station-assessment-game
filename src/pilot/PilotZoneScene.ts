/**
 * PilotZoneScene — base scene of the professional pilot route (Unit 2;
 * World V1 presentation).
 *
 * Extends RoomScene (stations, doors, prompt cards, NPCs, C/D/F field
 * actions, inventory belt + I overlay, ESC pause) with the pilot guidance
 * layer: the mission card (act title + one next action), ONE guidance
 * target — the current route destination, shown by the target's lamp
 * class and a single light pool, never by a ring or an arrow — the M
 * station map, the H controls overlay (hidden by default), a small zone
 * title card, bidirectional doors with per-entry spawns, and short NPC
 * beats. Every `pilot_*` event is unmapped route telemetry.
 *
 * Scientific boundary: nothing here reads measurement outcomes except the
 * guidance target's "is this guided station terminal?" predicate, which
 * steers presentation only and never gates a door or a stage.
 */
import Phaser from 'phaser';

import { Depth, key } from '../constants';
import type { ControlsReferenceOptions } from '../gameplay';
import { prefersReducedMotion } from '../inventory/ui/theme';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomDoorConfig,
  RoomStationConfig,
} from '../world/RoomScene';
import { RoomScene } from '../world/RoomScene';
import { pilotLaunchMode, refreshPilotCoverageProbe } from './pilotCoverage';
import type { PilotBeaconTarget, PilotStage, PilotZoneKey } from './pilotRoute';
import {
  installPilotRouteLogSink,
  notePilotZoneEntered,
  onPilotRouteChange,
  PILOT_DOORS,
  PILOT_EPISODE_NAMES,
  PILOT_ZONE_NAMES,
  pilotBeaconTarget,
  pilotEpisode,
  pilotMissionLog,
  pilotObjective,
  pilotRouteSummary,
  pilotStage,
  pilotStageZone,
} from './pilotRoute';
import { noteM09ReminderLogViewed } from './windows/m09MonitorWatch';
import { WorldBundleLayer } from './worldBundles';

/** Guidance target counts as reached inside this radius (arrival). */
const BEACON_ARRIVAL_RANGE = 120;

/**
 * V4 Unit 6 (stale objective removal): once the participant stands in the
 * stage's destination zone, the route line names the action in the room
 * instead of the door already passed (the Core Chamber precedent). One
 * line per travel stage; every other stage keeps its route text.
 */
const LOCAL_OBJECTIVES: Partial<Record<PilotStage, string>> = {
  workshop: 'Take the shift orders at the Work Order Board.',
  lab_briefing: 'Report to Kai at the briefing desk.',
  exterior_briefing: 'Report to Noor on the airlock apron.',
  return_hub: 'Check in with Vale at the operations desk.',
  deck_closure: 'Close the station record at the Shift Review Panel.',
};

/** Pilot controls legend (mission §8 key set; hidden until H). */
export const PILOT_CONTROLS_LINES = [
  'CONTROLS  (H hides)',
  'Arrows   move',
  'E/SPACE  interact',
  'I        inventory',
  'C        scan',
  'D        dig',
  'F        magnet rig',
  'M        map / log',
  'ESC      close/pause',
] as const;

declare global {
  interface Window {
    /**
     * DEV-only, read-only pilot guidance probe (RoomScene probe precedent):
     * current zone, stage, objective text, guidance target and whether
     * the guidance is active (target not yet reached).
     */
    __pilotProbe?: {
      zone: string;
      stage: string;
      episode: number;
      objective: string;
      beacon: (PilotBeaconTarget & { visible: boolean }) | null;
      launch_mode: string;
      route: ReturnType<typeof pilotRouteSummary>;
      mission_log: ReturnType<typeof pilotMissionLog>;
    } | null;
    /** DEV-only: last zone title card text (cleared on each zone create). */
    __pilotZoneTitle?: string | null;
    /** DEV-only: world bundles in the current zone. */
    __pilotBundles?: {
      count: number;
      nearest: string | null;
      bundles: { id: string; label: string; x: number; y: number }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__pilotProbe = null;
  window.__pilotZoneTitle = null;
}

export interface PilotDoorSpec {
  to: PilotZoneKey;
  /** Spawn hint the destination reads (its getSpawn data). */
  spawn: string;
  texture?: string;
  /** Frame of a strip texture (Unit 7 airlock iris). */
  textureFrame?: number;
  /**
   * Dynamic gate (Unit 6 Core door): a neutral sealed message keeps the
   * door shut this time; null opens it. Navigation only — never reads
   * task performance (RoomDoorConfig.gate).
   */
  gate?: () => string | null;
  /** World V1: stable registry id. */
  registryId?: string;
}

/** A short NPC beat: ≤3 lines of body and ≤4 options. */
export interface PilotNpcBeat {
  body: string;
  options: {
    label: string;
    feedback?: string;
    onSelected?: () => void;
    nextStage?: () => PromptStage | null;
    /** Telemetry tag recorded with the choice (no construct meaning). */
    tag: string;
  }[];
}

export abstract class PilotZoneScene extends RoomScene {
  protected abstract readonly zoneKey: PilotZoneKey;

  /** Recoverable world items (Unit 3); pickups go through the inventory store. */
  protected bundles!: WorldBundleLayer;

  private beaconTarget: PilotBeaconTarget | null = null;
  private unsubscribeRoute: (() => void) | null = null;
  private mapOpen = false;

  protected questLineEnabled(): boolean {
    return false;
  }

  protected muteKeyEnabled(): boolean {
    return false;
  }

  protected promptClampMaxX(): number {
    return 798;
  }

  /** World V1: the belt is relevant only where field tools are used. */
  protected hotbarVisible(): boolean {
    return this.zoneKey === 'exterior_recovery_yard';
  }

  /** World V1 mission-card title: the current act (episode) name. */
  protected buildMissionCardTitle(): string {
    return PILOT_EPISODE_NAMES[pilotEpisode()];
  }

  protected controlsReferenceOptions(): ControlsReferenceOptions {
    return {
      startVisible: false,
      // Review A-3: the field-action keys are listed only where they act.
      lines:
        this.zoneKey === 'exterior_recovery_yard'
          ? PILOT_CONTROLS_LINES
          : PILOT_CONTROLS_LINES.filter((line) => !/^[CDF]\s/.test(line)),
      panelY: 404,
      onToggle: (shown) =>
        this.logScenarioEvent('pilotRoute', 'pilot_controls_toggled', {
          metadata: { shown, zone: this.zoneKey },
        }),
    };
  }

  /** The ONE objective line: the pilot route objective. */
  protected buildRouteObjectiveText(): string {
    const stage = pilotStage();
    const local = LOCAL_OBJECTIVES[stage];

    if (local !== undefined && pilotStageZone(stage) === this.zoneKey) {
      return local;
    }

    return pilotObjective();
  }

  create(data?: { spawn?: string }) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotZoneTitle = null;
    }

    // Route telemetry sink: every pilot_* event rides the unmapped
    // scenario-telemetry path of THIS scene.
    installPilotRouteLogSink((eventType, metadata) =>
      this.logScenarioEvent('pilotRoute', eventType, { metadata }),
    );

    // The bundle layer exists before populateRoom() (called by super.create)
    // so zones can spawn incoming supplies while populating. Drop bounds
    // follow the room once the map exists (set in onRoomReady).
    this.bundles = new WorldBundleLayer(
      this,
      (message) => this.showFeedbackMessage(message),
      this.bundleDropBounds(),
    );

    super.create(data);

    notePilotZoneEntered(this.zoneKey, Date.now());
    this.refreshRouteObjective();
    this.showZoneTitle();
    this.retargetBeacon();

    this.unsubscribeRoute = onPilotRouteChange(() => {
      this.refreshRouteObjective();
      this.retargetBeacon();
    });

    // M — station map (modal, pause-and-launch like the inventory overlay).
    this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
      if (event.repeat || !this.physicalInputEligible() || this.mapOpen) {
        return;
      }

      this.openStationMap();
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.mapOpen = false;
      this.input.keyboard?.resetKeys();
      // Confirmed overlay world drops land at the participant's feet as
      // recoverable bundles (never destroyed).
      this.bundles.materialiseDrops(this.player.x, this.player.y);
      this.refreshRouteObjective();
      this.retargetBeacon();
      refreshPilotCoverageProbe();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRoute?.();
      this.unsubscribeRoute = null;
      installPilotRouteLogSink(null);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__pilotProbe = null;
      }
    });

    refreshPilotCoverageProbe();
  }

  /** Room bounds for materialised drops (zones with rebuilt layouts override). */
  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 800, height: 560 };
  }

  // ——— Presentation tokens (Unit 7) ——————————————————————————————————

  /**
   * One shared area-signage style for every zone: dim, small caps, no
   * plate — a landmark for the eye, never a label floating over an object
   * (status chips keep their plate). Presentation only. (Zones not yet
   * rebuilt; the World V1 zones use addWallSign.)
   */
  protected zoneSignage(
    x: number,
    y: number,
    text: string,
    dark = true,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        color: dark ? '#8497aa' : '#3d4d5c',
        font: '11px monospace',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  // ——— Doors ———————————————————————————————————————————————————————————

  /**
   * Adds a pilot zone door toward `spec.to`. Position and label come from
   * the shared zone graph so the guidance and the door always agree; the
   * transition writes the destination's spawn hint. Every ordinary door is
   * declared in both zones (bidirectional by construction).
   */
  protected addPilotDoor(spec: PilotDoorSpec) {
    const ref = PILOT_DOORS[this.zoneKey].find((door) => door.to === spec.to);

    if (ref === undefined) {
      throw new Error(
        `PilotZoneScene: no door from ${this.zoneKey} to ${spec.to} in PILOT_DOORS`,
      );
    }

    const config: RoomDoorConfig = {
      x: ref.x,
      y: ref.y,
      label: ref.label,
      verb: 'Go to',
      registryId: spec.registryId,
      // Unit 7 (V9): interior doors show a door leaf instead of the bare
      // cyan marker (PROVISIONAL pack art; the marker remains the fallback).
      texture:
        spec.texture ??
        (this.textures.exists('plv1-arch-door') ? 'plv1-arch-door' : undefined),
      textureFrame: spec.textureFrame,
      interactionKey: 'pilotDoor',
      eventType: 'pilot_door_used',
      eventMetadata: { from: this.zoneKey, to: spec.to },
      target: {
        sceneKey: spec.to,
        roomId: spec.to,
        spawn: spec.spawn,
      },
      gate: spec.gate,
    };

    this.addDoor(config);
  }

  // ——— NPC beats ——————————————————————————————————————————————————————

  /**
   * Builds the prompt options for one short NPC beat. Each choice logs one
   * `pilot_npc_beat` event (npc + tag) — navigation telemetry, no construct.
   */
  protected npcBeatOptions(
    npcKey: 'pilotVale' | 'pilotKai' | 'pilotNoor' | 'pilotWorkOrderBoard',
    beat: PilotNpcBeat,
  ): PromptOption[] {
    if (beat.options.length === 0 || beat.options.length > 4) {
      throw new Error('PilotZoneScene: an NPC beat has 1–4 options');
    }

    return beat.options.map((option) => ({
      label: option.label,
      feedback: option.feedback ?? '',
      getEventTypes: () => [],
      onSelected: () => {
        this.logScenarioEvent(npcKey, 'pilot_npc_beat', {
          choice_value: option.tag,
          metadata: { zone: this.zoneKey, stage: pilotStage() },
        });
        option.onSelected?.();
      },
      nextStage: option.nextStage,
    }));
  }

  /** Body text for an NPC beat, injected at prompt-open time. */
  protected npcBeatStage(beat: PilotNpcBeat): PromptStage {
    return { body: beat.body, options: [] };
  }

  // ——— Guidance presentation ————————————————————————————————————————————

  private showZoneTitle() {
    const name = PILOT_ZONE_NAMES[this.zoneKey];

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotZoneTitle = name;
    }

    // World V1: a small card under the mission card (top-left), never
    // over the play route; withdrawn after 2 s.
    const title = this.add
      .text(8, 76, name.toUpperCase(), {
        color: '#dfe9f1',
        font: '12px monospace',
        backgroundColor: '#101820',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0)
      .setDepth(Depth.AbovePlayer + 5)
      .setScrollFactor(0);

    if (prefersReducedMotion()) {
      this.time.delayedCall(2600, () => title.destroy());
      return;
    }

    this.tweens.add({
      targets: title,
      alpha: 0,
      delay: 2000,
      duration: 600,
      onComplete: () => title.destroy(),
    });
  }

  private retargetBeacon() {
    this.beaconTarget = pilotBeaconTarget(this.zoneKey, Date.now());
  }

  /**
   * World V1: the current guidance target is the class-1 object of the
   * zone (lamp + light pool). An object matches by position (the route
   * model mirrors the scene coordinates).
   */
  protected isGuidanceTarget(
    config: RoomStationConfig | RoomDoorConfig,
  ): boolean {
    const target = this.beaconTarget;

    return (
      target !== null &&
      this.beaconVisibleNow() &&
      Math.abs(config.x - target.x) < 1 &&
      Math.abs(config.y - target.y) < 1
    );
  }

  /**
   * V4 Unit 6 (reviews R2 / Y7): a world readout chip is shown only while
   * its full bounds lie inside the world camera view, so a half-clipped
   * word never reads as a rendering fault. Zones pass their chips.
   */
  protected clampWorldReadouts(
    chips: readonly (Phaser.GameObjects.Text | null)[],
  ) {
    const view = this.plate.view;

    for (const chip of chips) {
      if (chip === null || !chip.active) {
        continue;
      }

      const bounds = chip.getBounds();
      // Review V-6: a chip stays while at least 60 % of it is in view;
      // review V-7: the objective band (top 30 world px) counts as covered.
      const visibleLeft = Math.max(bounds.left, view.x);
      const visibleRight = Math.min(bounds.right, view.right);
      const visibleTop = Math.max(bounds.top, view.y + 30);
      const visibleBottom = Math.min(bounds.bottom, view.bottom);
      const fraction =
        (Math.max(0, visibleRight - visibleLeft) *
          Math.max(0, visibleBottom - visibleTop)) /
        Math.max(1, bounds.width * bounds.height);

      chip.setVisible(chip.text.length > 0 && fraction >= 0.6);
    }
  }

  private beaconVisibleNow(): boolean {
    if (this.beaconTarget === null) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.beaconTarget.x,
      this.beaconTarget.y,
    );

    return distance >= BEACON_ARRIVAL_RANGE && !this.isTransitioning();
  }

  private openStationMap() {
    this.mapOpen = true;
    // Pilot V3 (Unit 4, V2 finding U8-7): the map/mission-log overlay is
    // the M09/M10 reminder exposure the ledger declares as a control
    // variable; it was declared but never recorded before this call.
    noteM09ReminderLogViewed();
    this.logScenarioEvent('pilotRoute', 'pilot_map_opened', {
      metadata: { zone: this.zoneKey },
    });
    this.scene.pause(this.scene.key);
    this.scene.launch(key.scene.pilotStationMap, {
      resumeKey: this.scene.key,
      zone: this.zoneKey,
    });
  }

  /**
   * Zone-driven guidance refresh (Unit 4): a zone whose guided stations
   * become terminal WITHOUT a route-stage change (the exterior sites)
   * re-reads the objective line and retargets the guidance here.
   */
  protected refreshGuidance(): void {
    this.refreshRouteObjective();
    this.retargetBeacon();
  }

  /** Per-frame guidance refresh; subclasses override onPilotUpdate. */
  protected onRoomUpdate(): void {
    const visible = this.beaconVisibleNow();

    this.onPilotUpdate();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotProbe = {
        zone: this.zoneKey,
        stage: pilotStage(),
        episode: pilotEpisode(),
        // The displayed line (a zone may narrow the route objective to
        // its current site — Unit 4); never a second line.
        objective: this.buildRouteObjectiveText(),
        beacon:
          this.beaconTarget === null ? null : { ...this.beaconTarget, visible },
        launch_mode: pilotLaunchMode(),
        route: pilotRouteSummary(),
        mission_log: pilotMissionLog(),
      };
      window.__pilotBundles = {
        count: this.bundles.count(),
        nearest:
          this.bundles.nearest(this.player.x, this.player.y)?.label ?? null,
        bundles: this.bundles.serialize(),
      };
    }
  }

  /** Zone-specific per-frame hook (field actions, etc.). */
  protected onPilotUpdate(): void {}

  /** SPACE/E with no station/door in range collects a bundle in reach. */
  protected onEmptyInteract(): void {
    if (this.bundles.tryCollectNearest(this.player.x, this.player.y)) {
      // Presentation only (pilot Unit 6): one-shot pickup animation.
      this.player.playActionAnim('pickup');
    }
  }

  /** World V1: the nearest bundle in reach announces itself in the prompt. */
  protected auxPrompt(): { text: string; x: number; y: number } | null {
    const bundle = this.bundles.nearest(this.player.x, this.player.y);

    return bundle === null
      ? null
      : {
          text: `E — Take ${bundle.label.toLowerCase()}`,
          x: bundle.x,
          y: bundle.y,
        };
  }

  /** Pilot zones allow overlay world drops (materialised as bundles). */
  protected inventoryOverlayLaunchData(): {
    mode: 'backpack';
    allowWorldDrop?: boolean;
  } {
    return { mode: 'backpack', allowWorldDrop: true };
  }

  /** Default: no prompt options unless a subclass declares them. */
  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    void interactionKey;

    return [];
  }
}
