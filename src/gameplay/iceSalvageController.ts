/**
 * Ice-salvage scene controller (physical-mechanics session, Unit 7).
 *
 * Hosts the bore-side presentation and input loop of the post-assessment
 * salvage activity (state/deck in ./iceSalvage.ts): lowering the magnet,
 * the tension swing (set the hook with SPACE or a click while the marker
 * crosses the catch band), and the reel-up with its deterministic draw.
 *
 * The tension phase runs as a MANUAL world action (actions.ts flag), so
 * the avatar holds still and no station prompt can open mid-cast — the
 * same input isolation every timed action already has. Marker motion is
 * a fixed sine sweep (identical for everyone); the catch band is fixed
 * and generous. Hits and misses both resolve cleanly; a miss costs
 * nothing but the cast.
 *
 * DEV probe: window.__salvageProbe {phase, markerInBand} — read-only,
 * production-stripped, for runtime verification only.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import {
  beginManualWorldAction,
  endManualWorldAction,
  performWorldAction,
  showFloatingText,
} from './actions';
import { sfxComplete, sfxPickup, sfxScan, sfxUnavailable } from './audio';
import type { SalvageCatch } from './iceSalvage';
import { drawSalvageCatch, recordSalvageMiss } from './iceSalvage';

declare global {
  interface Window {
    /** DEV-only, read-only salvage-phase probe (never read back). */
    __salvageProbe?: {
      phase: 'idle' | 'lowering' | 'tension' | 'reeling';
      markerInBand: boolean;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__salvageProbe = null;
}

const BAR_HEIGHT = 96;
const BAND_TOP = 0.3;
const BAND_BOTTOM = 0.7;
const SWEEP_MS = 1400;

function setProbe(
  phase: 'idle' | 'lowering' | 'tension' | 'reeling',
  markerInBand: boolean,
) {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.__salvageProbe = { phase, markerInBand };
  }
}

interface SalvageCastConfig {
  scene: Phaser.Scene;
  /** Bore-head world position (the tension rig renders beside it). */
  x: number;
  y: number;
  onResolved: (
    result: { outcome: 'hit'; draw: SalvageCatch } | { outcome: 'miss' },
  ) => void;
}

/**
 * Raw winch-cast variant (action-assessment rebuild, Unit 4): the exact
 * same embodied presentation — lower, tension swing, hook, reel — but
 * the CALLER resolves what (if anything) comes up on a hit. Used by the
 * Recycler Catchment (M24 controlled deck); the ice-bore free-play cast
 * below keeps its original deck semantics byte-for-byte.
 */
export interface WinchCastConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Hook resolution: hit = the hook set inside the band. */
  onResolved: (hit: boolean) => void;
}

export function startWinchCast(config: WinchCastConfig): boolean {
  const { scene, x, y } = config;

  setProbe('lowering', false);

  const started = performWorldAction({
    scene,
    x,
    y,
    label: 'Lowering…',
    durationMs: 800,
    onComplete: () =>
      runTensionPhase(
        {
          scene,
          x,
          y,
          onResolved: () => undefined,
        },
        config.onResolved,
      ),
  });

  if (!started) {
    setProbe('idle', false);
  } else {
    sfxScan();
  }

  return started;
}

/**
 * Runs one full cast (lower → tension → hook → reel/resolve). Returns
 * false when another action is already running.
 */
export function startSalvageCast(config: SalvageCastConfig): boolean {
  const { scene, x, y } = config;

  setProbe('lowering', false);

  const started = performWorldAction({
    scene,
    x,
    y,
    label: 'Lowering…',
    durationMs: 800,
    onComplete: () => runTensionPhase(config),
  });

  if (!started) {
    setProbe('idle', false);
  } else {
    sfxScan();
  }

  return started;
}

function runTensionPhase(
  config: SalvageCastConfig,
  rawResolve?: (hit: boolean) => void,
) {
  const { scene, x, y } = config;

  beginManualWorldAction();

  const barX = x + 34;
  const barY = y - BAR_HEIGHT - 8;

  const line = scene.add
    .rectangle(x, y - 4, 2, 10, 0x9fb2c1, 1)
    .setOrigin(0.5, 1)
    .setDepth(Depth.AboveWorld - 1);
  const barBack = scene.add
    .rectangle(barX, barY, 14, BAR_HEIGHT, 0x101820, 1)
    .setOrigin(0.5, 0)
    .setStrokeStyle(1, 0x33475a)
    .setDepth(Depth.AboveWorld);
  const band = scene.add
    .rectangle(
      barX,
      barY + BAR_HEIGHT * BAND_TOP,
      10,
      BAR_HEIGHT * (BAND_BOTTOM - BAND_TOP),
      0x5fd3c4,
      0.35,
    )
    .setOrigin(0.5, 0)
    .setDepth(Depth.AboveWorld);
  const marker = scene.add
    .rectangle(barX, barY, 12, 4, 0xffffff, 1)
    .setOrigin(0.5, 0.5)
    .setDepth(Depth.AboveWorld);
  const hint = scene.add
    .text(barX, barY - 16, 'SPACE / click: set the hook', {
      backgroundColor: '#101820',
      color: '#ffffff',
      font: '12px monospace',
      padding: { x: 5, y: 3 },
    })
    .setOrigin(0.5)
    .setDepth(Depth.AboveWorld);

  // Fixed sine sweep (identical every cast, every participant).
  let elapsed = 0;
  let resolved = false;

  const markerPhase = () =>
    0.5 - 0.5 * Math.cos(((elapsed % SWEEP_MS) / SWEEP_MS) * Math.PI * 2);
  const inBand = () => {
    const phase = markerPhase();

    return phase >= BAND_TOP && phase <= BAND_BOTTOM;
  };

  const tick = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      elapsed += 16;
      marker.setY(barY + BAR_HEIGHT * markerPhase());
      // Line sways subtly with the swing (pure dressing).
      line.setScale(1, 1 + markerPhase() * 0.6);
      setProbe('tension', inBand());
    },
  });

  const cleanup = () => {
    tick.remove();
    line.destroy();
    barBack.destroy();
    band.destroy();
    marker.destroy();
    hint.destroy();
    scene.input.keyboard!.off('keydown-SPACE', onHook);
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, onHook);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    endManualWorldAction();
  };

  const onShutdown = () => {
    if (!resolved) {
      resolved = true;
      cleanup();
      setProbe('idle', false);
    }
  };

  const onHook = () => {
    if (resolved) {
      return;
    }

    resolved = true;

    const hit = inBand();

    cleanup();

    if (!hit) {
      // Raw casts leave miss bookkeeping to the caller (the ice deck's
      // miss counter belongs to the free-play activity only).
      if (rawResolve === undefined) {
        recordSalvageMiss();
      }

      sfxUnavailable();
      setProbe('idle', false);

      if (rawResolve !== undefined) {
        rawResolve(false);
      } else {
        config.onResolved({ outcome: 'miss' });
      }
      return;
    }

    setProbe('reeling', false);
    sfxPickup();
    performWorldAction({
      scene,
      x,
      y,
      label: 'Reeling…',
      durationMs: 900,
      onComplete: () => {
        setProbe('idle', false);

        if (rawResolve !== undefined) {
          // The caller resolves and presents the raw cast's outcome.
          rawResolve(true);
          return;
        }

        const draw = drawSalvageCatch();

        sfxComplete();
        showFloatingText(scene, x, y - 8, `+ ${draw.label}`);
        config.onResolved({ outcome: 'hit', draw });
      },
    });
  };

  scene.input.keyboard!.on('keydown-SPACE', onHook);
  scene.input.on(Phaser.Input.Events.POINTER_DOWN, onHook);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
}
