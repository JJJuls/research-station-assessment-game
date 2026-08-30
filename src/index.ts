import Phaser from 'phaser';

import { ASSET_SET_VERSION } from './constants';
import * as scenes from './scenes';
import { researchRuntime } from './systems';

/**
 * https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/
 */
researchRuntime.start();

new Phaser.Game({
  width: 800, // 1024
  height: 600, // 768
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
  pixelArt: true,
});
