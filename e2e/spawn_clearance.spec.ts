/**
 * Pilot V3 Unit 5 — arrival spawn points sit outside the 72 px interaction
 * radius of the door just used (V2 finding U8-8), so a reflex SPACE on
 * arrival can never bounce the participant back through the door. Pure:
 * the spawn expressions are read from the scene sources and compared with
 * the door coordinates the route specs drive against (PILOT).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { PILOT } from './pilotHelpers';

const INTERACTION_RADIUS = 72;
const TILE = 32;

function spawnFrom(file: string, marker: string): { x: number; y: number } {
  const source = readFileSync(path.resolve(file), 'utf8');
  const start = source.indexOf(marker);

  expect(start, `${marker} in ${file}`).toBeGreaterThanOrEqual(0);

  const match = /return \{ x: ([\d.]+) \* TILE, y: ([\d.]+) \* TILE \}/.exec(
    source.slice(start),
  );

  expect(match, `spawn expression after ${marker}`).not.toBeNull();

  return { x: Number(match![1]) * TILE, y: Number(match![2]) * TILE };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test.describe('arrival spawn clearance (pure)', () => {
  test('Records Workshop arrival is clear of the east door', () => {
    const spawn = spawnFrom(
      'src/scenes/RecordsWorkshopScene.ts',
      'protected getSpawn()',
    );

    expect(distance(spawn, PILOT.workshop.eastDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Concourse arrival from the workshop is clear of the west door', () => {
    const spawn = spawnFrom(
      'src/scenes/StationConcourseScene.ts',
      "case 'records_workshop':",
    );

    expect(distance(spawn, PILOT.concourse.westDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Utility Deck arrival from the chamber is clear of the Core door', () => {
    const spawn = spawnFrom(
      'src/scenes/UtilityCoreDeckScene.ts',
      "case 'core_chamber':",
    );

    expect(distance(spawn, PILOT.deck.coreDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('SPACE and E are both consumed each frame (one interaction per press pair)', () => {
    const source = readFileSync(path.resolve('src/world/RoomScene.ts'), 'utf8');
    const body = source.slice(source.indexOf('private interactJustPressed()'));

    expect(body).toMatch(/const space = Phaser\.Input\.Keyboard\.JustDown/);
    expect(body).toMatch(/const keyE = Phaser\.Input\.Keyboard\.JustDown/);
    expect(body).not.toMatch(
      /JustDown\([^)]*\)\s*\|\|\s*Phaser\.Input\.Keyboard\.JustDown/,
    );
  });
});
