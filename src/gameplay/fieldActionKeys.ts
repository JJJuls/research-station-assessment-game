/**
 * Field-action key language (action-assessment rebuild, Unit 1).
 *
 * One consistent, reusable key vocabulary for embodied world actions:
 *
 *   C — activate the field scanner (eligible survey ground)
 *   D — dig / extract (eligible terrain or fixtures, in reach)
 *   F — operate the salvage winch rig (in range of the rig)
 *
 * A hosting scene registers bindings; the controller renders a compact
 * contextual hint chip per action ONLY while that action currently has an
 * eligible target in reach (contextual control hints, never permanent
 * banners), listens for the key, and routes the press to the host's
 * perform callback. The controller owns presentation and input routing
 * only: hosts own all task state, eligibility semantics, feedback and
 * telemetry — exactly the PhysicalManipulationLayer division of
 * responsibility. Nothing here logs an event.
 *
 * DEV probe: window.__actionHints (read-only, production-stripped) lists
 * the currently visible action hints so runtime verification can assert
 * eligibility without pixel-reading.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';

export type FieldActionKey = 'C' | 'D' | 'F';

export interface FieldActionBinding {
  key: FieldActionKey;
  /** Short verb chip label, e.g. 'Scan', 'Dig', 'Winch'. */
  label: string;
  /**
   * The action's current eligible world target, or null when the action
   * is unavailable here/now (chip hidden, key inert). Hosts apply their
   * own reach rule inside this.
   */
  getTarget: () => { x: number; y: number } | null;
  /**
   * Key pressed with an eligible target. The host performs the action
   * (usually via performWorldAction) and surfaces its own feedback for
   * refusals — presses are otherwise silent.
   */
  perform: (target: { x: number; y: number }) => void;
  /**
   * Key pressed with NO eligible target (invalid-location press). Hosts
   * use this for neutral guidance feedback in contexts where the action
   * concept applies (e.g. D pressed on unmarked ground inside a survey
   * sector) and stay silent elsewhere. Optional; default is silence.
   */
  onIneligiblePress?: () => void;
}

interface HintChip {
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

declare global {
  interface Window {
    /** DEV-only, read-only action-hint probe (never read back). */
    __actionHints?: {
      scene: string;
      hints: { key: FieldActionKey; label: string }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__actionHints = null;
}

/** Hint chip row: in the free strip right of the inventory belt. */
const CHIP_ROW_X = 402;
const CHIP_ROW_Y = 560;
const CHIP_GAP = 6;

export class FieldActionController {
  private readonly scene: Phaser.Scene;
  private readonly isEnabled: () => boolean;
  private bindings: FieldActionBinding[] = [];
  private chips = new Map<FieldActionKey, HintChip>();
  private readonly keyHandlers = new Map<
    FieldActionKey,
    (event: KeyboardEvent) => void
  >();
  private destroyed = false;

  constructor(scene: Phaser.Scene, isEnabled: () => boolean) {
    this.scene = scene;
    this.isEnabled = isEnabled;

    for (const key of ['C', 'D', 'F'] as const) {
      const handler = (event: KeyboardEvent) => {
        if (event.repeat || this.destroyed || !this.isEnabled()) {
          return;
        }

        const binding = this.bindings.find((entry) => entry.key === key);

        if (binding === undefined) {
          return;
        }

        const target = binding.getTarget();

        if (target !== null) {
          binding.perform(target);
        } else {
          binding.onIneligiblePress?.();
        }
      };

      this.keyHandlers.set(key, handler);
      scene.input.keyboard!.on(`keydown-${key}`, handler);
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyed = true;

      for (const [key, handler] of this.keyHandlers) {
        scene.input.keyboard?.off(`keydown-${key}`, handler);
      }

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__actionHints = null;
      }
    });
  }

  /** Registers/replaces the scene's action bindings (call once or as
   * eligibility structure changes; per-frame eligibility lives inside
   * each binding's getTarget). */
  setBindings(bindings: FieldActionBinding[]) {
    this.bindings = bindings;
  }

  /** Per-frame: shows a chip per action with a live eligible target. */
  update() {
    if (this.destroyed) {
      return;
    }

    const visible: { key: FieldActionKey; label: string }[] = [];
    let x = CHIP_ROW_X;

    for (const binding of this.bindings) {
      const target = binding.getTarget();
      let chip = this.chips.get(binding.key);

      if (target === null) {
        chip?.background.setVisible(false);
        chip?.text.setVisible(false);
        continue;
      }

      if (chip === undefined) {
        const text = this.scene.add
          .text(0, 0, '', {
            color: '#dce7f0',
            font: 'bold 12px monospace',
            padding: { x: 6, y: 3 },
          })
          .setOrigin(0, 0.5)
          .setDepth(Depth.AboveWorld + 1)
          .setScrollFactor(0);
        const background = this.scene.add
          .rectangle(0, 0, 10, 22, 0x101820, 0.92)
          .setOrigin(0, 0.5)
          .setStrokeStyle(1, 0x5fd3c4, 0.9)
          .setDepth(Depth.AboveWorld)
          .setScrollFactor(0);

        chip = { background, text };
        this.chips.set(binding.key, chip);
      }

      chip.text.setText(`${binding.key} — ${binding.label}`);
      chip.background.setSize(chip.text.width, 22);
      chip.background.setPosition(x, CHIP_ROW_Y).setVisible(true);
      chip.text.setPosition(x, CHIP_ROW_Y).setVisible(true);
      x += chip.text.width + CHIP_GAP;
      visible.push({ key: binding.key, label: binding.label });
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__actionHints = { scene: this.scene.scene.key, hints: visible };
    }
  }
}
