/**
 * Diagnostics Laboratory — pilot zone 3, the SIGNAL ANALYSIS INCIDENT
 * (evidence-led pilot v2, Unit 3).
 *
 * One coherent professional case instead of a bank of look-alike
 * consoles: an unknown transmission was recovered from the storm relay
 * (Noor, outside, on the intercom). The participant works four visually
 * and mechanically distinct phases around ONE central signal-analysis
 * workstation whose wall display changes after every recorded phase:
 *
 *   1  Evidence Table   — M15  causal model of the receiver chain
 *   2  Protocol Console — M16  the transmission's handling protocol
 *   3  Training Rig     — M17  register syntax: demo → practice → transfer
 *   4  Diagnostic Board — M18  the receiver fault behind the anomaly
 *
 * Each phase is its own opportunity, window, event family, form, entry
 * snapshot and validity record (sheet 11: a shared incident is a route,
 * never permission to share evidence). Phases are PRESENTED in order (the
 * beacon and the display's phase indicator point at the next unrecorded
 * one) but every bench is independently enterable whenever no other
 * phase surface is open — no phase's outcome gates another (G2).
 * The Console Orientation is a common tutorial (never item evidence) that
 * the terminal-based phases record as an entry-state control.
 *
 * M18 ↔ M13: the diagnostic board reads NOTHING from the lattice bench
 * (which now lives in the Records Workshop); the former "wait while the
 * lattice window is open" sequencing gate is gone. The lattice closure
 * state is passed to the M18 open event as route context only.
 *
 * Kai stands at the briefing desk (route anchor, M10 recipient). South
 * door → Concourse; north airlock → Exterior Recovery Yard.
 */
import Phaser from 'phaser';

import { Depth, DepthLayer, key } from '../constants';
import { m13LatticeWindowStatus } from '../informationProcessing/m13PipeNetwork';
import {
  declareM15Causal,
  leaveM15Causal,
  m15CausalWindowStatus,
  openM15Causal,
} from '../informationProcessing/m15CausalModel';
import {
  declareM16,
  m16WindowStatus,
} from '../informationProcessing/m16ProtocolUpdate';
import {
  declareM17,
  m17WindowStatus,
} from '../informationProcessing/m17SyntaxAcquisition';
import {
  declareM18Fault,
  m18FaultWindowStatus,
} from '../informationProcessing/m18FaultDiagnosis';
import { refreshIpProbe } from '../informationProcessing/probe';
import {
  declareTutorial,
  tutorialStatus,
} from '../informationProcessing/tutorial';
import type { IpOverlayKey } from '../informationProcessing/ui/openIpOverlay';
import { openIpOverlay } from '../informationProcessing/ui/openIpOverlay';
import { prefersReducedMotion } from '../inventory/ui/theme';
import {
  refreshPilotCoverageProbe,
  stampContaminationNotes,
} from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  onPilotRouteChange,
  pilotStage,
  pilotStageAtOrAfter,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import {
  activeWorkSurface,
  openWorkSurface,
} from '../pilot/ui/WorkSurfaceScene';
import {
  handOverM10,
  M10_COMPONENT_LABEL,
  m10Carrying,
  noteM10KaiEncounter,
} from '../pilot/windows/m10ComponentPromise';
import { m15CausalSurfaceModel } from '../pilot/windows/signalSurfaceModels';
import { LAB_SPAWNS, LAB_STATIONS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';
import { LAB_LAYOUT, LAB_SOLIDS } from '../world/layouts/laboratory';

const TILE = 32;

/**
 * World V2 rebuild: the painted wall display's screen box (plate px). The
 * dynamic trace, the phase indicator and the recorded-structure marks are
 * drawn INSIDE this bezel; nothing else of the old panel is drawn.
 */
const DISPLAY_BOX = { left: 372, top: 68, right: 502, bottom: 126 } as const;

type PhaseId = 'm15' | 'm16' | 'm17' | 'm18';

interface PhaseSpec {
  id: PhaseId;
  index: number;
  name: string;
  bench: string;
  texture: string;
  at: { x: number; y: number };
  status: () => string;
  opportunityId: string;
}

/** Terminal = recorded (completed / exhausted / exited / failed); never a beacon destination again. */
function windowTerminal(status: string): boolean {
  return status !== 'unopened' && status !== 'open';
}

const PHASES: readonly PhaseSpec[] = [
  {
    id: 'm15',
    index: 1,
    name: 'Causal model',
    bench: 'Evidence Table',
    texture: 'proc-desk-closure',
    at: LAB_STATIONS.evidenceTable,
    status: m15CausalWindowStatus,
    opportunityId: 'proto_m15_layered_cipher',
  },
  {
    id: 'm16',
    index: 2,
    name: 'Handling protocol',
    bench: 'Protocol Console',
    texture: 'proc-console-scenario',
    at: LAB_STATIONS.protocolConsole,
    status: m16WindowStatus,
    opportunityId: 'proto_m16_protocol_update',
  },
  {
    id: 'm17',
    index: 3,
    name: 'Register syntax',
    bench: 'Training Rig',
    texture: 'proc-shelf-electronics',
    at: LAB_STATIONS.trainingRig,
    status: m17WindowStatus,
    opportunityId: 'proto_m17_syntax_acquisition',
  },
  {
    id: 'm18',
    index: 4,
    name: 'Fault diagnosis',
    bench: 'Diagnostic Board',
    texture: 'proc-diag-board',
    at: LAB_STATIONS.diagnosticBoard,
    status: m18FaultWindowStatus,
    opportunityId: 'proto_m18_lattice_fault_diagnosis',
  },
];

/**
 * Noor on the intercom — one line per NEXT unrecorded phase (never a
 * dialogue card, never a statement about the outcome of a phase).
 */
const NOOR_LINES: Record<PhaseId | 'done', string> = {
  m15: 'NOOR · relay: Pulled this off the storm relay before it dropped. Structure first — the evidence table.',
  m16: 'NOOR · relay: The handling protocol is on the console.',
  m17: 'NOOR · relay: The training rig has the register syntax.',
  m18: 'NOOR · relay: The test rig the storm left faulted is on the diagnostic board.',
  done: 'NOOR · relay: Case logged on my side.',
};

/** Deterministic pseudo-noise for the raw trace (identical for everyone). */
function noise(i: number): number {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;

  return v - Math.floor(v);
}

declare global {
  interface Window {
    /** DEV-only, read-only signal display probe (phase state only). */
    __signalDisplayProbe?: {
      phases_recorded: string[];
      next_phase: string | null;
      indicator: string;
      intercom: string;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__signalDisplayProbe = null;
}

export class DiagnosticsLaboratoryScene extends PilotZoneScene {
  protected readonly roomId = 'diagnostics_laboratory';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'diagnostics_laboratory' as const;

  private displayGraphics: Phaser.GameObjects.Graphics | null = null;
  private displayIndicator: Phaser.GameObjects.Text | null = null;
  private displayIntercom: Phaser.GameObjects.Text | null = null;
  private benchLamps = new Map<PhaseId, Phaser.GameObjects.Rectangle>();
  /** Per-bench numeral over the painted bench (state-driven salience). */
  private bayNumerals = new Map<PhaseId, Phaser.GameObjects.Text>();

  constructor() {
    super(key.scene.diagnosticsLaboratory);
  }

  protected getLayout(): RoomLayout {
    // World V2 rebuild: the 22×12 painted plate is the architecture and
    // the furniture; collision is the audited logical grid.
    return {
      theme: 'ops',
      grid: [...LAB_LAYOUT],
      solids: LAB_SOLIDS,
      field: 'wide',
      plateTexture: 'w2-laboratory-plate',
    };
  }

  protected bundleDropBounds(): { width: number; height: number } {
    return { width: 22 * TILE, height: 12 * TILE };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    // Machine-audited: ≥ 80 px from the door used and outside every
    // interactable's 72 px radius, so a reflex SPACE on arrival never
    // re-triggers the door (V2 finding U8-8 precedent).
    switch (data?.spawn) {
      case 'exterior_recovery_yard':
        return LAB_SPAWNS.fromYard;
      case 'station_concourse':
      default:
        return LAB_SPAWNS.fromConcourse;
    }
  }

  create(data?: { spawn?: string }) {
    // Declarations (register: declared + offered; idempotent) — every
    // phase window is declared at zone entry whether or not it is entered.
    declareTutorial();
    declareM15Causal();
    declareM16();
    declareM17();
    declareM18Fault();
    stampContaminationNotes();

    super.create(data);

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.refreshSignalDisplay();
    });
    // V4 (review D3-2): the bay salience follows the route stage, so the
    // display redraws when the stage changes without an overlay resume.
    const unsubscribeRoute = onPilotRouteChange(() => {
      this.refreshSignalDisplay();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribeRoute();

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__signalDisplayProbe = null;
      }
    });

    this.refreshSignalDisplay();
    refreshIpProbe();
    refreshPilotCoverageProbe();
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'station_concourse',
      spawn: 'diagnostics_laboratory',
      registryId: 'lab.door_concourse',
    });
    this.addPilotDoor({
      to: 'exterior_recovery_yard',
      spawn: 'diagnostics_laboratory',
      registryId: 'lab.airlock_yard',
    });
    // World V2: the south sliding door and the north airlock hatch are
    // baked into the plate — the generic leaf sprites would double them.
    this.doorImage('lab.door_concourse')?.setVisible(false);
    this.doorImage('lab.airlock_yard')?.setVisible(false);
    // Their class lamps sit on the painted lintel lamp / the hatch's crown.
    this.placeDoorIndicator('lab.door_concourse', 340, 259);
    this.placeDoorIndicator('lab.airlock_yard', 250, 86);

    // ——— Kai — briefing desk (route anchor of the laboratory stages) ———
    const kai = LAB_STATIONS.kai;

    this.addNpc({
      interactionKey: 'pilotKai',
      label: 'Kai',
      npcName: 'Kai — diagnostics',
      texture: 'plv1-kai',
      workFrames: ['plv1-kai-work-a', 'plv1-kai-work-b'],
      x: kai.x,
      y: kai.y,
      verb: 'Talk to',
      registryId: 'lab.kai',
    });
    registerPilotStation({
      id: 'npc_kai',
      zone: 'diagnostics_laboratory',
      x: kai.x,
      y: kai.y,
      label: 'Kai',
      stages: ['lab_briefing', 'lab_work', 'exterior_briefing'],
      isDone: () => false,
      order: 0,
    });

    // ——— Central signal-analysis workstation + wall display ———
    const ws = LAB_STATIONS.workstation;

    this.buildSignalDisplay();
    this.addStation({
      interactionKey: 'pilotSignalWorkstation',
      label: 'Signal Analysis Workstation',
      texture: 'proc-console-wall',
      x: ws.x,
      y: ws.y,
      onPromptOpened: () => {
        this.logStationOpened('signal_workstation');
        return true;
      },
    });

    // ——— Console orientation (common tutorial; never item evidence) ———
    this.ipStation({
      id: 'orientation_terminal',
      label: 'Console Orientation',
      texture: 'proc-console-scenario',
      at: LAB_STATIONS.orientation,
      overlay: key.scene.ipSignalTerminal,
      taskId: 'tutorial',
      status: () => tutorialStatus(),
      // Terminal once run — or once the participant has moved on to any
      // phase, so the beacon never stays pinned to the orientation.
      isDone: () =>
        (tutorialStatus() !== 'not_attempted' &&
          tutorialStatus() !== 'in_progress') ||
        PHASES.some((phase) => phase.status() !== 'unopened'),
      order: 1,
    });

    // ——— The four phase benches (in presented order) ———
    for (const phase of PHASES) {
      if (phase.id === 'm15') {
        this.addStation({
          interactionKey: 'pilotStation',
          label: phase.bench,
          texture: phase.texture,
          x: phase.at.x,
          y: phase.at.y,
          onPromptOpened: () => {
            this.logPhaseOpened(phase);

            if (this.anyPhaseSurfaceOpen()) {
              return false;
            }

            openM15Causal(Date.now());
            openWorkSurface(this, {
              surfaceId: 'm15_evidence_table',
              model: () => m15CausalSurfaceModel(this.surfaceHost()),
              onClose: () => {
                leaveM15Causal(Date.now());
              },
            });
            return false;
          },
        });
        this.registerPhaseStation(phase);
      } else {
        const overlay: IpOverlayKey =
          phase.id === 'm18'
            ? key.scene.ipDiagnosisConsole
            : key.scene.ipSignalTerminal;

        this.ipStation({
          id: `phase_${phase.id}`,
          label: phase.bench,
          texture: phase.texture,
          at: phase.at,
          overlay,
          taskId: phase.id,
          status: phase.status,
          isDone: () => windowTerminal(phase.status()),
          order: 1 + phase.index,
          // Route context only (never an M18 input): the lattice bench
          // closure state at the moment the board opens.
          context:
            phase.id === 'm18'
              ? () => ({ prior_m13_window_status: m13LatticeWindowStatus() })
              : undefined,
        });
      }

      // Bench tag: a small numbered plate on the bench's own surface with
      // its state lamp — lit = recorded, pulsing = next, dim = later
      // (state is glyph + position, never colour alone: the display names
      // it). The bench art is baked into the plate's south hull; the tag
      // sits on its top face, never on the walking lane.
      const tagX = phase.at.x - 34;
      const tagY = phase.at.y + 2;

      this.add
        .rectangle(tagX, tagY, 26, 14, 0x101820, 0.85)
        .setStrokeStyle(1, 0x364157, 1)
        .setDepth(DepthLayer.WorldReadout - 0.01);

      const numeral = this.add
        .text(tagX - 4, tagY, String(phase.index), {
          color: '#8497aa',
          font: 'bold 10px monospace',
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(DepthLayer.WorldReadout);
      const lamp = this.add
        .rectangle(tagX + 7, tagY, 5, 5, 0x33475a, 1)
        .setStrokeStyle(1, 0x8fa4b8, 0.35)
        .setDepth(DepthLayer.WorldReadout);

      this.benchLamps.set(phase.id, lamp);
      this.bayNumerals.set(phase.id, numeral);
    }

    // ——— World V2: the painted plate IS the architecture and all the
    // furniture — hide every station marker sprite (interactions,
    // prompts and events untouched; the Workshop precedent). The old
    // V4 floor grammar (spine, aisle, bay plates), the light pools and
    // the wall dressing are gone: the plate's baked lamps, wayfinding
    // lines and benches carry that reading.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.Image &&
        [
          'proc-console-wall',
          'proc-console-scenario',
          'proc-desk-closure',
          'proc-shelf-electronics',
          'proc-diag-board',
        ].includes(child.texture.key)
      ) {
        child.setVisible(false);
      }
    }
  }

  // ——— Signal display —————————————————————————————————————————————————

  private buildSignalDisplay() {
    // World V2: the bezel and the dark screen are painted on the plate;
    // only the dynamic content is drawn, inside DISPLAY_BOX. The screen
    // sits on the wall band above the north lane, so a figure crossing
    // that lane is never occluded (the box ends above the lane).
    this.displayGraphics = this.add
      .graphics()
      .setDepth(DepthLayer.FloorDecal + 0.02);
    this.displayIndicator = this.add
      .text(DISPLAY_BOX.left + 5, DISPLAY_BOX.top + 3, '', {
        color: '#5fd3c4',
        font: 'bold 8px monospace',
        resolution: 3,
        wordWrap: { width: DISPLAY_BOX.right - DISPLAY_BOX.left - 10 },
        lineSpacing: -1,
      })
      .setOrigin(0, 0)
      .setDepth(DepthLayer.FloorDecal + 0.03);
    // Noor's intercom line is a timed subtitle in a centred HUD band above
    // the belt (design y ≤ 536) that no other HUD surface uses — the
    // objective, feedback banner, prompt and dialogue card all sit higher
    // — shown on arrival and whenever the recorded phase set changes.
    // Review D3-4/D3-5: body size (15 px design ≈ 11 CSS px at 800×600)
    // and one depth step under the HUD prompt, so a prompt projected into
    // this band always reads over the subtitle.
    this.displayIntercom = this.add
      .text(400, 536, '', {
        color: '#dfe9f1',
        font: '15px monospace',
        backgroundColor: '#101820',
        padding: { x: 10, y: 4 },
        wordWrap: { width: 560 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(Depth.AboveWorld - 1)
      .setVisible(false);
  }

  private recordedPhases(): PhaseId[] {
    return PHASES.filter((phase) => windowTerminal(phase.status())).map(
      (phase) => phase.id,
    );
  }

  private nextPhase(): PhaseSpec | null {
    return PHASES.find((phase) => !windowTerminal(phase.status())) ?? null;
  }

  /** Redraws the wall display from the four window states (no scores). */
  private refreshSignalDisplay() {
    const graphics = this.displayGraphics;

    if (graphics === null) {
      return;
    }

    const recorded = this.recordedPhases();
    const next = this.nextPhase();
    // Trace area under the two-line indicator, inside the painted screen.
    const left = DISPLAY_BOX.left + 4;
    const width = DISPLAY_BOX.right - DISPLAY_BOX.left - 8;
    const top = DISPLAY_BOX.top + 24;
    const height = DISPLAY_BOX.bottom - top - 4;
    const mid = top + height / 2;
    const lane = width / 3;

    graphics.clear();

    // Raw trace: jagged until the causal model is recorded, then the
    // structure bands appear beneath a calmer trace.
    const jitter = recorded.includes('m15') ? 3 : 9;

    if (recorded.includes('m15')) {
      for (let band = 0; band < 3; band += 1) {
        graphics.fillStyle(0x16342f, 1);
        graphics.fillRect(
          left + 3 + band * lane,
          top + 3,
          lane - 6,
          height - 6,
        );
      }
    }

    // Review D3-12: the raw trace stays in the panel-border tone until the
    // case is recorded, so it never competes with the objective line.
    graphics.lineStyle(1, recorded.includes('m18') ? 0x5fd3c4 : 0x6f8293, 1);
    graphics.beginPath();

    for (let i = 0; i <= 60; i += 1) {
      const x = left + 2 + (i * (width - 4)) / 60;
      const wave = Math.sin(i / 3.2) * 6;
      const y = mid + wave + (noise(i) - 0.5) * jitter;

      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }

    graphics.strokePath();

    // Protocol lanes (M16): three lane ticks along the base line.
    if (recorded.includes('m16')) {
      graphics.lineStyle(1, 0x5fd3c4, 0.9);

      for (let tick = 0; tick < 3; tick += 1) {
        const x = left + lane / 2 + tick * lane;

        graphics.lineBetween(x, top + height - 5, x, top + height - 1);
      }
    }

    // Register marks (M17): three small squares above the trace.
    if (recorded.includes('m17')) {
      graphics.fillStyle(0xe6c68f, 1);

      for (let slot = 0; slot < 3; slot += 1) {
        graphics.fillRect(left + lane / 2 - 2 + slot * lane, top + 1, 4, 4);
      }
    }

    // Fault resolved (M18): the anomaly marker becomes a closed bracket.
    if (recorded.includes('m18')) {
      graphics.fillStyle(0x16342f, 1);
      graphics.fillRect(left + width - 18, top + 4, 14, height - 8);
      graphics.lineStyle(1, 0x5fd3c4, 1);
      graphics.strokeRect(left + width - 18, top + 4, 14, height - 8);
    } else {
      graphics.lineStyle(1, 0xe08c8c, 0.9);
      graphics.lineBetween(
        left + width - 11,
        top + 4,
        left + width - 11,
        top + height - 4,
      );
    }

    const indicator =
      next === null
        ? 'CASE RECORDED  4 / 4'
        : `PHASE ${next.index} / 4 — ${next.name.toUpperCase()}`;
    const intercom = NOOR_LINES[next?.id ?? 'done'];

    this.displayIndicator?.setText(indicator);
    this.showIntercom(intercom);

    for (const phase of PHASES) {
      const lamp = this.benchLamps.get(phase.id);

      if (lamp === undefined) {
        continue;
      }

      const done = recorded.includes(phase.id);
      // Review D3-2: a bay is "current" only once the benches are the
      // route's work (stage lab_work); before that Kai is the target.
      const isNext = next?.id === phase.id && pilotStageAtOrAfter('lab_work');

      // Review D3-3: cyan marks the current bay only; a recorded lamp
      // settles to the base palette (glyph + position unchanged).
      lamp.setFillStyle(isNext ? 0x5fd3c4 : done ? 0x8fa4b8 : 0x33475a, 1);
      lamp.setStrokeStyle(1, isNext ? 0x5fd3c4 : 0x8fa4b8, isNext ? 0.9 : 0.35);
      lamp.setScale(isNext && !prefersReducedMotion() ? 1.25 : 1);

      // The next bench carries the cyan numeral; recorded benches settle
      // to a quiet numeral; later benches stay dim.
      const numeral = this.bayNumerals.get(phase.id);

      if (isNext) {
        numeral?.setColor('#5fd3c4').setAlpha(1);
      } else if (done) {
        numeral?.setColor('#8497aa').setAlpha(0.7);
      } else {
        numeral?.setColor('#8497aa').setAlpha(0.45);
      }
    }

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__signalDisplayProbe = {
        phases_recorded: recorded,
        next_phase: next?.id ?? null,
        indicator,
        intercom,
      };
    }
  }

  private intercomShown: string | null = null;
  private intercomTimer: Phaser.Time.TimerEvent | null = null;

  /** Timed subtitle (8 s); the same line is never re-shown twice in a row. */
  private showIntercom(line: string) {
    if (this.displayIntercom === null || this.intercomShown === line) {
      return;
    }

    this.intercomShown = line;
    this.intercomTimer?.remove(false);
    this.displayIntercom.setText(line).setAlpha(1).setVisible(true);
    this.intercomTimer = this.time.delayedCall(8000, () => {
      this.intercomTimer = null;

      if (this.displayIntercom === null) {
        return;
      }

      if (prefersReducedMotion()) {
        this.displayIntercom.setVisible(false);
      } else {
        this.tweens.add({
          targets: this.displayIntercom,
          alpha: 0,
          duration: 500,
          onComplete: () => this.displayIntercom?.setVisible(false),
        });
      }
    });
  }

  // ——— Stations ————————————————————————————————————————————————————————

  private anyPhaseSurfaceOpen(): boolean {
    return (
      activeWorkSurface(this) !== null ||
      this.scene.isActive(key.scene.ipSignalTerminal) ||
      this.scene.isActive(key.scene.ipDiagnosisConsole)
    );
  }

  private surfaceHost() {
    return {
      now: () => Date.now(),
      close: () => activeWorkSurface(this)?.close(),
      feedback: (message: string) =>
        activeWorkSurface(this)?.showFeedback(message),
    };
  }

  private logPhaseOpened(phase: PhaseSpec) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: {
        station_id: `phase_${phase.id}`,
        zone: this.zoneKey,
        window_status: phase.status(),
      },
    });
  }

  private registerPhaseStation(phase: PhaseSpec) {
    registerPilotStation({
      id: `phase_${phase.id}`,
      zone: 'diagnostics_laboratory',
      x: phase.at.x,
      y: phase.at.y,
      label: phase.bench,
      stages: ['lab_work'],
      isDone: () => windowTerminal(phase.status()),
      order: 1 + phase.index,
    });
  }

  private ipStation(spec: {
    id: string;
    label: string;
    texture: string;
    at: { x: number; y: number };
    overlay: IpOverlayKey;
    taskId: string;
    status: () => string;
    isDone: () => boolean;
    order: number;
    context?: () => Record<string, unknown>;
  }) {
    this.addStation({
      interactionKey: 'pilotStation',
      label: spec.label,
      texture: spec.texture,
      x: spec.at.x,
      y: spec.at.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
          metadata: {
            station_id: spec.id,
            zone: this.zoneKey,
            window_status: spec.status(),
          },
        });

        if (this.anyPhaseSurfaceOpen()) {
          return false;
        }

        openIpOverlay(this, spec.overlay, spec.taskId, spec.context?.() ?? {});
        return false;
      },
    });

    registerPilotStation({
      id: spec.id,
      zone: 'diagnostics_laboratory',
      x: spec.at.x,
      y: spec.at.y,
      label: spec.label,
      stages: ['lab_work'],
      isDone: spec.isDone,
      order: spec.order,
    });
  }

  private logStationOpened(stationId: string) {
    this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
      metadata: { station_id: stationId, zone: this.zoneKey },
    });
  }

  // ——— Prompts ——————————————————————————————————————————————————————————

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pilotKai') {
      return this.kaiBeat().body;
    }

    if (interactionKey === 'pilotSignalWorkstation') {
      return this.caseBrief();
    }

    return undefined;
  }

  /** Concise, reviewable case brief (the ONE place the whole case is described). */
  private caseBrief(): string {
    const recorded = this.recordedPhases();
    const line = (phase: PhaseSpec) =>
      `${recorded.includes(phase.id) ? '■' : '□'} ${phase.index}  ${phase.bench} — ${phase.name}`;

    return [
      'SIGNAL ANALYSIS — RECOVERED TRANSMISSION',
      'An unknown transmission came off the storm relay. Reconstruct its structure, learn its handling protocol and register syntax, then diagnose the pressurised test rig the storm left faulted.',
      '',
      ...PHASES.map(line),
      '',
      'Benches are presented in order; each records on its own. ESC leaves any surface with the work kept.',
    ].join('\n');
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey === 'pilotSignalWorkstation') {
      return [
        {
          label: 'Back to the bench.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            this.logScenarioEvent(
              'pilotSignalWorkstation',
              'pilot_case_brief_reviewed',
              {
                metadata: { zone: this.zoneKey, stage: pilotStage() },
              },
            );
          },
        },
      ];
    }

    if (interactionKey !== 'pilotKai') {
      return [];
    }

    noteM10KaiEncounter();

    const beat = this.kaiBeat();

    // M10: the hand-over is available whenever the component is carried
    // (recipient always available; never gated on anything else).
    if (m10Carrying()) {
      beat.options = [
        {
          label: `Hand over the ${M10_COMPONENT_LABEL.toLowerCase()}.`,
          tag: 'm10_handover',
          feedback: 'Kai: Got it. Thanks.',
          onSelected: () => handOverM10(Date.now(), 'kai', 'keyboard'),
        },
        ...beat.options,
      ].slice(0, 4);
    }

    return this.npcBeatOptions('pilotKai', beat);
  }

  private kaiBeat() {
    switch (pilotStage()) {
      case 'arrival':
      case 'handover_briefing':
      case 'incident_handover':
      case 'workshop':
      case 'workshop_work':
        return {
          body: 'Kai: Vale briefs first — incident desk in the Concourse; the workshop orders come before the laboratory.',
          options: [{ label: 'Understood.', tag: 'redirect_vale' }],
        };
      case 'lab_briefing':
        return {
          body:
            'Kai: Noor pulled a transmission off the storm relay before it went down. The signal analysis workstation holds the case: four benches, in order — evidence table, protocol console, training rig, diagnostic board.\n' +
            'Run the console orientation first. Come back when the case is recorded.',
          options: [
            {
              label: 'Understood.',
              tag: 'lab_brief_ack',
              onSelected: () => {
                advancePilotStage('lab_work', Date.now());
              },
            },
          ],
        };
      case 'lab_work':
        return {
          body: 'Kai: How is the case? Anything you leave stays as you left it.',
          options: [
            {
              label: 'I am done here — what is next?',
              tag: 'lab_done',
              feedback:
                'Kai: Outside work — Noor needs hands in the Recovery Yard. Take the north airlock.',
              onSelected: () => {
                advancePilotStage('exterior_briefing', Date.now());
              },
            },
            {
              label: 'Still working on it.',
              tag: 'lab_continue',
              feedback: 'Kai: Go ahead.',
            },
          ],
        };
      case 'exterior_briefing':
      case 'exterior_work':
        return {
          body: 'Kai: Noor is waiting in the Exterior Recovery Yard — north airlock. Report back to me afterwards.',
          options: [{ label: 'On my way.', tag: 'redirect_yard' }],
        };
      case 'return_hub':
        return {
          body: 'Kai: Back from outside — Vale is waiting at the incident desk, Concourse, south door.',
          options: [{ label: 'Heading to Vale.', tag: 'return_redirect' }],
        };
      default:
        return {
          body: 'Kai: Nothing more from me — Vale has your next stop.',
          options: [{ label: 'Understood.', tag: 'redirect_vale_late' }],
        };
    }
  }
}
