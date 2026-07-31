import { key } from '../constants';
import { performWorldAction } from '../gameplay';
import {
  closeDiagnostic,
  completeExtraCycle,
  completeUsefulCycle,
  declareOpportunity,
  markLeftDuringWindow,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  markRationaleInspected,
  markStopSignalShown,
  Q27_ENTRY_STATE_VERSION,
  Q27_OPPORTUNITY_ID,
  Q27_STOP_SIGNAL,
  Q27_USEFUL_CYCLES,
  q27State,
  q27WindowOpen,
  recordPriorExposure,
  refreshValidityProbe,
} from '../measurement';
import { researchRuntime } from '../systems';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { RoomScene } from '../world';

const BOT_POSITION = { x: 9 * 32, y: 6 * 32 };

/**
 * Utility Bay — the dedicated Q27 utility-stop module room (SA-2 adopted
 * design; Unit 3).
 *
 * The Utility Bot offers a diagnostic-assist task: three useful cycles
 * with visible utility, then the standardised explicit utility-stop
 * signal. The primary window opens at that signal; continuing and
 * stopping are equally accessible and neutrally framed, and leaving the
 * bay during the window is a valid stop.
 *
 * Independence: its own room, state container (q27UtilityStop) and
 * proto_* event family. It reads Hazard/Side-Repair status ONLY to
 * record prior exposure on the SA-13 register — never to gate anything.
 * `proto_utility_bay` is a provisional internal area id; every event is
 * raw prototype telemetry via logScenarioEvent; no scoring exists.
 */
export class UtilityBayScene extends RoomScene {
  protected readonly roomId = 'proto_utility_bay';
  protected readonly roomInteractionKey: InteractionKey =
    'utilityBotDiagnostic';

  private statusPanel: { setText: (value: string) => void } | null = null;

  constructor() {
    super(key.scene.utilityBay);
  }

  protected getLayout(): RoomLayout {
    // 16×10 bay: door back to the Hub at the top, service pit block for
    // structure, open work floor.
    return {
      grid: [
        '################',
        '#####--#########',
        '#..............#',
        '#..............#',
        '#..##..........#',
        '#..............#',
        '#..............#',
        '#..........##..#',
        '#..............#',
        '################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the door, outside its 72px radius.
    return { x: 6 * 32, y: 4 * 32 };
  }

  protected populateRoom(): void {
    declareOpportunity({
      opportunity_id: Q27_OPPORTUNITY_ID,
      owner: 'Q27',
      entry_state_version: Q27_ENTRY_STATE_VERSION,
    });

    this.statusPanel = this.addStatusSidePanel();
    this.refreshStatusPanel();

    // The Utility Bot — visible, named, interactive (Unit 1 NPC actor).
    this.addNpc({
      interactionKey: 'utilityBotDiagnostic',
      label: 'Utility Bot',
      npcName: 'Utility Bot',
      texture: 'proc-bot-utility',
      x: BOT_POSITION.x,
      y: BOT_POSITION.y,
      onPromptOpened: () => this.onBotOpened(),
    });

    // Door back to the Station Hub.
    this.addDoor({
      x: 6 * 32,
      y: 1 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'utilityBotDiagnostic',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'proto_utility_bay',
      },
    });

    // Bay dressing (decorative only).
    this.addDecor(3 * 32, 4.5 * 32, 'prop-dock-crates');
    this.addDecor(12 * 32, 7.5 * 32, 'prop-archive-racks');
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('utilityBotDiagnostic', 'proto_q27_bay_entered');
    markOpportunityOffered(Q27_OPPORTUNITY_ID);
    refreshValidityProbe();
  }

  protected onRoomExit(): void {
    if (q27WindowOpen()) {
      // Leaving mid-window is a valid stop, never a penalty: the window
      // closes by departure and the record completes.
      markLeftDuringWindow();
      this.logScenarioEvent(
        'utilityBotDiagnostic',
        'proto_q27_left_during_window',
        { metadata: { extra_cycles: q27State.extra_cycles } },
      );
      closeDiagnostic();
      markOpportunityCompleted(Q27_OPPORTUNITY_ID);
      refreshValidityProbe();
    }
  }

  protected onRoomUpdate(): void {
    this.refreshStatusPanel();
  }

  private refreshStatusPanel(): void {
    if (this.statusPanel === null) {
      return;
    }

    const faults =
      q27State.useful_cycles_done >= 3
        ? 3
        : q27State.useful_cycles_done === 2
          ? 3
          : q27State.useful_cycles_done === 1
            ? 2
            : 0;

    this.statusPanel.setText(
      [
        'DIAGNOSTIC BAY',
        '',
        `Cycles run: ${q27State.useful_cycles_done + q27State.extra_cycles}`,
        `Faults isolated: ${faults}`,
        '',
        'Session:',
        q27State.closed
          ? '[x] closed'
          : q27State.stop_signal_shown
            ? 'complete — open'
            : '[ ] running',
      ].join('\n'),
    );
  }

  private onBotOpened(): boolean {
    this.logScenarioEvent('utilityBotDiagnostic', 'proto_q27_opened');
    markOpportunityEntered(Q27_OPPORTUNITY_ID);
    refreshValidityProbe();

    if (q27State.closed) {
      this.showFeedbackMessage(
        'The bot idles by its dock. The diagnostic session is closed out.',
      );
      return false;
    }

    return true;
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey !== 'utilityBotDiagnostic') {
      return undefined;
    }

    if (q27WindowOpen()) {
      // The standardised utility-stop signal heads the window prompt.
      return Q27_STOP_SIGNAL;
    }

    if (q27State.useful_cycles_done === 0) {
      return 'The Utility Bot chirps: its sensor array wants a diagnostic sweep, run in short cycles from this panel.';
    }

    return 'The diagnostic sweep is part-way through its cycles.';
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'utilityBotDiagnostic') {
      return [];
    }

    if (!q27State.stop_signal_shown) {
      return [
        {
          label: 'Run a diagnostic cycle.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            performWorldAction({
              scene: this,
              x: BOT_POSITION.x,
              y: BOT_POSITION.y,
              label: 'Running cycle…',
              durationMs: 1000,
              onComplete: () => this.finishUsefulCycle(),
            });
          },
        },
        {
          label: 'Step away from the bot.',
          feedback: 'You step back from the diagnostic bay.',
          getEventTypes: () => [],
        },
      ];
    }

    return this.buildWindowOptions();
  }

  private finishUsefulCycle() {
    const result = completeUsefulCycle();

    this.logScenarioEvent('utilityBotDiagnostic', 'proto_q27_useful_cycle', {
      metadata: { cycle: q27State.useful_cycles_done },
    });

    if (q27State.useful_cycles_done >= Q27_USEFUL_CYCLES) {
      // The standardised stop signal fires at the completion moment of
      // the final useful cycle — the primary window starts HERE.
      markStopSignalShown();
      this.recordWindowStartExposure();
      this.logScenarioEvent(
        'utilityBotDiagnostic',
        'proto_q27_stop_signal_shown',
      );
      refreshValidityProbe();
      this.showFeedbackMessage(`${result}\n\n${Q27_STOP_SIGNAL}`);
    } else {
      this.showFeedbackMessage(result);
    }

    this.refreshStatusPanel();
  }

  /**
   * Prior-exposure snapshot at window start (SA-13): recorded facts only
   * — nothing here gates or alters the window.
   */
  private recordWindowStartExposure() {
    const mission = researchRuntime.sessionState.getMissionState();

    recordPriorExposure(
      Q27_OPPORTUNITY_ID,
      `hazard_status:${mission.hazard_status}`,
    );
    recordPriorExposure(
      Q27_OPPORTUNITY_ID,
      `side_repair_status:${mission.side_repair_status}`,
    );
  }

  /**
   * Window options: continue and stop equally accessible and neutrally
   * framed. Continue/stop positions are fixed in declared order —
   * position bias is controlled by neutral wording and identical card
   * treatment; the order is recorded implicitly by this fixed layout.
   */
  private buildWindowOptions(): PromptOption[] {
    return [
      {
        label: 'Run another cycle.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          performWorldAction({
            scene: this,
            x: BOT_POSITION.x,
            y: BOT_POSITION.y,
            label: 'Running cycle…',
            durationMs: 1000,
            onComplete: () => {
              const extraCycles = completeExtraCycle();

              this.logScenarioEvent(
                'utilityBotDiagnostic',
                'proto_q27_extra_cycle',
                { metadata: { extra_cycle_index: extraCycles } },
              );
              this.refreshStatusPanel();
              this.showFeedbackMessage('The cycle completes. No new findings.');
            },
          });
        },
      },
      {
        label: 'Close the diagnostic session.',
        feedback: 'The diagnostic session closes.',
        getEventTypes: () => [],
        onSelected: () => {
          closeDiagnostic();
          this.logScenarioEvent('utilityBotDiagnostic', 'proto_q27_closed', {
            metadata: {
              extra_cycles: q27State.extra_cycles,
              rationale_inspected: q27State.rationale_inspected,
            },
          });
          markOpportunityCompleted(Q27_OPPORTUNITY_ID);
          refreshValidityProbe();
          this.refreshStatusPanel();
        },
      },
      {
        label: 'Inspect the completion rationale.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          markRationaleInspected();
          this.logScenarioEvent(
            'utilityBotDiagnostic',
            'proto_q27_rationale_inspected',
          );
        },
        nextStage: (): PromptStage => ({
          body: 'Completion report: every sensor channel has been swept twice and the fault projection is stable at zero. Additional cycles re-run identical sweeps over the same channels.',
          options: this.buildWindowOptions().slice(0, 2),
        }),
      },
    ];
  }
}
