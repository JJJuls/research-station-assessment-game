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
 * Frames (Station 080 Unit 17, research-owner decision D-U17-2): every
 * surface renders in the STANDARD frame — the 720×516 panel inside the
 * 800×600 design space, 10 / 12 px element text — unless its launch data
 * asks for the WIDE frame, which lays the panel over the whole visible
 * design area of the overlay camera (about 1050×588 design px, identical
 * at the 1280×720 and 1920×1080 canvases), sizes the header text up and
 * lets each element carry its own text size. The frame and every other
 * per-launch setting are reset in `init()` because the scene instance is
 * reused across launches; a surface that sets none of the optional fields
 * keeps today's geometry, typography and input behaviour.
 *
 * DEV probe: window.__workSurfaceProbe (read-only) exposes element rects
 * so Playwright can drive real pointer input and keyboard focus.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import {
  CANVAS_WIDTH,
  DESIGN_HEIGHT,
  DESIGN_SCALE,
  DESIGN_WIDTH,
  fitOverlayScene,
} from '../../world/viewport';
import type { InputMode } from '../windows/windowKit';

export type SurfaceElementKind = 'tile' | 'button' | 'readout' | 'text';

export type SurfaceElementState =
  | 'idle'
  | 'selected'
  | 'done'
  | 'flag'
  | 'disabled'
  | 'accent';

export type SurfaceFrame = 'standard' | 'wide';

export interface SurfaceElement {
  id: string;
  kind: SurfaceElementKind;
  label: string;
  /**
   * Panel-relative position/size (the standard panel is 720×516; the wide
   * panel of a surface launched with `frame: 'wide'` is about 1050×588).
   */
  x: number;
  y: number;
  w: number;
  h: number;
  state?: SurfaceElementState;
  /** Secondary line (readouts/tiles). */
  detail?: string;
  /** Glyph shown before the label (never colour-only state). */
  glyph?: string;
  /** Hidden shortcut (0-9, a-z) for buttons. */
  hotkey?: string;
  /** Activation callback (tiles/buttons). Absent = not focusable. */
  onActivate?: (inputMode: InputMode) => void;
  /** Smaller font for dense tiles. */
  small?: boolean;
  /** Text alignment for 'text' elements. */
  align?: 'left' | 'center';
  /**
   * Optional label size in design px (Unit 17): overrides the 10 / 12 px
   * rule for this element; in the wide frame an element with `textPx`
   * carries no `detail` line.
   */
  textPx?: number;
  /** Optional top-anchored label (Unit 17; fixed slots without uneven padding). */
  valign?: 'top';
}

/**
 * A directed link drawn between two elements (Unit 3: causal-model
 * board). Rendered as an arrow behind the elements; never focusable —
 * links are created and removed through the elements' own activations.
 */
export interface SurfaceLink {
  from: string;
  to: string;
  state?: 'idle' | 'disabled';
}

export interface WorkSurfaceModel {
  title: string;
  subtitle?: string;
  /** Short operational status line under the title (never evaluative). */
  status?: string;
  elements: SurfaceElement[];
  /** Directed links between elements (drawn under them). */
  links?: SurfaceLink[];
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
  /**
   * Optional frame (Unit 17, decision D-U17-2): `'wide'` lays the panel
   * over the whole visible design area. Defaults to `'standard'`.
   */
  frame?: SurfaceFrame;
}

interface Rendered {
  element: SurfaceElement;
  box: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text | null;
  textPx: number;
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
      /** The frame the surface was launched with (Unit 17). */
      frame: SurfaceFrame;
      /** Design y of the feedback line's top edge (Unit 17 layout gate). */
      feedback_top: number;
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
        /** Effective label size in design px (Unit 17). */
        text_px: number;
        /** Rendered label height in design px (Unit 17). */
        text_h: number;
      }[];
      links: { from: string; to: string }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__workSurfaceProbe = null;
}

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PANEL: PanelRect = { x: 40, y: 42, width: 720, height: 516 };
const DEPTH = { dim: 18, panel: 20, element: 22, focus: 24 } as const;

/** The visible design width of the overlay camera (1066.7 at both canvases). */
const VISIBLE_DESIGN_WIDTH = CANVAS_WIDTH / DESIGN_SCALE;

/**
 * The wide panel: the whole visible design area minus an 8 px margin at
 * the sides and 6 px at the top and bottom — about 1050×588 design px at
 * (−125, 6), the same at the 1280×720 and 1920×1080 canvases.
 */
const WIDE_PANEL: PanelRect = {
  x: Math.ceil(DESIGN_WIDTH / 2 - VISIBLE_DESIGN_WIDTH / 2) + 8,
  y: 6,
  width: Math.floor(VISIBLE_DESIGN_WIDTH) - 16,
  height: DESIGN_HEIGHT - 12,
};

/** Wide-frame text sizes (design px): title and every header line. */
const WIDE_TITLE_PX = 20;
const WIDE_TEXT_PX = 16;
/** Wide frame: the subtitle keeps clear of the dev-server corner link. */
const WIDE_SUBTITLE_INSET = 110;

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
  private linkGraphics: Phaser.GameObjects.Graphics | null = null;
  private lastLinks: SurfaceLink[] = [];
  private frame: SurfaceFrame = 'standard';
  private panel: PanelRect = PANEL;

  constructor() {
    super(key.scene.pilotWorkSurface);
  }

  init(data: WorkSurfaceLaunchData) {
    this.data_ = data;
    this.closing = false;
    this.focusIndex = 0;
    this.lastFocusId = null;
    // The scene instance is reused across launches: every per-launch
    // setting is reset here, the frame included.
    this.frame = data.frame ?? 'standard';
    this.panel = this.frame === 'wide' ? WIDE_PANEL : PANEL;
  }

  create() {
    this.scene.bringToTop();
    // V4: 800×600 design space on the 1280×720 canvas (viewport.ts).
    // Pointer hit-tests in this scene use pointer.worldX/Y — the pointer in
    // THIS camera's (design) space; pointer.x/y are canvas pixels.
    fitOverlayScene(this);

    const wide = this.frame === 'wide';
    const panel = this.panel;

    this.add
      // Denser scrim (0.62 → 0.9): host status chips and banners outside
      // the panel no longer read as fragments (visual review V1 residual).
      // Wide frame: the scrim and its input interception cover the whole
      // visible design area, so a side-band click never reaches beneath.
      .rectangle(
        400,
        300,
        wide ? VISIBLE_DESIGN_WIDTH + 8 : 800,
        wide ? DESIGN_HEIGHT + 8 : 600,
        COLOR.dim,
        0.9,
      )
      .setDepth(DEPTH.dim)
      .setInteractive();
    this.add
      .rectangle(
        panel.x + panel.width / 2,
        panel.y + panel.height / 2,
        panel.width,
        panel.height,
        COLOR.panel,
        0.985,
      )
      .setStrokeStyle(1, COLOR.stroke)
      .setDepth(DEPTH.panel);
    this.add
      .rectangle(
        panel.x + panel.width / 2,
        panel.y + 40,
        panel.width - 2,
        1,
        COLOR.stroke,
        1,
      )
      .setDepth(DEPTH.panel);

    this.titleText = this.add
      .text(panel.x + 18, wide ? panel.y + 10 : panel.y + 12, '', {
        color: COLOR.text,
        font: wide
          ? `bold ${WIDE_TITLE_PX}px monospace`
          : 'bold 15px monospace',
      })
      .setDepth(DEPTH.element);
    this.subtitleText = this.add
      .text(
        panel.x + panel.width - (wide ? WIDE_SUBTITLE_INSET : 18),
        panel.y + 14,
        '',
        {
          color: COLOR.faint,
          font: wide ? `${WIDE_TEXT_PX}px monospace` : '11px monospace',
        },
      )
      .setOrigin(1, 0)
      .setDepth(DEPTH.element);
    this.statusText = this.add
      .text(panel.x + 18, panel.y + 48, '', {
        color: COLOR.faint,
        font: wide ? `${WIDE_TEXT_PX}px monospace` : '11px monospace',
        wordWrap: { width: panel.width - 36 },
      })
      .setDepth(DEPTH.element);
    this.helpText = this.add
      .text(panel.x + panel.width / 2, panel.y + panel.height - 6, '', {
        color: COLOR.dimText,
        // Unit 7 (V16): 11 px minimum for help lines; wrapped inside the
        // panel and anchored at its foot so long lines grow upward
        // (visual review M4/M5).
        font: wide ? `${WIDE_TEXT_PX}px monospace` : '11px monospace',
        align: 'center',
        wordWrap: { width: panel.width - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.element);
    this.feedbackText = this.add
      .text(panel.x + panel.width / 2, panel.y + panel.height - 34, '', {
        color: COLOR.amber,
        font: wide ? `${WIDE_TEXT_PX}px monospace` : '11px monospace',
        align: 'center',
        wordWrap: { width: panel.width - 36 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.element);

    this.focusRing = this.add
      .rectangle(0, 0, 10, 10, 0x000000, 0)
      .setStrokeStyle(2, COLOR.accent, 1)
      .setDepth(DEPTH.focus)
      .setVisible(false);
    this.linkGraphics = this.add.graphics().setDepth(DEPTH.element - 1);

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
          frame: this.frame,
          feedback_top: 0,
          elements: [],
          links: [],
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

    if (this.frame === 'wide') {
      // The feedback line is placed from the help text's bounds, so a
      // wrapped help line never meets it.
      this.feedbackText
        .setOrigin(0.5, 1)
        .setPosition(
          this.panel.x + this.panel.width / 2,
          this.helpText.getBounds().top - 4,
        );
    }

    for (const item of this.rendered) {
      item.box.destroy();
      item.text.destroy();
      item.detail?.destroy();
    }

    this.rendered = [];

    for (const element of model.elements) {
      this.rendered.push(this.renderElement(element));
    }

    this.lastLinks = model.links ?? [];
    this.renderLinks(this.lastLinks);

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

  /** Directed arrows between element centres (drawn under the elements). */
  private renderLinks(links: SurfaceLink[]) {
    const graphics = this.linkGraphics;

    if (graphics === null) {
      return;
    }

    graphics.clear();

    for (const link of links) {
      const from = this.rendered.find((item) => item.element.id === link.from);
      const to = this.rendered.find((item) => item.element.id === link.to);

      if (from === undefined || to === undefined) {
        continue;
      }

      const colour =
        link.state === 'disabled' ? COLOR.tileStroke : COLOR.accent;
      const dx = to.box.x - from.box.x;
      const dy = to.box.y - from.box.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      // Trim both ends to the element boxes so the arrow head is visible.
      const startX = from.box.x + ux * (from.element.w / 2 + 2);
      const startY = from.box.y + uy * (from.element.h / 2 + 2);
      const endX = to.box.x - ux * (to.element.w / 2 + 4);
      const endY = to.box.y - uy * (to.element.h / 2 + 4);

      graphics.lineStyle(2, colour, 0.95);
      graphics.beginPath();
      graphics.moveTo(startX, startY);
      graphics.lineTo(endX, endY);
      graphics.strokePath();
      // Arrow head.
      graphics.fillStyle(colour, 0.95);
      graphics.fillTriangle(
        endX,
        endY,
        endX - ux * 10 - uy * 5,
        endY - uy * 10 + ux * 5,
        endX - ux * 10 + uy * 5,
        endY - uy * 10 - ux * 5,
      );
    }
  }

  private renderElement(element: SurfaceElement): Rendered {
    const wide = this.frame === 'wide';
    const panel = this.panel;
    const state = element.state ?? 'idle';
    const cx = panel.x + element.x + element.w / 2;
    const cy = panel.y + element.y + element.h / 2;
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
    const textPx = element.textPx ?? (element.small ? 10 : 12);
    const font = `${textPx}px monospace`;
    const color =
      state === 'disabled'
        ? COLOR.dimText
        : element.kind === 'readout'
          ? COLOR.faint
          : element.kind === 'button'
            ? // Wide frame: accent buttons use the text colour (contrast).
              wide && state === 'accent'
              ? COLOR.text
              : COLOR.accentText
            : COLOR.text;
    const hasDetail =
      element.detail !== undefined &&
      element.detail !== '' &&
      !(wide && element.textPx !== undefined);
    const left = element.align === 'left' || element.kind === 'text';
    const top = element.valign === 'top';
    const text = this.add
      .text(
        left ? panel.x + element.x + 8 : cx,
        top ? panel.y + element.y + 6 : hasDetail ? cy - 8 : cy,
        `${glyph}${element.label}`,
        {
          color,
          font: element.kind === 'button' ? `bold ${font}` : font,
          align: left ? 'left' : 'center',
          wordWrap: { width: element.w - 14 },
        },
      )
      .setOrigin(left ? 0 : 0.5, element.kind === 'text' || top ? 0 : 0.5)
      .setDepth(DEPTH.element + 1);

    if (element.kind === 'text') {
      text.setPosition(panel.x + element.x + 8, panel.y + element.y + 6);
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

    return { element, box, text, detail, textPx };
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

    // Wide frame: a 2 px offset so the ring never meets a neighbouring
    // box across the 4 px gaps.
    const offset = this.frame === 'wide' ? 4 : 6;

    this.lastFocusId = current.element.id;
    this.focusRing
      .setPosition(current.box.x, current.box.y)
      .setSize(current.element.w + offset, current.element.h + offset)
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

    // Hidden shortcuts on buttons/tiles that declare a hotkey (0 included:
    // the M12 keypad, Unit 8).
    if (/^[0-9a-z]$/i.test(event.key)) {
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
        Math.abs(pointer.worldX - item.box.x) <= item.element.w / 2 &&
        Math.abs(pointer.worldY - item.box.y) <= item.element.h / 2
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
      frame: this.frame,
      feedback_top: this.feedbackText.getBounds().top,
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
        text_px: item.textPx,
        text_h: item.text.getBounds().height,
      })),
      links: this.lastLinks.map((link) => ({ from: link.from, to: link.to })),
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
