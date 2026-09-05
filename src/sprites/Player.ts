import Phaser from 'phaser';

import {
  key,
  PLAYER_ACTION_FRAMES_PER_ROW,
  PLAYER_ACTION_KINDS,
  PLAYER_ACTION_ROW,
  type PlayerActionKind,
  playerActionSheetKey,
  RESEARCHER_IDLE_FRAMES,
  RESEARCHER_WALK_FRAMES,
  type ResearcherDirection,
  researcherIdleFrameKey,
  researcherRotationKey,
  researcherWalkFrameKey,
  worldDepth,
} from '../constants';
import { sfxFootstep } from '../gameplay/audio';

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
const researcherActionAnim = (
  kind: PlayerActionKind,
  dir: ResearcherDirection,
) => `researcher_action_${kind}_${dir}`;

/**
 * Pilot Unit 6: playback rates spreading each 6-frame action sheet over
 * its world-action duration (scan 1000 ms, dig 1500 ms, pickup ~750 ms).
 */
const ACTION_ANIM_FRAME_RATES: Record<PlayerActionKind, number> = {
  scan: 6,
  dig: 4,
  pickup: 8,
};

type Cursors = Record<
  'up' | 'left' | 'down' | 'right' | 'space',
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
  /** NEXT-07 Phase 7b: uniform static drop shadow under the body —
   * identical ellipse in every room, purely visual, no physics. */
  private shadow: Phaser.GameObjects.Ellipse;

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

    // World V1: the room's world plate follows the avatar (dead zone +
    // bounded easing, src/world/camera.ts); the scene camera is static.

    // Drop shadow below the render depths of the player and the room's
    // dual-grid visual layers' contents (world layer sits at -1/-0.5).
    this.shadow = scene.add
      .ellipse(x, y + 22, 26, 10, 0x000000, 0.25)
      .setDepth(-0.25);

    // Add cursor keys
    this.cursors = this.createCursorKeys();

    // Create sprite animations
    this.createAnimations();

    // Add selector
    this.selector = scene.physics.add.staticBody(x - 8, y + 32, 16, 16);
  }

  /**
   * Track the arrow keys. Movement is arrows-only (action-assessment
   * rebuild, Unit 1): the letter keys C/D/E/F belong to the field-action
   * language (scan/dig/interact/salvage), so WASD movement would make a
   * tap of D beside diggable terrain ambiguous between "walk right" and
   * "dig" — an input-contamination risk for the search/dig measures.
   */
  private createCursorKeys() {
    return this.scene.input.keyboard!.addKeys(
      'up,left,down,right,space',
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

        // Pilot Unit 6: PROVISIONAL action sheets (presentation only;
        // created only when the Boot-loaded spritesheet exists).
        for (const kind of PLAYER_ACTION_KINDS) {
          const sheet = playerActionSheetKey(kind);
          const animKey = researcherActionAnim(kind, dir);

          if (this.scene.textures.exists(sheet) && !anims.exists(animKey)) {
            const row = PLAYER_ACTION_ROW[dir];

            anims.create({
              key: animKey,
              frames: anims.generateFrameNumbers(sheet, {
                start: row * PLAYER_ACTION_FRAMES_PER_ROW,
                end:
                  row * PLAYER_ACTION_FRAMES_PER_ROW +
                  PLAYER_ACTION_FRAMES_PER_ROW -
                  1,
              }),
              frameRate: ACTION_ANIM_FRAME_RATES[kind],
              repeat: 0,
            });
          }
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

  /**
   * Pilot Unit 6 (presentation only): plays a one-shot PROVISIONAL
   * PixelLab action animation facing the current direction. No-op on
   * the Misa fallback skin or when the sheets are not loaded. RoomScene
   * skips update() while a world action runs, so the animation persists
   * for the action's duration; normal idle/walk resumes afterwards.
   */
  playActionAnim(kind: PlayerActionKind): void {
    if (this.skin !== 'researcher') {
      return;
    }

    const animKey = researcherActionAnim(kind, this.facing ?? 'south');

    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true);
    }
  }

  /** Last logical facing (no initializer — see stepTimerMs note). */
  private facing?: ResearcherDirection;

  private moveSelector(animation: Animation) {
    const { body, selector } = this;

    this.facing = ANIMATION_TO_DIRECTION[animation];

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

  /**
   * Footstep cadence bookkeeping (Unit E audio; presentation only).
   * Declared without initializers: this class's constructor calls super()
   * conditionally per skin, which TypeScript only allows when no field
   * initializers exist.
   */
  private stepTimerMs?: number;
  private stepAlternate?: boolean;

  update() {
    const { anims, body, cursors } = this;
    const prevVelocity = body.velocity.clone();

    // Keep the drop shadow under the feet (position-only; no state).
    this.shadow.setPosition(this.x, this.y + 22);
    // Unit 7: y-sorted world depth (foot line) — presentation only.
    this.setDepth(worldDepth(this.y + 22));

    // Footstep taps while moving (~280ms cadence, alternating pitch).
    if (prevVelocity.x !== 0 || prevVelocity.y !== 0) {
      this.stepTimerMs = (this.stepTimerMs ?? 220) + this.scene.game.loop.delta;

      if (this.stepTimerMs >= 280) {
        this.stepTimerMs = 0;
        this.stepAlternate = this.stepAlternate !== true;
        sfxFootstep(this.stepAlternate);
      }
    } else {
      this.stepTimerMs = 220;
    }

    // Stop any previous movement from the last frame
    body.setVelocity(0);

    // Horizontal movement
    switch (true) {
      case cursors.left.isDown:
        body.setVelocityX(-Velocity.Horizontal);
        break;

      case cursors.right.isDown:
        body.setVelocityX(Velocity.Horizontal);
        break;
    }

    // Vertical movement
    switch (true) {
      case cursors.up.isDown:
        body.setVelocityY(-Velocity.Vertical);
        break;

      case cursors.down.isDown:
        body.setVelocityY(Velocity.Vertical);
        break;
    }

    // Normalize and scale the velocity so that player can't move faster along a diagonal
    body.velocity.normalize().scale(Velocity.Horizontal);

    // Update the animation last and give left/right animations precedence over up/down animations
    switch (true) {
      case cursors.left.isDown:
        this.playWalk(Animation.Left);
        break;

      case cursors.right.isDown:
        this.playWalk(Animation.Right);
        break;

      case cursors.up.isDown:
        this.playWalk(Animation.Up);
        break;

      case cursors.down.isDown:
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
            // idle loop running if that skin is active — facing the last
            // logical direction, never snapping to south (Unit 8).
            if (this.skin === 'researcher' && !this.anims.isPlaying) {
              const idleAnim: Record<ResearcherDirection, Animation> = {
                west: Animation.Left,
                east: Animation.Right,
                north: Animation.Up,
                south: Animation.Down,
              };

              this.showIdle(idleAnim[this.facing ?? 'south']);
            }
        }
    }
  }
}
