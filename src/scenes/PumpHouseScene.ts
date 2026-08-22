import { key } from '../constants';
import type { ManifoldAct } from '../gameplay';
import {
  cancelActiveWorldAction,
  completeRestoreTask,
  coolantRouteState,
  hasInventoryItem,
  ManifoldTrench,
  markWorkOrderRead,
  performWorldAction,
  playActionAnimation,
  registerCoolantTasks,
  removeInventoryItem,
  ringPulse,
  setRestoreObjective,
  sfxComplete,
  sfxInstall,
  sfxMachineOn,
  sfxUiSelect,
  showFloatingText,
  yardRecoveryComplete,
} from '../gameplay';
import type { M13SlotId, M18EvidenceId } from '../measurement';
import {
  assignCounterbalance,
  declareOpportunity,
  M13_ENTRY_STATE_VERSION,
  M13_OPPORTUNITY_ID,
  M13_SLOT_IDS,
  m13BenchPieces,
  m13SlotPlacement,
  m13State,
  M18_ENTRY_STATE_VERSION,
  M18_EVIDENCE,
  M18_OPPORTUNITY_ID,
  M18_OPTION_ORDERS,
  M18_OPTIONS,
  m18DiagnosisSubmitted,
  m18State,
  M22_ENTRY_STATE_VERSION,
  M22_OPPORTUNITY_ID,
  M22_SETBACK_EXPLANATION,
  m22State,
  m22WindowOpen,
  M25_ENTRY_STATE_VERSION,
  M25_LOCK_STATEMENT,
  M25_OPPORTUNITY_ID,
  m25State,
  m25WindowOpen,
  markM13Engaged,
  markM18FaultPresented,
  markM22FixAttempted,
  markM22LeftDuringWindow,
  markM22SetbackShown,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  placeM13Piece,
  pressM25Prime,
  recordM18EvidenceCheck,
  refreshValidityProbe,
  removeM13Piece,
  resetM25Interlock,
  rotateM13Piece,
  seatM22Seal,
  submitM13Flow,
  submitM18Diagnosis,
} from '../measurement';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, PromptStage } from '../world';
import { RoomScene } from '../world';
import type { RoomLayout } from '../world/StationMapBuilder';

/**
 * Pump House (action-assessment rebuild, Unit 3) — `proto_pump_house`.
 *
 * The interior head of the coolant red line, now hosting three
 * item-local provisional measurement windows:
 *
 * - M13 manifold puzzle: direct-manipulation pipe reconstruction in the
 *   floor trench (state in src/measurement/m13PipePuzzle.ts,
 *   presentation in src/gameplay/manifoldTrench.ts). The standardised
 *   piece set is ALWAYS complete at the bench regardless of any earlier
 *   gameplay outcome. Drag/drop + click-rotate, with a full
 *   keyboard-card equivalent at the trench console (seat/rotate/return/
 *   submit). Submission validates real connectivity; no auto-complete.
 * - M18 pressure diagnosis: after a sealed test flow, ONE standardised
 *   residual fault presents at the diagnostic board; evidence readouts
 *   are checkable and the single final diagnosis is chosen from
 *   counterbalanced options. No M13 act is M18 evidence, and the
 *   correct answer is independent of puzzle success.
 * - M22 standardised setback: the prescribed seal replacement cracks on
 *   first seating (explained, external, identical for everyone); the
 *   recovery route (fresh seal in the yard supply crate) stays open.
 *
 * Every identifier is proto_* raw telemetry via the scenario path.
 */

const PRESSURE_CONSOLE_POSITION = { x: 5 * 32, y: 2.5 * 32 };
const INTERLOCK_CONSOLE_POSITION = { x: 10 * 32, y: 2.5 * 32 };
const TRENCH_ORIGIN = { x: 8 * 32, y: 4 * 32 };
const BENCH_ORIGIN = { x: 5 * 32, y: 8.5 * 32 };
const TRENCH_CONSOLE_POSITION = { x: 13 * 32, y: 5 * 32 };
const DIAG_BOARD_POSITION = { x: 16 * 32, y: 2.5 * 32 };
const RELIEF_VALVE_POSITION = { x: 18 * 32, y: 7 * 32 };

const PUMP_WORK_ORDER_BODY =
  'PRESSURE FAULT — COOLANT LOOP B. Line pressure fell to 31% overnight; the buried supply run under the east yard has failed sections. Directive: survey the yard with the field scanner, recover serviceable line components, free the spare coupling from its housing, then rebuild the manifold at the trench.';

export class PumpHouseScene extends RoomScene {
  protected readonly roomId = 'proto_pump_house';
  protected readonly roomInteractionKey: InteractionKey = 'pumpPressureConsole';

  private trench?: ManifoldTrench;

  constructor() {
    super(key.scene.pumpHouse);
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'workshop',
      grid: [
        '#########################',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#################--######',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return { x: 17.5 * 32, y: 12.5 * 32 };
  }

  protected populateRoom(): void {
    registerCoolantTasks();

    this.addDoor({
      x: 17.5 * 32,
      y: 13 * 32 + 16,
      label: 'Coolant Yard',
      texture: 'prop-hub-door-frame',
      interactionKey: 'pumpPressureConsole',
      target: {
        sceneKey: key.scene.coolantYard,
        roomId: 'proto_coolant_yard',
        spawn: 'proto_pump_house',
      },
    });

    // ——— SA-13 opportunity declarations (idempotent).
    declareOpportunity({
      opportunity_id: M13_OPPORTUNITY_ID,
      owner: 'M13 (provisional 26-battery)',
      entry_state_version: M13_ENTRY_STATE_VERSION,
    });
    declareOpportunity({
      opportunity_id: M18_OPPORTUNITY_ID,
      owner: 'M18 (provisional 26-battery)',
      entry_state_version: M18_ENTRY_STATE_VERSION,
      counterbalance: `option_order_${this.m18OrderIndex()}`,
    });
    declareOpportunity({
      opportunity_id: M22_OPPORTUNITY_ID,
      owner: 'M22 (provisional 26-battery)',
      entry_state_version: M22_ENTRY_STATE_VERSION,
    });
    markOpportunityOffered(M13_OPPORTUNITY_ID);
    refreshValidityProbe();

    // ——— Stations.
    this.addStation({
      interactionKey: 'pumpPressureConsole',
      label: 'Pressure Console',
      texture: 'proc-console-wall',
      x: PRESSURE_CONSOLE_POSITION.x,
      y: PRESSURE_CONSOLE_POSITION.y,
    });
    this.addStation({
      interactionKey: 'pumpManifoldTrench',
      label: 'Trench Console',
      texture: 'proc-console-quartermaster',
      x: TRENCH_CONSOLE_POSITION.x,
      y: TRENCH_CONSOLE_POSITION.y,
    });
    this.addStation({
      interactionKey: 'pumpDiagnosticBoard',
      label: 'Diagnostic Board',
      texture: 'proc-diag-board',
      x: DIAG_BOARD_POSITION.x,
      y: DIAG_BOARD_POSITION.y,
      onPromptOpened: () => this.onDiagBoardOpened(),
    });
    this.addStation({
      interactionKey: 'pumpReliefValve',
      label: 'Relief Valve',
      texture: 'proc-valve-relief',
      x: RELIEF_VALVE_POSITION.x,
      y: RELIEF_VALVE_POSITION.y,
      onPromptOpened: () => this.onReliefValveOpened(),
    });

    // ——— Unit 4: M25 pump restart interlock.
    declareOpportunity({
      opportunity_id: M25_OPPORTUNITY_ID,
      owner: 'M25 (provisional 26-battery)',
      entry_state_version: M25_ENTRY_STATE_VERSION,
    });
    this.addStation({
      interactionKey: 'pumpInterlockConsole',
      label: 'Pump Interlock Console',
      texture: m25State.running ? 'proc-machine-fixed' : 'proc-machine-fault',
      x: INTERLOCK_CONSOLE_POSITION.x,
      y: INTERLOCK_CONSOLE_POSITION.y,
      onPromptOpened: () => this.onInterlockOpened(),
    });

    // ——— The manifold trench (M13 direct-manipulation surface).
    this.trench = new ManifoldTrench({
      scene: this,
      origin: TRENCH_ORIGIN,
      benchOrigin: BENCH_ORIGIN,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      isEnabled: () => this.physicalInputEligible(),
      onAct: (act) => this.onTrenchAct(act),
      onFeedback: (message) => this.showFeedbackMessage(message),
    });

    // Bench dressing under the piece row.
    this.addDecor(9 * 32, 8.5 * 32 + 14, 'proc-bench-prep');

    // Failure dressing.
    this.addDecor(9 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(12 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(15 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(3 * 32, 8 * 32, 'proc-cart-utility');
    this.addDecor(2.5 * 32, 11.5 * 32, 'proc-crate-components');
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('pumpPressureConsole', 'proto_pump_house_entered');
  }

  protected onRoomUpdate(): void {
    this.trench?.update();
  }

  protected onRoomExit(): void {
    cancelActiveWorldAction();

    // Leaving with the M22 window open is a recorded neutral fact —
    // fetching the fresh seal from the yard IS the recovery route.
    if (m22WindowOpen() && !m22State.seal_seated) {
      markM22LeftDuringWindow();
      this.logScenarioEvent('pumpReliefValve', 'proto_m22_left_during_window', {
        metadata: { spare_seal_fetched: m22State.spare_seal_fetched },
      });
    }
  }

  // ————————————————————— M13 manifold trench —————————————————————

  private onTrenchAct(act: ManifoldAct) {
    if (!m13State.engaged && act.kind !== 'refused') {
      markM13Engaged();
      markOpportunityEntered(M13_OPPORTUNITY_ID);
      refreshValidityProbe();
      this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_bench_engaged');
    }

    switch (act.kind) {
      case 'grabbed':
        this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_piece_grabbed', {
          metadata: { piece_id: act.piece_id },
        });
        break;
      case 'placed':
        this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_piece_placed', {
          metadata: { slot: act.slot, piece_id: act.piece_id },
        });
        break;
      case 'rotated':
        this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_piece_rotated', {
          metadata: {
            slot: act.slot,
            piece_id: act.piece_id,
            rotation: act.rotation,
          },
        });
        break;
      case 'refused':
        this.logScenarioEvent(
          'pumpManifoldTrench',
          'proto_m13_placement_refused',
          { metadata: { reason: act.reason } },
        );
        break;
    }
  }

  private submitTestFlow() {
    if (m13State.completed) {
      this.showFeedbackMessage('The manifold run is sealed and holding.');
      return;
    }

    const result = submitM13Flow();

    this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_flow_submitted', {
      metadata: {
        valid: result.valid,
        reason: result.reason,
        path_slots: result.path_slots,
      },
    });

    if (!result.valid) {
      const feedback =
        result.reason === 'no_path'
          ? 'The test flow finds no sealed path from the feed to the intake.'
          : result.reason === 'valve_missing'
            ? 'Test flow is not permitted without the isolation valve inline.'
            : 'Flow escapes from an open branch — every joint on the run must mate or be capped.';

      this.showFeedbackMessage(feedback);
      return;
    }

    markOpportunityCompleted(M13_OPPORTUNITY_ID);
    refreshValidityProbe();
    this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_completed', {
      metadata: {
        place_acts: m13State.place_acts,
        rotate_acts: m13State.rotate_acts,
        remove_acts: m13State.remove_acts,
        invalid_submissions: m13State.submissions.filter(
          (entry) => !entry.valid,
        ).length,
      },
    });
    sfxComplete();
    sfxMachineOn();
    ringPulse(this, TRENCH_ORIGIN.x + 40, TRENCH_ORIGIN.y + 40, {
      endRadius: 70,
      rings: 2,
      durationMs: 700,
    });
    showFloatingText(
      this,
      TRENCH_ORIGIN.x + 40,
      TRENCH_ORIGIN.y - 20,
      'Flow holding',
    );

    // The sealed run immediately exposes the standardised residual
    // fault (M18 presentation — fixed constants, puzzle-independent).
    markM18FaultPresented();
    markOpportunityOffered(M18_OPPORTUNITY_ID);
    refreshValidityProbe();
    this.logScenarioEvent(
      'pumpDiagnosticBoard',
      'proto_m18_pressure_fault_presented',
    );
    setRestoreObjective(
      'Diagnose the residual pressure fault at the Diagnostic Board.',
    );
    this.showFeedbackMessage(
      'Test flow holds — but intake pressure stays low. The diagnostic board has the readouts.',
    );
  }

  private buildTrenchOptions(): PromptOption[] {
    if (!m13State.engaged) {
      // Offering the bench through the console counts as engagement
      // exactly like a first physical grab would.
      this.logScenarioEvent('pumpManifoldTrench', 'proto_m13_bench_opened');
    }

    const options: PromptOption[] = [
      {
        label: 'Open the test flow.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.submitTestFlow(),
      },
    ];

    if (!m13State.completed) {
      if (m13BenchPieces().length > 0) {
        options.push({
          label: 'Seat a section…',
          feedback: '',
          getEventTypes: () => [],
          nextStage: () => this.buildSeatStage(),
        });
      }

      const seated = M13_SLOT_IDS.filter(
        (slot) => m13SlotPlacement(slot) !== null,
      );

      if (seated.length > 0) {
        options.push({
          label: 'Rotate a section…',
          feedback: '',
          getEventTypes: () => [],
          nextStage: () => this.buildRotateStage(),
        });
        options.push({
          label: 'Return a section to the bench…',
          feedback: '',
          getEventTypes: () => [],
          nextStage: () => this.buildRemoveStage(),
        });
      }
    }

    options.push({
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private buildSeatStage(): PromptStage {
    // Grouped by section type (identical pieces are interchangeable):
    // the stage always fits the 9-option prompt limit, full bench
    // included (5 types + Back), and the keyboard path stays compact.
    const byType = new Map<
      string,
      { label: string; count: number; firstId: string }
    >();

    for (const piece of m13BenchPieces()) {
      const entry = byType.get(piece.type);

      if (entry === undefined) {
        byType.set(piece.type, {
          label: piece.label,
          count: 1,
          firstId: piece.piece_id,
        });
      } else {
        entry.count += 1;
      }
    }

    return {
      body: 'Bench stock — pick a section to seat.',
      options: [
        ...[...byType.values()].map((entry) => ({
          label: `${entry.label} (${entry.count} on the bench).`,
          feedback: '',
          getEventTypes: () => [],
          nextStage: () => this.buildSlotStage(entry.firstId),
        })),
        { label: 'Back.', feedback: '', getEventTypes: () => [] },
      ],
    };
  }

  private buildSlotStage(pieceId: string): PromptStage {
    const openSlots = M13_SLOT_IDS.filter(
      (slot) => slot !== 'B2' && m13SlotPlacement(slot) === null,
    );

    return {
      body: `Seat ${pieceId} into which mount? (B2 is fractured.)`,
      options: [
        ...openSlots.map((slot) => ({
          label: `Mount ${slot}.`,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            // The card path converges on the same module mutation and
            // the same telemetry as the drag path.
            if (this.trenchCardPlace(pieceId, slot)) {
              sfxUiSelect();
            }
          },
        })),
        { label: 'Back.', feedback: '', getEventTypes: () => [] },
      ],
    };
  }

  private trenchCardPlace(pieceId: string, slot: M13SlotId): boolean {
    if (!placeM13Piece(slot, pieceId)) {
      this.showFeedbackMessage('That mount cannot take the section.');
      return false;
    }

    this.onTrenchAct({ kind: 'placed', slot, piece_id: pieceId });
    this.trench?.sync();

    return true;
  }

  private buildRotateStage(): PromptStage {
    const seated = M13_SLOT_IDS.filter(
      (slot) => m13SlotPlacement(slot) !== null,
    );

    return {
      body: 'Rotate which mount a quarter turn?',
      options: [
        ...seated.map((slot) => ({
          label: `Mount ${slot}.`,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            const placement = m13SlotPlacement(slot);
            const rotation = rotateM13Piece(slot);

            if (rotation !== null && placement !== null) {
              sfxUiSelect();
              this.onTrenchAct({
                kind: 'rotated',
                slot,
                piece_id: placement.piece_id,
                rotation,
              });
              this.trench?.sync();
            }
          },
        })),
        { label: 'Back.', feedback: '', getEventTypes: () => [] },
      ],
    };
  }

  private buildRemoveStage(): PromptStage {
    const seated = M13_SLOT_IDS.filter(
      (slot) => m13SlotPlacement(slot) !== null,
    );

    return {
      body: 'Return which mounted section to the bench?',
      options: [
        ...seated.map((slot) => ({
          label: `Mount ${slot}.`,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            const placement = m13SlotPlacement(slot);

            if (placement !== null && removeM13Piece(slot)) {
              sfxUiSelect();
              this.logScenarioEvent(
                'pumpManifoldTrench',
                'proto_m13_piece_removed',
                {
                  metadata: { slot, piece_id: placement.piece_id },
                },
              );
              this.trench?.sync();
            }
          },
        })),
        { label: 'Back.', feedback: '', getEventTypes: () => [] },
      ],
    };
  }

  // ————————————————————— M18 diagnostic board —————————————————————

  private m18OrderIndex(): number {
    return assignCounterbalance(
      researchRuntime.sessionState.getMetadata().game_session_id,
      'm18_option_order',
      [0, 1, 2, 3],
    );
  }

  private onDiagBoardOpened(): boolean {
    if (!m13State.completed) {
      this.showFeedbackMessage(
        'The diagnostic board waits for a sealed test flow at the trench.',
      );
      return false;
    }

    if (!m18State.fault_presented) {
      markM18FaultPresented();
    }

    return true;
  }

  private buildDiagOptions(): PromptOption[] {
    if (m18DiagnosisSubmitted()) {
      return [
        {
          label: 'Step back.',
          feedback:
            'Diagnosis logged. Prescribed action: replace the relief-valve seal (relief valve, east side).',
          getEventTypes: () => [],
        },
      ];
    }

    const options: PromptOption[] = M18_EVIDENCE.map((evidence) => ({
      label: `Check ${evidence.label}.`,
      feedback: '',
      getEventTypes: () => [],
      nextStage: (): PromptStage => {
        if (!m18State.evidence_checked.includes(evidence.evidence_id)) {
          recordM18EvidenceCheck(evidence.evidence_id as M18EvidenceId);
          this.logScenarioEvent(
            'pumpDiagnosticBoard',
            'proto_m18_evidence_checked',
            { metadata: { evidence_id: evidence.evidence_id } },
          );
        }

        return {
          body: evidence.reading,
          options: [{ label: 'Back.', feedback: '', getEventTypes: () => [] }],
        };
      },
    }));

    options.push({
      label: 'Log the diagnosis…',
      feedback: '',
      getEventTypes: () => [],
      nextStage: () => this.buildDiagnosisStage(),
    });
    options.push({
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private buildDiagnosisStage(): PromptStage {
    const order = M18_OPTION_ORDERS[this.m18OrderIndex()];

    return {
      body: 'Log the single most evidence-consistent diagnosis. This entry is final.',
      options: [
        ...order.map((optionIndex) => {
          const option = M18_OPTIONS[optionIndex];

          return {
            label: option.label,
            feedback: '',
            getEventTypes: () => [],
            onSelected: () => {
              const recorded = submitM18Diagnosis(option.option_id);

              if (recorded === null) {
                return;
              }

              markOpportunityEntered(M18_OPPORTUNITY_ID);
              markOpportunityCompleted(M18_OPPORTUNITY_ID);
              refreshValidityProbe();
              this.logScenarioEvent(
                'pumpDiagnosticBoard',
                'proto_m18_diagnosis_submitted',
                {
                  metadata: {
                    option_id: recorded.option_id,
                    correct: recorded.correct,
                    option_order: this.m18OrderIndex(),
                    evidence_checks: m18State.evidence_checked.length,
                  },
                },
              );
              // Neutral hand-off regardless of correctness (no praise,
              // no correction — the prescribed action is identical).
              setRestoreObjective(
                'Replace the relief-valve seal (Relief Valve, east side).',
              );
              this.showFeedbackMessage(
                'Diagnosis logged. Prescribed action: replace the relief-valve seal (relief valve, east side).',
              );
            },
          };
        }),
        { label: 'Back.', feedback: '', getEventTypes: () => [] },
      ],
    };
  }

  // ————————————————————— M22 relief valve —————————————————————

  private onReliefValveOpened(): boolean {
    if (!m18DiagnosisSubmitted()) {
      this.showFeedbackMessage(
        'The relief valve hums behind its guard. The diagnostic board coordinates any intervention.',
      );
      return false;
    }

    return true;
  }

  private buildReliefOptions(): PromptOption[] {
    if (m22State.seal_seated) {
      return [
        {
          label: 'Step back.',
          feedback: 'The fresh seal holds. Loop B is ready for pump restart.',
          getEventTypes: () => [],
        },
      ];
    }

    if (!m22State.setback_shown) {
      return [
        {
          label: 'Fit the shop-stock seal.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.startShopSealFit(),
        },
        { label: 'Step back.', feedback: '', getEventTypes: () => [] },
      ];
    }

    const options: PromptOption[] = [];

    if (hasInventoryItem('valve_seal')) {
      options.push({
        label: 'Seat the fresh seal.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startFreshSealFit(),
      });
    } else {
      options.push({
        label: 'Inspect the cracked seal.',
        feedback:
          'The shop-stock ring is split through — batch-brittle, not workmanship. A fresh seal is stocked in the Coolant Yard supply crate.',
        getEventTypes: () => [],
      });
    }

    options.push({
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private startShopSealFit() {
    const started = performWorldAction({
      scene: this,
      x: RELIEF_VALVE_POSITION.x,
      y: RELIEF_VALVE_POSITION.y,
      label: 'Seating seal…',
      durationMs: 1300,
      onComplete: () => {
        markM22FixAttempted();
        markM22SetbackShown();
        markOpportunityOffered(M22_OPPORTUNITY_ID);
        markOpportunityEntered(M22_OPPORTUNITY_ID);
        refreshValidityProbe();
        this.logScenarioEvent('pumpReliefValve', 'proto_m22_setback_shown');
        setRestoreObjective(
          'Fetch a fresh valve seal from the Coolant Yard supply crate.',
        );
        this.showFeedbackMessage(M22_SETBACK_EXPLANATION);
      },
    });

    if (started) {
      sfxInstall();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: 'work',
        icon: 'proc-icon-hex-spanner',
        durationMs: 1300,
      });
    }
  }

  private startFreshSealFit() {
    const started = performWorldAction({
      scene: this,
      x: RELIEF_VALVE_POSITION.x,
      y: RELIEF_VALVE_POSITION.y,
      label: 'Seating seal…',
      durationMs: 1300,
      onComplete: () => {
        if (!seatM22Seal()) {
          return;
        }

        removeInventoryItem('valve_seal');
        markOpportunityCompleted(M22_OPPORTUNITY_ID);
        refreshValidityProbe();
        this.logScenarioEvent('pumpReliefValve', 'proto_m22_recovered', {
          metadata: { spare_seal_fetched: m22State.spare_seal_fetched },
        });
        sfxComplete();
        showFloatingText(
          this,
          RELIEF_VALVE_POSITION.x,
          RELIEF_VALVE_POSITION.y,
          'Seal holding',
        );
        setRestoreObjective('Restart the pump at the Interlock Console.');
        this.showFeedbackMessage(
          'The fresh seal seats clean and the relief indicator steadies. Loop B is ready for pump restart.',
        );
      },
    });

    if (started) {
      sfxInstall();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: 'work',
        icon: 'proc-icon-hex-spanner',
        durationMs: 1300,
      });
    }
  }

  // ————————————————————— M25 pump interlock —————————————————————

  private onInterlockOpened(): boolean {
    if (!m22State.seal_seated) {
      this.showFeedbackMessage(
        'The pump waits on the relief-valve work before a restart is permitted.',
      );
      return false;
    }

    if (!this.m25Offered) {
      this.m25Offered = true;
      markOpportunityOffered(M25_OPPORTUNITY_ID);
      refreshValidityProbe();
    }

    return true;
  }

  private m25Offered = false;

  private buildInterlockOptions(): PromptOption[] {
    if (m25State.running) {
      return [
        {
          label: 'Step back.',
          feedback: 'The pump runs steady. Loop B is restored.',
          getEventTypes: () => [],
        },
      ];
    }

    const options: PromptOption[] = [
      {
        label: 'Run a prime cycle.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startPrimeCycle(),
      },
    ];

    if (m25WindowOpen()) {
      options.push({
        label: 'Reset the interlock breaker.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startInterlockReset(),
      });
    }

    options.push({
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private startPrimeCycle() {
    // A post-lock prime is objectively ineffective: no timed work runs,
    // the identical lock statement answers every press, and the press
    // itself is the recorded M25 act.
    if (m25WindowOpen()) {
      const result = pressM25Prime();

      if (result.kind === 'locked') {
        this.logScenarioEvent(
          'pumpInterlockConsole',
          'proto_m25_post_lock_prime',
          { metadata: { post_lock_press_number: result.postLockPresses } },
        );
        this.showFeedbackMessage(M25_LOCK_STATEMENT);
      }

      return;
    }

    const started = performWorldAction({
      scene: this,
      x: INTERLOCK_CONSOLE_POSITION.x,
      y: INTERLOCK_CONSOLE_POSITION.y,
      label: 'Priming…',
      durationMs: 1100,
      onComplete: () => {
        const result = pressM25Prime();

        if (result.kind !== 'cycle') {
          return;
        }

        if (result.cycleNumber === 1) {
          markOpportunityEntered(M25_OPPORTUNITY_ID);
          refreshValidityProbe();
        }

        this.logScenarioEvent('pumpInterlockConsole', 'proto_m25_prime_cycle', {
          metadata: { cycle_number: result.cycleNumber },
        });
        this.showFeedbackMessage(result.readout);

        if (result.lockEngaged) {
          this.logScenarioEvent(
            'pumpInterlockConsole',
            'proto_m25_lock_engaged',
          );
          sfxMachineOn();
        } else {
          sfxInstall();
        }
      },
    });

    if (started) {
      sfxInstall();
    }
  }

  private startInterlockReset() {
    const started = performWorldAction({
      scene: this,
      x: INTERLOCK_CONSOLE_POSITION.x,
      y: INTERLOCK_CONSOLE_POSITION.y,
      label: 'Resetting…',
      durationMs: 1200,
      onComplete: () => {
        if (!resetM25Interlock()) {
          return;
        }

        this.logScenarioEvent('pumpInterlockConsole', 'proto_m25_reset', {
          metadata: { post_lock_primes: m25State.post_lock_primes },
        });
        this.logScenarioEvent('pumpInterlockConsole', 'proto_m25_pump_running');
        markOpportunityCompleted(M25_OPPORTUNITY_ID);
        refreshValidityProbe();
        this.setStationTexture('pumpInterlockConsole', 'proc-machine-fixed');
        sfxComplete();
        sfxMachineOn();
        showFloatingText(
          this,
          INTERLOCK_CONSOLE_POSITION.x,
          INTERLOCK_CONSOLE_POSITION.y,
          'Pump running',
        );
        completeRestoreTask();
        this.showFeedbackMessage(
          'Breaker reset — the pump spins up and Loop B pressure climbs to nominal. The coolant line is restored.',
        );
      },
    });

    if (started) {
      sfxInstall();
    }
  }

  // ————————————————————— Prompt routing —————————————————————

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pumpPressureConsole') {
      if (!coolantRouteState.work_order_read) {
        return PUMP_WORK_ORDER_BODY;
      }

      return yardRecoveryComplete()
        ? 'Loop B pressure holding at 31%. Components recovered — the manifold trench awaits reconstruction.'
        : 'Loop B pressure holding at 31%. The work order stands: recover line components from the yard survey sector.';
    }

    if (interactionKey === 'pumpManifoldTrench') {
      return m13State.completed
        ? 'Manifold run sealed; test flow holding.'
        : 'Manifold trench — seat sections between FEED and INTAKE. The centre mount (B2) is fractured. Sections can also be dragged and clicked directly at the trench.';
    }

    if (interactionKey === 'pumpDiagnosticBoard' && m13State.completed) {
      return 'Residual fault: intake pressure remains low after the rebuild. Review the readouts, then log a diagnosis.';
    }

    if (interactionKey === 'pumpReliefValve' && m22State.setback_shown) {
      return m22State.seal_seated
        ? 'Relief valve: fresh seal seated; indicator steady.'
        : M22_SETBACK_EXPLANATION;
    }

    if (interactionKey === 'pumpInterlockConsole') {
      if (m25State.running) {
        return 'Pump running — Loop B at nominal pressure.';
      }

      return m25WindowOpen()
        ? M25_LOCK_STATEMENT
        : 'Pump restart panel. Prime cycles bring Loop B back up to pressure.';
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'pumpManifoldTrench') {
      return this.buildTrenchOptions();
    }

    if (interactionKey === 'pumpDiagnosticBoard') {
      return this.buildDiagOptions();
    }

    if (interactionKey === 'pumpReliefValve') {
      return this.buildReliefOptions();
    }

    if (interactionKey === 'pumpInterlockConsole') {
      return this.buildInterlockOptions();
    }

    if (interactionKey !== 'pumpPressureConsole') {
      return [];
    }

    if (!coolantRouteState.work_order_read) {
      return [
        {
          label: 'Log the work order.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            markWorkOrderRead();
            sfxUiSelect();
            this.logScenarioEvent(
              'pumpPressureConsole',
              'proto_work_order_read',
            );
            this.showFeedbackMessage(
              'Work order logged. Survey the yard (C to scan inside the staked sector).',
            );
          },
        },
        {
          label: 'Step back.',
          feedback: '',
          getEventTypes: () => [],
        },
      ];
    }

    return [
      {
        label: 'Review the pressure trace.',
        feedback:
          'Loop B: 31% and steady. The fault is in the buried run, not the pump.',
        getEventTypes: () => [],
      },
      { label: 'Step back.', feedback: '', getEventTypes: () => [] },
    ];
  }
}
