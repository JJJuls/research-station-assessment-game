import Phaser from 'phaser';

import { DepthLayer, key, worldDepth } from '../constants';
import { prefersReducedMotion } from '../inventory/ui/theme';
import { pilotLaunchMode } from '../pilot/pilotCoverage';
import {
  notePilotZoneEntered,
  onPilotRouteChange,
  pilotStage,
  pilotStageAtOrAfter,
} from '../pilot/pilotRoute';
import { PILOT_CONTROLS_LINES } from '../pilot/PilotZoneScene';
import {
  missionCardAction,
  OPENING_STATION_LINE,
  restorationState,
  storyActTitle,
} from '../pilot/storyState';
import { DOCK_SITES, LEGACY_DOCK_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { RoomScene, runOncePerSession } from '../world';
import { DOCK_LAYOUT, LEGACY_DOCK_LAYOUT } from '../world/layouts/dock';
import { isLegacyRoute } from '../world/SceneRouter';

/**
 * Idle-help parameters — OPEN SCIENTIFIC PARAMETERS (approved plan §12/§16.11).
 * No authoritative document defines the idle threshold for
 * `tutorial_help_shown` or the exact "idle" definition feeding
 * `baseline_idle_seconds`. Both mechanisms stay DISABLED (null) until the
 * user supplies values; they must never be chosen autonomously. When
 * enabled, the idle watcher surfaces the help prompt and accumulates
 * baseline idle time without ever blocking progress (Dock doc,
 * failure/edge cases).
 */
const DOCK_IDLE_HELP_THRESHOLD_MS: number | null = null;

const TILE = 32;

/** Airlock strip: frame 0 closed … frame 4 open (worldV1Assets.ts). */
const AIRLOCK_CLOSED_FRAME = 0;
const AIRLOCK_OPEN_FRAME = 4;

/**
 * Scripted arrival (storyboard frames 5–8, wall-clock ms after the cut):
 * the roof cover lifts, the participant steps from the seal to the exact
 * spawn while the iris closes behind them, the station line plays, and
 * control releases at a fixed end state shared with the skipped path.
 */
const ARRIVAL = {
  revealMs: 1800,
  stepStartMs: 1400,
  stepMs: 700,
  stationLineMs: 2300,
  releaseMs: 4600,
} as const;

declare global {
  interface Window {
    /**
     * DEV-only, read-only Dock geometry probe (World V1): the terminal,
     * the north door and the movement marker of the ACTIVE layout, so the
     * shared e2e tutorial helper drives the right coordinates on both
     * routes.
     */
    __dockProbe?: {
      layout: 'pilot' | 'legacy';
      terminal: { x: number; y: number };
      northDoor: { x: number; y: number };
      marker: { x: number; y: number };
      /** World V1 slice: the arrival script is still running. */
      arrival_playing: boolean;
      /** Dock restoration shape state (stage-driven). */
      cover: 'loose' | 'secured';
      lighting: string;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__dockProbe = null;
}

/**
 * Dock / Arrival Bay — V3 §4 Room 0, docs/game/rooms/00-dock-arrival.md.
 * Control/usability room only: every event carries study_item_ids: [] and
 * no construct_id. Canonical mini-game: arrival → movement instruction →
 * highlighted movement marker → first terminal interaction → readiness
 * confirm (or explicit skip). Legacy dock_* events keep firing alongside
 * canonical ones per event-schema.md §4's Dock alias table.
 *
 * World V1 production slice (world-layouts.json `dock`, 48×30): a
 * weather-sealed transfer hall. The south hull carries the docking seal
 * (the berth the shuttle docked at) and, west of it, the berth glazing
 * hall with the weather window; the inward service spine runs north to
 * the Concourse threshold; the arrival / handover bay with the check-in
 * terminal lies east of the spine; cargo staging sits behind the spine to
 * the north-west. `?route=legacy` keeps the V4 bay and its coordinates
 * byte-for-byte for the historical regression specs.
 */
export class DockScene extends RoomScene {
  protected readonly roomId = 'dock_arrival';
  protected readonly roomInteractionKey: InteractionKey = 'dockArrivalTutorial';

  private controlErrorCount = 0;
  private controlErrorLogged = false;
  private marker!: Phaser.GameObjects.Ellipse;
  private markerPulse: Phaser.Tweens.Tween | null = null;
  private markerReached = false;
  private idleSinceMs: number | null = null;
  private arrivalPlaying = false;
  private unsubscribeRoute: (() => void) | null = null;

  /** Restoration presentation (stage-driven; presentation only). */
  private coverImage: Phaser.GameObjects.Image | null = null;
  private serviceLamps: Phaser.GameObjects.Image[] = [];
  private stripLights: Phaser.GameObjects.Image[] = [];
  private workPools: Phaser.GameObjects.Image[] = [];

  constructor() {
    super(key.scene.dock);
  }

  /** The V4 bay for the legacy ring; the World V1 bay for participants. */
  private legacyLayout(): boolean {
    return isLegacyRoute();
  }

  private sites() {
    return this.legacyLayout() ? LEGACY_DOCK_SITES : DOCK_SITES;
  }

  protected getLayout(): RoomLayout {
    return this.legacyLayout()
      ? { theme: 'dock', grid: [...LEGACY_DOCK_LAYOUT] }
      : { theme: 'dock', grid: [...DOCK_LAYOUT], field: 'wide' };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Returning from the station spawns just inside the north door; a
    // fresh arrival spawns on the berth threshold, inside the sealed
    // docking airlock — both outside every door's 72 px interaction radius.
    if (this.legacyLayout()) {
      if (
        data?.spawn === 'station_hub' ||
        data?.spawn === 'station_concourse'
      ) {
        return LEGACY_DOCK_SITES.spawnFromHub;
      }

      return LEGACY_DOCK_SITES.spawnArrival;
    }

    if (data?.spawn === 'station_hub' || data?.spawn === 'station_concourse') {
      return DOCK_SITES.spawnFromConcourse;
    }

    return DOCK_SITES.spawnArrival;
  }

  /**
   * Professional pilot route: the north door leads into the Station
   * Concourse (participant default). `?route=legacy` keeps the historical
   * Hub target for the legacy regression specs.
   */
  private northDoorTarget() {
    if (isLegacyRoute()) {
      return {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'dock_arrival',
      };
    }

    return {
      sceneKey: key.scene.stationConcourse,
      roomId: 'station_concourse',
      spawn: 'dock',
    };
  }

  protected populateRoom(): void {
    const sites = this.sites();

    this.coverImage = null;
    this.serviceLamps = [];
    this.stripLights = [];
    this.workPools = [];
    this.markerReached = false;

    // Arrival terminal (Station AI).
    this.addStation({
      interactionKey: 'dockArrivalTutorial',
      label: this.legacyLayout() ? 'Arrival Terminal' : 'arrival terminal',
      verb: 'Check in at',
      registryId: 'dock.arrival_terminal',
      texture: this.legacyLayout()
        ? 'prop-dock-terminal'
        : 'w1-terminal-available',
      x: sites.terminal.x,
      y: sites.terminal.y,
      promptBody:
        'The dock system checks whether you understand the basic controls before station tasks begin. What do you do?',
      // World V1 (U2, visual review V5): once the check-in is logged the
      // terminal is a class-5 (completed) object — the prompt reads its
      // state and E shows it, instead of a stale "Check in" verb.
      availability: () =>
        this.isPilotRoute() && this.isTutorialCompleted() ? 'checked in' : null,
      onPromptOpened: () => {
        runOncePerSession('dock_first_interaction', () => {
          this.logRoomEvent('dockArrivalTutorial', 'first_interaction');
        });

        if (this.isTutorialCompleted()) {
          this.showFeedbackMessage(
            'The dock tutorial has already been logged. Continue into the station.',
          );
          return false;
        }

        this.logRoomEvent('dockArrivalTutorial', 'dock_tutorial_opened');
        return true;
      },
    });

    // North door: Station Concourse on the pilot route (Phase C's Hub
    // target survives under ?route=legacy).
    const northTarget = this.northDoorTarget();

    this.addDoor({
      x: sites.northDoor.x,
      y: sites.northDoor.y,
      label: isLegacyRoute() ? 'Station Hub' : 'Station Concourse',
      verb: 'Go to',
      registryId: 'dock.door_concourse',
      texture: this.legacyLayout()
        ? this.textures.exists('plv1-arch-door')
          ? 'plv1-arch-door'
          : 'prop-dock-airlock'
        : 'w1-door-north-closed',
      interactionKey: 'dockArrivalTutorial',
      target: northTarget,
    });

    if (this.legacyLayout()) {
      this.buildLegacyBay();
    } else {
      this.buildArrivalHall();
      this.refreshDockState();
    }

    this.publishDockProbe();
  }

  private publishDockProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const sites = this.sites();

    window.__dockProbe = {
      layout: this.legacyLayout() ? 'legacy' : 'pilot',
      terminal: { ...sites.terminal },
      northDoor: { ...sites.northDoor },
      marker: { ...sites.marker },
      arrival_playing: this.arrivalPlaying,
      cover: this.coverSecured() ? 'secured' : 'loose',
      lighting: this.isPilotRoute()
        ? restorationState('lighting', pilotStage())
        : 'n/a',
    };
  }

  /**
   * The arrival hall (world-layouts.json `dock`): every prop stands on an
   * authored footprint of DOCK_FOOTPRINTS (collision) or is flat floor /
   * wall dressing. Nothing here logs, gates or moves an interactable.
   */
  private buildArrivalHall() {
    const S = DOCK_SITES;
    const px = (tile: number) => tile * TILE;

    // ——— South hull: the docking seal (sealed class-4 door) ———
    // The leaf is wall-mounted (always behind the actor); frame 0 closed.
    this.addDoor({
      x: S.dockingAirlock.x,
      y: S.dockingAirlock.y,
      label: 'docking airlock',
      verb: 'Docking airlock',
      registryId: 'dock.docking_airlock',
      texture: 'w1-airlock-open-strip',
      textureFrame: AIRLOCK_CLOSED_FRAME,
      interactionKey: 'dockArrivalTutorial',
      availability: () => 'shuttle secured',
      sealedMessage: 'Docking airlock sealed — the shuttle is secured.',
    });
    this.anchorWallMounted('dock.docking_airlock', px(30) + 6);
    // Caution sill and a status lamp either side of the seal.
    this.addFloorDecal(S.dockingAirlock.x, px(27) + 26, 'kit-hazard-strip');
    this.wallProp(px(21) + 8, px(29) - 6, 'w1-status-lamp');
    this.wallProp(px(26) + 24, px(29) - 6, 'w1-status-lamp');

    // ——— Berth glazing hall (south-west): weather windows and the bench ———
    for (const col of [4.5, 8, 11.5, 15]) {
      this.wallProp(px(col) + 16, px(30) + 2, 'w1-dock-window');
    }
    this.prop(px(8.5), px(25), 'w1-chair');
    this.prop(px(9.5), px(25), 'w1-chair');
    this.prop(px(10.5), px(25), 'w1-waste-bin');
    this.prop(px(4.5), px(27), 'w1-filing-cabinet');
    this.prop(px(18), px(27), 'w1-tool-cart');
    this.prop(px(19), px(25) - 4, 'w1-cable-coil');
    // The loose weather cover beside the sealed berth (restoration shape
    // `dock-weather-cover`): crew secures it at handover_briefing.
    this.coverImage = this.prop(px(13.5), px(28), 'w1-cover-loose');
    this.addFloorDecal(px(13.5), px(28) - 2, 'kit-contact-shadow');

    // ——— North hull: the Concourse threshold ———
    this.anchorWallMounted('dock.door_concourse', px(2) + 8);
    this.wallProp(px(27) + 8, px(2) - 8, 'w1-intercom');
    this.wallProp(px(20) + 20, px(2) - 8, 'w1-junction-box');

    // ——— Spine: painted service lane from the berth to the threshold ———
    this.addFloorLane(22, 2, 4, 26);
    this.workPools.push(this.pool(S.dockingAirlock.x, px(26), 0.7)!);
    this.workPools.push(this.pool(S.northDoor.x, px(4), 0.55)!);

    // ——— Arrival / handover bay (east): the check-in terminal ———
    this.addFloorDecal(S.terminal.x, S.terminal.y - 2, 'kit-contact-shadow');
    // Check-in pad: a painted service pad and caution edge make the
    // terminal the bay's landmark (review round 1).
    this.addFloorLane(29, 20, 2, 2);
    this.addFloorDecal(S.terminal.x - 16, px(22) - 4, 'kit-hazard-strip');
    this.addFloorDecal(S.terminal.x + 16, px(22) - 4, 'kit-hazard-strip');
    this.prop(px(36.5), px(17), 'w1-notice-board');
    this.prop(px(34), px(23), 'w1-document-trolley');
    this.prop(px(28), px(16) + 20, 'w1-chair');
    this.prop(px(38.5), px(21), 'w1-radio-cradle');
    this.serviceLamps.push(
      this.prop(px(33), px(19), 'w1-service-lamp-standby')!,
    );
    this.workPools.push(this.pool(S.terminal.x, px(21), 0.6)!);
    // Contained crates in the bay's south recess (authority decor rect).
    this.prop(px(37), px(26), 'w1-crate-stack');
    this.prop(px(39.5), px(26), 'w1-crate-stack');
    this.prop(px(36), px(25), 'w1-crate');
    this.prop(px(40.5), px(24) + 28, 'w1-hazard-sign');

    // ——— Cargo staging (north-west): behind the spine, off every path ———
    this.prop(px(8), px(10), 'w1-crate-stack');
    this.prop(px(11), px(10), 'w1-crate-stack');
    this.prop(px(14), px(9), 'w1-pallet-jack');
    this.prop(px(7.5), px(13), 'w1-cable-drum');
    this.prop(px(9.5), px(13), 'w1-cable-spool');
    this.prop(px(16), px(14), 'w1-lockers');
    this.prop(px(5.5), px(13), 'w1-bollard');
    this.prop(px(11.5), px(13), 'w1-bollard');
    this.prop(px(6), px(9), 'w1-crate-b');
    this.addFloorDecal(px(12), px(15) - 10, 'kit-hazard-strip');
    this.addFloorDecal(px(14), px(15) - 10, 'kit-hazard-strip');
    this.serviceLamps.push(
      this.prop(px(17.5), px(9), 'w1-service-lamp-standby')!,
    );
    this.workPools.push(this.pool(px(11), px(12), 0.5)!);

    // ——— Wall utilities recess (north-west): the service frontage ———
    this.prop(px(4.5), px(6), 'w1-shelving');
    this.prop(px(6.5), px(6), 'w1-drum');
    this.wallProp(px(3) + 12, px(3) + 8, 'w1-junction-box');

    // ——— Local loops: sparse service dressing along the hull ———
    this.wallProp(px(43), px(6) + 2, 'w1-pipe-run');
    this.wallProp(px(43), px(21) + 2, 'w1-pipe-run');
    this.wallProp(px(3), px(20), 'w1-extinguisher');
    this.wallProp(px(44), px(12) + 8, 'w1-extinguisher');
    this.addFloorDecal(px(33), px(7) + 8, 'w1-vent-grille');
    this.addFloorDecal(px(12), px(22) + 8, 'w1-vent-grille');
    // Storm trace beside the berth: a torn panel fragment, swept aside.
    this.addFloorDecal(px(19.5), px(23) + 8, 'w1-debris-panel');

    // ——— Highlighted movement target (V3 Room 0 mini-game) ———
    // Reaching it is a mechanic, not an event — no canonical event exists
    // for it and none is invented. A floor ring on the spine with a
    // restrained pulse (held under reduced motion), removed once reached.
    this.buildMovementMarker(S.marker.x, S.marker.y);
  }

  /** A footprint prop anchored at its bottom-centre ground contact. */
  private prop(x: number, footY: number, texture: string) {
    return this.addKitProp(x, footY, texture);
  }

  /** Wall-mounted dressing: always behind the actor. */
  private wallProp(x: number, bottomY: number, texture: string) {
    return this.addGroundInfra(x, bottomY, texture);
  }

  /** Cold emergency pool now; warm work light once the lighting is restored. */
  private pool(x: number, y: number, alpha: number) {
    return this.addFloorDecal(x, y, 'kit-light-pool-cold', alpha);
  }

  /**
   * Re-anchors a door leaf as wall-mounted art: bottom-centre at the hull
   * line, depth below every actor. Interaction position/radius unchanged.
   */
  private anchorWallMounted(registryId: string, bottomY: number) {
    const image = this.doorImage(registryId);

    if (image !== null) {
      image.setOrigin(0.5, 1).setY(bottomY).setDepth(DepthLayer.GroundInfra);
    }
  }

  /** The V4 bay, byte-identical for the legacy regression specs. */
  private buildLegacyBay() {
    const S = LEGACY_DOCK_SITES;

    if (this.textures.exists('plv1-airlock-open')) {
      this.add
        .image(12 * TILE - 16, 12 * TILE + 18, 'plv1-airlock-open', 0)
        .setDepth(DepthLayer.LowProp);
    } else {
      this.addDecor(12 * TILE - 16, 12 * TILE + 8, 'prop-dock-airlock');
    }

    const laneX = 12 * TILE - 16;

    this.add
      .rectangle(laneX, 7 * TILE, 2 * TILE, 10 * TILE, 0x55627a, 0.22)
      .setDepth(DepthLayer.FloorDecal);
    for (let row = 2; row < 12; row += 1) {
      this.add
        .rectangle(laneX, row * TILE + 16, 4, 14, 0x8fa4b8, 0.35)
        .setDepth(DepthLayer.FloorMarking);
    }
    this.add
      .rectangle(laneX, 2 * TILE + 4, 2 * TILE - 8, 3, 0x5fd3c4, 0.5)
      .setDepth(DepthLayer.FloorMarking);

    this.addDecor(3 * TILE, 3.4 * TILE, 'proc-light-pool');
    this.add
      .rectangle(3 * TILE, 3 * TILE + 20, 3 * TILE, 2 * TILE, 0x55627a, 0.16)
      .setDepth(DepthLayer.FloorDecal);

    for (const x of [5.5, 8.5, 15.5, 18.5]) {
      if (this.textures.exists('proc-window-exterior')) {
        this.add
          .image(x * TILE, 46, 'proc-window-exterior')
          .setTint(0x7f93a8)
          .setDepth(DepthLayer.LowProp);
      }
    }
    this.addDecor(19 * TILE, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(21 * TILE + 4, 3 * TILE + 12, 'prop-dock-crates');
    this.addDecor(20 * TILE + 8, 4.6 * TILE, 'proc-crate-supply');
    this.addDecor(8.5 * TILE, 7 * TILE, 'prop-dock-crates');
    this.addDecor(21.5 * TILE, 7.5 * TILE, 'proc-locker-field');
    this.addDecor(21.5 * TILE, 10 * TILE, 'proc-cart-utility');
    this.addDecor(4.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(19.5 * TILE, 12 * TILE + 10, 'proc-wall-pipes');

    for (const [x, y] of [
      [9.4 * TILE, 9.4 * TILE],
      [14.6 * TILE, 9.4 * TILE],
      [9.4 * TILE, 11.6 * TILE],
      [14.6 * TILE, 11.6 * TILE],
    ] as const) {
      this.add
        .rectangle(x, y, 4, 4, 0x9a7a3a, 0.8)
        .setDepth(DepthLayer.FloorMarking);
    }

    this.buildMovementMarker(S.marker.x, S.marker.y);
  }

  private buildMovementMarker(x: number, y: number) {
    this.marker = this.add
      .ellipse(x, y, 44, 18, 0x5fd3c4, 0.22)
      .setStrokeStyle(2, 0x5fd3c4, 0.95)
      .setDepth(DepthLayer.FloorMarking);

    if (!prefersReducedMotion()) {
      this.markerPulse = this.tweens.add({
        targets: this.marker,
        alpha: { from: 1, to: 0.5 },
        duration: 900,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Participant pilot launch (not the legacy Hub ring, not a dev alias). */
  private isPilotRoute(): boolean {
    return pilotLaunchMode() === 'participant' && !isLegacyRoute();
  }

  // ——— Restoration (STORY-STATE-SPEC §4; world-layouts.json `dock.restoration_change`)

  /** Crew secures the weather cover once the handover stage is reached. */
  private coverSecured(): boolean {
    return this.isPilotRoute() && pilotStageAtOrAfter('handover_briefing');
  }

  /**
   * Presentation of the Dock's fixed crew state: the weather cover
   * (`dock-weather-cover`, trigger handover_briefing) and the shared
   * lighting element (cold emergency → steady service light from the
   * `workshop` stage). Stage-driven only; check-in/tutorial state and the
   * route collision are untouched.
   */
  private refreshDockState() {
    const secured = this.coverSecured();
    const lit =
      this.isPilotRoute() &&
      restorationState('lighting', pilotStage()) === 'restored';

    this.swapTexture(
      this.coverImage,
      secured ? 'w1-cover-secured' : 'w1-cover-loose',
    );

    for (const lamp of this.serviceLamps) {
      this.swapTexture(
        lamp,
        lit ? 'w1-service-lamp-steady' : 'w1-service-lamp-standby',
      );
    }

    for (const light of this.stripLights) {
      this.swapTexture(
        light,
        lit ? 'w1-strip-light-steady' : 'w1-strip-light-standby',
      );
    }

    for (const pool of this.workPools) {
      this.swapTexture(
        pool,
        lit ? 'kit-light-pool-warm' : 'kit-light-pool-cold',
      );
    }

    this.publishDockProbe();
  }

  private swapTexture(image: Phaser.GameObjects.Image | null, texture: string) {
    if (
      image !== null &&
      image.active &&
      image.texture.key !== texture &&
      this.textures.exists(texture)
    ) {
      image.setTexture(texture);
    }
  }

  create(data?: { spawn?: string }) {
    super.create(data);

    if (!this.isPilotRoute()) {
      return;
    }

    // Pilot guidance in the Dock: the route objective line, the station
    // map on M and the zone-entry bookkeeping (discovery + re-entry count).
    notePilotZoneEntered('dock', Date.now());
    this.refreshRouteObjective();
    this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
      if (event.repeat || !this.physicalInputEligible() || this.inputLocked) {
        return;
      }

      this.logScenarioEvent('pilotRoute', 'pilot_map_opened', {
        metadata: { zone: 'dock' },
      });
      this.scene.pause(this.scene.key);
      this.scene.launch(key.scene.pilotStationMap, {
        resumeKey: this.scene.key,
        zone: 'dock',
      });
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.input.keyboard?.resetKeys();
      this.refreshDockState();
    });

    this.unsubscribeRoute = onPilotRouteChange(() => {
      this.refreshRouteObjective();
      this.refreshDockState();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRoute?.();
      this.unsubscribeRoute = null;
    });
  }

  /**
   * World V1 (U2): the story state's next action for the Dock — the
   * check-in until it is logged (either path), then the station entrance.
   */
  protected buildRouteObjectiveText(): string {
    return this.isPilotRoute()
      ? missionCardAction(pilotStage(), 'dock', {
          dockCheckedIn: this.isTutorialCompleted(),
        })
      : super.buildRouteObjectiveText();
  }

  protected buildMissionCardTitle(): string {
    return this.isPilotRoute() ? storyActTitle(pilotStage()) : '';
  }

  /**
   * The Dock's guidance target: nothing while the movement marker is the
   * instruction (one cue at a time — gameplay review F1), then the terminal
   * until checked in, then the exit.
   */
  protected isGuidanceTarget(config: { x: number; y: number }): boolean {
    if (!this.isPilotRoute() || !this.markerReached) {
      return false;
    }

    const sites = this.sites();
    const target = this.isTutorialCompleted()
      ? sites.northDoor
      : sites.terminal;

    return (
      Math.abs(config.x - target.x) < 1 && Math.abs(config.y - target.y) < 1
    );
  }

  protected hotbarVisible(): boolean {
    return !this.isPilotRoute();
  }

  protected muteKeyEnabled(): boolean {
    return !this.isPilotRoute();
  }

  protected questLineEnabled(): boolean {
    return !this.isPilotRoute();
  }

  protected controlsReferenceOptions() {
    return this.isPilotRoute()
      ? { startVisible: false, lines: PILOT_CONTROLS_LINES, panelY: 404 }
      : undefined;
  }

  protected onRoomEntered(): void {
    runOncePerSession('dock_started', () => {
      this.logRoomEvent('dockArrivalTutorial', 'dock_started');
    });

    // Professional pilot route: a brief, skippable in-engine opening plays
    // ONCE per session before control is handed over (participant launches
    // only; never under ?route=legacy or a developer alias). Skipping or
    // finishing changes no measurement entry state — the instruction below
    // and every Dock event are identical either way.
    let openingShown = false;

    if (pilotLaunchMode() === 'participant' && !isLegacyRoute()) {
      runOncePerSession('pilot_opening_shown', () => {
        openingShown = true;
        this.logScenarioEvent('pilotOpening', 'pilot_opening_shown');
        this.scene.pause(this.scene.key);
        this.scene.launch(key.scene.pilotOpening, {
          resumeKey: this.scene.key,
          onDone: (outcome: 'completed' | 'skipped') => {
            // V4: the skip press never becomes the first interaction.
            this.suppressInteractUntilMs = Date.now() + 300;
            this.logScenarioEvent(
              'pilotOpening',
              outcome === 'skipped'
                ? 'pilot_opening_skipped'
                : 'pilot_opening_completed',
            );
            this.beginArrival(outcome);
          },
        });
      });
    }

    if (!openingShown) {
      this.showMovementInstruction();
    }
  }

  /**
   * The cut from the opening (storyboard frames 5–8). A COMPLETED opening
   * plays the continuous arrival — roof cover lifts off the berth hall,
   * the participant steps from the open seal to the exact spawn while the
   * iris closes behind them, the station line plays — with input locked
   * and the camera held on the authored composition. A SKIPPED opening
   * (or reduced motion) goes straight to the same end state:
   * finishArrival() is the ONE finish function for both paths.
   */
  private beginArrival(outcome: 'completed' | 'skipped') {
    const S = DOCK_SITES;

    if (outcome !== 'completed' || prefersReducedMotion()) {
      this.finishArrival();
      return;
    }

    this.arrivalPlaying = true;
    this.inputLocked = true;
    this.cameraHeld = true;
    this.plate.snapTo(S.spawnArrival.x, S.spawnArrival.y);
    this.publishDockProbe();

    // Frame 5: the participant stands in the open seal; the roof cover
    // over the berth hall lifts north and fades.
    this.player.setPosition(S.spawnArrival.x, S.spawnArrival.y + 56);
    this.player.anims.play('researcher_idle_north', true);
    this.setDoorFrameById('dock.docking_airlock', AIRLOCK_OPEN_FRAME);

    const cover = this.add
      .rectangle(
        this.roomMap.widthInPixels / 2,
        this.roomMap.heightInPixels / 2,
        this.roomMap.widthInPixels,
        this.roomMap.heightInPixels,
        0x1f2733,
        1,
      )
      .setDepth(DepthLayer.WorldReadout + 1);

    for (let x = 0; x < this.roomMap.widthInPixels; x += 192) {
      this.add
        .rectangle(
          x,
          this.roomMap.heightInPixels / 2,
          2,
          this.roomMap.heightInPixels,
          0x141a22,
          0.9,
        )
        .setDepth(DepthLayer.WorldReadout + 1.01)
        .setData('cover', true);
    }

    const seams = this.children.list.filter(
      (child) => child.getData('cover') === true,
    ) as Phaser.GameObjects.Rectangle[];

    this.tweens.add({
      targets: [cover, ...seams],
      alpha: 0,
      y: `-=${TILE * 3}`,
      duration: ARRIVAL.revealMs,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        cover.destroy();
        seams.forEach((seam) => seam.destroy());
      },
    });

    // Frame 6: the step from the seal to the exact playable spawn; the
    // iris closes behind (frames 4 → 0).
    this.time.delayedCall(ARRIVAL.stepStartMs, () => {
      this.player.anims.play('researcher_walk_north', true);
      this.tweens.add({
        targets: this.player,
        y: S.spawnArrival.y,
        duration: ARRIVAL.stepMs,
        ease: 'Linear',
        onComplete: () => this.player.anims.play('researcher_idle_north', true),
      });

      for (let step = 1; step <= 4; step += 1) {
        this.time.delayedCall(ARRIVAL.stepMs * 0.4 + step * 260, () =>
          this.setDoorFrameById(
            'dock.docking_airlock',
            AIRLOCK_OPEN_FRAME - step,
          ),
        );
      }
    });

    // Frame 7: the station line (role and situation, no instruction).
    this.time.delayedCall(ARRIVAL.stationLineMs, () => {
      this.showFeedbackMessage(OPENING_STATION_LINE);
    });

    // Frame 8: control releases at the fixed end state.
    this.time.delayedCall(ARRIVAL.releaseMs, () => this.finishArrival());
  }

  /** The one common finish: spawn, camera, seal, input, instruction. */
  private finishArrival() {
    const S = DOCK_SITES;

    this.tweens.killTweensOf(this.player);
    this.player.setPosition(S.spawnArrival.x, S.spawnArrival.y);
    this.player.body.reset(S.spawnArrival.x, S.spawnArrival.y);
    this.player.anims.play('researcher_idle_north', true);
    this.setDoorFrameById('dock.docking_airlock', AIRLOCK_CLOSED_FRAME);
    this.plate.snapTo(S.spawnArrival.x, S.spawnArrival.y);
    this.cameraHeld = false;
    this.inputLocked = false;
    this.arrivalPlaying = false;
    this.suppressInteractUntilMs = Math.max(
      this.suppressInteractUntilMs,
      Date.now() + 300,
    );
    this.showMovementInstruction();
    this.refreshRouteObjective();
    this.publishDockProbe();
  }

  private showMovementInstruction() {
    this.showFeedbackMessage(
      'Station AI: arrow keys to move. Reach the highlighted marker.',
    );
    runOncePerSession('dock_movement_instruction_shown', () => {
      this.logRoomEvent('dockArrivalTutorial', 'movement_instruction_shown');
    });

    this.idleSinceMs = Date.now();
  }

  protected onRoomUpdate(): void {
    if (this.arrivalPlaying) {
      return;
    }

    const { velocity } = this.player.body;
    const moving = velocity.x !== 0 || velocity.y !== 0;

    if (moving) {
      runOncePerSession('dock_first_movement', () => {
        this.logRoomEvent('dockArrivalTutorial', 'first_movement');
      });
      this.idleSinceMs = null;
    }

    this.updateIdleWatcher(moving);
    this.updateMarker();
  }

  protected onEmptyInteract(): void {
    // Out-of-range SPACE press = control error (Dock doc failure/edge
    // cases: "Repeated interaction attempts / control errors: should
    // increment control_error_count, not throw or freeze").
    this.controlErrorCount += 1;
  }

  protected getPromptOptions(): PromptOption[] {
    // Ported verbatim from the prototype's dockArrivalTutorial options
    // (legacy events unchanged); each path additionally emits the
    // canonical tutorial_completed with the fold metadata recommended by
    // event-schema.md §4, plus the control_error_count aggregate event.
    return [
      {
        label: 'Skip the tutorial and continue.',
        feedback:
          'You skip the orientation and head in. The station tasks are all available.',
        getEventTypes: () => [
          'dock_tutorial_skipped',
          'dock_instruction_shortcut',
        ],
        onSelected: () => {
          this.completeTutorial({ skipped: true });
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
          this.completeTutorial({ path: 'reviewed' });
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
          this.completeTutorial({ path: 'practiced' });
        },
      },
    ];
  }

  private isTutorialCompleted(): boolean {
    return researchRuntime.sessionState
      .getMissionState()
      .completed_rooms.includes('dock_arrival');
  }

  private completeTutorial(metadata: Record<string, unknown>) {
    // Canonical readiness event alongside the legacy per-path events.
    this.logRoomEvent('dockArrivalTutorial', 'tutorial_completed', {
      metadata,
    });

    if (!this.controlErrorLogged) {
      this.controlErrorLogged = true;
      this.logRoomEvent('dockArrivalTutorial', 'control_error_count', {
        metadata: { count: this.controlErrorCount },
      });
    }

    // One-shot guard prevents repeated tutorial interactions from
    // inflating baseline control variables (prototype behavior).
    researchRuntime.sessionState.markRoomCompleted('dock_arrival');

    // World V1: the terminal settles (class 5) — its screen dims.
    if (!this.legacyLayout()) {
      this.setStationTexture('dockArrivalTutorial', 'w1-terminal-settled');
    }
  }

  private updateIdleWatcher(moving: boolean) {
    // DISABLED until the user supplies the idle threshold + definition
    // (open scientific parameter). The plumbing exists so enabling it is a
    // constant change, not a design decision.
    if (DOCK_IDLE_HELP_THRESHOLD_MS === null) {
      return;
    }

    if (moving || this.isTutorialCompleted()) {
      this.idleSinceMs = null;
      return;
    }

    if (this.idleSinceMs === null) {
      this.idleSinceMs = Date.now();
      return;
    }

    if (Date.now() - this.idleSinceMs >= DOCK_IDLE_HELP_THRESHOLD_MS) {
      this.idleSinceMs = null;
      runOncePerSession('dock_tutorial_help_shown', () => {
        this.showFeedbackMessage(
          'Station AI: use the arrow keys to move, and SPACE or E to interact.',
        );
        this.logRoomEvent('dockArrivalTutorial', 'tutorial_help_shown');
      });
    }
  }

  private updateMarker() {
    if (this.markerReached) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.marker.x,
      this.marker.y,
    );

    if (distance < 40) {
      this.markerReached = true;
      // The reached marker settles and leaves — no lingering cue; the
      // instruction rides the transient feedback banner.
      this.markerPulse?.stop();
      this.markerPulse = null;
      this.marker.setAlpha(1).setFillStyle(0x5fd3c4, 0.5);
      this.time.delayedCall(700, () => this.marker.destroy());
      this.showFeedbackMessage(
        'Marker reached — now check in at the arrival terminal (E).',
      );
    }
  }

  /** Depth helper for the bay's tall props (unused on the legacy bay). */
  protected propDepth(footY: number): number {
    return worldDepth(footY);
  }
}
