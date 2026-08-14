import Phaser from 'phaser';

import { Depth } from '../constants';

/**
 * Route-guidance HUD for the four-zone assessment route (map foundation
 * unit). Presentation only — it renders navigation guidance and never
 * logs, never gates input, and never reads or writes research state:
 *
 * - one persistent route-objective line (top-left), e.g.
 *   "Route orientation: proceed to the Diagnostics Laboratory.";
 * - a brief zone-title card on entry (never a permanent banner);
 * - a controls legend that is HIDDEN by default and toggled with H
 *   (mechanics-only copy — no task, trait, score or outcome text).
 *
 * The HUD deliberately does not overlap the transient feedback line
 * (viewport top-centre, y 72) or the contextual interact hint (world
 * space): objective top-left, legend bottom-right, title centred and
 * transient.
 */

const LEGEND_X = 650;
const LEGEND_Y = 494;
const LEGEND_WIDTH = 146;

const LEGEND_LINES = [
  'CONTROLS  (H hides)',
  'Arrows   move',
  'SPACE/E  interact',
  'ESC      pause',
  'M        sound',
] as const;

/** Honour the OS reduced-motion preference (effects.ts precedent). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export class RouteGuidanceHud {
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly legendBackground: Phaser.GameObjects.Rectangle;
  private readonly legendText: Phaser.GameObjects.Text;
  private readonly toggleHandler: (event: KeyboardEvent) => void;
  private legendShown = false;
  private objective: string;

  constructor(scene: Phaser.Scene, zoneName: string, objective: string) {
    this.objective = objective;

    // Persistent route-objective line — exactly one primary objective at
    // a time (single-line directive; no duty lists, no option menus).
    this.objectiveText = scene.add
      .text(8, 8, objective, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '13px monospace',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    // Controls legend — hidden by default; H toggles.
    this.legendText = scene.add
      .text(LEGEND_X + 8, LEGEND_Y + 8, LEGEND_LINES.join('\n'), {
        color: '#9fb2c1',
        font: '11px monospace',
        lineSpacing: 3,
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0)
      .setVisible(false);
    this.legendBackground = scene.add
      .rectangle(
        LEGEND_X,
        LEGEND_Y,
        LEGEND_WIDTH,
        Math.ceil(this.legendText.height) + 16,
        0x101820,
        0.94,
      )
      .setOrigin(0)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    this.toggleHandler = (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.legendShown = !this.legendShown;
        this.legendBackground.setVisible(this.legendShown);
        this.legendText.setVisible(this.legendShown);
      }
    };
    scene.input.keyboard!.on('keydown-H', this.toggleHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off('keydown-H', this.toggleHandler);
    });

    this.showZoneTitle(scene, zoneName);
  }

  /** Brief centred zone-title card, removed after ~2.6 s. */
  private showZoneTitle(scene: Phaser.Scene, zoneName: string) {
    const title = scene.add
      .text(400, 180, zoneName, {
        backgroundColor: '#101820',
        color: '#ffffff',
        font: '20px monospace',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0);
    const rule = scene.add
      .rectangle(400, 202, Math.ceil(title.width) - 16, 1, 0x5fd3c4, 0.8)
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0);

    const destroyTitle = () => {
      title.destroy();
      rule.destroy();
    };

    if (prefersReducedMotion()) {
      scene.time.delayedCall(2600, destroyTitle);
    } else {
      scene.tweens.add({
        targets: [title, rule],
        alpha: 0,
        delay: 2000,
        duration: 600,
        ease: 'Sine.easeIn',
        onComplete: destroyTitle,
      });
    }
  }

  setObjective(text: string) {
    this.objective = text;
    this.objectiveText.setText(text);
  }

  currentObjective(): string {
    return this.objective;
  }

  isLegendVisible(): boolean {
    return this.legendShown;
  }
}
