/**
 * Scan controller (field-actions foundation).
 *
 * The participant-facing scanning action: C runs one brief scan sweep
 * as a timed world action (progress-bar convention), an expanding
 * radial pulse centres on the participant, and a compact readout shows
 * strength (0-100), category and the temporal trend against the
 * preceding comparable scan. A short visible cooldown separates scans;
 * pressing C during cooldown gets neutral, non-punitive feedback.
 *
 * Scientific constraints honoured here: no direction arrow, no target
 * coordinates, trend compares only scans of the SAME opportunity
 * context and SAME target, and entering another opportunity resets the
 * comparison baseline (setContext/resetContextBaseline). Audio feedback
 * is a neutral ping whose repetition rate rises with the strength
 * category — consistent for everyone, never directional.
 *
 * Telemetry stays with the host: every resolved scan is reported
 * through onResolved; the controller itself never logs.
 */

import type Phaser from 'phaser';

import { Depth } from '../constants';
import { playActionAnimation } from '../gameplay/actionAnimations';
import { performWorldAction } from '../gameplay/actions';
import { sfxScan, sfxUiMove } from '../gameplay/audio';
import { ringPulse } from '../gameplay/effects';
import type { FieldTargetRegistry } from './fieldTargetRegistry';
import type { SignalCategory, SignalTrend } from './signalModel';
import {
  categorizeSignal,
  compareSignalTrend,
  SCAN_ACTION_DURATION_MS,
  SCAN_COOLDOWN_MS,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_TREND_LABELS,
} from './signalModel';

export interface ScanRecord {
  context_id: string;
  player_x: number;
  player_y: number;
  target_id: string | null;
  form_id: string | null;
  zone_id: string | null;
  distance: number | null;
  detection_radius: number | null;
  strength: number;
  category: SignalCategory;
  trend: SignalTrend | null;
}

export interface ScanControllerConfig {
  scene: Phaser.Scene;
  registry: FieldTargetRegistry;
  getPlayerPosition: () => { x: number; y: number };
  onResolved: (record: ScanRecord) => void;
  showFeedback: (message: string) => void;
}

interface ScanBaseline {
  target_id: string | null;
  strength: number;
}

const READOUT_X = 8;
const READOUT_Y = 56;

export class ScanController {
  private readonly config: ScanControllerConfig;
  private cooldownUntil = 0;
  private contextId = 'free';
  /** Trend baselines per opportunity context. */
  private readonly baselines = new Map<string, ScanBaseline>();
  private readout: Phaser.GameObjects.Text | null = null;
  private cooldownBar: Phaser.GameObjects.Rectangle | null = null;
  private readoutTimer: Phaser.Time.TimerEvent | null = null;
  /** Most recent resolved record (host probe convenience). */
  lastRecord: ScanRecord | null = null;

  constructor(config: ScanControllerConfig) {
    this.config = config;
  }

  /**
   * Switches the trend-comparison context (opportunity windows call
   * this on open/close) and clears that context's baseline so the
   * first scan of a window never inherits an earlier comparison.
   */
  setContext(contextId: string): void {
    this.contextId = contextId;
    this.baselines.delete(contextId);
  }

  getContext(): string {
    return this.contextId;
  }

  isCoolingDown(): boolean {
    return this.config.scene.time.now < this.cooldownUntil;
  }

  /** Cooldown refusal feedback (neutral, non-punitive). */
  showCooldownFeedback(): void {
    this.config.showFeedback('The scanner is recalibrating — one moment.');
  }

  /**
   * Starts one scan sweep. Returns false when another world action is
   * already running (the global mutex refuses it) or cooldown holds.
   */
  performScan(): boolean {
    if (this.isCoolingDown()) {
      this.showCooldownFeedback();

      return false;
    }

    const { scene } = this.config;
    const position = this.config.getPlayerPosition();
    const started = performWorldAction({
      scene,
      x: position.x,
      y: position.y,
      label: 'Scanning…',
      durationMs: SCAN_ACTION_DURATION_MS,
      cancellable: true,
      onComplete: () => this.resolveScan(),
    });

    if (started) {
      playActionAnimation({
        scene,
        x: position.x,
        y: position.y,
        kind: 'scan',
        icon: 'proc-icon-field-scanner',
        durationMs: SCAN_ACTION_DURATION_MS,
      });
    }

    return started;
  }

  private resolveScan(): void {
    const { scene, registry } = this.config;
    const position = this.config.getPlayerPosition();
    const reading = registry.resolveReading(position.x, position.y);
    const strength = reading?.strength ?? 0;
    const category = categorizeSignal(strength);
    const targetId = reading?.target.target_id ?? null;

    // Trend: only against the preceding comparable scan — same context
    // AND same (non-null) target. A target change breaks comparability.
    const baseline = this.baselines.get(this.contextId) ?? null;
    const comparable =
      baseline !== null && targetId !== null && baseline.target_id === targetId;
    const trend = comparable
      ? compareSignalTrend(baseline.strength, strength)
      : null;

    this.baselines.set(this.contextId, { target_id: targetId, strength });

    const record: ScanRecord = {
      context_id: this.contextId,
      player_x: Math.round(position.x),
      player_y: Math.round(position.y),
      target_id: targetId,
      form_id: reading?.target.form_id ?? null,
      zone_id: reading?.target.zone_id ?? null,
      distance: reading === null ? null : Math.round(reading.distance),
      detection_radius: reading?.target.detection_radius ?? null,
      strength,
      category,
      trend,
    };

    this.lastRecord = record;
    this.cooldownUntil = scene.time.now + SCAN_COOLDOWN_MS;

    // Presentation: expanding radial pulse centred on the participant.
    ringPulse(scene, position.x, position.y, {
      color: 0x5fd3c4,
      endRadius: 84,
      rings: 3,
      durationMs: 700,
    });
    this.playStrengthAudio(category);
    this.showReadout(record);

    this.config.onResolved(record);
  }

  /** Neutral ping whose repetition count rises with signal strength. */
  private playStrengthAudio(category: SignalCategory): void {
    const pings =
      category === 'none'
        ? 0
        : category === 'faint'
          ? 1
          : category === 'moderate'
            ? 2
            : 3;

    if (pings === 0) {
      sfxUiMove();

      return;
    }

    for (let i = 0; i < pings; i++) {
      this.config.scene.time.delayedCall(i * 150, () => sfxScan());
    }
  }

  private showReadout(record: ScanRecord): void {
    const { scene } = this.config;
    const trendLine =
      record.trend === null
        ? record.target_id === null
          ? 'no comparable prior sweep'
          : 'first sweep on this signal'
        : SIGNAL_TREND_LABELS[record.trend];
    const text =
      record.category === 'none'
        ? `SIGNAL  —  ${SIGNAL_CATEGORY_LABELS.none}`
        : `SIGNAL ${String(record.strength).padStart(3, ' ')}  ${
            SIGNAL_CATEGORY_LABELS[record.category]
          }\n${trendLine}`;

    this.readout?.destroy();
    this.cooldownBar?.destroy();
    this.readoutTimer?.remove();

    this.readout = scene.add
      .text(READOUT_X, READOUT_Y, text, {
        backgroundColor: '#101820',
        color: '#dce7f0',
        font: '12px monospace',
        lineSpacing: 3,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    // Visible cooldown: a thin bar under the readout drains over the
    // cooldown span (pure presentation of the recalibration interval).
    const barWidth = Math.max(60, this.readout.width);

    this.cooldownBar = scene.add
      .rectangle(
        READOUT_X,
        READOUT_Y + this.readout.height + 2,
        barWidth,
        3,
        0x5fd3c4,
        0.8,
      )
      .setOrigin(0, 0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
    scene.tweens.add({
      targets: this.cooldownBar,
      width: 0,
      duration: SCAN_COOLDOWN_MS,
      ease: 'Linear',
    });

    this.readoutTimer = scene.time.delayedCall(2600, () => {
      this.readout?.destroy();
      this.cooldownBar?.destroy();
      this.readout = null;
      this.cooldownBar = null;
    });
  }
}
