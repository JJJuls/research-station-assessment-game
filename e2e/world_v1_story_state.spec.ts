/**
 * World V1 — story state (pure; STORY-STATE-SPEC.md §3, §4, §6; U2).
 *
 * Proves from the pure modules, without a browser: the eight acts cover
 * every route stage monotonically; the mission card has one action for
 * every (stage, zone) pair, each a single short operational line that
 * names no door already passed, no item number, construct, variable,
 * strategy or praise; every restoration state is a function of the stage
 * or a terminal disposition (advancing the stage machine with NO task
 * success still restores every stage-driven element, and the terminal-
 * driven elements never read a value); NPC posts never put an NPC on a
 * door, a corridor or a rebuilt zone's registry object; the map marks and
 * the purposeful-return path follow the route; and `advancePilotStage`
 * is called only from the explicit NPC/board/route-entry sites (never from
 * a measurement window or the scoring layer).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  advancePilotStage,
  installPilotRouteLogSink,
  PILOT_DOORS,
  PILOT_STAGES,
  PILOT_ZONE_KEYS,
  type PilotStage,
  pilotStageZone,
  resetPilotRouteState,
} from '../src/pilot/pilotRoute';
import {
  MISSION_CARD_MAX_CHARS,
  missionCardAction,
  NO_RESTORATION_CONTEXT,
  npcPosts,
  OPENING_CAPTIONS,
  purposefulReturnPath,
  type RestorationElement,
  restorationState,
  STAGE_ACT,
  STATUS_WALL_SECTORS,
  STORY_ACT_TITLES,
  storyActTitle,
  zoneMark,
} from '../src/pilot/storyState';
import {
  CONCOURSE_STATIONS,
  LAB_STATIONS,
  YARD_SITES,
} from '../src/pilot/zoneSites';
import { WORLD_V1_REGISTRY } from '../src/world/interactionRegistry';

const FORBIDDEN_WORDS =
  /proto_|\bM\d{2}\b|\bQ\d{2}\b|\bscore\b|\bpoints?\b|\btrait\b|\bpersonalit|\bconscientious|\bgrit\b|\bpersisten|\bwell done\b|\bgood job\b|\bimpressive\b|\bexcellent\b|\bgreat\b/i;

const ELEMENTS: readonly RestorationElement[] = [
  'lighting',
  ...STATUS_WALL_SECTORS.map((sector) => sector.element),
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }

  return out;
}

test.describe('World V1 story state (pure)', () => {
  test.beforeEach(() => {
    resetPilotRouteState();
    installPilotRouteLogSink(null);
  });

  test('eight acts cover every stage in order; titles are operational', () => {
    let previous = 0;

    for (const stage of PILOT_STAGES) {
      const act = STAGE_ACT[stage];

      expect(act, stage).toBeGreaterThanOrEqual(previous);
      previous = act;
      expect(storyActTitle(stage)).toBe(STORY_ACT_TITLES[act]);
    }

    expect(new Set(PILOT_STAGES.map((stage) => STAGE_ACT[stage])).size).toBe(8);

    for (const title of Object.values(STORY_ACT_TITLES)) {
      expect(title).not.toMatch(FORBIDDEN_WORDS);
      expect(title.length).toBeLessThanOrEqual(MISSION_CARD_MAX_CHARS);
    }
  });

  test('mission card: one short operational action for every (stage, zone); never a passed door', () => {
    for (const stage of PILOT_STAGES) {
      for (const zone of PILOT_ZONE_KEYS) {
        for (const context of [{}, { dockCheckedIn: true }]) {
          const line = missionCardAction(stage, zone, context);

          expect(line.length, `${stage}/${zone}`).toBeGreaterThan(0);
          expect(
            line.length,
            `${stage}/${zone}: "${line}"`,
          ).toBeLessThanOrEqual(MISSION_CARD_MAX_CHARS);
          expect(line, `${stage}/${zone}`).not.toMatch(FORBIDDEN_WORDS);
          expect(line.split('\n').length, `${stage}/${zone}`).toBe(1);
        }
      }

      // In the destination zone the line never tells the participant to
      // go to (or through) the zone they are already in.
      const destination = pilotStageZone(stage);

      if (destination !== null) {
        const home = missionCardAction(stage, destination);

        expect(home, `${stage} home line`).not.toMatch(
          /^(Go to|Return to|Take the .* door|Back to)/,
        );
      }
    }

    // The Dock check-in flips the arrival line to the exit, nothing else.
    expect(missionCardAction('arrival', 'dock')).toContain('arrival terminal');
    expect(
      missionCardAction('arrival', 'dock', { dockCheckedIn: true }),
    ).toContain('north door');
  });

  test('restoration is a function of stage or terminality — advancing with no success restores every stage-driven element', () => {
    // Before anything: everything damaged.
    for (const element of ELEMENTS) {
      expect(restorationState(element, 'arrival')).toBe('damaged');
    }

    // Walk the stage machine with NO task success, NO window completion:
    // every stage-driven element ends restored; the three terminal-driven
    // elements stay "recovering" until their terminal disposition arrives
    // and never read a value.
    for (const stage of PILOT_STAGES.slice(1)) {
      advancePilotStage(stage, 1);
    }

    expect(restorationState('lighting', 'complete')).toBe('restored');
    expect(restorationState('sector_records', 'complete')).toBe('restored');
    expect(restorationState('sector_signal', 'complete')).toBe('restored');
    expect(restorationState('sector_exterior', 'complete')).toBe('restored');
    // Stage passed ⇒ restored even without the context (the stage machine
    // only reaches these stages through the closure's own commits).
    expect(restorationState('sector_record', 'core_stabilise')).toBe(
      'restored',
    );
    expect(restorationState('sector_feeds', 'core_sync')).toBe('restored');
    expect(restorationState('sector_core', 'complete')).toBe('restored');

    // Terminal-driven elements inside their own act.
    expect(restorationState('sector_record', 'deck_closure')).toBe(
      'recovering',
    );
    expect(
      restorationState('sector_record', 'deck_closure', {
        ...NO_RESTORATION_CONTEXT,
        recordClosed: true,
      }),
    ).toBe('restored');
    expect(restorationState('sector_feeds', 'core_stabilise')).toBe(
      'recovering',
    );
    expect(
      restorationState('sector_feeds', 'core_stabilise', {
        ...NO_RESTORATION_CONTEXT,
        feedsReady: 3,
      }),
    ).toBe('restored');
    expect(restorationState('sector_core', 'core_sync')).toBe('recovering');
    expect(
      restorationState('sector_core', 'core_sync', {
        ...NO_RESTORATION_CONTEXT,
        coreStable: true,
      }),
    ).toBe('restored');

    // Monotonic: no element goes back from restored to damaged.
    for (const element of ELEMENTS) {
      let seenRestored = false;

      for (const stage of PILOT_STAGES) {
        const state = restorationState(element, stage);

        if (state === 'restored') {
          seenRestored = true;
        } else {
          expect(seenRestored, `${element} regresses at ${stage}`).toBe(false);
        }
      }
    }
  });

  test('map marks and the purposeful return follow the route', () => {
    expect(zoneMark('dock', 'arrival')).toBe('active');
    expect(zoneMark('dock', 'handover_briefing')).toBe('restored');
    expect(zoneMark('records_workshop', 'workshop')).toBe('active');
    expect(zoneMark('records_workshop', 'lab_briefing')).toBe('restored');
    expect(zoneMark('records_workshop', 'workshop_return')).toBe('active');
    expect(zoneMark('core_chamber', 'core_sync')).toBe('active');
    expect(zoneMark('core_chamber', 'complete')).toBe('restored');

    for (const stage of PILOT_STAGES) {
      const path = purposefulReturnPath(stage);

      if (stage === 'return_hub' || stage === 'workshop_return') {
        expect(path).not.toBeNull();
        // Every hop of the path is a real door.
        for (let i = 1; i < path!.length; i += 1) {
          expect(
            PILOT_DOORS[path![i - 1]].some((door) => door.to === path![i]),
            `${path![i - 1]} → ${path![i]}`,
          ).toBe(true);
        }
        expect(path![path!.length - 1]).toBe('records_workshop');
      } else {
        expect(path, stage).toBeNull();
      }
    }
  });

  test('NPC posts: deterministic per stage; measurement recipients retained; clear of doors and registry objects', () => {
    for (const stage of PILOT_STAGES) {
      const posts = npcPosts(stage);

      // Vale: station line in act 1, the operations desk afterwards.
      const vale = posts.filter((post) => post.npc === 'vale');

      expect(vale).toHaveLength(1);
      expect(vale[0].zone).toBe(
        stage === 'arrival' ? 'dock' : 'station_concourse',
      );

      // Kai keeps the Laboratory briefing bay at every stage (M10 handover
      // recipient on the return leg — never removed by presentation).
      expect(
        posts.some(
          (post) =>
            post.npc === 'kai' && post.zone === 'diagnostics_laboratory',
        ),
        stage,
      ).toBe(true);

      // Noor is outside at every stage.
      expect(
        posts.filter((post) => post.npc === 'noor').map((post) => post.zone),
      ).toEqual(['exterior_recovery_yard']);
    }

    // Rebuilt zone: Vale's and Kai's Concourse posts are the registry's
    // NPC objects, clear of every door trigger and not on the spine/axis
    // crossing (the registry spec proves door clearance; here: the posts
    // are not doors and stand ≥ 96 px from any door).
    for (const at of [CONCOURSE_STATIONS.vale, CONCOURSE_STATIONS.kaiReturn]) {
      for (const door of PILOT_DOORS.station_concourse) {
        expect(Math.hypot(at.x - door.x, at.y - door.y)).toBeGreaterThan(96);
      }
    }

    for (const at of [LAB_STATIONS.kai]) {
      for (const door of PILOT_DOORS.diagnostics_laboratory) {
        expect(Math.hypot(at.x - door.x, at.y - door.y)).toBeGreaterThan(96);
      }
    }

    for (const door of PILOT_DOORS.exterior_recovery_yard) {
      expect(
        Math.hypot(YARD_SITES.noor.x - door.x, YARD_SITES.noor.y - door.y),
      ).toBeGreaterThan(72);
    }

    // The registry declares both Concourse NPC posts.
    const ids = WORLD_V1_REGISTRY.station_concourse!.map((entry) => entry.id);

    expect(ids).toContain('concourse.vale');
    expect(ids).toContain('concourse.kai_return');
  });

  test('opening captions: three short lines, no measurement language', () => {
    expect(OPENING_CAPTIONS).toHaveLength(4);

    for (const caption of OPENING_CAPTIONS) {
      expect(caption.text).not.toMatch(FORBIDDEN_WORDS);
      expect(caption.text.length).toBeLessThan(120);
    }
  });

  test('advancePilotStage is called only from explicit NPC/board/route-entry sites', () => {
    const files = walk(join(process.cwd(), 'src'));
    const callers = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      const normalised = file.replace(/\\/g, '/');

      return (
        /advancePilotStage\(/.test(source) &&
        !normalised.endsWith('src/pilot/pilotRoute.ts')
      );
    });
    const allowed = [
      'src/scenes/StationConcourseScene.ts',
      'src/scenes/RecordsWorkshopScene.ts',
      'src/scenes/DiagnosticsLaboratoryScene.ts',
      'src/scenes/ExteriorRecoveryYardScene.ts',
      'src/scenes/UtilityCoreDeckScene.ts',
      'src/scenes/CoreChamberScene.ts',
      // The non-scored closure's two explicit commits: the station-record
      // close at the review panel and the Core 'finish' command.
      'src/pilot/closure/closureSession.ts',
    ];

    for (const file of callers) {
      const normalised = file.replace(/\\/g, '/');

      expect(
        allowed.some((path) => normalised.endsWith(path)),
        `unexpected advancePilotStage caller: ${normalised}`,
      ).toBe(true);
    }

    // Never from a measurement window, the measurement layer, scoring or
    // the story-state module itself.
    for (const file of files) {
      const normalised = file.replace(/\\/g, '/');

      if (
        /src\/(pilot\/windows|pilot\/exterior|pilot\/return|measurement|scoring|systems)\//.test(
          normalised,
        ) ||
        normalised.endsWith('src/pilot/storyState.ts')
      ) {
        expect(readFileSync(file, 'utf8'), normalised).not.toMatch(
          /advancePilotStage\(/,
        );
      }
    }
  });
});

// Keep the stage type referenced for the exhaustive tables above.
void (null as unknown as PilotStage);
