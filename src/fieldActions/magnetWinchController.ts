/**
 * Magnet-recovery winch controller (field-actions foundation).
 *
 * The Metal Recovery Yard's rig cycle as an EXPLICIT state machine:
 *
 *   idle → lowering → timing_window → locked_or_missed → reeling
 *        → resolved → cooldown → idle
 *
 * Presentation: a visible cable extends from the rig arm as the magnet
 * lowers into the salvage heap and retracts on the reel; the timing
 * phase shows a genuinely moving marker sweeping a fixed bar with a
 * clearly visible catch band (fair, generous boundaries — the proven
 * tension-phase constants). F, SPACE and pointer-down all converge on
 * ONE transition function (commitLock) during the timing window.
 *
 * Interaction pattern adapted from the MIT-licensed Bear_The_Fisher
 * hook/cable structure (cable endpoint tracks the moving magnet each
 * tick; discrete phase flags; lower-then-raise resolution) re-expressed
 * over Phaser tweens and this repository's manual world-action bracket
 * (docs/game/FIELD-ACTIONS-REFERENCE-AUDIT.md §2).
 *
 * The whole active cycle holds the manual world-action bracket, so
 * movement, prompts, scans and digs are structurally impossible while
 * the rig runs. ESC cancels ONLY while cancellation is logically
 * possible (lowering / timing window) via the shared cancel hook; once
 * the magnet locks, the cycle always resolves.
 *
 * Outcomes come from the injected provider (the finite counterbalanced
 * deck) — this controller knows nothing about decks, measurement or
 * scores, and never logs an event (onCycleResolved reports the raw
 * cycle to the host).
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import {
  beginManualWorldAction,
  endManualWorldAction,
  isWorldActionActive,
  showFloatingText,
} from '../gameplay/actions';
import {
  sfxComplete,
  sfxMachineOn,
  sfxPickup,
  sfxUnavailable,
} from '../gameplay/audio';
import { addInventoryItem } from '../gameplay/inventory';
import { getGameItem } from '../gameplay/items';
import { guardKeyHandler } from '../inventory/ui/keyGuard';
import type { FieldCacheManager } from './fieldCache';
import type { MagnetPullResult } from './magnetDeck';

export type MagnetPhase =
  | 'idle'
  | 'lowering'
  | 'timing_window'
  | 'locked_or_missed'
  | 'reeling'
  | 'resolved'
  | 'cooldown';

export type MagnetLockSource = 'keyboard' | 'pointer';

export interface MagnetCycleRecord {
  /** False only for a cancelled cycle (ESC before the lock). */
  completed: boolean;
  cancelled: boolean;
  /** A lock was committed during the timing window. */
  hook_set: boolean;
  /** The committed lock fell inside the catch band. */
  locked_in_band: boolean;
  lock_source: MagnetLockSource | null;
  outcome_tier: string | null;
  item_id: string | null;
  item_delivery: 'inventory' | 'cache' | null;
  pull_position: number | null;
  deck_form: string | null;
  post_depletion: boolean;
  depleted_now: boolean;
  /** Full cycle duration, start (F) → resolution (REV-MIN-8). */
  cycle_duration_ms: number | null;
}

export interface MagnetWinchConfig {
  scene: Phaser.Scene;
  /** Rig anchor position (the arm/cable render relative to this). */
  rig: { x: number; y: number };
  /** Collection tray position (inventory-full caches appear here). */
  tray: { x: number; y: number };
  caches: FieldCacheManager;
  /** Finite-deck draw for a committed (non-cancelled) cycle. */
  drawOutcome: () => MagnetPullResult;
  onCycleResolved: (record: MagnetCycleRecord) => void;
  showFeedback: (message: string) => void;
}

const LOWER_MS = 900;
const REEL_MS = 900;
const RESOLVE_HOLD_MS = 700;
const COOLDOWN_MS = 1200;
const CANCEL_COOLDOWN_MS = 500;
const SWEEP_MS = 1400;
const BAND_TOP = 0.32;
const BAND_BOTTOM = 0.68;
const BAR_HEIGHT = 96;

export class MagnetWinchController {
  private readonly config: MagnetWinchConfig;
  private phase: MagnetPhase = 'idle';
  private destroyed = false;

  /** Cable/magnet geometry. */
  private readonly armX: number;
  private readonly armY: number;
  private readonly pitY: number;

  private cable: Phaser.GameObjects.Graphics | null = null;
  private magnet: Phaser.GameObjects.Container | null = null;
  private payloadIcon: Phaser.GameObjects.Image | null = null;

  /** Timing-window pieces. */
  private timingTick: Phaser.Time.TimerEvent | null = null;
  private timingElapsed = 0;
  private markerInBandNow = false;
  private timingUi: Phaser.GameObjects.GameObject[] = [];
  private timingMarker: Phaser.GameObjects.Rectangle | null = null;
  private keyHandlerF: ((event: KeyboardEvent) => void) | null = null;
  private keyHandlerSpace: ((event: KeyboardEvent) => void) | null = null;
  private pointerHandler: (() => void) | null = null;

  private lowerTween: Phaser.Tweens.Tween | null = null;
  private reelTween: Phaser.Tweens.Tween | null = null;
  private cooldownTimer: Phaser.Time.TimerEvent | null = null;
  private cycleStartedAt = 0;

  constructor(config: MagnetWinchConfig) {
    this.config = config;
    this.armX = config.rig.x + 24;
    this.armY = config.rig.y - 30;
    this.pitY = config.rig.y + 34;

    config.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyed = true;
      this.teardownCycleObjects();

      if (this.phase !== 'idle' && this.phase !== 'cooldown') {
        endManualWorldAction();
      }
    });
  }

  getPhase(): MagnetPhase {
    return this.phase;
  }

  isMarkerInBand(): boolean {
    return this.markerInBandNow;
  }

  /** True when F may start a cycle right now. */
  canStart(): boolean {
    return !this.destroyed && this.phase === 'idle';
  }

  /** Neutral refusal while the rig is cycling down. */
  showCooldownFeedback(): void {
    this.config.showFeedback('The rig is cycling down — one moment.');
  }

  /** Starts one full recovery cycle (F at the rig). */
  startCycle(): boolean {
    if (!this.canStart()) {
      if (this.phase === 'cooldown') {
        this.showCooldownFeedback();
      }

      return false;
    }

    // Mutex guard for reuse hosts: never clobber a running world action
    // (the lab's F binding is already gated, but the controller must not
    // rely on its host for this invariant).
    if (isWorldActionActive()) {
      return false;
    }

    const { scene } = this.config;

    beginManualWorldAction(() => this.cancelCycle());
    this.cycleStartedAt = Date.now();
    this.phase = 'lowering';
    sfxMachineOn();

    this.cable = scene.add.graphics().setDepth(Depth.AboveWorld - 2);
    this.magnet = this.buildMagnet();
    this.magnet.setPosition(this.armX, this.armY + 8);

    this.lowerTween = scene.tweens.add({
      targets: this.magnet,
      y: this.pitY,
      duration: LOWER_MS,
      ease: 'Sine.easeIn',
      onUpdate: () => this.redrawCable(),
      onComplete: () => this.enterTimingWindow(),
    });

    return true;
  }

  private buildMagnet(): Phaser.GameObjects.Container {
    const { scene } = this.config;
    const body = scene.add.rectangle(0, 0, 20, 10, 0x46586b, 1);

    body.setStrokeStyle(1, 0x9fb2c1, 0.9);

    const poleLeft = scene.add.rectangle(-7, 7, 5, 6, 0xb4443c, 1);
    const poleRight = scene.add.rectangle(7, 7, 5, 6, 0xdce7f0, 1);
    const container = scene.add.container(0, 0, [body, poleLeft, poleRight]);

    container.setDepth(Depth.AboveWorld - 1);

    return container;
  }

  private redrawCable(): void {
    if (this.cable === null || this.magnet === null) {
      return;
    }

    this.cable.clear();
    this.cable.lineStyle(2, 0x9fb2c1, 1);
    this.cable.lineBetween(
      this.armX,
      this.armY,
      this.magnet.x,
      this.magnet.y - 6,
    );
  }

  private enterTimingWindow(): void {
    if (this.destroyed) {
      return;
    }

    const { scene } = this.config;

    this.phase = 'timing_window';
    this.timingElapsed = 0;

    const barX = this.config.rig.x + 52;
    const barTop = this.config.rig.y - BAR_HEIGHT - 12;
    const barBack = scene.add
      .rectangle(barX, barTop, 14, BAR_HEIGHT, 0x101820, 1)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld);
    const band = scene.add
      .rectangle(
        barX,
        barTop + BAR_HEIGHT * BAND_TOP,
        10,
        BAR_HEIGHT * (BAND_BOTTOM - BAND_TOP),
        0x5fd3c4,
        0.4,
      )
      .setOrigin(0.5, 0)
      .setDepth(Depth.AboveWorld);
    const marker = scene.add
      .rectangle(barX, barTop, 12, 4, 0xffffff, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(Depth.AboveWorld);
    const hint = scene.add
      .text(barX, barTop - 16, 'F / SPACE / click — lock the magnet', {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '12px monospace',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld);

    this.timingUi = [barBack, band, marker, hint];
    this.timingMarker = marker;

    // Fixed sine sweep — identical for every cycle and participant
    // (tension-phase constants; frozen-stimulus rule).
    this.timingTick = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.timingElapsed += 16;

        const sweep = this.markerPhase();

        this.timingMarker?.setY(barTop + BAR_HEIGHT * sweep);
        this.markerInBandNow = sweep >= BAND_TOP && sweep <= BAND_BOTTOM;
        // The cable sways subtly with the sweep (pure dressing).
        this.redrawCable();
      },
    });

    // Keyboard and pointer converge on the SAME transition function.
    this.keyHandlerF = guardKeyHandler((event: KeyboardEvent) => {
      if (!event.repeat) {
        this.commitLock('keyboard');
      }
    });
    this.keyHandlerSpace = guardKeyHandler((event: KeyboardEvent) => {
      if (!event.repeat) {
        this.commitLock('keyboard');
      }
    });
    this.pointerHandler = () => this.commitLock('pointer');
    scene.input.keyboard!.on('keydown-F', this.keyHandlerF);
    scene.input.keyboard!.on('keydown-SPACE', this.keyHandlerSpace);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerHandler);
  }

  private markerPhase(): number {
    return (
      0.5 -
      0.5 * Math.cos(((this.timingElapsed % SWEEP_MS) / SWEEP_MS) * Math.PI * 2)
    );
  }

  /**
   * THE single lock transition — every input route lands here exactly
   * once per cycle (phase guard makes replays inert).
   */
  private commitLock(source: MagnetLockSource): void {
    if (this.phase !== 'timing_window' || this.destroyed) {
      return;
    }

    const inBand = this.markerInBandNow;

    this.phase = 'locked_or_missed';
    this.teardownTimingWindow();

    // Cancellation is no longer logically possible: clear the manual
    // action's cancel hook while keeping the input isolation.
    beginManualWorldAction();

    // M24 standardisation correction (pilot Unit 5): EVERY committed
    // (non-cancelled) cycle consumes one deck position and receives that
    // position's outcome, whether or not the lock fell inside the band.
    // Timing accuracy (`locked_in_band`, lock source, marker phase) is
    // recorded as secondary motor telemetry only — it never changes the
    // outcome, so every participant who commits six cycles receives the
    // identical outcome multiset and the identical depletion exposure.
    const pull = this.config.drawOutcome();

    if (inBand) {
      sfxPickup();
    } else {
      sfxUnavailable();
    }

    this.attachPayload(pull.outcome.item_id);
    this.reelUp({
      completed: true,
      cancelled: false,
      hook_set: true,
      locked_in_band: inBand,
      lock_source: source,
      outcome_tier: pull.outcome.tier,
      item_id: pull.outcome.item_id,
      item_delivery: null,
      pull_position: pull.pull_position,
      deck_form: pull.form,
      post_depletion: pull.post_depletion,
      depleted_now: pull.depleted_now,
      cycle_duration_ms: null,
    });
  }

  private attachPayload(itemId: string | null): void {
    if (itemId === null || this.magnet === null) {
      return;
    }

    const icon = getGameItem(itemId).icon;

    if (this.config.scene.textures.exists(icon)) {
      this.payloadIcon = this.config.scene.add
        .image(this.magnet.x, this.magnet.y + 12, icon)
        .setDepth(Depth.AboveWorld - 1);
    }
  }

  private reelUp(record: MagnetCycleRecord): void {
    const { scene } = this.config;

    this.phase = 'reeling';

    this.reelTween = scene.tweens.add({
      targets: this.magnet,
      y: this.armY + 8,
      duration: REEL_MS,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.redrawCable();
        this.payloadIcon?.setPosition(
          this.magnet?.x ?? 0,
          (this.magnet?.y ?? 0) + 12,
        );
      },
      onComplete: () => this.resolveCycle(record),
    });
  }

  private resolveCycle(record: MagnetCycleRecord): void {
    const { scene, rig, tray, caches } = this.config;

    this.phase = 'resolved';

    const finished: MagnetCycleRecord = {
      ...record,
      cycle_duration_ms: Date.now() - this.cycleStartedAt,
    };

    if (record.item_id === null) {
      showFloatingText(scene, rig.x, rig.y - 10, 'Nothing on the magnet');
    } else {
      const item = getGameItem(record.item_id);

      if (addInventoryItem(record.item_id)) {
        finished.item_delivery = 'inventory';
        sfxComplete();
        showFloatingText(scene, rig.x, rig.y - 10, `+ ${item.label}`);
      } else {
        finished.item_delivery = 'cache';
        caches.create(record.item_id, tray.x, tray.y);
        this.config.showFeedback(
          `Belt full — the ${item.label} is waiting in the collection tray. ` +
            'Make room, then collect it beside the tray with SPACE/E.',
        );
      }
    }

    // Brief resolved hold so the outcome reads, then cooldown.
    scene.time.delayedCall(RESOLVE_HOLD_MS, () => {
      if (this.destroyed) {
        return;
      }

      this.teardownCycleObjects();
      // Clear latched keys (SPACE/F pressed during the cycle) BEFORE the
      // bracket releases — RoomScene polls JustDown only while no world
      // action runs, so a stale press would otherwise fire the nearest
      // station prompt seconds after the commit (overlay-resume
      // precedent: input.keyboard.resetKeys()).
      scene.input.keyboard?.resetKeys();
      endManualWorldAction();
      this.phase = 'cooldown';
      this.cooldownTimer = scene.time.delayedCall(COOLDOWN_MS, () => {
        this.phase = 'idle';
      });
      this.config.onCycleResolved(finished);
    });
  }

  /**
   * ESC cancellation — reachable only from lowering/timing_window (the
   * cancel hook is cleared at the lock; RoomScene's ESC then falls
   * through to the pause menu as with any non-cancellable action).
   */
  private cancelCycle(): void {
    if (
      this.destroyed ||
      (this.phase !== 'lowering' && this.phase !== 'timing_window')
    ) {
      return;
    }

    this.lowerTween?.remove();
    this.lowerTween = null;
    this.teardownTimingWindow();
    this.teardownCycleObjects();
    this.config.scene.input.keyboard?.resetKeys();
    endManualWorldAction();
    this.phase = 'cooldown';
    this.cooldownTimer = this.config.scene.time.delayedCall(
      CANCEL_COOLDOWN_MS,
      () => {
        this.phase = 'idle';
      },
    );
    this.config.onCycleResolved({
      completed: false,
      cancelled: true,
      hook_set: false,
      locked_in_band: false,
      lock_source: null,
      outcome_tier: null,
      item_id: null,
      item_delivery: null,
      pull_position: null,
      deck_form: null,
      post_depletion: false,
      depleted_now: false,
      cycle_duration_ms: Date.now() - this.cycleStartedAt,
    });
  }

  private teardownTimingWindow(): void {
    const { scene } = this.config;

    this.timingTick?.remove();
    this.timingTick = null;
    this.markerInBandNow = false;

    for (const part of this.timingUi) {
      part.destroy();
    }

    this.timingUi = [];
    this.timingMarker = null;

    if (this.keyHandlerF !== null) {
      scene.input.keyboard?.off('keydown-F', this.keyHandlerF);
      this.keyHandlerF = null;
    }

    if (this.keyHandlerSpace !== null) {
      scene.input.keyboard?.off('keydown-SPACE', this.keyHandlerSpace);
      this.keyHandlerSpace = null;
    }

    if (this.pointerHandler !== null) {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerHandler);
      this.pointerHandler = null;
    }
  }

  private teardownCycleObjects(): void {
    this.teardownTimingWindow();
    this.lowerTween?.remove();
    this.lowerTween = null;
    this.reelTween?.remove();
    this.reelTween = null;
    this.cooldownTimer?.remove();
    this.cooldownTimer = null;
    this.cable?.destroy();
    this.cable = null;
    this.magnet?.destroy();
    this.magnet = null;
    this.payloadIcon?.destroy();
    this.payloadIcon = null;
  }
}
