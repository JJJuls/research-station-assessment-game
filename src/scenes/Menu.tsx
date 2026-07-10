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
  }

  private exit() {
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }
}
