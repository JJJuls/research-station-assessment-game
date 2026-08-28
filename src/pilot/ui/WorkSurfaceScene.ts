/**
 * Work surface overlay — the ONE compact professional panel used by the
 * evidence-led pilot v2 item windows that are not inventory drag/drop or
 * physical world manipulation (plan board, incident desk, QC packet,
 * dispatch console, calibration bench, manual, report desk, self-report
 * probe, channel post, antenna feed …).
 *
 * The host describes a MODEL (elements + actions + notes); this scene only
 * renders it and routes input. Pointer and keyboard converge on the same
 * host callbacks, each call carrying its `input_mode`, so both paths call
 * the same domain command (mission: pointer/keyboard equivalence).
 *
 * Lifecycle: pause-and-launch over the host (inventory-overlay precedent);
 * `scene.bringToTop()` on create (Concourse hotfix rule); ESC or the host's
 * close action resumes the host. Reduced motion: no tweens at all.
 *
 * Presentation: restrained industrial panel, readable at 1280×720; state
 * is always shape/glyph + colour, never colour alone; no reward effects.
 *
 * DEV probe: window.__workSurfaceProbe (read-only) exposes element rects
 * so Playwright can drive real pointer input and keyboard focus.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import type { InputMode } from '../windows/windowKit';

export type SurfaceElementKind = 'tile' | 'button' | 'readout' | 'text';

export type SurfaceElementState =
  | 'idle'
  | 'selected'
  | 'done'
  | 'flag'
  | 'disabled'
  | 'accent';

export interface SurfaceElement {
  id: string;
  kind: SurfaceElementKind;
  label: string;
  /** Panel-relative position/size (panel is 720×516). */
  x: number;
  y: number;
  w: number;
  h: number;
  state?: SurfaceElementState;
  /** Secondary line (readouts/tiles). */
  detail?: string;
  /** Glyph shown before the label (never colour-only state). */
  glyph?: string;
  /** Hidden numeric shortcut (1-9) for buttons. */
  hotkey?: string;
  /** Activation callback (tiles/buttons). Absent = not focusable. */
  onActivate?: (inputMode: InputMode) => void;
  /** Smaller font for dense tiles. */
  small?: boolean;
  /** Text alignment for 'text' elements. */
  align?: 'left' | 'center';
}

export interface WorkSurfaceModel {
  title: string;
  subtitle?: string;
  /** Short operational status line under the title (never evaluative). */
  status?: string;
  elements: SurfaceElement[];
  /** Footer help line (controls). */
  help?: string;
  /** Neutral feedback line shown briefly after an action. */
  feedback?: string | null;
}

export interface WorkSurfaceLaunchData {
  resumeKey: string;
  /** Probe/telemetry id of this surface (e.g. 'm01_plan_board'). */
  surfaceId: string;
  /** Rebuilt on every refresh so the model reflects host state. */
  model: () => WorkSurfaceModel;
  /** ESC / close request. Return false to keep the surface open. */
  onClose: (inputMode: InputMode) => boolean | void;
  /** Called after the surface is fully closed (host resumed). */
  onClosed?: () => void;
}

interface Rendered {
  element: SurfaceElement;
  box: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text | null;
}

declare global {
  interface Window {
    /** DEV-only, read-only work-surface probe. */
    __workSurfaceProbe?: {
      open: boolean;
      surface_id: string | null;
      title: string | null;
      status: string | null;
      focus: string | null;
      feedback: string | null;
      elements: {
        id: string;
        kind: string;
        label: string;
        state: string;
        x: number;
        y: number;
        w: number;
        h: number;
        focusable: boolean;
      }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__workSurfaceProbe = null;
}

const PANEL = { x: 40, y: 42, width: 720, height: 516 } as const;
const DEPTH = { dim: 18, panel: 20, element: 22, focus: 24 } as const;

const COLOR = {
  dim: 0x05080c,
  panel: 0x101820,
  stroke: 0x33475a,
  tile: 0x1b2633,
  tileStroke: 0x5a7084,
  selected: 0x1f7a8c,
  accent: 0x5fd3c4,
  done: 0x2d4a3e,
  flag: 0x6b4d1f,
  disabled: 0x121a22,
  button: 0x223244,
  text: '#dfe9f1',
  faint: '#9fb2c1',
  dimText: '#6f8498',
  accentText: '#5fd3c4',
  amber: '#e6c68f',
} as const;

/** One overlay used for every surface; launch data selects the model. */
export class WorkSurfaceScene extends Phaser.Scene {
  private data_!: WorkSurfaceLaunchData;
  private rendered: Rendered[] = [];
  private focusIndex = 0;
  private focusRing: Phaser.GameObjects.Rectangle | null = null;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private closing = false;
  private lastFocusId: string | null = null;

  constructor() {
    super(key.scene.pilotWorkSurface);
  }

  init(data: WorkSurfaceLaunchData) {
    this.data_ = data;
    this.closing = false;
    this.focusIndex = 0;
    this.lastFocusId = null;
  }

  create() {
    this.scene.bringToTop();

    this.add
      .rectangle(400, 300, 800, 600, COLOR.dim, 0.62)
      .setDepth(DEPTH.dim)
      .setInteractive();
    this.add
      .rectangle(
        PANEL.x + PANEL.width / 2,
        PANEL.y + PANEL.height / 2,
        PANEL.width,
        PANEL.height,
        COLOR.panel,
        0.985,
      )
      .setStrokeStyle(1, COLOR.stroke)
      .setDepth(DEPTH.panel);
    this.add
      .rectangle(
        PANEL.x + PANEL.width / 2,
        PANEL.y + 40,
        PANEL.width - 2,
        1,
        COLOR.stroke,
        1,
      )
      .setDepth(DEPTH.panel);

    this.titleText = this.add
      .text(PANEL.x + 18, PANEL.y + 12, '', {
        color: COLOR.text,
        font: 'bold 15px monospace',
      })
      .setDepth(DEPTH.element);
    this.subtitleText = this.add
      .text(PANEL.x + PANEL.width - 18, PANEL.y + 14, '', {
        color: COLOR.faint,
        font: '11px monospace',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.element);
    this.statusText = this.add
      .text(PANEL.x + 18, PANEL.y + 48, '', {
        color: COLOR.faint,
        font: '11px monospace',
        wordWrap: { width: PANEL.width - 36 },
      })
      .setDepth(DEPTH.element);
    this.helpText = this.add
      .text(PANEL.x + PANEL.width / 2, PANEL.y + PANEL.height - 14, '', {
        color: COLOR.dimText,
        font: '10px monospace',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.element);
    this.feedbackText = this.add
      .text(PANEL.x + PANEL.width / 2, PANEL.y + PANEL.height - 34, '', {
        color: COLOR.amber,
        font: '11px monospace',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.element);

    this.focusRing = this.add
      .rectangle(0, 0, 10, 10, 0x000000, 0)
      .setStrokeStyle(2, COLOR.accent, 1)
      .setDepth(DEPTH.focus)
      .setVisible(false);

    const onKey = guardKeyHandler((event: KeyboardEvent) => {
      if (event.repeat || this.closing) {
        return;
      }

      this.handleKey(event);
    });

    this.input.keyboard!.on('keydown', onKey);
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', onKey);
      this.feedbackTimer?.remove(false);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__workSurfaceProbe = {
          open: false,
          surface_id: null,
          title: null,
          status: null,
          focus: null,
          feedback: null,
          elements: [],
        };
      }
    });

    this.refresh();
  }

  /** Re-renders the host model (call after any host state change). */
  refresh() {
    if (this.closing) {
      return;
    }

    const model = this.data_.model();

    this.titleText.setText(model.title);
    this.subtitleText.setText(model.subtitle ?? '');
    this.statusText.setText(model.status ?? '');
    this.helpText.setText(
      model.help ??
        'Arrows/TAB focus · ENTER or SPACE activate · click also works · ESC closes',
    );

    for (const item of this.rendered) {
      item.box.destroy();
      item.text.destroy();
      item.detail?.destroy();
    }

    this.rendered = [];

    for (const element of model.elements) {
      this.rendered.push(this.renderElement(element));
    }

    if (model.feedback) {
      this.showFeedback(model.feedback);
    }

    // Keep focus on the same element id across refreshes when possible.
    const focusables = this.focusables();

    if (this.lastFocusId !== null) {
      const index = focusables.findIndex(
        (item) => item.element.id === this.lastFocusId,
      );

      this.focusIndex = index >= 0 ? index : 0;
    }

    this.focusIndex = Math.min(
      this.focusIndex,
      Math.max(0, focusables.length - 1),
    );
    this.updateFocusRing();
    this.refreshProbe();
  }

  /** Neutral feedback line (auto-clears; never evaluative). */
  showFeedback(message: string) {
    this.feedbackText.setText(message);
    this.feedbackTimer?.remove(false);
    this.feedbackTimer = this.time.delayedCall(2200, () => {
      this.feedbackText.setText('');
      this.refreshProbe();
    });
    this.refreshProbe();
  }

  /** Closes the surface and resumes the host. */
  close() {
    if (this.closing) {
      return;
    }

    this.closing = true;
    this.scene.resume(this.data_.resumeKey);
    this.scene.stop();
    this.data_.onClosed?.();
  }

  private renderElement(element: SurfaceElement): Rendered {
    const state = element.state ?? 'idle';
    const cx = PANEL.x + element.x + element.w / 2;
    const cy = PANEL.y + element.y + element.h / 2;
    const fill =
      element.kind === 'text'
        ? COLOR.panel
        : state === 'selected'
          ? COLOR.selected
          : state === 'done'
            ? COLOR.done
            : state === 'flag'
              ? COLOR.flag
              : state === 'disabled'
                ? COLOR.disabled
                : state === 'accent'
                  ? COLOR.selected
                  : element.kind === 'button'
                    ? COLOR.button
                    : COLOR.tile;
    const stroke =
      element.kind === 'text'
        ? COLOR.panel
        : state === 'selected' || state === 'accent'
          ? COLOR.accent
          : state === 'disabled'
            ? COLOR.stroke
            : COLOR.tileStroke;
    const box = this.add
      .rectangle(
        cx,
        cy,
        element.w,
        element.h,
        fill,
        element.kind === 'text' ? 0 : 1,
      )
      .setStrokeStyle(element.kind === 'text' ? 0 : 1, stroke)
      .setDepth(DEPTH.element);
    const glyph =
      element.glyph ??
      (state === 'done'
        ? '✓ '
        : state === 'flag'
          ? '! '
          : state === 'selected'
            ? '▸ '
            : '');
    const font = element.small ? '10px monospace' : '12px monospace';
    const color =
      state === 'disabled'
        ? COLOR.dimText
        : element.kind === 'readout'
          ? COLOR.faint
          : element.kind === 'button'
            ? COLOR.accentText
            : COLOR.text;
    const hasDetail = element.detail !== undefined && element.detail !== '';
    const text = this.add
      .text(
        element.align === 'left' || element.kind === 'text'
          ? PANEL.x + element.x + 8
          : cx,
        hasDetail ? cy - 8 : cy,
        `${glyph}${element.label}`,
        {
          color,
          font: element.kind === 'button' ? `bold ${font}` : font,
          align:
            element.align === 'left' || element.kind === 'text'
              ? 'left'
              : 'center',
          wordWrap: { width: element.w - 14 },
        },
      )
      .setOrigin(
        element.align === 'left' || element.kind === 'text' ? 0 : 0.5,
        element.kind === 'text' ? 0 : 0.5,
      )
      .setDepth(DEPTH.element + 1);

    if (element.kind === 'text') {
      text.setPosition(PANEL.x + element.x + 8, PANEL.y + element.y + 6);
    }

    const detail = hasDetail
      ? this.add
          .text(cx, cy + 10, element.detail!, {
            color: COLOR.faint,
            font: '10px monospace',
            align: 'center',
            wordWrap: { width: element.w - 14 },
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.element + 1)
      : null;

    return { element, box, text, detail };
  }

  private focusables(): Rendered[] {
    return this.rendered.filter(
      (item) =>
        item.element.onActivate !== undefined &&
        item.element.state !== 'disabled',
    );
  }

  private updateFocusRing() {
    const focusables = this.focusables();
    const current = focusables[this.focusIndex];

    if (current === undefined || this.focusRing === null) {
      this.focusRing?.setVisible(false);
      this.lastFocusId = null;
      return;
    }

    this.lastFocusId = current.element.id;
    this.focusRing
      .setPosition(current.box.x, current.box.y)
      .setSize(current.element.w + 6, current.element.h + 6)
      .setVisible(true);
  }

  private moveFocus(delta: number) {
    const focusables = this.focusables();

    if (focusables.length === 0) {
      return;
    }

    this.focusIndex =
      (this.focusIndex + delta + focusables.length) % focusables.length;
    this.updateFocusRing();
    this.refreshProbe();
  }

  private handleKey(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape': {
        const keepOpen = this.data_.onClose('keyboard');

        if (keepOpen !== false) {
          this.close();
        } else {
          this.refresh();
        }
        return;
      }
      case 'ArrowRight':
      case 'ArrowDown':
      case 'Tab':
        if (event.key === 'Tab') {
          event.preventDefault();
        }

        this.moveFocus(event.shiftKey ? -1 : 1);
        return;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.moveFocus(-1);
        return;
      case 'Enter':
      case ' ': {
        const current = this.focusables()[this.focusIndex];

        if (current !== undefined) {
          this.activate(current, 'keyboard');
        }
        return;
      }
      default:
        break;
    }

    // Hidden numeric shortcuts on buttons/tiles that declare a hotkey.
    if (/^[1-9a-z]$/i.test(event.key)) {
      const target = this.rendered.find(
        (item) =>
          item.element.hotkey?.toLowerCase() === event.key.toLowerCase() &&
          item.element.onActivate !== undefined &&
          item.element.state !== 'disabled',
      );

      if (target !== undefined) {
        this.activate(target, 'keyboard');
      }
    }
  }

  private handlePointer(pointer: Phaser.Input.Pointer) {
    if (this.closing) {
      return;
    }

    for (const item of this.rendered) {
      if (
        item.element.onActivate === undefined ||
        item.element.state === 'disabled'
      ) {
        continue;
      }

      if (
        Math.abs(pointer.x - item.box.x) <= item.element.w / 2 &&
        Math.abs(pointer.y - item.box.y) <= item.element.h / 2
      ) {
        const focusables = this.focusables();

        this.focusIndex = Math.max(0, focusables.indexOf(item));
        this.updateFocusRing();
        this.activate(item, 'pointer');
        return;
      }
    }
  }

  private activate(item: Rendered, inputMode: InputMode) {
    if (!prefersReducedMotion()) {
      this.tweens.add({
        targets: item.box,
        alpha: { from: 0.6, to: 1 },
        duration: 120,
      });
    }

    item.element.onActivate?.(inputMode);

    if (!this.closing) {
      this.refresh();
    }
  }

  private refreshProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const focusables = this.focusables();

    window.__workSurfaceProbe = {
      open: !this.closing,
      surface_id: this.data_.surfaceId,
      title: this.titleText.text,
      status: this.statusText.text,
      focus: focusables[this.focusIndex]?.element.id ?? null,
      feedback: this.feedbackText.text || null,
      elements: this.rendered.map((item) => ({
        id: item.element.id,
        kind: item.element.kind,
        label: item.element.label,
        state: item.element.state ?? 'idle',
        x: item.box.x,
        y: item.box.y,
        w: item.element.w,
        h: item.element.h,
        focusable:
          item.element.onActivate !== undefined &&
          item.element.state !== 'disabled',
      })),
    };
  }
}

/**
 * Host-side launcher (openInventoryOverlay precedent): pause-and-launch;
 * returns the running surface scene for `refresh()` calls.
 */
export function openWorkSurface(
  host: Phaser.Scene,
  data: Omit<WorkSurfaceLaunchData, 'resumeKey'>,
): WorkSurfaceScene | null {
  if (host.scene.isActive(key.scene.pilotWorkSurface)) {
    return null;
  }

  host.scene.pause(host.scene.key);
  host.scene.launch(key.scene.pilotWorkSurface, {
    resumeKey: host.scene.key,
    ...data,
  } satisfies WorkSurfaceLaunchData);

  return host.scene.get(key.scene.pilotWorkSurface) as WorkSurfaceScene;
}

/** The running surface, if any (host convenience for refresh). */
export function activeWorkSurface(host: Phaser.Scene): WorkSurfaceScene | null {
  return host.scene.isActive(key.scene.pilotWorkSurface)
    ? (host.scene.get(key.scene.pilotWorkSurface) as WorkSurfaceScene)
    : null;
}
