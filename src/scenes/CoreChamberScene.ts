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

import { Depth, key } from '../constants';
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
import { CORE_SITES } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

/** Synchronisation ramp (inactive → stable), full motion. */
const SYNC_RAMP_MS = 2400;
const SYNC_RAMP_REDUCED_MS = 300;

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
  private devLabel: Phaser.GameObjects.Text | null = null;
  private visualState: CoreVisualState = 'inactive';
  private rampProgress = 0;
  private rampTween: Phaser.Tweens.Tween | null = null;
  private kaiTexture: string | null = null;
  private completionOpen = false;
  private reviewOpen = false;
  private ambientPhase = 0;

  constructor() {
    super(key.scene.coreChamber);
  }

  protected getLayout(): RoomLayout {
    // 25×19 octagonal chamber: the Core block (rows 6-8, cols 11-13) at
    // the centre, Kai's console east, the status console west, the
    // Utility Deck doorway on the SOUTH wall (row 16).
    return {
      theme: 'core',
      grid: [
        '#########################',
        '#########################',
        '#########################',
        '########.........########',
        '######.............######',
        '#####...............#####',
        '####.......###.......####',
        '####.......###.......####',
        '####.......###.......####',
        '#####...............#####',
        '#####...............#####',
        '######.............######',
        '#######...........#######',
        '########.........########',
        '#########.......#########',
        '##########.....##########',
        '###########---###########',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return { x: 12.5 * TILE, y: 13 * TILE };
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
    });

    // ——— The Core (physically substantial: vessel over the central block) ———
    const core = CORE_SITES.core;
    const visual = CORE_SITES.coreVisual;

    this.lightPool = this.add
      .ellipse(visual.x, visual.y + 78, 240, 70, DORMANT, 0.28)
      .setDepth(0.4);
    this.ringGlow = this.add
      .ellipse(visual.x, visual.y + 6, 150, 170, DORMANT, 0.12)
      .setDepth(0.5);
    // Flanking coolant towers give the Core its machinery mass; the
    // vessel stands between them over the central block.
    this.addDecor(visual.x - 70, visual.y + 12, 'proc-core-column');
    this.addDecor(visual.x + 70, visual.y + 12, 'proc-core-column');
    this.addDecor(visual.x, visual.y, 'proc-core-vessel');
    this.emissive = this.add.graphics().setDepth(1.5);
    this.signage(visual.x, visual.y - 84, 'STATION CORE');

    // The Core's control pedestal (the interactable) at the vessel's foot.
    this.addStation({
      interactionKey: 'pilotCore',
      label: 'Core',
      texture: 'proc-core-interface',
      x: core.x,
      y: core.y,
      onPromptOpened: () => this.onCorePromptOpened(),
    });
    this.coreChip = this.add
      .text(core.x, core.y + 34, '', {
        backgroundColor: '#101820',
        color: '#9fb2c1',
        font: '10px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
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

    this.kaiTexture =
      closureCore().state === 'stable' ? 'plv1-kai-done' : 'plv1-kai';
    this.addNpc({
      interactionKey: 'pilotKai',
      label: 'Kai',
      npcName: 'Kai — engineering',
      texture: this.kaiTexture,
      x: kai.x,
      y: kai.y,
    });
    this.addDecor(kai.x + 44, kai.y + 4, 'proc-console-wall');
    this.signage(kai.x + 22, kai.y - 48, 'FEED CONSOLE');

    // ——— Status console (west): the three feeds + Core state, labels only ———
    const status = CORE_SITES.statusConsole;

    this.addDecor(status.x, status.y, 'proc-console-scenario');
    this.signage(status.x, status.y - 44, 'CORE STATUS');
    this.statusConsoleText = this.add
      .text(status.x, status.y + 36, '', {
        color: '#9fb2c1',
        font: '10px monospace',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    // ——— Dressing: coolant collars, conduit trunks, light pools ———
    this.addDecor(8.5 * TILE, 4.6 * TILE, 'proc-wall-pipes');
    this.addDecor(16.5 * TILE, 4.6 * TILE, 'proc-wall-pipes');
    this.addDecor(5.5 * TILE, 11.6 * TILE, 'proc-rig-intake');
    this.addDecor(19.5 * TILE, 11.6 * TILE, 'proc-cabinet-calibration');
    this.addDecor(7.5 * TILE, 13.2 * TILE, 'proc-crate-components');
    this.addDecor(17.5 * TILE, 13.2 * TILE, 'proc-bin-consumables');
    this.addDecor(6.5 * TILE, 5.3 * TILE, 'proc-shelf-electronics');
    this.addDecor(18.5 * TILE, 5.3 * TILE, 'proc-rack-tools');
    this.addDecor(9 * TILE, 6.5 * TILE, 'proc-light-pool');
    this.addDecor(16 * TILE, 6.5 * TILE, 'proc-light-pool');
    this.addDecor(12.5 * TILE, 12 * TILE, 'proc-light-pool');
    this.signage(12.5 * TILE, 14.6 * TILE, '▼  UTILITY DECK');

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

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
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
  }

  private setKaiTexture(texture: string) {
    if (!this.textures.exists(texture)) {
      return;
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
    openWorkSurface(this, {
      surfaceId: 'core_completion_notice',
      model: () => this.completionModel(),
      onClose: () => true,
      onClosed: () => {
        this.completionOpen = false;
        this.refreshChamberVisuals();
      },
    });
    this.refreshChamberVisuals();
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

    return {
      title: 'SHIFT COMPLETE',
      subtitle: 'Core Chamber',
      status: 'Core stable — the station record is closed.',
      elements: [
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
        line('export', 204, 'Session record: available for export.'),
        line(
          'next',
          244,
          'Nothing further is required. You may leave the chamber or close this notice; the Core stays stable.',
        ),
        {
          id: 'close_notice',
          kind: 'button',
          label: 'CLOSE NOTICE',
          x: 250,
          y: 400,
          w: 220,
          h: 44,
          onActivate: () => activeWorkSurface(this)?.close(),
        },
      ],
      help: 'ENTER or SPACE closes · click also works · ESC closes',
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

  private drawEmissive() {
    const g = this.emissive;

    if (g === null) {
      return;
    }

    const visual = CORE_SITES.coreVisual;
    const columnX = visual.x - 4;
    const columnTop = visual.y - 46;
    const columnHeight = 84;
    const progress =
      this.visualState === 'stable'
        ? 1
        : this.visualState === 'synchronizing'
          ? this.rampProgress
          : 0;
    const prepared = this.visualState === 'prepared';

    g.clear();

    // Sight column: dormant teal → cyan fills upward with the ramp.
    g.fillStyle(prepared ? AMBER : DORMANT, prepared ? 0.6 : 0.9);
    g.fillRect(columnX, columnTop, 8, columnHeight);

    if (progress > 0) {
      const lit = Math.round(columnHeight * progress);

      g.fillStyle(ACCENT, 1);
      g.fillRect(columnX, columnTop + columnHeight - lit, 8, lit);
    }

    // Collar lamps (four): lit when stable / progressively during the ramp.
    for (let i = 0; i < 4; i++) {
      const y = visual.y - 36 + i * 22;
      const lit = progress >= (i + 1) / 4;

      g.fillStyle(lit ? ACCENT : prepared ? AMBER : DORMANT, lit ? 1 : 0.7);
      g.fillRect(visual.x - 38, y, 6, 4);
      g.fillRect(visual.x + 32, y, 6, 4);
    }

    const glow = progress > 0 ? ACCENT : prepared ? AMBER : DORMANT;

    this.lightPool?.setFillStyle(glow, 0.14 + 0.3 * progress);
    this.ringGlow?.setFillStyle(glow, 0.06 + 0.16 * progress);
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
