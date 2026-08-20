/**
 * Slot-grid renderer for the inventory UI (interactive inventory
 * foundation).
 *
 * Renders one container as a labelled grid of interactive slot cells and
 * keeps the visuals in sync with the authoritative InventoryState. Input
 * WIRING lives in the overlay scene (one scene-level drag pipeline for
 * every grid); each cell only carries its SlotAddress in its data and its
 * interactive/drop-zone registration. The view never mutates inventory
 * state.
 */

import Phaser from 'phaser';

import { getItemDefinition } from '../itemDefs';
import type { InventoryState } from '../model';
import { INV_COLORS, INV_FONT, INV_TEXT, SLOT_PITCH, SLOT_SIZE } from './theme';

export interface SlotAddress {
  containerId: string;
  slotIndex: number;
}

export const SLOT_ADDRESS_KEY = 'inventorySlotAddress';

export interface SlotGridConfig {
  scene: Phaser.Scene;
  containerId: string;
  label: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  /** Hotbar styling + 1-0 index badges. */
  hotbar?: boolean;
  /** Non-player container chrome (storage/workbench/workstation grids). */
  containerChrome?: boolean;
  /** Short per-definition code badges (M02 document codes). */
  codeBadges?: Record<string, string>;
  /** Grid participates in pointer/keyboard interaction (default true). */
  interactive?: boolean;
  depth?: number;
}

export interface SlotGridUiState {
  focusIndex: number | null;
  /** Source slot of the held/dragged stack (reserved placeholder look). */
  reservedIndex: number | null;
  /** Current drag-hover target and whether the drop would be valid. */
  dropIndex: number | null;
  dropValid: boolean;
  /** Legacy hotbar selection ring. */
  selectionIndex: number | null;
}

export interface SlotProbeEntry {
  container_id: string;
  slot_index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  definition_id: string | null;
  quantity: number;
  code: string | null;
}

interface SlotCell {
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null;
  iconLabel: Phaser.GameObjects.Text | null;
  quantity: Phaser.GameObjects.Text;
  code: Phaser.GameObjects.Text;
}

export class SlotGridView {
  readonly containerId: string;
  readonly capacity: number;
  readonly cols: number;
  private readonly scene: Phaser.Scene;
  private readonly config: SlotGridConfig;
  private readonly cells: SlotCell[] = [];
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly depth: number;

  constructor(config: SlotGridConfig) {
    this.scene = config.scene;
    this.config = config;
    this.containerId = config.containerId;
    this.cols = config.cols;
    this.capacity = config.cols * config.rows;
    this.depth = config.depth ?? 22;

    this.labelText = config.scene.add
      .text(config.x, config.y - 16, config.label, {
        color: config.hotbar ? INV_TEXT.accent : INV_TEXT.dim,
        font: INV_FONT.section,
      })
      .setOrigin(0, 0)
      .setDepth(this.depth)
      .setScrollFactor(0);

    const interactive = config.interactive ?? true;

    for (let index = 0; index < this.capacity; index++) {
      const { x, y } = this.cellOrigin(index);
      const background = config.scene.add
        .rectangle(x, y, SLOT_SIZE, SLOT_SIZE, this.baseFill(), 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, this.baseStroke())
        .setDepth(this.depth)
        .setScrollFactor(0);

      background.setData(SLOT_ADDRESS_KEY, {
        containerId: config.containerId,
        slotIndex: index,
      } satisfies SlotAddress);

      if (interactive) {
        background.setInteractive({ useHandCursor: true });

        if (background.input !== null) {
          background.input.dropZone = true;
        }

        config.scene.input.setDraggable(background);
      }

      const quantity = config.scene.add
        .text(x + SLOT_SIZE - 3, y + SLOT_SIZE - 3, '', {
          color: INV_TEXT.text,
          font: INV_FONT.qty,
        })
        .setOrigin(1, 1)
        .setDepth(this.depth + 2)
        .setScrollFactor(0);

      // Code badge: bright ink on its own dark chip along the cell's
      // lower edge, legible regardless of the icon behind it.
      const code = config.scene.add
        .text(x + SLOT_SIZE / 2, y + SLOT_SIZE - 7, '', {
          backgroundColor: '#1d2733',
          color: INV_TEXT.text,
          font: INV_FONT.small,
          padding: { x: 2, y: 0 },
        })
        .setOrigin(0.5)
        .setDepth(this.depth + 3)
        .setScrollFactor(0);

      if (config.hotbar) {
        config.scene.add
          .text(x + 3, y + 2, `${(index + 1) % 10}`, {
            color: INV_TEXT.faint,
            font: INV_FONT.small,
          })
          .setOrigin(0, 0)
          .setDepth(this.depth + 2)
          .setScrollFactor(0);
      }

      this.cells.push({
        background,
        icon: null,
        iconLabel: null,
        quantity,
        code,
      });
    }
  }

  private baseFill(): number {
    return this.config.hotbar
      ? INV_COLORS.hotbarSlot
      : this.config.containerChrome
        ? INV_COLORS.containerSlot
        : INV_COLORS.slot;
  }

  private baseStroke(): number {
    return this.config.hotbar
      ? INV_COLORS.hotbarStroke
      : this.config.containerChrome
        ? INV_COLORS.containerStroke
        : INV_COLORS.slotStroke;
  }

  private cellOrigin(index: number): { x: number; y: number } {
    return {
      x: this.config.x + (index % this.cols) * SLOT_PITCH,
      y: this.config.y + Math.floor(index / this.cols) * SLOT_PITCH,
    };
  }

  cellCenter(index: number): { x: number; y: number } {
    const { x, y } = this.cellOrigin(index);

    return { x: x + SLOT_SIZE / 2, y: y + SLOT_SIZE / 2 };
  }

  refresh(state: InventoryState, ui: SlotGridUiState) {
    const container = state.containers[this.containerId];

    for (let index = 0; index < this.capacity; index++) {
      const cell = this.cells[index];
      const stack = container?.slots[index] ?? null;
      const isFocus = ui.focusIndex === index;
      const isReserved = ui.reservedIndex === index;
      const isDrop = ui.dropIndex === index;
      const isSelected = ui.selectionIndex === index;

      // Fill: valid drop target > reserved placeholder > base look.
      cell.background.setFillStyle(
        isDrop && ui.dropValid
          ? INV_COLORS.dropValidFill
          : isReserved
            ? INV_COLORS.reserved
            : this.baseFill(),
        1,
      );

      // Stroke priority: drop target (3px, distinct from the 2px focus
      // ring) > focus > selection > base.
      if (isDrop) {
        cell.background.setStrokeStyle(
          3,
          ui.dropValid ? INV_COLORS.accent : INV_COLORS.invalid,
        );
      } else if (isFocus) {
        cell.background.setStrokeStyle(2, INV_COLORS.accent);
      } else if (isSelected) {
        cell.background.setStrokeStyle(2, INV_COLORS.hotbarStroke);
      } else {
        cell.background.setStrokeStyle(1, this.baseStroke());
      }

      // Icon + labels.
      cell.icon?.destroy();
      cell.icon = null;
      cell.iconLabel?.destroy();
      cell.iconLabel = null;

      if (stack !== null) {
        const definition = getItemDefinition(stack.definitionId);
        const center = this.cellCenter(index);

        if (this.scene.textures.exists(definition.icon)) {
          cell.icon = this.scene.add
            .image(center.x, center.y - 2, definition.icon)
            .setDepth(this.depth + 1)
            .setScrollFactor(0);
        } else {
          // Fallback glyph: neutral chip + two-letter identity code.
          cell.icon = this.scene.add
            .rectangle(center.x, center.y - 2, 24, 24, 0x3d4956, 1)
            .setStrokeStyle(1, 0x62788a)
            .setDepth(this.depth + 1)
            .setScrollFactor(0);
          cell.iconLabel = this.scene.add
            .text(
              center.x,
              center.y - 2,
              definition.displayName.slice(0, 2).toUpperCase(),
              { color: INV_TEXT.dim, font: INV_FONT.small },
            )
            .setOrigin(0.5)
            .setDepth(this.depth + 2)
            .setScrollFactor(0);
        }

        cell.quantity.setText(stack.quantity > 1 ? `${stack.quantity}` : '');

        const badge = this.config.codeBadges?.[stack.definitionId] ?? '';

        cell.code.setText(badge).setVisible(badge !== '');
      } else {
        cell.quantity.setText('');
        cell.code.setText('').setVisible(false);
      }
    }
  }

  probeEntries(state: InventoryState): SlotProbeEntry[] {
    const container = state.containers[this.containerId];

    return this.cells.map((cell, index) => {
      const stack = container?.slots[index] ?? null;

      return {
        container_id: this.containerId,
        slot_index: index,
        x: cell.background.x,
        y: cell.background.y,
        w: SLOT_SIZE,
        h: SLOT_SIZE,
        definition_id: stack?.definitionId ?? null,
        quantity: stack?.quantity ?? 0,
        code:
          stack === null
            ? null
            : (this.config.codeBadges?.[stack.definitionId] ?? null),
      };
    });
  }
}
