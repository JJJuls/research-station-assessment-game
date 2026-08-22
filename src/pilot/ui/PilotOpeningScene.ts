/**
 * Pilot opening (skippable) — professional pilot route, Unit 2.
 *
 * A brief in-engine arrival: the relief shuttle descends through the storm
 * onto the outpost pad, emergency lighting flickers, three short captions,
 * then control is handed to the Dock. Any key or click skips. Drawn with
 * engine primitives and the route's own textures — no inconsistent
 * storyboard stills (mission §5). Modal over the paused Dock; skipping or
 * finishing changes NO measurement entry state (the Dock's control
 * tutorial starts identically either way). Logs `pilot_opening_*`
 * (unmapped route telemetry) through the Dock host.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { prefersReducedMotion } from '../../inventory/ui/theme';

interface OpeningLaunchData {
  resumeKey: string;
  onDone?: (outcome: 'completed' | 'skipped') => void;
}

const CAPTIONS = [
  'Relief flight 7 — outpost approach. Overnight electromagnetic storm.',
  'Station on emergency power. Records disordered, coolant line damaged.',
  'You are the relief operations specialist. Control passes to you at the dock.',
] as const;

const CAPTION_MS = 2300;

declare global {
  interface Window {
    /** DEV-only, read-only opening probe. */
    __pilotOpeningProbe?: {
      open: boolean;
      caption_index: number;
      outcome: 'completed' | 'skipped' | null;
    } | null;
  }
}

export class PilotOpeningScene extends Phaser.Scene {
  private resumeKey: string = key.scene.dock;
  private onDone: OpeningLaunchData['onDone'];
  private finished = false;
  private captionIndex = 0;
  private captionText!: Phaser.GameObjects.Text;
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super(key.scene.pilotOpening);
  }

  init(data?: Partial<OpeningLaunchData>) {
    this.resumeKey = data?.resumeKey ?? key.scene.dock;
    this.onDone = data?.onDone;
    this.finished = false;
    this.captionIndex = 0;
    this.timers = [];
  }

  create() {
    this.scene.bringToTop();

    const reduced = prefersReducedMotion();

    // Sky / ground
    this.add.rectangle(400, 300, 800, 600, 0x070b12, 1);
    this.add.rectangle(400, 470, 800, 260, 0x141b24, 1);
    this.add.rectangle(400, 345, 800, 6, 0x1f2a36, 1);

    // Outpost silhouette (modules + core column + beacon)
    this.add
      .rectangle(560, 318, 190, 56, 0x1b2633, 1)
      .setStrokeStyle(1, 0x2e3e4e);
    this.add
      .rectangle(690, 300, 70, 92, 0x1b2633, 1)
      .setStrokeStyle(1, 0x2e3e4e);
    this.add.rectangle(690, 240, 10, 40, 0x2b3a4a, 1);
    const beacon = this.add.circle(690, 216, 4, 0x9a7a3a, 1);
    const windows = [520, 560, 600].map((x) =>
      this.add.rectangle(x, 318, 12, 8, 0x3a4a2a, 1),
    );

    // Storm: drifting snow streaks (deterministic positions)
    const streaks: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < 60; i += 1) {
      const x = (i * 97) % 800;
      const y = (i * 53) % 340;

      streaks.push(this.add.rectangle(x, y, 2, 8, 0x8fa4b8, 0.45));
    }

    // Shuttle
    const shuttle = this.add.container(180, 70, [
      this.add.rectangle(0, 0, 84, 26, 0x9fb2c1, 1).setStrokeStyle(1, 0x33475a),
      this.add.rectangle(-30, -12, 24, 12, 0x5fd3c4, 0.8),
      this.add.rectangle(40, 4, 22, 8, 0x6f8498, 1),
      this.add.rectangle(-46, 10, 16, 6, 0x6f8498, 1),
    ]);
    const pad = this.add.rectangle(300, 356, 160, 10, 0x2b3a4a, 1);

    this.captionText = this.add
      .text(400, 420, CAPTIONS[0], {
        color: '#dfe9f1',
        font: '15px monospace',
        backgroundColor: '#101820',
        padding: { x: 14, y: 8 },
        wordWrap: { width: 640 },
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(400, 560, 'Press any key or click to skip', {
        color: '#9fb2c1',
        font: '12px monospace',
      })
      .setOrigin(0.5);

    if (!reduced) {
      this.tweens.add({
        targets: shuttle,
        x: 300,
        y: 330,
        duration: CAPTION_MS * 2,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: beacon,
        alpha: { from: 1, to: 0.2 },
        duration: 650,
        yoyo: true,
        repeat: -1,
      });
      // Emergency-power flicker on the windows.
      this.tweens.add({
        targets: windows,
        alpha: { from: 1, to: 0.15 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        repeatDelay: 900,
      });
      this.tweens.add({
        targets: streaks,
        y: '+=340',
        x: '-=90',
        duration: 2600,
        repeat: -1,
      });
      this.tweens.add({
        targets: pad,
        alpha: { from: 0.6, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    } else {
      shuttle.setPosition(300, 330);
    }

    for (let i = 1; i < CAPTIONS.length; i += 1) {
      this.timers.push(
        this.time.delayedCall(CAPTION_MS * i, () => {
          this.captionIndex = i;
          this.captionText.setText(CAPTIONS[i]);
          this.refreshProbe(null);
        }),
      );
    }

    this.timers.push(
      this.time.delayedCall(CAPTION_MS * CAPTIONS.length + 600, () =>
        this.finish('completed'),
      ),
    );

    const skip = () => this.finish('skipped');

    this.input.keyboard!.once('keydown', skip);
    this.input.once('pointerdown', skip);

    this.refreshProbe(null);
  }

  private finish(outcome: 'completed' | 'skipped') {
    if (this.finished) {
      return;
    }

    this.finished = true;

    for (const timer of this.timers) {
      timer.remove(false);
    }

    this.refreshProbe(outcome);
    this.onDone?.(outcome);
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }

  private refreshProbe(outcome: 'completed' | 'skipped' | null) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotOpeningProbe = {
        open: outcome === null,
        caption_index: this.captionIndex,
        outcome,
      };
    }
  }
}
