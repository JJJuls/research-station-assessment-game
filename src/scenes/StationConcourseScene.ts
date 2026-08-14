import { key } from '../constants';
import type { RoomLayout } from '../world';
import { ZoneScene } from '../world/fourZoneRoute';

/**
 * Zone 1 — Station Concourse (four-zone assessment route).
 *
 * A compact professional intake and operational floor: the participant
 * route's first zone, replacing the legacy Dock/Hub/Inventory/Engineer
 * navigation clutter with one readable room. Spatial anchors:
 * spawn centre-south, Arrival Terminal south-west, Operations Desk as
 * the central focal point, Logistics Bay west, Operational Workcells
 * east, Crew Checkpoint north-west, and the single forward transition
 * (Diagnostics Laboratory) centre-north. All station shells are
 * INACTIVE — inspection shows a short neutral description and records
 * nothing.
 */
export class StationConcourseScene extends ZoneScene {
  protected readonly zoneKey = key.scene.stationConcourse;

  constructor() {
    super(key.scene.stationConcourse);
  }

  protected getLayout(): RoomLayout {
    // 25×19 concourse floor (fills the 800×600 viewport; bottom rows are
    // structural wall mass, Dock precedent). Rail stubs at rows 5/11
    // zone the west Logistics Bay and east Workcells off the central
    // circulation lane (cols 7-17) without closing the perimeter walk.
    return {
      theme: 'hub',
      grid: [
        '#########################',
        '###########--############',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..####...........####..#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..####...........####..#',
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
    // Centre-south, facing north (the player sprite spawns facing south
    // by default and turns on first input; position is the anchor).
    return { x: 384, y: 460 };
  }

  protected populateZone(): void {
    // — Forward transition: Diagnostics Laboratory, centre-north.
    this.setForward({
      x: 384,
      y: 48,
      label: 'Diagnostics Laboratory',
      targetSceneKey: key.scene.diagnosticsLaboratory,
    });
    // Beside the door on the wall band — clear of the fixed objective
    // line (top-left) and of the door marker/beacon.
    this.addSignage(488, 46, 'DIAGNOSTICS LABORATORY');

    // — Arrival Terminal (south-west anchor).
    this.addShell({
      label: 'Arrival Terminal',
      description:
        'Arrival Terminal. Crew check-in and station briefing point. Offline during route orientation.',
      x: 96,
      y: 428,
      texture: 'proc-console-quartermaster',
    });

    // — Future station shells (inactive), placed by floor zone.
    // North wall band:
    this.addShell({
      label: 'Operations Board',
      description:
        'Operations Board. Shift assignments will be posted here. Offline during route orientation.',
      x: 240,
      y: 92,
      texture: 'proc-board-workorders',
    });
    this.addShell({
      label: 'Maintenance Roster',
      description:
        'Maintenance Roster. Maintenance duties are listed here. Offline during route orientation.',
      x: 560,
      y: 92,
      texture: 'proc-board-portfolio',
    });
    this.addShell({
      label: 'Crew Checkpoint',
      description:
        'Crew Checkpoint. Access to the laboratory wing is controlled here. Offline during route orientation.',
      x: 96,
      y: 100,
      texture: 'proc-console-scenario',
    });
    this.addShell({
      label: 'Calibration Conveyor',
      description:
        'Calibration Conveyor. Components move through calibration here. Offline during route orientation.',
      x: 656,
      y: 92,
      texture: 'proc-rig-intake',
    });

    // West Logistics Bay:
    this.addShell({
      label: 'Logistics Bench',
      description:
        'Logistics Bench. Supply manifests are prepared here. Offline during route orientation.',
      x: 110,
      y: 232,
      texture: 'proc-bench-prep',
    });
    this.addShell({
      label: 'Cargo Workcell',
      description:
        'Cargo Workcell. Cargo handling tasks are staged here. Offline during route orientation.',
      x: 96,
      y: 322,
      texture: 'proc-crate-components',
    });

    // East Operational Workcells:
    this.addShell({
      label: 'Calibration Cabinet',
      description:
        'Calibration Cabinet. Instrument calibration kits are stored here. Offline during route orientation.',
      x: 700,
      y: 232,
      texture: 'proc-cabinet-calibration',
    });
    this.addShell({
      label: 'Quality-Control Bench',
      description:
        'Quality-Control Bench. Outgoing equipment is checked here. Offline during route orientation.',
      x: 704,
      y: 322,
      texture: 'proc-desk-closure',
    });

    // South band:
    this.addShell({
      label: 'Intake Console',
      description:
        'Intake Console. Incoming crew records are processed here. Offline during route orientation.',
      x: 240,
      y: 466,
      texture: 'proc-console-wall',
    });
    this.addShell({
      label: 'Sample Transfer',
      description:
        'Sample Transfer station. Samples are handed over here. Offline during route orientation.',
      x: 700,
      y: 430,
      texture: 'proc-specimen-case',
    });

    // — Operations Desk: central focal point (decor cluster, east of the
    // circulation lane so the route to the laboratory stays clear).
    this.addDecor(448, 268, 'proc-light-pool');
    this.addDecor(448, 262, 'proc-desk-reception');
    this.addAmbientFigure(496, 240, 'plv1-vale');
    this.addSignage(448, 216, 'OPERATIONS');

    // — Floor zoning: light pools, signage, restrained dressing.
    this.addDecor(96, 112, 'proc-light-pool');
    this.addDecor(384, 108, 'proc-light-pool');
    this.addSignage(110, 182, 'LOGISTICS BAY');
    this.addSignage(700, 182, 'WORKCELLS');
    this.addSignage(96, 62, 'CREW CHECKPOINT');
    this.addDecor(616, 46, 'proc-window-exterior');
    this.addDecor(712, 46, 'proc-window-exterior');
    this.addDecor(160, 510, 'proc-wall-pipes');
    this.addDecor(640, 510, 'proc-wall-pipes');
    this.addDecor(320, 300, 'proc-seat-bench');
    this.addDecor(560, 380, 'proc-cart-utility');
    this.addAmbientFigure(180, 300, 'proc-worker-hauler');

    // Rail-end safety lights (zoning cue, dull amber — never cyan).
    this.addSafetyLight(96, 176);
    this.addSafetyLight(216, 176);
    this.addSafetyLight(584, 176);
    this.addSafetyLight(704, 176);
    this.addSafetyLight(96, 368);
    this.addSafetyLight(216, 368);
    this.addSafetyLight(584, 368);
    this.addSafetyLight(704, 368);
  }
}
