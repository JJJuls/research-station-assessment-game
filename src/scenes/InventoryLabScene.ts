/**
 * Inventory Lab (interactive inventory foundation).
 *
 * Developer-accessible technical proving ground for the authoritative
 * inventory system — reachable ONLY via ?scene=inventory_lab, never from
 * the participant route. Four visibly separated stations:
 *
 *   1. SUPPLY PICKUP     — world item bundles, backpack tutorial
 *   2. STORAGE TRANSFER  — the component locker (side-by-side transfer)
 *   3. ASSEMBLY BENCH    — the two-input workbench recipes
 *   4. ORGANISATION PROTOTYPES — M02 filing workstation and the two M03
 *      press benches (provisional measurement demonstrations)
 *
 * Concise environmental instructions only (signage + inspect lines) —
 * no dialogue menus. The scene reuses the proven room infrastructure
 * (character-grid tilemap, themed tileset, Player controller, ambience)
 * without touching RoomScene or the zone layer.
 */

import Phaser from 'phaser';

import { Depth, key } from '../constants';
import {
  sfxPickup,
  sfxUiSelect,
  sfxUnavailable,
  startAmbience,
  stopAmbience,
  toggleAudioMuted,
  unlockAudio,
} from '../gameplay/audio';
import { ensureInventoryIconTextures } from '../inventory/inventoryTextures';
import { declareM02Opportunity, m02Status } from '../inventory/m02Filing';
import type { M03OccasionId } from '../inventory/m03Reset';
import {
  declareM03Opportunities,
  m03OccasionStatus,
} from '../inventory/m03Reset';
import { CONTAINER_IDS } from '../inventory/model';
import {
  drainWorldDrops,
  ensureLabStorageSeeded,
  invAddItem,
} from '../inventory/store';
import {
  installInventoryTelemetry,
  logSecondaryInventoryEvent,
  setInventoryTelemetryScene,
} from '../inventory/telemetry';
import { HotbarHud } from '../inventory/ui/HotbarHud';
import { guardKeyHandler } from '../inventory/ui/keyGuard';
import {
  openInventoryOverlay,
  wireInventoryOverlayKey,
} from '../inventory/ui/openOverlay';
import { Player } from '../sprites';
import type { RoomLayout } from '../world';
import { buildPlaceholderRoomMap } from '../world/StationMapBuilder';

const INTERACTION_RANGE = 72;

interface BundleContent {
  definitionId: string;
  quantity: number;
}

interface WorldBundle {
  id: string;
  label: string;
  x: number;
  y: number;
  contents: BundleContent[];
  visuals: Phaser.GameObjects.GameObject[];
}

interface LabTarget {
  id: string;
  label: string;
  x: number;
  y: number;
  action: () => void;
  /** Interact verb shown in the proximity prompt (may be dynamic). */
  verb: string | (() => string);
}

export class InventoryLabScene extends Phaser.Scene {
  private player!: Player;
  private targets: LabTarget[] = [];
  private bundles: WorldBundle[] = [];
  private bundleSeq = 0;
  private proximityPrompt!: Phaser.GameObjects.Text;
  private labelChip!: Phaser.GameObjects.Text;
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private interactKeyE!: Phaser.Input.Keyboard.Key;
  private overlayBusy = false;

  constructor() {
    super(key.scene.inventoryLab);
  }

  create() {
    this.targets = [];
    this.bundles = [];
    this.bundleSeq = 0;
    this.feedbackMessage = null;
    this.feedbackTimer = null;
    this.overlayBusy = false;

    ensureInventoryIconTextures(this);
    installInventoryTelemetry();
    setInventoryTelemetryScene(this.scene.key);
    ensureLabStorageSeeded();
    declareM02Opportunity();
    declareM03Opportunities();

    const layout: RoomLayout = {
      theme: 'prep',
      grid: [
        '#########################',
        '#########################',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..####.......####......#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..####.......####......#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
    const roomMap = buildPlaceholderRoomMap(this, layout);

    this.physics.world.setBounds(
      0,
      0,
      roomMap.widthInPixels,
      roomMap.heightInPixels,
    );
    this.player = new Player(this, 400, 300);
    this.physics.add.collider(this.player, roomMap.layer);
    this.physics.add.collider(this.player, roomMap.solids);
    this.cameras.main.setBounds(
      0,
      0,
      roomMap.widthInPixels,
      roomMap.heightInPixels,
    );
    this.cameras.main.fadeIn(200, 0, 0, 0);

    // HUD: title line + the shared quick-access hotbar strip.
    this.add
      .text(8, 8, 'INVENTORY LAB — technical proving ground', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '13px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
    new HotbarHud(this);

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
    this.labelChip = this.add
      .text(0, 0, '', {
        backgroundColor: '#101820',
        color: '#fff',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setVisible(false);

    this.interactKeyE = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.input.keyboard!.on(
      'keydown-ESC',
      guardKeyHandler((event: KeyboardEvent) => {
        if (!event.repeat) {
          this.scene.pause(this.scene.key);
          this.scene.launch(key.scene.menu, { resumeKey: this.scene.key });
        }
      }),
    );
    this.input.keyboard!.on(
      'keydown-M',
      guardKeyHandler((event: KeyboardEvent) => {
        if (!event.repeat) {
          toggleAudioMuted();
        }
      }),
    );
    unlockAudio();
    this.input.keyboard!.once('keydown', () => unlockAudio());
    this.input.once('pointerdown', () => unlockAudio());
    startAmbience('interior');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopAmbience());

    // The advertised control: I opens the inventory (world drops allowed
    // here — the Lab materialises them as recoverable bundles).
    wireInventoryOverlayKey(this, {
      isEligible: () => !this.overlayBusy,
      launchData: () => ({ mode: 'backpack', allowWorldDrop: true }),
    });

    // Confirmed world drops from the overlay land at the player's feet
    // when this scene resumes.
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.overlayBusy = false;

      for (const stack of drainWorldDrops()) {
        this.spawnBundle(
          'Set-down bundle',
          Phaser.Math.Clamp(this.player.x + 40, 60, 740),
          Phaser.Math.Clamp(this.player.y + 20, 80, 480),
          [{ definitionId: stack.definitionId, quantity: stack.quantity }],
        );
        logSecondaryInventoryEvent('world_drop_materialised', {
          definition_id: stack.definitionId,
          quantity: stack.quantity,
        });
      }
    });

    this.buildStations();

    logSecondaryInventoryEvent('lab_entered', {});
  }

  /* ---------------------------------------------------------------- *
   * Stations
   * ---------------------------------------------------------------- */

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, {
        color: '#7f95a8',
        font: '11px monospace',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld - 2);
  }

  private stationVisual(x: number, y: number, texture: string) {
    if (this.textures.exists(texture)) {
      this.add.image(x, y, texture);
    } else {
      this.add.rectangle(x, y, 40, 40, 0x3f5a66, 1).setStrokeStyle(2, 0x5fd3c4);
    }
  }

  private addTarget(target: LabTarget) {
    this.targets.push(target);
  }

  private buildStations() {
    // — Station 1: supply pickup + backpack tutorial (west, all bundles
    // on the open row above the rail stubs so every one is walkable).
    this.signage(196, 84, 'STATION 1 — SUPPLY PICKUP');
    this.signage(196, 100, 'E collects a bundle · I opens the inventory');
    this.spawnBundle('Component Bundle', 88, 144, [
      { definitionId: 'fuse_contact', quantity: 2 },
      { definitionId: 'relay_housing', quantity: 1 },
    ]);
    this.spawnBundle('Sample Kit', 160, 144, [
      { definitionId: 'sample_vial', quantity: 1 },
      { definitionId: 'seal_cap', quantity: 1 },
    ]);
    this.spawnBundle('Ration Box', 232, 144, [
      { definitionId: 'field_ration', quantity: 5 },
    ]);
    this.spawnBundle('Salvage Cache', 304, 144, [
      { definitionId: 'field_scanner', quantity: 1 },
      { definitionId: 'excavation_spade', quantity: 1 },
      { definitionId: 'sample_case', quantity: 1 },
      { definitionId: 'core_sample', quantity: 1 },
      { definitionId: 'relay_coupling', quantity: 1 },
      { definitionId: 'flux_calibrator', quantity: 1 },
      { definitionId: 'pipe_segment', quantity: 1 },
      { definitionId: 'pipe_elbow', quantity: 1 },
      { definitionId: 'ore_chunk', quantity: 1 },
      { definitionId: 'scrap_plate', quantity: 1 },
      { definitionId: 'heat_canister', quantity: 1 },
      { definitionId: 'pry_bar', quantity: 1 },
    ]);

    // — Station 2: storage transfer (north-centre).
    this.signage(400, 78, 'STATION 2 — STORAGE TRANSFER');
    this.stationVisual(400, 140, 'proc-crate-components');
    this.addTarget({
      id: 'storage_locker',
      label: 'Component Locker',
      x: 400,
      y: 140,
      verb: 'open',
      action: () => this.openOverlayMode({ mode: 'container' }),
    });

    // — Station 3: assembly bench (east).
    this.signage(656, 78, 'STATION 3 — ASSEMBLY BENCH');
    this.stationVisual(656, 140, 'proc-bench-prep');
    this.addTarget({
      id: 'assembly_bench',
      label: 'Assembly Bench',
      x: 656,
      y: 140,
      verb: 'use',
      action: () => this.openOverlayMode({ mode: 'workbench' }),
    });

    // — Station 4: organisation measurement prototypes (south band).
    this.signage(400, 366, 'STATION 4 — RECORDS & PRESS');
    // x=272 keeps a full body-width of clearance east of the row-11
    // rail stub, so the north-south approach column is unobstructed.
    this.stationVisual(272, 430, 'proc-desk-closure');
    this.addTarget({
      id: 'm02_filing_desk',
      label: 'Incident Filing Workstation',
      x: 272,
      y: 430,
      verb: () => (m02Status() === 'committed' ? 'review' : 'use'),
      action: () => this.openOverlayMode({ mode: 'm02' }),
    });

    // x=384 keeps the bench on the open central column (the row-11 rail
    // stubs block the x≈448-576 band from the north).
    this.stationVisual(384, 430, 'proc-rig-intake');
    this.addTarget({
      id: 'm03_press_a',
      label: 'Press Station A',
      x: 384,
      y: 430,
      verb: 'use',
      action: () => this.openM03Bench('a'),
    });

    this.stationVisual(620, 430, 'proc-rig-intake');
    this.addTarget({
      id: 'm03_press_b',
      label: 'Press Station B',
      x: 620,
      y: 430,
      verb: 'use',
      action: () => this.openM03Bench('b'),
    });
  }

  private openOverlayMode(data: Parameters<typeof openInventoryOverlay>[1]) {
    this.overlayBusy = true;
    sfxUiSelect();
    openInventoryOverlay(this, { allowWorldDrop: true, ...data });
  }

  private openM03Bench(occasion: M03OccasionId) {
    if (m03OccasionStatus(occasion) === 'closed') {
      sfxUnavailable();
      this.showFeedback('Press station idle. The batch is done.');
      return;
    }

    this.openOverlayMode({ mode: 'm03', m03Occasion: occasion });
  }

  /* ---------------------------------------------------------------- *
   * World bundles (pickup + recoverable drops)
   * ---------------------------------------------------------------- */

  private spawnBundle(
    label: string,
    x: number,
    y: number,
    contents: BundleContent[],
  ) {
    this.bundleSeq += 1;

    const crate = this.add
      .rectangle(x, y, 26, 20, 0x6a5a3a, 1)
      .setStrokeStyle(1, 0x9a8a5a);
    const strap = this.add.rectangle(x, y, 26, 4, 0x9a8a5a, 1);

    this.bundles.push({
      id: `bundle_${this.bundleSeq}`,
      label,
      x,
      y,
      contents: contents.map((entry) => ({ ...entry })),
      visuals: [crate, strap],
    });
  }

  /**
   * Pickup through the authoritative inventory service: each contained
   * stack is all-or-nothing; whatever cannot fit STAYS in the bundle on
   * the floor (a refused pickup never loses items).
   */
  private pickUpBundle(bundle: WorldBundle) {
    const remaining: BundleContent[] = [];
    let takenAny = false;

    for (const content of bundle.contents) {
      const change = invAddItem({
        definitionId: content.definitionId,
        quantity: content.quantity,
        targetContainerIds: [
          CONTAINER_IDS.playerHotbar,
          CONTAINER_IDS.playerBackpack,
        ],
        allOrNothing: true,
      });

      if (change.ok) {
        takenAny = true;
      } else {
        remaining.push(content);
      }
    }

    bundle.contents = remaining;

    if (takenAny) {
      sfxPickup();
      logSecondaryInventoryEvent('world_pickup', {
        bundle: bundle.label,
        remaining: remaining.length,
      });
    }

    if (remaining.length === 0) {
      for (const visual of bundle.visuals) {
        visual.destroy();
      }

      this.bundles = this.bundles.filter((candidate) => candidate !== bundle);
      this.showFeedback(`${bundle.label} collected.`);
    } else if (takenAny) {
      this.showFeedback(
        'Inventory full — part of the bundle is still on the floor.',
      );
    } else {
      sfxUnavailable();
      this.showFeedback('Inventory full. The bundle stays where it is.');
    }
  }

  /* ---------------------------------------------------------------- *
   * Feedback + proximity loop
   * ---------------------------------------------------------------- */

  private showFeedback(message: string) {
    this.feedbackTimer?.remove();
    this.feedbackMessage?.destroy();
    this.feedbackMessage = this.add
      .text(400, 72, message, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '15px monospace',
        padding: { x: 10, y: 6 },
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
    this.feedbackTimer = this.time.delayedCall(2400, () => {
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

  update() {
    this.player.update();

    // Read (and clear) the interact latch every frame (buffered-press
    // guard, ZoneScene precedent).
    const interactPressed = this.interactJustPressed();

    interface Nearest {
      label: string;
      verb: string;
      x: number;
      y: number;
      run: () => void;
    }

    let nearest: Nearest | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const target of this.targets) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y,
      );

      if (distance < INTERACTION_RANGE && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = {
          label: target.label,
          verb: typeof target.verb === 'function' ? target.verb() : target.verb,
          x: target.x,
          y: target.y,
          run: target.action,
        };
      }
    }

    for (const bundle of this.bundles) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        bundle.x,
        bundle.y,
      );

      if (distance < INTERACTION_RANGE && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = {
          label: bundle.label,
          verb: 'collect',
          x: bundle.x,
          y: bundle.y,
          run: () => this.pickUpBundle(bundle),
        };
      }
    }

    if (nearest === null) {
      this.proximityPrompt.setVisible(false);
      this.labelChip.setVisible(false);
    } else {
      this.labelChip
        .setText(nearest.label)
        .setPosition(Phaser.Math.Clamp(nearest.x, 60, 740), nearest.y - 52)
        .setVisible(true);
      this.proximityPrompt
        .setText(`SPACE / E — ${nearest.verb}`)
        .setPosition(Phaser.Math.Clamp(nearest.x, 80, 720), nearest.y - 30)
        .setVisible(true);

      if (interactPressed && !this.overlayBusy) {
        nearest.run();
      }
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__playerProbe = {
        scene: this.scene.key,
        x: this.player.x,
        y: this.player.y,
      };
    }
  }
}
