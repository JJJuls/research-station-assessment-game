/**
 * PilotZoneScene — base scene of the professional pilot route (Unit 2;
 * World V1 presentation).
 *
 * Extends RoomScene (stations, doors, prompt cards, NPCs, C/D/F field
 * actions, inventory belt + I overlay, ESC pause) with the pilot guidance
 * layer: the mission card (act title + one next action), ONE guidance
 * target — the current route destination, shown by the target's lamp
 * class and a single light pool, never by a ring or an arrow — the M
 * station map, the H controls overlay (hidden by default), a small zone
 * title card, bidirectional doors with per-entry spawns, and short NPC
 * beats. Every `pilot_*` event is unmapped route telemetry.
 *
 * Scientific boundary: nothing here reads measurement outcomes except the
 * guidance target's "is this guided station terminal?" predicate, which
 * steers presentation only and never gates a door or a stage.
 */
import Phaser from 'phaser';

import { Depth, key } from '../constants';
import type { ControlsReferenceOptions } from '../gameplay';
import { prefersReducedMotion } from '../inventory/ui/theme';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomDoorConfig,
  RoomStationConfig,
} from '../world/RoomScene';
import { RoomScene } from '../world/RoomScene';
import {
  closureCore,
  closureFeeds,
  stationRecordClosed,
} from './closure/closureSession';
import { feedsReadyCount } from './closure/utilityCoreClosure';
import {
  installInputObservation,
  type ObservedInput,
  observeInputNow,
} from './inputObservation';
import { pilotLaunchMode, refreshPilotCoverageProbe } from './pilotCoverage';
import type { PilotBeaconTarget, PilotZoneKey } from './pilotRoute';
import {
  installPilotRouteLogSink,
  notePilotZoneEntered,
  onPilotRouteChange,
  PILOT_DOORS,
  PILOT_ZONE_NAMES,
  pilotBeaconTarget,
  pilotEpisode,
  pilotMissionLog,
  pilotRouteSummary,
  pilotStage,
} from './pilotRoute';
import {
  missionCardAction,
  type RestorationContext,
  type RestorationElement,
  type RestorationState,
  restorationState,
  storyActTitle,
} from './storyState';
import { noteM09ReminderLogViewed } from './windows/m09MonitorWatch';
import {
  answerM10Offer,
  deferM10Offer,
  delegateM10,
  handOverM10,
  M10_DELEGATE_KEEP_LABEL,
  M10_DELEGATE_LABELS,
  M10_HANDOVER_FEEDBACK,
  M10_HANDOVER_LABELS,
  M10_MENU_ENTRY_LABEL,
  M10_MENU_NOT_NOW_LABEL,
  M10_OFFER_LABELS,
  M10_OFFER_TAGS,
  m10CarriedDeliveries,
  m10DelegateConfirmBody,
  m10DelegateConfirmLabel,
  m10DelegateFeedback,
  type M10Delivery,
  m10MenuActions,
  m10MenuBody,
  m10MenuPress,
  type M10Person,
  m10StagePress,
  noteM10DelegateConfirmShown,
  noteM10MenuShown,
  noteM10PersonPresent,
  noteM10RecipientPrompt,
  noteM10ReminderLogViewed,
  presentM10Offer,
} from './windows/m10ComponentPromise';
import { WorldBundleLayer } from './worldBundles';

/** Guidance target counts as reached inside this radius (arrival). */
const BEACON_ARRIVAL_RANGE = 120;

/** Pilot controls legend (mission §8 key set; hidden until H). */
export const PILOT_CONTROLS_LINES = [
  'CONTROLS  (H hides)',
  'Arrows   move',
  'E/SPACE  interact',
  'I        inventory',
  'C        scan',
  'D        dig',
  'F        magnet rig',
  'M        map / log',
  'ESC      close/pause',
] as const;

declare global {
  interface Window {
    /**
     * DEV-only, read-only pilot guidance probe (RoomScene probe precedent):
     * current zone, stage, objective text, guidance target and whether
     * the guidance is active (target not yet reached).
     */
    __pilotProbe?: {
      zone: string;
      stage: string;
      episode: number;
      objective: string;
      beacon: (PilotBeaconTarget & { visible: boolean }) | null;
      launch_mode: string;
      route: ReturnType<typeof pilotRouteSummary>;
      mission_log: ReturnType<typeof pilotMissionLog>;
    } | null;
    /** DEV-only: last zone title card text (cleared on each zone create). */
    __pilotZoneTitle?: string | null;
    /** DEV-only: world bundles in the current zone. */
    __pilotBundles?: {
      count: number;
      nearest: string | null;
      bundles: { id: string; label: string; x: number; y: number }[];
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__pilotProbe = null;
  window.__pilotZoneTitle = null;
}

export interface PilotDoorSpec {
  to: PilotZoneKey;
  /** Spawn hint the destination reads (its getSpawn data). */
  spawn: string;
  texture?: string;
  /** Frame of a strip texture (Unit 7 airlock iris). */
  textureFrame?: number;
  /**
   * Dynamic gate (Unit 6 Core door): a neutral sealed message keeps the
   * door shut this time; null opens it. Navigation only — never reads
   * task performance (RoomDoorConfig.gate).
   */
  gate?: () => string | null;
  /** World V1: stable registry id. */
  registryId?: string;
}

/** No NPC state shows more option cards than this. */
export const NPC_MENU_MAX_OPTIONS = 4;

export type PilotNpcKey =
  | 'pilotVale'
  | 'pilotKai'
  | 'pilotNoor'
  | 'pilotWorkOrderBoard';

/**
 * One option of a settle-guarded stage (Unit 15: the M09 / M10 offers,
 * the recap, the deliveries menu and the delegation confirmation).
 */
export interface SettledOption {
  label: string;
  /** Telemetry tag recorded with a READ choice (no construct meaning). */
  tag: string;
  /**
   * Runs the option's command with the observed input and its position.
   * 'refused' = the press fell inside the stage's settle window: nothing
   * was chosen and the stage is shown again.
   */
  run: (
    input: ObservedInput,
    optionPosition: number,
    optionCount: number,
  ) => 'done' | 'refused';
  /** Shown after a read choice that opens no further stage. */
  feedback?: () => string;
  nextStage?: () => PromptStage | null;
}

/** A short NPC beat: ≤3 lines of body and ≤4 options. */
export interface PilotNpcBeat {
  body: string;
  options: {
    label: string;
    feedback?: string;
    onSelected?: () => void;
    nextStage?: () => PromptStage | null;
    /** Telemetry tag recorded with the choice (no construct meaning). */
    tag: string;
  }[];
}

export abstract class PilotZoneScene extends RoomScene {
  protected abstract readonly zoneKey: PilotZoneKey;

  /** Recoverable world items (Unit 3); pickups go through the inventory store. */
  protected bundles!: WorldBundleLayer;

  private beaconTarget: PilotBeaconTarget | null = null;
  private unsubscribeRoute: (() => void) | null = null;
  private mapOpen = false;

  protected questLineEnabled(): boolean {
    return false;
  }

  protected muteKeyEnabled(): boolean {
    return false;
  }

  protected promptClampMaxX(): number {
    return 798;
  }

  /** World V1: the belt is relevant only where field tools are used. */
  protected hotbarVisible(): boolean {
    return this.zoneKey === 'exterior_recovery_yard';
  }

  /** World V1 mission-card title: the current act (STORY-STATE-SPEC §3). */
  protected buildMissionCardTitle(): string {
    return storyActTitle(pilotStage());
  }

  // ——— Story state (U2) ——————————————————————————————————————————————————

  /**
   * Terminal dispositions the restoration model may read (never a value):
   * the station record is closed or not, how many feeds are up, whether
   * the Core is stable. Read from the non-scored closure session.
   */
  protected restorationContext(): RestorationContext {
    return {
      recordClosed: stationRecordClosed(),
      feedsReady: feedsReadyCount(closureFeeds()),
      coreStable: closureCore().state === 'stable',
    };
  }

  /** Restoration state of one visible system under the current stage. */
  protected restoration(element: RestorationElement): RestorationState {
    return restorationState(element, pilotStage(), this.restorationContext());
  }

  /** Work-area light pool for the current lighting state (cold → warm). */
  protected lightPoolTexture(): string {
    return this.restoration('lighting') === 'restored'
      ? 'kit-light-pool-warm'
      : 'kit-light-pool-cold';
  }

  /**
   * Called after populateRoom() and on every route-stage change / overlay
   * resume: zones re-read their restoration states here (lamps, pools,
   * damage dressing). Presentation only.
   */
  protected onStoryStateChanged(): void {}

  protected controlsReferenceOptions(): ControlsReferenceOptions {
    return {
      startVisible: false,
      // Review A-3: the field-action keys are listed only where they act.
      lines:
        this.zoneKey === 'exterior_recovery_yard'
          ? PILOT_CONTROLS_LINES
          : PILOT_CONTROLS_LINES.filter((line) => !/^[CDF]\s/.test(line)),
      panelY: 404,
      onToggle: (shown) =>
        this.logScenarioEvent('pilotRoute', 'pilot_controls_toggled', {
          metadata: { shown, zone: this.zoneKey },
        }),
    };
  }

  /**
   * The ONE next-action line: the story state's line for (stage, zone) —
   * the action in the destination zone, the door to take elsewhere, never
   * a door already passed (STORY-STATE-SPEC §3; exhaustive pure spec).
   */
  protected buildRouteObjectiveText(): string {
    return missionCardAction(pilotStage(), this.zoneKey);
  }

  create(data?: { spawn?: string }) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotZoneTitle = null;
    }

    // Unit 15: the device of a press is observed for the M09 / M10 acts.
    installInputObservation();

    // Route telemetry sink: every pilot_* event rides the unmapped
    // scenario-telemetry path of THIS scene.
    installPilotRouteLogSink((eventType, metadata) =>
      this.logScenarioEvent('pilotRoute', eventType, { metadata }),
    );

    // The bundle layer exists before populateRoom() (called by super.create)
    // so zones can spawn incoming supplies while populating. Drop bounds
    // follow the room once the map exists (set in onRoomReady).
    this.bundles = new WorldBundleLayer(
      this,
      (message) => this.showFeedbackMessage(message),
      this.bundleDropBounds(),
    );

    super.create(data);

    notePilotZoneEntered(this.zoneKey, Date.now());
    this.refreshRouteObjective();
    this.showZoneTitle();
    this.retargetBeacon();
    this.onStoryStateChanged();
    this.noteDeliveryPresence();

    this.unsubscribeRoute = onPilotRouteChange(() => {
      this.refreshRouteObjective();
      this.retargetBeacon();
      this.onStoryStateChanged();
      this.noteDeliveryPresence();
    });

    // M — station map (modal, pause-and-launch like the inventory overlay).
    this.input.keyboard!.on('keydown-M', (event: KeyboardEvent) => {
      if (event.repeat || !this.physicalInputEligible() || this.mapOpen) {
        return;
      }

      this.openStationMap();
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.mapOpen = false;
      this.input.keyboard?.resetKeys();
      // Confirmed overlay world drops land at the participant's feet as
      // recoverable bundles (never destroyed).
      this.bundles.materialiseDrops(this.player.x, this.player.y);
      this.refreshRouteObjective();
      this.retargetBeacon();
      this.onStoryStateChanged();
      refreshPilotCoverageProbe();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRoute?.();
      this.unsubscribeRoute = null;
      installPilotRouteLogSink(null);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__pilotProbe = null;
      }
    });

    refreshPilotCoverageProbe();
  }

  /** Room bounds for materialised drops (zones with rebuilt layouts override). */
  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 800, height: 560 };
  }

  // ——— Presentation tokens (Unit 7) ——————————————————————————————————

  /**
   * One shared area-signage style for every zone: dim, small caps, no
   * plate — a landmark for the eye, never a label floating over an object
   * (status chips keep their plate). Presentation only. (Zones not yet
   * rebuilt; the World V1 zones use addWallSign.)
   */
  protected zoneSignage(
    x: number,
    y: number,
    text: string,
    dark = true,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        color: dark ? '#8497aa' : '#3d4d5c',
        font: '11px monospace',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  // ——— Doors ———————————————————————————————————————————————————————————

  /**
   * Adds a pilot zone door toward `spec.to`. Position and label come from
   * the shared zone graph so the guidance and the door always agree; the
   * transition writes the destination's spawn hint. Every ordinary door is
   * declared in both zones (bidirectional by construction).
   */
  protected addPilotDoor(spec: PilotDoorSpec) {
    const ref = PILOT_DOORS[this.zoneKey].find((door) => door.to === spec.to);

    if (ref === undefined) {
      throw new Error(
        `PilotZoneScene: no door from ${this.zoneKey} to ${spec.to} in PILOT_DOORS`,
      );
    }

    const config: RoomDoorConfig = {
      x: ref.x,
      y: ref.y,
      label: ref.label,
      verb: 'Go to',
      registryId: spec.registryId,
      // Unit 7 (V9): interior doors show a door leaf instead of the bare
      // cyan marker (PROVISIONAL pack art; the marker remains the fallback).
      texture:
        spec.texture ??
        (this.textures.exists('plv1-arch-door') ? 'plv1-arch-door' : undefined),
      textureFrame: spec.textureFrame,
      interactionKey: 'pilotDoor',
      eventType: 'pilot_door_used',
      eventMetadata: { from: this.zoneKey, to: spec.to },
      target: {
        sceneKey: spec.to,
        roomId: spec.to,
        spawn: spec.spawn,
      },
      gate: spec.gate,
    };

    this.addDoor(config);
  }

  // ——— NPC beats ——————————————————————————————————————————————————————

  /**
   * Builds the prompt options for one short NPC beat. Each choice logs one
   * `pilot_npc_beat` event (npc + tag) — navigation telemetry, no construct.
   */
  protected npcBeatOptions(
    npcKey: PilotNpcKey,
    beat: PilotNpcBeat,
  ): PromptOption[] {
    if (beat.options.length === 0 || beat.options.length > 4) {
      throw new Error('PilotZoneScene: an NPC beat has 1–4 options');
    }

    return beat.options.map((option, index) => ({
      label: option.label,
      feedback: option.feedback ?? '',
      getEventTypes: () => [],
      onSelected: () => {
        this.logNpcBeat(npcKey, option.tag, index + 1, beat.options.length);
        option.onSelected?.();
      },
      nextStage: option.nextStage,
    }));
  }

  private logNpcBeat(
    npcKey: PilotNpcKey,
    tag: string,
    optionPosition: number,
    optionCount: number,
  ) {
    this.logScenarioEvent(npcKey, 'pilot_npc_beat', {
      choice_value: tag,
      metadata: {
        zone: this.zoneKey,
        stage: pilotStage(),
        // Audit 2026-09 A3 (spec Q12 ruling §7): the options' fixed
        // presentation order and the pre-focused default are
        // documented IN THE DATA — position of the chosen option,
        // how many options were shown, and which position carried
        // the keyboard focus when the prompt opened (always the
        // first card; RoomScene.focusPromptCard(0)).
        option_position: optionPosition,
        option_count: optionCount,
        focus_default_position: 1,
      },
    });
  }

  // ——— Unit 15: settle-guarded stages and the deliveries menu ————————————

  /** The device of the press that is being handled right now. */
  protected observedInput(): ObservedInput {
    return observeInputNow(Date.now());
  }

  /**
   * Keeps an NPC state at four option cards. The menus are composed so
   * that this never drops anything; if it ever did, the drop is recorded
   * as route telemetry (never a measurement) instead of passing silently.
   */
  protected capNpcMenu(
    npcKey: PilotNpcKey,
    options: PilotNpcBeat['options'],
  ): PilotNpcBeat['options'] {
    if (options.length <= NPC_MENU_MAX_OPTIONS) {
      return options;
    }

    this.logScenarioEvent(npcKey, 'pilot_npc_menu_overflow', {
      metadata: {
        zone: this.zoneKey,
        stage: pilotStage(),
        option_count: options.length,
        dropped_tags: options
          .slice(NPC_MENU_MAX_OPTIONS)
          .map((option) => option.tag),
      },
    });

    return options.slice(0, NPC_MENU_MAX_OPTIONS);
  }

  /**
   * A prompt stage whose every option is guarded by a settle window: a
   * press that the option's command refuses chooses nothing, records no
   * beat, and shows the same stage again (`restage`). A read choice logs
   * one `pilot_npc_beat` and then follows the option's own next stage or
   * feedback.
   */
  protected settledStage(
    npcKey: PilotNpcKey,
    spec: {
      body: string;
      options: SettledOption[];
      restage: () => PromptStage | null;
    },
  ): PromptStage {
    if (
      spec.options.length === 0 ||
      spec.options.length > NPC_MENU_MAX_OPTIONS
    ) {
      throw new Error('PilotZoneScene: a settled stage has 1–4 options');
    }

    let refused = false;

    return {
      body: spec.body,
      options: spec.options.map((option, index) => ({
        label: option.label,
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          refused =
            option.run(this.observedInput(), index + 1, spec.options.length) ===
            'refused';

          if (!refused) {
            this.logNpcBeat(npcKey, option.tag, index + 1, spec.options.length);
          }
        },
        nextStage: () => {
          if (refused) {
            return spec.restage();
          }

          const next = option.nextStage?.() ?? null;
          const feedback = next === null ? (option.feedback?.() ?? '') : '';

          if (feedback !== '') {
            this.showFeedbackMessage(feedback);
          }

          return next;
        },
      })),
    };
  }

  /**
   * The colleagues in this zone who can act on a delivery at the current
   * stage (zones hosting a recipient or a delegate override this).
   */
  protected deliveryPersonsHere(): M10Person[] {
    return [];
  }

  /**
   * Objective accessibility record: a recipient or permitted delegate
   * stands in the entered zone, able to act, while a delivery is carried.
   * Called at zone entry and on every route change (once per person and
   * visit inside the model).
   */
  private noteDeliveryPresence() {
    for (const person of this.deliveryPersonsHere()) {
      noteM10PersonPresent(person, this.zoneKey);
    }
  }

  /**
   * The explicit offer of one delivery (accept / decline / later — all
   * deliberate, all settle-guarded). `after` names what follows each read
   * answer; `feedback` is shown when nothing follows.
   */
  protected deliveryOfferStage(
    npcKey: PilotNpcKey,
    delivery: M10Delivery,
    spec: {
      body: string;
      feedback?: string;
      after: (answer: 'accept' | 'decline' | 'defer') => PromptStage | null;
    },
  ): PromptStage | null {
    if (!presentM10Offer(delivery, Date.now())) {
      return null;
    }

    const labels = M10_OFFER_LABELS[delivery];
    const tags = M10_OFFER_TAGS[delivery];
    const feedback =
      spec.feedback === undefined ? undefined : () => spec.feedback ?? '';
    const answer =
      (choice: 'accept' | 'decline'): SettledOption['run'] =>
      (input, position, count) =>
        answerM10Offer(delivery, choice, position, count, Date.now(), input) ===
        'refused'
          ? 'refused'
          : 'done';

    return this.settledStage(npcKey, {
      body: spec.body,
      restage: () => this.deliveryOfferStage(npcKey, delivery, spec),
      options: [
        {
          label: labels.accept,
          tag: tags.accept,
          run: answer('accept'),
          feedback,
          nextStage: () => spec.after('accept'),
        },
        {
          label: labels.decline,
          tag: tags.decline,
          run: answer('decline'),
          feedback,
          nextStage: () => spec.after('decline'),
        },
        {
          label: labels.defer,
          tag: tags.defer,
          run: (_input, position, count) =>
            deferM10Offer(delivery, position, count, Date.now()) === 'refused'
              ? 'refused'
              : 'done',
          feedback,
          nextStage: () => spec.after('defer'),
        },
      ],
    });
  }

  /** The issuer's re-ask entry of a deferred offer (zone-specific copy). */
  protected deliveryReask(
    delivery: M10Delivery,
  ): { label: string; stage: () => PromptStage | null } | null {
    void delivery;

    return null;
  }

  /**
   * "About the deliveries…" for one colleague — to be appended LAST to
   * their options, and present only while they can act on a delivery here.
   * Call once per prompt open: it also records that the conversation of a
   * carried delivery's recipient was opened.
   */
  protected deliveriesEntry(
    npcKey: PilotNpcKey,
    person: M10Person,
  ): PilotNpcBeat['options'] {
    if (!this.deliveryPersonsHere().includes(person)) {
      return [];
    }

    noteM10RecipientPrompt(person, this.zoneKey);

    if (this.deliveryMenuOptions(npcKey, person).length === 0) {
      return [];
    }

    return [
      {
        label: M10_MENU_ENTRY_LABEL,
        tag: 'deliveries_open',
        nextStage: () => this.deliveriesMenuStage(npcKey, person, true),
      },
    ];
  }

  /** What this colleague can do about the deliveries, in menu order. */
  private deliveryMenuOptions(
    npcKey: PilotNpcKey,
    person: M10Person,
  ): SettledOption[] {
    const press: SettledOption['run'] = (_input, position, count) =>
      m10MenuPress(person, position, count, Date.now()) ? 'done' : 'refused';
    const options: SettledOption[] = [];

    for (const action of m10MenuActions(person)) {
      const { delivery } = action;

      if (action.kind === 'handover') {
        options.push({
          label: M10_HANDOVER_LABELS[delivery],
          tag: `m10_handover_${delivery}`,
          run: (input, position, count) => {
            if (!m10MenuPress(person, position, count, Date.now())) {
              return 'refused';
            }

            handOverM10(delivery, person, Date.now(), input);

            return 'done';
          },
          feedback: () => M10_HANDOVER_FEEDBACK[delivery],
        });
      } else if (action.kind === 'delegate') {
        options.push({
          label: M10_DELEGATE_LABELS[delivery],
          tag: `m10_delegate_${delivery}_ask`,
          run: press,
          nextStage: () =>
            this.delegationConfirmStage(npcKey, person, delivery),
        });
      } else {
        const reask = this.deliveryReask(delivery);

        if (reask !== null) {
          options.push({
            label: reask.label,
            tag: 'logbook_offer_again',
            run: press,
            nextStage: reask.stage,
          });
        }
      }
    }

    return options;
  }

  /**
   * The deliveries menu: what is carried and when it is due, "Not now."
   * first (the pre-focused card never acts), then what this colleague can
   * do. Viewing it is recorded as the obligation shown; choosing nothing
   * leaves every delivery as it was.
   */
  private deliveriesMenuStage(
    npcKey: PilotNpcKey,
    person: M10Person,
    fresh: boolean,
  ): PromptStage | null {
    const actions = this.deliveryMenuOptions(npcKey, person);

    if (actions.length === 0) {
      return null;
    }

    noteM10MenuShown(person, Date.now(), fresh);

    return this.settledStage(npcKey, {
      body: m10MenuBody(m10CarriedDeliveries()),
      restage: () => this.deliveriesMenuStage(npcKey, person, false),
      options: [
        {
          label: M10_MENU_NOT_NOW_LABEL,
          tag: 'm10_not_now',
          run: (_input, position, count) =>
            m10MenuPress(person, position, count, Date.now())
              ? 'done'
              : 'refused',
        },
        ...actions,
      ],
    });
  }

  /**
   * The colleague states that the delivery becomes their job, and asks.
   * "Keep it for now." is first (the pre-focused card never hands the
   * object over); only the explicit yes leaves it with them.
   */
  private delegationConfirmStage(
    npcKey: PilotNpcKey,
    person: M10Person,
    delivery: M10Delivery,
  ): PromptStage | null {
    if (!noteM10DelegateConfirmShown(delivery, person, Date.now())) {
      return null;
    }

    const allowed = (position: number, count: number) =>
      m10StagePress(
        delivery,
        'delegation_confirm',
        position,
        count,
        Date.now(),
      );

    return this.settledStage(npcKey, {
      body: m10DelegateConfirmBody(delivery),
      restage: () => this.delegationConfirmStage(npcKey, person, delivery),
      options: [
        {
          label: M10_DELEGATE_KEEP_LABEL,
          tag: 'm10_delegate_keep',
          run: (_input, position, count) =>
            allowed(position, count) ? 'done' : 'refused',
        },
        {
          label: m10DelegateConfirmLabel(delivery),
          tag: `m10_delegate_${delivery}_confirm`,
          run: (input, position, count) => {
            if (!allowed(position, count)) {
              return 'refused';
            }

            delegateM10(delivery, person, Date.now(), input);

            return 'done';
          },
          feedback: () => m10DelegateFeedback(delivery),
        },
      ],
    });
  }

  /**
   * The zone a door exit leads to: the pilot door nearest the avatar (an
   * exit is always taken standing at its door).
   */
  protected nearestDoorTarget(): PilotZoneKey | null {
    let nearest: PilotZoneKey | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const door of PILOT_DOORS[this.zoneKey]) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        door.x,
        door.y,
      );

      if (distance < nearestDistance) {
        nearest = door.to;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  /** Body text for an NPC beat, injected at prompt-open time. */
  protected npcBeatStage(beat: PilotNpcBeat): PromptStage {
    return { body: beat.body, options: [] };
  }

  // ——— Guidance presentation ————————————————————————————————————————————

  private showZoneTitle() {
    const name = PILOT_ZONE_NAMES[this.zoneKey];

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotZoneTitle = name;
    }

    // World V1: a small card under the mission card (canvas top-left),
    // never over the play route; withdrawn after 2 s.
    const title = this.add
      .text(
        this.missionCardLeft(),
        this.missionCardBottom() + 4,
        name.toUpperCase(),
        {
          color: '#dfe9f1',
          font: '12px monospace',
          backgroundColor: '#101820',
          padding: { x: 8, y: 4 },
        },
      )
      .setOrigin(0)
      .setDepth(Depth.AbovePlayer + 5)
      .setScrollFactor(0);

    if (prefersReducedMotion()) {
      this.time.delayedCall(2600, () => title.destroy());
      return;
    }

    this.tweens.add({
      targets: title,
      alpha: 0,
      delay: 2000,
      duration: 600,
      onComplete: () => title.destroy(),
    });
  }

  private retargetBeacon() {
    this.beaconTarget = pilotBeaconTarget(this.zoneKey, Date.now());
  }

  /**
   * World V1: the current guidance target is the class-1 object of the
   * zone (lamp + light pool). An object matches by position (the route
   * model mirrors the scene coordinates).
   */
  protected isGuidanceTarget(
    config: RoomStationConfig | RoomDoorConfig,
  ): boolean {
    const target = this.beaconTarget;

    return (
      target !== null &&
      this.beaconVisibleNow() &&
      Math.abs(config.x - target.x) < 1 &&
      Math.abs(config.y - target.y) < 1
    );
  }

  /**
   * World readout chips are CONTEXTUAL (Station 080 correction): a chip is
   * a status line for the object the participant is standing at, not a
   * permanent strip over the room. At most ONE chip shows at a time — the
   * nearest one within `READOUT_RANGE` of the avatar — and only while its
   * whole text lies inside the world view (a clipped "MAST 04 — storm
   * dama…" never shows; the top 30 world px belong to the objective
   * band). The text itself is unchanged and still read by the probes.
   */
  protected clampWorldReadouts(
    chips: readonly (Phaser.GameObjects.Text | null)[],
  ) {
    const READOUT_RANGE = 120;
    const view = this.plate.view;
    let nearest: Phaser.GameObjects.Text | null = null;
    let nearestDistance = READOUT_RANGE;

    for (const chip of chips) {
      if (chip === null || !chip.active) {
        continue;
      }

      chip.setVisible(false);

      if (chip.text.length === 0) {
        continue;
      }

      const bounds = chip.getBounds();
      const inside =
        bounds.left >= view.x + 2 &&
        bounds.right <= view.right - 2 &&
        bounds.top >= view.y + 30 &&
        bounds.bottom <= view.bottom - 2;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        bounds.centerX,
        bounds.centerY,
      );

      if (inside && distance < nearestDistance) {
        nearest = chip;
        nearestDistance = distance;
      }
    }

    nearest?.setVisible(true);
  }

  private beaconVisibleNow(): boolean {
    if (this.beaconTarget === null) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.beaconTarget.x,
      this.beaconTarget.y,
    );

    return distance >= BEACON_ARRIVAL_RANGE && !this.isTransitioning();
  }

  private openStationMap() {
    this.mapOpen = true;
    // Pilot V3 (Unit 4, V2 finding U8-7): the map/mission-log overlay is
    // the M09/M10 reminder exposure the ledger declares as a control
    // variable; it was declared but never recorded before this call.
    // Audit 2026-09 A8: the M10 hook existed but had no call site, so
    // `reminder_log_views` was a constant 0 in every export. Unit 15: the
    // hooks record which line the log listed (position, rendered).
    noteM09ReminderLogViewed();
    noteM10ReminderLogViewed();
    this.logScenarioEvent('pilotRoute', 'pilot_map_opened', {
      metadata: { zone: this.zoneKey },
    });
    this.scene.pause(this.scene.key);
    this.scene.launch(key.scene.pilotStationMap, {
      resumeKey: this.scene.key,
      zone: this.zoneKey,
    });
  }

  /**
   * Zone-driven guidance refresh (Unit 4): a zone whose guided stations
   * become terminal WITHOUT a route-stage change (the exterior sites)
   * re-reads the objective line and retargets the guidance here.
   */
  protected refreshGuidance(): void {
    this.refreshRouteObjective();
    this.retargetBeacon();
  }

  /** Per-frame guidance refresh; subclasses override onPilotUpdate. */
  protected onRoomUpdate(): void {
    const visible = this.beaconVisibleNow();

    this.onPilotUpdate();

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotProbe = {
        zone: this.zoneKey,
        stage: pilotStage(),
        episode: pilotEpisode(),
        // The displayed line (a zone may narrow the route objective to
        // its current site — Unit 4); never a second line.
        objective: this.buildRouteObjectiveText(),
        beacon:
          this.beaconTarget === null ? null : { ...this.beaconTarget, visible },
        launch_mode: pilotLaunchMode(),
        route: pilotRouteSummary(),
        mission_log: pilotMissionLog(),
      };
      window.__pilotBundles = {
        count: this.bundles.count(),
        nearest:
          this.bundles.nearest(this.player.x, this.player.y)?.label ?? null,
        bundles: this.bundles.serialize(),
      };
    }
  }

  /** Zone-specific per-frame hook (field actions, etc.). */
  protected onPilotUpdate(): void {}

  /** SPACE/E with no station/door in range collects a bundle in reach. */
  protected onEmptyInteract(): void {
    if (this.bundles.tryCollectNearest(this.player.x, this.player.y)) {
      // Presentation only (pilot Unit 6): one-shot pickup animation.
      this.player.playActionAnim('pickup');
    }
  }

  /** World V1: the nearest bundle in reach announces itself in the prompt. */
  protected auxPrompt(): { text: string; x: number; y: number } | null {
    const bundle = this.bundles.nearest(this.player.x, this.player.y);

    return bundle === null
      ? null
      : {
          text: `E — Take ${bundle.label.toLowerCase()}`,
          x: bundle.x,
          y: bundle.y,
        };
  }

  /** Pilot zones allow overlay world drops (materialised as bundles). */
  protected inventoryOverlayLaunchData(): {
    mode: 'backpack';
    allowWorldDrop?: boolean;
  } {
    return { mode: 'backpack', allowWorldDrop: true };
  }

  /** Default: no prompt options unless a subclass declares them. */
  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    void interactionKey;

    return [];
  }
}
