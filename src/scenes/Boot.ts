import { Scene } from 'phaser';

import * as assets from '../assets';
import {
  EFFECT_SHEET_URLS,
  key,
  PLAYER_ACTION_KINDS,
  PLAYER_ACTION_SHEET_URLS,
  playerActionSheetKey,
  PROP_TEXTURES,
  RESEARCHER_DIRECTIONS,
  RESEARCHER_IDLE_FRAMES,
  RESEARCHER_WALK_FRAMES,
  researcherIdleFrameKey,
  researcherRotationKey,
  researcherWalkFrameKey,
  UNIT7_STILL_URLS,
  UNIT7_STRIP_URLS,
} from '../constants';
import {
  DOCK_PAD_TILESET_KEY,
  DOCK_PAD_TILESET_URL,
  ensureProceduralTextures,
  ensureThemeTilesets,
  PROCEDURAL_TEXTURE_MANIFEST,
  registerBuiltStationRoutes,
  resolveStartSceneKey,
  WANG_TILESET_KEY,
  WANG_TILESET_URL,
} from '../world';

export class Boot extends Scene {
  constructor() {
    super(key.scene.boot);
  }

  preload() {
    // Action-assessment rebuild (Unit 5): PROVISIONAL MODEL-SELECTED
    // PixelLab v1 NPC stills (docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md).
    for (const [key, file] of [
      ['plv1-vale', 'vale-idle'],
      ['plv1-vale-ready', 'vale-ready'],
      ['plv1-vale-b', 'vale-work-b'],
      ['plv1-kai', 'kai-idle'],
      ['plv1-kai-work-a', 'kai-work-a'],
      ['plv1-kai-work-b', 'kai-work-b'],
      ['plv1-kai-done', 'kai-done'],
      ['plv1-noor', 'noor-idle'],
      ['plv1-noor-b', 'noor-work-b'],
    ] as const) {
      this.load.image(key, `assets/pixellab-runtime/npcs/${file}.png`);
    }

    this.load.spritesheet(key.image.spaceman, assets.sprites.spaceman, {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image(key.image.tuxemon, assets.tilesets.tuxemon);
    this.load.tilemapTiledJSON(key.tilemap.tuxemon, assets.tilemaps.tuxemon);
    this.load.atlas(key.atlas.player, assets.atlas.image, assets.atlas.data);

    // Phase F committed PixelLab stimuli (asset_set_version below). Served
    // from public/ — the game NEVER calls PixelLab at runtime (approved
    // plan §8 static-stimuli rule).
    this.load.spritesheet(WANG_TILESET_KEY, WANG_TILESET_URL, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(DOCK_PAD_TILESET_KEY, DOCK_PAD_TILESET_URL, {
      frameWidth: 32,
      frameHeight: 32,
    });

    for (const [textureKey, url] of Object.entries(PROP_TEXTURES)) {
      this.load.image(textureKey, url);
    }

    for (const dir of RESEARCHER_DIRECTIONS) {
      this.load.image(
        researcherRotationKey(dir),
        `assets/characters/player/rotations/${dir}.png`,
      );

      for (let i = 0; i < RESEARCHER_WALK_FRAMES; i++) {
        this.load.image(
          researcherWalkFrameKey(dir, i),
          `assets/characters/player/walk/${dir}/${i}.png`,
        );
      }

      for (let i = 0; i < RESEARCHER_IDLE_FRAMES; i++) {
        this.load.image(
          researcherIdleFrameKey(dir, i),
          `assets/characters/player/idle/${dir}/${i}.png`,
        );
      }
    }

    // Pilot Unit 6: PROVISIONAL MODEL-SELECTED player action sheets and
    // one-shot effect sheets, loaded pixel-exact as spritesheets
    // (docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md — NOT final
    // art approval; presentation only, no mechanic reads them).
    for (const kind of PLAYER_ACTION_KINDS) {
      this.load.spritesheet(
        playerActionSheetKey(kind),
        PLAYER_ACTION_SHEET_URLS[kind],
        { frameWidth: 96, frameHeight: 96 },
      );
    }

    for (const [fxKey, url] of Object.entries(EFFECT_SHEET_URLS)) {
      this.load.spritesheet(fxKey, url, { frameWidth: 64, frameHeight: 64 });
    }

    // Unit 7: PROVISIONAL MODEL-SELECTED presentation assets (stills +
    // strips; docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md).
    for (const [stillKey, url] of Object.entries(UNIT7_STILL_URLS)) {
      this.load.image(stillKey, url);
    }

    for (const [stripKey, strip] of Object.entries(UNIT7_STRIP_URLS)) {
      this.load.spritesheet(stripKey, strip.url, {
        frameWidth: strip.frameWidth,
        frameHeight: strip.frameHeight,
      });
    }
  }

  create() {
    // NEXT-07 procedural texture foundry: all proc-* textures generate
    // once, deterministically, before any room scene starts.
    const generated = ensureProceduralTextures(this);

    // Stardew-quality pass: per-theme room tilesets + floor-variation
    // strips (proceduralTilesets.ts) — same determinism rules.
    ensureThemeTilesets(this);

    // DEV-only determinism probe (read-only, __playerProbe precedent):
    // the second ensure call must add nothing (idempotence), and every
    // manifest key must exist at its manifest dimensions. Dead-code
    // eliminated from production builds.
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__procTextures = {
        manifest: { ...PROCEDURAL_TEXTURE_MANIFEST },
        firstRun: generated,
        secondRunAdded: ensureProceduralTextures(this),
        textures: Object.fromEntries(
          Object.keys(PROCEDURAL_TEXTURE_MANIFEST).map((textureKey) => {
            const source = this.textures.get(textureKey).getSourceImage();

            return [textureKey, { width: source.width, height: source.height }];
          }),
        ),
      };
    }

    // Scene routing via ?scene= query param (SceneRouter). ?scene=prototype
    // stays permanently routable so no prototype research station
    // disappears before its room is ported. Built assessment stations
    // register their aliases from the station registry first.
    registerBuiltStationRoutes();
    this.scene.start(resolveStartSceneKey());
  }
}
