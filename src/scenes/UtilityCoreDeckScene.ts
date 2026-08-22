/**
 * Utility & Core Deck — pilot zone 4 (professional pilot route).
 *
 * Final operational consequences, the completeness review and the Final
 * Core. West door → Concourse (the participant is never trapped: the door
 * stays open until the explicit final confirmation). No measurement window
 * lives here (scientific review BLOCK-2.3). Unit 2 builds topology and
 * guidance; Unit 7 activates the Core console (review, synchronise,
 * completion screen, Qualtrics return).
 */
import { key } from '../constants';
import { registerPilotStation } from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { DECK_SITES } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

export class UtilityCoreDeckScene extends PilotZoneScene {
  protected readonly roomId = 'utility_core_deck';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'utility_core_deck' as const;

  constructor() {
    super(key.scene.utilityCoreDeck);
  }

  protected getLayout(): RoomLayout {
    // 25×19 deck: Core Chamber alcove (rows 2-4, cols 10-14) with funnel
    // shoulders, the Concourse doorway on the WEST wall (rows 8-9).
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
        '-.......................#',
        '-.......................#',
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
    return { x: 5 * TILE, y: 8.5 * TILE };
  }

  protected populateRoom(): void {
    this.addPilotDoor({ to: 'station_concourse', spawn: 'utility_core_deck' });

    const core = DECK_SITES.coreConsole;

    this.addStation({
      interactionKey: 'pilotCoreConsole',
      label: 'Core Synchronisation Console',
      texture: 'proc-core-interface',
      x: core.x,
      y: core.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotCoreConsole', 'pilot_core_console_opened', {
          metadata: { zone: this.zoneKey },
        });
        this.showFeedbackMessage(
          'Core Synchronisation Console — not yet connected in this build.',
        );
        return false;
      },
    });
    registerPilotStation({
      id: 'core_console',
      zone: 'utility_core_deck',
      x: core.x,
      y: core.y,
      label: 'Core Synchronisation Console',
      stages: ['deck_review'],
      isDone: () => false,
      order: 0,
    });

    this.addDecor(core.x, 1.4 * TILE, 'proc-core-column');
    this.signage(core.x, 5.6 * TILE, 'CORE CHAMBER');
    this.addDecor(core.x, 3.75 * TILE, 'proc-light-pool');
    this.addDecor(10.5 * TILE, 5.25 * TILE, 'proc-light-pool');
    this.addDecor(14.5 * TILE, 5.25 * TILE, 'proc-light-pool');

    // Station systems board (visible consequences; Unit 7 reflects state).
    this.addDecor(
      DECK_SITES.systemsBoard.x,
      DECK_SITES.systemsBoard.y,
      'proc-board-workorders',
    );
    this.signage(
      DECK_SITES.systemsBoard.x,
      DECK_SITES.systemsBoard.y - 44,
      'STATION SYSTEMS',
    );

    // Dressing.
    this.addDecor(6 * TILE, 13 * TILE, 'proc-rig-intake');
    this.addDecor(19 * TILE, 13.5 * TILE, 'proc-cabinet-calibration');
    this.addDecor(12 * TILE, 13 * TILE, 'proc-bench-prep');
    this.addDecor(12 * TILE, 9 * TILE, 'proc-light-pool');
    this.addDecor(8 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.addDecor(17 * TILE, 16 * TILE + 10, 'proc-wall-pipes');
    this.signage(6 * TILE, 11.8 * TILE, 'COOLANT INTAKE');
    this.signage(19 * TILE, 12.2 * TILE, 'CALIBRATION');
    this.signage(2.6 * TILE, 7.2 * TILE, '◀  CONCOURSE');
  }

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    void interactionKey;

    return [];
  }
}
