/**
 * Diagnostics & Signal Laboratory — pilot zone 2 (professional pilot route).
 *
 * One coherent laboratory with two physically distinct work areas:
 * - ANALYSIS TERMINALS (west bank): the terminal orientation (common
 *   tutorial, never item evidence) and the four decoder terminals — M14
 *   packet intake (bins), M15 cipher (chip pairing), M16 protocol (staged
 *   rule update), M17 syntax trainer (register slots). Their assignment to
 *   the four bank positions is COUNTERBALANCED per session
 *   (`ip_decoder_layout`) and exported; realised order rides every IP event
 *   (`ip_windows_opened_before`).
 * - CONDUIT BAY (east): the M13 conduit lattice bench (physical pipe board)
 *   and the M18 fault-diagnosis console (evidence/tests/hypotheses).
 *   Sequencing only: the console waits while the lattice window is OPEN;
 *   solved, exhausted, stopped or never opened all lead to the identical
 *   console (never a performance gate, no M13 state read by M18).
 * Kai stands at the centre bench. South door → Concourse; north airlock →
 * Exterior Recovery Yard. Every IP overlay keeps its accepted semantic
 * contract (Unit 4 changes no module); stations differ in silhouette,
 * dressing and the overlay's own interaction rhythm.
 */
import { key } from '../constants';
import {
  declareM13Lattice,
  m13LatticeWindowStatus,
} from '../informationProcessing/m13PipeNetwork';
import {
  declareM14,
  m14WindowStatus,
} from '../informationProcessing/m14PacketSaturation';
import {
  declareM15,
  m15WindowStatus,
} from '../informationProcessing/m15LayeredCipher';
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
import {
  assignCounterbalance,
  recordPriorExposure,
} from '../measurement/validity';
import {
  refreshPilotCoverageProbe,
  stampContaminationNotes,
} from '../pilot/pilotCoverage';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import {
  handOverM10,
  M10_COMPONENT_LABEL,
  m10Carrying,
  noteM10KaiEncounter,
} from '../pilot/windows/m10ComponentPromise';
import { LAB_STATIONS } from '../pilot/zoneSites';
import { researchRuntime } from '../systems';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

type DecoderId = 'm14' | 'm15' | 'm16' | 'm17';

interface DecoderSpec {
  id: DecoderId;
  label: string;
  texture: string;
  status: () => string;
  opportunityId: string;
}

const DECODERS: readonly DecoderSpec[] = [
  {
    id: 'm14',
    label: 'Packet Intake Terminal',
    texture: 'proc-console-scenario',
    status: m14WindowStatus,
    opportunityId: 'proto_m14_packet_saturation',
  },
  {
    id: 'm15',
    label: 'Cipher Workstation',
    texture: 'proc-diag-board',
    status: m15WindowStatus,
    opportunityId: 'proto_m15_layered_cipher',
  },
  {
    id: 'm16',
    label: 'Protocol Console',
    texture: 'proc-console-wall',
    status: m16WindowStatus,
    opportunityId: 'proto_m16_protocol_update',
  },
  {
    id: 'm17',
    label: 'Syntax Trainer',
    texture: 'proc-shelf-electronics',
    status: m17WindowStatus,
    opportunityId: 'proto_m17_syntax_acquisition',
  },
];

/** Terminal = no longer a guided beacon destination (never gates anything). */
function windowTerminal(status: string): boolean {
  return status !== 'unopened' && status !== 'open';
}

export class DiagnosticsLaboratoryScene extends PilotZoneScene {
  protected readonly roomId = 'diagnostics_laboratory';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'diagnostics_laboratory' as const;

  private decoderLayout: 'layout_a' | 'layout_b' = 'layout_a';

  constructor() {
    super(key.scene.diagnosticsLaboratory);
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'ops',
      grid: [
        '#########################',
        '###########--############',
        '#.......................#',
        '#.......................#',
        '#........#####..........#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '#.......................#',
        '###########--############',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(data?: { spawn?: string }): { x: number; y: number } {
    switch (data?.spawn) {
      case 'exterior_recovery_yard':
        return { x: 7.5 * TILE, y: 3 * TILE };
      case 'station_concourse':
      default:
        return { x: 12 * TILE, y: 12.8 * TILE };
    }
  }

  create(data?: { spawn?: string }) {
    // Declarations (register: declared + offered; idempotent) — every IP
    // window is declared at zone entry whether or not it is ever entered.
    declareTutorial();
    declareM13Lattice();
    declareM14();
    declareM15();
    declareM16();
    declareM17();
    declareM18Fault();

    // Decoder bank layout — counterbalanced per session and exported as a
    // control note on each decoder's register record + a pilot event.
    const sessionId =
      researchRuntime.sessionState.getMetadata().game_session_id;

    this.decoderLayout = assignCounterbalance(sessionId, 'ip_decoder_layout', [
      'layout_a',
      'layout_b',
    ] as const);

    stampContaminationNotes();
    super.create(data);
    refreshIpProbe();
    refreshPilotCoverageProbe();
  }

  /** Decoders in bank order for this session (layout_b = reversed). */
  private decoderOrder(): readonly DecoderSpec[] {
    return this.decoderLayout === 'layout_a'
      ? DECODERS
      : [...DECODERS].reverse();
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'station_concourse',
      spawn: 'diagnostics_laboratory',
    });
    this.addPilotDoor({
      to: 'exterior_recovery_yard',
      spawn: 'diagnostics_laboratory',
    });

    // Kai — centre bench (anchor NPC of the laboratory stages).
    const kai = LAB_STATIONS.kai;

    this.addNpc({
      interactionKey: 'pilotKai',
      label: 'Kai',
      npcName: 'Kai — diagnostics',
      texture: 'plv1-kai',
      workFrames: ['plv1-kai-work-a', 'plv1-kai-work-b'],
      x: kai.x,
      y: kai.y,
    });
    this.addDecor(kai.x, kai.y + 34, 'proc-diag-board');
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

    // Briefing display (raw, non-interactive).
    this.add
      .rectangle(11.5 * TILE, 4.5 * TILE, 140, 34, 0x1b2633, 1)
      .setStrokeStyle(1, 0x33475a);
    this.signage(11.5 * TILE, 4.25 * TILE, 'DIAGNOSTICS BRIEFING');

    // ——— Analysis terminals (west bank) ———
    this.signage(5 * TILE, 4 * TILE, 'ANALYSIS TERMINALS');
    this.ipStation({
      id: 'orientation_terminal',
      label: 'Terminal Orientation',
      texture: 'proc-console-wall',
      at: LAB_STATIONS.orientation,
      overlay: key.scene.ipSignalTerminal,
      taskId: 'tutorial',
      status: () => tutorialStatus(),
      isDone: () =>
        tutorialStatus() !== 'not_attempted' &&
        tutorialStatus() !== 'in_progress',
      order: 1,
    });

    const bankSlots = [
      LAB_STATIONS.decoder1,
      LAB_STATIONS.decoder2,
      LAB_STATIONS.decoder3,
      LAB_STATIONS.decoder4,
    ];

    this.decoderOrder().forEach((decoder, position) => {
      recordPriorExposure(
        decoder.opportunityId,
        `control:decoder_layout=${this.decoderLayout};bank_position=${position + 1}`,
      );
      this.ipStation({
        id: `decoder_${decoder.id}`,
        label: decoder.label,
        texture: decoder.texture,
        at: bankSlots[position],
        overlay: key.scene.ipSignalTerminal,
        taskId: decoder.id,
        status: decoder.status,
        isDone: () => windowTerminal(decoder.status()),
        order: 3 + position,
      });
    });

    this.logScenarioEvent('pilotRoute', 'pilot_decoder_layout', {
      metadata: {
        layout: this.decoderLayout,
        bank_order: this.decoderOrder().map((decoder) => decoder.id),
      },
    });

    // (The conduit lattice bench now lives in the Records Workshop — v2.)

    this.ipStation({
      id: 'diagnosis_console',
      label: 'Fault Diagnosis Console',
      texture: 'proc-diag-board',
      at: LAB_STATIONS.diagnosis,
      overlay: key.scene.ipDiagnosisConsole,
      taskId: 'm18',
      status: m18FaultWindowStatus,
      isDone: () => windowTerminal(m18FaultWindowStatus()),
      order: 7,
      // Sequencing only (never performance): the console waits while the
      // lattice bench window is still OPEN; solved, exhausted, stopped or
      // never opened all lead to the same console.
      gate: () =>
        m13LatticeWindowStatus() === 'open'
          ? 'Finish or stop the lattice bench first — the console takes over afterwards.'
          : null,
      // Closure state only — a prior-exposure control, never an M18 input.
      context: () => ({ prior_m13_window_status: m13LatticeWindowStatus() }),
    });
    this.addDecor(
      LAB_STATIONS.diagnosis.x - 50,
      LAB_STATIONS.diagnosis.y,
      'proc-gauge-card',
    );

    // Dressing.
    this.addDecor(6 * TILE, 9 * TILE, 'proc-light-pool');
    this.addDecor(19 * TILE, 9 * TILE, 'proc-light-pool');
    this.addDecor(12 * TILE, 2.6 * TILE, 'proc-light-pool');
    this.addDecor(6.5 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(20 * TILE, 1.4 * TILE, 'proc-window-exterior');
    this.addDecor(17.5 * TILE, 9 * TILE, 'proc-gauge-card');
    this.addDecor(10.5 * TILE, 9 * TILE, 'proc-gauge-card');
    this.addDecor(18 * TILE, 14.8 * TILE, 'proc-rack-tools');
    this.addDecor(3.5 * TILE, 15 * TILE, 'proc-cart-utility');
    this.signage(12 * TILE, 1.5 * TILE, 'EXTERIOR AIRLOCK  ▲');
    this.signage(12 * TILE, 17.5 * TILE, '▼  CONCOURSE');
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
    gate?: () => string | null;
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

        const refusal = spec.gate?.() ?? null;

        if (refusal !== null) {
          this.showFeedbackMessage(refusal);

          if (typeof window !== 'undefined' && import.meta.env.DEV) {
            window.__ipLabFeedback = refusal;
          }

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

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#7f95a8', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    return interactionKey === 'pilotKai' ? this.kaiBeat().body : undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
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
            'Kai: The storm left a recovered transmission we cannot read and a fractured conduit lattice.\n' +
            'Start with the terminal orientation on the west bank, then the lattice bench, the four analysis terminals and the diagnosis console. Come back when you have been through them.',
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
          body: 'Kai: How are the stations? Anything you leave stays as you left it.',
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
