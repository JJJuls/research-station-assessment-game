/**
 * M23 — the excavation field's HUD (Station 080 M01–M26 run, Unit 23;
 * contract §10 "Final field HUD geometry"): the eight-control direction and
 * action pad (LEFT / RIGHT, UP / DOWN, SCAN / DIG, HELP / PANEL — pointer
 * equivalents of the arrow keys, C, D, HELP and P), the scanner readout
 * (up to four lines), the last-dig / facing readout with the field-tray
 * line (up to six lines) and the local feedback line at design y 92, all
 * HUD objects in the 800 × 600 design space (`scrollFactor(0)`), disjoint
 * from the whole active-plot rectangle at both viewports.
 *
 * Presentation and input routing only: the host owns every rule
 * (admission, refusals, telemetry) and the copy comes from the pinned
 * content module. A held pad direction sets the Player's external movement
 * intent for as long as the pointer is down; a pad press is one press (no
 * repeat). DEV probe: `window.__m23FieldProbe` (read-only).
 */
import Phaser from 'phaser';

import { Depth } from '../../constants';
import type { PlayerMoveIntent } from '../../sprites/Player';
import {
  DESIGN_OFFSET_X,
  DESIGN_OFFSET_Y,
  DESIGN_SCALE,
} from '../../world/viewport';
import {
  M23_HUD,
  M23_TEXT,
  type M23PlotLetter,
} from '../windows/m23PlotsContent';

export type M23PadButton =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'scan'
  | 'dig'
  | 'help'
  | 'panel';

export interface M23FieldControlsCallbacks {
  onMove: (intent: PlayerMoveIntent | null) => void;
  onScan: () => void;
  onDig: () => void;
  onHelp: () => void;
  onPanel: () => void;
  /** Whether a pad press acts now (no modal, no transition, no running action for SCAN / DIG). */
  eligible: () => boolean;
}

export interface M23FieldView {
  letter: M23PlotLetter | null;
  /** The plot is approaching: the scanner box shows the approach status. */
  approaching: boolean;
  scanner: string[];
  dig: string[];
  tray: string;
}

interface PadRect {
  id: M23PadButton;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

declare global {
  interface Window {
    /** DEV-only, read-only probe of the excavation field HUD (Unit 23). */
    __m23FieldProbe?: {
      visible: boolean;
      buttons: { id: string; x: number; y: number; w: number; h: number }[];
      scanner: string[];
      dig: string[];
      /** The field-tray plate's rendered lines (round 3, OD-8b). */
      tray: string[];
      /** The scanner, dig and tray texts' actual design-space bounds (rendered rows). */
      scanner_bounds: { x: number; y: number; w: number; h: number };
      dig_bounds: { x: number; y: number; w: number; h: number };
      tray_bounds: { x: number; y: number; w: number; h: number };
      feedback: string | null;
      /** The feedback line's actual design-space bounds while it shows. */
      feedback_bounds: { x: number; y: number; w: number; h: number } | null;
      held: string | null;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__m23FieldProbe = null;
}

/**
 * Round 4: the HUD's plates, pad boxes and readout texts sit BELOW the base
 * scene's floating station prompt (`Depth.AboveWorld`), so a foreign
 * station's prompt near a plot (the mast beside Plot A's west ring) stays
 * readable over them; the readout rows are placed so that band crosses only
 * text-free plate area (`M23_HUD`). The feedback line keeps its own layer
 * above everything (it never shares the band's rows).
 */
const HUD_PLATE_DEPTH = Depth.AboveWorld - 2;
const HUD_TEXT_DEPTH = Depth.AboveWorld - 1;

const COLOR = {
  plate: 0x101820,
  stroke: 0x33475a,
  button: 0x223244,
  accent: 0x5fd3c4,
  text: '#dfe9f1',
  faint: '#c9d6e2',
  amber: '#e6c68f',
} as const;

const PAD_LABELS: Record<M23PadButton, string> = {
  left: 'LEFT',
  right: 'RIGHT',
  up: 'UP',
  down: 'DOWN',
  scan: 'SCAN',
  dig: 'DIG',
  help: 'HELP',
  panel: 'PANEL',
};

/** A text object's actual design-space bounds (the DEV probe). */
function rect(text: Phaser.GameObjects.Text): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const bounds = text.getBounds();

  return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
}

const PAD_ORDER: readonly [M23PadButton, M23PadButton][] = [
  ['left', 'right'],
  ['up', 'down'],
  ['scan', 'dig'],
  ['help', 'panel'],
];

export class M23FieldControls {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: M23FieldControlsCallbacks;
  private readonly rects: PadRect[] = [];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly scanner: Phaser.GameObjects.Text;
  private readonly dig: Phaser.GameObjects.Text;
  private readonly tray: Phaser.GameObjects.Text;
  private readonly feedback: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private visible = false;
  private held: M23PadButton | null = null;
  private destroyed = false;
  private view: M23FieldView = {
    letter: null,
    approaching: false,
    scanner: [],
    dig: [],
    tray: M23_TEXT.tray_empty,
  };

  constructor(scene: Phaser.Scene, callbacks: M23FieldControlsCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    const pad = M23_HUD.pad;

    PAD_ORDER.forEach((row, rowIndex) => {
      row.forEach((id, column) => {
        const x = pad.x + column * (M23_HUD.pad_column_w + M23_HUD.pad_gap_x);
        const y = pad.y + rowIndex * (M23_HUD.pad_row_h + M23_HUD.pad_gap_y);
        const rect: PadRect = {
          id,
          label: PAD_LABELS[id],
          x,
          y,
          w: M23_HUD.pad_column_w,
          h: M23_HUD.pad_row_h,
        };

        this.rects.push(rect);

        const box = scene.add
          .rectangle(
            x + rect.w / 2,
            y + rect.h / 2,
            rect.w,
            rect.h,
            COLOR.button,
            0.94,
          )
          .setStrokeStyle(1, COLOR.stroke)
          .setDepth(HUD_PLATE_DEPTH)
          .setScrollFactor(0)
          .setVisible(false);
        const text = scene.add
          .text(x + rect.w / 2, y + rect.h / 2, rect.label, {
            color: COLOR.text,
            font: 'bold 16px monospace',
          })
          .setOrigin(0.5)
          .setDepth(HUD_TEXT_DEPTH)
          .setScrollFactor(0)
          .setVisible(false);

        this.objects.push(box, text);
      });
    });

    this.scanner = this.readout(M23_HUD.scanner, 4);
    this.dig = this.readout(M23_HUD.dig, 4);
    this.tray = this.readout(M23_HUD.tray, 3);
    this.feedback = scene.add
      .text(400, M23_HUD.feedback_y, '', {
        backgroundColor: '#101820',
        color: COLOR.amber,
        font: '16px monospace',
        lineSpacing: 2,
        padding: { x: 8, y: 4 },
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0)
      .setDepth(Depth.AboveWorld + 2)
      .setScrollFactor(0)
      .setVisible(false);
    this.objects.push(this.feedback);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.onPointerUp,
      this,
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.release, this);
  }

  private readout(
    box: { x: number; y: number; w: number; h: number },
    lines: number,
  ): Phaser.GameObjects.Text {
    void lines;

    const plate = this.scene.add
      .rectangle(
        box.x + box.w / 2,
        box.y + box.h / 2,
        box.w,
        box.h,
        COLOR.plate,
        0.92,
      )
      .setStrokeStyle(1, COLOR.stroke)
      .setDepth(HUD_PLATE_DEPTH)
      .setScrollFactor(0)
      .setVisible(false);
    const text = this.scene.add
      .text(box.x + 8, box.y + 8, '', {
        color: COLOR.faint,
        font: `${M23_HUD.text_px}px monospace`,
        lineSpacing: 2,
        wordWrap: { width: box.w - 16 },
      })
      .setOrigin(0)
      .setDepth(HUD_TEXT_DEPTH)
      .setScrollFactor(0)
      .setVisible(false);

    this.objects.push(plate, text);

    return text;
  }

  /** Shows or hides the whole HUD (a hidden HUD never receives a press). */
  setVisible(visible: boolean) {
    if (this.destroyed) {
      return;
    }

    this.visible = visible;

    for (const object of this.objects) {
      if (object === this.feedback) {
        continue;
      }

      (object as Phaser.GameObjects.Rectangle).setVisible(visible);
    }

    if (!visible) {
      this.release();
      this.feedback.setVisible(false);
    }

    this.publish();
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Re-renders the readouts from the host's lines (copy from the content module). */
  render(view: M23FieldView) {
    if (this.destroyed) {
      return;
    }

    this.view = view;
    // The scanner box holds four lines (contract §10); the 87-character
    // approach line needs five, so it is the feedback line's (the host
    // shows it) and the box keeps the scanner lines ("No reading yet.").
    this.scanner.setText(view.scanner.join('\n'));
    // Round 3 (amendment OD-8b): the dig plate holds the heading, the last
    // dig and the facing line (at most four rendered rows); the field tray
    // has its own plate under it (up to three rendered rows).
    this.dig.setText(view.dig.join('\n'));
    this.tray.setText(view.tray);
    this.publish();
  }

  /**
   * The local feedback line at design y 92 (auto-clears after `durationMs`,
   * 2.2 s unless the caller asks otherwise; never evaluative).
   */
  showFeedback(message: string, durationMs = 2200) {
    if (this.destroyed) {
      return;
    }

    this.feedback.setText(message).setVisible(true);
    this.feedbackTimer?.remove(false);
    this.feedbackTimer = this.scene.time.delayedCall(durationMs, () => {
      this.feedback.setVisible(false);
      this.feedback.setText('');
      this.publish();
    });
    this.publish();
  }

  private toDesign(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: (pointer.x - DESIGN_OFFSET_X) / DESIGN_SCALE,
      y: (pointer.y - DESIGN_OFFSET_Y) / DESIGN_SCALE,
    };
  }

  private hit(pointer: Phaser.Input.Pointer): PadRect | null {
    const point = this.toDesign(pointer);

    return (
      this.rects.find(
        (rect) =>
          point.x >= rect.x &&
          point.x < rect.x + rect.w &&
          point.y >= rect.y &&
          point.y < rect.y + rect.h,
      ) ?? null
    );
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.visible || this.destroyed || !this.callbacks.eligible()) {
      return;
    }

    const rect = this.hit(pointer);

    if (rect === null) {
      return;
    }

    switch (rect.id) {
      case 'left':
      case 'right':
      case 'up':
      case 'down':
        this.held = rect.id;
        this.callbacks.onMove({
          left: rect.id === 'left',
          right: rect.id === 'right',
          up: rect.id === 'up',
          down: rect.id === 'down',
        });
        break;
      case 'scan':
        this.callbacks.onScan();
        break;
      case 'dig':
        this.callbacks.onDig();
        break;
      case 'help':
        this.callbacks.onHelp();
        break;
      case 'panel':
        this.callbacks.onPanel();
        break;
    }

    this.publish();
  }

  private onPointerUp() {
    this.release();
  }

  /** Releases a held pad direction (pointer up, pause, hide, shutdown). */
  release() {
    if (this.held !== null) {
      this.held = null;
      this.callbacks.onMove(null);
      this.publish();
    }
  }

  private publish() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    window.__m23FieldProbe = this.destroyed
      ? null
      : {
          visible: this.visible,
          buttons: this.rects.map((rect) => ({
            id: rect.id,
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
          })),
          scanner: this.scanner.text.split('\n'),
          dig: this.dig.text.split('\n'),
          tray: this.tray.text.split('\n'),
          scanner_bounds: rect(this.scanner),
          dig_bounds: rect(this.dig),
          tray_bounds: rect(this.tray),
          feedback: this.feedback.visible ? this.feedback.text : null,
          feedback_bounds: this.feedback.visible ? rect(this.feedback) : null,
          held: this.held,
        };
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.release();
    this.destroyed = true;
    this.feedbackTimer?.remove(false);
    this.scene.input.off(
      Phaser.Input.Events.POINTER_DOWN,
      this.onPointerDown,
      this,
    );
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP,
      this.onPointerUp,
      this,
    );
    this.scene.input.off(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.onPointerUp,
      this,
    );
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.release, this);

    for (const object of this.objects) {
      object.destroy();
    }

    this.publish();
  }
}
