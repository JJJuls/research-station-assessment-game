/**
 * Feed panel overlay — the close-up physical manipulation of one Utility
 * Deck feed (evidence-led pilot v2, Unit 6; non-scored closure).
 *
 * Three renderers over ONE pure state machine (utilityCoreClosure.ts):
 *   coolant       — turn the hand wheel (pointer drag around the hub, or
 *                   hold → / ←) until the valve latches OPEN;
 *   calibration   — align the breaker lever to the placard index (drag the
 *                   lever, or ↑ / ↓ steps), then ENGAGE (click / ENTER);
 *   distribution  — lift the coupler from the tray, slide it along the
 *                   rail into the socket and SEAT it (drag + drop into the
 *                   socket, or SPACE lift · hold → · SPACE seat).
 *
 * Pointer and keyboard converge on the same domain commands (each call
 * carries its input mode); no answer cards, no random outcome, no timer
 * pressure. Invalid actions get NEUTRAL physical feedback and leave the
 * state recoverable; ESC always steps back (a coupler on the rail returns
 * to the tray — transactional). A feed completes exactly once.
 *
 * Lifecycle: pause-and-launch over the host (WorkSurfaceScene precedent),
 * `scene.bringToTop()` on create, ESC/ENTER-after-ready resumes the host,
 * latched keys reset on close. Reduced motion: no tweens, static flow.
 *
 * Scientific boundary: nothing here is an item window. No proto_* event,
 * no register contact, no score; the only telemetry is the deck's
 * `pilot_closure_*` route context (emitted by the closure session).
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { sfxInstall, sfxMachineOn, sfxUnavailable } from '../../gameplay/audio';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import {
  closureFeeds,
  devInspectionActive,
  noteFeedReady,
  noteFeedRefused,
  refreshClosureProbe,
  stationRecordClosed,
} from '../closure/closureSession';
import {
  BREAKER_MAX_INDEX,
  BREAKER_TARGET_INDEX,
  COUPLER_SOCKET_TRAVEL,
  engageBreaker,
  FEED_LABELS,
  type FeedCommandReason,
  type FeedCommandResult,
  type FeedId,
  feedReady,
  liftCoupler,
  moveBreaker,
  placeCoupler,
  returnCouplerToTray,
  seatCoupler,
  setBreakerIndex,
  slideCoupler,
  turnValve,
} from '../closure/utilityCoreClosure';
import type { InputMode } from '../windows/windowKit';

export interface FeedPanelLaunchData {
  resumeKey: string;
  feed: FeedId;
  onClosed?: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

declare global {
  interface Window {
    /** DEV-only, read-only feed-panel probe (geometry for real pointer input). */
    __feedPanelProbe?: {
      open: boolean;
      feed: FeedId | null;
      ready: boolean;
      value: number;
      target: number;
      coupler: string | null;
      feedback: string | null;
      dev_inspection: boolean;
      geometry: {
        wheel: { x: number; y: number; r: number } | null;
        lever: Rect | null;
        track: { x: number; y0: number; y1: number } | null;
        engage: Rect | null;
        coupler: Rect | null;
        socket: Rect | null;
        tray: Rect | null;
        rail: { x0: number; x1: number; y: number } | null;
      };
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__feedPanelProbe = null;
}

const PANEL = { x: 100, y: 110, w: 600, h: 380 } as const;
const DEPTH = { dim: 18, panel: 20, art: 22, text: 24, focus: 26 } as const;

const COLOR = {
  dim: 0x05080c,
  panel: 0x101820,
  stroke: 0x33475a,
  steel: 0x4b5964,
  steelShade: 0x37434c,
  steelRim: 0x6b7c88,
  dark: 0x0a1116,
  card: 0x1a2733,
  accent: 0x5fd3c4,
  flow: 0x3fa8a0,
  dormant: 0x2e6b66,
  amber: 0xe6c68f,
  text: '#dfe9f1',
  faint: '#9fb2c1',
  dimText: '#6f8498',
  accentText: '#5fd3c4',
  amberText: '#e6c68f',
} as const;

/** Wheel geometry (coolant). */
const WHEEL = { x: 300, y: 305, r: 72 } as const;
/** Full travel = three quarter-turns of the wheel. */
const WHEEL_TRAVEL_RADIANS = Math.PI * 1.5;
/** Keyboard turn rate: full travel in ~1.8 s of held key. */
const WHEEL_KEY_RATE = 0.55;

/** Lever track (calibration). */
const TRACK = { x: 250, y0: 196, y1: 436 } as const;
const LEVER = { w: 64, h: 22 } as const;
const ENGAGE = { x: 470, y: 400, w: 170, h: 40 } as const;

/** Coupler rail (distribution). */
const RAIL = { x0: 200, x1: 600, y: 300 } as const;
const TRAY: Rect = { x: 150, y: 270, w: 70, h: 60 };
const SOCKET: Rect = { x: 590, y: 262, w: 60, h: 76 };
const COUPLER = { w: 44, h: 28 } as const;
/** Keyboard slide rate: full rail in ~1.6 s of held key. */
const RAIL_KEY_RATE = 0.62;

export class FeedPanelScene extends Phaser.Scene {
  private data_!: FeedPanelLaunchData;
  private art!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private placardText!: Phaser.GameObjects.Text;
  private readoutText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private devLabel: Phaser.GameObjects.Text | null = null;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;
  private closing = false;
  private held = new Set<string>();
  private dragging: 'wheel' | 'lever' | 'coupler' | null = null;
  private lastAngle = 0;
  private readyAnnounced = false;
  private flowPhase = 0;
  private lastUpdateAt = 0;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(key.scene.pilotFeedPanel);
  }

  init(data: FeedPanelLaunchData) {
    this.data_ = data;
    this.closing = false;
    this.held = new Set();
    this.dragging = null;
    this.readyAnnounced = feedReady(closureFeeds(), data.feed);
    this.flowPhase = 0;
    this.lastUpdateAt = performance.now();
    this.labels = [];
  }

  create() {
    this.scene.bringToTop();

    this.add
      .rectangle(400, 300, 800, 600, COLOR.dim, 0.62)
      .setDepth(DEPTH.dim)
      .setInteractive();
    this.add
      .rectangle(
        PANEL.x + PANEL.w / 2,
        PANEL.y + PANEL.h / 2,
        PANEL.w,
        PANEL.h,
        COLOR.panel,
        0.985,
      )
      .setStrokeStyle(1, COLOR.stroke)
      .setDepth(DEPTH.panel);
    this.add
      .rectangle(
        PANEL.x + PANEL.w / 2,
        PANEL.y + 40,
        PANEL.w - 2,
        1,
        COLOR.stroke,
      )
      .setDepth(DEPTH.panel);

    this.titleText = this.add
      .text(
        PANEL.x + 18,
        PANEL.y + 12,
        FEED_LABELS[this.data_.feed].toUpperCase(),
        {
          color: COLOR.text,
          font: 'bold 15px monospace',
        },
      )
      .setDepth(DEPTH.text);
    this.placardText = this.add
      .text(PANEL.x + PANEL.w - 18, PANEL.y + 14, '', {
        color: COLOR.amberText,
        font: '11px monospace',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(DEPTH.text);
    this.readoutText = this.add
      .text(PANEL.x + 18, PANEL.y + 50, '', {
        color: COLOR.faint,
        font: '11px monospace',
        wordWrap: { width: PANEL.w - 36 },
      })
      .setDepth(DEPTH.text);
    this.helpText = this.add
      .text(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 14, '', {
        // The interaction verb lives here: readable weight (gameplay F-3).
        color: COLOR.faint,
        font: '11px monospace',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text);
    this.feedbackText = this.add
      .text(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 36, '', {
        color: COLOR.amberText,
        font: '11px monospace',
        align: 'center',
        wordWrap: { width: PANEL.w - 36 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.text);

    if (devInspectionActive()) {
      this.devLabel = this.add
        .text(
          PANEL.x + PANEL.w - 18,
          PANEL.y + PANEL.h - 60,
          'DEV INSPECTION — no participant record',
          {
            color: COLOR.amberText,
            font: 'bold 10px monospace',
            backgroundColor: '#2a1f0a',
            padding: { x: 6, y: 2 },
          },
        )
        .setOrigin(1, 0.5)
        .setDepth(DEPTH.focus);
    }

    this.art = this.add.graphics().setDepth(DEPTH.art);

    const onKeyDown = guardKeyHandler((event: KeyboardEvent) =>
      this.handleKeyDown(event),
    );
    const onKeyUp = guardKeyHandler((event: KeyboardEvent) => {
      this.held.delete(event.key);
    });

    this.input.keyboard!.on('keydown', onKeyDown);
    this.input.keyboard!.on('keyup', onKeyUp);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', onKeyDown);
      this.input.keyboard?.off('keyup', onKeyUp);
      this.input.off(
        Phaser.Input.Events.POINTER_DOWN,
        this.onPointerDown,
        this,
      );
      this.input.off(
        Phaser.Input.Events.POINTER_MOVE,
        this.onPointerMove,
        this,
      );
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.feedbackTimer?.remove(false);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__feedPanelProbe = {
          open: false,
          feed: null,
          ready: false,
          value: 0,
          target: 0,
          coupler: null,
          feedback: null,
          dev_inspection: false,
          geometry: {
            wheel: null,
            lever: null,
            track: null,
            engage: null,
            coupler: null,
            socket: null,
            tray: null,
            rail: null,
          },
        };
      }
    });

    this.render();
  }

  update() {
    if (this.closing) {
      return;
    }

    // Wall-clock integration for held keys: Phaser's smoothed/capped frame
    // delta under-delivers on a throttled (software-GL) frame budget, which
    // would make a held key turn the wheel slower than the stated rate.
    // Capped at 250 ms so a stalled frame never jumps the control.
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.lastUpdateAt) / 1000);

    this.lastUpdateAt = now;

    const feeds = closureFeeds();
    const feed = this.data_.feed;

    if (!feedReady(feeds, feed)) {
      if (feed === 'coolant') {
        if (this.held.has('ArrowRight')) {
          this.apply(
            turnValve(feeds, WHEEL_KEY_RATE * dt, this.recordClosed()),
            'keyboard',
          );
        } else if (this.held.has('ArrowLeft')) {
          this.apply(
            turnValve(feeds, -WHEEL_KEY_RATE * dt, this.recordClosed()),
            'keyboard',
          );
        }
      } else if (
        feed === 'distribution' &&
        feeds.distribution.coupler === 'rail'
      ) {
        if (this.held.has('ArrowRight')) {
          this.apply(
            slideCoupler(feeds, RAIL_KEY_RATE * dt, this.recordClosed()),
            'keyboard',
          );
        } else if (this.held.has('ArrowLeft')) {
          this.apply(
            slideCoupler(feeds, -RAIL_KEY_RATE * dt, this.recordClosed()),
            'keyboard',
          );
        }
      }
    } else if (!prefersReducedMotion()) {
      // Restrained flow/power animation once ready (no flashing: a slow
      // 1.2 s drift of the band pattern).
      this.flowPhase = (this.flowPhase + dt * 0.8) % 1;
      this.render(false);
    }
  }

  // ——— input ————————————————————————————————————————————————————————————

  private recordClosed(): boolean {
    return stationRecordClosed() || devInspectionActive();
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.closing) {
      return;
    }

    if (event.key === 'Escape') {
      if (!event.repeat) {
        this.stepBack('keyboard');
      }
      return;
    }

    const feeds = closureFeeds();
    const feed = this.data_.feed;
    const ready = feedReady(feeds, feed);

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      this.held.add(event.key);
      return;
    }

    if (event.repeat) {
      // Held ENTER/SPACE/E/↑/↓ never repeat a discrete command.
      return;
    }

    if (event.key === 'Enter' && ready) {
      this.close();
      return;
    }

    switch (feed) {
      case 'calibration':
        if (event.key === 'ArrowUp') {
          this.apply(moveBreaker(feeds, 1, this.recordClosed()), 'keyboard');
        } else if (event.key === 'ArrowDown') {
          this.apply(moveBreaker(feeds, -1, this.recordClosed()), 'keyboard');
        } else if (
          event.key === 'Enter' ||
          event.key === ' ' ||
          event.key.toLowerCase() === 'e'
        ) {
          this.apply(engageBreaker(feeds, this.recordClosed()), 'keyboard');
        }
        return;
      case 'distribution':
        if (
          event.key === 'Enter' ||
          event.key === ' ' ||
          event.key.toLowerCase() === 'e'
        ) {
          if (feeds.distribution.coupler === 'tray') {
            this.apply(liftCoupler(feeds, this.recordClosed()), 'keyboard');
          } else if (feeds.distribution.coupler === 'rail') {
            this.apply(seatCoupler(feeds, this.recordClosed()), 'keyboard');
          }
        }
        return;
      case 'coolant':
      default:
        return;
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.closing) {
      return;
    }

    const feeds = closureFeeds();
    const feed = this.data_.feed;

    if (feedReady(feeds, feed)) {
      return;
    }

    switch (feed) {
      case 'coolant': {
        const distance = Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          WHEEL.x,
          WHEEL.y,
        );

        if (distance <= WHEEL.r + 12) {
          this.dragging = 'wheel';
          this.lastAngle = Math.atan2(pointer.y - WHEEL.y, pointer.x - WHEEL.x);
        }
        return;
      }
      case 'calibration': {
        const lever = this.leverRect(feeds.calibration.index);

        if (inRect(pointer, ENGAGE)) {
          this.apply(engageBreaker(feeds, this.recordClosed()), 'pointer');
        } else if (
          inRect(pointer, lever) ||
          (Math.abs(pointer.x - TRACK.x) <= 40 &&
            pointer.y >= TRACK.y0 - 12 &&
            pointer.y <= TRACK.y1 + 12)
        ) {
          this.dragging = 'lever';
          this.apply(
            setBreakerIndex(
              feeds,
              this.indexAtY(pointer.y),
              this.recordClosed(),
            ),
            'pointer',
          );
        }
        return;
      }
      case 'distribution': {
        const bus = feeds.distribution;

        if (bus.coupler === 'tray' && inRect(pointer, TRAY)) {
          const lifted = liftCoupler(feeds, this.recordClosed());

          this.apply(lifted, 'pointer');

          if (lifted.ok) {
            this.dragging = 'coupler';
          }
        } else if (
          bus.coupler === 'rail' &&
          inRect(pointer, this.couplerRect(bus.travel))
        ) {
          this.dragging = 'coupler';
        }
        return;
      }
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (this.closing || this.dragging === null || !pointer.isDown) {
      return;
    }

    const feeds = closureFeeds();

    switch (this.dragging) {
      case 'wheel': {
        const angle = Math.atan2(pointer.y - WHEEL.y, pointer.x - WHEEL.x);
        let delta = angle - this.lastAngle;

        if (delta > Math.PI) {
          delta -= Math.PI * 2;
        } else if (delta < -Math.PI) {
          delta += Math.PI * 2;
        }

        this.lastAngle = angle;
        // Clockwise on screen = positive angle in canvas space = opening.
        this.apply(
          turnValve(feeds, delta / WHEEL_TRAVEL_RADIANS, this.recordClosed()),
          'pointer',
        );
        return;
      }
      case 'lever':
        this.apply(
          setBreakerIndex(feeds, this.indexAtY(pointer.y), this.recordClosed()),
          'pointer',
        );
        return;
      case 'coupler':
        this.apply(
          placeCoupler(feeds, this.travelAtX(pointer.x), this.recordClosed()),
          'pointer',
        );
        return;
    }
  }

  private onPointerUp() {
    if (this.closing || this.dragging === null) {
      return;
    }

    const dragging = this.dragging;

    this.dragging = null;

    if (dragging === 'coupler') {
      const feeds = closureFeeds();

      if (feeds.distribution.coupler !== 'rail') {
        return;
      }

      // A plain click (no travel) simply lifts the coupler onto the rail;
      // a drop inside the socket = SEAT (valid target); a drop anywhere
      // else returns the coupler to the tray (invalid target, transactional).
      if (feeds.distribution.travel < 0.05) {
        this.showFeedback(
          'Coupler lifted — drag it along the rail into the socket, or hold →.',
        );
        this.render();
        return;
      }

      const result = seatCoupler(feeds, this.recordClosed());

      if (result.ok) {
        this.apply(result, 'pointer');
      } else {
        returnCouplerToTray(feeds);
        this.showFeedback('Not seated — the coupler returns to the tray.');
        sfxUnavailable();
        this.render();
      }
    }
  }

  // ——— domain command outcome → presentation ————————————————————————————

  private apply(result: FeedCommandResult, inputMode: InputMode) {
    const feed = this.data_.feed;

    if (!result.ok) {
      if (result.reason !== 'no_change') {
        this.refused(result.reason, inputMode);
      }
      return;
    }

    if (result.becameReady && !this.readyAnnounced) {
      this.readyAnnounced = true;
      noteFeedReady(feed, inputMode);

      if (feed === 'coolant') {
        sfxMachineOn();
        this.showFeedback(
          'Coolant feed OPEN — loop pressure nominal. ENTER or ESC steps back.',
        );
      } else if (feed === 'calibration') {
        sfxInstall();
        this.showFeedback(
          'Calibration line engaged — indicators live. ENTER or ESC steps back.',
        );
      } else {
        sfxInstall();
        sfxMachineOn();
        this.showFeedback(
          'Distribution bus connected — power reaching the Core. ENTER or ESC steps back.',
        );
      }
    }

    this.render();
  }

  private refused(reason: FeedCommandReason, inputMode: InputMode) {
    const feeds = closureFeeds();
    let message: string;

    switch (reason) {
      case 'off_index':
        message = `Lever at index ${feeds.calibration.index} — the placard names index ${BREAKER_TARGET_INDEX}. Align the lever, then engage.`;
        break;
      case 'short_of_socket':
        message =
          'Not seated — slide the coupler into the socket, then seat it.';
        break;
      case 'coupler_not_on_rail':
        message = 'Lift the coupler from the tray first.';
        break;
      case 'record_not_closed':
        message =
          'Feeds stay isolated until the station record is closed at the Shift Review Panel.';
        break;
      case 'out_of_order':
        message = 'This feed is isolated until the previous feed is ready.';
        break;
      case 'already_ready':
        message = 'This feed is already up.';
        break;
      default:
        message = 'No change.';
        break;
    }

    noteFeedRefused(this.data_.feed, reason, inputMode);
    sfxUnavailable();
    this.showFeedback(message);
    this.render();
  }

  private stepBack(inputMode: InputMode) {
    const feeds = closureFeeds();

    if (this.data_.feed === 'distribution' && returnCouplerToTray(feeds)) {
      noteFeedRefused('distribution', 'cancelled_on_rail', inputMode);
    }

    this.close();
  }

  private showFeedback(message: string) {
    this.feedbackText.setText(message);
    this.feedbackTimer?.remove(false);
    this.feedbackTimer = this.time.delayedCall(2600, () => {
      this.feedbackText.setText('');
      this.refreshProbe();
    });
    this.refreshProbe();
  }

  close() {
    if (this.closing) {
      return;
    }

    this.closing = true;
    this.held.clear();
    this.input.keyboard?.resetKeys();
    this.scene.resume(this.data_.resumeKey);
    this.scene.stop();
    this.data_.onClosed?.();
  }

  // ——— geometry helpers ——————————————————————————————————————————————————

  private leverRect(index: number): Rect {
    const y = TRACK.y1 - (index / BREAKER_MAX_INDEX) * (TRACK.y1 - TRACK.y0);

    return {
      x: TRACK.x - LEVER.w / 2 + 10,
      y: y - LEVER.h / 2,
      w: LEVER.w,
      h: LEVER.h,
    };
  }

  private indexAtY(y: number): number {
    const t = (TRACK.y1 - y) / (TRACK.y1 - TRACK.y0);

    return Math.round(Math.max(0, Math.min(1, t)) * BREAKER_MAX_INDEX);
  }

  private couplerRect(travel: number): Rect {
    const x = RAIL.x0 + travel * (RAIL.x1 - RAIL.x0);

    return {
      x: x - COUPLER.w / 2,
      y: RAIL.y - COUPLER.h / 2,
      w: COUPLER.w,
      h: COUPLER.h,
    };
  }

  private travelAtX(x: number): number {
    return Math.max(0, Math.min(1, (x - RAIL.x0) / (RAIL.x1 - RAIL.x0)));
  }

  // ——— rendering ————————————————————————————————————————————————————————

  private render(refreshText = true) {
    if (this.closing) {
      return;
    }

    const g = this.art;

    g.clear();

    for (const label of this.labels) {
      label.destroy();
    }

    this.labels = [];

    switch (this.data_.feed) {
      case 'coolant':
        this.renderCoolant(g);
        break;
      case 'calibration':
        this.renderCalibration(g);
        break;
      case 'distribution':
        this.renderDistribution(g);
        break;
    }

    if (refreshText) {
      this.refreshProbe();
    }
  }

  private label(
    x: number,
    y: number,
    text: string,
    style?: {
      color?: string;
      font?: string;
      origin?: [number, number];
      align?: 'left' | 'center' | 'right';
    },
  ) {
    const t = this.add
      .text(x, y, text, {
        color: style?.color ?? COLOR.faint,
        font: style?.font ?? '10px monospace',
        align: style?.align ?? 'center',
      })
      .setOrigin(...(style?.origin ?? [0.5, 0.5]))
      .setDepth(DEPTH.text);

    this.labels.push(t);

    return t;
  }

  private renderCoolant(g: Phaser.GameObjects.Graphics) {
    const valve = closureFeeds().coolant;
    const ready = valve.open;

    this.placardText.setText(
      'PLACARD · TURN THE WHEEL CLOCKWISE\nTHROUGH FULL TRAVEL TO OPEN',
    );
    this.readoutText.setText(
      ready
        ? 'Loop pressure 2.1 bar · coolant flowing to the Core feed.'
        : `Loop pressure ${(0.4 + valve.travel * 1.7).toFixed(1)} bar · valve ${Math.round(valve.travel * 100)}% open.`,
    );
    this.helpText.setText(
      ready
        ? 'ENTER or ESC — step back'
        : 'Drag the wheel clockwise · or hold → (← turns back) · ESC steps back',
    );

    // Riser pipe with a sight glass (right of the wheel).
    const pipeX = 560;

    g.fillStyle(COLOR.steel, 1);
    g.fillRect(pipeX - 14, 150, 28, 270);
    g.fillStyle(COLOR.steelRim, 1);
    g.fillRect(pipeX - 14, 150, 28, 2);
    g.fillStyle(COLOR.steelShade, 1);
    g.fillRect(pipeX - 22, 160, 44, 8);
    g.fillRect(pipeX - 22, 402, 44, 8);
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(pipeX - 6, 180, 12, 220);

    // Fill level follows travel; once open, flow bands drift upward.
    const fill = Math.round(220 * valve.travel);

    g.fillStyle(COLOR.flow, 1);
    g.fillRect(pipeX - 5, 400 - fill, 10, fill);

    if (ready) {
      g.fillStyle(COLOR.accent, 1);

      for (let i = 0; i < 7; i++) {
        const y = 400 - ((i * 32 + this.flowPhase * 32) % 220);

        g.fillRect(pipeX - 5, y - 2, 10, 3);
      }
    }

    this.label(pipeX, 432, ready ? 'FEED · FLOWING' : 'FEED · SHUT', {
      color: ready ? COLOR.accentText : COLOR.faint,
    });

    // Pressure gauge (top right of the wheel).
    const gauge = { x: 440, y: 205, r: 40 };

    g.fillStyle(COLOR.card, 1);
    g.fillCircle(gauge.x, gauge.y, gauge.r + 4);
    g.fillStyle(COLOR.dark, 1);
    g.fillCircle(gauge.x, gauge.y, gauge.r);
    g.lineStyle(2, COLOR.stroke, 1);
    g.strokeCircle(gauge.x, gauge.y, gauge.r);

    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;

      g.lineStyle(2, i >= 6 ? COLOR.accent : COLOR.steelRim, 1);
      g.lineBetween(
        gauge.x + Math.cos(a) * (gauge.r - 8),
        gauge.y + Math.sin(a) * (gauge.r - 8),
        gauge.x + Math.cos(a) * (gauge.r - 2),
        gauge.y + Math.sin(a) * (gauge.r - 2),
      );
    }

    const needle = Math.PI * 0.75 + valve.travel * Math.PI * 1.5;

    g.lineStyle(3, ready ? COLOR.accent : COLOR.amber, 1);
    g.lineBetween(
      gauge.x,
      gauge.y,
      gauge.x + Math.cos(needle) * (gauge.r - 10),
      gauge.y + Math.sin(needle) * (gauge.r - 10),
    );
    g.fillStyle(COLOR.steelRim, 1);
    g.fillCircle(gauge.x, gauge.y, 4);
    this.label(gauge.x, gauge.y + gauge.r + 14, 'LOOP PRESSURE');

    // Hand wheel.
    const angle = valve.travel * WHEEL_TRAVEL_RADIANS;

    g.fillStyle(COLOR.card, 1);
    g.fillCircle(WHEEL.x, WHEEL.y, WHEEL.r + 10);
    g.lineStyle(10, ready ? COLOR.steelRim : COLOR.steel, 1);
    g.strokeCircle(WHEEL.x, WHEEL.y, WHEEL.r);
    g.lineStyle(2, COLOR.dark, 1);
    g.strokeCircle(WHEEL.x, WHEEL.y, WHEEL.r + 5);
    g.strokeCircle(WHEEL.x, WHEEL.y, WHEEL.r - 5);

    for (let s = 0; s < 4; s++) {
      const a = angle + (s * Math.PI) / 2;

      g.lineStyle(7, COLOR.steel, 1);
      g.lineBetween(
        WHEEL.x,
        WHEEL.y,
        WHEEL.x + Math.cos(a) * (WHEEL.r - 4),
        WHEEL.y + Math.sin(a) * (WHEEL.r - 4),
      );
    }

    // Handle knob (marks the grip; pointer target moves with the wheel).
    g.fillStyle(ready ? COLOR.accent : COLOR.amber, 1);
    g.fillCircle(
      WHEEL.x + Math.cos(angle) * (WHEEL.r - 4),
      WHEEL.y + Math.sin(angle) * (WHEEL.r - 4),
      8,
    );
    g.fillStyle(COLOR.steelShade, 1);
    g.fillCircle(WHEEL.x, WHEEL.y, 14);
    g.fillStyle(COLOR.steelRim, 1);
    g.fillCircle(WHEEL.x, WHEEL.y, 6);

    // Travel arc under the wheel (state is geometry + label, never colour only).
    g.lineStyle(4, COLOR.stroke, 1);
    g.beginPath();
    g.arc(WHEEL.x, WHEEL.y, WHEEL.r + 22, 0, WHEEL_TRAVEL_RADIANS, false);
    g.strokePath();
    g.lineStyle(4, ready ? COLOR.accent : COLOR.amber, 1);
    g.beginPath();
    g.arc(WHEEL.x, WHEEL.y, WHEEL.r + 22, 0, Math.max(0.001, angle), false);
    g.strokePath();
    this.label(
      WHEEL.x,
      WHEEL.y + WHEEL.r + 44,
      ready ? 'VALVE · OPEN' : 'VALVE · CLOSED',
      {
        color: ready ? COLOR.accentText : COLOR.faint,
        font: 'bold 11px monospace',
      },
    );
  }

  private renderCalibration(g: Phaser.GameObjects.Graphics) {
    const breaker = closureFeeds().calibration;
    const ready = breaker.engaged;

    this.placardText.setText(
      `PLACARD · SET THE LEVER TO INDEX ${BREAKER_TARGET_INDEX}\nTHEN ENGAGE`,
    );
    this.readoutText.setText(
      ready
        ? `Breaker engaged at index ${breaker.index} · calibration indicators live.`
        : `Lever at index ${breaker.index} of ${BREAKER_MAX_INDEX} · breaker open.`,
    );
    this.helpText.setText(
      ready
        ? 'ENTER or ESC — step back'
        : 'Drag the lever · or ↑ / ↓ steps · ENGAGE: click the button or ENTER · ESC steps back',
    );

    // Cabinet frame + track.
    g.fillStyle(COLOR.card, 1);
    g.fillRect(170, 150, 170, 300);
    g.lineStyle(1, COLOR.stroke, 1);
    g.strokeRect(170, 150, 170, 300);
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(TRACK.x - 6, TRACK.y0 - 10, 12, TRACK.y1 - TRACK.y0 + 20);

    for (let i = 0; i <= BREAKER_MAX_INDEX; i++) {
      const y = TRACK.y1 - (i / BREAKER_MAX_INDEX) * (TRACK.y1 - TRACK.y0);
      const isTarget = i === BREAKER_TARGET_INDEX;

      g.fillStyle(isTarget ? COLOR.amber : COLOR.steelRim, 1);
      g.fillRect(TRACK.x - (isTarget ? 22 : 14), y - 1, isTarget ? 16 : 8, 2);
      this.label(TRACK.x - 32, y, `${i}`, {
        color: isTarget ? COLOR.amberText : COLOR.faint,
        font: isTarget ? 'bold 11px monospace' : '10px monospace',
      });

      if (isTarget) {
        this.label(TRACK.x - 62, y, '▸', {
          color: COLOR.amberText,
          font: '12px monospace',
        });
      }
    }

    // Lever.
    const lever = this.leverRect(breaker.index);

    g.fillStyle(COLOR.steelShade, 1);
    g.fillRect(lever.x - 2, lever.y - 2, lever.w + 4, lever.h + 4);
    g.fillStyle(ready ? COLOR.accent : COLOR.steel, 1);
    g.fillRect(lever.x, lever.y, lever.w, lever.h);
    g.fillStyle(COLOR.steelRim, 1);
    g.fillRect(lever.x, lever.y, lever.w, 2);
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(lever.x + lever.w - 14, lever.y + 6, 8, lever.h - 12);
    this.label(lever.x + lever.w / 2, lever.y - 12, 'LEVER', {
      font: '9px monospace',
    });

    // Indicator lamps (glyph + fill).
    const lampX = 420;

    this.label(lampX + 60, 160, 'CALIBRATION LINE', {
      font: 'bold 10px monospace',
      color: COLOR.text,
    });

    for (let i = 0; i < 3; i++) {
      const y = 190 + i * 46;

      g.fillStyle(COLOR.dark, 1);
      g.fillRect(lampX, y, 120, 32);
      g.lineStyle(1, COLOR.stroke, 1);
      g.strokeRect(lampX, y, 120, 32);
      g.fillStyle(ready ? COLOR.accent : COLOR.dormant, 1);

      if (ready) {
        g.fillRect(lampX + 10, y + 10, 12, 12);
      } else {
        g.lineStyle(2, COLOR.dormant, 1);
        g.strokeRect(lampX + 10, y + 10, 12, 12);
      }

      this.label(
        lampX + 70,
        y + 16,
        `${['MAIN', 'REFERENCE', 'FEED'][i]} · ${ready ? 'LIVE' : 'ISOLATED'}`,
        {
          color: ready ? COLOR.accentText : COLOR.faint,
          font: '10px monospace',
        },
      );
    }

    // ENGAGE button.
    g.fillStyle(ready ? COLOR.steelShade : 0x223244, 1);
    g.fillRect(ENGAGE.x, ENGAGE.y, ENGAGE.w, ENGAGE.h);
    g.lineStyle(2, ready ? COLOR.stroke : COLOR.accent, 1);
    g.strokeRect(ENGAGE.x, ENGAGE.y, ENGAGE.w, ENGAGE.h);
    this.label(
      ENGAGE.x + ENGAGE.w / 2,
      ENGAGE.y + ENGAGE.h / 2,
      ready ? '✓ ENGAGED' : 'ENGAGE',
      {
        color: ready ? COLOR.faint : COLOR.accentText,
        font: 'bold 12px monospace',
      },
    );
  }

  private renderDistribution(g: Phaser.GameObjects.Graphics) {
    const bus = closureFeeds().distribution;
    const ready = bus.seated;

    this.placardText.setText(
      'PLACARD · LIFT THE COUPLER FROM THE TRAY,\nSLIDE IT INTO THE SOCKET AND SEAT IT',
    );
    this.readoutText.setText(
      ready
        ? 'Coupler seated · bus bridged · power propagating to the Core.'
        : bus.coupler === 'rail'
          ? `Coupler on the rail · ${Math.round(bus.travel * 100)}% to the socket.`
          : 'Coupler in the tray · bus open.',
    );
    this.helpText.setText(
      ready
        ? 'ENTER or ESC — step back'
        : bus.coupler === 'rail'
          ? 'Drag into the socket and release · or hold → then SPACE to seat · ESC returns it to the tray'
          : 'Drag the coupler from the tray · or SPACE lifts it · ESC steps back',
    );

    // Bus bars behind the rail.
    for (const y of [RAIL.y - 40, RAIL.y + 40]) {
      g.fillStyle(COLOR.steel, 1);
      g.fillRect(RAIL.x0 - 20, y - 4, RAIL.x1 - RAIL.x0 + 40, 8);
      g.fillStyle(COLOR.steelRim, 1);
      g.fillRect(RAIL.x0 - 20, y - 4, RAIL.x1 - RAIL.x0 + 40, 1);
    }

    // Rail.
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(RAIL.x0, RAIL.y - 6, RAIL.x1 - RAIL.x0, 12);
    g.fillStyle(COLOR.steelShade, 1);
    g.fillRect(RAIL.x0, RAIL.y - 2, RAIL.x1 - RAIL.x0, 4);

    // Tray (left) and socket (right).
    g.fillStyle(COLOR.card, 1);
    g.fillRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h);
    g.lineStyle(1, COLOR.stroke, 1);
    g.strokeRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h);
    this.label(TRAY.x + TRAY.w / 2, TRAY.y - 12, 'TRAY');

    g.fillStyle(COLOR.steelShade, 1);
    g.fillRect(SOCKET.x, SOCKET.y, SOCKET.w, SOCKET.h);
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(SOCKET.x + 8, SOCKET.y + 20, SOCKET.w - 16, SOCKET.h - 40);
    g.lineStyle(2, ready ? COLOR.accent : COLOR.amber, 1);
    g.strokeRect(SOCKET.x, SOCKET.y, SOCKET.w, SOCKET.h);
    this.label(SOCKET.x + SOCKET.w / 2, SOCKET.y - 12, 'SOCKET', {
      color: ready ? COLOR.accentText : COLOR.amberText,
    });

    // Socket acceptance zone marker on the rail.
    const zoneX = RAIL.x0 + COUPLER_SOCKET_TRAVEL * (RAIL.x1 - RAIL.x0);

    g.fillStyle(COLOR.amber, 0.6);
    g.fillRect(zoneX, RAIL.y - 10, RAIL.x1 - zoneX + 2, 20);

    // Coupler.
    const coupler =
      bus.coupler === 'tray'
        ? { x: TRAY.x + 13, y: TRAY.y + 16, w: COUPLER.w, h: COUPLER.h }
        : this.couplerRect(bus.coupler === 'seated' ? 1 : bus.travel);

    g.fillStyle(COLOR.steelShade, 1);
    g.fillRect(coupler.x - 2, coupler.y - 2, coupler.w + 4, coupler.h + 4);
    g.fillStyle(ready ? COLOR.accent : COLOR.steel, 1);
    g.fillRect(coupler.x, coupler.y, coupler.w, coupler.h);
    g.fillStyle(COLOR.steelRim, 1);
    g.fillRect(coupler.x, coupler.y, coupler.w, 2);
    g.fillStyle(COLOR.dark, 1);
    g.fillRect(coupler.x + 6, coupler.y + 8, 8, coupler.h - 16);
    g.fillRect(coupler.x + coupler.w - 14, coupler.y + 8, 8, coupler.h - 16);
    this.label(
      coupler.x + coupler.w / 2,
      coupler.y + coupler.h + 12,
      'COUPLER',
      { font: '9px monospace' },
    );

    // Power band (bottom): propagates to the Core once seated.
    const bandY = 420;

    g.fillStyle(COLOR.dark, 1);
    g.fillRect(RAIL.x0 - 20, bandY, RAIL.x1 - RAIL.x0 + 40, 10);

    if (ready) {
      g.fillStyle(COLOR.flow, 1);
      g.fillRect(RAIL.x0 - 20, bandY + 2, RAIL.x1 - RAIL.x0 + 40, 6);
      g.fillStyle(COLOR.accent, 1);

      for (let i = 0; i < 10; i++) {
        const x =
          RAIL.x0 -
          20 +
          ((i * 46 + this.flowPhase * 46) % (RAIL.x1 - RAIL.x0 + 40));

        g.fillRect(x, bandY + 2, 12, 6);
      }
    } else {
      g.fillStyle(COLOR.dormant, 1);
      g.fillRect(RAIL.x0 - 20, bandY + 4, 30, 2);
    }

    this.label(
      RAIL.x1 + 20,
      bandY + 5,
      ready ? '→ CORE · LIVE' : '→ CORE · OPEN',
      {
        color: ready ? COLOR.accentText : COLOR.faint,
        origin: [0, 0.5],
        align: 'left',
      },
    );
  }

  private refreshProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const feeds = closureFeeds();
    const feed = this.data_.feed;
    const bus = feeds.distribution;

    window.__feedPanelProbe = {
      open: !this.closing,
      feed,
      ready: feedReady(feeds, feed),
      value:
        feed === 'coolant'
          ? feeds.coolant.travel
          : feed === 'calibration'
            ? feeds.calibration.index
            : bus.coupler === 'seated'
              ? 1
              : bus.travel,
      target: feed === 'calibration' ? BREAKER_TARGET_INDEX : 1,
      coupler: feed === 'distribution' ? bus.coupler : null,
      feedback: this.feedbackText.text || null,
      dev_inspection: devInspectionActive(),
      geometry: {
        wheel: feed === 'coolant' ? { ...WHEEL } : null,
        lever:
          feed === 'calibration'
            ? this.leverRect(feeds.calibration.index)
            : null,
        track: feed === 'calibration' ? { ...TRACK } : null,
        engage: feed === 'calibration' ? { ...ENGAGE } : null,
        coupler:
          feed === 'distribution'
            ? bus.coupler === 'tray'
              ? { x: TRAY.x + 13, y: TRAY.y + 16, w: COUPLER.w, h: COUPLER.h }
              : this.couplerRect(bus.coupler === 'seated' ? 1 : bus.travel)
            : null,
        socket: feed === 'distribution' ? { ...SOCKET } : null,
        tray: feed === 'distribution' ? { ...TRAY } : null,
        rail: feed === 'distribution' ? { ...RAIL } : null,
      },
    };
    refreshClosureProbe();
  }
}

function inRect(pointer: { x: number; y: number }, rect: Rect): boolean {
  return (
    pointer.x >= rect.x &&
    pointer.x <= rect.x + rect.w &&
    pointer.y >= rect.y &&
    pointer.y <= rect.y + rect.h
  );
}

/** Host-side launcher (openWorkSurface precedent): pause-and-launch. */
export function openFeedPanel(
  host: Phaser.Scene,
  data: Omit<FeedPanelLaunchData, 'resumeKey'>,
): boolean {
  if (host.scene.isActive(key.scene.pilotFeedPanel)) {
    return false;
  }

  host.scene.pause(host.scene.key);
  host.scene.launch(key.scene.pilotFeedPanel, {
    resumeKey: host.scene.key,
    ...data,
  } satisfies FeedPanelLaunchData);

  return true;
}
