/**
 * Exterior Recovery Yard — pilot zone 3 (professional pilot route).
 *
 * Storm-damaged exterior reached through the laboratory airlock (the same
 * airlock leads back). Noor at the apron; the east recovery plot, the yard
 * pump and relay housing, the Metal Recovery Yard magnet rig and the
 * south-west verification plots. Unit 2 builds topology, guidance and
 * Noor's beats; Unit 5 wires the field actions (C/D/F) and the five
 * measurement windows. The only door is the airlock (bidirectional).
 */
import { key } from '../constants';
import { snowfall } from '../gameplay';
import {
  advancePilotStage,
  pilotStage,
  registerPilotStation,
} from '../pilot/pilotRoute';
import { PilotZoneScene } from '../pilot/PilotZoneScene';
import { YARD_SITES } from '../pilot/zoneSites';
import type { InteractionKey, PromptOption, RoomLayout } from '../world';

const TILE = 32;

export class ExteriorRecoveryYardScene extends PilotZoneScene {
  protected readonly roomId = 'exterior_recovery_yard';
  protected readonly roomInteractionKey: InteractionKey = 'pilotRoute';
  protected readonly zoneKey = 'exterior_recovery_yard' as const;

  constructor() {
    super(key.scene.exteriorRecoveryYard);
  }

  protected getLayout(): RoomLayout {
    // 25×19 open yard: airlock doorway south (cols 11-12), a relay mast
    // block north-centre, otherwise registered terrain (Unit 5 zones).
    return {
      theme: 'exterior',
      grid: [
        '#########################',
        '#########################',
        '#..........###..........#',
        '#..........###..........#',
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
        '#.......................#',
        '###########--############',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    // Apron, 95 px from the airlock and 140 px from Noor.
    return { x: 13.75 * TILE, y: 13.1 * TILE };
  }

  protected populateRoom(): void {
    this.addPilotDoor({
      to: 'diagnostics_laboratory',
      spawn: 'exterior_recovery_yard',
    });

    const noor = YARD_SITES.noor;

    this.addNpc({
      interactionKey: 'pilotNoor',
      label: 'Noor',
      npcName: 'Noor — field recovery',
      texture: 'plv1-noor',
      workFrames: ['plv1-noor', 'plv1-noor-b'],
      x: noor.x,
      y: noor.y,
    });
    registerPilotStation({
      id: 'npc_noor',
      zone: 'exterior_recovery_yard',
      x: noor.x,
      y: noor.y,
      label: 'Noor',
      stages: ['exterior_briefing', 'exterior_work'],
      isDone: () => false,
      order: 0,
    });

    // Work sites (Unit 5 wires mechanics; positions fixed here).
    this.placeholder(
      'relay_housing',
      'Relay Housing',
      YARD_SITES.relayHousing,
      'proc-housing-frozen',
      3,
    );
    this.placeholder(
      'yard_pump',
      'Yard Coolant Pump',
      YARD_SITES.pumpPrime,
      'proc-rig-intake',
      2,
    );
    this.placeholder(
      'magnet_rig',
      'Magnet Recovery Rig',
      YARD_SITES.magnetRig,
      'proc-rig-recycler',
      4,
    );
    this.placeholder(
      'verification_post',
      'Verification Post',
      YARD_SITES.verificationPost,
      'proc-reclamation-post',
      5,
    );
    this.addDecor(
      YARD_SITES.supplyCrate.x,
      YARD_SITES.supplyCrate.y,
      'proc-crate-supply',
    );
    this.addDecor(
      YARD_SITES.pumpBreaker.x,
      YARD_SITES.pumpBreaker.y,
      'proc-panel-warning',
    );
    this.addDecor(
      YARD_SITES.magnetTray.x,
      YARD_SITES.magnetTray.y,
      'proc-case-tray',
    );
    this.addDecor(
      YARD_SITES.relayMast.x,
      YARD_SITES.relayMast.y + 20,
      'proc-antenna-damaged',
    );

    // Landmarks and plots (overlays drawn by Unit 5; signage now).
    this.signage(12 * TILE, 4.3 * TILE, 'RELAY MAST 04');
    this.signage(19.5 * TILE, 6 * TILE, 'EAST RECOVERY PLOT');
    this.signage(3 * TILE, 2.6 * TILE, 'CONTROL PLOT');
    this.signage(4 * TILE, 7.6 * TILE, 'RECLAIMED SECTOR');
    this.signage(21 * TILE, 1.5 * TILE, 'METAL RECOVERY YARD');
    this.signage(12 * TILE, 17.5 * TILE, '▼  AIRLOCK — LABORATORY');
    this.signage(19 * TILE, 12.8 * TILE, 'SUPPLY CRATE');

    for (const [x, y] of [
      [2 * TILE, 3 * TILE],
      [4 * TILE, 3 * TILE],
      [2 * TILE, 5.5 * TILE],
      [4 * TILE, 5.5 * TILE],
      [17 * TILE, 6.5 * TILE],
      [22.5 * TILE, 6.5 * TILE],
      [17 * TILE, 11.5 * TILE],
      [22.5 * TILE, 11.5 * TILE],
    ] as const) {
      this.addDecor(x, y, 'proc-sector-post');
    }

    this.addDecor(6 * TILE, 6 * TILE, 'proc-ground-disturbed');
    this.addDecor(10 * TILE, 7 * TILE, 'proc-footprints');
    this.addDecor(12.5 * TILE, 10 * TILE, 'proc-footprints');
    this.addDecor(16 * TILE, 15 * TILE, 'proc-wall-pipes');
    this.addDecor(8 * TILE, 15.6 * TILE, 'proc-wall-pipes');

    snowfall(this, { width: 800, height: 608, seed: 0x5eed4003, count: 26 });
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
      zone: 'exterior_recovery_yard',
      x: at.x,
      y: at.y,
      label,
      stages: ['exterior_work'],
      isDone: () => false,
      order,
    });
  }

  private signage(x: number, y: number, text: string) {
    this.add
      .text(x, y, text, { color: '#9fb2c1', font: '11px monospace' })
      .setOrigin(0.5)
      .setDepth(2);
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    return interactionKey === 'pilotNoor' ? this.noorBeat().body : undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    return interactionKey === 'pilotNoor'
      ? this.npcBeatOptions('pilotNoor', this.noorBeat())
      : [];
  }

  private noorBeat() {
    switch (pilotStage()) {
      case 'exterior_briefing':
        return {
          body:
            'Noor: Storm took the mast and buried half the yard. I have jobs for you — take them in the order I call them.\n' +
            'Scanner (C) and spade (D) are yours; the rig works with F. Come back to me between jobs.',
          options: [
            {
              label: 'Ready.',
              tag: 'yard_brief_ack',
              onSelected: () => {
                advancePilotStage('exterior_work', Date.now());
              },
            },
          ],
        };
      case 'exterior_work':
        return {
          body: 'Noor: Jobs are on the board. Tell me when you are done out here.',
          options: [
            {
              label: 'I am done outside.',
              tag: 'yard_done',
              feedback:
                'Noor: Logged. Back through the airlock — Kai wants your report.',
              onSelected: () => {
                advancePilotStage('report_kai', Date.now());
              },
            },
            {
              label: 'Still working.',
              tag: 'yard_continue',
              feedback: 'Noor: Go on.',
            },
          ],
        };
      case 'report_kai':
      case 'report_vale':
      case 'deck_review':
      case 'complete':
        return {
          body: 'Noor: Yard work is logged. Kai and Vale are inside.',
          options: [{ label: 'Understood.', tag: 'redirect_inside' }],
        };
      default:
        return {
          body: 'Noor: Kai sends people out here once the laboratory work is through.',
          options: [{ label: 'Understood.', tag: 'redirect_lab' }],
        };
    }
  }
}
