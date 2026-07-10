import Phaser from 'phaser';

/**
 * Programmatic room-map construction for the connected station world.
 *
 * Rooms are authored as small character grids instead of hand-built Tiled
 * JSON. During placeholder phases the tiles are generated at runtime from a
 * flat-colour texture; the PixelLab asset pass (Phase F) swaps in a real
 * 32 px Wang tileset behind this same interface without touching room
 * layouts, collision, or interaction regions (approved plan §10 check 6:
 * art swaps must not change collision footprints).
 *
 * Grid characters:
 *   '#'  wall (collides)
 *   '.'  floor
 *   '-'  doorway floor (visually accented, walkable; door logic is a
 *        separate interaction zone added by the scene)
 *   ' '  void (no tile)
 */
export interface RoomLayout {
  grid: string[];
  tileSize?: number;
}

export interface BuiltRoomMap {
  tilemap: Phaser.Tilemaps.Tilemap;
  layer: Phaser.Tilemaps.TilemapLayer;
  widthInPixels: number;
  heightInPixels: number;
}

// Texture key includes the tile size: the texture is generated once per
// size, so rooms with different tileSize values never slice a wrong-sized
// sheet.
const placeholderTextureKey = (tileSize: number) =>
  `station-placeholder-tiles-${tileSize}`;
const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_DOOR = 2;

/** Polar Meridian placeholder palette (visual bible §7, plan file). */
const FLOOR_COLOR = 0x39465a;
const FLOOR_EDGE_COLOR = 0x2f3b4c;
const WALL_COLOR = 0x2b3a4a;
const WALL_EDGE_COLOR = 0x1d2937;
const DOOR_COLOR = 0x3f5a66;
const DOOR_EDGE_COLOR = 0x5fd3c4;

function ensurePlaceholderTexture(scene: Phaser.Scene, tileSize: number) {
  const textureKey = placeholderTextureKey(tileSize);

  if (scene.textures.exists(textureKey)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  // Tile 0: floor
  graphics.fillStyle(FLOOR_COLOR);
  graphics.fillRect(0, 0, tileSize, tileSize);
  graphics.lineStyle(1, FLOOR_EDGE_COLOR);
  graphics.strokeRect(0.5, 0.5, tileSize - 1, tileSize - 1);

  // Tile 1: wall
  graphics.fillStyle(WALL_COLOR);
  graphics.fillRect(tileSize, 0, tileSize, tileSize);
  graphics.lineStyle(2, WALL_EDGE_COLOR);
  graphics.strokeRect(tileSize + 1, 1, tileSize - 2, tileSize - 2);

  // Tile 2: doorway floor (cyan interactable accent, visual bible rule:
  // interaction affordances share one emissive-cyan cue)
  graphics.fillStyle(DOOR_COLOR);
  graphics.fillRect(tileSize * 2, 0, tileSize, tileSize);
  graphics.lineStyle(1, DOOR_EDGE_COLOR);
  graphics.strokeRect(tileSize * 2 + 0.5, 0.5, tileSize - 1, tileSize - 1);

  graphics.generateTexture(textureKey, tileSize * 3, tileSize);
  graphics.destroy();
}

const CHAR_TO_TILE: Partial<Record<string, number>> = {
  '#': TILE_WALL,
  '.': TILE_FLOOR,
  '-': TILE_DOOR,
};

/**
 * Builds a collidable room tilemap from a character grid using the
 * placeholder texture. Returns the map and its single layer; the scene owns
 * camera/physics wiring.
 */
export function buildPlaceholderRoomMap(
  scene: Phaser.Scene,
  layout: RoomLayout,
): BuiltRoomMap {
  const tileSize = layout.tileSize ?? 32;
  const rows = layout.grid.length;
  const cols = Math.max(...layout.grid.map((row) => row.length));

  ensurePlaceholderTexture(scene, tileSize);

  const tilemap = scene.make.tilemap({
    tileWidth: tileSize,
    tileHeight: tileSize,
    width: cols,
    height: rows,
  });
  const tileset = tilemap.addTilesetImage(
    placeholderTextureKey(tileSize),
    placeholderTextureKey(tileSize),
    tileSize,
    tileSize,
    0,
    0,
  )!;
  const layer = tilemap.createBlankLayer('room', tileset)!;

  for (let y = 0; y < rows; y++) {
    const row = layout.grid[y];

    for (let x = 0; x < cols; x++) {
      const tileIndex = CHAR_TO_TILE[row[x] ?? ' '];

      if (tileIndex !== undefined) {
        layer.putTileAt(tileIndex, x, y);
      }
    }
  }

  layer.setCollision(TILE_WALL);

  return {
    tilemap,
    layer,
    widthInPixels: cols * tileSize,
    heightInPixels: rows * tileSize,
  };
}
