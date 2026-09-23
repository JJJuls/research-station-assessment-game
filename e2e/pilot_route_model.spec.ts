/**
 * Evidence-led pilot v2 — route model (pure, no browser; Unit 1).
 *
 * Proves the hub-and-loop topology and the stage machine from the pure
 * module: every door is declared in both zones (bidirectional by
 * construction), every zone reaches every other zone, the stage sequence
 * visits the five episodes in order with the closure last, the route has
 * EXACTLY ONE purposeful return, the stage machine never reverses, the
 * beacon yields at most one target, the mission log is concise and
 * operational, and the Core cannot be considered open while any required
 * window is still pending/open.
 */
import { expect, test } from '@playwright/test';

import {
  deriveCoverage,
  isTerminal,
  PILOT_SCHEDULE,
} from '../src/pilot/coverageSchedule';
import { EVIDENCE_LEDGER } from '../src/pilot/evidenceLedger';
import {
  advancePilotStage,
  installPilotRouteLogSink,
  nextHopDoor,
  notePilotZoneEntered,
  PILOT_DOORS,
  PILOT_EPISODE_NAMES,
  PILOT_OBJECTIVES,
  PILOT_STAGES,
  PILOT_ZONE_KEYS,
  pilotBeaconTarget,
  pilotEpisode,
  pilotMapModel,
  pilotMissionLog,
  pilotStage,
  pilotStageZone,
  purposefulReturnLegs,
  registerMissionLogEntry,
  registerPilotStation,
  resetPilotRouteState,
  STAGE_EPISODE,
  stageDestinationSequence,
} from '../src/pilot/pilotRoute';

test.describe('pilot route model (pure)', () => {
  test.beforeEach(() => {
    resetPilotRouteState();
    installPilotRouteLogSink(null);
  });

  test('every door is bidirectional and every zone reaches every other zone', () => {
    for (const from of PILOT_ZONE_KEYS) {
      for (const door of PILOT_DOORS[from]) {
        const reverse = PILOT_DOORS[door.to].find((d) => d.to === from);

        expect(
          reverse,
          `${from} → ${door.to} has no return door`,
        ).toBeDefined();
      }

      for (const to of PILOT_ZONE_KEYS) {
        if (from !== to) {
          expect(
            nextHopDoor(from, to),
            `${from} cannot reach ${to}`,
          ).not.toBeNull();
        }
      }
    }

    // Hub-and-loop: the Concourse is the hub (degree 4); no zone is a trap.
    expect(PILOT_DOORS.station_concourse.length).toBe(4);
    expect(PILOT_DOORS.utility_core_deck.length).toBeGreaterThan(0);
  });

  test('stages visit episodes 1–5 in order with the closure last; exactly one purposeful return', () => {
    const episodes = PILOT_STAGES.map((stage) => STAGE_EPISODE[stage]);

    for (let index = 1; index < episodes.length; index += 1) {
      expect(episodes[index]).toBeGreaterThanOrEqual(episodes[index - 1]);
    }

    expect(new Set(episodes)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(STAGE_EPISODE.complete).toBe(6);
    expect(Object.keys(PILOT_EPISODE_NAMES)).toHaveLength(6);

    expect(stageDestinationSequence()).toEqual([
      'dock',
      'station_concourse',
      'records_workshop',
      'diagnostics_laboratory',
      'exterior_recovery_yard',
      'station_concourse',
      'records_workshop',
      'utility_core_deck',
      'core_chamber',
    ]);
    expect(purposefulReturnLegs()).toBe(1);

    // Episode 6 (closure) lives on the deck and in the Core Chamber behind
    // its gated door (Unit 6); it hosts no ledger window.
    for (const stage of PILOT_STAGES) {
      if (STAGE_EPISODE[stage] === 6 && stage !== 'complete') {
        expect(['utility_core_deck', 'core_chamber']).toContain(
          pilotStageZone(stage),
        );
      }
    }

    expect(pilotStageZone('core_sync')).toBe('core_chamber');
    // The chamber is a leaf behind the deck: one door each way, never a trap.
    expect(PILOT_DOORS.core_chamber).toHaveLength(1);
    expect(PILOT_DOORS.utility_core_deck.map((door) => door.to)).toEqual([
      'station_concourse',
      'core_chamber',
    ]);

    // Every ledger window's episode is a route episode that actually
    // occurs in the stage sequence (no orphan episode).
    for (const entry of EVIDENCE_LEDGER) {
      for (const window of entry.route.windows) {
        expect(episodes).toContain(window.episode);
      }
    }
  });

  test('objectives are single concise sentences without identifiers or evaluative words', () => {
    for (const stage of PILOT_STAGES) {
      const text = PILOT_OBJECTIVES[stage];

      expect(text.length).toBeLessThanOrEqual(110);
      expect(text).not.toMatch(/\n/);
      expect(text).not.toMatch(/proto_|\bM\d{2}\b|\bQ\d{2}\b/);
      expect(text).not.toMatch(/persist|organis|conscien|trait|score|valid/i);
    }
  });

  test('the stage machine is monotonic and flips arrival → handover_briefing on first Concourse entry', () => {
    const log: string[] = [];

    installPilotRouteLogSink((eventType) => log.push(eventType));

    expect(pilotStage()).toBe('arrival');
    expect(pilotEpisode()).toBe(1);
    expect(advancePilotStage('arrival', 1)).toBe(false);

    notePilotZoneEntered('dock', 1);
    expect(pilotStage()).toBe('arrival');
    notePilotZoneEntered('station_concourse', 2);
    expect(pilotStage()).toBe('handover_briefing');

    expect(advancePilotStage('workshop', 3)).toBe(true);
    expect(advancePilotStage('incident_handover', 4)).toBe(false);
    expect(pilotStage()).toBe('workshop');
    expect(pilotEpisode()).toBe(2);

    // Route telemetry only — never a proto_* family.
    expect(log.every((type) => type.startsWith('pilot_'))).toBe(true);
    expect(log).toContain('pilot_stage_advanced');
  });

  test('beacon: at most one target — next-hop door when away, first unfinished station or anchor when home', () => {
    notePilotZoneEntered('station_concourse', 1);
    advancePilotStage('workshop_work', 2);

    let done = false;

    registerPilotStation({
      id: 'work_order_board',
      zone: 'records_workshop',
      x: 640,
      y: 160,
      label: 'Work Order Board',
      stages: ['workshop', 'workshop_work', 'workshop_return'],
      isDone: () => false,
      order: 0,
    });
    registerPilotStation({
      id: 'filing_desk',
      zone: 'records_workshop',
      x: 96,
      y: 272,
      label: 'Incident Filing Workstation',
      stages: ['workshop_work'],
      isDone: () => done,
      order: 1,
    });

    // Away from the destination zone → the next-hop door (Concourse west;
    // World V1: derived from PILOT_DOORS, never a repeated literal).
    const west = PILOT_DOORS.station_concourse.find(
      (door) => door.to === 'records_workshop',
    )!;

    expect(pilotBeaconTarget('station_concourse')).toEqual({
      x: west.x,
      y: west.y,
      label: 'Records Workshop',
      kind: 'door',
    });
    // From the yard the next hop toward the workshop is the airlock.
    expect(pilotBeaconTarget('exterior_recovery_yard')?.kind).toBe('door');

    // Home → first unfinished guided station, then the anchor.
    expect(pilotBeaconTarget('records_workshop')?.label).toBe(
      'Incident Filing Workstation',
    );
    done = true;
    expect(pilotBeaconTarget('records_workshop')?.label).toBe(
      'Work Order Board',
    );

    advancePilotStage('complete', 3);
    expect(pilotBeaconTarget('records_workshop')).toBeNull();
  });

  test('map model tracks discovery, current and destination for all seven zones', () => {
    notePilotZoneEntered('dock', 1);
    notePilotZoneEntered('station_concourse', 2);

    const model = pilotMapModel();

    expect(PILOT_ZONE_KEYS).toHaveLength(7);
    expect(model.map((node) => node.zone)).toEqual([...PILOT_ZONE_KEYS]);
    expect(model.filter((node) => node.discovered).map((n) => n.zone)).toEqual([
      'dock',
      'station_concourse',
    ]);
    expect(model.find((node) => node.current)?.zone).toBe('station_concourse');
    expect(model.find((node) => node.destination)?.zone).toBe(
      'station_concourse',
    );
  });

  test('mission log is concise and operational; closed entries disappear', () => {
    let fulfilled = false;

    registerMissionLogEntry({
      id: 'watch',
      kind: 'obligation',
      text: () => 'Gauge check due before you leave the Concourse.',
      isClosed: () => fulfilled,
      order: 1,
    });
    registerMissionLogEntry({
      id: 'note',
      kind: 'note',
      text: () => 'Antenna alignment paused at stage 2 of 4.',
      isClosed: () => false,
      order: 2,
    });

    expect(pilotMissionLog().map((entry) => entry.id)).toEqual([
      'watch',
      'note',
    ]);

    for (const entry of pilotMissionLog()) {
      expect(entry.text.length).toBeLessThanOrEqual(90);
      expect(entry.text).not.toMatch(/proto_|\bM\d{2}\b|score|valid/i);
    }

    fulfilled = true;
    expect(pilotMissionLog().map((entry) => entry.id)).toEqual(['note']);
  });

  test('Core cannot be considered open while any scheduled window is pending or open', () => {
    const scheduled = PILOT_SCHEDULE.filter(
      (entry) => entry.opportunityIds.length > 0,
    );

    expect(scheduled.length).toBeGreaterThan(0);

    // Nothing declared → every scheduled item pending → not terminal.
    const none = deriveCoverage([]);

    expect(none.some((item) => !isTerminal(item.status))).toBe(true);

    // One window entered but unfinished → still not terminal.
    const first = scheduled[0].opportunityIds[0];
    const partial = deriveCoverage([
      {
        opportunity_id: first,
        form: null,
        entered: true,
        completed: false,
        absent: false,
        censored: false,
        technical_failure: false,
        comprehension_failure: false,
        contaminated: false,
        invalid_reason: null,
        prior_exposure: [],
        validity: 'pending',
      },
    ]);

    // Station 080 Unit 5: the first scheduled item (M01) owns two windows,
    // so the entered window reads `open` at opportunity level while the
    // item summary stays non-terminal (its other window is pending).
    const firstItem = partial.find(
      (item) => item.opportunities[0]?.opportunity_id === first,
    );

    expect(firstItem?.opportunities[0]?.status).toBe('open');
    expect(isTerminal(firstItem!.status)).toBe(false);
    expect(partial.some((item) => !isTerminal(item.status))).toBe(true);
  });
});
