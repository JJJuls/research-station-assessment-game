import { key } from '../constants';
import { snowfall } from '../gameplay/effects';
import type { RoomLayout } from '../world';
import { ZoneScene } from '../world/fourZoneRoute';

/**
 * Zone 3 — Exterior Recovery Yard (four-zone assessment route).
 *
 * A convincing polar exterior: entrance airlock south-west, one
 * clearly readable clockwise service path around a central
 * environmental landmark (the relay module and mast, visible from most
 * of the map), five inactive work pads positioned clockwise along the
 * path, and the single forward transition (Utility Deck airlock)
 * north-east. No branching scene exits. Path legibility comes from the
 * ring geometry, footprints, pad foundations and safety lighting — not
 * from a painted arrow.
 */
export class ExteriorRecoveryYardScene extends ZoneScene {
  protected readonly zoneKey = key.scene.exteriorRecoveryYard;

  constructor() {
    super(key.scene.exteriorRecoveryYard);
  }

  protected getLayout(): RoomLayout {
    // 25×19 yard. The central rock/structure block (rows 7-11, cols
    // 9-15) forms the landmark island the service path rings; the
    // doorway at row 1 (cols 21-22) is the north-east Utility Deck
    // airlock. Map-edge ridge walls are the boundary fence line.
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '#####################--##',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#........#######........#',
        '#........#######........#',
        '#........#######........#',
        '#........#######........#',
        '#........#######........#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // The zone's single entrance: the south-west airlock apron.
    return { x: 96, y: 480 };
  }

  protected populateZone(): void {
    // — Forward transition: Utility Deck airlock, north-east.
    this.setForward({
      x: 704,
      y: 48,
      label: 'Utility Deck Airlock',
      targetSceneKey: key.scene.utilityCoreDeck,
    });
    // West of the airlock on the ridge band — clear of the door marker
    // and of the pre-existing top-right overlay icon. Flanking amber
    // safety lights lift the exit's salience against the snow.
    this.addSignage(616, 46, 'UTILITY DECK');
    this.addSafetyLight(664, 100);
    this.addSafetyLight(744, 100);

    // — Entrance airlock dressing (south-west; arrival only, no door).
    this.addDecor(96, 522, 'proc-wall-pipes');
    this.addSignage(96, 448, 'AIRLOCK APRON');
    this.addSafetyLight(64, 500);
    this.addSafetyLight(128, 500);

    // — Central environmental landmark: relay module + mast on the rock
    // island, visible from most of the yard.
    this.addDecor(384, 270, 'proc-station-module');
    this.addDecor(472, 250, 'proc-beacon-comms');
    this.addSafetyLight(300, 230);
    this.addSafetyLight(468, 366);
    this.addSignage(384, 312, 'RELAY 04');

    // — Five inactive work pads, clockwise along the service path.
    const pads: {
      label: string;
      description: string;
      x: number;
      y: number;
      texture: string;
    }[] = [
      {
        label: 'Pressure Regulation Station',
        description:
          'Pressure Regulation Station. External pressure lines are managed here. Offline during route orientation.',
        x: 96,
        y: 320,
        texture: 'proc-valve-relief',
      },
      {
        label: 'Antenna Alignment Platform',
        description:
          'Antenna Alignment Platform. The relay antenna is aligned from this platform. Offline during route orientation.',
        x: 128,
        y: 128,
        texture: 'proc-antenna-damaged',
      },
      {
        label: 'Field Manual Station',
        description:
          'Field Manual Station. Field procedures are consulted here. Offline during route orientation.',
        x: 368,
        y: 100,
        texture: 'proc-notebook-stand',
      },
      {
        label: 'Power Relay Junction',
        description:
          'Power Relay Junction. Exterior power routing is switched here. Offline during route orientation.',
        x: 560,
        y: 120,
        texture: 'proc-panel-warning',
      },
      {
        label: 'Core Sample Extraction Rig',
        description:
          'Core Sample Extraction Rig. Ground samples are extracted here. Offline during route orientation.',
        x: 688,
        y: 208,
        texture: 'proc-ice-bore',
      },
    ];

    for (const pad of pads) {
      // Equipment foundation plate under each pad, plus a safety light.
      this.addFoundation(pad.x, pad.y + 14, 64, 44);
      this.addShell(pad);
      this.addSafetyLight(pad.x - 40, pad.y + 28);
    }

    // — Footprint trails tracing the clockwise service path (decals).
    for (const [x, y] of [
      [96, 432],
      [92, 384],
      [100, 260],
      [96, 192],
      [112, 160],
      [180, 116],
      [256, 104],
      [320, 108],
      [432, 104],
      [496, 112],
      [608, 128],
      [656, 160],
      [688, 128],
      [700, 96],
    ] as const) {
      this.addDecor(x, y, 'proc-footprints');
    }

    // — Boundary fencing: sector posts inside the south and east ridge.
    for (const x of [192, 320, 448, 576] as const) {
      this.addDecor(x, 496, 'proc-sector-post');
    }
    this.addDecor(736, 384, 'proc-sector-post');
    this.addDecor(736, 256, 'proc-sector-post');

    // — Ground response + worked terrain near the pads.
    this.addDecor(200, 152, 'proc-ground-disturbed');
    this.addDecor(640, 232, 'proc-ground-disturbed');
    this.addDecor(160, 360, 'proc-dig-mound');

    // — Restrained weather: the existing deterministic snowfall system
    // (reduced-motion aware) at a calm density.
    snowfall(this, { width: 800, height: 608, seed: 0x5eed4003, count: 26 });
  }
}
