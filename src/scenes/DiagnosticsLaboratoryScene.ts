/**
 * Diagnostics & Signal Laboratory — pilot zone 2 (professional pilot route).
 *
 * One coherent laboratory with two physically distinct work areas: the
 * ANALYSIS TERMINALS bank (west wall: terminal orientation + four decoder
 * terminals, layout counterbalanced per session) and the CONDUIT BAY (east
 * wall: the lattice bench and the fault-diagnosis console). Kai stands at
 * the centre bench. South door → Concourse; north airlock → Exterior
 * Recovery Yard. Unit 2 builds topology, guidance and Kai's beats; Unit 4
 * activates the workstations (IP overlays).
 */
import { key } from '../constants';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { LAB_STATIONS } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

export class DiagnosticsLaboratoryScene extends PilotZoneScene {
  protected readonly roomId = 'diagnostics_laboratory';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'diagnostics_laboratory' as const;

  constructor() {
    super(key.scene.diagnosticsLaboratory);
  }

  protected getLayout(): RoomLayout {
    // 25×19 laboratory: airlock doorway north, Concourse doorway south, a
    // briefing display wall (row 4) with a two-tile corridor above it, and
    // a centre bench block for Kai.
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
        // Left of the briefing wall, 140 px from the airlock.
        return { x: 7.5 * TILE, y: 3 * TILE };
      case 'station_concourse':
      default:
        return { x: 12 * TILE, y: 12.8 * TILE };
    }
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
      stages: ['lab_briefing', 'lab_work', 'exterior_briefing', 'report_kai'],
      isDone: () => false,
      order: 0,
    });

    // Briefing display (raw, non-interactive).
    this.add
      .rectangle(11.5 * TILE, 4.5 * TILE, 140, 34, 0x1b2633, 1)
      .setStrokeStyle(1, 0x33475a);
    this.signage(11.5 * TILE, 4.25 * TILE, 'DIAGNOSTICS BRIEFING');

    // Work areas (Unit 4 activates).
    this.signage(5 * TILE, 4 * TILE, 'ANALYSIS TERMINALS');
    this.signage(21 * TILE, 4.6 * TILE, 'CONDUIT BAY');
    this.placeholder(
      'orientation_terminal',
      'Terminal Orientation',
      LAB_STATIONS.orientation,
      'proc-console-wall',
      1,
    );
    this.placeholder(
      'decoder_1',
      'Analysis Terminal 1',
      LAB_STATIONS.decoder1,
      'proc-console-scenario',
      3,
    );
    this.placeholder(
      'decoder_2',
      'Analysis Terminal 2',
      LAB_STATIONS.decoder2,
      'proc-console-scenario',
      4,
    );
    this.placeholder(
      'decoder_3',
      'Analysis Terminal 3',
      LAB_STATIONS.decoder3,
      'proc-console-scenario',
      5,
    );
    this.placeholder(
      'decoder_4',
      'Analysis Terminal 4',
      LAB_STATIONS.decoder4,
      'proc-console-scenario',
      6,
    );
    this.placeholder(
      'lattice_bench',
      'Conduit Lattice Bench',
      LAB_STATIONS.lattice,
      'proc-rig-intake',
      2,
    );
    this.placeholder(
      'diagnosis_console',
      'Fault Diagnosis Console',
      LAB_STATIONS.diagnosis,
      'proc-diag-board',
      7,
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
    this.addDecor(21 * TILE, 14.8 * TILE, 'proc-shelf-electronics');
    this.addDecor(3.5 * TILE, 15 * TILE, 'proc-cart-utility');
    this.signage(12 * TILE, 1.5 * TILE, 'EXTERIOR AIRLOCK  ▲');
    this.signage(12 * TILE, 17.5 * TILE, '▼  CONCOURSE');
  }

  private placeholder(
    id: string,
    label: string,
    at: { x: number; y: number },
    texture: string,
    order: number,
  ) {
    this.addStation({
      interactionKey: 'pilotStation',
      label,
      texture,
      x: at.x,
      y: at.y,
      onPromptOpened: () => {
        this.logScenarioEvent('pilotStation', 'pilot_station_opened', {
          metadata: { station_id: id, zone: this.zoneKey },
        });
        this.showFeedbackMessage(`${label} — not yet connected in this build.`);
        return false;
      },
    });
    registerPilotStation({
      id,
      zone: 'diagnostics_laboratory',
      x: at.x,
      y: at.y,
      label,
      stages: ['lab_work'],
      isDone: () => false,
      order,
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
    return interactionKey === 'pilotKai'
      ? this.npcBeatOptions('pilotKai', this.kaiBeat())
      : [];
  }

  private kaiBeat() {
    switch (pilotStage()) {
      case 'arrival':
      case 'meet_vale':
      case 'records':
        return {
          body: 'Kai: Vale will brief you first — operations desk in the Concourse.',
          options: [{ label: 'Understood.', tag: 'redirect_vale' }],
        };
      case 'lab_briefing':
        return {
          body:
            'Kai: The storm left a recovered transmission we cannot read and a fractured conduit lattice.\n' +
            'Start with the terminal orientation, then work through the analysis terminals and the conduit bay. Come back when you have been through them.',
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
      case 'report_kai':
        return {
          body: 'Kai: Yard work logged. Vale wants a word — Concourse, south door.',
          options: [
            {
              label: 'Heading to Vale.',
              tag: 'report_ack',
              onSelected: () => {
                advancePilotStage('report_vale', Date.now());
              },
            },
          ],
        };
      default:
        return {
          body: 'Kai: Nothing more from me — Vale has your next stop.',
          options: [{ label: 'Understood.', tag: 'redirect_vale_late' }],
        };
    }
  }
}
