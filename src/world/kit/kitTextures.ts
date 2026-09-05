/**
 * Modular environment kit (World V1 — PROFESSIONAL-WORLD-DESIGN-V1.md §10).
 *
 * Procedural, deterministic textures for the architecture and furniture
 * the pilot zones are composed from: door frames and lintels, wall signs,
 * bay windows, counters, shelving, storage, service infrastructure, light
 * pools and contact shadows. Every texture is drawn once per game from
 * pure rectangle/line primitives in the charcoal / slate / steel register
 * (accents: cyan for active systems, amber for caution) and is identical
 * for every participant. Presentation only: no mechanic reads a texture.
 *
 * Separate from the NEXT-07 foundry (proceduralTextures.ts) so its pinned
 * determinism manifest is untouched; generated lazily by the first room
 * scene through ensureKitTextures().
 */
import Phaser from 'phaser';

type Graphics = Phaser.GameObjects.Graphics;

interface KitTextureBuilder {
  width: number;
  height: number;
  draw: (g: Graphics) => void;
}

// ——— palette ————————————————————————————————————————————————————————————

const STEEL_DARK = 0x1e2630;
const STEEL = 0x2c3745;
const STEEL_LIGHT = 0x3d4a5c;
const STEEL_EDGE = 0x55647a;
const STEEL_HI = 0x8093a8;
const CHARCOAL = 0x141a22;
const SLATE = 0x33404f;
const GLASS = 0x0f1722;
const GLASS_HI = 0x2b3f55;
const CYAN = 0x5fd3c4;
const AMBER = 0xc9a24a;
const WARM = 0xe8d9b8;
const COLD = 0x9fc0dc;

const rect = (
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
  a = 1,
) => {
  g.fillStyle(c, a);
  g.fillRect(x, y, w, h);
};

const outline = (
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
  a = 1,
) => {
  g.lineStyle(1, c, a);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};

/** A boxed panel: fill, 1 px edge, a lighter top line and a darker bottom line. */
function panel(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = STEEL,
) {
  rect(g, x, y, w, h, fill);
  outline(g, x, y, w, h, STEEL_DARK);
  rect(g, x + 1, y + 1, w - 2, 1, STEEL_EDGE, 0.7);
  rect(g, x + 1, y + h - 2, w - 2, 1, CHARCOAL, 0.8);
}

function rivets(g: Graphics, x: number, y: number, w: number, step = 12) {
  for (let i = x + 3; i < x + w - 2; i += step) {
    rect(g, i, y, 2, 2, STEEL_HI, 0.8);
  }
}

// ——— architecture ————————————————————————————————————————————————————————

function drawDoorFrameH(g: Graphics) {
  // 112×88: two jambs (16 wide) and a lintel (24 tall) framing a 80×64 leaf.
  rect(g, 0, 0, 112, 24, STEEL);
  outline(g, 0, 0, 112, 24, STEEL_DARK);
  rect(g, 1, 1, 110, 2, STEEL_EDGE, 0.6);
  rivets(g, 0, 18, 112, 16);
  // Lamp recess (the lamp itself is a runtime rectangle).
  rect(g, 50, 6, 12, 6, CHARCOAL);
  outline(g, 49, 5, 14, 8, STEEL_DARK);
  for (const x of [0, 96]) {
    rect(g, x, 24, 16, 64, STEEL_LIGHT);
    outline(g, x, 24, 16, 64, STEEL_DARK);
    rect(g, x + 2, 26, 2, 60, STEEL_EDGE, 0.5);
    rect(g, x + 12, 26, 2, 60, CHARCOAL, 0.6);
  }
}

function drawDoorFrameV(g: Graphics) {
  // 40×112: a vertical frame for a west/east door (leaf 24×80 inside).
  rect(g, 0, 0, 40, 16, STEEL);
  rect(g, 0, 96, 40, 16, STEEL);
  rect(g, 0, 0, 8, 112, STEEL_LIGHT);
  rect(g, 32, 0, 8, 112, STEEL_LIGHT);
  outline(g, 0, 0, 40, 112, STEEL_DARK);
  rect(g, 14, 4, 12, 6, CHARCOAL);
  outline(g, 13, 3, 14, 8, STEEL_DARK);
  rivets(g, 0, 104, 40, 12);
}

function drawSignPlate(g: Graphics) {
  // 96×22: dark plate with a lighter frame; text is a runtime Text object.
  rect(g, 0, 0, 96, 22, CHARCOAL);
  outline(g, 0, 0, 96, 22, STEEL_EDGE, 0.9);
  rect(g, 2, 2, 92, 1, STEEL_LIGHT, 0.6);
  rect(g, 3, 18, 2, 2, STEEL_HI, 0.6);
  rect(g, 91, 18, 2, 2, STEEL_HI, 0.6);
}

function drawBayWindow(g: Graphics, shuttle: boolean) {
  // 96×48: frame, night glass with a horizon band and distant pad lights.
  panel(g, 0, 0, 96, 48, STEEL_LIGHT);
  rect(g, 6, 6, 84, 36, GLASS);
  // Sky gradient bands.
  for (let i = 0; i < 6; i += 1) {
    rect(g, 6, 6 + i * 4, 84, 4, 0x0b1320 + i * 0x020406, 1);
  }
  // Horizon / snow plain.
  rect(g, 6, 30, 84, 12, 0x24303e);
  rect(g, 6, 30, 84, 1, GLASS_HI);
  // Pad lights.
  for (const x of [14, 30, 62, 78]) {
    rect(g, x, 36, 2, 2, AMBER, 0.9);
  }
  if (shuttle) {
    // Shuttle nose and body silhouette on the pad, a lit cabin strip.
    rect(g, 28, 22, 44, 12, 0x6b7c92);
    rect(g, 20, 26, 10, 8, 0x6b7c92);
    rect(g, 70, 24, 8, 10, 0x5a6b80);
    rect(g, 32, 24, 30, 2, 0xbfe0f0, 0.95);
    rect(g, 26, 29, 48, 1, 0x8fa4b8, 0.6);
    rect(g, 24, 33, 52, 2, 0x1c2430);
    rect(g, 36, 35, 4, 3, 0x1c2430);
    rect(g, 58, 35, 4, 3, 0x1c2430);
  }
  // Mullions.
  rect(g, 47, 6, 2, 36, STEEL_LIGHT);
  rect(g, 6, 23, 84, 2, STEEL_LIGHT, 0.7);
}

function drawAirlockFrame(g: Graphics) {
  // 112×32: a heavy threshold header for the docking airlock (leaf below).
  rect(g, 0, 0, 112, 32, STEEL);
  outline(g, 0, 0, 112, 32, STEEL_DARK);
  rect(g, 0, 26, 112, 6, AMBER, 0.25);
  for (let x = 0; x < 112; x += 16) {
    rect(g, x, 26, 8, 6, CHARCOAL, 0.7);
  }
  rect(g, 44, 8, 24, 10, CHARCOAL);
  outline(g, 43, 7, 26, 12, STEEL_EDGE, 0.8);
  rivets(g, 0, 3, 112, 14);
}

function drawLintelLampSocket(g: Graphics) {
  // 16×8 socket (the coloured lamp is a runtime rectangle inside it).
  rect(g, 0, 0, 16, 8, CHARCOAL);
  outline(g, 0, 0, 16, 8, STEEL_EDGE, 0.8);
}

// ——— furniture ———————————————————————————————————————————————————————————

function drawOpsCounter(g: Graphics) {
  // 224×64: a long operations counter — top surface, front face, two
  // monitors and a document tray.
  rect(g, 0, 0, 224, 28, STEEL_LIGHT);
  outline(g, 0, 0, 224, 28, STEEL_DARK);
  rect(g, 2, 2, 220, 2, STEEL_EDGE, 0.7);
  rect(g, 0, 28, 224, 36, STEEL);
  outline(g, 0, 28, 224, 36, STEEL_DARK);
  for (let x = 8; x < 224; x += 32) {
    rect(g, x, 34, 2, 24, CHARCOAL, 0.6);
  }
  rect(g, 0, 60, 224, 4, CHARCOAL);
  // Monitors (two) with dim screens.
  for (const x of [40, 150]) {
    rect(g, x, 4, 28, 18, CHARCOAL);
    outline(g, x, 4, 28, 18, STEEL_EDGE, 0.9);
    rect(g, x + 3, 7, 22, 12, 0x152431);
    rect(g, x + 5, 9, 12, 1, CYAN, 0.7);
    rect(g, x + 5, 12, 16, 1, STEEL_HI, 0.6);
    rect(g, x + 5, 15, 9, 1, STEEL_HI, 0.5);
  }
  // Document tray.
  rect(g, 96, 8, 36, 12, 0x2a333f);
  outline(g, 96, 8, 36, 12, STEEL_EDGE, 0.8);
  rect(g, 99, 10, 30, 2, 0xb9c2cc, 0.8);
  rect(g, 99, 14, 26, 2, 0xb9c2cc, 0.6);
}

function drawStatusWall(g: Graphics) {
  // 192×64: the station-status wall panel — header band, six sector
  // sockets (lamps are runtime rectangles) and a schematic line.
  panel(g, 0, 0, 192, 64, STEEL);
  rect(g, 4, 4, 184, 12, CHARCOAL);
  rect(g, 8, 8, 40, 4, STEEL_HI, 0.7);
  rect(g, 4, 18, 184, 1, STEEL_EDGE, 0.6);
  for (let i = 0; i < 6; i += 1) {
    const x = 10 + i * 30;

    rect(g, x, 26, 22, 22, CHARCOAL);
    outline(g, x, 26, 22, 22, STEEL_EDGE, 0.7);
    rect(g, x + 4, 40, 14, 3, STEEL_HI, 0.5);
  }
  rect(g, 8, 54, 176, 2, STEEL_EDGE, 0.5);
}

function drawSideCounter(g: Graphics) {
  // 96×40: side counter with a paper tray.
  rect(g, 0, 0, 96, 18, STEEL_LIGHT);
  outline(g, 0, 0, 96, 18, STEEL_DARK);
  rect(g, 0, 18, 96, 22, STEEL);
  outline(g, 0, 18, 96, 22, STEEL_DARK);
  rect(g, 0, 36, 96, 4, CHARCOAL);
  rect(g, 30, 3, 36, 12, 0x2a333f);
  outline(g, 30, 3, 36, 12, STEEL_EDGE, 0.8);
  rect(g, 33, 5, 30, 2, 0xb9c2cc, 0.8);
  rect(g, 33, 9, 22, 2, 0xb9c2cc, 0.6);
}

function drawReadingDesk(g: Graphics) {
  // 64×44: a reading desk with a lamp arm (the lamp head glow is runtime).
  rect(g, 0, 10, 64, 14, STEEL_LIGHT);
  outline(g, 0, 10, 64, 14, STEEL_DARK);
  rect(g, 0, 24, 64, 20, STEEL);
  outline(g, 0, 24, 64, 20, STEEL_DARK);
  rect(g, 0, 40, 64, 4, CHARCOAL);
  rect(g, 8, 13, 22, 8, 0xb9c2cc, 0.7);
  rect(g, 10, 15, 16, 1, STEEL_DARK, 0.5);
  // Lamp arm and head.
  rect(g, 48, 0, 2, 12, STEEL_EDGE);
  rect(g, 42, 0, 14, 4, STEEL_LIGHT);
  outline(g, 42, 0, 14, 4, STEEL_DARK);
}

function drawWallGauge(g: Graphics) {
  // 32×40: a round gauge on a wall bracket.
  rect(g, 4, 30, 24, 10, STEEL);
  outline(g, 4, 30, 24, 10, STEEL_DARK);
  g.fillStyle(CHARCOAL, 1);
  g.fillCircle(16, 16, 14);
  g.lineStyle(1, STEEL_EDGE, 0.9);
  g.strokeCircle(16, 16, 14);
  g.fillStyle(0x152431, 1);
  g.fillCircle(16, 16, 11);
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI * (0.75 + (i / 7) * 1.5);

    rect(
      g,
      16 + Math.cos(a) * 8 - 1,
      16 + Math.sin(a) * 8 - 1,
      2,
      2,
      STEEL_HI,
      0.8,
    );
  }
  g.lineStyle(1, CYAN, 0.9);
  g.lineBetween(16, 16, 22, 10);
}

function drawNoticeBoard(g: Graphics) {
  // 48×40: a cork/notice board with pinned sheets.
  panel(g, 0, 0, 48, 40, 0x3a3a34);
  for (const [x, y, w, h] of [
    [5, 5, 14, 12],
    [22, 6, 18, 10],
    [8, 20, 18, 14],
    [29, 20, 12, 12],
  ] as const) {
    rect(g, x, y, w, h, 0xb9c2cc, 0.85);
    rect(g, x + 2, y + 2, w - 4, 1, STEEL_DARK, 0.5);
    rect(g, x + 2, y + 5, w - 6, 1, STEEL_DARK, 0.4);
  }
}

function drawBench(g: Graphics) {
  // 64×26: seating bench.
  rect(g, 0, 6, 64, 10, STEEL_LIGHT);
  outline(g, 0, 6, 64, 10, STEEL_DARK);
  rect(g, 0, 0, 64, 6, SLATE);
  outline(g, 0, 0, 64, 6, STEEL_DARK);
  rect(g, 4, 16, 4, 10, STEEL);
  rect(g, 56, 16, 4, 10, STEEL);
  rect(g, 30, 16, 4, 10, STEEL);
}

function drawLockerBank(g: Graphics) {
  // 96×56: three lockers.
  for (let i = 0; i < 3; i += 1) {
    const x = i * 32;

    rect(g, x, 0, 32, 56, STEEL);
    outline(g, x, 0, 32, 56, STEEL_DARK);
    rect(g, x + 3, 4, 26, 2, STEEL_EDGE, 0.6);
    rect(g, x + 6, 10, 20, 3, CHARCOAL, 0.7);
    rect(g, x + 6, 15, 20, 3, CHARCOAL, 0.7);
    rect(g, x + 24, 30, 3, 6, STEEL_HI, 0.8);
  }
  rect(g, 0, 52, 96, 4, CHARCOAL);
}

function drawCrateStack(g: Graphics) {
  // 64×64: a 2×2 stack of strapped cargo crates.
  for (const [x, y] of [
    [0, 0],
    [32, 0],
    [0, 32],
    [32, 32],
  ] as const) {
    rect(g, x, y, 32, 32, STEEL);
    outline(g, x, y, 32, 32, STEEL_DARK);
    rect(g, x + 2, y + 2, 28, 2, STEEL_EDGE, 0.7);
    rect(g, x + 14, y, 4, 32, AMBER, 0.75);
    rect(g, x, y + 14, 32, 4, AMBER, 0.75);
    rect(g, x + 4, y + 24, 10, 4, 0xb9c2cc, 0.5);
  }
}

function drawPalletJack(g: Graphics) {
  // 48×28: a low pallet jack.
  rect(g, 0, 10, 40, 12, AMBER, 0.85);
  outline(g, 0, 10, 40, 12, 0x5a4620);
  rect(g, 38, 4, 8, 20, STEEL);
  outline(g, 38, 4, 8, 20, STEEL_DARK);
  rect(g, 40, 0, 4, 8, STEEL_EDGE);
  rect(g, 2, 22, 36, 4, CHARCOAL);
  rect(g, 6, 24, 6, 4, STEEL_DARK);
  rect(g, 28, 24, 6, 4, STEEL_DARK);
}

function drawCargoRail(g: Graphics) {
  // 32×14: one segment of a low cargo rail (hazard stripe on the post).
  rect(g, 0, 4, 32, 4, STEEL_EDGE);
  rect(g, 0, 8, 32, 2, STEEL_DARK);
  rect(g, 14, 0, 4, 14, STEEL_LIGHT);
  rect(g, 14, 0, 4, 3, AMBER, 0.9);
  rect(g, 14, 6, 4, 3, AMBER, 0.9);
}

function drawTerminalKiosk(g: Graphics) {
  // 48×64: a free-standing arrival kiosk with an angled screen.
  rect(g, 8, 40, 32, 24, STEEL);
  outline(g, 8, 40, 32, 24, STEEL_DARK);
  rect(g, 4, 60, 40, 4, CHARCOAL);
  rect(g, 0, 8, 48, 34, STEEL_LIGHT);
  outline(g, 0, 8, 48, 34, STEEL_DARK);
  rect(g, 4, 12, 40, 24, CHARCOAL);
  rect(g, 6, 14, 36, 20, 0x152431);
  rect(g, 9, 17, 20, 2, CYAN, 0.8);
  rect(g, 9, 22, 28, 1, STEEL_HI, 0.6);
  rect(g, 9, 26, 22, 1, STEEL_HI, 0.5);
  rect(g, 9, 30, 14, 1, STEEL_HI, 0.4);
  rect(g, 18, 0, 12, 8, STEEL);
  outline(g, 18, 0, 12, 8, STEEL_DARK);
}

function drawWallConsoleWide(g: Graphics) {
  // 64×48: a wall-mounted incident console (two screens, a keypad).
  panel(g, 0, 0, 64, 48, STEEL);
  rect(g, 4, 4, 34, 20, CHARCOAL);
  rect(g, 6, 6, 30, 16, 0x152431);
  rect(g, 8, 8, 18, 1, CYAN, 0.7);
  rect(g, 8, 12, 24, 1, STEEL_HI, 0.6);
  rect(g, 8, 16, 14, 1, STEEL_HI, 0.5);
  rect(g, 42, 4, 18, 20, CHARCOAL);
  rect(g, 44, 6, 14, 16, 0x1a2a1f);
  rect(g, 46, 8, 10, 2, AMBER, 0.6);
  for (let i = 0; i < 4; i += 1) {
    rect(g, 6 + i * 12, 30, 8, 8, STEEL_LIGHT);
    outline(g, 6 + i * 12, 30, 8, 8, STEEL_DARK);
  }
}

// ——— service infrastructure ——————————————————————————————————————————————

function drawLightFixture(g: Graphics) {
  // 32×8: a ceiling/wall light strip housing.
  rect(g, 0, 0, 32, 8, STEEL);
  outline(g, 0, 0, 32, 8, STEEL_DARK);
  rect(g, 3, 3, 26, 2, WARM, 0.55);
}

function drawLightPool(g: Graphics, color: number) {
  // 192×80: a soft elliptical pool (concentric alpha bands).
  const bands = 7;

  for (let i = 0; i < bands; i += 1) {
    const t = i / (bands - 1);

    g.fillStyle(color, 0.05 + t * 0.045);
    g.fillEllipse(96, 40, 192 - t * 150, 80 - t * 62);
  }
}

function drawContactShadow(g: Graphics) {
  // 64×22
  g.fillStyle(0x000000, 0.14);
  g.fillEllipse(32, 11, 64, 22);
  g.fillStyle(0x000000, 0.14);
  g.fillEllipse(32, 11, 44, 14);
}

function drawHazardStrip(g: Graphics) {
  // 64×6
  for (let x = 0; x < 64; x += 8) {
    rect(g, x, 0, 4, 6, AMBER, 0.75);
    rect(g, x + 4, 0, 4, 6, CHARCOAL, 0.75);
  }
}

function drawCableTray(g: Graphics) {
  // 32×10
  rect(g, 0, 2, 32, 6, STEEL_DARK);
  rect(g, 0, 2, 32, 1, STEEL_EDGE, 0.6);
  rect(g, 0, 7, 32, 1, CHARCOAL);
  for (let x = 2; x < 32; x += 8) {
    rect(g, x, 4, 4, 2, 0x5a6d7d, 0.5);
  }
}

function drawCableJunction(g: Graphics) {
  // 16×16
  rect(g, 0, 0, 16, 16, STEEL);
  outline(g, 0, 0, 16, 16, STEEL_DARK);
  rect(g, 4, 4, 8, 8, CHARCOAL);
  rect(g, 6, 6, 4, 4, AMBER, 0.6);
}

function drawFloorLane(g: Graphics) {
  // 32×32: a painted-lane floor tile (subtle lighter plate with an edge).
  rect(g, 0, 0, 32, 32, 0xffffff, 0.13);
  rect(g, 0, 0, 32, 1, 0xffffff, 0.16);
  rect(g, 0, 31, 32, 1, 0x000000, 0.12);
}

function drawLaneEdge(g: Graphics) {
  // 32×4: a lane edge line.
  rect(g, 0, 1, 32, 2, 0x9fb2c1, 0.35);
}

function drawParcel(g: Graphics) {
  // 28×20: a strapped supply parcel (recoverable world bundle).
  rect(g, 0, 4, 28, 16, 0x4a4032);
  outline(g, 0, 4, 28, 16, 0x2a241c);
  rect(g, 2, 6, 24, 2, 0x6a5a44, 0.7);
  rect(g, 12, 4, 4, 16, 0x8a7a5a, 0.9);
  rect(g, 0, 11, 28, 3, 0x8a7a5a, 0.9);
  rect(g, 3, 0, 22, 5, 0x5a5044);
  outline(g, 3, 0, 22, 5, 0x2a241c);
}

// ——— exterior / opening kit (U2) ————————————————————————————————————————

function drawModuleRoof(g: Graphics) {
  // 192×128: a research module seen from above — roof plates with seams,
  // a vent block, a skylight strip (lit at runtime), edge trim.
  rect(g, 0, 0, 192, 128, STEEL);
  outline(g, 0, 0, 192, 128, STEEL_DARK);
  rect(g, 2, 2, 188, 2, STEEL_EDGE, 0.7);
  rect(g, 2, 124, 188, 2, CHARCOAL, 0.9);
  for (let x = 32; x < 192; x += 32) {
    rect(g, x, 3, 1, 122, STEEL_DARK, 0.7);
  }
  for (let y = 32; y < 128; y += 32) {
    rect(g, 3, y, 186, 1, STEEL_DARK, 0.6);
  }
  // Skylight recess (the lit strip is a runtime rectangle).
  rect(g, 62, 28, 68, 14, CHARCOAL);
  outline(g, 61, 27, 70, 16, STEEL_EDGE, 0.8);
  // Vent block and service hatch.
  rect(g, 140, 72, 32, 24, STEEL_LIGHT);
  outline(g, 140, 72, 32, 24, STEEL_DARK);
  for (let y = 76; y < 94; y += 5) {
    rect(g, 144, y, 24, 2, CHARCOAL, 0.7);
  }
  rect(g, 24, 80, 26, 26, STEEL_LIGHT);
  outline(g, 24, 80, 26, 26, STEEL_DARK);
  rect(g, 34, 90, 6, 6, CHARCOAL);
  rivets(g, 0, 8, 192, 24);
  rivets(g, 0, 116, 192, 24);
}

function drawCorridorRoof(g: Graphics) {
  // 64×48: a service corridor segment from above (narrower plates).
  rect(g, 0, 8, 64, 32, STEEL);
  outline(g, 0, 8, 64, 32, STEEL_DARK);
  rect(g, 1, 9, 62, 2, STEEL_EDGE, 0.6);
  rect(g, 1, 37, 62, 2, CHARCOAL, 0.8);
  rect(g, 31, 9, 1, 30, STEEL_DARK, 0.7);
  rect(g, 0, 4, 64, 4, STEEL_LIGHT);
  rect(g, 0, 40, 64, 4, STEEL_LIGHT);
}

function drawScorch(g: Graphics) {
  // 64×48: a scorch mark decal (storm arc damage) — irregular dark bands.
  for (const [x, y, w, h, a] of [
    [8, 10, 48, 28, 0.55],
    [16, 4, 30, 40, 0.35],
    [2, 18, 60, 12, 0.3],
    [22, 14, 20, 20, 0.6],
  ] as const) {
    g.fillStyle(0x0a0c10, a);
    g.fillEllipse(x + w / 2, y + h / 2, w, h);
  }
  rect(g, 26, 20, 12, 3, AMBER, 0.35);
  rect(g, 30, 26, 6, 2, AMBER, 0.3);
}

function drawSnowDrift(g: Graphics) {
  // 96×32: a wind-packed drift (low, bright ridge, shaded lee side).
  g.fillStyle(0xaebfd0, 0.9);
  g.fillEllipse(48, 20, 96, 22);
  g.fillStyle(0xe8f2fa, 0.95);
  g.fillEllipse(44, 15, 80, 14);
  g.fillStyle(0xc9d9e6, 1);
  g.fillEllipse(40, 13, 60, 8);
}

function drawMastTower(g: Graphics) {
  // 64×128: the relay mast on its footing — lattice sections, the upper
  // arm missing (a bare stub), one guy anchor.
  rect(g, 12, 116, 40, 12, STEEL);
  outline(g, 12, 116, 40, 12, STEEL_DARK);
  rect(g, 16, 112, 32, 4, STEEL_LIGHT);
  // Lattice.
  for (let y = 16; y < 112; y += 16) {
    rect(g, 24, y, 3, 16, STEEL_HI, 0.9);
    rect(g, 37, y, 3, 16, STEEL_HI, 0.9);
    rect(g, 24, y, 16, 2, STEEL_EDGE, 0.8);
    g.lineStyle(1, STEEL_EDGE, 0.6);
    g.lineBetween(26, y + 2, 38, y + 14);
  }
  // Bare stub where the upper arm sheared (amber warning tape).
  rect(g, 22, 8, 20, 8, STEEL_LIGHT);
  outline(g, 22, 8, 20, 8, STEEL_DARK);
  rect(g, 20, 12, 24, 2, AMBER, 0.8);
  rect(g, 30, 0, 4, 8, STEEL_HI);
  // Guy anchor.
  rect(g, 2, 122, 8, 6, STEEL_LIGHT);
  g.lineStyle(1, STEEL_HI, 0.5);
  g.lineBetween(6, 122, 24, 40);
}

function drawMastArm(g: Graphics) {
  // 64×24: the fallen upper arm (dish bracket + lattice) in the snow.
  rect(g, 0, 10, 48, 4, STEEL_HI, 0.9);
  rect(g, 0, 6, 48, 2, STEEL_EDGE, 0.7);
  for (let x = 4; x < 48; x += 10) {
    rect(g, x, 6, 2, 10, STEEL_EDGE, 0.8);
  }
  g.fillStyle(STEEL_LIGHT, 1);
  g.fillEllipse(54, 12, 18, 20);
  g.lineStyle(1, STEEL_DARK, 0.9);
  g.strokeEllipse(54, 12, 18, 20);
  rect(g, 44, 16, 8, 6, 0x0a0c10, 0.5);
}

function drawDebris(g: Graphics) {
  // 32×16: a torn panel fragment with a scorched edge.
  rect(g, 2, 4, 26, 9, STEEL_LIGHT);
  outline(g, 2, 4, 26, 9, STEEL_DARK);
  rect(g, 20, 2, 10, 4, STEEL);
  rect(g, 0, 9, 8, 6, 0x0a0c10, 0.5);
  rect(g, 6, 6, 14, 1, STEEL_EDGE, 0.7);
}

function drawPadLight(g: Graphics) {
  // 10×10: an amber pad marker light in a steel housing.
  rect(g, 0, 0, 10, 10, STEEL);
  outline(g, 0, 0, 10, 10, STEEL_DARK);
  rect(g, 3, 3, 4, 4, AMBER, 0.95);
}

function drawShuttleTop(g: Graphics) {
  // 192×96: the relief shuttle from above — delta hull, cabin, two
  // nacelles, landing skids, nav lights.
  // Skids.
  rect(g, 44, 78, 40, 6, STEEL_DARK);
  rect(g, 108, 78, 40, 6, STEEL_DARK);
  // Nacelles.
  rect(g, 8, 30, 40, 36, STEEL);
  outline(g, 8, 30, 40, 36, STEEL_DARK);
  rect(g, 144, 30, 40, 36, STEEL);
  outline(g, 144, 30, 40, 36, STEEL_DARK);
  for (const x of [12, 148]) {
    for (let y = 36; y < 62; y += 6) {
      rect(g, x, y, 32, 2, CHARCOAL, 0.7);
    }
  }
  // Hull (tapered toward the nose at the top).
  g.fillStyle(STEEL_HI, 1);
  g.fillTriangle(96, 4, 40, 92, 152, 92);
  g.fillStyle(STEEL_HI, 1);
  g.fillRect(52, 40, 88, 52);
  // Light upper hull plates (the vehicle must read against the pad).
  rect(g, 60, 44, 72, 40, 0xb9c8d8, 0.9);
  rect(g, 70, 30, 52, 14, 0xb9c8d8, 0.9);
  g.lineStyle(1, STEEL_DARK, 1);
  g.strokeTriangle(96, 4, 40, 92, 152, 92);
  rect(g, 52, 90, 88, 4, CHARCOAL);
  // Dorsal spine and panel seams.
  rect(g, 95, 14, 2, 76, STEEL_EDGE, 0.8);
  for (let y = 30; y < 90; y += 14) {
    rect(g, 66, y, 60, 1, STEEL_DARK, 0.6);
  }
  // Cabin (cockpit glass) and cabin strip.
  rect(g, 84, 20, 24, 12, GLASS);
  outline(g, 84, 20, 24, 12, STEEL_DARK);
  rect(g, 86, 22, 20, 3, GLASS_HI, 0.9);
  rect(g, 72, 48, 48, 4, 0xbfe0f0, 0.85);
  // Nav lights: amber wing tips, cyan tail.
  rect(g, 10, 32, 4, 4, AMBER, 0.95);
  rect(g, 178, 32, 4, 4, AMBER, 0.95);
  rect(g, 94, 86, 4, 4, CYAN, 0.9);
  // Hatch on the left flank (the docking side).
  rect(g, 54, 60, 6, 18, CHARCOAL);
  outline(g, 54, 60, 6, 18, STEEL_EDGE, 0.8);
}

// ——— manifest ————————————————————————————————————————————————————————————

export const KIT_TEXTURE_BUILDERS: Record<string, KitTextureBuilder> = {
  'kit-door-frame-h': { width: 112, height: 88, draw: drawDoorFrameH },
  'kit-door-frame-v': { width: 40, height: 112, draw: drawDoorFrameV },
  'kit-sign-plate': { width: 96, height: 22, draw: drawSignPlate },
  'kit-bay-window': {
    width: 96,
    height: 48,
    draw: (g) => drawBayWindow(g, false),
  },
  'kit-bay-window-shuttle': {
    width: 96,
    height: 48,
    draw: (g) => drawBayWindow(g, true),
  },
  'kit-airlock-frame': { width: 112, height: 32, draw: drawAirlockFrame },
  'kit-lamp-socket': { width: 16, height: 8, draw: drawLintelLampSocket },
  'kit-ops-counter': { width: 224, height: 64, draw: drawOpsCounter },
  'kit-status-wall': { width: 192, height: 64, draw: drawStatusWall },
  'kit-side-counter': { width: 96, height: 40, draw: drawSideCounter },
  'kit-reading-desk': { width: 64, height: 44, draw: drawReadingDesk },
  'kit-wall-gauge': { width: 32, height: 40, draw: drawWallGauge },
  'kit-notice-board': { width: 48, height: 40, draw: drawNoticeBoard },
  'kit-bench': { width: 64, height: 26, draw: drawBench },
  'kit-locker-bank': { width: 96, height: 56, draw: drawLockerBank },
  'kit-crate-stack': { width: 64, height: 64, draw: drawCrateStack },
  'kit-pallet-jack': { width: 48, height: 28, draw: drawPalletJack },
  'kit-cargo-rail': { width: 32, height: 14, draw: drawCargoRail },
  'kit-terminal-kiosk': { width: 48, height: 64, draw: drawTerminalKiosk },
  'kit-wall-console-wide': { width: 64, height: 48, draw: drawWallConsoleWide },
  'kit-light-fixture': { width: 32, height: 8, draw: drawLightFixture },
  'kit-light-pool-warm': {
    width: 192,
    height: 80,
    draw: (g) => drawLightPool(g, WARM),
  },
  'kit-light-pool-cold': {
    width: 192,
    height: 80,
    draw: (g) => drawLightPool(g, COLD),
  },
  'kit-light-pool-cyan': {
    width: 192,
    height: 80,
    draw: (g) => drawLightPool(g, CYAN),
  },
  'kit-contact-shadow': { width: 64, height: 22, draw: drawContactShadow },
  'kit-hazard-strip': { width: 64, height: 6, draw: drawHazardStrip },
  'kit-cable-tray': { width: 32, height: 10, draw: drawCableTray },
  'kit-cable-junction': { width: 16, height: 16, draw: drawCableJunction },
  'kit-floor-lane': { width: 32, height: 32, draw: drawFloorLane },
  'kit-lane-edge': { width: 32, height: 4, draw: drawLaneEdge },
  'kit-parcel': { width: 28, height: 20, draw: drawParcel },
  // U2 — exterior / opening kit (the plateau, Station 080 from above, the
  // relief shuttle, Mast 04, storm evidence).
  'kit-module-roof': { width: 192, height: 128, draw: drawModuleRoof },
  'kit-corridor-roof': { width: 64, height: 48, draw: drawCorridorRoof },
  'kit-scorch': { width: 64, height: 48, draw: drawScorch },
  'kit-snow-drift': { width: 96, height: 32, draw: drawSnowDrift },
  'kit-mast-tower': { width: 64, height: 128, draw: drawMastTower },
  'kit-mast-arm': { width: 64, height: 24, draw: drawMastArm },
  'kit-debris': { width: 32, height: 16, draw: drawDebris },
  'kit-pad-light': { width: 10, height: 10, draw: drawPadLight },
  'kit-shuttle-top': { width: 192, height: 96, draw: drawShuttleTop },
};

export const KIT_TEXTURE_MANIFEST: Readonly<
  Record<string, { width: number; height: number }>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(KIT_TEXTURE_BUILDERS).map(([textureKey, builder]) => [
      textureKey,
      { width: builder.width, height: builder.height },
    ]),
  ),
);

/** Generates every missing kit texture (idempotent; call from any scene). */
export function ensureKitTextures(scene: Phaser.Scene): string[] {
  const generated: string[] = [];

  for (const [textureKey, builder] of Object.entries(KIT_TEXTURE_BUILDERS)) {
    if (scene.textures.exists(textureKey)) {
      continue;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

    builder.draw(graphics);
    graphics.generateTexture(textureKey, builder.width, builder.height);
    graphics.destroy();
    generated.push(textureKey);
  }

  return generated;
}

/** Indicator colours shared by lamps, lintels and status sockets. */
export const KIT_INDICATOR = {
  active: CYAN,
  optional: 0xb8c4cf,
  inactive: 0x2b3a4a,
  caution: AMBER,
  restored: 0x7fc9a0,
} as const;
