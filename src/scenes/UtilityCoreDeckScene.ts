import { key } from '../constants';
import type { RoomLayout } from '../world';
import { ZoneScene } from '../world/fourZoneRoute';

/**
 * Zone 4 — Utility & Core Deck (four-zone assessment route).
 *
 * The route's final zone: entrance centre-south, Magnet Recycler west,
 * Coolant Intake Pump east, Depleted Cache Test Area north-west,
 * Sample Processing/Cleanup Bench centre, and the Core Chamber as a
 * physically integrated raised alcove at the north — the route's
 * endpoint, with no exit beyond it during the assessment preview.
 * Funnel walls and converging light pools draw the route visually
 * toward the Core Chamber.
 */
export class UtilityCoreDeckScene extends ZoneScene {
  protected readonly zoneKey = key.scene.utilityCoreDeck;

  constructor() {
    super(key.scene.utilityCoreDeck);
  }

  protected getLayout(): RoomLayout {
    // 25×19 deck. Rows 2-4 (cols 10-14) form the raised Core Chamber
    // alcove; the row-5 shoulder walls funnel the deck floor toward it.
    return {
      theme: 'utility',
      grid: [
        '#########################',
        '#########################',
        '##########.....##########',
        '##########.....##########',
        '##########.....##########',
        '#####...............#####',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
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
    // The zone's single entrance: centre-south.
    return { x: 384, y: 480 };
  }

  protected populateZone(): void {
    // — Core Chamber endpoint: raised north alcove, no exit beyond.
    this.setForward({
      x: 400,
      y: 92,
      label: 'Core Chamber',
      targetSceneKey: null,
      endpointDescription:
        'Core Chamber. Assessment route endpoint. Core access is sealed during route orientation.',
      texture: 'proc-core-interface',
    });
    this.addDecor(400, 44, 'proc-core-column');
    this.addSignage(400, 150, 'CORE CHAMBER');

    // Alcove glow: a restrained cool light pool inside the chamber and
    // amber threshold lights on the funnel shoulders.
    this.addDecor(400, 120, 'proc-light-pool');
    this.addSafetyLight(336, 168);
    this.addSafetyLight(464, 168);

    // — Station shells.
    this.addShell({
      label: 'Magnet Recycler',
      description:
        'Magnet Recycler. Ferrous salvage is reclaimed here. Offline during route orientation.',
      x: 96,
      y: 288,
      texture: 'proc-rig-recycler',
    });
    this.addShell({
      label: 'Coolant Intake Pump',
      description:
        'Coolant Intake Pump. Coolant feed for the core loop. Offline during route orientation.',
      x: 704,
      y: 288,
      texture: 'proc-rig-intake',
    });
    this.addShell({
      label: 'Depleted Cache Test Area',
      description:
        'Depleted Cache Test Area. A cleared survey cache used for equipment checks. Offline during route orientation.',
      x: 112,
      y: 216,
      texture: 'proc-reclamation-post',
    });
    this.addShell({
      label: 'Sample Processing Bench',
      description:
        'Sample Processing Bench. Samples are processed and work areas reset here. Offline during route orientation.',
      x: 448,
      y: 320,
      texture: 'proc-bench-prep',
    });

    // — Converging guidance lighting along the centre lane.
    this.addDecor(384, 416, 'proc-light-pool');
    this.addDecor(392, 288, 'proc-light-pool');
    this.addDecor(396, 200, 'proc-light-pool');

    // — Deck dressing (restrained industrial utility).
    this.addDecor(160, 216, 'proc-dig-mound');
    this.addDecor(96, 356, 'proc-crate-supply');
    this.addDecor(704, 356, 'proc-pipe-valve');
    this.addDecor(624, 216, 'proc-wall-pipes');
    this.addDecor(240, 510, 'proc-wall-pipes');
    this.addDecor(560, 510, 'proc-wall-pipes');
    this.addDecor(624, 448, 'proc-cart-utility');
    this.addAmbientFigure(280, 380, 'proc-worker-hauler');
    this.addSignage(96, 244, 'RECYCLER');
    this.addSignage(704, 244, 'COOLANT INTAKE');
    this.addSignage(112, 176, 'DEPLETED CACHE');

    // Centre-lane floor conduit toward the core alcove (presentation
    // only, walkable). The former thin diagonal pump run read as a
    // stray vector at participant distance and was removed.
    this.add.rectangle(384, 380, 6, 150, 0x33475a, 0.5).setDepth(-0.2);

    // Threshold marker under the alcove mouth (visual convergence cue,
    // never a collision or interaction change).
    this.add.rectangle(400, 180, 120, 4, 0x5fd3c4, 0.25).setDepth(-0.2);
  }
}
