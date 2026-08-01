import { key } from '../constants';
import { performWorldAction, showFloatingText } from '../gameplay';
import {
  activateQ32Project,
  advanceQ32Project,
  assignCounterbalance,
  closeQ32Board,
  closeQ33Contract,
  declareOpportunity,
  HORIZON_SITUATIONS,
  horizonConstructComplete,
  horizonFormAnswered,
  markHorizonDetailInspected,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  markQ32BoardOpened,
  markQ33QueueOpened,
  parkQ32Project,
  Q29Q31_ENTRY_STATE_VERSION,
  Q29Q31_OPPORTUNITY_ID,
  Q29Q31_OWNER,
  Q32_ENTRY_STATE_VERSION,
  Q32_OPPORTUNITY_ID,
  Q32_PROJECT_STEPS,
  Q32_PROJECTS,
  q32State,
  q32Summary,
  Q33_ENTRY_STATE_VERSION,
  Q33_OPPORTUNITY_ID,
  q33OpenContracts,
  q33Summary,
  recordHorizonChoice,
  recordQ33LeftWithOpen,
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

const TERMINAL_POSITION = { x: 3 * 32, y: 3 * 32 };
const BOARD_POSITION = { x: 14 * 32, y: 3 * 32 };
const DESK_POSITION = { x: 9 * 32, y: 7 * 32 };

/**
 * Operations Annex — Unit 3 measurement-module room hosting three
 * mutually independent modules with disjoint windows, disjoint state
 * containers and disjoint proto_* event families (ruling §6 co-location
 * rule):
 *  - Planning Terminal: form B of the ONE shared Q29/Q31 goal-horizon
 *    construct (SA-3) — never a separate Q31 score;
 *  - Project Portfolio Board: the Q32 Active Project Portfolio module
 *    (SA-5, exploratory short-session analogue);
 *  - Contract Closure Desk: the Q33 Contract Closure Queue module
 *    (SA-6, self-selected closures only, exploratory analogue).
 *
 * `proto_ops_annex` is a provisional internal area id; all events are
 * raw prototype telemetry via logScenarioEvent; no scoring exists.
 */
export class OpsAnnexScene extends RoomScene {
  protected readonly roomId = 'proto_ops_annex';
  protected readonly roomInteractionKey: InteractionKey =
    'annexPlanningTerminal';

  constructor() {
    super(key.scene.opsAnnex);
  }

  protected getLayout(): RoomLayout {
    // 25×19 annex: door back to the Hub at the top, work alcoves. Play
    // space is the original 18×10 interior; the extra wall mass fills
    // the viewport so no dead black void renders (Unit 4) —
    // unreachable, no interior change.
    return {
      theme: 'ops',
      grid: [
        '#########################',
        '########--###############',
        '#................########',
        '#................########',
        '#.....##...##....########',
        '#................########',
        '#................########',
        '#................########',
        '#................########',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the door, outside its 72px radius.
    return { x: 9 * 32, y: 4 * 32 };
  }

  protected populateRoom(): void {
    declareOpportunity({
      opportunity_id: Q29Q31_OPPORTUNITY_ID,
      owner: Q29Q31_OWNER,
      entry_state_version: Q29Q31_ENTRY_STATE_VERSION,
    });
    declareOpportunity({
      opportunity_id: Q32_OPPORTUNITY_ID,
      owner: 'Q32 (exploratory analogue; questionnaire-primary)',
      entry_state_version: Q32_ENTRY_STATE_VERSION,
    });
    declareOpportunity({
      opportunity_id: Q33_OPPORTUNITY_ID,
      owner: 'Q33 (exploratory analogue; questionnaire-primary)',
      entry_state_version: Q33_ENTRY_STATE_VERSION,
    });

    this.addStation({
      interactionKey: 'annexPlanningTerminal',
      label: 'Planning Terminal',
      texture: 'proc-console-wall',
      x: TERMINAL_POSITION.x,
      y: TERMINAL_POSITION.y,
      onPromptOpened: () => this.onTerminalOpened(),
    });

    this.addStation({
      interactionKey: 'annexPortfolioBoard',
      label: 'Project Portfolio Board',
      texture: 'proc-board-portfolio',
      x: BOARD_POSITION.x,
      y: BOARD_POSITION.y,
      onPromptOpened: () => this.onBoardOpened(),
    });

    this.addStation({
      interactionKey: 'annexClosureDesk',
      label: 'Contract Closure Desk',
      texture: 'proc-desk-closure',
      x: DESK_POSITION.x,
      y: DESK_POSITION.y,
      onPromptOpened: () => this.onDeskOpened(),
    });

    this.addDoor({
      x: 9 * 32,
      y: 1 * 32 + 16,
      label: 'Station Hub',
      texture: 'prop-hub-door-frame',
      interactionKey: 'annexPlanningTerminal',
      target: {
        sceneKey: key.scene.hub,
        roomId: 'station_hub',
        spawn: 'proto_ops_annex',
      },
    });

    // Annex dressing (decorative only).
    this.addDecor(16 * 32, 7.5 * 32, 'prop-archive-racks');
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('annexPlanningTerminal', 'proto_annex_entered');
    markOpportunityOffered(Q29Q31_OPPORTUNITY_ID);
    markOpportunityOffered(Q32_OPPORTUNITY_ID);
    markOpportunityOffered(Q33_OPPORTUNITY_ID);
    refreshValidityProbe();
  }

  protected onRoomExit(): void {
    if (q32State.board_opened && !q32State.board_closed) {
      this.logScenarioEvent('annexPortfolioBoard', 'proto_q32_left_open', {
        metadata: q32Summary(),
      });
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'annexPlanningTerminal') {
      return this.buildTerminalOptions();
    }

    if (interactionKey === 'annexPortfolioBoard') {
      return this.buildBoardOptions();
    }

    if (interactionKey === 'annexClosureDesk') {
      return this.buildDeskOptions();
    }

    return [];
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'annexPlanningTerminal') {
      return HORIZON_SITUATIONS[1].body;
    }

    if (interactionKey === 'annexPortfolioBoard') {
      return 'Four annex projects sit on the board. Any can be taken up, worked in steps, parked, or left entirely — the board carries no deadline.';
    }

    if (interactionKey === 'annexClosureDesk') {
      return 'Five station contracts sit at the desk, each finished except for a short closure pass. None are assigned to you — closing any of them is optional.';
    }

    return undefined;
  }

  // ————————————— Planning Terminal (Q29/Q31 form B) —————————————

  private onTerminalOpened(): boolean {
    if (horizonFormAnswered('B_terminal')) {
      this.showFeedbackMessage('The roster slot is already logged.');
      return false;
    }

    this.logScenarioEvent('annexPlanningTerminal', 'proto_horizon_opened', {
      metadata: { form: 'B_terminal' },
    });
    markOpportunityEntered(Q29Q31_OPPORTUNITY_ID);
    refreshValidityProbe();

    return true;
  }

  private horizonOptionOrder(): 'immediate_first' | 'distributed_first' {
    return assignCounterbalance(
      researchRuntime.sessionState.getMetadata().game_session_id,
      'horizon_form_b',
      ['immediate_first', 'distributed_first'] as const,
    );
  }

  private buildTerminalOptions(): PromptOption[] {
    const situation = HORIZON_SITUATIONS[1];
    const order = this.horizonOptionOrder();

    const choose = (
      choice: 'immediate' | 'distributed',
      label: string,
    ): PromptOption => ({
      label,
      feedback: 'Logged to the roster.',
      getEventTypes: () => [],
      onSelected: () => {
        const observation = recordHorizonChoice('B_terminal', choice, order);

        if (observation !== null) {
          this.logScenarioEvent(
            'annexPlanningTerminal',
            'proto_horizon_choice',
            {
              choice_value: choice,
              metadata: { ...observation },
            },
          );

          if (horizonConstructComplete()) {
            markOpportunityCompleted(Q29Q31_OPPORTUNITY_ID);
          }

          refreshValidityProbe();
        }
      },
    });

    const immediate = choose('immediate', situation.immediateLabel);
    const distributed = choose('distributed', situation.distributedLabel);
    const ordered =
      order === 'immediate_first'
        ? [immediate, distributed]
        : [distributed, immediate];

    return [
      ...ordered,
      {
        label: 'Check the request details.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          markHorizonDetailInspected('B_terminal');
          this.logScenarioEvent(
            'annexPlanningTerminal',
            'proto_horizon_detail_inspected',
            { metadata: { form: 'B_terminal' } },
          );
        },
        nextStage: (): PromptStage => ({
          body: situation.detail,
          options: ordered,
        }),
      },
    ];
  }

  // ————————————— Project Portfolio Board (Q32) —————————————

  private onBoardOpened(): boolean {
    markQ32BoardOpened();
    markOpportunityEntered(Q32_OPPORTUNITY_ID);
    this.logScenarioEvent('annexPortfolioBoard', 'proto_q32_board_opened', {
      metadata: q32Summary(),
    });
    refreshValidityProbe();

    return true;
  }

  private buildBoardOptions(): PromptOption[] {
    const options: PromptOption[] = [];

    for (const project of Q32_PROJECTS) {
      const state = q32State.projects[project.project_id];

      if (state.status === 'dormant' || state.status === 'parked') {
        options.push({
          label: `${state.status === 'parked' ? 'Resume' : 'Activate'}: ${project.label}.`,
          feedback: `${project.label} is on the active portfolio.`,
          getEventTypes: () => [],
          onSelected: () => {
            activateQ32Project(project.project_id);
            this.logScenarioEvent(
              'annexPortfolioBoard',
              'proto_q32_project_activated',
              {
                metadata: {
                  project_id: project.project_id,
                  resumed: state.status === 'parked',
                  ...q32Summary(),
                },
              },
            );
          },
        });
      } else if (state.status === 'active') {
        options.push({
          label: `Advance: ${project.label} (step ${state.steps_done + 1}/${Q32_PROJECT_STEPS}).`,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            performWorldAction({
              scene: this,
              x: BOARD_POSITION.x,
              y: BOARD_POSITION.y,
              label: 'Working…',
              durationMs: 700,
              onComplete: () => {
                const stepsDone = advanceQ32Project(project.project_id);
                const completed = stepsDone >= Q32_PROJECT_STEPS;

                this.logScenarioEvent(
                  'annexPortfolioBoard',
                  'proto_q32_project_advanced',
                  {
                    metadata: {
                      project_id: project.project_id,
                      steps_done: stepsDone,
                      completed,
                    },
                  },
                );

                if (completed) {
                  showFloatingText(
                    this,
                    BOARD_POSITION.x,
                    BOARD_POSITION.y,
                    'Project closed',
                  );
                  this.showFeedbackMessage(
                    `${project.label} is complete and filed.`,
                  );
                } else {
                  this.showFeedbackMessage(
                    `${project.label}: step ${stepsDone}/${Q32_PROJECT_STEPS} logged.`,
                  );
                }
              },
            });
          },
        });
      }
    }

    if (
      Q32_PROJECTS.some(
        (project) => q32State.projects[project.project_id].status === 'active',
      )
    ) {
      options.push({
        label: 'Park an active project.',
        feedback: '',
        getEventTypes: () => [],
        nextStage: (): PromptStage => ({
          body: 'Parked projects keep their progress and can be resumed from the board.',
          options: [
            ...Q32_PROJECTS.filter(
              (project) =>
                q32State.projects[project.project_id].status === 'active',
            ).map((project) => ({
              label: `Park: ${project.label}.`,
              feedback: `${project.label} is parked with its progress kept.`,
              getEventTypes: () => [],
              onSelected: () => {
                parkQ32Project(project.project_id);
                this.logScenarioEvent(
                  'annexPortfolioBoard',
                  'proto_q32_project_parked',
                  { metadata: { project_id: project.project_id } },
                );
              },
            })),
            {
              label: 'Back to the board.',
              feedback: '',
              getEventTypes: () => [],
              nextStage: (): PromptStage => ({
                body: this.getPromptBody('annexPortfolioBoard'),
                options: this.buildBoardOptions(),
              }),
            },
          ],
        }),
      });
    }

    options.push({
      label: 'Step away from the board.',
      feedback: 'You step back from the portfolio board.',
      getEventTypes: () => [],
      onSelected: () => {
        closeQ32Board();
        this.logScenarioEvent('annexPortfolioBoard', 'proto_q32_board_closed', {
          metadata: q32Summary(),
        });
        markOpportunityCompleted(Q32_OPPORTUNITY_ID);
        refreshValidityProbe();
      },
    });

    return options;
  }

  // ————————————— Contract Closure Desk (Q33) —————————————

  private onDeskOpened(): boolean {
    markQ33QueueOpened();
    markOpportunityEntered(Q33_OPPORTUNITY_ID);
    this.logScenarioEvent('annexClosureDesk', 'proto_q33_queue_opened', {
      metadata: q33Summary(),
    });
    refreshValidityProbe();

    if (q33OpenContracts().length === 0) {
      this.showFeedbackMessage('The closure queue is clear.');
      return false;
    }

    return true;
  }

  private buildDeskOptions(): PromptOption[] {
    const options: PromptOption[] = q33OpenContracts().map((contract) => ({
      label: `Close out: ${contract.label}.`,
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        performWorldAction({
          scene: this,
          x: DESK_POSITION.x,
          y: DESK_POSITION.y,
          label: 'Closing…',
          durationMs: 800,
          onComplete: () => {
            closeQ33Contract(contract.contract_id);
            this.logScenarioEvent(
              'annexClosureDesk',
              'proto_q33_contract_closed',
              {
                metadata: {
                  contract_id: contract.contract_id,
                  ...q33Summary(),
                },
              },
            );
            this.showFeedbackMessage(
              `The ${contract.label.toLowerCase()} contract is closed and filed.`,
            );

            if (q33OpenContracts().length === 0) {
              markOpportunityCompleted(Q33_OPPORTUNITY_ID);
              refreshValidityProbe();
            }
          },
        });
      },
    }));

    options.push({
      label: 'Leave the desk.',
      feedback: 'You leave the closure desk as it stands.',
      getEventTypes: () => [],
      onSelected: () => {
        recordQ33LeftWithOpen();
        this.logScenarioEvent('annexClosureDesk', 'proto_q33_desk_left', {
          metadata: q33Summary(),
        });
        markOpportunityCompleted(Q33_OPPORTUNITY_ID);
        refreshValidityProbe();
      },
    });

    return options;
  }
}
