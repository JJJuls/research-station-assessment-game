import Phaser from 'phaser';

import {
  key,
  RESEARCHER_IDLE_FRAMES,
  RESEARCHER_WALK_FRAMES,
  type ResearcherDirection,
  researcherIdleFrameKey,
  researcherRotationKey,
  researcherWalkFrameKey,
} from '../constants';

enum Animation {
  Left = 'player_left',
  Right = 'player_right',
  Up = 'player_up',
  Down = 'player_down',
}

/**
 * Phase F visual upgrade: when the committed PixelLab researcher textures
 * are loaded, the player renders with them; otherwise the template Misa
 * atlas remains as fallback. STRICT equivalence rules (approved plan §10
 * measurement check 5/6): movement code, velocities, body size (32×42),
 * selector geometry, and walk frameRate (10) are identical in both skins —
 * only textures/animation sources differ. Diagonals map to the nearest
 * cardinal animation (movement itself is unchanged).
 */
type PlayerSkin = 'misa' | 'researcher';

const ANIMATION_TO_DIRECTION: Record<Animation, ResearcherDirection> = {
  [Animation.Left]: 'west',
  [Animation.Right]: 'east',
  [Animation.Up]: 'north',
  [Animation.Down]: 'south',
};

const researcherWalkAnim = (dir: ResearcherDirection) =>
  `researcher_walk_${dir}`;
const researcherIdleAnim = (dir: ResearcherDirection) =>
  `researcher_idle_${dir}`;

type Cursors = Record<
  'w' | 'a' | 's' | 'd' | 'up' | 'left' | 'down' | 'right' | 'space',
  Phaser.Input.Keyboard.Key
>;

const Velocity = {
  Horizontal: 175,
  Vertical: 175,
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
  body!: Phaser.Physics.Arcade.Body;
  cursors: Cursors;
  selector: Phaser.Physics.Arcade.StaticBody;
  private readonly skin: PlayerSkin;

  private static hasResearcherTextures(scene: Phaser.Scene): boolean {
    return scene.textures.exists(researcherWalkFrameKey('south', 0));
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const skin: PlayerSkin = Player.hasResearcherTextures(scene)
      ? 'researcher'
      : 'misa';

    if (skin === 'researcher') {
      super(scene, x, y, researcherRotationKey('south'));
    } else {
      super(scene, x, y, key.atlas.player, 'misa-front');
    }

    this.skin = skin;

    // Add the sprite to the scene
    scene.add.existing(this);

    // Enable physics for the sprite
    scene.physics.world.enable(this);

    // Identical 32×42 collision body in both skins (art swaps must never
    // change collision footprints). Offsets center the body within each
    // skin's frame: Misa frames are 32×64 (offset 0,22); researcher
    // frames are 96×96 with a ~48px character centered (offset 32,30
    // aligns the body to the visible torso/feet).
    if (this.skin === 'researcher') {
      this.setSize(32, 42).setOffset(32, 30);
    } else {
      this.setSize(32, 42).setOffset(0, 22);
    }

    // Collide the sprite body with the world boundary
    this.setCollideWorldBounds(true);

    // Set the camera to follow the game object
    scene.cameras.main.startFollow(this);
    scene.cameras.main.setZoom(1);

    // Add cursor keys
    this.cursors = this.createCursorKeys();

    // Create sprite animations
    this.createAnimations();

    // Add selector
    this.selector = scene.physics.add.staticBody(x - 8, y + 32, 16, 16);
  }

  /**
   * Track the arrow keys & WASD.
   */
  private createCursorKeys() {
    return this.scene.input.keyboard!.addKeys(
      'w,a,s,d,up,left,down,right,space',
    ) as Cursors;
  }

  private createAnimations() {
    const anims = this.scene.anims;

    if (this.skin === 'researcher') {
      // Same frameRate as the Misa walk (10) — animation timing must be
      // identical across skins and paths (plan §10 check 5).
      for (const dir of ['south', 'west', 'east', 'north'] as const) {
        if (!anims.exists(researcherWalkAnim(dir))) {
          anims.create({
            key: researcherWalkAnim(dir),
            frames: Array.from({ length: RESEARCHER_WALK_FRAMES }, (_, i) => ({
              key: researcherWalkFrameKey(dir, i),
            })),
            frameRate: 10,
            repeat: -1,
          });
        }

        if (!anims.exists(researcherIdleAnim(dir))) {
          anims.create({
            key: researcherIdleAnim(dir),
            frames: Array.from({ length: RESEARCHER_IDLE_FRAMES }, (_, i) => ({
              key: researcherIdleFrameKey(dir, i),
            })),
            frameRate: 6,
            repeat: -1,
          });
        }
      }

      return;
    }

    // Create left animation
    if (!anims.exists(Animation.Left)) {
      anims.create({
        key: Animation.Left,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-left-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Create right animation
    if (!anims.exists(Animation.Right)) {
      anims.create({
        key: Animation.Right,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-right-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Create up animation
    if (!anims.exists(Animation.Up)) {
      anims.create({
        key: Animation.Up,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-back-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Create down animation
    if (!anims.exists(Animation.Down)) {
      anims.create({
        key: Animation.Down,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-front-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  /** Plays the walking animation for the given logical direction. */
  private playWalk(animation: Animation) {
    if (this.skin === 'researcher') {
      this.anims.play(
        researcherWalkAnim(ANIMATION_TO_DIRECTION[animation]),
        true,
      );
    } else {
      this.anims.play(animation, true);
    }

    this.moveSelector(animation);
  }

  /** Shows the idle pose/animation for the given logical direction. */
  private showIdle(animation: Animation) {
    if (this.skin === 'researcher') {
      this.anims.play(
        researcherIdleAnim(ANIMATION_TO_DIRECTION[animation]),
        true,
      );
    } else {
      switch (animation) {
        case Animation.Left:
          this.setTexture(key.atlas.player, 'misa-left');
          break;
        case Animation.Right:
          this.setTexture(key.atlas.player, 'misa-right');
          break;
        case Animation.Up:
          this.setTexture(key.atlas.player, 'misa-back');
          break;
        case Animation.Down:
          this.setTexture(key.atlas.player, 'misa-front');
          break;
      }
    }

    this.moveSelector(animation);
  }

  private moveSelector(animation: Animation) {
    const { body, selector } = this;

    switch (animation) {
      case Animation.Left:
        selector.x = body.x - 19;
        selector.y = body.y + 14;
        break;

      case Animation.Right:
        selector.x = body.x + 35;
        selector.y = body.y + 14;
        break;

      case Animation.Up:
        selector.x = body.x + 8;
        selector.y = body.y - 18;
        break;

      case Animation.Down:
        selector.x = body.x + 8;
        selector.y = body.y + 46;
        break;
    }
  }

  update() {
    const { anims, body, cursors } = this;
    const prevVelocity = body.velocity.clone();

    // Stop any previous movement from the last frame
    body.setVelocity(0);

    // Horizontal movement
    switch (true) {
      case cursors.left.isDown:
      case cursors.a.isDown:
        body.setVelocityX(-Velocity.Horizontal);
        break;

      case cursors.right.isDown:
      case cursors.d.isDown:
        body.setVelocityX(Velocity.Horizontal);
        break;
    }

    // Vertical movement
    switch (true) {
      case cursors.up.isDown:
      case cursors.w.isDown:
        body.setVelocityY(-Velocity.Vertical);
        break;

      case cursors.down.isDown:
      case cursors.s.isDown:
        body.setVelocityY(Velocity.Vertical);
        break;
    }

    // Normalize and scale the velocity so that player can't move faster along a diagonal
    body.velocity.normalize().scale(Velocity.Horizontal);

    // Update the animation last and give left/right animations precedence over up/down animations
    switch (true) {
      case cursors.left.isDown:
      case cursors.a.isDown:
        this.playWalk(Animation.Left);
        break;

      case cursors.right.isDown:
      case cursors.d.isDown:
        this.playWalk(Animation.Right);
        break;

      case cursors.up.isDown:
      case cursors.w.isDown:
        this.playWalk(Animation.Up);
        break;

      case cursors.down.isDown:
      case cursors.s.isDown:
        this.playWalk(Animation.Down);
        break;

      default:
        if (this.skin !== 'researcher') {
          anims.stop();
        }

        // If we were moving, pick an idle pose facing the last direction
        switch (true) {
          case prevVelocity.x < 0:
            this.showIdle(Animation.Left);
            break;

          case prevVelocity.x > 0:
            this.showIdle(Animation.Right);
            break;

          case prevVelocity.y < 0:
            this.showIdle(Animation.Up);
            break;

          case prevVelocity.y > 0:
            this.showIdle(Animation.Down);
            break;

          default:
            // Standing still with no prior movement: keep the researcher
            // idle loop running if that skin is active.
            if (this.skin === 'researcher' && !this.anims.isPlaying) {
              this.showIdle(Animation.Down);
            }
        }
    }
  }
}
