/**
 * Station map overlay (M) — professional pilot route, Unit 2.
 *
 * A compact schematic of the six participant areas (Dock, Concourse,
 * Records & Logistics, Diagnostics Laboratory, Exterior Recovery Yard,
 * Utility & Core Deck) with the current position, the current destination
 * and discovered/undiscovered state. Modal over a paused pilot zone
 * (pause-and-launch, inventory-overlay precedent); M or ESC closes.
 * Presentation only: shows no measurement logic, no status of any task.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { guardKeyHandler } from '../../inventory/ui/keyGuard';
import type { PilotZoneKey } from '../pilotRoute';
import { pilotMapModel, pilotObjective } from '../pilotRoute';

interface StationMapLaunchData {
  resumeKey: string;
  zone: PilotZoneKey;
}

interface MapBox {
  zone: PilotZoneKey | 'records';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const BOXES: readonly MapBox[] = [
  {
    zone: 'exterior_recovery_yard',
    label: 'Exterior Recovery Yard',
    x: 400,
    y: 118,
    w: 220,
    h: 54,
  },
  {
    zone: 'diagnostics_laboratory',
    label: 'Diagnostics & Signal Laboratory',
    x: 400,
    y: 222,
    w: 250,
    h: 54,
  },
  {
    zone: 'records',
    label: 'Records & Logistics',
    x: 168,
    y: 326,
    w: 170,
    h: 46,
  },
  {
    zone: 'station_concourse',
    label: 'Station Concourse',
    x: 400,
    y: 326,
    w: 200,
    h: 54,
  },
  {
    zone: 'utility_core_deck',
    label: 'Utility & Core Deck',
    x: 632,
    y: 326,
    w: 190,
    h: 54,
  },
  { zone: 'dock', label: 'Dock', x: 400, y: 430, w: 150, h: 46 },
];

/** Corridor lines between box centres (drawn beneath the boxes). */
const LINKS: readonly [MapBox['zone'], MapBox['zone']][] = [
  ['dock', 'station_concourse'],
  ['station_concourse', 'diagnostics_laboratory'],
  ['diagnostics_laboratory', 'exterior_recovery_yard'],
  ['station_concourse', 'utility_core_deck'],
  ['records', 'station_concourse'],
];

declare global {
  interface Window {
    /** DEV-only, read-only map probe. */
    __pilotMapProbe?: {
      open: boolean;
      current: string | null;
      destination: string | null;
      discovered: string[];
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

    this.add.rectangle(400, 300, 800, 600, 0x05080c, 0.62).setInteractive();
    this.add
      .rectangle(400, 300, 720, 516, 0x101820, 0.97)
      .setStrokeStyle(1, 0x33475a);
    this.add
      .text(400, 66, 'STATION DIRECTORY', {
        color: '#dfe9f1',
        font: '18px monospace',
      })
      .setOrigin(0.5);
    this.add
      .text(400, 88, pilotObjective(), {
        color: '#9fb2c1',
        font: '12px monospace',
        wordWrap: { width: 640 },
        align: 'center',
      })
      .setOrigin(0.5);

    const centre = (zone: MapBox['zone']) =>
      BOXES.find((b) => b.zone === zone)!;

    for (const [a, b] of LINKS) {
      const from = centre(a);
      const to = centre(b);
      const line = this.add.line(0, 0, from.x, from.y, to.x, to.y, 0x33475a, 1);

      line.setOrigin(0).setLineWidth(3);
    }

    for (const box of BOXES) {
      const node =
        box.zone === 'records'
          ? byZone.get('station_concourse')
          : byZone.get(box.zone);
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
        .text(box.x, box.y - (discovered ? 6 : 0), box.label, {
          color: discovered ? '#dfe9f1' : '#6f8498',
          font: '12px monospace',
          align: 'center',
          wordWrap: { width: box.w - 16 },
        })
        .setOrigin(0.5);

      if (!discovered) {
        this.add
          .text(box.x, box.y + 14, 'not yet visited', {
            color: '#56687a',
            font: '10px monospace',
          })
          .setOrigin(0.5);
      } else if (isCurrent) {
        this.add
          .text(box.x, box.y + 14, 'YOU ARE HERE', {
            color: '#5fd3c4',
            font: '10px monospace',
          })
          .setOrigin(0.5);
      } else if (isDestination) {
        this.add
          .text(box.x, box.y + 14, 'DESTINATION', {
            color: '#e6c68f',
            font: '10px monospace',
          })
          .setOrigin(0.5);
      }

      if (isDestination && !discovered) {
        this.add
          .text(box.x, box.y + 14, 'DESTINATION', {
            color: '#e6c68f',
            font: '10px monospace',
          })
          .setOrigin(0.5);
      }
    }

    // Legend (glyph + colour, never colour-only).
    this.add
      .text(
        400,
        516,
        'cyan = you are here   ·   amber = destination   ·   grey = not yet visited\nM or ESC closes the map',
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', close);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__pilotMapProbe = {
          open: false,
          current: null,
          destination: null,
          discovered: [],
        };
      }
    });

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotMapProbe = {
        open: true,
        current,
        destination,
        discovered: model.filter((n) => n.discovered).map((n) => n.zone),
      };
    }
  }

  private close() {
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
