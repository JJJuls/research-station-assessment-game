import Phaser from 'phaser';

import { key } from '../constants';
import {
  acceptCoolantInvestigation,
  addInventoryItem,
  burstParticles,
  cameraKick,
  cancelActiveWorldAction,
  coolantRouteState,
  digDeposit,
  FieldActionController,
  flagDeposit,
  getDeposit,
  getGameItem,
  hasInventoryItem,
  insideSector,
  isDepositDug,
  isDepositFlagged,
  markCouplingRecovered,
  performWorldAction,
  playActionAnimation,
  RECLAIMED_SECTOR_BOUNDS,
  recordSurveyScan,
  refreshCoolantObjective,
  registerCoolantTasks,
  removeInventoryItem,
  resolveSurveyScan,
  ringPulse,
  SCAN_ACTIONABLE_RADIUS,
  sfxComplete,
  sfxDig,
  sfxPickup,
  sfxScan,
  showFloatingText,
  snowfall,
  sparkle,
  startWinchCast,
  SURVEY_SECTOR_BOUNDS,
  takeHeatCanister,
  takePryBar,
  YARD_DEPOSITS,
} from '../gameplay';
import {
  acknowledgeM24Exhaustion,
  acknowledgeM26Depletion,
  applyM23Act,
  assignCounterbalance,
  closeM24Window,
  closeM26Window,
  declareOpportunity,
  drawM24Pull,
  ensureM24DeckOrder,
  m22State,
  m22WindowOpen,
  M23_ENTRY_STATE_VERSION,
  M23_OPPORTUNITY_ID,
  m23State,
  M24_ENTRY_STATE_VERSION,
  M24_EXHAUSTION_READOUT,
  M24_OPPORTUNITY_ID,
  m24Exhausted,
  m24State,
  m24WindowOpen,
  M26_DEPLETION_CERTIFICATE,
  M26_ENTRY_STATE_VERSION,
  M26_OPPORTUNITY_ID,
  m26State,
  m26WindowOpen,
  markM22SpareSealFetched,
  markM23Engaged,
  markM24AlternativeTaken,
  markM24ExhaustionShown,
  markM24VerificationScan,
  markM26AlternativeTaken,
  markM26CertificateShown,
  markM26DemoDig,
  markM26DemoScan,
  markM26VerificationScan,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  recordM24PostAckCast,
  recordM26PostAckDig,
  recordM26PostAckScan,
  refreshValidityProbe,
} from '../measurement';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption } from '../world';
import { RoomScene } from '../world';
import type { RoomLayout } from '../world/StationMapBuilder';

/**
 * Coolant Yard (action-assessment rebuild, Unit 2) — `proto_coolant_yard`.
 *
 * The exterior work yard of the coolant red line: free scanner use (C)
 * anywhere inside the staked survey sector, deterministic buried
 * deposits dug out physically (D), the frozen-coupling housing (M23
 * hard-but-attainable extraction with three genuinely useful
 * strategies), and the staked-off Reclaimed Sector (M26 verified-empty
 * bounded search area).
 *
 * Measurement boundaries: proto_m23_* and proto_m26_* are item-local
 * event families over their own module state (src/measurement/
 * m23Excavation.ts, m26DepletedField.ts); yard survey telemetry
 * (proto_yard_*) is route/context data owned by no item. Everything is
 * provisional (`proto_*`), logged via the scenario path only.
 */

const SUPPLY_CRATE_POSITION = { x: 5 * 32, y: 3.5 * 32 };
const HOUSING_POSITION = { x: 12 * 32, y: 14 * 32 };
const RECLAMATION_POST_POSITION = { x: 13.5 * 32, y: 5.5 * 32 };
const RECYCLER_RIG_POSITION = { x: 3 * 32, y: 14 * 32 };
const YARD_TO_FIELD_DOOR = { x: 3.5 * 32, y: 1 * 32 + 16 };
const YARD_TO_PUMP_DOOR = { x: 17.5 * 32, y: 1 * 32 + 16 };

export class CoolantYardScene extends RoomScene {
  protected readonly roomId = 'proto_coolant_yard';
  protected readonly roomInteractionKey: InteractionKey = 'coolantYardArea';

  private actionController?: FieldActionController;
  /** Flag markers rendered for flagged, undug deposits. */
  private depositFlags = new Map<string, Phaser.GameObjects.Image>();
  /** M23 housing progress bar (world-space, above the housing). */
  private housingBarBack?: Phaser.GameObjects.Rectangle;
  private housingBarFill?: Phaser.GameObjects.Rectangle;
  /** Reclaim-credit tally chip (Unit 4 cosmetic economy). */
  private creditsChip?: Phaser.GameObjects.Text;

  constructor() {
    super(key.scene.coolantYard);
  }

  protected getLayout(): RoomLayout {
    // 25×19 exterior yard. North doorways: west pair back to the Survey
    // Terrace, east pair up into the Pump House. Rock outcrops break the
    // snowfield; rows 16-18 are unreachable wall mass filling the
    // viewport (Field terrace precedent).
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '###--############--######',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..##...................#',
        '#.......................#',
        '#.......................#',
        '#............##.........#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..........##...........#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    if (data?.spawn === 'proto_pump_house') {
      return { x: 17.5 * 32, y: 3 * 32 };
    }

    return { x: 3.5 * 32, y: 3 * 32 };
  }

  protected populateRoom(): void {
    registerCoolantTasks();
    acceptCoolantInvestigation();

    // ——— Doors.
    this.addDoor({
      x: YARD_TO_FIELD_DOOR.x,
      y: YARD_TO_FIELD_DOOR.y,
      label: 'Survey Terrace',
      texture: 'prop-hub-door-frame',
      interactionKey: 'coolantYardArea',
      target: {
        sceneKey: key.scene.field,
        roomId: 'proto_field_site',
        spawn: 'proto_coolant_yard',
      },
    });
    this.addDoor({
      x: YARD_TO_PUMP_DOOR.x,
      y: YARD_TO_PUMP_DOOR.y,
      label: 'Pump House',
      texture: 'prop-hub-door-frame',
      interactionKey: 'coolantYardArea',
      target: {
        sceneKey: key.scene.pumpHouse,
        roomId: 'proto_pump_house',
        spawn: 'proto_coolant_yard',
      },
    });

    // ——— SA-13 opportunity declarations (idempotent).
    declareOpportunity({
      opportunity_id: M23_OPPORTUNITY_ID,
      owner: 'M23 (provisional 26-battery)',
      entry_state_version: M23_ENTRY_STATE_VERSION,
    });
    declareOpportunity({
      opportunity_id: M26_OPPORTUNITY_ID,
      owner: 'M26 (provisional 26-battery)',
      entry_state_version: M26_ENTRY_STATE_VERSION,
    });
    markOpportunityOffered(M23_OPPORTUNITY_ID);
    markOpportunityOffered(M26_OPPORTUNITY_ID);
    refreshValidityProbe();

    // ——— Survey sector bounds: corner posts (visual bounds markers).
    for (const corner of [
      { x: SURVEY_SECTOR_BOUNDS.minX, y: SURVEY_SECTOR_BOUNDS.minY },
      { x: SURVEY_SECTOR_BOUNDS.maxX, y: SURVEY_SECTOR_BOUNDS.minY },
      { x: SURVEY_SECTOR_BOUNDS.minX, y: SURVEY_SECTOR_BOUNDS.maxY },
      { x: SURVEY_SECTOR_BOUNDS.maxX, y: SURVEY_SECTOR_BOUNDS.maxY },
    ]) {
      this.addDecor(corner.x, corner.y, 'proc-sector-post');
    }

    // ——— Reclaimed Sector: denser staking (a visibly bounded area).
    for (const corner of [
      { x: RECLAIMED_SECTOR_BOUNDS.minX, y: RECLAIMED_SECTOR_BOUNDS.minY },
      { x: RECLAIMED_SECTOR_BOUNDS.maxX, y: RECLAIMED_SECTOR_BOUNDS.minY },
      { x: RECLAIMED_SECTOR_BOUNDS.minX, y: RECLAIMED_SECTOR_BOUNDS.maxY },
      { x: RECLAIMED_SECTOR_BOUNDS.maxX, y: RECLAIMED_SECTOR_BOUNDS.maxY },
      {
        x: (RECLAIMED_SECTOR_BOUNDS.minX + RECLAIMED_SECTOR_BOUNDS.maxX) / 2,
        y: RECLAIMED_SECTOR_BOUNDS.minY,
      },
      {
        x: (RECLAIMED_SECTOR_BOUNDS.minX + RECLAIMED_SECTOR_BOUNDS.maxX) / 2,
        y: RECLAIMED_SECTOR_BOUNDS.maxY,
      },
    ]) {
      this.addDecor(corner.x, corner.y, 'proc-sector-post');
    }
    // Reclaimed ground reads as already-worked: churned patches.
    this.addDecor(15.5 * 32, 5 * 32, 'proc-ground-disturbed');
    this.addDecor(17 * 32, 6.5 * 32, 'proc-ground-disturbed');
    this.addDecor(18.5 * 32, 5.5 * 32, 'proc-ground-disturbed');
    this.addDecor(16 * 32, 6 * 32, 'proc-dig-mound');

    // ——— Stations.
    this.addStation({
      interactionKey: 'coolantSupplyCrate',
      label: 'Yard Supply Crate',
      texture: 'proc-crate-supply',
      x: SUPPLY_CRATE_POSITION.x,
      y: SUPPLY_CRATE_POSITION.y,
    });
    this.addStation({
      interactionKey: 'coolantFrozenHousing',
      label: 'Frozen Coupling Housing',
      texture: 'proc-housing-frozen',
      x: HOUSING_POSITION.x,
      y: HOUSING_POSITION.y,
      onPromptOpened: () => this.onHousingOpened(),
    });
    this.addStation({
      interactionKey: 'coolantReclamationPost',
      label: 'Reclamation Post',
      texture: 'proc-reclamation-post',
      x: RECLAMATION_POST_POSITION.x,
      y: RECLAMATION_POST_POSITION.y,
      onPromptOpened: () => this.onReclamationPostOpened(),
    });

    // ——— Unit 4: the Recycler Catchment rig (M24). The controlled
    // reward deck's ORDER is counterbalanced per session and recorded;
    // rewards are cosmetic reclaim credits only.
    ensureM24DeckOrder(
      assignCounterbalance(
        researchRuntime.sessionState.getMetadata().game_session_id,
        'm24_deck_order',
        [0, 1, 2],
      ),
    );
    declareOpportunity({
      opportunity_id: M24_OPPORTUNITY_ID,
      owner: 'M24 (provisional 26-battery)',
      entry_state_version: M24_ENTRY_STATE_VERSION,
      counterbalance: `deck_order_${m24State.deck_order}`,
    });
    markOpportunityOffered(M24_OPPORTUNITY_ID);
    this.addStation({
      interactionKey: 'coolantRecyclerRig',
      label: 'Recycler Catchment',
      texture: 'proc-rig-recycler',
      x: RECYCLER_RIG_POSITION.x,
      y: RECYCLER_RIG_POSITION.y,
    });

    // Participant-visible reclaim-credit tally (cosmetic economy only;
    // never gates or eases any scored task).
    this.creditsChip = this.add
      .text(8, 56, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '12px monospace',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0)
      .setDepth(20)
      .setScrollFactor(0)
      .setVisible(false);

    // ——— Persistent world state re-render (flags, spoil, housing).
    for (const deposit of YARD_DEPOSITS) {
      if (isDepositDug(deposit.deposit_id)) {
        this.addDecor(deposit.x - 2, deposit.y + 14, 'proc-ground-disturbed');
        this.addDecor(deposit.x + 16, deposit.y + 4, 'proc-dig-mound');
      } else if (isDepositFlagged(deposit.deposit_id)) {
        this.renderDepositFlag(deposit.deposit_id);
      }
    }

    this.buildHousingProgressBar();

    // ——— Set dressing.
    this.addDecor(21 * 32, 3 * 32, 'proc-station-module');
    this.addDecor(22.5 * 32, 12 * 32, 'proc-beacon-comms');
    this.addDecor(2 * 32, 12.5 * 32, 'proc-cart-utility');
    this.addDecor(20 * 32, 14.5 * 32, 'prop-dock-crates');
    snowfall(this, {
      width: this.roomMap.widthInPixels,
      height: this.roomMap.heightInPixels,
      seed: 0xc001a171,
      count: 34,
    });

    // ——— C/D field-action bindings (the yard's core action language).
    this.actionController = new FieldActionController(this, () =>
      this.physicalInputEligible(),
    );
    this.actionController.setBindings([
      {
        key: 'C',
        label: 'Scan',
        getTarget: () => this.scanTarget(),
        perform: () => this.startYardScan(),
        onIneligiblePress: () => {
          if (!hasInventoryItem('field_scanner')) {
            if (this.insideAnySector()) {
              this.showFeedbackMessage(
                'A subsurface sweep needs the Field Scanner from the Hub requisition.',
              );
            }
            return;
          }

          if (!this.insideAnySector()) {
            this.showFeedbackMessage(
              'The scanner only reads inside the staked survey sectors.',
            );
          }
        },
      },
      {
        key: 'F',
        label: 'Winch',
        getTarget: () => this.recyclerTarget(),
        perform: () => this.startRecyclerCast(),
      },
      {
        key: 'D',
        label: 'Dig',
        getTarget: () => this.digTarget(),
        perform: (target) => this.startYardDig(target),
        onIneligiblePress: () => {
          if (!hasInventoryItem('excavation_spade')) {
            if (this.insideAnySector()) {
              this.showFeedbackMessage(
                'Breaking ground needs the Excavation Spade from the Hub requisition.',
              );
            }
            return;
          }

          if (
            insideSector(SURVEY_SECTOR_BOUNDS, this.player.x, this.player.y)
          ) {
            this.showFeedbackMessage(
              'No staked deposit in reach — run a scanner pass (C) first.',
            );
          }
        },
      },
    ]);
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('coolantYardArea', 'proto_yard_entered');
  }

  protected onRoomUpdate(): void {
    this.actionController?.update();
    this.updateHousingProgressBar();
    this.updateCreditsChip();

    // M24 neutral alternative: with the window open, moving clear of
    // the rig (back toward the shift's remaining work) is the
    // alternative act — recorded once, never gated.
    if (
      m24WindowOpen() &&
      !m24State.alternative_taken &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        RECYCLER_RIG_POSITION.x,
        RECYCLER_RIG_POSITION.y,
      ) > 150
    ) {
      markM24AlternativeTaken();
      this.logScenarioEvent(
        'coolantRecyclerRig',
        'proto_m24_alternative_taken',
      );
    }

    // Taking the neutral alternative: with the M26 window open, moving
    // clear of the staked bounds (back toward the parts run) is the
    // alternative act — recorded once, never gated, fully reversible.
    if (
      m26WindowOpen() &&
      !m26State.alternative_taken &&
      !insideSector(RECLAIMED_SECTOR_BOUNDS, this.player.x, this.player.y) &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        RECLAMATION_POST_POSITION.x,
        RECLAMATION_POST_POSITION.y,
      ) > 96
    ) {
      markM26AlternativeTaken();
      this.logScenarioEvent(
        'coolantReclamationPost',
        'proto_m26_alternative_taken',
      );
    }
  }

  protected onRoomExit(): void {
    // A cancellable action must never survive into a room transition.
    cancelActiveWorldAction();

    if (m24WindowOpen()) {
      closeM24Window();
      markOpportunityCompleted(M24_OPPORTUNITY_ID);
      this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_closed', {
        metadata: {
          post_ack_casts: m24State.post_ack_casts,
          alternative_taken: m24State.alternative_taken,
        },
      });
      refreshValidityProbe();
    }

    if (m26WindowOpen()) {
      closeM26Window();
      markOpportunityCompleted(M26_OPPORTUNITY_ID);
      this.logScenarioEvent('coolantReclamationPost', 'proto_m26_closed', {
        metadata: {
          post_ack_scans: m26State.post_ack_scans,
          post_ack_digs: m26State.post_ack_digs,
          alternative_taken: m26State.alternative_taken,
        },
      });
      refreshValidityProbe();
    }
  }

  // ————————————————————————— Scanning (C) —————————————————————————

  private insideAnySector(): boolean {
    return (
      insideSector(SURVEY_SECTOR_BOUNDS, this.player.x, this.player.y) ||
      insideSector(RECLAIMED_SECTOR_BOUNDS, this.player.x, this.player.y)
    );
  }

  /** C target: the player's own position inside an eligible sector
   * (handheld scanner), or the recycler rig once its exhaustion readout
   * invites verification (the RIG'S OWN sonar head — no handheld
   * required, so the verification is never gated by kit state). */
  private scanTarget(): { x: number; y: number } | null {
    if (
      m24State.exhaustion_shown &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        RECYCLER_RIG_POSITION.x,
        RECYCLER_RIG_POSITION.y,
      ) <= 96
    ) {
      return { x: RECYCLER_RIG_POSITION.x, y: RECYCLER_RIG_POSITION.y };
    }

    if (!hasInventoryItem('field_scanner') || !this.insideAnySector()) {
      return null;
    }

    return { x: this.player.x, y: this.player.y };
  }

  private startYardScan() {
    const x = this.player.x;
    const y = this.player.y;
    const started = performWorldAction({
      scene: this,
      x,
      y,
      label: 'Scanning…',
      durationMs: 1200,
      cancellable: true,
      onComplete: () => this.finishYardScan(x, y),
    });

    if (started) {
      sfxScan();
      playActionAnimation({
        scene: this,
        x,
        y,
        kind: 'scan',
        icon: 'proc-icon-field-scanner',
        durationMs: 1200,
      });
      // The sweep visualises the actionable radius truthfully.
      ringPulse(this, x, y, {
        endRadius: SCAN_ACTIONABLE_RADIUS,
        rings: 2,
        durationMs: 640,
      });
    }
  }

  private finishYardScan(x: number, y: number) {
    // M24 verification: a sweep over the exhausted catchment.
    if (
      m24State.exhaustion_shown &&
      Phaser.Math.Distance.Between(
        x,
        y,
        RECYCLER_RIG_POSITION.x,
        RECYCLER_RIG_POSITION.y,
      ) <= 96
    ) {
      if (!m24State.acknowledged && !m24State.verification_scan_done) {
        markM24VerificationScan();
        this.logScenarioEvent(
          'coolantRecyclerRig',
          'proto_m24_verification_scan',
        );
      }

      this.showFeedbackMessage(
        'Sonar sweep: zero return from the catchment — the sump is empty.',
      );
      return;
    }

    if (insideSector(RECLAIMED_SECTOR_BOUNDS, x, y)) {
      this.finishReclaimedScan();
      return;
    }

    recordSurveyScan();

    const outcome = resolveSurveyScan(x, y);

    if (outcome.result === 'actionable') {
      flagDeposit(outcome.deposit.deposit_id);
      this.renderDepositFlag(outcome.deposit.deposit_id);
      this.logScenarioEvent('coolantYardArea', 'proto_yard_scan', {
        metadata: {
          result: 'actionable',
          deposit_id: outcome.deposit.deposit_id,
        },
      });
      this.logScenarioEvent('coolantYardArea', 'proto_yard_deposit_flagged', {
        metadata: { deposit_id: outcome.deposit.deposit_id },
      });
      markM26DemoScan();
      sfxComplete();
      ringPulse(this, outcome.deposit.x, outcome.deposit.y, {
        endRadius: 30,
        rings: 1,
        durationMs: 420,
      });
      showFloatingText(
        this,
        outcome.deposit.x,
        outcome.deposit.y,
        'Deposit staked',
      );
      this.showFeedbackMessage(
        'Actionable return — the deposit is staked for digging (D).',
      );
      return;
    }

    if (outcome.result === 'weak') {
      const bearing = this.bearingLabel(
        outcome.deposit.x - x,
        outcome.deposit.y - y,
      );

      this.logScenarioEvent('coolantYardArea', 'proto_yard_scan', {
        metadata: { result: 'weak' },
      });
      this.showFeedbackMessage(
        `Faint return to the ${bearing} — move that way and sweep again.`,
      );
      return;
    }

    this.logScenarioEvent('coolantYardArea', 'proto_yard_scan', {
      metadata: { result: 'none' },
    });
    this.showFeedbackMessage('No signal under this ground.');
  }

  private finishReclaimedScan() {
    if (m26WindowOpen()) {
      const count = recordM26PostAckScan();

      this.logScenarioEvent('coolantReclamationPost', 'proto_m26_search_scan', {
        metadata: { post_ack_scan_number: count },
      });
      this.showFeedbackMessage('No return — the certified ground is empty.');
      return;
    }

    if (m26State.certificate_shown && !m26State.acknowledged) {
      markM26VerificationScan();
      this.logScenarioEvent(
        'coolantReclamationPost',
        'proto_m26_verification_scan',
      );
      this.showFeedbackMessage(
        'No return anywhere in the staked bounds — the certificate reads true.',
      );
      return;
    }

    this.logScenarioEvent('coolantReclamationPost', 'proto_m26_pre_ack_scan');
    this.showFeedbackMessage(
      'No return. The reclamation post at the sector edge holds the salvage record.',
    );
  }

  private bearingLabel(dx: number, dy: number): string {
    const angle = Math.atan2(dy, dx);
    const compass = [
      'east',
      'south-east',
      'south',
      'south-west',
      'west',
      'north-west',
      'north',
      'north-east',
    ];
    const index = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;

    return compass[index];
  }

  // ————————————————————————— Digging (D) —————————————————————————

  private digTarget(): { x: number; y: number } | null {
    if (!hasInventoryItem('excavation_spade')) {
      return null;
    }

    // Staked survey-sector deposit in reach.
    for (const deposit of YARD_DEPOSITS) {
      if (
        isDepositFlagged(deposit.deposit_id) &&
        !isDepositDug(deposit.deposit_id) &&
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          deposit.x,
          deposit.y,
        ) <= 72
      ) {
        return { x: deposit.x, y: deposit.y };
      }
    }

    // The certified-empty Reclaimed Sector: bare ground digs are always
    // possible inside the staked bounds (they simply yield nothing).
    if (insideSector(RECLAIMED_SECTOR_BOUNDS, this.player.x, this.player.y)) {
      return { x: this.player.x, y: this.player.y };
    }

    // The frozen housing in reach: D routes to the M23 spade act.
    if (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        HOUSING_POSITION.x,
        HOUSING_POSITION.y,
      ) <= 72 &&
      !m23State.completed
    ) {
      return { x: HOUSING_POSITION.x, y: HOUSING_POSITION.y };
    }

    return null;
  }

  private startYardDig(target: { x: number; y: number }) {
    // Housing in reach → the M23 spade act.
    if (
      target.x === HOUSING_POSITION.x &&
      target.y === HOUSING_POSITION.y &&
      !insideSector(RECLAIMED_SECTOR_BOUNDS, this.player.x, this.player.y)
    ) {
      this.startHousingAct('dig');
      return;
    }

    const deposit = YARD_DEPOSITS.find(
      (entry) => entry.x === target.x && entry.y === target.y,
    );

    const started = performWorldAction({
      scene: this,
      x: target.x,
      y: target.y,
      label: 'Digging…',
      durationMs: 1500,
      cancellable: true,
      onComplete: () =>
        deposit !== undefined
          ? this.finishDepositDig(deposit.deposit_id)
          : this.finishReclaimedDig(target),
    });

    if (started) {
      sfxDig();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: 'dig',
        icon: 'proc-icon-excavation-spade',
        durationMs: 1500,
      });
      burstParticles(this, target.x, target.y + 8, {
        colors: [0xc9d9e6, 0xaebfd0, 0x8fa1ab],
        seed: 0xc001d160,
        count: 7,
        speed: 40,
      });
    }
  }

  private finishDepositDig(depositId: string) {
    const deposit = getDeposit(depositId);

    if (!digDeposit(depositId)) {
      this.showFeedbackMessage(
        'Your equipment belt is full — make room before recovering the find.',
      );
      return;
    }

    // Terrain visibly changes; the flag comes down.
    this.depositFlags.get(depositId)?.destroy();
    this.depositFlags.delete(depositId);
    this.addDecor(deposit.x - 2, deposit.y + 14, 'proc-ground-disturbed');
    this.addDecor(deposit.x + 16, deposit.y + 4, 'proc-dig-mound');
    sfxDig();
    cameraKick(this);
    this.logScenarioEvent('coolantYardArea', 'proto_yard_dig', {
      metadata: {
        deposit_id: depositId,
        yield_item_id: deposit.yield_item_id,
      },
    });

    if (deposit.yield_item_id === null) {
      this.showFeedbackMessage('The pocket is empty — logged and backfilled.');
      return;
    }

    markM26DemoDig();

    const item = getGameItem(deposit.yield_item_id);

    sfxPickup();
    showFloatingText(this, deposit.x, deposit.y, `+ ${item.label}`);
    this.showFeedbackMessage(`Recovered: ${item.label}.`);
  }

  private finishReclaimedDig(target: { x: number; y: number }) {
    this.addDecor(target.x - 2, target.y + 14, 'proc-ground-disturbed');

    if (m26WindowOpen()) {
      const count = recordM26PostAckDig();

      this.logScenarioEvent('coolantReclamationPost', 'proto_m26_search_dig', {
        metadata: { post_ack_dig_number: count },
      });
      this.showFeedbackMessage('Nothing — the certified ground is empty.');
      return;
    }

    this.logScenarioEvent('coolantReclamationPost', 'proto_m26_pre_ack_dig');
    this.showFeedbackMessage(
      'Nothing here. The reclamation post at the sector edge holds the salvage record.',
    );
  }

  // ————————————————————— M23 frozen housing —————————————————————

  private onHousingOpened(): boolean {
    if (!m23State.engaged) {
      markM23Engaged();
      markOpportunityEntered(M23_OPPORTUNITY_ID);
      refreshValidityProbe();
      this.logScenarioEvent('coolantFrozenHousing', 'proto_m23_engaged');
    }

    return true;
  }

  private buildHousingOptions(): PromptOption[] {
    if (coolantRouteState.coupling_recovered) {
      return [
        {
          label: 'Step back.',
          feedback: 'The housing is open and the line stub is capped.',
          getEventTypes: () => [],
        },
      ];
    }

    if (m23State.completed) {
      return [
        {
          label: 'Take the coolant coupling.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.takeCoupling(),
        },
        { label: 'Step back.', feedback: '', getEventTypes: () => [] },
      ];
    }

    const options: PromptOption[] = [];

    if (hasInventoryItem('excavation_spade')) {
      options.push({
        label: 'Work the ice with the spade.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startHousingAct('dig'),
      });
    }

    if (hasInventoryItem('heat_canister')) {
      options.push({
        label: 'Apply a heat canister.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startHousingAct('heat'),
      });
    }

    if (hasInventoryItem('pry_bar')) {
      options.push({
        label: 'Lever the housing with the pry bar.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startHousingAct('pry'),
      });
    }

    if (options.length === 0) {
      options.push({
        label: 'Inspect the housing.',
        feedback:
          'The coupling is seized under blue ice. Spade work, heat or leverage could free it — the yard supply crate stocks field tools.',
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

  private startHousingAct(kind: 'dig' | 'heat' | 'pry') {
    if (m23State.completed) {
      return;
    }

    if (!m23State.engaged) {
      this.onHousingOpened();
    }

    const labels = {
      dig: 'Working the ice…',
      heat: 'Thawing…',
      pry: 'Levering…',
    } as const;
    const durations = { dig: 1200, heat: 900, pry: 1000 } as const;
    const started = performWorldAction({
      scene: this,
      x: HOUSING_POSITION.x,
      y: HOUSING_POSITION.y,
      label: labels[kind],
      durationMs: durations[kind],
      cancellable: true,
      onComplete: () => this.finishHousingAct(kind),
    });

    if (started) {
      sfxDig();
      playActionAnimation({
        scene: this,
        x: this.player.x,
        y: this.player.y,
        kind: kind === 'heat' ? 'work' : 'dig',
        icon:
          kind === 'dig'
            ? 'proc-icon-excavation-spade'
            : kind === 'heat'
              ? 'proc-icon-heat-canister'
              : 'proc-icon-pry-bar',
        durationMs: durations[kind],
      });
    }
  }

  private finishHousingAct(kind: 'dig' | 'heat' | 'pry') {
    const act = applyM23Act(kind, {
      heatAvailable: hasInventoryItem('heat_canister'),
    });

    if (act.effective && kind === 'heat') {
      // The canister is single-use; consumption is the host's job.
      removeInventoryItem('heat_canister');
    }

    this.logScenarioEvent('coolantFrozenHousing', 'proto_m23_act', {
      metadata: {
        kind: act.kind,
        effective: act.effective,
        progress_after: act.progress_after,
      },
    });

    burstParticles(this, HOUSING_POSITION.x, HOUSING_POSITION.y, {
      colors:
        kind === 'heat'
          ? [0xd9a441, 0xb08334, 0xc9d9e6]
          : [0xdde9f2, 0xc9d9e6, 0x8fa1ab],
      seed: 0xc001ac70 + m23State.acts.length,
      count: 8,
      speed: 45,
    });

    if (!act.effective) {
      this.showFeedbackMessage(
        kind === 'pry'
          ? 'The bar finds no purchase yet — the housing needs more give first.'
          : kind === 'heat'
            ? 'No canister charge left to apply.'
            : 'The spade skates off the blue ice — progress is slow here.',
      );
      // An ineffective act still shows the unchanged gauge truthfully.
      showFloatingText(
        this,
        HOUSING_POSITION.x,
        HOUSING_POSITION.y,
        `${m23State.progress}%`,
      );
      return;
    }

    showFloatingText(
      this,
      HOUSING_POSITION.x,
      HOUSING_POSITION.y,
      `${m23State.progress}%`,
    );

    if (m23State.completed) {
      sfxComplete();
      cameraKick(this);
      this.logScenarioEvent('coolantFrozenHousing', 'proto_m23_completed', {
        metadata: { acts: m23State.acts.length },
      });
      this.showFeedbackMessage(
        'The housing gives — the coolant coupling is free. Take it from the housing.',
      );
      this.takeCoupling();
      return;
    }

    if (kind === 'heat') {
      this.showFeedbackMessage('The ice sheath slumps — the housing loosens.');
    } else if (kind === 'pry') {
      this.showFeedbackMessage('The housing shifts on its bed.');
    } else {
      this.showFeedbackMessage('Ice chips away from the housing.');
    }
  }

  private takeCoupling() {
    if (coolantRouteState.coupling_recovered) {
      return;
    }

    if (!addInventoryItem('coolant_coupling')) {
      this.showFeedbackMessage(
        'Your equipment belt is full — make room, then take the coupling from the housing.',
      );
      return;
    }

    // Route + validity closure for M23.
    sfxPickup();
    showFloatingText(
      this,
      HOUSING_POSITION.x,
      HOUSING_POSITION.y,
      '+ Coolant Coupling',
    );
    this.logScenarioEvent('coolantFrozenHousing', 'proto_m23_coupling_taken');
    markOpportunityCompleted(M23_OPPORTUNITY_ID);
    refreshValidityProbe();
    markCouplingRecovered();
  }

  // ————————————————————— M24 recycler catchment —————————————————————

  /** F target: the rig, in reach (casting stays available always —
   * stopping and continuing must remain equally accessible). */
  private recyclerTarget(): { x: number; y: number } | null {
    return Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      RECYCLER_RIG_POSITION.x,
      RECYCLER_RIG_POSITION.y,
    ) <= 72
      ? RECYCLER_RIG_POSITION
      : null;
  }

  /** One full electromagnet cast — the single flow behind BOTH the F
   * key and the rig's prompt-card option (identical deck, identical
   * telemetry). */
  private startRecyclerCast() {
    startWinchCast({
      scene: this,
      x: RECYCLER_RIG_POSITION.x,
      y: RECYCLER_RIG_POSITION.y,
      onResolved: (hit) => this.resolveRecyclerCast(hit),
    });
  }

  private resolveRecyclerCast(hit: boolean) {
    // Post-acknowledgement identical casts: the M24 record. By deck
    // construction NOTHING can come up — jackpot included.
    if (m24WindowOpen()) {
      const count = recordM24PostAckCast();

      this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_post_ack_cast', {
        metadata: { post_ack_cast_number: count, hook_set: hit },
      });
      this.showFeedbackMessage(
        hit
          ? 'The magnet comes up bare — the catchment holds nothing.'
          : 'The magnet swings clear and comes up bare.',
      );
      return;
    }

    // Between the exhaustion readout and the acknowledgement: recorded
    // as pre-acknowledgement context, never primary evidence.
    if (m24Exhausted()) {
      this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_pre_ack_cast', {
        metadata: { hook_set: hit },
      });
      this.showFeedbackMessage(
        'The magnet comes up bare. The rig readout stands: CATCHMENT CLEAR.',
      );
      return;
    }

    // Useful phase: misses cost only the cast; hits draw the deck.
    if (!hit) {
      this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_miss');
      this.showFeedbackMessage(
        'The magnet swings clear of the sump grate. The line comes up empty.',
      );
      return;
    }

    const pull = drawM24Pull();

    if (pull === null) {
      return;
    }

    this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_pull', {
      metadata: {
        pull_id: pull.pull_id,
        tier: pull.tier,
        credits: pull.credits,
        pull_number: m24State.pulls.length,
        deck_order: m24State.deck_order,
      },
    });
    sfxComplete();
    sparkle(this, RECYCLER_RIG_POSITION.x, RECYCLER_RIG_POSITION.y - 8);
    showFloatingText(
      this,
      RECYCLER_RIG_POSITION.x,
      RECYCLER_RIG_POSITION.y,
      pull.credits > 0 ? `+ ${pull.label} (${pull.credits} cr)` : pull.label,
    );
    this.showFeedbackMessage(
      pull.credits > 0
        ? `The winch lands a ${pull.label} — ${pull.credits} reclaim credits to the yard tally.`
        : 'The sling comes up empty this time.',
    );

    // The sixth pull empties the deck: the exhaustion readout presents
    // IMMEDIATELY and no further pull can ever occur.
    if (m24Exhausted()) {
      markM24ExhaustionShown();
      this.logScenarioEvent('coolantRecyclerRig', 'proto_m24_exhaustion_shown');
      this.showFeedbackMessage(
        'Rig readout — CATCHMENT CLEAR: the sump is empty; further casts return nothing. Verify with a scanner sweep (C) and log it at the rig.',
      );
    }
  }

  private buildRecyclerOptions(): PromptOption[] {
    const options: PromptOption[] = [
      {
        label: 'Lower the magnet.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.startRecyclerCast(),
      },
    ];

    if (m24State.exhaustion_shown && !m24State.acknowledged) {
      options.push({
        label: 'Acknowledge the empty catchment.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          if (acknowledgeM24Exhaustion()) {
            markOpportunityEntered(M24_OPPORTUNITY_ID);
            refreshValidityProbe();
            this.logScenarioEvent(
              'coolantRecyclerRig',
              'proto_m24_acknowledged',
              {
                metadata: {
                  verification_scan_done: m24State.verification_scan_done,
                },
              },
            );
            this.showFeedbackMessage(
              'Acknowledged: the catchment holds nothing. The shift continues at the Pump House trench.',
            );
          }
        },
      });
    }

    options.push({
      label: 'Step back.',
      feedback: '',
      getEventTypes: () => [],
    });

    return options;
  }

  private updateCreditsChip() {
    if (this.creditsChip === undefined) {
      return;
    }

    if (m24State.pulls.length === 0) {
      this.creditsChip.setVisible(false);
      return;
    }

    this.creditsChip
      .setText(`Reclaim credits: ${m24State.credits}`)
      .setVisible(true);
  }

  // ————————————————————— M26 reclamation post —————————————————————

  private onReclamationPostOpened(): boolean {
    if (!m26State.certificate_shown) {
      markM26CertificateShown();
      this.logScenarioEvent(
        'coolantReclamationPost',
        'proto_m26_certificate_shown',
      );
    }

    return true;
  }

  private buildReclamationOptions(): PromptOption[] {
    if (m26State.acknowledged) {
      return [
        {
          label: 'Step back.',
          feedback:
            'Certificate acknowledged. The Pump House parts run continues at the manifold trench.',
          getEventTypes: () => [],
        },
      ];
    }

    return [
      {
        label: 'Acknowledge the salvage certificate.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          if (acknowledgeM26Depletion()) {
            markOpportunityEntered(M26_OPPORTUNITY_ID);
            refreshValidityProbe();
            this.logScenarioEvent(
              'coolantReclamationPost',
              'proto_m26_acknowledged',
              {
                metadata: {
                  verification_scan_done: m26State.verification_scan_done,
                },
              },
            );
            this.showFeedbackMessage(
              'Acknowledged: the sector holds nothing. The Pump House parts run continues at the manifold trench.',
            );
            refreshCoolantObjective();
          }
        },
      },
      {
        label: 'Step back.',
        feedback: '',
        getEventTypes: () => [],
      },
    ];
  }

  // ————————————————————— Supply crate + prompts —————————————————————

  private buildSupplyOptions(): PromptOption[] {
    const options: PromptOption[] = [];

    // M22 recovery route: the fresh seal is stocked here; the option
    // exists exactly while the standardised setback window is open.
    if (
      m22WindowOpen() &&
      !m22State.spare_seal_fetched &&
      !hasInventoryItem('valve_seal')
    ) {
      options.push({
        label: 'Take a replacement valve seal.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          if (addInventoryItem('valve_seal')) {
            markM22SpareSealFetched();
            sfxPickup();
            this.logScenarioEvent(
              'coolantSupplyCrate',
              'proto_m22_spare_seal_taken',
            );
            this.showFeedbackMessage(
              'Fresh valve seal stowed. The relief valve is in the Pump House, east side.',
            );
          } else {
            this.showFeedbackMessage(
              'Your equipment belt is full — make room first.',
            );
          }
        },
      });
    }

    if (!coolantRouteState.heat_canister_taken) {
      options.push({
        label: 'Take a heat canister.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          if (takeHeatCanister()) {
            sfxPickup();
            this.logScenarioEvent('coolantSupplyCrate', 'proto_supply_taken', {
              metadata: { item_id: 'heat_canister' },
            });
            this.showFeedbackMessage('Heat canister stowed on the belt.');
          } else {
            this.showFeedbackMessage(
              'Your equipment belt is full — make room first.',
            );
          }
        },
      });
    }

    if (!coolantRouteState.pry_bar_taken) {
      options.push({
        label: 'Take the pry bar.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          if (takePryBar()) {
            sfxPickup();
            this.logScenarioEvent('coolantSupplyCrate', 'proto_supply_taken', {
              metadata: { item_id: 'pry_bar' },
            });
            this.showFeedbackMessage('Pry bar stowed on the belt.');
          } else {
            this.showFeedbackMessage(
              'Your equipment belt is full — make room first.',
            );
          }
        },
      });
    }

    if (options.length === 0) {
      options.push({
        label: 'Close the crate.',
        feedback: 'Only packing straps left inside.',
        getEventTypes: () => [],
      });
    } else {
      options.push({
        label: 'Close the crate.',
        feedback: '',
        getEventTypes: () => [],
      });
    }

    return options;
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'coolantReclamationPost') {
      return M26_DEPLETION_CERTIFICATE;
    }

    if (interactionKey === 'coolantRecyclerRig') {
      const recovered =
        m24State.pulls.length === 0
          ? 'Nothing recovered yet.'
          : `Recovered so far: ${m24State.pulls.join(', ')} — ${m24State.credits} reclaim credits.`;

      return m24State.exhaustion_shown
        ? `${M24_EXHAUSTION_READOUT} ${recovered}`
        : `Recycler Catchment — the winch reads reclaimable material in the sump. F casts the electromagnet. ${recovered}`;
    }

    if (interactionKey === 'coolantFrozenHousing') {
      return m23State.completed || coolantRouteState.coupling_recovered
        ? 'The housing is open; the freed line stub is capped and safe.'
        : `Coupling housing, iced solid. Freed: ${m23State.progress}%.`;
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'coolantSupplyCrate') {
      return this.buildSupplyOptions();
    }

    if (interactionKey === 'coolantRecyclerRig') {
      return this.buildRecyclerOptions();
    }

    if (interactionKey === 'coolantFrozenHousing') {
      return this.buildHousingOptions();
    }

    if (interactionKey === 'coolantReclamationPost') {
      return this.buildReclamationOptions();
    }

    return [];
  }

  // ————————————————————— Rendering helpers —————————————————————

  private renderDepositFlag(depositId: string) {
    if (this.depositFlags.has(depositId)) {
      return;
    }

    const deposit = getDeposit(depositId);
    const flag = this.add
      .image(deposit.x, deposit.y - 6, 'proc-survey-stake-flagged')
      .setDepth(2);

    this.depositFlags.set(depositId, flag);
  }

  private buildHousingProgressBar() {
    this.housingBarBack = this.add
      .rectangle(
        HOUSING_POSITION.x - 30,
        HOUSING_POSITION.y - 40,
        60,
        7,
        0x101820,
        1,
      )
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x33475a)
      .setDepth(20);
    this.housingBarFill = this.add
      .rectangle(
        HOUSING_POSITION.x - 28,
        HOUSING_POSITION.y - 40,
        1,
        3,
        0x5fd3c4,
        1,
      )
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.updateHousingProgressBar();
  }

  private updateHousingProgressBar() {
    if (
      this.housingBarBack === undefined ||
      this.housingBarFill === undefined
    ) {
      return;
    }

    const done = m23State.completed || coolantRouteState.coupling_recovered;

    this.housingBarBack.setVisible(!done);
    this.housingBarFill.setVisible(!done && m23State.progress > 0);

    if (!done) {
      this.housingBarFill.width = Math.max(1, (m23State.progress / 100) * 56);
    }
  }
}
