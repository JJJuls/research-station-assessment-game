/**
 * Story state (World V1 — docs/game/world-v1/STORY-STATE-SPEC.md; U2).
 *
 * PURE module (no Phaser, no import.meta): the narrative wrapper over the
 * UNCHANGED route stage machine in ./pilotRoute — eight acts, the mission
 * card's act title and one next action per (stage, zone), the restoration
 * states of the station's visible systems, the NPC posts per act, the
 * station map's sector marks and the purposeful-return path.
 *
 * Scientific boundary: every function here is a function of the route
 * stage (navigation state) or of a TERMINAL DISPOSITION passed in by the
 * caller (record closed, feed up, Core stable) — never of a task outcome
 * value, a score or a persistence measure. Nothing here gates a door or a
 * stage; advancement stays with the explicit NPC/board beats. Lines are
 * operational: no item number, construct, variable, strategy or praise.
 */
import type { PilotStage, PilotZoneKey } from './pilotRoute';
import { PILOT_STAGES, pilotStageZone } from './pilotRoute';

// ——— Acts ————————————————————————————————————————————————————————————————

export type StoryAct = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const STORY_ACT_TITLES: Record<StoryAct, string> = {
  1: 'Arrival',
  2: 'Triage',
  3: 'Records and preparation',
  4: 'Signal analysis',
  5: 'Exterior recovery',
  6: 'Return and revision',
  7: 'Utility restoration',
  8: 'Core closure and handover',
};

/** Which act each (unchanged) route stage belongs to. */
export const STAGE_ACT: Record<PilotStage, StoryAct> = {
  arrival: 1,
  handover_briefing: 2,
  incident_handover: 2,
  workshop: 3,
  workshop_work: 3,
  lab_briefing: 4,
  lab_work: 4,
  exterior_briefing: 5,
  exterior_work: 5,
  return_hub: 6,
  workshop_return: 6,
  deck_closure: 7,
  core_stabilise: 7,
  core_sync: 8,
  complete: 8,
};

export function storyAct(stage: PilotStage): StoryAct {
  return STAGE_ACT[stage];
}

export function storyActTitle(stage: PilotStage): string {
  return STORY_ACT_TITLES[STAGE_ACT[stage]];
}

// ——— Mission card ————————————————————————————————————————————————————————

/**
 * The mission card is two short lines: the act title and ONE next action.
 * Every action line fits one line of the card (13 px monospace in a 360
 * design-px card) — asserted by the pure spec.
 */
export const MISSION_CARD_MAX_CHARS = 44;

export interface MissionCardContext {
  /** Dock only: the arrival check-in has been logged (either path). */
  dockCheckedIn?: boolean;
}

const stageIndex = (stage: PilotStage) => PILOT_STAGES.indexOf(stage);

const atOrAfter = (stage: PilotStage, threshold: PilotStage) =>
  stageIndex(stage) >= stageIndex(threshold);

/**
 * One next action per (stage, zone). The line names the action in the
 * destination zone, and the door to take from any other zone — never a
 * door already passed. Exhaustive over PILOT_STAGES × PILOT_ZONE_KEYS.
 */
export function missionCardAction(
  stage: PilotStage,
  zone: PilotZoneKey,
  context: MissionCardContext = {},
): string {
  const destination = pilotStageZone(stage);
  const home = destination === zone;

  switch (stage) {
    case 'arrival':
      if (zone === 'dock') {
        return context.dockCheckedIn === true
          ? 'Take the north door into the Concourse.'
          : 'Check in at the arrival terminal.';
      }

      return 'Return to the Dock.';
    case 'handover_briefing':
      if (home) {
        return 'Report to Vale at the operations desk.';
      }

      return zone === 'dock'
        ? 'Take the north door into the Concourse.'
        : 'Return to the Concourse.';
    case 'incident_handover':
      return home
        ? 'Work the storm packet, then see Vale.'
        : 'Return to the Concourse.';
    case 'workshop':
      if (home) {
        return 'Take the work orders from the board.';
      }

      return zone === 'station_concourse'
        ? 'Records Workshop — west door.'
        : 'Go to the Records Workshop.';
    case 'workshop_work':
      if (home) {
        return 'Work the orders, then sign the board.';
      }

      return zone === 'station_concourse'
        ? 'Records Workshop — west door.'
        : 'Return to the Records Workshop.';
    case 'lab_briefing':
      if (home) {
        return 'Report to Kai in the briefing bay.';
      }

      if (zone === 'station_concourse') {
        return 'Diagnostics Laboratory — north door.';
      }

      return zone === 'records_workshop'
        ? 'Back to the Concourse — east door.'
        : 'Go to the Diagnostics Laboratory.';
    case 'lab_work':
      if (home) {
        return 'Work the signal case, then see Kai.';
      }

      return zone === 'station_concourse'
        ? 'Diagnostics Laboratory — north door.'
        : 'Return to the Laboratory.';
    case 'exterior_briefing':
      if (home) {
        return 'Report to Noor on the airlock apron.';
      }

      if (zone === 'diagnostics_laboratory') {
        return 'Take the north airlock to the Yard.';
      }

      return zone === 'station_concourse'
        ? 'Recovery Yard — north door, then airlock.'
        : 'Go to the Recovery Yard.';
    case 'exterior_work':
      if (home) {
        // The Yard narrows this to the current site line (exterior model).
        return "Work Noor's recovery jobs, then see Noor.";
      }

      return zone === 'diagnostics_laboratory'
        ? 'Return to the Yard — north airlock.'
        : 'Return to the Recovery Yard.';
    case 'return_hub':
      if (home) {
        return 'Check in with Vale.';
      }

      if (zone === 'exterior_recovery_yard') {
        return 'Back inside — airlock, then the Concourse.';
      }

      return zone === 'diagnostics_laboratory'
        ? 'Back to the Concourse — south door.'
        : 'Return to the Concourse.';
    case 'workshop_return':
      if (home) {
        return 'Reconcile results, then sign the board.';
      }

      return zone === 'station_concourse'
        ? 'Records Workshop — west door.'
        : 'Go to the Records Workshop.';
    case 'deck_closure':
      if (home) {
        return 'Close the record at the Shift Review Panel.';
      }

      if (zone === 'station_concourse') {
        return 'Utility Deck — east door.';
      }

      return zone === 'records_workshop'
        ? 'Back to the Concourse — east door.'
        : 'Go to the Utility Deck.';
    case 'core_stabilise':
      if (home) {
        return 'Bring up coolant, calibration, distribution.';
      }

      return zone === 'station_concourse'
        ? 'Utility Deck — east door.'
        : 'Return to the Utility Deck.';
    case 'core_sync':
      if (home) {
        return 'Open the Core review, then confirm.';
      }

      if (zone === 'utility_core_deck') {
        return 'Core Chamber — north door.';
      }

      return zone === 'station_concourse'
        ? 'Utility Deck — east door.'
        : 'Go to the Core Chamber.';
    case 'complete':
      return 'Shift complete — the station is stable.';
  }
}

// ——— Restoration ————————————————————————————————————————————————————————

export type RestorationState = 'damaged' | 'recovering' | 'restored';

/** Visible station systems whose state the environment reflects. */
export type RestorationElement =
  | 'lighting'
  | 'sector_records'
  | 'sector_signal'
  | 'sector_exterior'
  | 'sector_record'
  | 'sector_feeds'
  | 'sector_core';

/** Station-status wall sectors, left → right (labels are on the panel). */
export const STATUS_WALL_SECTORS: readonly {
  element: RestorationElement;
  label: string;
}[] = [
  { element: 'sector_records', label: 'REC' },
  { element: 'sector_signal', label: 'SIG' },
  { element: 'sector_exterior', label: 'EXT' },
  { element: 'sector_record', label: 'LOG' },
  { element: 'sector_feeds', label: 'FEED' },
  { element: 'sector_core', label: 'CORE' },
];

/**
 * Terminal dispositions the caller reads from the closure session — never
 * a value, never a score: the record is closed or not; a feed is up or
 * not; the Core is stable or not.
 */
export interface RestorationContext {
  recordClosed: boolean;
  feedsReady: number;
  coreStable: boolean;
}

export const NO_RESTORATION_CONTEXT: RestorationContext = {
  recordClosed: false,
  feedsReady: 0,
  coreStable: false,
};

/**
 * STORY-STATE-SPEC.md §4: each element is damaged until its act begins,
 * "under recovery" while its act is live, and restored once the act's
 * stage has passed (or its terminal disposition is reached). A function of
 * stage and terminality only.
 */
export function restorationState(
  element: RestorationElement,
  stage: PilotStage,
  context: RestorationContext = NO_RESTORATION_CONTEXT,
): RestorationState {
  const window = (
    from: PilotStage,
    until: PilotStage,
    terminal = false,
  ): RestorationState => {
    if (!atOrAfter(stage, from)) {
      return 'damaged';
    }

    if (atOrAfter(stage, until) || terminal) {
      return 'restored';
    }

    return 'recovering';
  };

  switch (element) {
    case 'lighting':
      return window('handover_briefing', 'workshop');
    case 'sector_records':
      return window('workshop_work', 'lab_briefing');
    case 'sector_signal':
      return window('lab_work', 'exterior_briefing');
    case 'sector_exterior':
      return window('exterior_work', 'return_hub');
    case 'sector_record':
      return window('deck_closure', 'core_stabilise', context.recordClosed);
    case 'sector_feeds':
      return window('core_stabilise', 'core_sync', context.feedsReady >= 3);
    case 'sector_core':
      return window('core_sync', 'complete', context.coreStable);
  }
}

// ——— Map marks and the purposeful return —————————————————————————————————

export type ZoneMark = 'pending' | 'active' | 'restored';

/** The stage after which a zone's act counts as passed (map "restored"). */
const ZONE_RESTORED_FROM: Record<PilotZoneKey, PilotStage> = {
  dock: 'handover_briefing',
  station_concourse: 'workshop',
  records_workshop: 'lab_briefing',
  diagnostics_laboratory: 'exterior_briefing',
  exterior_recovery_yard: 'return_hub',
  utility_core_deck: 'core_sync',
  core_chamber: 'complete',
};

/** Station-map sector mark: the current destination, a passed act, or not yet. */
export function zoneMark(zone: PilotZoneKey, stage: PilotStage): ZoneMark {
  if (pilotStageZone(stage) === zone) {
    return 'active';
  }

  return atOrAfter(stage, ZONE_RESTORED_FROM[zone]) ? 'restored' : 'pending';
}

/**
 * The ONE purposeful return, drawn on the map while it is live: from the
 * Yard back through the Laboratory to the Concourse, then the Records
 * Workshop (STORY-STATE-SPEC.md act 6). Null outside the return stages.
 */
export function purposefulReturnPath(stage: PilotStage): PilotZoneKey[] | null {
  switch (stage) {
    case 'return_hub':
      return [
        'exterior_recovery_yard',
        'diagnostics_laboratory',
        'station_concourse',
        'records_workshop',
      ];
    case 'workshop_return':
      return ['station_concourse', 'records_workshop'];
    default:
      return null;
  }
}

// ——— NPC posts ———————————————————————————————————————————————————————————

export type StoryNpc = 'vale' | 'kai' | 'noor';

export interface NpcPost {
  npc: StoryNpc;
  zone: PilotZoneKey;
  /** Stable post id (the zone places the actor at its declared site). */
  post:
    | 'station_line'
    | 'ops_desk'
    | 'ops_desk_handover'
    | 'briefing_bay'
    | 'core_console'
    | 'airlock_apron';
}

/**
 * Where each NPC works during a stage (STORY-STATE-SPEC.md §2). An NPC
 * changes post only at a stage transition; a post that hosts a
 * measurement opportunity (Kai as the M10 handover recipient at the
 * Laboratory briefing bay and beside the operations desk) is retained
 * wherever the ledger authorises the handover — presentation never removes
 * a recipient. Vale in act 1 speaks over the station line (no actor).
 */
export function npcPosts(stage: PilotStage): NpcPost[] {
  const posts: NpcPost[] = [];

  if (stage === 'arrival') {
    posts.push({ npc: 'vale', zone: 'dock', post: 'station_line' });
  } else {
    posts.push({ npc: 'vale', zone: 'station_concourse', post: 'ops_desk' });
  }

  posts.push({
    npc: 'kai',
    zone: 'diagnostics_laboratory',
    post: 'briefing_bay',
  });

  if (atOrAfter(stage, 'return_hub')) {
    posts.push({
      npc: 'kai',
      zone: 'station_concourse',
      post: 'ops_desk_handover',
    });
  }

  if (atOrAfter(stage, 'core_sync')) {
    posts.push({ npc: 'kai', zone: 'core_chamber', post: 'core_console' });
  }

  posts.push({
    npc: 'noor',
    zone: 'exterior_recovery_yard',
    post: 'airlock_apron',
  });

  return posts;
}

// ——— Opening captions (≤ 20 s) ———————————————————————————————————————————

export const OPENING_CAPTIONS: readonly string[] = [
  'Station 080 — relief flight, the morning after the storm.',
  'Records disordered. An unknown surface signal. Mast 04 down. Feeds unstable.',
  'You are the relief operations specialist. Document, diagnose, stabilise — before the next comms handover.',
];
