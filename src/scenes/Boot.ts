import { Scene } from 'phaser';

import * as assets from '../assets';
import { key } from '../constants';
import { resolveStartSceneKey } from '../world';

export class Boot extends Scene {
  constructor() {
    super(key.scene.boot);
  }

  preload() {
    this.load.spritesheet(key.image.spaceman, assets.sprites.spaceman, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image(key.image.tuxemon, assets.tilesets.tuxemon);
    this.load.tilemapTiledJSON(key.tilemap.tuxemon, assets.tilemaps.tuxemon);
    this.load.atlas(key.atlas.player, assets.atlas.image, assets.atlas.data);
  }

  create() {
    // Scene routing via ?scene= query param (SceneRouter). Default remains
    // the prototype scene until the Dock room exists (plan Phase B);
    // ?scene=prototype stays permanently routable so no prototype research
    // station disappears before its room is ported.
    this.scene.start(resolveStartSceneKey());
  }
}
