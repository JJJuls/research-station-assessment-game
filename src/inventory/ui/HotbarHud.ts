/**
 * Quick-access hotbar HUD (interactive inventory foundation).
 *
 * The in-world strip for scenes on the NEW inventory surface (the
 * Inventory Lab): renders the authoritative ten-slot hotbar container,
 * number keys 1-0 select slots while the inventory is closed, and an
 * "I — inventory" hint anchors the advertised control. Legacy RoomScene
 * rooms keep their existing belt (src/gameplay/InventoryHud.ts), which
 * reads the same hotbar through the compatibility adapter.
 */

import Phaser from 'phaser';

import { Depth } from '../../constants';
import { getItemDefinition } from '../itemDefs';
import { CONTAINER_IDS } from '../model';
import {
  getInventoryState,
  invSelectHotbarSlot,
  onInventoryStoreChange,
} from '../store';
import { guardKeyHandler } from './keyGuard';
import { INV_COLORS, INV_FONT, INV_TEXT } from './theme';

const SLOT_SIZE = 34;
const SLOT_GAP = 4;
const BELT_X = 8;
const BELT_Y = 558;

const NUMBER_KEYS = [
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'ZERO',
] as const;

export class HotbarHud {
  private readonly scene: Phaser.Scene;
  private readonly slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: (Phaser.GameObjects.Image | null)[] = [];
  private readonly nameChip: Phaser.GameObjects.Text;
  private readonly unsubscribe: () => void;
  private readonly keyHandlers: {
    event: string;
    handler: (event: KeyboardEvent) => void;
  }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const hotbar = getInventoryState().containers[CONTAINER_IDS.playerHotbar];

    for (let index = 0; index < hotbar.capacity; index++) {
      const x = BELT_X + index * (SLOT_SIZE + SLOT_GAP);
      const background = scene.add
        .rectangle(x, BELT_Y, SLOT_SIZE, SLOT_SIZE, INV_COLORS.hotbarSlot, 0.92)
        .setOrigin(0)
        .setStrokeStyle(1, INV_COLORS.slotStroke)
        .setDepth(Depth.AboveWorld)
        .setScrollFactor(0);

      background.setInteractive({ useHandCursor: true });
      background.on('pointerdown', () => invSelectHotbarSlot(index));

      scene.add
        .text(x + 2, BELT_Y + 1, `${(index + 1) % 10}`, {
          color: INV_TEXT.faint,
          font: INV_FONT.small,
        })
        .setOrigin(0)
        .setDepth(Depth.AboveWorld)
        .setScrollFactor(0);

      this.slotBackgrounds.push(background);
      this.slotIcons.push(null);
    }

    this.nameChip = scene.add
      .text(BELT_X + 10 * (SLOT_SIZE + SLOT_GAP) + 8, BELT_Y - 18, '', {
        backgroundColor: '#101820',
        color: INV_TEXT.dim,
        font: INV_FONT.body,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    scene.add
      .text(
        BELT_X + 10 * (SLOT_SIZE + SLOT_GAP) + 8,
        BELT_Y + 9,
        'I — inventory',
        {
          backgroundColor: '#101820',
          color: INV_TEXT.accent,
          font: INV_FONT.body,
          padding: { x: 6, y: 3 },
        },
      )
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0);

    // Number keys 1-0 select hotbar slots while the inventory is closed
    // (this scene is paused while the overlay is open, so these handlers
    // are structurally inert then).
    NUMBER_KEYS.forEach((keyName, index) => {
      const handler = guardKeyHandler((event: KeyboardEvent) => {
        if (!event.repeat) {
          invSelectHotbarSlot(index);
        }
      });

      scene.input.keyboard!.on(`keydown-${keyName}`, handler);
      this.keyHandlers.push({ event: `keydown-${keyName}`, handler });
    });

    this.unsubscribe = onInventoryStoreChange(() => this.refresh());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.refresh();
  }

  private refresh() {
    const state = getInventoryState();
    const hotbar = state.containers[CONTAINER_IDS.playerHotbar];

    for (let index = 0; index < hotbar.capacity; index++) {
      const stack = hotbar.slots[index];
      const background = this.slotBackgrounds[index];
      const isSelected = state.hotbarSelection === index;

      background.setStrokeStyle(
        isSelected ? 2 : 1,
        isSelected ? INV_COLORS.accent : INV_COLORS.slotStroke,
      );

      this.slotIcons[index]?.destroy();
      this.slotIcons[index] = null;

      if (stack !== null) {
        const iconKey = getItemDefinition(stack.definitionId).icon;

        if (this.scene.textures.exists(iconKey)) {
          this.slotIcons[index] = this.scene.add
            .image(
              background.x + SLOT_SIZE / 2,
              background.y + SLOT_SIZE / 2,
              iconKey,
            )
            .setDepth(Depth.AboveWorld)
            .setScrollFactor(0);
        }
      }
    }

    const selected =
      state.hotbarSelection === null
        ? null
        : hotbar.slots[state.hotbarSelection];

    if (selected !== null && selected !== undefined) {
      this.nameChip
        .setText(getItemDefinition(selected.definitionId).displayName)
        .setVisible(true);
    } else {
      this.nameChip.setVisible(false);
    }
  }

  private destroy() {
    this.unsubscribe();

    for (const { event, handler } of this.keyHandlers) {
      this.scene.input.keyboard?.off(event, handler);
    }

    for (const icon of this.slotIcons) {
      icon?.destroy();
    }
  }
}
