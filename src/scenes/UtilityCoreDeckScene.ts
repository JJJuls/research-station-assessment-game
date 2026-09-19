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
import { DECK_SITES, DECK_SPAWNS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { WARM_POOL_TINT } from '../world/kit/worldV2Assets';
import { DECK_LAYOUT, DECK_SOLIDS } from '../world/layouts/deck';

const TILE = 32;

/**
 * World V2 rebuild: where each feed's painted machine carries its state
 * lamps (plate px) — the valve wheel's hub, the breaker bank's lamp row,
 * the bus cabinet's socket column — and the warm work light that comes up
 * over a live machine (the Dock's power step-up precedent).
 */
const FEED_LAMPS: Record<
  FeedId,
  { lamps: { x: number; y: number }[]; glow: { x: number; y: number } }
> = {
  coolant: {
    lamps: [
      { x: 150, y: 296 },
      { x: 182, y: 296 },
    ],
    glow: { x: 166, y: 300 },
  },
  calibration: {
    lamps: [
      { x: 318, y: 274 },
      { x: 334, y: 274 },
      { x: 350, y: 274 },
      { x: 366, y: 274 },
    ],
    glow: { x: 342, y: 300 },
  },
  distribution: {
    lamps: [
      { x: 504, y: 282 },
      { x: 504, y: 296 },
      { x: 504, y: 310 },
    ],
    glow: { x: 520, y: 302 },
  },
};

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

  private feedLamps: Phaser.GameObjects.Graphics | null = null;
  private feedGlows = new Map<FeedId, Phaser.GameObjects.Ellipse>();
  private manifoldLamps: Phaser.GameObjects.Graphics | null = null;
  private doorLamp: Phaser.GameObjects.Rectangle | null = null;
  private doorSeam: Phaser.GameObjects.Rectangle | null = null;
  private doorGlow: Phaser.GameObjects.Ellipse | null = null;
  private doorChip: Phaser.GameObjects.Text | null = null;
  private boardStatus: Phaser.GameObjects.Text | null = null;
  private feedChips = new Map<FeedId, Phaser.GameObjects.Text>();
  private manifoldText: Phaser.GameObjects.Text | null = null;
  private devLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(key.scene.utilityCoreDeck);
  }

  protected getLayout(): RoomLayout {
    // World V2 rebuild: the 22×12 painted plate is the architecture and
    // the machinery; collision is the audited logical grid.
    return {
      theme: 'utility',
      grid: [...DECK_LAYOUT],
      solids: DECK_SOLIDS,
      field: 'wide',
      plateTexture: 'w2-deck-plate',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 22 * TILE, height: 12 * TILE };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Machine-audited: ≥ 80 px from the door used and outside every
    // interactable's 72 px radius (V2 finding U8-8).
    switch (data?.spawn) {
      case 'core_chamber':
        return DECK_SPAWNS.fromCore;
      case 'station_concourse':
      default:
        return DECK_SPAWNS.fromConcourse;
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
    this.addPilotDoor({
      to: 'station_concourse',
      spawn: 'utility_core_deck',
      registryId: 'deck.door_concourse',
    });
    this.addPilotDoor({
      to: 'core_chamber',
      spawn: 'utility_core_deck',
      gate: () => this.coreDoorGate(),
      registryId: 'deck.door_core',
    });
    // World V2: the open west doorway and the Core blast door are baked
    // into the plate — the generic leaf sprites would double them. Door
    // state is carried by the lintel lamp, the seam light and the chip.
    this.doorImage('deck.door_concourse')?.setVisible(false);
    this.doorImage('deck.door_core')?.setVisible(false);
    // Their class lamps sit on the open leaf's edge / the blast door's
    // painted lintel lamp.
    this.placeDoorIndicator('deck.door_concourse', 58, 134);
    this.placeDoorIndicator('deck.door_core', 400, 68);
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

    // World V2: the gauge board is painted; its readout chip hangs on the
    // wall base under the gauges (environment register, 2× rasterised),
    // sorted at its own foot line so a figure south of it reads over it.
    this.boardStatus = this.add
      .text(board.x, board.y + 4, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
        padding: { x: 5, y: 3 },
        resolution: 2,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.88)
      .setDepth(worldDepth(board.y + 30));

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
      // World V2: the chip sits on the machine's top edge (below the
      // approach band, above its lamps) and the live glow is a warm pool
      // over the machine.
      this.feedChips.set(
        feed,
        this.add
          .text(FEED_LAMPS[feed].glow.x, site.y - 20, '', {
            backgroundColor: '#101820',
            color: '#9fb2c1',
            font: '10px monospace',
            padding: { x: 4, y: 2 },
            resolution: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.88)
          .setDepth(worldDepth(site.y + 20)),
      );
      this.feedGlows.set(
        feed,
        this.add
          .ellipse(
            FEED_LAMPS[feed].glow.x,
            FEED_LAMPS[feed].glow.y,
            150,
            92,
            WARM_POOL_TINT,
            0.22,
          )
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DepthLayer.WorldReadout - 0.02)
          .setVisible(false),
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

    // World V2: the manifold gauges are painted; the three feed lamps sit
    // on the pipe run under them, the chip on the wall base.
    this.manifoldLamps = this.add.graphics().setDepth(DepthLayer.WorldReadout);
    this.manifoldText = this.add
      .text(manifold.x, manifold.y + 14, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
        padding: { x: 5, y: 3 },
        resolution: 2,
        // Wrapped to the wall panel's width: the one-line token string
        // (the probe's value) would run past the room's east wall.
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.88)
      .setDepth(worldDepth(manifold.y + 40));
    // The door's own state lamp sits beside the painted lintel lamp (the
    // class indicator owns the lintel), the seam light opens down the
    // door's centre, and its glow.
    this.doorLamp = this.add
      .rectangle(DECK_SITES.coreDoor.x + 22, 68, 8, 4, DORMANT, 1)
      .setDepth(DepthLayer.WorldReadout);
    this.doorSeam = this.add
      .rectangle(DECK_SITES.coreDoor.x, 112, 4, 56, ACCENT, 0)
      .setDepth(DepthLayer.WorldReadout - 0.01);
    this.doorGlow = this.add
      .ellipse(DECK_SITES.coreDoor.x, 118, 110, 96, ACCENT, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DepthLayer.WorldReadout - 0.02)
      .setVisible(false);
    // Door state as text beside the lamp (never colour-only).
    this.doorChip = this.add
      .text(DECK_SITES.coreDoor.x + 66, DECK_SITES.coreDoor.y - 4, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        padding: { x: 4, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0.88)
      .setDepth(worldDepth(DECK_SITES.coreDoor.y + 40));

    // Feed lamps on the painted machines (glyph + fill, never colour alone).
    this.feedLamps = this.add.graphics().setDepth(DepthLayer.WorldReadout);

    // ——— World V2: the painted plate IS the architecture and all the
    // machinery — hide every station marker sprite (interactions,
    // prompts and events untouched; the Workshop precedent). The V4
    // floor grammar (trunk, bays, thresholds), the conduit runs, the
    // light pools and the wall dressing are gone: the plate's baked
    // lamps, wayfinding lines and machines carry that reading.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        [
          'proc-review-panel',
          ...FEED_ORDER.flatMap((feed) => [
            FEED_TEXTURE[feed].before,
            FEED_TEXTURE[feed].after,
          ]),
        ].includes(child.texture.key)
      ) {
        child.setVisible(false);
      }
    }

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

    // Feed state on the painted machines: the marker textures are hidden
    // (the plate paints the dormant machine); a live feed shows its lamps
    // lit and a warm work light over the machine.
    const lamps = this.feedLamps;

    lamps?.clear();

    for (const feed of FEED_ORDER) {
      const ready = feedReady(feeds, feed);
      const available =
        feedAvailability(
          feeds,
          feed,
          stationRecordClosed() || devInspectionActive(),
        ) === 'ok';

      this.setStationTexture(
        FEED_KEY[feed],
        ready ? FEED_TEXTURE[feed].after : FEED_TEXTURE[feed].before,
      );
      this.feedChips.get(feed)?.setText(this.feedChipText(feed));
      this.feedGlows.get(feed)?.setVisible(ready);

      if (lamps !== null) {
        for (const lamp of FEED_LAMPS[feed].lamps) {
          if (ready) {
            lamps.fillStyle(ACCENT, 1);
            lamps.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
          } else if (available) {
            lamps.fillStyle(AMBER, 0.9);
            lamps.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
          } else {
            lamps.lineStyle(1, DORMANT, 1);
            lamps.strokeRect(lamp.x - 3, lamp.y - 3, 6, 6);
          }
        }
      }
    }

    // Manifold lamps (glyph + fill; never colour alone) on the pipe run
    // under the painted gauges.
    const manifoldLamps = this.manifoldLamps;
    const manifold = DECK_SITES.manifold;

    if (manifoldLamps !== null) {
      manifoldLamps.clear();

      for (const [index, feed] of FEED_ORDER.entries()) {
        const x = manifold.x - 20 + index * 20;
        const y = manifold.y - 10;
        const ready = feedReady(feeds, feed);

        if (ready) {
          manifoldLamps.fillStyle(ACCENT, 1);
          manifoldLamps.fillRect(x - 4, y - 4, 8, 8);
        } else {
          manifoldLamps.lineStyle(1, DORMANT, 1);
          manifoldLamps.strokeRect(x - 4, y - 4, 8, 8);
        }
      }
    }

    // One token per feed everywhere (gameplay review): the sign words.
    const manifoldLine = FEED_ORDER.map(
      (feed) => `${feed.toUpperCase()} ${feedReady(feeds, feed) ? '●' : '○'}`,
    ).join(' · ');

    this.manifoldText?.setText(manifoldLine);
    this.doorChip?.setText(doorOpen ? 'DOOR · OPEN' : 'DOOR · SEALED');
    // World V2: the painted blast door carries the state through its
    // lintel lamp, the lit centre seam and the glow (never colour alone —
    // the chip names it).
    this.doorLamp?.setFillStyle(
      doorOpen ? ACCENT : state === 'core_access_ready' ? AMBER : DORMANT,
      1,
    );
    this.doorSeam?.setFillStyle(ACCENT, doorOpen ? 0.9 : 0);
    this.doorGlow?.setVisible(doorOpen);

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
      // World V1 (U2): one short mission-card line (≤ 44 characters).
      return 'Feeds up — Core Chamber, north door.';
    }

    return super.buildRouteObjectiveText();
  }

  protected onPilotUpdate(): void {
    this.clampWorldReadouts([
      this.boardStatus,
      this.manifoldText,
      this.doorChip,
      ...this.feedChips.values(),
    ]);
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
