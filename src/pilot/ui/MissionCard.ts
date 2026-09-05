/**
 * Mission card (World V1 — PROFESSIONAL-WORLD-DESIGN-V1.md §6; U2).
 *
 * The one guidance surface of the world HUD: a compact card anchored to
 * the canvas's top-left safe area with two short lines — the act title
 * and ONE next action. It never covers the play route: the card lives in
 * the canvas corner (outside the 800×600 design space at 1280×720, inside
 * the letterboxed canvas at 800×600), and every zone keeps its
 * interactables' prompts below it (RoomScene: prompt y ≥ design 80).
 *
 * Presentation only: the text comes from the story-state module (act
 * title, next action) or, in the legacy rooms, from the duty-roster line;
 * never a score, a trait, an item number or a measurement word.
 */
import Phaser from 'phaser';

import { Depth } from '../../constants';
import { DESIGN_OFFSET_X, DESIGN_SCALE } from '../../world/viewport';

/** Canvas-safe inset (canvas px) from the top-left corner. */
export const HUD_SAFE_INSET = 8;

/** Card geometry in design px (width fits 44 chars of 13 px monospace). */
export const MISSION_CARD = {
  width: 360,
  padding: 8,
  titleFont: '10px monospace',
  actionFont: '13px monospace',
} as const;

/** Design-space origin of the canvas-safe top-left corner. */
export function hudSafeOrigin(): { x: number; y: number } {
  return {
    x: (HUD_SAFE_INSET - DESIGN_OFFSET_X) / DESIGN_SCALE,
    y: HUD_SAFE_INSET / DESIGN_SCALE,
  };
}

export interface MissionCardProbe {
  title: string;
  action: string;
  /** Design-space bounds. */
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

declare global {
  interface Window {
    /** DEV-only, read-only mission-card probe (text + design bounds). */
    __missionCardProbe?: MissionCardProbe | null;
  }
}

export class MissionCard {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly action: Phaser.GameObjects.Text;
  private readonly origin = hudSafeOrigin();

  constructor(scene: Phaser.Scene) {
    const { x, y } = this.origin;
    const { width, padding } = MISSION_CARD;

    this.background = scene.add
      .rectangle(x, y, width, 44, 0x101820, 0.92)
      .setOrigin(0)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
    this.title = scene.add
      .text(x + padding, y + 5, '', {
        color: '#9fb2c1',
        font: MISSION_CARD.titleFont,
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);
    this.action = scene.add
      .text(x + padding, y + 19, '', {
        color: '#ffffff',
        font: MISSION_CARD.actionFont,
        lineSpacing: 3,
        wordWrap: { width: width - padding * 2 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__missionCardProbe = null;
      }
    });
  }

  /** Sets both lines; an empty title collapses the card to the action. */
  set(title: string, action: string) {
    const { x, y } = this.origin;
    const { padding } = MISSION_CARD;
    const hasTitle = title.length > 0;

    this.title.setText(title.toUpperCase()).setVisible(hasTitle);
    this.action.setText(action).setY(y + (hasTitle ? 19 : 6));
    this.background
      .setSize(
        MISSION_CARD.width,
        this.action.y - y + Math.ceil(this.action.height) + padding - 2,
      )
      .setVisible(action.length > 0);
    this.title.setPosition(x + padding, y + 5);
    this.action.setX(x + padding);
    this.publishProbe();
  }

  /** Design-space bottom edge (the next HUD element sits below it). */
  get bottom(): number {
    return this.background.visible
      ? this.background.y + this.background.height
      : this.origin.y;
  }

  get left(): number {
    return this.origin.x;
  }

  private publishProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    window.__missionCardProbe = {
      title: this.title.visible ? this.title.text : '',
      action: this.action.text,
      x: this.background.x,
      y: this.background.y,
      width: this.background.width,
      height: this.background.height,
      visible: this.background.visible,
    };
  }
}
