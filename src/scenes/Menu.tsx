import { Scene } from 'phaser';
import { render } from 'phaser-jsx';

import { Button, Overlay } from '../components';
import { key } from '../constants';

export class Menu extends Scene {
  /**
   * Scene to resume on exit. Defaults to the prototype scene so existing
   * behavior is unchanged; RoomScene passes its own key via scene.launch
   * data so pausing works identically in every room.
   */
  private resumeKey: string = key.scene.main;

  constructor() {
    super(key.scene.menu);
  }

  init(data?: { resumeKey?: string }) {
    this.resumeKey = data?.resumeKey ?? key.scene.main;
  }

  create() {
    this.input.keyboard!.on('keydown-ESC', this.exit, this);
    const { centerX, centerY } = this.cameras.main;

    render(
      <>
        <Overlay />

        <Button
          center
          fixed
          onClick={this.exit}
          text="Resume"
          x={centerX}
          y={centerY}
        />
      </>,
      this,
    );

    // NEXT-07 Phase 6: static controls card — the contract's single
    // authorised piece of new participant-facing copy (§4.4).
    // Mechanics-only: movement, interaction, choice selection and pause;
    // no task, trait, score, construct, success or outcome information.
    const CARD_WIDTH = 380;
    const CARD_X = centerX - CARD_WIDTH / 2;
    const CARD_Y = centerY + 60;
    const controlsText = this.add.text(
      CARD_X + 18,
      CARD_Y + 14,
      [
        'Controls',
        '',
        'Move — WASD or arrow keys',
        'Interact — SPACE',
        'Choose an option — point and click,',
        'or arrow keys and Enter',
        'Pause — ESC',
      ].join('\n'),
      {
        color: '#ffffff',
        font: '14px monospace',
        lineSpacing: 4,
      },
    );
    const cardHeight = Math.ceil(controlsText.height) + 28;

    this.add
      .rectangle(CARD_X, CARD_Y, CARD_WIDTH, cardHeight, 0x101820, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, 0x33475a);
    controlsText.setDepth(1);
  }

  private exit() {
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
