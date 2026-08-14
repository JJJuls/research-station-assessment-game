import { Depth, key } from '../constants';
import type { RoomLayout } from '../world';
import { ZoneScene } from '../world/fourZoneRoute';

/**
 * Zone 2 — Diagnostics Laboratory (four-zone assessment route).
 *
 * One coherent laboratory: entrance centre-south, a wide unobstructed
 * central aisle, three inactive diagnostic panels along the west wall
 * and three along the east wall, a professional briefing/display
 * surface at centre-north, and the single forward transition (the
 * Exterior Airlock) centre-north beyond the display. No additional
 * doors. All six station shells are inactive and visually distinct
 * while sharing the laboratory's panel language.
 */
export class DiagnosticsLaboratoryScene extends ZoneScene {
  protected readonly zoneKey = key.scene.diagnosticsLaboratory;

  constructor() {
    super(key.scene.diagnosticsLaboratory);
  }

  protected getLayout(): RoomLayout {
    // 25×19 laboratory. The row-4 stub (cols 9-13) carries the briefing
    // display; the airlock doorway sits beyond it at row 1, reached
    // around either side of the display wall through the two-tile
    // corridor of rows 2-3 (the 42px player body needs a 64px lane —
    // a single-row gap is impassable).
    return {
      theme: 'ops',
      grid: [
        '#########################',
        '###########--############',
        '#.......................#',
        '#.......................#',
        '#........#####..........#',
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
    // — Forward transition: Exterior Airlock, centre-north beyond the
    // briefing display.
    this.setForward({
      x: 384,
      y: 48,
      label: 'Exterior Airlock',
      targetSceneKey: key.scene.exteriorRecoveryYard,
    });
    // Beside the door on the wall band — clear of the fixed objective
    // line (top-left) and of the door marker/beacon.
    this.addSignage(524, 46, 'EXTERIOR AIRLOCK');

    // — Briefing/display surface on the row-4 display wall (drawn in the
    // shared panel language; purely presentational).
    this.add
      .rectangle(368, 144, 140, 34, 0x101820, 0.96)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(Depth.AbovePlayer);
    this.add
      .text(368, 136, 'DIAGNOSTICS BRIEFING', {
        color: '#9fb2c1',
        font: '11px monospace',
      })
      .setOrigin(0.5)
      .setDepth(Depth.AbovePlayer);
    for (const [width, offsetY] of [
      [104, 8],
      [88, 14],
    ] as const) {
      this.add
        .rectangle(368, 136 + offsetY, width, 2, 0x33475a, 1)
        .setDepth(Depth.AbovePlayer);
    }

    // — West diagnostic panels (three, distinct identities).
    this.addShell({
      label: 'Signal Lattice',
      description:
        'Signal Lattice. Signal patterns are reviewed on this panel. Offline during route orientation.',
      x: 128,
      y: 192,
      texture: 'proc-diag-board',
    });
    this.addShell({
      label: 'Multi-Source Status Board',
      description:
        'Multi-Source Status Board. Station status feeds converge here. Offline during route orientation.',
      x: 128,
      y: 288,
      texture: 'proc-board-workorders',
    });
    this.addShell({
      label: 'Causal Systems Table',
      description:
        'Causal Systems Table. System dependencies are traced here. Offline during route orientation.',
      x: 128,
      y: 384,
      texture: 'proc-console-scenario',
    });

    // — East diagnostic panels (three, distinct identities).
    this.addShell({
      label: 'Protocol Transfer Console',
      description:
        'Protocol Transfer Console. Procedure handovers are managed here. Offline during route orientation.',
      x: 672,
      y: 192,
      texture: 'proc-console-wall',
    });
    this.addShell({
      label: 'Equipment Trainer',
      description:
        'Equipment Trainer. Equipment handling is practised here. Offline during route orientation.',
      x: 672,
      y: 288,
      texture: 'proc-rack-tools',
    });
    this.addShell({
      label: 'Diagnostic Hypothesis Console',
      description:
        'Diagnostic Hypothesis Console. Fault diagnoses are entered here. Offline during route orientation.',
      x: 672,
      y: 384,
      texture: 'proc-shelf-electronics',
    });

    // — Laboratory dressing: bay lighting anchored beside the panel
    // rows (a pool with nothing beneath it reads as an empty prop slot),
    // one pool over the airlock approach, and a subtle centre-aisle
    // floor guide toward the airlock (walkable, presentation only —
    // the aisle itself stays unobstructed).
    this.addDecor(192, 288, 'proc-light-pool');
    this.addDecor(608, 288, 'proc-light-pool');
    this.addDecor(384, 88, 'proc-light-pool');
    this.add.rectangle(384, 330, 6, 300, 0x33475a, 0.45).setDepth(-0.2);
    this.add.rectangle(384, 184, 60, 4, 0x33475a, 0.6).setDepth(-0.2);
    this.addDecor(200, 46, 'proc-window-exterior');
    this.addDecor(648, 46, 'proc-window-exterior');
    this.addDecor(240, 510, 'proc-wall-pipes');
    this.addDecor(560, 510, 'proc-wall-pipes');
    this.addDecor(224, 288, 'proc-gauge-card');
    this.addDecor(576, 288, 'proc-gauge-card');
    this.addDecor(128, 470, 'proc-seat-bench');
    this.addDecor(672, 470, 'proc-cart-utility');
    this.addAmbientFigure(620, 310, 'plv1-kai');
    this.addSignage(128, 140, 'DIAGNOSTIC PANELS W');
    this.addSignage(672, 140, 'DIAGNOSTIC PANELS E');

    // Aisle edge safety lights (dull amber, zoning only).
    this.addSafetyLight(256, 224);
    this.addSafetyLight(512, 224);
    this.addSafetyLight(256, 416);
    this.addSafetyLight(512, 416);
  }
}
