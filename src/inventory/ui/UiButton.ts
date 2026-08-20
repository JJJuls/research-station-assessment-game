/**
 * Compact industrial push-button for the inventory UI (Sort, Assemble,
 * Commit, Close, Reference, Run Press). Pointer + programmatic activation
 * share one handler so keyboard flows can trigger the same action.
 */

import Phaser from 'phaser';

import { INV_COLORS, INV_FONT, INV_TEXT } from './theme';

export interface UiButtonConfig {
  scene: Phaser.Scene;
  id: string;
  x: number;
  y: number;
  width: number;
  label: string;
  onActivate: () => void;
  /** Visual weight: 'accent' for primary actions, 'plain' otherwise. */
  kind?: 'accent' | 'plain' | 'caution';
  depth?: number;
}

export class UiButton {
  readonly id: string;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private enabled = true;
  private armed = false;
  private readonly baseFill: number;
  private readonly baseStroke: number;

  constructor(config: UiButtonConfig) {
    const kind = config.kind ?? 'plain';
    const depth = config.depth ?? 30;

    this.id = config.id;
    this.baseFill = kind === 'accent' ? 0x1c3b3a : INV_COLORS.section;
    this.baseStroke =
      kind === 'accent'
        ? INV_COLORS.accent
        : kind === 'caution'
          ? INV_COLORS.caution
          : INV_COLORS.panelStroke;

    this.background = config.scene.add
      .rectangle(config.x, config.y, config.width, 24, this.baseFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, this.baseStroke)
      .setDepth(depth)
      .setScrollFactor(0);

    this.text = config.scene.add
      .text(config.x + config.width / 2, config.y + 12, config.label, {
        color:
          kind === 'accent'
            ? INV_TEXT.accent
            : kind === 'caution'
              ? INV_TEXT.caution
              : INV_TEXT.dim,
        font: INV_FONT.section,
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setScrollFactor(0);

    this.background.setInteractive({ useHandCursor: true });
    this.background.on('pointerover', () => {
      if (this.enabled) {
        this.background.setFillStyle(0x24323e);
      }
    });
    this.background.on('pointerout', () => {
      this.armed = false;
      this.background.setFillStyle(this.baseFill, this.enabled ? 1 : 0.4);
    });
    // Armed press: activation needs a matched pointerdown on this button,
    // so releasing a drag over a button never triggers it.
    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.armed = true;
      }
    });
    this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.enabled && this.armed && pointer.button === 0) {
        config.onActivate();
      }

      this.armed = false;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.background.setFillStyle(this.baseFill, enabled ? 1 : 0.4);
    this.text.setAlpha(enabled ? 1 : 0.45);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setLabel(label: string) {
    this.text.setText(label);
  }

  bounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.background.x,
      y: this.background.y,
      width: this.background.width,
      height: this.background.height,
    };
  }

  label(): string {
    return this.text.text;
  }

  setVisible(visible: boolean) {
    this.background.setVisible(visible);
    this.text.setVisible(visible);
  }

  destroy() {
    this.background.destroy();
    this.text.destroy();
  }
}
