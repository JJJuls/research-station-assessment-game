/**
 * Core Chamber — pilot zone 6, part 2 (evidence-led pilot v2, Unit 6).
 *
 * The professional conclusion of the shift, reached only through the
 * Utility Deck's readiness-gated door. The participant inspects the Core,
 * opens a COMPACT OPERATIONAL REVIEW (coverage / data-quality status
 * categories only — no item ids, no validity words, no scores, no trait
 * language), ARMS the synchronisation, and CONFIRMS it with a second,
 * distinct action. The Core then visibly stabilises (machinery emissive,
 * lighting, restrained audio, Kai's reaction) and a neutral completion
 * notice appears. The chamber is never a trap: the south door works before
 * the confirmation, and after it the completion state is a deliberate,
 * re-openable notice rather than a blocked door.
 *
 * Nothing here is scored: the closure model records only route/closure
 * context (`pilot_closure_*`); no item event is emitted, no prior record is
 * mutated, no Qualtrics return is performed (a future unit), and the
 * runtime's debug completion (summary/scoring path) is never called.
 */
import Phaser from 'phaser';

import { Depth, DepthLayer, key, worldDepth } from '../constants';
import {
  beginManualWorldAction,
  endManualWorldAction,
} from '../gameplay/actions';
import { sfxComplete, sfxMachineOn, sfxUnavailable } from '../gameplay/audio';
import { prefersReducedMotion } from '../inventory/ui/theme';
import {
  closureCore,
  closureFeeds,
  coreAccessReady,
  coreLifecycleCommand,
  currentClosureContext,
  currentRouteReadiness,
  devInspectionActive,
  installClosureLogSink,
  refreshClosureProbe,
  syncCoreAccess,
} from '../pilot/closure/closureSession';
import {
  coreExitAllowed,
  FEED_ORDER,
  feedReady,
} from '../pilot/closure/utilityCoreClosure';
import {
  pilotEpisode,
  pilotRouteSummary,
  pilotStage,
  registerPilotStation,
  STAGE_EPISODE,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import {
  activeWorkSurface,
  openWorkSurface,
  type SurfaceElement,
  type WorkSurfaceModel,
} from '../pilot/ui/WorkSurfaceScene';
import type { InputMode } from '../pilot/windows/windowKit';
import { CORE_SITES, CORE_SPAWN } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { CORE_LAYOUT, CORE_SOLIDS } from '../world/layouts/coreChamber';

const TILE = 32;

/**
 * World V2 rebuild: where the painted reactor carries its dynamic state
 * (plate px) — the sight column is the vessel's glass window, the collar
 * lamps sit on the platform's front face, the floor ring is the painted
 * amber ring around the platform.
 */
const CORE_ART = {
  sightColumn: { x: 333, y: 152, w: 24, h: 56 },
  collarLamps: [
    { x: 300, y: 236 },
    { x: 326, y: 244 },
    { x: 362, y: 244 },
    { x: 388, y: 236 },
  ],
  floorRing: { x: 344, y: 232, w: 230, h: 84 },
  vesselGlow: { x: 344, y: 168, w: 120, h: 150 },
} as const;

/** Synchronisation ramp (inactive → stable), full motion. */
const SYNC_RAMP_MS = 2400;
const SYNC_RAMP_REDUCED_MS = 300;
/** Notice controls appear this long after the handoff settles. */
const NOTICE_CONTROL_DELAY_MS = 1200;

const ACCENT = 0x5fd3c4;
const AMBER = 0xb08334;
const DORMANT = 0x1f3a3d;

type CoreVisualState = 'inactive' | 'prepared' | 'synchronizing' | 'stable';

declare global {
  interface Window {
    /** DEV-only, read-only chamber probe (rendered state only). */
    __coreChamberProbe?: {
      core_state: string;
      visual_state: CoreVisualState;
      review_open: boolean;
      completion_open: boolean;
      kai_texture: string | null;
      status_console: string;
      dev_label_visible: boolean;
    } | null;
  }
}

export class CoreChamberScene extends PilotZoneScene {
  protected readonly roomId = 'core_chamber';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'core_chamber' as const;

  private emissive: Phaser.GameObjects.Graphics | null = null;
  private lightPool: Phaser.GameObjects.Ellipse | null = null;
  private ringGlow: Phaser.GameObjects.Ellipse | null = null;
  private statusConsoleText: Phaser.GameObjects.Text | null = null;
  private coreChip: Phaser.GameObjects.Text | null = null;
  private coreSprite: Phaser.GameObjects.Sprite | null = null;
  private devLabel: Phaser.GameObjects.Text | null = null;
  private visualState: CoreVisualState = 'inactive';
  private rampProgress = 0;
  private rampTween: Phaser.Tweens.Tween | null = null;
  private kaiTexture: string | null = null;
  private completionOpen = false;
  private reviewOpen = false;
  private ambientPhase = 0;
  /** Wall-clock at which the handoff settled (controls appear shortly after). */
  private handoffSettledAtMs: number | null = null;
  /** Window interval (the chamber's own clock is paused under the surface). */
  private noticeTicker: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(key.scene.coreChamber);
  }

  protected getLayout(): RoomLayout {
    // World V2 rebuild: the 22×12 painted plate is the architecture and
    // the machinery; collision is the audited logical grid.
    return {
      theme: 'core',
      grid: [...CORE_LAYOUT],
      solids: CORE_SOLIDS,
      field: 'wide',
      plateTexture: 'w2-core-plate',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 22 * TILE, height: 12 * TILE };
  }

  protected getSpawn(): { x: number; y: number } {
    // Machine-audited: inside the south door, ≥ 80 px from it and outside
    // every interactable's 72 px radius (V2 finding U8-8).
    return CORE_SPAWN;
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
    this.visualState = this.deriveVisualState();
    this.rampProgress = this.visualState === 'stable' ? 1 : 0;

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.refreshChamberVisuals();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.rampTween?.stop();
      this.rampTween = null;
      installClosureLogSink(null);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__coreChamberProbe = null;
      }
    });

    this.refreshChamberVisuals();
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'utility_core_deck',
      spawn: 'core_chamber',
      gate: () =>
        coreExitAllowed(closureCore())
          ? null
          : 'Synchronising — stand by a moment.',
      registryId: 'core.door_deck',
    });
    // World V2: the south door is baked into the plate — the generic leaf
    // would double it; its class lamp sits on the painted lintel lamp.
    this.doorImage('core.door_deck')?.setVisible(false);
    this.placeDoorIndicator('core.door_deck', 344, 304);

    // ——— The Core (the painted reactor on its platform) ———
    const core = CORE_SITES.core;

    // World V2: the dormant vessel, its platform, the flanking pipe runs
    // and the floor ring are painted; the dynamic state layers over them
    // as ADD-blended glows (floor ring, vessel) and the emissive graphics
    // (sight column, collar lamps). Presentation only.
    this.lightPool = this.add
      .ellipse(
        CORE_ART.floorRing.x,
        CORE_ART.floorRing.y,
        CORE_ART.floorRing.w,
        CORE_ART.floorRing.h,
        DORMANT,
        0.28,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DepthLayer.FloorDecal + 0.02);
    this.ringGlow = this.add
      .ellipse(
        CORE_ART.vesselGlow.x,
        CORE_ART.vesselGlow.y,
        CORE_ART.vesselGlow.w,
        CORE_ART.vesselGlow.h,
        DORMANT,
        0.12,
      )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DepthLayer.FloorDecal + 0.03);
    this.emissive = this.add.graphics().setDepth(DepthLayer.WorldReadout);

    // The Core's control point (the interactable) at the platform's west
    // face, approached from the west floor.
    this.addStation({
      interactionKey: 'pilotCore',
      label: 'Core',
      texture: 'proc-core-interface',
      x: core.x,
      y: core.y,
      verb: 'Inspect the',
      registryId: 'core.core',
      onPromptOpened: () => this.onCorePromptOpened(),
    });
    // Unit 7 (V3): the state chip stands on the platform's west face,
    // off the approach point, so it never covers the avatar.
    this.coreChip = this.add
      .text(core.x + 8, core.y + 30, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        padding: { x: 4, y: 2 },
        resolution: 2,
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.88)
      .setDepth(worldDepth(core.y + 70));
    registerPilotStation({
      id: 'core',
      zone: 'core_chamber',
      x: core.x,
      y: core.y,
      label: 'Core',
      stages: ['core_sync'],
      isDone: () => closureCore().state === 'stable',
      order: 0,
    });

    // ——— Kai at the chamber console (reacts on stabilisation) ———
    const kai = CORE_SITES.kai;

    // Unit 7 (V14): Kai works the feed console (two-frame loop) until the
    // Core is stable, then holds the finished pose.
    const stable = closureCore().state === 'stable';

    this.kaiTexture = stable ? 'plv1-kai-done' : 'plv1-kai-work-a';
    this.addNpc({
      interactionKey: 'pilotKai',
      label: 'Kai',
      npcName: 'Kai — engineering',
      texture: this.kaiTexture,
      workFrames: stable ? undefined : ['plv1-kai-work-a', 'plv1-kai-work-b'],
      x: kai.x,
      y: kai.y,
      verb: 'Talk to',
      registryId: 'core.kai',
    });

    // ——— Status console (west, painted): the three feeds + Core state ———
    const status = CORE_SITES.statusConsole;

    // The readout chip hangs on the wall band beside the painted console
    // (never at the room's edge, where the camera would clip it).
    this.statusConsoleText = this.add
      .text(status.x + 56, status.y - 88, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
        padding: { x: 4, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5, 0)
      .setAlpha(0.88)
      .setDepth(worldDepth(status.y - 60));

    // ——— World V2: the painted plate IS the architecture and all the
    // machinery — hide the control point's marker sprite (interaction,
    // prompt and events untouched). The V4 grammar plates, coolant
    // columns, pillars and dressing are gone: the plate carries them.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        child.texture.key === 'proc-core-interface'
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

  // ————————————————————————————————— prompts ——

  private onCorePromptOpened(): boolean {
    const core = closureCore();

    if (core.state === 'synchronizing') {
      this.showFeedbackMessage('Synchronising — stand by.');

      return false;
    }

    this.logScenarioEvent('pilotCore', 'pilot_closure_core_inspected', {
      metadata: {
        non_scored: true,
        core_state: core.state,
        visual_state: this.visualState,
        dev_inspection: devInspectionActive(),
      },
    });
    refreshClosureProbe();

    return true;
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotKai') {
      return this.kaiBody();
    }

    if (interactionKey !== 'pilotCore') {
      return undefined;
    }

    const core = closureCore();
    const feeds = closureFeeds();
    const feedLine = FEED_ORDER.map(
      (feed) => `${feed} ${feedReady(feeds, feed) ? '●' : '○'}`,
    ).join(' · ');

    switch (core.state) {
      case 'stable':
        return `CORE — STABLE.\nSynchronised this shift. Feeds: ${feedLine}.\nThe station record is closed; nothing further is required.`;
      case 'confirmation_armed':
      case 'review_open':
      case 'accessible':
        return `CORE — PREPARED.\nFeeds: ${feedLine}. Vessel cold, sight column dark. Synchronisation is offered through the operational review.`;
      case 'sealed':
      default:
        return `CORE — INACTIVE.\nFeeds: ${feedLine}. The chamber is open for inspection; synchronisation is not offered while access is sealed.`;
    }
  }

  private kaiBody(): string {
    switch (closureCore().state) {
      case 'stable':
        return "Kai: Core's holding steady — that's the shift. Thank you.";
      case 'synchronizing':
        return 'Kai: Holding… sync in progress.';
      default:
        return 'Kai: Feeds read green from here. When you are ready, the Core takes the confirmation — nothing else is on the shift. You can step out first if you want.';
    }
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'pilotKai') {
      return this.npcBeatOptions('pilotKai', {
        body: this.kaiBody(),
        options: [{ label: 'Understood.', tag: `core_${closureCore().state}` }],
      });
    }

    if (interactionKey !== 'pilotCore') {
      return [];
    }

    const core = closureCore();

    if (core.state === 'stable') {
      return [
        {
          label: 'Review the completion notice',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.openCompletionNotice(),
        },
        { label: 'Step away', feedback: '', getEventTypes: () => [] },
      ];
    }

    if (core.state === 'sealed' && !devInspectionActive()) {
      return [
        {
          label: 'Inspect the Core',
          feedback:
            'Vessel cold. The sight column is dark; coolant collars at rest.',
          getEventTypes: () => [],
        },
        { label: 'Step away', feedback: '', getEventTypes: () => [] },
      ];
    }

    return [
      {
        label: 'Inspect the Core',
        feedback:
          'Vessel cold, feeds live at the collars. Ready for synchronisation.',
        getEventTypes: () => [],
      },
      {
        label: 'Open the synchronisation review',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.openSyncReview(),
      },
      { label: 'Step away', feedback: '', getEventTypes: () => [] },
    ];
  }

  // ————————————————————————————————— synchronisation review ——

  private openSyncReview() {
    const now = Date.now();
    const result = coreLifecycleCommand('open_review', now, 'keyboard');

    if (!result.ok) {
      sfxUnavailable();
      this.showFeedbackMessage('The review is not available now.');

      return;
    }

    this.reviewOpen = true;
    openWorkSurface(this, {
      surfaceId: 'core_sync_review',
      model: () => this.reviewModel(),
      onClose: (inputMode) => this.onReviewEscape(inputMode),
      onClosed: () => {
        this.reviewOpen = false;

        const core = closureCore();

        if (
          core.state === 'review_open' ||
          core.state === 'confirmation_armed'
        ) {
          coreLifecycleCommand('close_review', Date.now(), 'system');
        }

        this.refreshChamberVisuals();
        this.refreshGuidance();
      },
    });
    this.refreshChamberVisuals();
  }

  /** ESC: cancel-before-close — an armed confirmation stands down first. */
  private onReviewEscape(inputMode: InputMode): boolean {
    const core = closureCore();

    if (core.state === 'confirmation_armed') {
      coreLifecycleCommand('stand_down', Date.now(), inputMode);
      activeWorkSurface(this)?.showFeedback(
        'Synchronisation stood down. ESC again closes the review.',
      );
      refreshClosureProbe();

      return false;
    }

    if (core.state === 'synchronizing') {
      return false;
    }

    return true;
  }

  private reviewModel(): WorkSurfaceModel {
    const core = closureCore();
    const readiness = currentRouteReadiness();
    const c = readiness.counts;
    const feeds = closureFeeds();
    const loggingActive = researchRuntime.getEvents().length > 0;
    // Shift segments reached = the highest route episode the stage machine
    // entered (navigation fact; never a performance count).
    const episodesReached = Math.max(
      pilotEpisode(),
      ...pilotRouteSummary().stage_history.map(
        (entry) => STAGE_EPISODE[entry.to],
      ),
    );
    const armed = core.state === 'confirmation_armed';
    const ready = coreAccessReady();
    const readout = (
      id: string,
      x: number,
      y: number,
      w: number,
      label: string,
      detail: string,
    ): SurfaceElement => ({
      id,
      kind: 'readout',
      label,
      detail,
      x,
      y,
      w,
      h: 46,
    });
    const elements: SurfaceElement[] = [
      readout(
        'episodes',
        18,
        76,
        220,
        'Shift segments reached',
        episodesReached >= 6 ? 'all six' : `${episodesReached} of six`,
      ),
      readout(
        'feeds',
        250,
        76,
        220,
        'Core feeds',
        FEED_ORDER.map(
          (feed) => `${feed} ${feedReady(feeds, feed) ? '●' : '○'}`,
        ).join(' · '),
      ),
      readout(
        'sync_ready',
        482,
        76,
        220,
        'Synchronisation readiness',
        readiness.dev_inspection
          ? 'DEV inspection'
          : ready
            ? 'READY'
            : 'NOT READY',
      ),
      readout(
        'recorded',
        18,
        134,
        220,
        'Station tasks recorded',
        `${c.recorded}`,
      ),
      readout(
        'recorded_limited',
        250,
        134,
        220,
        'Recorded with limited evidence',
        `${c.recorded_limited}`,
      ),
      readout(
        'not_observed',
        482,
        134,
        220,
        'Not observed',
        `${c.not_observed}`,
      ),
      readout(
        'technical',
        18,
        192,
        220,
        'Technical state recorded',
        `${c.technical}`,
      ),
      readout(
        'questionnaire',
        250,
        192,
        452,
        'Questionnaire handoff',
        'prepared — administered outside the station (pending)',
      ),
      readout(
        'logging',
        18,
        250,
        684,
        'Technical logging',
        `${loggingActive ? 'session record active' : 'session record empty'} · export available · no result is computed here`,
      ),
      {
        id: 'note',
        kind: 'text',
        label: armed
          ? 'ARMED. Confirming synchronises the Core and closes the shift; the station record is already closed and nothing here changes it. Stand down to keep reviewing.'
          : 'This review lists data-quality status only. Synchronisation is a two-step action: arm it, then confirm it with a separate control.',
        x: 18,
        y: 312,
        w: 684,
        h: 60,
        align: 'left',
      },
    ];

    if (armed) {
      elements.push(
        {
          id: 'stand_down',
          kind: 'button',
          label: 'STAND DOWN',
          x: 18,
          y: 400,
          w: 200,
          h: 44,
          onActivate: (inputMode) => {
            coreLifecycleCommand('stand_down', Date.now(), inputMode);
            activeWorkSurface(this)?.showFeedback(
              'Synchronisation stood down.',
            );
            refreshClosureProbe();
          },
        },
        {
          id: 'confirm_sync',
          kind: 'button',
          label: 'CONFIRM SYNCHRONISATION',
          state: 'accent',
          x: 402,
          y: 400,
          w: 300,
          h: 44,
          onActivate: (inputMode) => this.confirmSynchronisation(inputMode),
        },
      );
    } else {
      elements.push(
        {
          id: 'arm_sync',
          kind: 'button',
          label: ready ? 'ARM SYNCHRONISATION' : 'SYNCHRONISATION UNAVAILABLE',
          state: ready ? 'idle' : 'disabled',
          x: 18,
          y: 400,
          w: 300,
          h: 44,
          onActivate: (inputMode) => {
            const result = coreLifecycleCommand('arm', Date.now(), inputMode);

            if (!result.ok) {
              activeWorkSurface(this)?.showFeedback('Not available now.');
            } else {
              activeWorkSurface(this)?.showFeedback(
                'Armed — confirm with the separate control, or stand down.',
              );
            }

            refreshClosureProbe();
          },
        },
        {
          id: 'close_review',
          kind: 'button',
          label: 'CLOSE REVIEW',
          x: 502,
          y: 400,
          w: 200,
          h: 44,
          onActivate: () => activeWorkSurface(this)?.close(),
        },
      );
    }

    return {
      title: 'CORE SYNCHRONISATION — OPERATIONAL REVIEW',
      subtitle: readiness.dev_inspection ? 'DEV INSPECTION' : 'Core Chamber',
      status: armed
        ? 'Confirmation ARMED — a second, separate action synchronises.'
        : 'Data-quality status only. Nothing here is a result.',
      elements,
      help: armed
        ? 'ENTER activates the focused control · move focus right (→) to CONFIRM · click also works · ESC stands down'
        : 'Arrows/TAB focus · ENTER or SPACE activate · click also works · ESC closes',
    };
  }

  private confirmSynchronisation(inputMode: InputMode) {
    const now = Date.now();
    const result = coreLifecycleCommand('confirm', now, inputMode);

    if (!result.ok) {
      activeWorkSurface(this)?.showFeedback('Not available now.');

      return;
    }

    activeWorkSurface(this)?.close();
    this.beginRamp();
  }

  // ————————————————————————————————— synchronisation ramp ——

  private beginRamp() {
    // World input inert for the ramp (movement, prompts, doors); the ramp
    // is short and always finishes in this scene.
    beginManualWorldAction();
    this.input.keyboard?.resetKeys();
    sfxMachineOn();
    this.visualState = 'synchronizing';
    this.setKaiTexture('plv1-kai-work-a');
    this.refreshChamberVisuals();

    const duration = prefersReducedMotion()
      ? SYNC_RAMP_REDUCED_MS
      : SYNC_RAMP_MS;

    this.rampProgress = 0;
    this.rampTween?.stop();
    this.rampTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        this.rampProgress = tween.getValue() ?? 0;
        this.drawEmissive();
      },
      onComplete: () => this.finishRamp(),
    });
  }

  private finishRamp() {
    this.rampTween = null;
    this.rampProgress = 1;
    coreLifecycleCommand('finish', Date.now(), 'system');
    endManualWorldAction();
    sfxComplete();
    this.visualState = 'stable';
    this.setKaiTexture('plv1-kai-done');
    this.refreshChamberVisuals();
    this.refreshGuidance();
    this.openCompletionNotice();
    // Pilot V3 (Unit 2) — PROVISIONAL(INT-1/INT-2/INT-5): the shift's
    // terminal state starts the participant pipeline (status axes →
    // export with bounded retry → validated survey handoff). Idempotent;
    // never blocks the chamber; the notice re-renders as it settles.
    void researchRuntime.completeParticipantSession();
  }

  private setKaiTexture(texture: string) {
    if (!this.textures.exists(texture)) {
      return;
    }

    if (texture === 'plv1-kai-done') {
      this.stopNpcWorkLoop('pilotKai');
    }

    this.kaiTexture = texture;
    this.npcSpriteFor('pilotKai')?.setTexture(texture);
  }

  // ————————————————————————————————— completion notice ——

  private openCompletionNotice() {
    if (this.completionOpen) {
      return;
    }

    this.completionOpen = true;
    this.logScenarioEvent(
      'pilotCore',
      'pilot_closure_completion_notice_opened',
      {
        metadata: {
          non_scored: true,
          context: currentClosureContext(),
          dev_inspection: devInspectionActive(),
        },
      },
    );
    // Re-render the notice as the handoff settles (record sent / survey
    // link ready) and every half second for the countdown; both stop when
    // the notice closes.
    const unsubscribe = researchRuntime.subscribeHandoff((state) => {
      if (
        this.handoffSettledAtMs === null &&
        (state.phase === 'settled' || state.phase === 'blocked')
      ) {
        this.handoffSettledAtMs = Date.now();
      }

      if (this.completionOpen) {
        activeWorkSurface(this)?.refresh();
      }
    });

    if (this.noticeTicker !== null) {
      clearInterval(this.noticeTicker);
    }

    this.noticeTicker = setInterval(() => {
      if (this.completionOpen) {
        activeWorkSurface(this)?.refresh();
      }
    }, 500);

    openWorkSurface(this, {
      surfaceId: 'core_completion_notice',
      model: () => this.completionModel(),
      onClose: () => {
        const phase = researchRuntime.getHandoffState().phase;

        if (phase === 'idle' || phase === 'exporting') {
          // Never dismiss the terminal notice while the study data is
          // still being sent (gameplay review finding 5).
          activeWorkSurface(this)?.showFeedback(
            'Study data is still being sent — one moment.',
          );

          return false;
        }

        // Closing after settle withdraws automatic navigation: the survey
        // stays reachable from the notice (Core prompt → review notice).
        researchRuntime.cancelAutoNavigate();

        return true;
      },
      onClosed: () => {
        unsubscribe();

        if (this.noticeTicker !== null) {
          clearInterval(this.noticeTicker);
          this.noticeTicker = null;
        }

        this.completionOpen = false;
        this.refreshChamberVisuals();
      },
    });
    this.refreshChamberVisuals();
  }

  /**
   * Neutral, participant-facing handoff lines (Pilot V3 Unit 2). No score,
   * no item, no validity word: only whether the record reached the study
   * server and what happens next.
   */
  private handoffLines(): { record: string; survey: string; next: string } {
    const handoff = researchRuntime.getHandoffState();
    const exportResult = handoff.last_export;
    const sending = handoff.phase === 'idle' || handoff.phase === 'exporting';
    let record: string;

    if (sending) {
      record =
        handoff.export_attempts > 1
          ? `Study data: sending to the study server… (attempt ${handoff.export_attempts} of 3)`
          : 'Study data: sending to the study server…';
    } else if (exportResult?.status === 'acknowledged') {
      record = 'Study data: received by the study server.';
    } else if (exportResult?.status === 'failed') {
      record =
        'Study data: could not be sent just now — it is kept on this device, not lost.';
    } else {
      record =
        'Study data: kept on this device (no study server is configured for this session).';
    }

    let survey: string;
    let next: string;

    if (sending) {
      survey = 'Survey: preparing the handoff…';
      next =
        'Please stay on this page while the data is sent — this can take up to a minute.';
    } else if (handoff.phase === 'navigating') {
      survey = 'Survey: opening now…';
      next = 'Nothing else is needed inside the station.';
    } else if (handoff.return_url !== null && handoff.phase === 'blocked') {
      survey = 'Survey: automatic opening did not work here.';
      next = 'Use CONTINUE TO SURVEY to open the survey.';
    } else if (handoff.return_url !== null) {
      const remaining =
        handoff.auto_navigate_at_ms === null
          ? null
          : Math.max(
              0,
              Math.ceil((handoff.auto_navigate_at_ms - Date.now()) / 1000),
            );

      survey =
        remaining === null
          ? 'Survey: ready — use CONTINUE TO SURVEY when you are ready.'
          : `Survey: opens automatically in ${remaining} s — or use CONTINUE TO SURVEY now.`;
      next =
        exportResult?.status === 'failed'
          ? 'Please mention the unsent data to the researcher (you can also note it in the survey).'
          : 'Nothing else is needed inside the station.';
    } else if (handoff.return_refusal === 'absent') {
      survey = 'Survey: no survey link was provided for this session.';
      next =
        'Nothing else is needed inside the station; the study continues as the researcher arranged.';
    } else {
      survey = 'Survey: the survey link could not be used here.';
      next =
        'Keep this window open and tell the researcher — your study data is kept on this device.';
    }

    return { record, survey, next };
  }

  private completionModel(): WorkSurfaceModel {
    const context = currentClosureContext();
    const line = (id: string, y: number, label: string): SurfaceElement => ({
      id,
      kind: 'text',
      label,
      x: 18,
      y,
      w: 684,
      h: 34,
      align: 'left',
    });

    const handoff = researchRuntime.getHandoffState();
    const lines = this.handoffLines();
    const sending = handoff.phase === 'idle' || handoff.phase === 'exporting';
    // Controls appear a beat after the handoff settles so a stray click on
    // the CONFIRM footprint can never land on them (review finding 10).
    const controlsReady =
      !sending &&
      this.handoffSettledAtMs !== null &&
      Date.now() - this.handoffSettledAtMs >= NOTICE_CONTROL_DELAY_MS;
    const canContinue =
      controlsReady &&
      handoff.return_url !== null &&
      (handoff.phase === 'settled' || handoff.phase === 'blocked');
    const elements: SurfaceElement[] = [
      line(
        'route',
        84,
        `Gameplay route: ${context.gameplay_route_closed ? 'closed' : 'open'}.`,
      ),
      line(
        'record',
        124,
        `Station record: ${context.research_record_closed ? 'closed' : 'open'} — data-quality status recorded; no result is computed here.`,
      ),
      line(
        'questionnaire',
        164,
        'Questionnaire handoff: prepared — a short questionnaire follows outside the station.',
      ),
      line('export', 204, lines.record),
      line('survey', 244, lines.survey),
      line('next', 284, lines.next),
    ];

    // Continue first so keyboard focus lands on the primary control when
    // the controls appear (review finding 4); close sits panel-left, clear
    // of the CONFIRM SYNCHRONISATION footprint.
    if (canContinue) {
      elements.push({
        id: 'continue_survey',
        kind: 'button',
        label: 'CONTINUE TO SURVEY',
        state: 'accent',
        x: 402,
        y: 400,
        w: 300,
        h: 44,
        onActivate: () => {
          researchRuntime.continueToSurvey();
        },
      });
    }

    if (controlsReady) {
      elements.push({
        id: 'close_notice',
        kind: 'button',
        label: 'CLOSE NOTICE',
        x: 18,
        y: 400,
        w: 220,
        h: 44,
        onActivate: () => activeWorkSurface(this)?.close(),
      });
    }

    return {
      title: 'SHIFT COMPLETE',
      subtitle: 'Core Chamber',
      status: sending
        ? 'Core stable — sending the study data.'
        : 'Core stable — the station record is closed.',
      elements,
      help: canContinue
        ? 'ENTER opens the survey (focused control) · TAB moves focus · click also works · ESC closes this notice'
        : controlsReady
          ? 'ENTER or SPACE closes · click also works · ESC closes'
          : 'Please wait — the study data is being sent',
    };
  }

  // ————————————————————————————————— rendering ——

  private deriveVisualState(): CoreVisualState {
    const core = closureCore();

    if (core.state === 'stable') {
      return 'stable';
    }

    if (core.state === 'synchronizing') {
      return 'synchronizing';
    }

    return coreAccessReady() ? 'prepared' : 'inactive';
  }

  private refreshChamberVisuals() {
    if (this.visualState !== 'synchronizing') {
      this.visualState = this.deriveVisualState();
      this.rampProgress = this.visualState === 'stable' ? 1 : 0;
    }

    this.drawEmissive();

    const core = closureCore();
    const feeds = closureFeeds();
    const stateLine =
      this.visualState === 'stable'
        ? 'CORE · STABLE'
        : this.visualState === 'synchronizing'
          ? 'CORE · SYNCHRONISING'
          : this.visualState === 'prepared'
            ? 'CORE · PREPARED'
            : 'CORE · INACTIVE';

    this.coreChip?.setText(stateLine);
    this.refreshCoreSprite();
    this.statusConsoleText?.setText(
      [
        ...FEED_ORDER.map(
          (feed) =>
            `${feed.toUpperCase()} ${feedReady(feeds, feed) ? '●' : '○'}`,
        ),
        stateLine.replace('CORE · ', ''),
      ].join('\n'),
    );

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__coreChamberProbe = {
        core_state: core.state,
        visual_state: this.visualState,
        review_open: this.reviewOpen,
        completion_open: this.completionOpen,
        kai_texture: this.kaiTexture,
        status_console: this.statusConsoleText?.text ?? '',
        dev_label_visible: this.devLabel?.visible ?? false,
      };
    }

    refreshClosureProbe();
  }

  /** Unit 7 (V18): frame/animation of the PROVISIONAL core column. */
  private refreshCoreSprite() {
    const sprite = this.coreSprite;

    if (sprite === null) {
      return;
    }

    if (this.visualState === 'synchronizing') {
      if (prefersReducedMotion()) {
        sprite.stop();
        sprite.setFrame(3);
      } else if (!sprite.anims.isPlaying) {
        sprite.play('plv1-core-sync-loop');
      }

      sprite.clearTint();
      return;
    }

    sprite.stop();
    sprite.setFrame(this.visualState === 'stable' ? 5 : 0);

    if (this.visualState === 'inactive') {
      sprite.setTint(0x8a98a6);
    } else {
      sprite.clearTint();
    }
  }

  private drawEmissive() {
    const g = this.emissive;

    if (g === null) {
      return;
    }

    // World V2: the sight column is the painted vessel's glass window;
    // the collar lamps sit on the platform's front face.
    const column = CORE_ART.sightColumn;
    const progress =
      this.visualState === 'stable'
        ? 1
        : this.visualState === 'synchronizing'
          ? this.rampProgress
          : 0;
    const prepared = this.visualState === 'prepared';

    g.clear();

    // Sight column: dormant teal → cyan fills upward with the ramp.
    g.fillStyle(prepared ? AMBER : DORMANT, prepared ? 0.45 : 0.55);
    g.fillRect(column.x, column.y, column.w, column.h);

    if (progress > 0) {
      const lit = Math.round(column.h * progress);

      g.fillStyle(ACCENT, 0.85);
      g.fillRect(column.x, column.y + column.h - lit, column.w, lit);
    }

    // Collar lamps (four): lit when stable / progressively during the ramp.
    for (const [i, lamp] of CORE_ART.collarLamps.entries()) {
      const lit = progress >= (i + 1) / 4;

      g.fillStyle(lit ? ACCENT : prepared ? AMBER : DORMANT, lit ? 1 : 0.7);
      g.fillRect(lamp.x - 4, lamp.y - 2, 8, 4);
    }

    const glow = progress > 0 ? ACCENT : prepared ? AMBER : DORMANT;

    this.lightPool?.setFillStyle(glow, 0.14 + 0.3 * progress);
    this.ringGlow?.setFillStyle(glow, 0.06 + 0.16 * progress);
  }

  /**
   * Unit 7 (V5): inside the chamber the ONE objective line describes the
   * work at the Core rather than the door already passed (deck precedent).
   */
  protected buildRouteObjectiveText(): string {
    const state = closureCore().state;

    if (pilotStage() === 'core_sync' && state !== 'stable') {
      // World V1 (U2): short mission-card lines (≤ 44 characters).
      return state === 'synchronizing'
        ? 'Synchronising — stand by.'
        : 'Inspect the Core, then confirm the review.';
    }

    return super.buildRouteObjectiveText();
  }

  protected onPilotUpdate(): void {
    if (this.visualState !== 'stable' || prefersReducedMotion()) {
      return;
    }

    // Stable ambient: a slow, low-amplitude breathing of the light pool
    // (period ~3 s; never a flash).
    this.ambientPhase = (this.ambientPhase + this.game.loop.delta / 3000) % 1;
    this.lightPool?.setAlpha(
      0.85 + 0.15 * Math.sin(this.ambientPhase * Math.PI * 2),
    );
  }
}
