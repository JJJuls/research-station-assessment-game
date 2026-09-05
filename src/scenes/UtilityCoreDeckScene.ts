/**
 * Utility Deck — pilot zone 6, part 1 (evidence-led pilot v2, Unit 6).
 *
 * The NON-SCORED closure of the shift (decision workbook sheet 11 row 6):
 * no item window lives here. The deck hosts —
 *
 * - the SHIFT REVIEW PANEL: the explicit, two-step closure of the station
 *   record (the committed review-closure model of Units 2–5: every open
 *   window closes with its honest disposition — censored / observation /
 *   absent — never a low value). This is the readiness step: Core access
 *   depends on every scheduled opportunity being TERMINAL in the live
 *   register afterwards, never on task success;
 * - three PHYSICAL feeds in operational order — coolant feed valve →
 *   calibration breaker → distribution bus — each a close-up manipulation
 *   (FeedPanelScene) whose result is visible in the world (station art,
 *   conduits, manifold lamps, the Core door lamp);
 * - the CORE CHAMBER door (north alcove): gated on readiness + the three
 *   feeds; sealed attempts get one concise neutral operational reason;
 *   bidirectional once open.
 *
 * Every event here is `pilot_closure_*` route context (non-scored); the
 * scene never reads a task outcome, never computes a score, never
 * performs a Qualtrics return (a future unit) and never calls the
 * runtime's debug completion (which would touch the summary/scoring path).
 */
import Phaser from 'phaser';

import { Depth, DepthLayer, key, worldDepth } from '../constants';
import { sfxMachineOn, sfxUnavailable } from '../gameplay/audio';
import { prefersReducedMotion } from '../inventory/ui/theme';
import {
  armRecordReview,
  closeStationRecord,
  closureFeeds,
  coreAccessReady,
  currentRouteReadiness,
  currentUtilityState,
  devInspectionActive,
  disarmRecordReview,
  installClosureLogSink,
  noteCoreDoor,
  noteFeedPanelOpened,
  noteFeedRefused,
  refreshClosureProbe,
  reviewArmed,
  stationRecordClosed,
  syncCoreAccess,
} from '../pilot/closure/closureSession';
import {
  allFeedsReady,
  FEED_ORDER,
  feedAvailability,
  type FeedId,
  feedReady,
  sealedCoreReason,
} from '../pilot/closure/utilityCoreClosure';
import { pilotCompletionSummary } from '../pilot/pilotCoverage';
import {
  pilotStage,
  pilotStageAtOrAfter,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { openFeedPanel } from '../pilot/ui/FeedPanelScene';
import { DECK_SITES } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

const FEED_KEY: Record<FeedId, InteractionKey> = {
  coolant: 'pilotCoolantValve',
  calibration: 'pilotCalibrationBreaker',
  distribution: 'pilotDistributionBus',
};

const FEED_SITE: Record<FeedId, { x: number; y: number }> = {
  coolant: DECK_SITES.coolantValve,
  calibration: DECK_SITES.calibrationBreaker,
  distribution: DECK_SITES.distributionBus,
};

const FEED_TEXTURE: Record<FeedId, { before: string; after: string }> = {
  coolant: {
    before: 'proc-valve-wheel-closed',
    after: 'proc-valve-wheel-open',
  },
  calibration: {
    before: 'proc-breaker-bank-off',
    after: 'proc-breaker-bank-on',
  },
  distribution: {
    before: 'proc-bus-cabinet-open',
    after: 'proc-bus-cabinet-seated',
  },
};

const FEED_STATION_LABEL: Record<FeedId, string> = {
  coolant: 'Coolant Feed Valve',
  calibration: 'Calibration Breaker',
  distribution: 'Distribution Bus',
};

const ACCENT = 0x5fd3c4;
const DORMANT = 0x1f3a3d;
const AMBER = 0xe6c68f;

declare global {
  interface Window {
    /** DEV-only, read-only deck probe (chips + door lamp as rendered). */
    __deckProbe?: {
      utility_state: string;
      feed_chips: Record<string, string>;
      manifold: string;
      door_open: boolean;
      board: string;
      dev_label_visible: boolean;
    } | null;
  }
}

export class UtilityCoreDeckScene extends PilotZoneScene {
  protected readonly roomId = 'utility_core_deck';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'utility_core_deck' as const;

  private conduits: Phaser.GameObjects.Graphics | null = null;
  private manifoldLamps: Phaser.GameObjects.Graphics | null = null;
  private doorLamp: Phaser.GameObjects.Rectangle | null = null;
  private doorChip: Phaser.GameObjects.Text | null = null;
  private boardStatus: Phaser.GameObjects.Text | null = null;
  private feedChips = new Map<FeedId, Phaser.GameObjects.Text>();
  private manifoldText: Phaser.GameObjects.Text | null = null;
  private devLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(key.scene.utilityCoreDeck);
  }

  protected getLayout(): RoomLayout {
    // 25×19 deck: the Core Chamber alcove (rows 2-4, cols 10-14) with the
    // north doorway at row 2, funnel shoulders on row 5, the Concourse
    // doorway on the WEST wall (rows 8-9), and three machinery blocks
    // under the feed stations along the south wall (rows 13-14).
    return {
      theme: 'utility',
      grid: [
        '#########################',
        '#########################',
        '###########---###########',
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
        '#..####....####....####.#',
        '#..####....####....####.#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    switch (data?.spawn) {
      case 'core_chamber':
        // 88 px below the Core door (y 120): clear of the 72 px interaction
        // radius (V2 finding U8-8).
        return { x: 12.5 * TILE, y: 6.5 * TILE };
      case 'station_concourse':
      default:
        return { x: 5 * TILE, y: 8.5 * TILE };
    }
  }

  create(data?: { spawn?: string }) {
    installClosureLogSink((eventType, metadata, interactionKey) =>
      this.logScenarioEvent(
        (interactionKey ?? 'pilotRoute') as InteractionKey,
        eventType,
        { metadata },
      ),
    );

    super.create(data);

    syncCoreAccess(Date.now());

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      // A feed panel (or the map / inventory) closed: latched keys reset
      // by the base class; the world reflects the persisted feed state.
      syncCoreAccess(Date.now());
      this.refreshDeckVisuals();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      installClosureLogSink(null);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__deckProbe = null;
      }
    });

    this.refreshDeckVisuals();
  }

  protected populateRoom(): void {
    this.addPilotDoor({ to: 'station_concourse', spawn: 'utility_core_deck' });
    this.addPilotDoor({
      to: 'core_chamber',
      spawn: 'utility_core_deck',
      texture: 'proc-door-core',
      gate: () => this.coreDoorGate(),
    });
    registerPilotStation({
      id: 'core_door',
      zone: 'utility_core_deck',
      x: DECK_SITES.coreDoor.x,
      y: DECK_SITES.coreDoor.y,
      label: 'Core Chamber',
      stages: ['core_stabilise'],
      isDone: () => false,
      order: 0,
    });

    // ——— Shift Review Panel (the explicit readiness step) ———
    const review = DECK_SITES.reviewPanel;

    this.addStation({
      interactionKey: 'pilotReviewPanel',
      label: 'Shift Review Panel',
      texture: 'proc-review-panel',
      x: review.x,
      y: review.y,
      onPromptOpened: () => {
        const readiness = currentRouteReadiness();

        this.logScenarioEvent(
          'pilotReviewPanel',
          'pilot_closure_review_opened',
          {
            metadata: {
              non_scored: true,
              record_closed: stationRecordClosed(),
              review_armed: reviewArmed(),
              ready: readiness.ready,
              counts: readiness.counts,
              dev_inspection: readiness.dev_inspection,
            },
          },
        );
        refreshClosureProbe();

        return true;
      },
    });
    registerPilotStation({
      id: 'review_panel',
      zone: 'utility_core_deck',
      x: review.x,
      y: review.y,
      label: 'Shift Review Panel',
      stages: ['deck_closure'],
      isDone: () => stationRecordClosed(),
      order: 0,
    });

    // ——— Station systems board (labels only; reflects the record state) ———
    const board = DECK_SITES.systemsBoard;

    this.addDecor(board.x, board.y, 'proc-board-workorders');
    // Pilot V3 Unit 6 (V2 finding U8-9 / ledger V28): the readout sits on
    // its own backed chip BELOW the board decor's footprint, so no decor
    // can occlude it. V4: environment register, 2× rasterised, sorted just
    // below its own foot line (never over a figure standing south of it).
    this.boardStatus = this.add
      .text(board.x, board.y + 54, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
        padding: { x: 5, y: 3 },
        resolution: 2,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.88)
      .setDepth(worldDepth(board.y + 54 + 40));

    // ——— Three physical feeds (operational order west → east) ———
    for (const [index, feed] of FEED_ORDER.entries()) {
      const site = FEED_SITE[feed];

      this.addStation({
        interactionKey: FEED_KEY[feed],
        label: FEED_STATION_LABEL[feed],
        texture: FEED_TEXTURE[feed].before,
        x: site.x,
        y: site.y,
        onPromptOpened: () => {
          this.tryOpenFeed(feed);

          return false;
        },
      });
      this.feedChips.set(
        feed,
        this.add
          .text(site.x, site.y + 42, '', {
            backgroundColor: '#101820',
            color: '#9fb2c1',
            font: '10px monospace',
            padding: { x: 4, y: 2 },
            resolution: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.88)
          .setDepth(worldDepth(site.y + 42 + 40)),
      );
      registerPilotStation({
        id: `feed_${feed}`,
        zone: 'utility_core_deck',
        x: site.x,
        y: site.y,
        label: FEED_STATION_LABEL[feed],
        stages: ['core_stabilise'],
        isDone: () => feedReady(this.feeds(), feed),
        order: index + 1,
      });
    }

    // ——— Manifold (three-feed indicator) + door lamp ———
    const manifold = DECK_SITES.manifold;

    this.addDecor(manifold.x, manifold.y, 'proc-manifold-panel');
    this.manifoldLamps = this.add.graphics().setDepth(DepthLayer.WorldReadout);
    // Pilot V3 Unit 6 (visual review F3): backed chip like its siblings, so
    // the third feed glyph is legible over the light steel panel behind it.
    this.manifoldText = this.add
      .text(manifold.x, manifold.y + 30, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
        padding: { x: 5, y: 3 },
        resolution: 2,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.88)
      .setDepth(worldDepth(manifold.y + 30 + 40));
    this.doorLamp = this.add
      .rectangle(
        DECK_SITES.coreDoor.x,
        DECK_SITES.coreDoor.y - 26,
        16,
        4,
        DORMANT,
        1,
      )
      .setDepth(DepthLayer.WorldReadout);
    // Door state as text beside the lamp (never colour-only).
    this.doorChip = this.add
      .text(DECK_SITES.coreDoor.x + 62, DECK_SITES.coreDoor.y, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        padding: { x: 4, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0.88)
      .setDepth(worldDepth(DECK_SITES.coreDoor.y + 40));

    // ——— Conduits (floor runs from each feed to the alcove) ———
    // V4: on the floor-decal layer — a cable run never draws over a figure.
    this.buildDeckGrammar();
    this.conduits = this.add.graphics().setDepth(DepthLayer.FloorDecal + 0.03);

    // ——— Dressing: machinery mass, pipes, light pools, a utility bot ———
    this.addDecor(4.5 * TILE, 13.9 * TILE, 'proc-rig-intake');
    this.addDecor(12.5 * TILE, 13.9 * TILE, 'proc-cabinet-calibration');
    this.addDecor(20.5 * TILE, 13.9 * TILE, 'proc-crate-components');
    this.addDecor(8.5 * TILE, 13.75 * TILE, 'proc-wall-pipes');
    this.addDecor(16.5 * TILE, 13.75 * TILE, 'proc-wall-pipes');
    // V4: the oversized PROVISIONAL utility-bay slices (tower, panel,
    // desk, bot) leave the deck; wall dressing stays in the 32 px register.
    this.addDecor(2.4 * TILE, 4.9 * TILE, 'proc-wall-pipes');
    this.addDecor(22 * TILE, 4.6 * TILE, 'proc-console-wall');
    // On the wall band (foot line above the row-5 lane) so no figure walks
    // behind it (gameplay review G7).
    this.addDecor(6.2 * TILE, 5.2 * TILE, 'proc-desk-closure');
    this.addDecor(22 * TILE, 8 * TILE, 'proc-rack-tools');
    this.addDecor(2.5 * TILE, 11.5 * TILE, 'proc-bin-consumables');
    this.addDecor(12.5 * TILE, 4.2 * TILE, 'proc-light-pool');
    this.addDecor(8 * TILE, 9.5 * TILE, 'proc-light-pool');
    this.addDecor(17 * TILE, 9.5 * TILE, 'proc-light-pool');
    this.addDecor(22 * TILE, 15.1 * TILE, 'proc-bot-utility');

    if (devInspectionActive()) {
      this.devLabel = this.add
        .text(792, 8, 'DEV INSPECTION — no participant record', {
          color: '#e6c68f',
          font: 'bold 11px monospace',
          backgroundColor: '#2a1f0a',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(1, 0)
        .setDepth(Depth.AboveWorld + 3)
        .setScrollFactor(0);
    }
  }

  /** The session-scope feed state (persists across scene transitions). */
  private feeds() {
    return closureFeeds();
  }

  /**
   * V4 deck grammar (presentation only): one central systems trunk from
   * the feed header to the Core door alcove, three separated feed bays on
   * their own plates, the Shift Review station plate by the entry, the
   * Core door alcove as the terminal landmark, thresholds at both doors.
   */
  private buildDeckGrammar() {
    const plate = (
      x: number,
      y: number,
      w: number,
      h: number,
      alpha: number,
      depth: number = DepthLayer.FloorDecal,
    ) =>
      this.add
        .rectangle(x, y, w, h, 0x55627a, alpha)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x8fa4b8, 0.35)
        .setDepth(depth);

    // Trunk: vertical bundle under the alcove mouth and the feed header
    // (review U5-3: the landmark reads — stronger fill and a 2 px edge).
    plate(
      DECK_SITES.coreDoor.x,
      6.6 * TILE,
      2 * TILE,
      3 * TILE,
      0.36,
    ).setStrokeStyle(2, 0x8fa4b8, 0.55);
    plate(12.5 * TILE, 7.7 * TILE, 17 * TILE, 1.6 * TILE, 0.3).setStrokeStyle(
      2,
      0x8fa4b8,
      0.55,
    );
    // Three feed bays (rows 10-12) aligned to the machinery blocks under
    // them (review U5-4: cols 3-6, 11-14, 19-22).
    for (const centre of [5 * TILE, 13 * TILE, 21 * TILE]) {
      plate(centre, 11 * TILE, 4 * TILE, 3 * TILE, 0.2);
    }
    // Shift Review station plate (row 5-6) and the Core door alcove.
    plate(DECK_SITES.reviewPanel.x, 5.9 * TILE, 4 * TILE, 1.8 * TILE, 0.22);
    plate(DECK_SITES.coreDoor.x, 4 * TILE, 5 * TILE, 2 * TILE, 0.18);
    plate(
      DECK_SITES.coreDoor.x,
      5.5 * TILE,
      3 * TILE,
      TILE,
      0.34,
      DepthLayer.FloorMarking,
    );
    // Concourse door threshold (west wall, rows 8-9).
    plate(
      2 * TILE,
      9 * TILE,
      2 * TILE,
      2 * TILE,
      0.34,
      DepthLayer.FloorMarking,
    );
  }

  // ————————————————————————————————— Core door gate ——

  private coreDoorGate(): string | null {
    if (coreAccessReady()) {
      noteCoreDoor(true, null);

      return null;
    }

    const readiness = currentRouteReadiness();
    let reason: string;

    if (!readiness.ready && !readiness.dev_inspection) {
      reason = sealedCoreReason(readiness);
    } else {
      const missing = FEED_ORDER.filter(
        (feed) => !feedReady(this.feeds(), feed),
      );

      reason = `Core sealed — feeds still down: ${missing
        .map((feed) => FEED_STATION_LABEL[feed].toLowerCase())
        .join(', ')}. Bring the feeds up in order.`;
    }

    noteCoreDoor(false, reason);

    return reason;
  }

  // ————————————————————————————————— feeds ——

  private tryOpenFeed(feed: FeedId) {
    const availability = feedAvailability(
      this.feeds(),
      feed,
      stationRecordClosed() || devInspectionActive(),
    );

    if (availability !== 'ok' && availability !== 'already_ready') {
      let message: string;

      switch (availability) {
        case 'record_not_closed':
          message = pilotStageAtOrAfter('deck_closure')
            ? 'Feeds stay isolated until the station record is closed at the Shift Review Panel.'
            : 'Feeds stay isolated until the shift is signed off at the Work Order Board.';
          break;
        case 'out_of_order': {
          const previous = FEED_ORDER[FEED_ORDER.indexOf(feed) - 1];

          message =
            feed === 'calibration'
              ? 'Calibration line unpowered — open the coolant feed valve first.'
              : `Distribution bus isolated — bring up the ${FEED_STATION_LABEL[previous].toLowerCase()} first.`;
          break;
        }
        default:
          message = 'This feed is not available now.';
          break;
      }

      noteFeedRefused(feed, availability, 'keyboard');
      sfxUnavailable();
      this.showFeedbackMessage(message);

      return;
    }

    noteFeedPanelOpened(feed, 'keyboard');
    openFeedPanel(this, {
      feed,
      onClosed: () => {
        syncCoreAccess(Date.now());
        this.refreshDeckVisuals();
        this.refreshGuidance();
      },
    });
  }

  // ————————————————————————————————— review panel prompt ——

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey !== 'pilotReviewPanel') {
      return undefined;
    }

    if (devInspectionActive()) {
      return (
        'DEV INSPECTION — the station record is NOT touched in this mode.\n' +
        'Feeds and the Core door are available for inspection only.'
      );
    }

    if (!pilotStageAtOrAfter('deck_closure')) {
      return (
        'STATION RECORD — open.\n' +
        'The shift has not been signed off at the Work Order Board (Records Workshop) yet.'
      );
    }

    if (stationRecordClosed()) {
      return this.closedRecordBody();
    }

    if (reviewArmed()) {
      return (
        'CONFIRM RECORD CLOSURE\n' +
        'Closing files every station task exactly as it stands: unfinished work is ' +
        'recorded as unfinished — never as a result — and the record cannot be ' +
        'reopened this shift.\n' +
        'The station stays open to you either way; you can still return first.'
      );
    }

    const summary = pilotCompletionSummary();
    const lines = [
      'STATION RECORD — end-of-shift review.',
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
      'Closing the record files every task as it stands and readies the feeds. Confirming closes the record only — the station stays open to you.',
    );

    return lines.join('\n');
  }

  private closedRecordBody(): string {
    const readiness = currentRouteReadiness();
    const c = readiness.counts;
    const feeds = this.feeds();
    const lamp = (feed: FeedId) => (feedReady(feeds, feed) ? '●' : '○');

    return [
      'STATION RECORD — closed.',
      `Recorded: ${c.recorded} · Recorded with limited evidence: ${c.recorded_limited} · Not observed: ${c.not_observed} · Technical state recorded: ${c.technical}.`,
      'Questionnaire handoff: prepared — administered outside the station.',
      `Feeds: coolant ${lamp('coolant')} · calibration ${lamp('calibration')} · distribution ${lamp('distribution')}.`,
      readiness.ready
        ? allFeedsReady(feeds)
          ? 'Core Chamber access: OPEN — north door.'
          : 'Core Chamber access: opens once the three feeds are up.'
        : sealedCoreReason(readiness),
    ].join('\n');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'pilotReviewPanel') {
      return [];
    }

    if (
      devInspectionActive() ||
      stationRecordClosed() ||
      !pilotStageAtOrAfter('deck_closure')
    ) {
      return [
        {
          label:
            stationRecordClosed() || devInspectionActive()
              ? 'Step away'
              : 'Return to the station',
          feedback:
            stationRecordClosed() || devInspectionActive()
              ? ''
              : 'The shift has not been signed off at the Work Order Board yet — the record stays open.',
          getEventTypes: () => [],
        },
      ];
    }

    if (reviewArmed()) {
      return [
        {
          label: 'Confirm — close the station record',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.confirmRecordClosure(),
        },
        {
          label: 'Not yet — return to the station',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            disarmRecordReview();
            refreshClosureProbe();
            this.showFeedbackMessage(
              'The record stays open. The Concourse door is to the west.',
            );
          },
        },
      ];
    }

    return [
      {
        label: 'Close the station record as it stands',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          armRecordReview();
          refreshClosureProbe();
          this.showFeedbackMessage(
            'Confirmation required — open the panel again to confirm or step back.',
          );
        },
      },
      {
        label: 'Not yet — return to the station',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          this.showFeedbackMessage(
            'The record stays open — the Concourse door is to the west.',
          );
        },
      },
    ];
  }

  private confirmRecordClosure() {
    const closure = closeStationRecord(Date.now());

    if (closure === null) {
      this.showFeedbackMessage('The record is already closed.');
      this.refreshDeckVisuals();

      return;
    }

    syncCoreAccess(Date.now());
    sfxMachineOn();
    this.showFeedbackMessage(
      'Station record closed. Bring the feeds up — coolant feed valve first.',
    );
    this.refreshDeckVisuals();
    this.refreshGuidance();
  }

  // ————————————————————————————————— world state rendering ——

  private refreshDeckVisuals() {
    const feeds = this.feeds();
    const state = currentUtilityState();
    const doorOpen = coreAccessReady();

    for (const feed of FEED_ORDER) {
      const ready = feedReady(feeds, feed);

      this.setStationTexture(
        FEED_KEY[feed],
        ready ? FEED_TEXTURE[feed].after : FEED_TEXTURE[feed].before,
      );
      this.feedChips.get(feed)?.setText(this.feedChipText(feed));
    }

    // Conduits: each feed's floor run lights when its feed is ready.
    const g = this.conduits;

    if (g !== null) {
      g.clear();

      const mouth = { x: DECK_SITES.coreDoor.x, y: 5.6 * TILE };

      for (const feed of FEED_ORDER) {
        const site = FEED_SITE[feed];
        const ready = feedReady(feeds, feed);
        const lane = 7.4 * TILE + FEED_ORDER.indexOf(feed) * 10;

        // Review U5-2: a cable run in the trim family, not a kerb.
        g.lineStyle(4, 0x22303e, 0.9);
        g.lineBetween(site.x, site.y - 26, site.x, lane);
        g.lineBetween(site.x, lane, mouth.x, lane);
        g.lineBetween(mouth.x, lane, mouth.x, mouth.y);
        g.lineStyle(2, ready ? ACCENT : 0x3f5a6b, 1);
        g.lineBetween(site.x, site.y - 26, site.x, lane);
        g.lineBetween(site.x, lane, mouth.x, lane);
        g.lineBetween(mouth.x, lane, mouth.x, mouth.y);
      }
    }

    // Manifold lamps (glyph + fill; never colour alone).
    const lamps = this.manifoldLamps;
    const manifold = DECK_SITES.manifold;

    if (lamps !== null) {
      lamps.clear();

      for (const [index, feed] of FEED_ORDER.entries()) {
        const x = manifold.x - 26 + index * 20;
        const y = manifold.y - 6;
        const ready = feedReady(feeds, feed);

        if (ready) {
          lamps.fillStyle(ACCENT, 1);
          lamps.fillRect(x - 5, y - 5, 10, 10);
        } else {
          lamps.lineStyle(2, DORMANT, 1);
          lamps.strokeRect(x - 5, y - 5, 10, 10);
        }
      }
    }

    // One token per feed everywhere (gameplay review): the sign words.
    const manifoldLine = FEED_ORDER.map(
      (feed) => `${feed.toUpperCase()} ${feedReady(feeds, feed) ? '●' : '○'}`,
    ).join(' · ');

    this.manifoldText?.setText(manifoldLine);
    this.doorChip?.setText(doorOpen ? 'DOOR · OPEN' : 'DOOR · SEALED');
    // Unit 7 (V4): the leaf art carries the state too, never colour alone.
    this.setDoorTexture(
      'core_chamber',
      doorOpen ? 'proc-door-core-open' : 'proc-door-core',
    );

    this.doorLamp?.setFillStyle(
      doorOpen ? ACCENT : state === 'core_access_ready' ? AMBER : DORMANT,
      1,
    );

    const boardLine = devInspectionActive()
      ? 'DEV INSPECTION\nrecord untouched'
      : stationRecordClosed()
        ? `STATION RECORD: CLOSED\nfeeds ${FEED_ORDER.filter((feed) => feedReady(feeds, feed)).length}/3 up`
        : pilotStageAtOrAfter('deck_closure')
          ? `STATION RECORD: OPEN\n${pilotCompletionSummary().closed}/${pilotCompletionSummary().scheduled} tasks closed`
          : // Before the closure stage: the state word only — no mid-route
            // coverage counter (scientific review F3 / owner decision OD-3).
            'STATION RECORD: OPEN\nreview at shift end';

    this.boardStatus?.setText(boardLine);

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__deckProbe = {
        utility_state: state,
        feed_chips: Object.fromEntries(
          FEED_ORDER.map((feed) => [feed, this.feedChipText(feed)]),
        ),
        manifold: manifoldLine,
        door_open: doorOpen,
        board: boardLine,
        dev_label_visible: this.devLabel?.visible ?? false,
      };
    }

    refreshClosureProbe();
  }

  private feedChipText(feed: FeedId): string {
    const feeds = this.feeds();

    if (feedReady(feeds, feed)) {
      return feed === 'coolant'
        ? 'OPEN · flowing'
        : feed === 'calibration'
          ? 'ENGAGED · live'
          : 'CONNECTED · live';
    }

    const availability = feedAvailability(
      feeds,
      feed,
      stationRecordClosed() || devInspectionActive(),
    );

    if (availability === 'ok') {
      return feed === 'coolant'
        ? 'SHUT · ready to open'
        : feed === 'calibration'
          ? 'OPEN · ready to set'
          : 'OPEN · ready to connect';
    }

    return 'ISOLATED';
  }

  /**
   * The ONE objective line narrows once the three feeds are up (Recovery
   * Yard precedent): the stage objective would otherwise describe finished
   * work while the beacon points at the door (gameplay review F-1).
   */
  protected buildRouteObjectiveText(): string {
    if (
      pilotStage() === 'core_stabilise' &&
      allFeedsReady(this.feeds()) &&
      coreAccessReady()
    ) {
      return 'Feeds up — enter the Core Chamber through the north door.';
    }

    return super.buildRouteObjectiveText();
  }

  protected onPilotUpdate(): void {
    // Restrained ambient: the open door lamp breathes slowly (no flashing);
    // reduced motion keeps it steady.
    if (
      this.doorLamp !== null &&
      !prefersReducedMotion() &&
      coreAccessReady()
    ) {
      this.doorLamp.setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 900));
    }
  }
}
