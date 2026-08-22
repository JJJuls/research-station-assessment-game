/**
 * Persistent compact controls reference (action-assessment rebuild,
 * Unit 1).
 *
 * A small control legend in the lower-right UI column: movement,
 * interaction, the field-action keys (C/D/F), inventory and cancel/pause.
 * H toggles it. Legacy rooms start it visible (a participant must never
 * have to memorise the control scheme there); pilot zones start it hidden
 * (mission §8: no permanent wall of controls — H shows a concise overlay)
 * and pass their own key list. Mechanics-only copy: no task, trait, score
 * or outcome information (Menu controls-card precedent).
 */

import Phaser from 'phaser';

import { Depth } from '../constants';

const PANEL_X = 650;
const PANEL_Y = 470;
const PANEL_WIDTH = 146;

const CONTROLS_LINES = [
  'CONTROLS  (H hides)',
  'Arrows   move',
  'SPACE/E  interact',
  'C        scan',
  'D        dig',
  'F        winch',
  'TAB      inventory',
  'ESC      cancel',
] as const;

export interface ControlsReferenceOptions {
  /** Initial visibility (legacy rooms: true; pilot zones: false). */
  startVisible?: boolean;
  /** Replacement legend lines (first line is the header). */
  lines?: readonly string[];
  /** Panel top (pilot zones lift it above the inventory belt). */
  panelY?: number;
  /** Called after every H toggle with the new visibility (telemetry hook). */
  onToggle?: (shown: boolean) => void;
}

export class ControlsReference {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly toggleHandler: (event: KeyboardEvent) => void;
  private shown: boolean;

  constructor(scene: Phaser.Scene, options?: ControlsReferenceOptions) {
    const lines = options?.lines ?? CONTROLS_LINES;
    const panelY = options?.panelY ?? PANEL_Y;

    this.shown = options?.startVisible ?? true;
    this.text = scene.add
      .text(PANEL_X + 8, panelY + 8, lines.join('\n'), {
        color: '#9fb2c1',
        font: '11px monospace',
        lineSpacing: 3,
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0)
      .setVisible(this.shown);
    this.background = scene.add
      .rectangle(
        PANEL_X,
        panelY,
        PANEL_WIDTH,
        Math.ceil(this.text.height) + 16,
        0x101820,
        0.94,
      )
      .setOrigin(0)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(this.shown);

    this.toggleHandler = (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.shown = !this.shown;
        this.background.setVisible(this.shown);
        this.text.setVisible(this.shown);
        options?.onToggle?.(this.shown);
      }
    };
    scene.input.keyboard!.on('keydown-H', this.toggleHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off('keydown-H', this.toggleHandler);
    });
  }

  isVisible(): boolean {
    return this.shown;
  }
}
