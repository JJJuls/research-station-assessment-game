/**
 * Utility & Core Deck — pilot zone 4 (professional pilot route).
 *
 * The completeness review and the Final Core (Unit 7). No measurement
 * window lives here (scientific review BLOCK-2.3); the console is pure
 * route infrastructure:
 *
 * - REVIEW: a participant-safe operational summary (counts + the labels
 *   of never-entered reviewable stations only — no item ids, no
 *   validity words, no scores, no evaluative language).
 * - EXPLICIT RETURN: the Concourse door stays open and the console
 *   itself offers "Return to the station" before AND during the
 *   confirmation step — synchronising is never sprung on the
 *   participant and completeness never gates it (fail-forward).
 * - SYNCHRONISE: finalises the yard's ambient windows (departure
 *   codes), calls `closePilotCoverageAtFinalCore()` (censored /
 *   participant_absent / no_opportunity — terminal dispositions, never
 *   success), advances the route to `complete`, and shows a neutral
 *   completion screen.
 * - QUALTRICS RETURN: only when a `return_url` launch parameter is
 *   legitimately configured (`QualtricsBridge.buildReturnUrl` returns
 *   non-null) does the page navigate; otherwise the completion screen
 *   simply states the session is complete. Automated tests perform no
 *   external write (test navigation targets the same origin;
 *   `submitSessionExport` refuses outside launch_mode=test).
 */
import Phaser from 'phaser';

import { key } from '../constants';
import { beginManualWorldAction } from '../gameplay/actions';
import { markOpportunityInvalid } from '../measurement/validity';
import {
  closePilotCoverageAtFinalCore,
  pilotCompletionSummary,
  pilotFinalCoreClosed,
  refreshPilotCoverageProbe,
} from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import {
  finalizeYardAmbientWindows,
  YARD_M22_OPPORTUNITY_ID,
  YARD_M25_OPPORTUNITY_ID,
  yardM22WindowOpen,
  yardM25WindowOpen,
} from '../pilot/yardJobs';
import { DECK_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

/** Delay before the (configured-only) survey return navigation. */
const RETURN_NAVIGATION_DELAY_MS = 2400;

declare global {
  interface Window {
    /** DEV-only, read-only completion probe (never read back). */
    __pilotCompletionProbe?: {
      confirming: boolean;
      closed: boolean;
      return_url_configured: boolean;
      navigate_scheduled: boolean;
      closure_counts: {
        censored: number;
        absent: number;
        no_opportunity: number;
        errors: number;
      } | null;
      summary: {
        scheduled: number;
        closed: number;
        open: number;
      } | null;
    } | null;
  }
}

export class UtilityCoreDeckScene extends PilotZoneScene {
  protected readonly roomId = 'utility_core_deck';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'utility_core_deck' as const;

  private confirming = false;
  private boardStatus?: Phaser.GameObjects.Text;

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
    // Fresh confirmation state per entry (gameplay review round 2).
    this.confirming = false;
    this.addPilotDoor({ to: 'station_concourse', spawn: 'utility_core_deck' });

    const core = DECK_SITES.coreConsole;

    this.addStation({
      interactionKey: 'pilotCoreConsole',
      label: 'Core Synchronisation Console',
      texture: 'proc-core-interface',
      x: core.x,
      y: core.y,
      onPromptOpened: () => {
        const summary = pilotCompletionSummary();

        this.logScenarioEvent('pilotCoreConsole', 'pilot_core_console_opened', {
          metadata: {
            zone: this.zoneKey,
            confirming: this.confirming,
            final_core_closed: pilotFinalCoreClosed(),
            scheduled: summary.scheduled,
            closed: summary.closed,
            open: summary.open,
          },
        });
        this.refreshCompletionProbe();

        return true;
      },
    });
    registerPilotStation({
      id: 'core_console',
      zone: 'utility_core_deck',
      x: core.x,
      y: core.y,
      label: 'Core Synchronisation Console',
      stages: ['deck_review'],
      isDone: () => pilotFinalCoreClosed(),
      order: 0,
    });

    this.addDecor(core.x, 1.4 * TILE, 'proc-core-column');
    this.signage(core.x, 5.6 * TILE, 'CORE CHAMBER');
    this.addDecor(core.x, 3.75 * TILE, 'proc-light-pool');
    this.addDecor(10.5 * TILE, 5.25 * TILE, 'proc-light-pool');
    this.addDecor(14.5 * TILE, 5.25 * TILE, 'proc-light-pool');

    // Station systems board — reflects the record state (labels only).
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
    this.boardStatus = this.add
      .text(DECK_SITES.systemsBoard.x, DECK_SITES.systemsBoard.y + 40, '', {
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);
    this.refreshBoardStatus();

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

    this.refreshCompletionProbe();
  }

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private refreshBoardStatus(): void {
    const summary = pilotCompletionSummary();

    this.boardStatus?.setText(
      pilotFinalCoreClosed()
        ? 'STATION RECORD: CLOSED'
        : `STATION RECORD: OPEN\n${summary.closed}/${summary.scheduled} tasks closed`,
    );
  }

  // ————————————————————————————————— console prompt ——

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey !== 'pilotCoreConsole') {
      return undefined;
    }

    if (pilotFinalCoreClosed()) {
      return 'Core synchronised. The station record is closed for this shift.';
    }

    if (this.confirming) {
      return (
        'CONFIRM SYNCHRONISATION\n' +
        'Synchronising closes the station record exactly as it stands. ' +
        'Anything unfinished is simply recorded as unfinished, and the ' +
        'record cannot be reopened this shift.\n' +
        'You can still return to the station first.'
      );
    }

    const summary = pilotCompletionSummary();
    const lines = [
      'Station record — end-of-shift review.',
      `Scheduled station tasks: ${summary.scheduled}. Closed: ${summary.closed}. Still open: ${summary.open}.`,
    ];

    if (summary.neverEnteredLabels.length > 0) {
      const shown = summary.neverEnteredLabels.slice(0, 3);
      const more = summary.neverEnteredLabels.length - shown.length;

      lines.push(
        `Not yet visited: ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}.`,
      );
    }

    lines.push(
      'Synchronising the core ends the shift and closes the record as it stands. The Concourse door stays open until you confirm.',
    );

    return lines.join('\n');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'pilotCoreConsole') {
      return [];
    }

    if (pilotFinalCoreClosed()) {
      return [
        {
          label: 'Step away',
          feedback: '',
          getEventTypes: () => [],
        },
      ];
    }

    if (this.confirming) {
      return [
        {
          label: 'Confirm — synchronise and close the record',
          feedback: '',
          getEventTypes: () => ['pilot_final_core_confirmed'],
          onSelected: () => this.synchroniseCore(),
        },
        {
          label: 'Not yet — return to the station',
          feedback: '',
          getEventTypes: () => ['pilot_final_core_confirm_declined'],
          onSelected: () => {
            this.confirming = false;
            this.refreshCompletionProbe();
            this.showFeedbackMessage(
              'The console stands by. The Concourse door is open.',
            );
          },
        },
      ];
    }

    // Gameplay review round 2 (BLOCKER): synchronisation is offered
    // only at the deck_review stage — an early explorer can review and
    // leave, but can never irreversibly end the session before the
    // route reaches its review step. Never a performance check.
    if (pilotStage() !== 'deck_review') {
      return [
        {
          label: 'Return to the station',
          feedback:
            'Vale has not signed the shift off yet — the record stays open.',
          getEventTypes: () => ['pilot_final_core_review_left'],
        },
      ];
    }

    return [
      {
        label: 'Begin core synchronisation',
        feedback: '',
        getEventTypes: () => ['pilot_final_core_confirm_opened'],
        onSelected: () => {
          this.confirming = true;
          this.refreshCompletionProbe();
          this.showFeedbackMessage(
            'Confirmation required — open the console again to confirm or step back.',
          );
        },
      },
      {
        label: 'Return to the station',
        feedback: '',
        getEventTypes: () => ['pilot_final_core_review_left'],
        onSelected: () => {
          this.showFeedbackMessage(
            'The record stays open — the Concourse door is to the west.',
          );
        },
      },
    ];
  }

  // ————————————————————————————————— synchronisation ——

  private synchroniseCore(): void {
    const now = Date.now();

    // 1. Ambient yard windows get their explicit terminal departure
    //    codes (never completed, never participant_absent — D-X-4).
    //    Scientific review round 2: the code is ALSO written onto the
    //    SA-13 register (censored + the code as detail) so departure-
    //    closed windows stay distinguishable from ordinary end-of-
    //    session censoring.
    const m22Open = yardM22WindowOpen();
    const m25Open = yardM25WindowOpen();

    finalizeYardAmbientWindows(now);

    if (m22Open) {
      markOpportunityInvalid(
        YARD_M22_OPPORTUNITY_ID,
        'censored',
        'closed_departed_without_recovery',
      );
    }

    if (m25Open) {
      markOpportunityInvalid(
        YARD_M25_OPPORTUNITY_ID,
        'censored',
        'closed_departed_without_reset',
      );
    }

    // 2. Explicit terminal closure of every scheduled opportunity
    //    (censored / participant_absent / no_opportunity — never
    //    success, already-terminal records never overwritten).
    const closure = closePilotCoverageAtFinalCore();

    // 3. Route completes (one-way; the stage machine never reverses).
    advancePilotStage('complete', now);

    const summary = pilotCompletionSummary();

    this.logScenarioEvent('pilotCoreConsole', 'pilot_final_core_synchronised', {
      metadata: {
        censored: closure.censored,
        absent: closure.absent,
        no_opportunity: closure.noOpportunity,
        error_count: closure.errors.length,
        scheduled: summary.scheduled,
        closed: summary.closed,
        open: summary.open,
      },
    });

    // 4. Session completion via the accepted runtime surface: summary +
    //    (configured-only) Qualtrics return URL. No scores are computed
    //    here; submitSessionExport refuses outside launch_mode=test.
    const { returnUrl } = researchRuntime.completeDebugSession();

    this.refreshBoardStatus();
    this.showCompletionScreen(returnUrl);
  }

  private showCompletionScreen(returnUrl: string | null): void {
    // Structural input isolation for the end state (no cancel hook):
    // movement, prompts and stations are inert behind the modal.
    beginManualWorldAction();
    this.input.keyboard?.resetKeys();

    const depth = 4000;

    this.add.rectangle(400, 300, 800, 600, 0x060a10, 0.94).setDepth(depth);
    this.add
      .rectangle(400, 300, 620, 260, 0x0e1620, 1)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(depth + 1);
    this.add
      .text(400, 224, 'SHIFT COMPLETE', {
        color: '#5fd3c4',
        font: 'bold 22px monospace',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);
    this.add
      .text(
        400,
        290,
        'Core synchronised — the station record is closed.\n' +
          'Thank you. Your relief shift at the outpost is over.',
        {
          color: '#dce7f0',
          font: '14px monospace',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(depth + 2);

    const navigateScheduled = returnUrl !== null;

    this.add
      .text(
        400,
        362,
        navigateScheduled
          ? 'Returning you to the survey…'
          : 'Session complete. You may close this window.',
        {
          color: '#9fb2c1',
          font: '12px monospace',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(depth + 2);

    if (navigateScheduled && returnUrl !== null) {
      // Legitimately configured Qualtrics return only — the ONLY
      // navigation the pilot ever performs.
      this.time.delayedCall(RETURN_NAVIGATION_DELAY_MS, () => {
        if (typeof window !== 'undefined') {
          window.location.assign(returnUrl);
        }
      });
    }

    this.refreshCompletionProbe(navigateScheduled, returnUrl !== null);
    refreshPilotCoverageProbe();
  }

  private refreshCompletionProbe(
    navigateScheduled = false,
    returnConfigured = false,
  ): void {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const closed = pilotFinalCoreClosed();
    const summary = pilotCompletionSummary();
    const closure = window.__pilotCoverage?.final_core_closure ?? null;

    window.__pilotCompletionProbe = {
      confirming: this.confirming,
      closed,
      return_url_configured: returnConfigured,
      navigate_scheduled: navigateScheduled,
      closure_counts:
        closure === null
          ? null
          : {
              censored: closure.censored.length,
              absent: closure.absent.length,
              no_opportunity: closure.noOpportunity.length,
              errors: closure.errors.length,
            },
      summary: {
        scheduled: summary.scheduled,
        closed: summary.closed,
        open: summary.open,
      },
    };
  }
}
