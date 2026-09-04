import Phaser from 'phaser';

import { ASSET_SET_VERSION } from './constants';
import * as scenes from './scenes';
import { researchRuntime } from './systems';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './world/viewport';

/**
 * https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/
 */
researchRuntime.start();

/**
 * V4 visual-validity redesign (docs/game/VISUAL-SYSTEM-V4.md §1): a fixed
 * 1280×720 logical canvas, FIT-letterboxed by the browser. Room scenes
 * render the world at an integer zoom and the 800×600 HUD/overlay design
 * space through a second camera (src/world/viewport.ts).
 */
const game = new Phaser.Game({
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  title: 'Remote Outpost Assessment',
  url: import.meta.env.VITE_APP_HOMEPAGE,
  // Frozen-stimuli identifier rides in the engine version banner so every
  // session's console shows (game_version, asset_set_version) provenance
  // (approved plan §8; formally locked at the stimulus-freeze gate).
  version: `${import.meta.env.VITE_APP_VERSION ?? 'dev'}+${ASSET_SET_VERSION}`,
  scene: [
    scenes.Boot,
    ...Object.values(scenes).filter((scene) => scene !== scenes.Boot),
  ],
  physics: {
    default: 'arcade',
    arcade: {
      // Overnight prototype (Unit 4): the physics debug overlay (magenta/
      // cyan body outlines) is no longer shown in ordinary dev play — it
      // now requires an explicit ?debug launch flag on top of a dev
      // build, so participant-mode sessions never see debug geometry.
      debug:
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('debug'),
    },
  },
  disableContextMenu: import.meta.env.PROD,
  // Unit 7: charcoal clear colour = the page ground (src/style.css), so
  // the FIT letterbox and any off-map area never read as a black band.
  backgroundColor: '#0b1016',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // V4: linear filtering for text (the design-space cameras run at 1.2×),
  // nearest-neighbour for every loaded / generated art texture (below), and
  // whole-pixel placement for textured objects.
  render: {
    // Linear texture sampling (smooth UI text under the 1.2× design camera)
    // WITHOUT a multisampled context: MSAA is invisible on axis-aligned 2D
    // quads and triples the frame cost of the software-GL verification
    // environment.
    antialias: true,
    antialiasGL: false,
    roundPixels: true,
  },
});

/**
 * Pixel art stays crisp under the integer world zoom: every texture the
 * manager registers (loaded images/spritesheets, generated proc-* art, the
 * per-theme canvases and the baked floor textures) is NEAREST-filtered.
 * Text objects register their canvases with a UUID key and are left LINEAR
 * so UI text stays smooth at the design-space scale.
 */
const TEXT_TEXTURE_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

game.textures.on(
  Phaser.Textures.Events.ADD,
  (textureKey: string, texture: Phaser.Textures.Texture) => {
    if (!TEXT_TEXTURE_KEY.test(textureKey)) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  },
);
