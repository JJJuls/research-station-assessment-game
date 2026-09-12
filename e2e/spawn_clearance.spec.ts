/**
 * Pilot V3 Unit 5 — arrival spawn points sit outside the 72 px interaction
 * radius of the door just used (V2 finding U8-8), so a reflex SPACE on
 * arrival can never bounce the participant back through the door. Pure:
 * the spawn points come from the shared audited zone book and are compared
 * with the door coordinates the route specs drive against (PILOT).
 */
import { expect, test } from '@playwright/test';

import {
  CONCOURSE_SPAWNS,
  CORE_SPAWN,
  DECK_SPAWNS,
  WORKSHOP_SPAWN,
  YARD_SPAWN,
} from '../src/pilot/zoneSites';
import { PILOT } from './pilotHelpers';

const INTERACTION_RADIUS = 72;
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test.describe('arrival spawn clearance (pure)', () => {
  test('Records Workshop arrival is clear of the east door', () => {
    // World V2 rescue continuation: the workshop spawn lives in the
    // shared audited site book (src/pilot/zoneSites.ts).
    expect(distance(WORKSHOP_SPAWN, PILOT.workshop.eastDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Concourse arrival from the workshop is clear of the west door', () => {
    // World V2 rescue: the Concourse spawns live in the shared site book
    // (src/pilot/zoneSites.ts) instead of inline tile expressions.
    expect(
      distance(CONCOURSE_SPAWNS.fromRecords, PILOT.concourse.westDoor),
    ).toBeGreaterThan(INTERACTION_RADIUS);
  });

  test('Utility Deck arrival from the chamber is clear of the Core door', () => {
    // World V2 rebuild: the deck spawns live in the shared audited book.
    expect(distance(DECK_SPAWNS.fromCore, PILOT.deck.coreDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Recovery Yard arrival is clear of the airlock', () => {
    expect(distance(YARD_SPAWN, PILOT.yard.airlock)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Core Chamber arrival is clear of the south door', () => {
    expect(distance(CORE_SPAWN, PILOT.core.southDoor)).toBeGreaterThan(
      INTERACTION_RADIUS,
    );
  });

  test('Utility Deck arrival from the Concourse is clear of the west door', () => {
    expect(
      distance(DECK_SPAWNS.fromConcourse, PILOT.deck.westDoor),
    ).toBeGreaterThan(INTERACTION_RADIUS);
  });
});
