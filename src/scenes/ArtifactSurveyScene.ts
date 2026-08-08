import { key } from '../constants';
import type { PhysicalPlacement } from '../gameplay';
import {
  addInventoryItem,
  burstParticles,
  cameraKick,
  completeTask,
  getTaskStatus,
  hasInventoryItem,
  performWorldAction,
  PhysicalManipulationLayer,
  playActionAnimation,
  registerTask,
  ringPulse,
  sfxComplete,
  sfxDig,
  sfxPickup,
  sfxScan,
  showFloatingText,
  snowfall,
  sparkle,
} from '../gameplay';
import {
  acceptQ16Survey,
  collectQ16Artifact,
  declareOpportunity,
  digQ16Site,
  getQ16Artifact,
  getQ16Site,
  getQ16Tray,
  markOpportunityCompleted,
  markOpportunityEntered,
  markOpportunityOffered,
  markQ16BriefRead,
  Q16_ARTIFACTS,
  Q16_ENTRY_STATE_VERSION,
  Q16_OPPORTUNITY_ID,
  Q16_SITES,
  Q16_TRAYS,
  q16ManifestMismatches,
  q16ReportAvailable,
  q16SiteDug,
  q16SiteScanned,
  q16State,
  q16Summary,
  refreshValidityProbe,
  reportQ16Survey,
  restowQ16Artifact,
  runQ16ManifestCheck,
  scanQ16Site,
  storeQ16Artifact,
} from '../measurement';
import type {
  InteractionKey,
  PromptOption,
  PromptStage,
  RoomLayout,
} from '../world';
import { RoomScene } from '../world';

const NOOR_POSITION = { x: 8 * 32, y: 3 * 32 };
const NOTEBOOK_POSITION = { x: 2 * 32, y: 4 * 32 };
const CASE_POSITION = { x: 18 * 32, y: 3 * 32 };

const SURVEY_BRIEF_BODY = [
  'Survey brief — Ridge Annex specimen sweep:',
  '1. Scan each staked candidate site with the field scanner.',
  '2. A HIGH return marks a buried specimen; no return means the site is clear.',
  '3. Dig only flagged sites, and collect what they yield.',
  '4. Place each specimen into its named case tray (Cores / Minerals / Biology).',
  '5. Run the manifest check at the case, then report back here.',
].join('\n');

/**
 * Ridge Annex — the dedicated Q16 artifact-survey area
 * (physical-mechanics session, Unit 3; measurement design in
 * src/measurement/q16ArtifactSurvey.ts).
 *
 * A bounded, readable exterior zone off the Survey Terrace: Surveyor
 * Noor briefs the sweep, six fixed staked sites answer the scanner with
 * a learnable HIGH/no-return signal, flagged sites are dug for three
 * distinct specimens, the specimens are placed into the labelled
 * specimen-case trays (mistakes correctable), the manifest check
 * verifies the case, and the sweep is reported back to Noor.
 *
 * This area is scientifically ISOLATED from the generic Survey Terrace
 * route: its own provisional area id (`proto_artifact_field`), its own
 * state container and proto_q16_* raw event family (scenario-telemetry
 * path — no canonical context, no Q-mapping, no scoring), and its own
 * SA-13 opportunity record. Every interaction has both a physical
 * pointer path and a prompt-card keyboard path converging on the same
 * state functions and emission points.
 */
export class ArtifactSurveyScene extends RoomScene {
  protected readonly roomId = 'proto_artifact_field';
  protected readonly roomInteractionKey: InteractionKey = 'artifactSurveyNoor';

  /** Stake the currently open site prompt belongs to. */
  private activeSiteId = '';
  private physicalLayer: PhysicalManipulationLayer | null = null;
  private statusPanel: { setText: (value: string) => void } | null = null;

  constructor() {
    super(key.scene.artifactSurvey);
  }

  protected getLayout(): RoomLayout {
    // 25×19 exterior annex: path back to the terrace at the top-left,
    // rock outcrops for orientation, open survey floor. Rows 14+ are
    // unreachable wall mass filling the viewport (no dead void).
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '####--###################',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..##................##.#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#..##..........##.......#',
        '#.......................#',
        '#.......................#',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Just inside the terrace path, outside the door's 72px radius.
    return { x: 4.5 * 32, y: 4 * 32 };
  }

  protected populateRoom(): void {
    declareOpportunity({
      opportunity_id: Q16_OPPORTUNITY_ID,
      owner: 'Q16 (exploratory candidate)',
      entry_state_version: Q16_ENTRY_STATE_VERSION,
    });

    // Idempotent re-registration (the terrace registers this too; a
    // direct `?scene=artifact_field` launch must not depend on it).
    registerTask({
      task_id: 'proto_artifact_survey_offer',
      title: 'Artifact survey',
      initialObjective:
        'Surveyor Noor is staging a specimen sweep — Ridge Annex, south path.',
    });

    // Deterministic exterior weather (fixed seed — identical for all).
    snowfall(this, { width: 800, height: 600, seed: 916, count: 26 });

    // Surveyor Noor — the survey's briefing and report point.
    this.addNpc({
      interactionKey: 'artifactSurveyNoor',
      label: 'Surveyor Noor',
      npcName: 'Surveyor Noor',
      texture: 'plv1-noor',
      workFrames: ['plv1-noor', 'plv1-noor-b'],
      x: NOOR_POSITION.x,
      y: NOOR_POSITION.y,
      onPromptOpened: () => this.onNoorOpened(),
    });

    // Field notebook stand: re-readable brief (review-or-ignore is the
    // participant's own choice; reads are recorded, never required).
    this.addStation({
      interactionKey: 'artifactSurveyNotebook',
      label: 'Field Notebook',
      texture: 'proc-notebook-stand',
      x: NOTEBOOK_POSITION.x,
      y: NOTEBOOK_POSITION.y,
      onPromptOpened: () => {
        if (!q16State.accepted) {
          this.showFeedbackMessage(
            'The notebook is clipped shut until Noor opens the sweep.',
          );
          return false;
        }

        this.applyBriefRead();
        return true;
      },
    });

    // The six staked candidate sites.
    for (const site of Q16_SITES) {
      this.addStation({
        interactionKey: 'artifactSurveySite',
        label: 'Survey Stake',
        texture: this.siteTexture(site.site_id),
        x: site.x,
        y: site.y,
        onPromptOpened: () => this.onSiteOpened(site.site_id),
      });

      if (q16SiteDug(site.site_id)) {
        this.addDecor(site.x + 2, site.y + 18, 'proc-ground-disturbed');
      }
    }

    // The specimen case with its three labelled trays.
    this.addStation({
      interactionKey: 'artifactSurveyCase',
      label: 'Specimen Case',
      texture: 'proc-specimen-case',
      x: CASE_POSITION.x,
      y: CASE_POSITION.y,
      onPromptOpened: () => this.onCaseOpened(),
    });

    for (const tray of Q16_TRAYS) {
      this.addDecor(tray.x, tray.y, 'proc-case-tray');
    }

    // Path back to the Survey Terrace.
    this.addDoor({
      x: 4.5 * 32,
      y: 1 * 32 + 16,
      label: 'Survey Terrace',
      texture: 'prop-hub-door-frame',
      interactionKey: 'artifactSurveyNoor',
      target: {
        sceneKey: key.scene.field,
        roomId: 'proto_field_site',
        spawn: 'proto_artifact_field',
      },
    });

    // Physical layer: loose specimens are collectable by click, stakes
    // are direct activators (scan/dig), trays are drop targets. Card
    // paths at the stations remain the keyboard-accessible equivalent.
    this.physicalLayer = new PhysicalManipulationLayer({
      scene: this,
      getPlayerPosition: () => ({ x: this.player.x, y: this.player.y }),
      isEnabled: () => this.physicalInputEligible(),
      onPickup: (artifactId) => this.physicalCollect(artifactId),
      onPlace: (artifactId, trayId) => this.physicalStore(artifactId, trayId),
      getCarried: () => {
        if (q16State.carried === null) {
          return null;
        }

        const artifact = getQ16Artifact(q16State.carried);

        return {
          object_id: artifact.artifact_id,
          label: artifact.label,
          icon: artifact.icon,
          category: 'specimen',
        };
      },
      onFeedback: (message) => this.showFeedbackMessage(message),
    });
    this.physicalLayer.syncContainers(
      Q16_TRAYS.map((tray) => ({
        container_id: tray.tray_id,
        label: tray.label,
        x: tray.x,
        y: tray.y,
        halfWidth: 14,
        halfHeight: 11,
      })),
    );

    this.statusPanel = this.addStatusSidePanel();
    this.refreshStatusPanel();
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('artifactSurveyNoor', 'proto_q16_area_entered');
    markOpportunityOffered(Q16_OPPORTUNITY_ID);
    refreshValidityProbe();
  }

  protected onRoomUpdate(): void {
    this.syncPhysicalObjects();
    this.physicalLayer?.update();
    this.refreshStatusPanel();
  }

  // ————————————————————————— Presentation —————————————————————————

  private siteTexture(siteId: string): string {
    if (!q16SiteScanned(siteId)) {
      return 'proc-survey-stake';
    }

    return q16State.scanned[siteId] === 'flagged'
      ? 'proc-survey-stake-flagged'
      : 'proc-survey-stake-clear';
  }

  private refreshStatusPanel(): void {
    if (this.statusPanel === null) {
      return;
    }

    // Fiction-self-evident sweep state only (stake flags and case trays
    // are already visible in the world) — never correctness, never a
    // score.
    const lines = [
      'RIDGE ANNEX',
      '',
      q16State.accepted ? 'Sweep: open' : 'Sweep: not started',
      `Sites scanned: ${Object.keys(q16State.scanned).length}/6`,
      `Sites dug: ${q16State.dug.length}`,
      `Case: ${Object.keys(q16State.stored).length}/3 stored`,
      q16State.manifest_checks > 0
        ? `Manifest checks: ${q16State.manifest_checks}`
        : 'Manifest: unchecked',
      q16State.reported ? 'Reported: yes' : '',
    ];

    this.statusPanel.setText(lines.filter((line) => line !== '').join('\n'));
  }

  /** Loose specimens + stake activators for the pointer path. */
  private syncPhysicalObjects(): void {
    if (this.physicalLayer === null) {
      return;
    }

    const entries = [];

    for (const site of Q16_SITES) {
      // Stake as a direct activator: scan when unscanned, dig when
      // flagged and undug (same acts as the card path).
      const actionable =
        q16State.accepted &&
        (!q16SiteScanned(site.site_id) ||
          (q16State.scanned[site.site_id] === 'flagged' &&
            !q16SiteDug(site.site_id)));

      if (actionable) {
        entries.push({
          spec: {
            object_id: `stake_${site.site_id}`,
            label: 'Survey Stake',
            icon: this.siteTexture(site.site_id),
            category: 'stake',
          },
          x: site.x,
          y: site.y,
          activate: () => this.onStakeActivated(site.site_id),
        });
      }

      // A dug site's specimen lies loose beside the spoil until
      // collected.
      if (
        site.yields !== null &&
        q16State.loose.includes(site.yields) &&
        q16SiteDug(site.site_id)
      ) {
        const artifact = getQ16Artifact(site.yields);

        entries.push({
          spec: {
            object_id: artifact.artifact_id,
            label: artifact.label,
            icon: artifact.icon,
            category: 'specimen',
          },
          x: site.x + 30,
          y: site.y + 22,
        });
      }
    }

    this.physicalLayer.syncObjects(entries);
  }

  // ————————————————————————— Noor —————————————————————————

  private onNoorOpened(): boolean {
    this.logScenarioEvent('artifactSurveyNoor', 'proto_q16_noor_opened');
    markOpportunityEntered(Q16_OPPORTUNITY_ID);
    refreshValidityProbe();

    return true;
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'artifactSurveyNoor') {
      if (q16State.reported) {
        return 'Noor: "Sweep logged. The lab takes it from here."';
      }

      if (!q16State.accepted) {
        return 'Noor: "Six staked sites on this annex, three of them reading shallow returns. I need a careful sweep: scan, dig what flags, case what you find, check the manifest."';
      }

      return 'Noor: "The sweep is yours. Case and manifest before you report."';
    }

    if (interactionKey === 'artifactSurveyNotebook') {
      return SURVEY_BRIEF_BODY;
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'artifactSurveyNoor') {
      return this.buildNoorOptions();
    }

    if (interactionKey === 'artifactSurveyNotebook') {
      return [
        {
          label: 'Close the notebook.',
          feedback: '',
          getEventTypes: () => [],
        },
      ];
    }

    if (interactionKey === 'artifactSurveySite') {
      return this.buildSiteOptions(this.activeSiteId);
    }

    if (interactionKey === 'artifactSurveyCase') {
      return this.buildCaseOptions();
    }

    return [];
  }

  private buildNoorOptions(): PromptOption[] {
    if (q16State.reported) {
      return [
        { label: 'Head back out.', feedback: '', getEventTypes: () => [] },
      ];
    }

    if (!q16State.accepted) {
      return [
        {
          label: 'Take the survey brief.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.applyAccept(),
          nextStage: (): PromptStage => ({
            body: SURVEY_BRIEF_BODY,
            options: [
              {
                label: 'Start the sweep.',
                feedback:
                  'Noor hands over the annex log. The staked sites are yours to work.',
                getEventTypes: () => [],
              },
            ],
          }),
        },
        {
          label: 'Not right now.',
          feedback: 'Noor nods. "The stakes stay planted."',
          getEventTypes: () => [],
        },
      ];
    }

    const options: PromptOption[] = [];

    if (q16ReportAvailable()) {
      options.push({
        label: 'Report the sweep complete.',
        feedback:
          'Noor checks the case against the annex log and signs the sweep off.',
        getEventTypes: () => [],
        onSelected: () => this.applyReport(),
      });
    }

    options.push(
      {
        label: 'Review the brief again.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.applyBriefRead(),
        nextStage: (): PromptStage => ({
          body: SURVEY_BRIEF_BODY,
          options: [
            {
              label: 'Back to the sweep.',
              feedback: '',
              getEventTypes: () => [],
            },
          ],
        }),
      },
      { label: 'Step back.', feedback: '', getEventTypes: () => [] },
    );

    return options;
  }

  private applyAccept() {
    acceptQ16Survey();

    if (getTaskStatus('proto_artifact_survey_offer') === 'accepted') {
      completeTask('proto_artifact_survey_offer');
    }

    // Equipment equivalence: every participant works the sweep with the
    // same tools, whether or not they still carry the route issue.
    if (!hasInventoryItem('field_scanner')) {
      addInventoryItem('field_scanner');
    }

    if (!hasInventoryItem('excavation_spade')) {
      addInventoryItem('excavation_spade');
    }

    this.logScenarioEvent('artifactSurveyNoor', 'proto_q16_accepted', {
      metadata: { entry_state_version: Q16_ENTRY_STATE_VERSION },
    });
    refreshValidityProbe();
  }

  private applyBriefRead() {
    markQ16BriefRead();
    this.logScenarioEvent('artifactSurveyNotebook', 'proto_q16_brief_read', {
      metadata: { read_number: q16State.brief_reads },
    });
  }

  private applyReport() {
    reportQ16Survey();
    markOpportunityCompleted(Q16_OPPORTUNITY_ID);
    this.logScenarioEvent('artifactSurveyNoor', 'proto_q16_reported', {
      metadata: { ...q16Summary() },
    });
    refreshValidityProbe();
    sfxComplete();
    sparkle(this, NOOR_POSITION.x, NOOR_POSITION.y - 10);
  }

  // ————————————————————————— Sites —————————————————————————

  private onSiteOpened(siteId: string): boolean {
    if (!q16State.accepted) {
      this.showFeedbackMessage(
        'The stake is planted and logged. Noor opens the sweep from the path.',
      );
      return false;
    }

    if (q16SiteDug(siteId) || q16State.scanned[siteId] === 'clear') {
      this.showFeedbackMessage(
        q16SiteDug(siteId)
          ? 'This site is worked out.'
          : 'No return here — the site is clear.',
      );
      return false;
    }

    this.activeSiteId = siteId;

    return true;
  }

  /** Pointer path: one click performs the site's current act. */
  private onStakeActivated(siteId: string) {
    if (!q16State.accepted) {
      this.showFeedbackMessage(
        'The stake is planted and logged. Noor opens the sweep from the path.',
      );
      return;
    }

    if (!q16SiteScanned(siteId)) {
      this.performScan(siteId);
      return;
    }

    if (q16State.scanned[siteId] === 'flagged' && !q16SiteDug(siteId)) {
      this.performDig(siteId);
    }
  }

  private buildSiteOptions(siteId: string): PromptOption[] {
    if (!q16SiteScanned(siteId)) {
      return [
        {
          label: 'Sweep the site with the scanner.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.performScan(siteId),
        },
        { label: 'Leave it.', feedback: '', getEventTypes: () => [] },
      ];
    }

    return [
      {
        label: 'Dig out the flagged site.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.performDig(siteId),
      },
      { label: 'Leave it.', feedback: '', getEventTypes: () => [] },
    ];
  }

  private performScan(siteId: string) {
    const site = getQ16Site(siteId);
    const started = performWorldAction({
      scene: this,
      x: site.x,
      y: site.y,
      label: 'Scanning…',
      durationMs: 1400,
      onComplete: () => {
        const signal = scanQ16Site(siteId);

        this.setSiteStakeTexture(siteId);
        ringPulse(this, site.x, site.y, {
          endRadius: signal === 'flagged' ? 56 : 40,
          rings: signal === 'flagged' ? 3 : 2,
          durationMs: 520,
        });
        showFloatingText(
          this,
          site.x,
          site.y,
          signal === 'flagged' ? 'Signal: HIGH' : 'No return',
        );
        this.logScenarioEvent('artifactSurveySite', 'proto_q16_site_scanned', {
          metadata: { site_id: siteId, signal },
        });
      },
    });

    if (started) {
      sfxScan();
      playActionAnimation({
        scene: this,
        x: site.x,
        y: site.y,
        kind: 'scan',
        icon: 'proc-icon-field-scanner',
        durationMs: 1400,
      });
    }
  }

  private performDig(siteId: string) {
    const site = getQ16Site(siteId);
    const started = performWorldAction({
      scene: this,
      x: site.x,
      y: site.y,
      label: 'Digging…',
      durationMs: 1800,
      onComplete: () => {
        const artifactId = digQ16Site(siteId);

        if (artifactId === null) {
          return;
        }

        this.addDecor(site.x + 2, site.y + 18, 'proc-ground-disturbed');
        burstParticles(this, site.x, site.y + 8, {
          colors: [0xaebfd0, 0x9fb2c1, 0x3d5a61],
          seed: 160 + site.x,
          count: 12,
        });
        cameraKick(this, 0.002);
        showFloatingText(this, site.x, site.y, 'Specimen exposed');
        this.logScenarioEvent('artifactSurveySite', 'proto_q16_site_dug', {
          metadata: { site_id: siteId, artifact_id: artifactId },
        });
      },
    });

    if (started) {
      sfxDig();
      playActionAnimation({
        scene: this,
        x: site.x,
        y: site.y,
        kind: 'dig',
        icon: 'proc-icon-excavation-spade',
        durationMs: 1800,
      });
    }
  }

  private setSiteStakeTexture(siteId: string) {
    // Stations are keyed by interaction, not id — swap by matching
    // config position instead (one stake per position).
    const site = getQ16Site(siteId);

    for (const image of this.children.list) {
      const candidate = image as Phaser.GameObjects.Image;

      if (
        candidate.texture?.key === 'proc-survey-stake' &&
        Math.abs(candidate.x - site.x) < 1 &&
        Math.abs(candidate.y - site.y) < 1
      ) {
        candidate.setTexture(this.siteTexture(siteId));
      }
    }
  }

  // ————————————————————————— Specimen case —————————————————————————

  private physicalCollect(artifactId: string): boolean {
    if (q16State.carried !== null) {
      this.showFeedbackMessage(
        'Your hands are full — case the specimen you are carrying first.',
      );
      return false;
    }

    if (!collectQ16Artifact(artifactId)) {
      return false;
    }

    sfxPickup();
    this.logScenarioEvent(
      'artifactSurveySite',
      'proto_q16_artifact_collected',
      { metadata: { artifact_id: artifactId } },
    );

    return true;
  }

  private physicalStore(artifactId: string, trayId: string): PhysicalPlacement {
    if (!storeQ16Artifact(artifactId, trayId)) {
      return { outcome: 'unavailable', feedback: 'The tray is latched.' };
    }

    this.applyStoredFeedback(artifactId, trayId);

    return { outcome: 'accepted' };
  }

  private applyStoredFeedback(artifactId: string, trayId: string) {
    const artifact = getQ16Artifact(artifactId);
    const tray = getQ16Tray(trayId);

    sparkle(this, tray.x, tray.y - 10);
    // Neutral placement feedback: which tray took it, never whether that
    // was the right tray — errors surface only at the manifest check.
    this.showFeedbackMessage(
      `The ${artifact.label} goes into the ${tray.label}.`,
    );
    this.logScenarioEvent('artifactSurveyCase', 'proto_q16_artifact_stored', {
      metadata: { artifact_id: artifactId, tray_id: trayId },
    });
  }

  private onCaseOpened(): boolean {
    if (!q16State.accepted) {
      this.showFeedbackMessage('The specimen case is latched for transit.');
      return false;
    }

    return true;
  }

  private buildCaseOptions(): PromptOption[] {
    const options: PromptOption[] = [];

    // Card path for storing the carried specimen (keyboard equivalent of
    // the tray drop).
    if (q16State.carried !== null) {
      const carried = getQ16Artifact(q16State.carried);

      for (const tray of Q16_TRAYS) {
        options.push({
          label: `Place the ${carried.label} into the ${tray.label}.`,
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            if (storeQ16Artifact(carried.artifact_id, tray.tray_id)) {
              this.applyStoredFeedback(carried.artifact_id, tray.tray_id);
            }
          },
        });
      }
    }

    // Correction path: take a stored specimen back out.
    for (const artifact of Q16_ARTIFACTS) {
      const trayId = q16State.stored[artifact.artifact_id];

      if (trayId !== undefined && q16State.carried === null) {
        options.push({
          label: `Take the ${artifact.label} back out.`,
          feedback: `You lift the ${artifact.label} back out of the case.`,
          getEventTypes: () => [],
          onSelected: () => {
            if (restowQ16Artifact(artifact.artifact_id)) {
              this.logScenarioEvent(
                'artifactSurveyCase',
                'proto_q16_artifact_restowed',
                { metadata: { artifact_id: artifact.artifact_id } },
              );
            }
          },
        });
      }
    }

    options.push(
      {
        label: 'Run the manifest check.',
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => this.performManifestCheck(),
        // The result renders as a chained stage (a transient feedback
        // line would be replaced by the prompt-close repaint).
        nextStage: (): PromptStage => ({
          body: this.buildManifestResultBody(),
          options: [
            { label: 'Close the case.', feedback: '', getEventTypes: () => [] },
          ],
        }),
      },
      { label: 'Close the case.', feedback: '', getEventTypes: () => [] },
    );

    return options;
  }

  private performManifestCheck() {
    const result = runQ16ManifestCheck();

    this.logScenarioEvent('artifactSurveyCase', 'proto_q16_manifest_checked', {
      metadata: { missing: result.missing, mistrayed: result.mistrayed },
    });

    if (result.missing === 0 && result.mistrayed === 0) {
      sfxComplete();
    }
  }

  /** Neutral manifest-result lines (review-stage language). */
  private buildManifestResultBody(): string {
    const { missing, mistrayed } = q16ManifestMismatches();

    if (missing.length === 0 && mistrayed.length === 0) {
      return 'Manifest check: all three specimens cased and matched. Report to Noor.';
    }

    const lines: string[] = ['Manifest check:'];

    for (const artifactId of missing) {
      lines.push(`- ${getQ16Artifact(artifactId).label}: not in the case.`);
    }

    for (const artifactId of mistrayed) {
      const artifact = getQ16Artifact(artifactId);

      lines.push(
        `- ${artifact.label}: cased outside the ${getQ16Tray(artifact.tray_id).label}.`,
      );
    }

    return lines.join('\n');
  }
}
