import { key } from '../constants';
import {
  coolantRouteState,
  markWorkOrderRead,
  registerCoolantTasks,
  sfxUiSelect,
  yardRecoveryComplete,
} from '../gameplay';
import type { InteractionKey, PromptOption } from '../world';
import { RoomScene } from '../world';
import type { RoomLayout } from '../world/StationMapBuilder';

/**
 * Pump House (action-assessment rebuild, Unit 2 shell) —
 * `proto_pump_house`.
 *
 * The interior head of the coolant red line. Unit 2 ships the failure
 * presentation and work order (the investigation beat that opens the
 * yard survey); Unit 3 adds the manifold trench (M13), the diagnostic
 * board (M18) and the standardised setback (M22); Unit 4 adds the pump
 * restart interlock (M25).
 *
 * All telemetry is provisional proto_* raw data via the scenario path.
 */

const PRESSURE_CONSOLE_POSITION = { x: 5 * 32, y: 2.5 * 32 };

const PUMP_WORK_ORDER_BODY =
  'PRESSURE FAULT — COOLANT LOOP B. Line pressure fell to 31% overnight; the buried supply run under the east yard has failed sections. Directive: survey the yard with the field scanner, recover serviceable line components, free the spare coupling from its housing, then rebuild the manifold at the trench.';

export class PumpHouseScene extends RoomScene {
  protected readonly roomId = 'proto_pump_house';
  protected readonly roomInteractionKey: InteractionKey = 'pumpPressureConsole';

  constructor() {
    super(key.scene.pumpHouse);
  }

  protected getLayout(): RoomLayout {
    return {
      theme: 'workshop',
      grid: [
        '#########################',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#....................####',
        '#################--######',
        '#########################',
        '#########################',
        '#########################',
        '#########################',
      ],
    };
  }

  protected getSpawn(): { x: number; y: number } {
    return { x: 17.5 * 32, y: 12.5 * 32 };
  }

  protected populateRoom(): void {
    registerCoolantTasks();

    this.addDoor({
      x: 17.5 * 32,
      y: 13 * 32 + 16,
      label: 'Coolant Yard',
      texture: 'prop-hub-door-frame',
      interactionKey: 'pumpPressureConsole',
      target: {
        sceneKey: key.scene.coolantYard,
        roomId: 'proto_coolant_yard',
        spawn: 'proto_pump_house',
      },
    });

    this.addStation({
      interactionKey: 'pumpPressureConsole',
      label: 'Pressure Console',
      texture: 'proc-console-wall',
      x: PRESSURE_CONSOLE_POSITION.x,
      y: PRESSURE_CONSOLE_POSITION.y,
    });

    // Failure dressing: the drained manifold trench line and old pipe
    // runs (Unit 3 replaces the trench with the real puzzle surface).
    this.addDecor(9 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(12 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(15 * 32, 1.2 * 32, 'proc-wall-pipes');
    this.addDecor(10 * 32, 7 * 32, 'proc-ground-disturbed');
    this.addDecor(12 * 32, 7 * 32, 'proc-ground-disturbed');
    this.addDecor(14 * 32, 7 * 32, 'proc-ground-disturbed');
    this.addDecor(16 * 32, 3 * 32, 'proc-machine-fault');
    this.addDecor(3 * 32, 8 * 32, 'proc-cart-utility');
  }

  protected onRoomEntered(): void {
    this.logScenarioEvent('pumpPressureConsole', 'proto_pump_house_entered');
  }

  protected getPromptBody(interactionKey: InteractionKey): string | undefined {
    if (interactionKey === 'pumpPressureConsole') {
      if (!coolantRouteState.work_order_read) {
        return PUMP_WORK_ORDER_BODY;
      }

      return yardRecoveryComplete()
        ? 'Loop B pressure holding at 31%. Components recovered — the manifold trench awaits reconstruction.'
        : 'Loop B pressure holding at 31%. The work order stands: recover line components from the yard survey sector.';
    }

    return undefined;
  }

  protected getPromptOptions(interactionKey: InteractionKey): PromptOption[] {
    if (interactionKey !== 'pumpPressureConsole') {
      return [];
    }

    if (!coolantRouteState.work_order_read) {
      return [
        {
          label: 'Log the work order.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            markWorkOrderRead();
            sfxUiSelect();
            this.logScenarioEvent(
              'pumpPressureConsole',
              'proto_work_order_read',
            );
            this.showFeedbackMessage(
              'Work order logged. Survey the yard (C to scan inside the staked sector).',
            );
          },
        },
        {
          label: 'Step back.',
          feedback: '',
          getEventTypes: () => [],
        },
      ];
    }

    return [
      {
        label: 'Review the pressure trace.',
        feedback:
          'Loop B: 31% and steady. The fault is in the buried run, not the pump.',
        getEventTypes: () => [],
      },
      { label: 'Step back.', feedback: '', getEventTypes: () => [] },
    ];
  }
}
