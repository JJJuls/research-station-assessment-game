/**
 * Visual inventory belt (overnight playable prototype, Unit 1).
 *
 * A compact always-visible slot belt at the bottom of the viewport:
 * item icons, selected-slot highlight, selected-item name, pointer
 * selection and TAB cycling. Presentation layer over
 * src/gameplay/inventory.ts — it never mutates items except through the
 * public selection API, and it renders identically in every room
 * (uniform-salience rule).
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import {
  getInventorySlots,
  getSelectedInventoryIndex,
  getSelectedInventoryItem,
  INVENTORY_CAPACITY,
  onInventoryChange,
  selectInventorySlot,
  selectNextInventoryItem,
} from './inventory';
import { getGameItem } from './items';

const SLOT_SIZE = 34;
const SLOT_GAP = 4;
const BELT_X = 8;
const BELT_Y = 558;

export class InventoryHud {
  private scene: Phaser.Scene;
  private slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: (Phaser.GameObjects.Image | null)[] = [];
  private nameChip: Phaser.GameObjects.Text;
  private unsubscribe: () => void;
  private tabHandler: (event: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    for (let index = 0; index < INVENTORY_CAPACITY; index++) {
      const x = BELT_X + index * (SLOT_SIZE + SLOT_GAP);
      const background = scene.add
        .rectangle(x, BELT_Y, SLOT_SIZE, SLOT_SIZE, 0x101820, 0.92)
        .setOrigin(0)
        .setStrokeStyle(1, 0x33475a)
        .setDepth(Depth.AboveWorld)
        .setScrollFactor(0);

      background.setInteractive({ useHandCursor: true });
      background.on('pointerdown', () => selectInventorySlot(index));

      this.slotBackgrounds.push(background);
      this.slotIcons.push(null);
    }

    this.nameChip = scene.add
      .text(BELT_X, BELT_Y - 18, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '12px monospace',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    this.tabHandler = (event: KeyboardEvent) => {
      if (!event.repeat) {
        selectNextInventoryItem();
      }
    };
    scene.input.keyboard!.on('keydown-TAB', this.tabHandler);

    this.unsubscribe = onInventoryChange(() => this.refresh());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.refresh();
  }

  private refresh() {
    const slots = getInventorySlots();
    const selectedIndex = getSelectedInventoryIndex();

    for (let index = 0; index < slots.length; index++) {
      const itemId = slots[index];
      const background = this.slotBackgrounds[index];
      const isSelected = index === selectedIndex;

      background.setStrokeStyle(
        isSelected ? 2 : 1,
        isSelected ? 0x5fd3c4 : 0x33475a,
      );

      const existingIcon = this.slotIcons[index];
      const iconKey = itemId !== null ? getGameItem(itemId).icon : null;

      if (existingIcon !== null) {
        existingIcon.destroy();
        this.slotIcons[index] = null;
      }

      if (iconKey !== null && this.scene.textures.exists(iconKey)) {
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

    const selectedItem = getSelectedInventoryItem();

    if (selectedItem !== null) {
      this.nameChip.setText(getGameItem(selectedItem).label).setVisible(true);
    } else {
      this.nameChip.setVisible(false);
    }
  }

  private destroy() {
    this.unsubscribe();
    this.scene.input.keyboard?.off('keydown-TAB', this.tabHandler);

    for (const icon of this.slotIcons) {
      icon?.destroy();
    }

    for (const background of this.slotBackgrounds) {
      background.destroy();
    }

    this.nameChip.destroy();
  }
}
