/**
 * Station map + mission log overlay (M) — evidence-led pilot v2 (Unit 1).
 *
 * A compact schematic of the seven participant zones (Dock, Concourse,
 * Records Workshop, Diagnostics Laboratory, Recovery Yard, Utility Deck,
 * Core Chamber) with the current position, the current destination and
 * discovered/undiscovered state, plus the concise mission log (open
 * obligations, projects and notes registered by the hosting windows).
 * Modal over a paused pilot zone (pause-and-launch, inventory-overlay
 * precedent); M or ESC closes. Presentation only: shows no measurement
 * logic, no validity state, no score.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import type { PilotZoneKey } from '../pilotRoute';
import {
  PILOT_EPISODE_NAMES,
  pilotEpisode,
  pilotMapModel,
  pilotMissionLog,
  pilotObjective,
} from '../pilotRoute';

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

/** Map column (left 480 px); the mission log occupies the right column. */
const BOXES: readonly MapBox[] = [
  {
    zone: 'exterior_recovery_yard',
    label: 'Recovery Yard',
    x: 262,
    y: 128,
    w: 170,
    h: 46,
  },
  {
    zone: 'diagnostics_laboratory',
    label: 'Diagnostics Laboratory',
    x: 262,
    y: 216,
    w: 190,
    h: 46,
  },
  {
    zone: 'records_workshop',
    label: 'Records Workshop',
    x: 104,
    y: 304,
    w: 150,
    h: 46,
  },
  {
    zone: 'station_concourse',
    label: 'Station Concourse',
    x: 262,
    y: 304,
    w: 150,
    h: 46,
  },
  {
    zone: 'utility_core_deck',
    label: 'Utility Deck',
    x: 420,
    y: 304,
    w: 150,
    h: 46,
  },
  // Unit 6: the Core Chamber sits north of the Utility Deck (gated door).
  {
    zone: 'core_chamber',
    label: 'Core Chamber',
    x: 440,
    y: 216,
    w: 124,
    h: 46,
  },
  { zone: 'dock', label: 'Dock', x: 262, y: 392, w: 120, h: 40 },
];

/** Corridor lines between box centres (drawn beneath the boxes). */
const LINKS: readonly [PilotZoneKey, PilotZoneKey][] = [
  ['dock', 'station_concourse'],
  ['station_concourse', 'diagnostics_laboratory'],
  ['diagnostics_laboratory', 'exterior_recovery_yard'],
  ['station_concourse', 'utility_core_deck'],
  ['utility_core_deck', 'core_chamber'],
  ['records_workshop', 'station_concourse'],
];

const LOG_X = 528;
const LOG_W = 244;

declare global {
  interface Window {
    /** DEV-only, read-only map probe. */
    __pilotMapProbe?: {
      open: boolean;
      current: string | null;
      destination: string | null;
      discovered: string[];
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

    const model = pilotMapModel();
    const byZone = new Map(model.map((node) => [node.zone, node]));
    const current = model.find((node) => node.current)?.zone ?? this.zone;
    const destination = model.find((node) => node.destination)?.zone ?? null;
    const log = pilotMissionLog();
    const episode = pilotEpisode();

    this.add.rectangle(400, 300, 800, 600, 0x05080c, 0.62).setInteractive();
    this.add
      .rectangle(400, 300, 740, 520, 0x101820, 0.97)
      .setStrokeStyle(1, 0x33475a);
    this.add
      .text(262, 62, 'STATION MAP', {
        color: '#dfe9f1',
        font: '16px monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(
        262,
        84,
        `Shift segment ${episode} — ${PILOT_EPISODE_NAMES[episode]}`,
        {
          color: '#9fb2c1',
          font: '11px monospace',
          wordWrap: { width: 440 },
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const centre = (zone: PilotZoneKey) => BOXES.find((b) => b.zone === zone)!;

    for (const [a, b] of LINKS) {
      const from = centre(a);
      const to = centre(b);
      const line = this.add.line(0, 0, from.x, from.y, to.x, to.y, 0x33475a, 1);

      line.setOrigin(0).setLineWidth(3);
    }

    for (const box of BOXES) {
      const node = byZone.get(box.zone);
      const discovered = node?.discovered ?? false;
      const isCurrent = box.zone === current;
      const isDestination = box.zone === destination;
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

      const tag = isCurrent
        ? 'YOU ARE HERE'
        : isDestination
          ? 'DESTINATION'
          : discovered
            ? ''
            : 'not yet visited';

      if (tag.length > 0) {
        this.add
          .text(box.x, box.y + 12, tag, {
            color: isCurrent
              ? '#5fd3c4'
              : isDestination
                ? '#e6c68f'
                : '#56687a',
            font: '9px monospace',
          })
          .setOrigin(0.5);
      }
    }

    // ——— Mission log (right column) ———
    this.add
      .rectangle(LOG_X + LOG_W / 2, 300, LOG_W + 16, 440, 0x0c1219, 1)
      .setStrokeStyle(1, 0x33475a);
    this.add
      .text(LOG_X + LOG_W / 2, 100, 'MISSION LOG', {
        color: '#dfe9f1',
        font: '16px monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(LOG_X, 124, 'CURRENT OBJECTIVE', {
        color: '#7f95a8',
        font: '9px monospace',
      })
      .setOrigin(0, 0.5);
    this.add.text(LOG_X, 136, pilotObjective(), {
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
        528,
        'cyan = you are here   ·   amber = destination   ·   grey = not yet visited\nM or ESC closes',
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
        log_entries: log.map((entry) => entry.text),
      };
    }
  }

  private close() {
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
