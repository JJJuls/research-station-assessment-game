/**
 * Station map + mission log overlay (M) — World V1 U2 redraw.
 *
 * A clean schematic of the seven zones in their true topology (Dock south
 * of the Concourse; Records west; Laboratory north with the airlock to
 * the Recovery Yard beyond; Utility Deck east with the Core Chamber
 * beyond it): the current zone, visited zones, the current destination,
 * the fixed connections, the ONE purposeful return drawn as a highlighted
 * path while it is live, and the sector marks the story state restores.
 * Plus the concise mission log (open obligations registered by the
 * hosting windows — the authorised reminder exposure). Modal over a
 * paused pilot zone; M or ESC closes.
 *
 * Presentation only: no target response, hidden variable, puzzle
 * solution, item identifier, validity state or score is shown.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import { fitOverlayScene } from '../../world/viewport';
import type { PilotZoneKey } from '../pilotRoute';
import {
  pilotCurrentZone,
  pilotMapModel,
  pilotMissionLog,
  pilotStage,
} from '../pilotRoute';
import {
  missionCardAction,
  purposefulReturnPath,
  storyAct,
  storyActTitle,
  zoneMark,
} from '../storyState';

interface StationMapLaunchData {
  resumeKey: string;
  zone: PilotZoneKey;
}

interface MapBox {
  zone: PilotZoneKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True topology on a plan grid (design px; map column = left 500 px). */
const BOXES: readonly MapBox[] = [
  {
    zone: 'exterior_recovery_yard',
    label: 'Recovery Yard',
    x: 262,
    y: 118,
    w: 168,
    h: 44,
  },
  {
    zone: 'diagnostics_laboratory',
    label: 'Diagnostics Laboratory',
    x: 262,
    y: 206,
    w: 190,
    h: 44,
  },
  {
    zone: 'records_workshop',
    label: 'Records Workshop',
    x: 92,
    y: 294,
    w: 150,
    h: 44,
  },
  {
    zone: 'station_concourse',
    label: 'Station Concourse',
    x: 262,
    y: 294,
    w: 158,
    h: 44,
  },
  {
    zone: 'utility_core_deck',
    label: 'Utility Deck',
    x: 432,
    y: 294,
    w: 140,
    h: 44,
  },
  {
    zone: 'core_chamber',
    label: 'Core Chamber',
    x: 432,
    y: 206,
    w: 140,
    h: 44,
  },
  { zone: 'dock', label: 'Dock', x: 262, y: 382, w: 120, h: 40 },
];

/** Fixed connections (drawn beneath the boxes). */
const LINKS: readonly [PilotZoneKey, PilotZoneKey][] = [
  ['dock', 'station_concourse'],
  ['station_concourse', 'diagnostics_laboratory'],
  ['diagnostics_laboratory', 'exterior_recovery_yard'],
  ['records_workshop', 'station_concourse'],
  ['station_concourse', 'utility_core_deck'],
  ['utility_core_deck', 'core_chamber'],
];

const LOG_X = 528;
const LOG_W = 226;

declare global {
  interface Window {
    /** DEV-only, read-only map probe. */
    __pilotMapProbe?: {
      open: boolean;
      current: string | null;
      destination: string | null;
      discovered: string[];
      restored: string[];
      return_path: string[] | null;
      act: number;
      log_entries: string[];
    } | null;
  }
}

export class StationMapScene extends Phaser.Scene {
  private resumeKey: string = key.scene.stationConcourse;
  private zone: PilotZoneKey = 'station_concourse';

  constructor() {
    super(key.scene.pilotStationMap);
  }

  init(data?: Partial<StationMapLaunchData>) {
    this.resumeKey = data?.resumeKey ?? key.scene.stationConcourse;
    this.zone = data?.zone ?? 'station_concourse';
  }

  create() {
    this.scene.bringToTop();
    fitOverlayScene(this);

    const stage = pilotStage();
    const model = pilotMapModel();
    const byZone = new Map(model.map((node) => [node.zone, node]));
    const current = pilotCurrentZone() ?? this.zone;
    const destination = model.find((node) => node.destination)?.zone ?? null;
    const returnPath = purposefulReturnPath(stage);
    const log = pilotMissionLog();
    const restored = BOXES.map((box) => box.zone).filter(
      (zone) => zoneMark(zone, stage) === 'restored',
    );

    // The dim backdrop covers the whole canvas (1280/1.2 design px), not
    // only the 800×600 design space, so no letterbox seam frames the map.
    this.add.rectangle(400, 300, 1080, 620, 0x05080c, 0.62).setInteractive();
    this.add
      .rectangle(400, 300, 740, 520, 0x101820, 0.97)
      .setStrokeStyle(1, 0x33475a);
    this.add
      .text(262, 60, 'STATION 080 — PLAN', {
        color: '#dfe9f1',
        font: '16px monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(262, 82, `Act ${storyAct(stage)} — ${storyActTitle(stage)}`, {
        color: '#9fb2c1',
        font: '11px monospace',
      })
      .setOrigin(0.5);

    const centre = (zone: PilotZoneKey) => BOXES.find((b) => b.zone === zone)!;
    const onReturnPath = (a: PilotZoneKey, b: PilotZoneKey) =>
      returnPath !== null &&
      returnPath.some(
        (zone, index) =>
          index > 0 &&
          ((returnPath[index - 1] === a && zone === b) ||
            (returnPath[index - 1] === b && zone === a)),
      );

    for (const [a, b] of LINKS) {
      const from = centre(a);
      const to = centre(b);
      const highlighted = onReturnPath(a, b);
      const line = this.add.line(
        0,
        0,
        from.x,
        from.y,
        to.x,
        to.y,
        highlighted ? 0xe6c68f : 0x33475a,
        1,
      );

      line.setOrigin(0).setLineWidth(highlighted ? 5 : 3);
    }

    if (returnPath !== null) {
      this.add
        .text(
          262,
          452,
          'RETURN — the highlighted path leads back to the Records Workshop',
          {
            color: '#e6c68f',
            font: '10px monospace',
            align: 'center',
            wordWrap: { width: 440 },
          },
        )
        .setOrigin(0.5);
    }

    for (const box of BOXES) {
      const node = byZone.get(box.zone);
      const discovered = node?.discovered ?? false;
      const isCurrent = box.zone === current;
      const isDestination = box.zone === destination;
      const mark = zoneMark(box.zone, stage);
      const fill = isCurrent ? 0x1f7a8c : discovered ? 0x1b2633 : 0x121a22;
      const stroke = isDestination
        ? 0xe6c68f
        : isCurrent
          ? 0x5fd3c4
          : discovered
            ? 0x5a7084
            : 0x2b3a4a;

      this.add
        .rectangle(box.x, box.y, box.w, box.h, fill, 1)
        .setStrokeStyle(isDestination ? 3 : 2, stroke);
      this.add
        .text(box.x, box.y - 7, box.label, {
          color: discovered ? '#dfe9f1' : '#6f8498',
          font: '11px monospace',
          align: 'center',
          wordWrap: { width: box.w - 12 },
        })
        .setOrigin(0.5);

      // Restored sector: a filled mark in the box corner + the word (never
      // colour alone).
      if (mark === 'restored') {
        this.add.rectangle(
          box.x + box.w / 2 - 8,
          box.y - box.h / 2 + 8,
          8,
          8,
          0x7fc9a0,
          1,
        );
      }

      const tag = isCurrent
        ? 'YOU ARE HERE'
        : isDestination
          ? 'DESTINATION'
          : mark === 'restored'
            ? 'work done'
            : discovered
              ? 'visited'
              : 'not yet visited';

      this.add
        .text(box.x, box.y + 12, tag, {
          color: isCurrent
            ? '#5fd3c4'
            : isDestination
              ? '#e6c68f'
              : mark === 'restored'
                ? '#7fc9a0'
                : '#56687a',
          font: '10px monospace',
        })
        .setOrigin(0.5);
    }

    // ——— Mission log (right column) ———
    this.add
      .rectangle(LOG_X + LOG_W / 2, 296, LOG_W + 16, 420, 0x0c1219, 1)
      .setStrokeStyle(1, 0x33475a);
    this.add
      .text(LOG_X + LOG_W / 2, 100, 'MISSION LOG', {
        color: '#dfe9f1',
        font: '16px monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(LOG_X, 124, 'NEXT ACTION', {
        color: '#7f95a8',
        font: '9px monospace',
      })
      .setOrigin(0, 0.5);
    this.add.text(LOG_X, 136, missionCardAction(stage, current), {
      color: '#dfe9f1',
      font: '11px monospace',
      wordWrap: { width: LOG_W },
    });

    let y = 214;

    this.add
      .text(LOG_X, y, 'OPEN ITEMS', { color: '#7f95a8', font: '9px monospace' })
      .setOrigin(0, 0.5);
    y += 14;

    if (log.length === 0) {
      this.add.text(LOG_X, y, 'No open obligations.', {
        color: '#9fb2c1',
        font: '11px monospace',
      });
    } else {
      for (const entry of log.slice(0, 7)) {
        const glyph =
          entry.kind === 'obligation'
            ? '●'
            : entry.kind === 'project'
              ? '◆'
              : '·';
        const text = this.add.text(LOG_X, y, `${glyph} ${entry.text}`, {
          color: entry.kind === 'note' ? '#9fb2c1' : '#dfe9f1',
          font: '11px monospace',
          wordWrap: { width: LOG_W },
        });

        y += text.height + 6;
      }
    }

    // Legend (glyph + colour, never colour-only).
    this.add
      .text(
        400,
        540,
        'cyan = you are here   ·   amber = destination / return path   ·   ■ = work done\nM or ESC closes',
        {
          color: '#9fb2c1',
          font: '11px monospace',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const close = guardKeyHandler((event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (event.key === 'Escape' || event.key === 'm' || event.key === 'M') {
        this.close();
      }
    });

    this.input.keyboard!.on('keydown', close);
    this.input.once('pointerdown', () => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', close);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__pilotMapProbe = {
          open: false,
          current: null,
          destination: null,
          discovered: [],
          restored: [],
          return_path: null,
          act: 0,
          log_entries: [],
        };
      }
    });

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotMapProbe = {
        open: true,
        current,
        destination,
        discovered: model.filter((n) => n.discovered).map((n) => n.zone),
        restored,
        return_path: returnPath,
        act: storyAct(stage),
        log_entries: log.map((entry) => entry.text),
      };
    }
  }

  private close() {
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
