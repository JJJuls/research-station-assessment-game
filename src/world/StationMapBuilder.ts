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
  // 'P' = landing-pad floor: walkable exactly like '.'; only the visual
  // layer differs (decorative zone, never a collision/interaction change).
  P: TILE_FLOOR,
};

/**
 * PixelLab Wang tileset integration (Phase F).
 *
 * The accepted station tileset (`tileset-outpost-interior-v2`, 16-tile Wang
 * corner set, 4×4 sheet of 32px tiles) renders through a DUAL-GRID visual
 * layer: a (cols+1)×(rows+1) tile layer offset by (-half, -half) whose tile
 * (i,j) is chosen by corner-sampling the logical cell grid at
 * (i-1,j-1)/(i,j-1)/(i-1,j)/(i,j). The logical placeholder layer keeps ALL
 * collision exactly as before and simply becomes invisible — art swaps can
 * therefore never change collision footprints or interaction regions
 * (approved plan §10 measurement check 6, structurally guaranteed).
 *
 * Wang naming: wang_N where N is a corner bitmask with wall=set,
 * SE=1, SW=2, NE=4, NW=8 (from the tileset metadata's corners fields).
 * WANG_INDEX_TO_FRAME maps that bitmask to the frame index in the
 * downloaded 4-column sheet (derived from the metadata bounding_box of
 * every wang_N tile; metadata committed next to the PNG).
 */
export const WANG_TILESET_KEY = 'tileset-outpost-interior-v3';
export const WANG_TILESET_URL =
  'assets/tiles/station/tileset-outpost-interior-v3.png';
export const DOCK_PAD_TILESET_KEY = 'tileset-outpost-dock-v3';
export const DOCK_PAD_TILESET_URL =
  'assets/tiles/station/tileset-outpost-dock-v3.png';

// frame = (bbox.y/32)*4 + (bbox.x/32) per wang_N metadata entry:
// wang_0(64,32)=6, wang_1(96,32)=7, wang_2(64,64)=10, wang_3(32,64)=9,
// wang_4(64,0)=2, wang_5(96,64)=11, wang_6(0,32)=4, wang_7(96,96)=15,
// wang_8(32,32)=5, wang_9(64,96)=14, wang_10(32,0)=1, wang_11(0,64)=8,
// wang_12(96,0)=3, wang_13(0,0)=0, wang_14(32,96)=13, wang_15(0,96)=12.
const WANG_INDEX_TO_FRAME = [
  6, 7, 10, 9, 2, 11, 4, 15, 5, 14, 1, 8, 3, 0, 13, 12,
];

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

  // Phase F art swap: when the PixelLab Wang tileset is loaded, render it
  // on a dual-grid layer and hide (never remove) the collision layer's
  // visuals. Placeholder fallback stays fully functional without assets.
  if (scene.textures.exists(WANG_TILESET_KEY)) {
    addWangVisualLayer(scene, layout, tileSize);

    if (
      scene.textures.exists(DOCK_PAD_TILESET_KEY) &&
      layout.grid.some((row) => row.includes('P'))
    ) {
      addPadVisualLayer(scene, layout, tileSize);
    }

    layer.setVisible(false);
  }

  return {
    tilemap,
    layer,
    widthInPixels: cols * tileSize,
    heightInPixels: rows * tileSize,
  };
}

function addWangVisualLayer(
  scene: Phaser.Scene,
  layout: RoomLayout,
  tileSize: number,
) {
  const rows = layout.grid.length;
  const cols = Math.max(...layout.grid.map((row) => row.length));

  // Wall for Wang sampling: '#', void, or out-of-bounds. Doors ('-') and
  // floors ('.') are floor terrain; the door accent is carried by the
  // door marker, not the ground art.
  const isWall = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || y >= rows) {
      return true;
    }

    const ch = layout.grid[y][x];

    return ch === undefined || ch === '#' || ch === ' ';
  };

  const visualMap = scene.make.tilemap({
    tileWidth: tileSize,
    tileHeight: tileSize,
    width: cols + 1,
    height: rows + 1,
  });
  const tileset = visualMap.addTilesetImage(
    WANG_TILESET_KEY,
    WANG_TILESET_KEY,
    tileSize,
    tileSize,
    0,
    0,
  )!;
  const visualLayer = visualMap.createBlankLayer(
    'wang-visual',
    tileset,
    -tileSize / 2,
    -tileSize / 2,
  )!;

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const mask =
        (isWall(i - 1, j - 1) ? 8 : 0) + // NW
        (isWall(i, j - 1) ? 4 : 0) + // NE
        (isWall(i - 1, j) ? 2 : 0) + // SW
        (isWall(i, j) ? 1 : 0); // SE

      visualLayer.putTileAt(WANG_INDEX_TO_FRAME[mask], i, j);
    }
  }

  visualLayer.setDepth(-1);
}

/**
 * Landing-pad frame map for tileset-outpost-dock-v1 — derived from its
 * metadata bounding boxes exactly like WANG_INDEX_TO_FRAME (metadata JSON
 * committed next to the PNG). Set after download; identical sheet format.
 */
const PAD_INDEX_TO_FRAME = [
  5, 7, 10, 9, 2, 11, 4, 15, 6, 14, 1, 8, 3, 0, 13, 12,
];

/**
 * Decorative landing-pad overlay: dual-grid layer sampling 'P' cells as
 * "upper" terrain. Fully-deck tiles (mask 0) are skipped so the base Wang
 * layer shows through. Purely visual — 'P' collides and interacts exactly
 * like '.' (see CHAR_TO_TILE).
 */
function addPadVisualLayer(
  scene: Phaser.Scene,
  layout: RoomLayout,
  tileSize: number,
) {
  const rows = layout.grid.length;
  const cols = Math.max(...layout.grid.map((row) => row.length));

  const isPad = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && y < rows && layout.grid[y][x] === 'P';

  const padMap = scene.make.tilemap({
    tileWidth: tileSize,
    tileHeight: tileSize,
    width: cols + 1,
    height: rows + 1,
  });
  const tileset = padMap.addTilesetImage(
    DOCK_PAD_TILESET_KEY,
    DOCK_PAD_TILESET_KEY,
    tileSize,
    tileSize,
    0,
    0,
  )!;
  const padLayer = padMap.createBlankLayer(
    'pad-visual',
    tileset,
    -tileSize / 2,
    -tileSize / 2,
  )!;

  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const mask =
        (isPad(i - 1, j - 1) ? 8 : 0) +
        (isPad(i, j - 1) ? 4 : 0) +
        (isPad(i - 1, j) ? 2 : 0) +
        (isPad(i, j) ? 1 : 0);

      if (mask > 0) {
        padLayer.putTileAt(PAD_INDEX_TO_FRAME[mask], i, j);
      }
    }
  }

  padLayer.setDepth(-0.5);
}
