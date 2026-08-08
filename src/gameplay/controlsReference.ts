/**
 * Persistent compact controls reference (action-assessment rebuild,
 * Unit 1).
 *
 * A small always-available control legend in the lower-right UI column:
 * movement, interaction, the field-action keys (C/D/F), inventory
 * cycling and cancel/pause. H toggles it, so screenshots and players who
 * know the controls can clear the corner — but it starts visible in
 * every room (a participant must never have to memorise the control
 * scheme). Mechanics-only copy: no task, trait, score or outcome
 * information (Menu controls-card precedent).
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

export class ControlsReference {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly toggleHandler: (event: KeyboardEvent) => void;
  private shown = true;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(PANEL_X + 8, PANEL_Y + 8, CONTROLS_LINES.join('\n'), {
        color: '#9fb2c1',
        font: '11px monospace',
        lineSpacing: 3,
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld + 1)
      .setScrollFactor(0);
    this.background = scene.add
      .rectangle(
        PANEL_X,
        PANEL_Y,
        PANEL_WIDTH,
        Math.ceil(this.text.height) + 16,
        0x101820,
        0.94,
      )
      .setOrigin(0)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    this.toggleHandler = (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.shown = !this.shown;
        this.background.setVisible(this.shown);
        this.text.setVisible(this.shown);
      }
    };
    scene.input.keyboard!.on('keydown-H', this.toggleHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off('keydown-H', this.toggleHandler);
    });
  }
}
