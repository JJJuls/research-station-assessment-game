/**
 * Visual inventory belt (overnight playable prototype, Unit 1; World V1).
 *
 * A compact slot belt at the bottom of the viewport: item icons,
 * selected-slot highlight, a transient selected-item name, pointer
 * selection and TAB cycling. Presentation layer over
 * src/gameplay/inventory.ts — it never mutates items except through the
 * public selection API, and it renders identically in every room where
 * it is shown. World V1 (INVENTORY-ITEM-PURPOSE-AUDIT.md §3): the belt is
 * shown only where the host room says it is relevant (field tools in the
 * yard), never while empty, and the selected item's name appears for
 * 1.5 s after a selection change instead of permanently.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import {
  getItemDefinition,
  isKnownItemDefinition,
} from '../inventory/itemDefs';
import {
  getInventorySlots,
  getSelectedInventoryIndex,
  getSelectedInventoryItem,
  INVENTORY_CAPACITY,
  onInventoryChange,
  selectInventorySlot,
  selectNextInventoryItem,
} from './inventory';
import { getGameItem, isKnownGameItem } from './items';

/**
 * Belt presentation for any stack the authoritative inventory can hold:
 * legacy carry items keep their gameplay registry entry; every other
 * inventory definition (supplies, records, components) falls back to its
 * inventory definition. Never throws — the belt must never abort a store
 * change listener (professional pilot, Unit 3 fix).
 */
function beltPresentation(itemId: string): {
  icon: string | null;
  label: string;
} {
  if (isKnownGameItem(itemId)) {
    const item = getGameItem(itemId);

    return { icon: item.icon, label: item.label };
  }

  if (isKnownItemDefinition(itemId)) {
    const definition = getItemDefinition(itemId);

    return { icon: definition.icon, label: definition.displayName };
  }

  return { icon: null, label: itemId };
}

const SLOT_SIZE = 34;
const SLOT_GAP = 4;
const BELT_X = 8;
const BELT_Y = 558;
/** How long the selected-item name stays after a selection change. */
const NAME_CHIP_MS = 1500;

export class InventoryHud {
  private scene: Phaser.Scene;
  private slotBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private slotIcons: (Phaser.GameObjects.Image | null)[] = [];
  private nameChip: Phaser.GameObjects.Text;
  private nameTimer: Phaser.Time.TimerEvent | null = null;
  private lastSelected: string | null = null;
  private unsubscribe: () => void;
  private tabHandler: (event: KeyboardEvent) => void;
  private pauseHandler: () => void;
  private resumeHandler: () => void;

  constructor(
    scene: Phaser.Scene,
    private readonly relevant: () => boolean = () => true,
  ) {
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
        font: '14px monospace',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0)
      .setDepth(Depth.AboveWorld)
      .setScrollFactor(0)
      .setVisible(false);

    this.tabHandler = (event: KeyboardEvent) => {
      // Review A-7: TAB never moves browser focus off the canvas.
      event.preventDefault();

      if (!event.repeat && this.relevant()) {
        selectNextInventoryItem();
      }
    };
    scene.input.keyboard!.on('keydown-TAB', this.tabHandler);

    this.unsubscribe = onInventoryChange(() => this.refresh());
    // Unit 7 (V12): the caption peeked out beside every modal panel; it
    // hides while the host is paused and returns on resume. The handlers
    // are removed on SHUTDOWN — scene event listeners survive a scene
    // restart, and a stale handler would touch a destroyed caption.
    this.pauseHandler = () => {
      if (this.nameChip.active) {
        this.nameChip.setVisible(false);
      }
    };
    this.resumeHandler = () => {
      if (this.nameChip.active) {
        this.refresh();
      }
    };
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.pauseHandler);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.resumeHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.refresh();
  }

  private refresh() {
    const slots = getInventorySlots();
    const selectedIndex = getSelectedInventoryIndex();
    // The belt is hidden while empty and wherever the room says the
    // hotbar is not relevant (World V1). Selection and TAB still work the
    // moment it is shown.
    const shown = slots.some((itemId) => itemId !== null) && this.relevant();

    for (const background of this.slotBackgrounds) {
      background.setVisible(shown);

      if (background.input) {
        background.input.enabled = shown;
      }
    }

    for (let index = 0; index < slots.length; index++) {
      const itemId = slots[index];
      const background = this.slotBackgrounds[index];
      const isSelected = index === selectedIndex;

      background.setStrokeStyle(
        isSelected ? 2 : 1,
        isSelected ? 0x5fd3c4 : 0x33475a,
      );

      const existingIcon = this.slotIcons[index];
      const iconKey = itemId !== null ? beltPresentation(itemId).icon : null;

      if (existingIcon !== null) {
        existingIcon.destroy();
        this.slotIcons[index] = null;
      }

      if (shown && iconKey !== null && this.scene.textures.exists(iconKey)) {
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

    if (!shown || selectedItem === null) {
      this.nameChip.setVisible(false);
      this.lastSelected = selectedItem;
      return;
    }

    // Transient caption: shown on a selection change, then withdrawn.
    if (selectedItem !== this.lastSelected) {
      this.lastSelected = selectedItem;
      this.nameChip
        .setText(beltPresentation(selectedItem).label)
        .setVisible(true);
      this.nameTimer?.remove(false);
      this.nameTimer = this.scene.time.delayedCall(NAME_CHIP_MS, () => {
        if (this.nameChip.active) {
          this.nameChip.setVisible(false);
        }
      });
    }
  }

  private destroy() {
    this.unsubscribe();
    this.nameTimer?.remove(false);
    this.scene.input.keyboard?.off('keydown-TAB', this.tabHandler);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.pauseHandler);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.resumeHandler);

    for (const icon of this.slotIcons) {
      icon?.destroy();
    }

    for (const background of this.slotBackgrounds) {
      background.destroy();
    }

    this.nameChip.destroy();
  }
}
