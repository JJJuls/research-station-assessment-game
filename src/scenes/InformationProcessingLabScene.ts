/**
 * Information Processing Laboratory (proving ground).
 *
 * Developer-accessible technical laboratory for the Information
 * Processing subsystem — reachable ONLY via
 * ?scene=information_processing_lab, never from the participant route.
 * Seven visibly separated stations:
 *
 *   ORIENTATION   — Analysis Terminal orientation (common tutorial)
 *   M14           — Packet Intake Terminal       (packet saturation)
 *   M15           — Cipher Workstation           (layered cipher)
 *   M16           — Protocol Console             (protocol update)
 *   M17           — Syntax Trainer               (syntax acquisition)
 *   M13           — Conduit Lattice Bench        (pipe-network construction)
 *   M18           — Fault Diagnosis Console      (evidence-based diagnosis)
 *
 * Narrative: a damaged transmission core recovered from the surface is
 * reconstructed and deciphered on professional outpost analysis
 * equipment. Concise environmental instructions only (signage + prompt
 * lines). DEV-only `&module=<id>` opens a station's overlay directly.
 *
 * The scene reuses the proven room infrastructure (character-grid
 * tilemap, themed tileset, Player controller, ambience) and the
 * InventoryLabScene station pattern, without coupling to the inventory
 * store.
 */

import Phaser from 'phaser';

import { Depth, key } from '../constants';
import {
  sfxUiSelect,
  sfxUnavailable,
  startAmbience,
  stopAmbience,
  toggleAudioMuted,
  unlockAudio,
} from '../gameplay/audio';
import {
  declareM13Lattice,
  m13LatticeWindowStatus,
} from '../informationProcessing/m13PipeNetwork';
import {
  declareM14,
  m14WindowStatus,
} from '../informationProcessing/m14PacketSaturation';
import {
  declareM15,
  m15WindowStatus,
} from '../informationProcessing/m15LayeredCipher';
import {
  declareM16,
  m16WindowStatus,
} from '../informationProcessing/m16ProtocolUpdate';
import {
  declareM17,
  m17WindowStatus,
} from '../informationProcessing/m17SyntaxAcquisition';
import {
  declareM18Fault,
  m18FaultWindowStatus,
} from '../informationProcessing/m18FaultDiagnosis';
import { refreshIpProbe } from '../informationProcessing/probe';
import { declareTutorial } from '../informationProcessing/tutorial';
import type { IpOverlayKey } from '../informationProcessing/ui/openIpOverlay';
import {
  openIpOverlay,
  wireIpOverlayHost,
} from '../informationProcessing/ui/openIpOverlay';
import { readDevParam } from '../informationProcessing/windowState';
import { guardKeyHandler } from '../inventory/ui/keyGuard';
import { Player } from '../sprites';
import type { RoomLayout } from '../world';
import { buildPlaceholderRoomMap } from '../world/StationMapBuilder';

const INTERACTION_RANGE = 72;

declare global {
  interface Window {
    /** DEV-only: the last lab gate refusal shown (tests). */
    __ipLabFeedback?: string | null;
  }
}

interface LabStation {
  id: string;
  label: string;
  signage: string;
  x: number;
  y: number;
  texture: string;
  /** Overlay scene + task id; null = station not wired in this build. */
  overlay: { scene: IpOverlayKey; taskId: string } | null;
  verb: string | (() => string);
  /** Sequencing guard: returns a refusal message, or null when usable. */
  gate?: () => string | null;
  /** Closure context handed to the overlay on open (never evidence). */
  context?: () => Record<string, unknown>;
}

export class InformationProcessingLabScene extends Phaser.Scene {
  private player!: Player;
  private stations: LabStation[] = [];
  private proximityPrompt!: Phaser.GameObjects.Text;
  private labelChip!: Phaser.GameObjects.Text;
  private feedbackMessage: Phaser.GameObjects.Text | null = null;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private interactKeyE!: Phaser.Input.Keyboard.Key;
  private overlayBusy = false;

  constructor() {
    super(key.scene.informationProcessingLab);
  }

  create() {
    this.stations = [];
    this.feedbackMessage = null;
    this.feedbackTimer = null;
    this.overlayBusy = false;

    declareTutorial();
    declareM14();
    declareM15();
    declareM16();
    declareM17();
    declareM13Lattice();
    declareM18Fault();

    const layout: RoomLayout = {
      theme: 'ops',
      grid: [
        '#########################',
        '#########################',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
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
    this.cameras.main.setBounds(
      0,
      0,
      roomMap.widthInPixels,
      roomMap.heightInPixels,
    );
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.add
      .text(8, 8, 'INFORMATION PROCESSING LAB — technical proving ground', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '13px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

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
        if (!event.repeat && !this.overlayBusy) {
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

    wireIpOverlayHost(this);
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.overlayBusy = false;
      refreshIpProbe();
    });

    this.buildStations();
    refreshIpProbe();

    // DEV-only direct launch: ?module=<station id>.
    const direct = readDevParam('module');

    if (direct !== null) {
      const station = this.stations.find(
        (candidate) => candidate.id === direct,
      );

      if (station !== undefined) {
        this.time.delayedCall(250, () => this.activate(station));
      }
    }
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

  private addStation(station: LabStation) {
    this.stations.push(station);
    this.stationVisual(station.x, station.y, station.texture);
    this.signage(station.x, station.y - 40, station.signage);
  }

  private buildStations() {
    this.signage(400, 84, 'ANALYSIS TERMINALS — recovered transmission core');

    this.addStation({
      id: 'tutorial',
      label: 'Analysis Terminal — Orientation',
      signage: 'ORIENTATION',
      x: 96,
      y: 150,
      texture: 'proc-console-wall',
      overlay: { scene: key.scene.ipSignalTerminal, taskId: 'tutorial' },
      verb: 'use',
    });
    const closedVerb = (status: () => string) => () =>
      status() === 'unopened' || status() === 'open' ? 'use' : 'review';

    this.addStation({
      id: 'm14',
      label: 'Packet Intake Terminal',
      signage: 'PACKET INTAKE',
      x: 248,
      y: 150,
      texture: 'proc-console-scenario',
      overlay: { scene: key.scene.ipSignalTerminal, taskId: 'm14' },
      verb: closedVerb(m14WindowStatus),
    });
    this.addStation({
      id: 'm15',
      label: 'Cipher Workstation',
      signage: 'CIPHER',
      x: 400,
      y: 150,
      texture: 'proc-diag-board',
      overlay: { scene: key.scene.ipSignalTerminal, taskId: 'm15' },
      verb: closedVerb(m15WindowStatus),
    });
    this.addStation({
      id: 'm16',
      label: 'Protocol Console',
      signage: 'PROTOCOL',
      x: 552,
      y: 150,
      texture: 'proc-console-wall',
      overlay: { scene: key.scene.ipSignalTerminal, taskId: 'm16' },
      verb: closedVerb(m16WindowStatus),
    });
    this.addStation({
      id: 'm17',
      label: 'Syntax Trainer',
      signage: 'SYNTAX',
      x: 704,
      y: 150,
      texture: 'proc-console-scenario',
      overlay: { scene: key.scene.ipSignalTerminal, taskId: 'm17' },
      verb: closedVerb(m17WindowStatus),
    });

    this.signage(
      400,
      392,
      'CORE CONDUIT BAY — lattice reconstruction and diagnosis',
    );
    this.addStation({
      id: 'm13',
      label: 'Conduit Lattice Bench',
      signage: 'LATTICE BENCH',
      x: 240,
      y: 450,
      texture: 'proc-rig-intake',
      overlay: { scene: key.scene.ipPipeBoard, taskId: 'm13' },
      verb: closedVerb(m13LatticeWindowStatus),
    });
    this.addStation({
      id: 'm18',
      label: 'Fault Diagnosis Console',
      signage: 'DIAGNOSIS CONSOLE',
      x: 560,
      y: 450,
      texture: 'proc-diag-board',
      overlay: { scene: key.scene.ipDiagnosisConsole, taskId: 'm18' },
      verb: closedVerb(m18FaultWindowStatus),
      // Sequencing only (never performance): the console waits while the
      // lattice bench window is still in progress. Solved, failed,
      // exhausted, stopped or never opened all lead to the SAME console.
      gate: () =>
        m13LatticeWindowStatus() === 'open'
          ? 'Finish or stop the lattice bench first — the console takes over afterwards.'
          : null,
      // Closure state only (completed / exhausted / exited / unopened) —
      // the console itself never reads any M13 state.
      context: () => ({
        prior_m13_window_status: m13LatticeWindowStatus(),
      }),
    });
  }

  private activate(station: LabStation) {
    if (station.overlay === null) {
      sfxUnavailable();
      this.showFeedback(`${station.label} is offline in this build.`);

      return;
    }

    const refusal = station.gate?.() ?? null;

    if (refusal !== null) {
      sfxUnavailable();
      this.showFeedback(refusal);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__ipLabFeedback = refusal;
      }

      return;
    }

    this.overlayBusy = true;
    sfxUiSelect();

    if (
      !openIpOverlay(
        this,
        station.overlay.scene,
        station.overlay.taskId,
        station.context?.() ?? {},
      )
    ) {
      this.overlayBusy = false;
    }
  }

  /* ---------------------------------------------------------------- *
   * Feedback + proximity loop
   * ---------------------------------------------------------------- */

  private showFeedback(message: string) {
    this.feedbackTimer?.remove();
    this.feedbackMessage?.destroy();
    this.feedbackMessage = this.add
      .text(400, 60, message, {
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

    const interactPressed = this.interactJustPressed();
    let nearest: LabStation | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const station of this.stations) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        station.x,
        station.y,
      );

      if (distance < INTERACTION_RANGE && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = station;
      }
    }

    if (nearest === null) {
      this.proximityPrompt.setVisible(false);
      this.labelChip.setVisible(false);
    } else {
      const verb =
        typeof nearest.verb === 'function' ? nearest.verb() : nearest.verb;

      this.labelChip
        .setText(nearest.label)
        .setPosition(Phaser.Math.Clamp(nearest.x, 80, 720), nearest.y - 58)
        .setVisible(true);
      this.proximityPrompt
        .setText(`SPACE / E — ${verb}`)
        .setPosition(Phaser.Math.Clamp(nearest.x, 90, 710), nearest.y + 36)
        .setVisible(true);

      if (interactPressed && !this.overlayBusy) {
        this.activate(nearest);
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
