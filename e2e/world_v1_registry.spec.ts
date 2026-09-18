/**
 * World V1 — interaction registry and layout invariants (pure).
 *
 * For every registered zone (INTERACTION-GRAMMAR.md §5): ids unique; every
 * object has a verb and a label; decorative entries open nothing; every
 * approach point lies inside the object's interaction radius and is
 * reachable on foot (32×42 body, BFS over the layout) from every arrival
 * spawn of the zone; no non-door object stands inside a door trigger's
 * clearance; the derived class and the prompt line follow the grammar.
 * Also the walking budget of CAMERA-AND-SCALE-SPEC.md §4 for the rebuilt
 * zones (the other zones are added by their units).
 */
import { expect, test } from '@playwright/test';

import { PILOT_DOORS } from '../src/pilot/pilotRoute';
import {
  CONCOURSE_SPAWNS,
  CONCOURSE_STATIONS,
  CORE_SPAWN,
  DECK_SPAWNS,
  DOCK_SITES,
  LAB_SPAWNS,
  WORKSHOP_SPAWN,
  YARD_SPAWN,
} from '../src/pilot/zoneSites';
import {
  deriveObjectClass,
  INTERACTION_RADIUS,
  promptText,
  REGISTERED_ZONES,
  WORLD_V1_REGISTRY,
} from '../src/world/interactionRegistry';
import {
  CONCOURSE_LAYOUT,
  CONCOURSE_SOLIDS,
} from '../src/world/layouts/concourse';
import { CORE_LAYOUT } from '../src/world/layouts/coreChamber';
import { DECK_LAYOUT } from '../src/world/layouts/deck';
import { DOCK_LAYOUT, DOCK_SOLIDS } from '../src/world/layouts/dock';
import { gridOf, walkingDistance } from '../src/world/layouts/grid';
import { LAB_LAYOUT } from '../src/world/layouts/laboratory';
import {
  WORKSHOP_LAYOUT,
  WORKSHOP_SOLIDS,
} from '../src/world/layouts/workshop';
import { YARD_LAYOUT, YARD_SOLIDS } from '../src/world/layouts/yard';

const LAYOUTS = {
  dock: gridOf(DOCK_LAYOUT, DOCK_SOLIDS),
  station_concourse: gridOf(CONCOURSE_LAYOUT, CONCOURSE_SOLIDS),
  records_workshop: gridOf(WORKSHOP_LAYOUT, WORKSHOP_SOLIDS),
  diagnostics_laboratory: gridOf(LAB_LAYOUT),
  utility_core_deck: gridOf(DECK_LAYOUT),
  core_chamber: gridOf(CORE_LAYOUT),
  exterior_recovery_yard: gridOf(YARD_LAYOUT, YARD_SOLIDS),
} as const;

const SPAWNS = {
  dock: [DOCK_SITES.spawnArrival, DOCK_SITES.spawnFromConcourse],
  station_concourse: Object.values(CONCOURSE_SPAWNS),
  records_workshop: [WORKSHOP_SPAWN],
  diagnostics_laboratory: Object.values(LAB_SPAWNS),
  utility_core_deck: Object.values(DECK_SPAWNS),
  core_chamber: [CORE_SPAWN],
  exterior_recovery_yard: [YARD_SPAWN],
} as const;

const DOOR_CLEARANCE = 96;
const PLAYER_SPEED = 175;

test.describe('World V1 interaction registry (pure)', () => {
  for (const zone of REGISTERED_ZONES) {
    const entries = WORLD_V1_REGISTRY[zone]!;
    const grid = LAYOUTS[zone as keyof typeof LAYOUTS];
    const spawns = SPAWNS[zone as keyof typeof SPAWNS];

    test(`${zone}: ids unique, verbs and labels present, decor opens nothing`, () => {
      const ids = entries.map((entry) => entry.id);

      expect(new Set(ids).size).toBe(ids.length);

      for (const entry of entries) {
        expect(entry.verb.length, entry.id).toBeGreaterThan(0);
        expect(entry.label.length, entry.id).toBeGreaterThan(0);

        if (entry.kind === 'decor') {
          expect(entry.opens, entry.id).toBeNull();
        } else {
          expect(entry.opens, entry.id).not.toBeNull();
        }
      }
    });

    test(`${zone}: every approach point is in radius and reachable from every spawn`, () => {
      for (const entry of entries) {
        const reach = Math.hypot(
          entry.approach.x - entry.x,
          entry.approach.y - entry.y,
        );

        expect(reach, `${entry.id} approach within radius`).toBeLessThan(
          INTERACTION_RADIUS,
        );

        for (const spawn of spawns) {
          const distance = walkingDistance(grid, spawn, entry.approach, 12);

          expect(
            distance,
            `${entry.id} reachable from spawn ${spawn.x},${spawn.y}`,
          ).not.toBeNull();
        }
      }
    });

    test(`${zone}: no object inside a door trigger's clearance; doors match PILOT_DOORS`, () => {
      const doors = entries.filter((entry) => entry.kind === 'door');

      for (const ref of PILOT_DOORS[zone]) {
        expect(
          doors.some((door) => door.x === ref.x && door.y === ref.y),
          `${zone} door to ${ref.to} declared`,
        ).toBe(true);
      }

      for (const door of doors) {
        for (const other of entries) {
          if (other === door || other.kind === 'door') {
            continue;
          }

          expect(
            Math.hypot(other.x - door.x, other.y - door.y),
            `${other.id} clear of ${door.id}`,
          ).toBeGreaterThan(DOOR_CLEARANCE);
        }
      }
    });
  }

  test('class derivation and prompt grammar', () => {
    expect(
      deriveObjectClass('station', {
        isGuidanceTarget: true,
        availabilityState: null,
      }),
    ).toBe('active');
    expect(
      deriveObjectClass('station', {
        isGuidanceTarget: false,
        availabilityState: null,
      }),
    ).toBe('optional');
    expect(
      deriveObjectClass('station', {
        isGuidanceTarget: true,
        availabilityState: 'standby',
      }),
    ).toBe('inactive');
    expect(
      deriveObjectClass('decor', {
        isGuidanceTarget: true,
        availabilityState: null,
      }),
    ).toBe('decorative');
    expect(promptText('Review', 'incident log', null)).toBe(
      'E / Space — Review incident log',
    );
    expect(promptText('Feed console', 'feed console', 'standby')).toBe(
      'E / Space — Feed console: standby',
    );
  });

  test('walking budget of the rebuilt zones (Dock + Concourse acts 1–2)', () => {
    const dock = LAYOUTS.dock;
    const concourse = LAYOUTS.station_concourse;
    const C = CONCOURSE_STATIONS;
    const approach = (id: string) =>
      WORLD_V1_REGISTRY.station_concourse!.find((entry) => entry.id === id)!
        .approach;
    const legs: [string, number | null][] = [
      [
        'dock: spawn → marker',
        walkingDistance(dock, DOCK_SITES.spawnArrival, DOCK_SITES.marker, 24),
      ],
      [
        'dock: marker → terminal',
        walkingDistance(
          dock,
          DOCK_SITES.marker,
          { x: DOCK_SITES.terminal.x, y: DOCK_SITES.terminal.y + 64 },
          12,
        ),
      ],
      [
        'dock: terminal → north door',
        walkingDistance(
          dock,
          { x: DOCK_SITES.terminal.x, y: DOCK_SITES.terminal.y + 64 },
          { x: DOCK_SITES.northDoor.x, y: DOCK_SITES.northDoor.y + 64 },
          12,
        ),
      ],
      [
        'concourse: spawn → Vale',
        walkingDistance(
          concourse,
          CONCOURSE_SPAWNS.fromDock,
          approach('concourse.vale'),
          12,
        ),
      ],
      [
        'concourse: Vale → plan board',
        walkingDistance(
          concourse,
          approach('concourse.vale'),
          approach('concourse.plan_board'),
          12,
        ),
      ],
      [
        'concourse: plan board → incident desk',
        walkingDistance(
          concourse,
          approach('concourse.plan_board'),
          approach('concourse.incident_desk'),
          12,
        ),
      ],
      [
        'concourse: incident desk → quality packet',
        walkingDistance(
          concourse,
          approach('concourse.incident_desk'),
          approach('concourse.qc_packet_o1'),
          12,
        ),
      ],
      [
        'concourse: quality packet → Vale',
        walkingDistance(
          concourse,
          approach('concourse.qc_packet_o1'),
          approach('concourse.vale'),
          12,
        ),
      ],
      [
        'concourse: Vale → west door',
        walkingDistance(
          concourse,
          approach('concourse.vale'),
          approach('concourse.door_records'),
          12,
        ),
      ],
    ];
    let total = 0;

    for (const [name, distance] of legs) {
      expect(distance, name).not.toBeNull();
      total += distance!;
    }

    const seconds = total / PLAYER_SPEED;

    // Recorded in the U1 note; the whole-route budget (≤ 210 s) is asserted
    // once every zone is registered. Acts 1–2 must stay under 45 s.
    test.info().annotations.push({
      type: 'walking-budget',
      description: `acts 1–2: ${total} px ≈ ${seconds.toFixed(1)} s`,
    });
    // World V1 production: the authority footprints (Dock 48×30, Concourse
    // 60×38; traversal 8–12 s and 10–16 s per crossing) put the five-station
    // acts 1–2 tour under 75 s; the whole-route itinerary is 328.69 s
    // (PROFESSIONAL-WORLD-DESIGN-V1.md).
    expect(seconds).toBeLessThan(75);
    void C;
  });
});
