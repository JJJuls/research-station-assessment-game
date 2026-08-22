/**
 * Pilot zone work-site positions (professional pilot route, Unit 2).
 *
 * Shared between the zone scenes and the units that activate the stations
 * (Unit 3 records, Unit 4 laboratory, Unit 5 exterior, Unit 7 deck) so
 * positions are declared exactly once. Pixel coordinates on 25×19 maps.
 */
const TILE = 32;

/** Records & Logistics stations (Concourse west area) + Vale. */
export const CONCOURSE_STATIONS = {
  filingDesk: { x: 3 * TILE, y: 8.5 * TILE },
  pressA: { x: 6 * TILE, y: 8.5 * TILE },
  pressB: { x: 9 * TILE, y: 8.5 * TILE },
  storageLocker: { x: 3 * TILE, y: 14 * TILE },
  assemblyBench: { x: 9 * TILE, y: 14 * TILE },
  supplyA: { x: 3 * TILE, y: 3 * TILE },
  supplyB: { x: 5.5 * TILE, y: 3 * TILE },
  supplyC: { x: 8 * TILE, y: 3 * TILE },
  vale: { x: 15.5 * TILE, y: 8.5 * TILE },
} as const;

/** Laboratory workstations + Kai. */
export const LAB_STATIONS = {
  orientation: { x: 3.5 * TILE, y: 5.5 * TILE },
  decoder1: { x: 3.5 * TILE, y: 8 * TILE },
  decoder2: { x: 3.5 * TILE, y: 10.5 * TILE },
  decoder3: { x: 3.5 * TILE, y: 13 * TILE },
  decoder4: { x: 7 * TILE, y: 13 * TILE },
  lattice: { x: 21 * TILE, y: 7 * TILE },
  diagnosis: { x: 21 * TILE, y: 12 * TILE },
  kai: { x: 14 * TILE, y: 9.5 * TILE },
} as const;

/** Exterior yard work sites + Noor. */
export const YARD_SITES = {
  noor: { x: 9.4 * TILE, y: 13.4 * TILE },
  supplyCrate: { x: 19 * TILE, y: 13.75 * TILE },
  relayHousing: { x: 5 * TILE, y: 14.7 * TILE },
  pumpPrime: { x: 14 * TILE, y: 3.4 * TILE },
  pumpBreaker: { x: 15.5 * TILE, y: 3.4 * TILE },
  magnetRig: { x: 20.5 * TILE, y: 3.4 * TILE },
  magnetTray: { x: 22 * TILE, y: 4.7 * TILE },
  verificationPost: { x: 7.5 * TILE, y: 9.4 * TILE },
  relayMast: { x: 12 * TILE, y: 2 * TILE },
} as const;

/** Utility & Core Deck sites. */
export const DECK_SITES = {
  coreConsole: { x: 12.5 * TILE, y: 4.2 * TILE },
  systemsBoard: { x: 18 * TILE, y: 9.5 * TILE },
} as const;
