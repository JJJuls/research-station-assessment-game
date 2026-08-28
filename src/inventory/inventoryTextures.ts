/**
 * Runtime-generated item icons for the inventory foundation's new items
 * (inv-icon-*). Legacy carry items keep their proc-icon-* foundry art;
 * these fill the gap for the Lab demonstration items and the M02/M03
 * workstation objects without touching the shared procedural foundry.
 *
 * Deterministic Graphics drawing only — identical for every participant
 * and session. Icons are identity glyphs, never validity/quality cues.
 */

import type Phaser from 'phaser';

const ICON_SIZE = 28;

type IconPainter = (g: Phaser.GameObjects.Graphics) => void;

function outlinedBox(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  stroke: number,
) {
  g.fillStyle(fill);
  g.fillRect(x, y, w, h);
  g.lineStyle(1, stroke);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

const ICON_PAINTERS: Record<string, IconPainter> = {
  'inv-icon-fuse-contact': (g) => {
    outlinedBox(g, 12, 5, 4, 14, 0xb8c4cc, 0x7f95a8);
    g.fillStyle(0xd9a066);
    g.fillRect(11, 19, 6, 4);
  },
  'inv-icon-relay-housing': (g) => {
    outlinedBox(g, 5, 7, 18, 14, 0x3d4956, 0x62788a);
    g.fillStyle(0x0d141c);
    g.fillRect(9, 11, 4, 6);
    g.fillRect(15, 11, 4, 6);
  },
  'inv-icon-fused-cartridge': (g) => {
    outlinedBox(g, 5, 7, 18, 14, 0x4a5869, 0x7f95a8);
    g.fillStyle(0xb8c4cc);
    g.fillRect(9, 3, 3, 6);
    g.fillRect(16, 3, 3, 6);
    g.fillStyle(0x5fd3c4);
    g.fillRect(11, 15, 6, 3);
  },
  'inv-icon-sample-vial': (g) => {
    outlinedBox(g, 11, 4, 6, 19, 0x2b3a4a, 0x7f95a8);
    g.fillStyle(0x3aa6a0);
    g.fillRect(12, 13, 4, 9);
  },
  'inv-icon-seal-cap': (g) => {
    g.fillStyle(0x9aa8b4);
    g.fillCircle(14, 14, 7);
    g.lineStyle(1, 0x62788a);
    g.strokeCircle(14, 14, 7);
    g.fillStyle(0x3d4956);
    g.fillCircle(14, 14, 3);
  },
  'inv-icon-sealed-sample': (g) => {
    outlinedBox(g, 11, 6, 6, 17, 0x2b3a4a, 0x7f95a8);
    g.fillStyle(0x3aa6a0);
    g.fillRect(12, 12, 4, 10);
    g.fillStyle(0x9aa8b4);
    g.fillRect(9, 3, 10, 5);
    g.lineStyle(1, 0x5fd3c4);
    g.strokeRect(9.5, 3.5, 9, 4);
  },
  'inv-icon-field-ration': (g) => {
    outlinedBox(g, 4, 8, 20, 13, 0x8a6a48, 0x5f4832);
    g.fillStyle(0x5f4832);
    g.fillRect(12, 8, 4, 13);
    g.fillStyle(0xd9cba8);
    g.fillRect(6, 11, 5, 3);
  },
  'inv-icon-wire-spool': (g) => {
    g.fillStyle(0x3d4956);
    g.fillCircle(14, 14, 9);
    g.lineStyle(1, 0x62788a);
    g.strokeCircle(14, 14, 9);
    g.lineStyle(2, 0xd9a066);
    g.strokeCircle(14, 14, 6);
    g.strokeCircle(14, 14, 4);
    g.fillStyle(0x9aa8b4);
    g.fillCircle(14, 14, 2);
  },
  'inv-icon-insulation-wrap': (g) => {
    outlinedBox(g, 5, 10, 18, 10, 0xb8c4cc, 0x7f95a8);
    g.fillStyle(0x9aa8b4);
    g.fillCircle(21, 15, 5);
    g.lineStyle(1, 0x62788a);
    g.strokeCircle(21, 15, 5);
    g.fillStyle(0x3d4956);
    g.fillCircle(21, 15, 1.5);
  },
  'inv-icon-spare-gasket': (g) => {
    g.lineStyle(4, 0x2f3b4c);
    g.strokeCircle(14, 14, 8);
    g.lineStyle(1, 0x62788a);
    g.strokeCircle(14, 14, 10);
    g.strokeCircle(14, 14, 6);
  },
  'inv-icon-filter-cell': (g) => {
    outlinedBox(g, 5, 5, 18, 18, 0x4a5869, 0x7f95a8);
    g.lineStyle(1, 0xb8c4cc);

    for (let x = 8; x <= 20; x += 3) {
      g.lineBetween(x, 7, x, 21);
    }
  },
  'inv-icon-beacon-cell': (g) => {
    outlinedBox(g, 9, 6, 10, 17, 0x2b3a4a, 0x7f95a8);
    g.fillStyle(0x9aa8b4);
    g.fillRect(12, 3, 4, 3);
    g.fillStyle(0xd9a066);
    g.fillCircle(14, 12, 2.5);
  },
  'inv-icon-m02-doc': (g) => {
    outlinedBox(g, 6, 4, 16, 20, 0xd7dde2, 0x8a97a2);
    g.lineStyle(1, 0x62788a);
    g.lineBetween(9, 9, 19, 9);
    g.lineBetween(9, 12, 19, 12);
    g.lineBetween(9, 15, 16, 15);
    g.fillStyle(0x8c4a4a);
    g.fillRect(6, 4, 16, 3);
  },
  // Evidence-led pilot v2 — M02 open case workspace bundles (four kinds,
  // distinguished by shape AND tone; never a validity cue).
  'inv-icon-m02c-sample': (g) => {
    outlinedBox(g, 6, 5, 16, 18, 0x2f4a3e, 0x7f95a8);
    g.fillStyle(0x9fd3c4);
    g.fillCircle(14, 14, 4);
    g.lineStyle(1, 0xd7dde2);
    g.lineBetween(9, 8, 19, 8);
  },
  'inv-icon-m02c-repair': (g) => {
    outlinedBox(g, 6, 5, 16, 18, 0x4a3b2f, 0x7f95a8);
    g.lineStyle(2, 0xd9a066);
    g.lineBetween(9, 18, 19, 10);
    g.fillStyle(0xd9a066);
    g.fillRect(17, 8, 4, 4);
  },
  'inv-icon-m02c-supply': (g) => {
    outlinedBox(g, 6, 5, 16, 18, 0x2b3a4a, 0x7f95a8);
    g.lineStyle(1, 0xb8c4cc);
    g.strokeRect(9.5, 9.5, 9, 9);
    g.lineBetween(9, 14, 19, 14);
    g.lineBetween(14, 9, 14, 19);
  },
  'inv-icon-m02c-incident': (g) => {
    outlinedBox(g, 6, 5, 16, 18, 0x4a2f33, 0x7f95a8);
    g.fillStyle(0xe6c68f);
    g.fillTriangle(14, 8, 9, 18, 19, 18);
    g.fillStyle(0x4a2f33);
    g.fillRect(13, 11, 2, 4);
    g.fillRect(13, 16, 2, 1);
  },
  'inv-icon-m03-spent-cartridge': (g) => {
    outlinedBox(g, 7, 9, 14, 10, 0x62788a, 0x3d4956);
    g.fillStyle(0x2b3a4a);
    g.fillRect(21, 11, 3, 6);
    g.lineStyle(1, 0x3d4956);
    g.lineBetween(10, 11, 10, 17);
    g.lineBetween(13, 11, 13, 17);
  },
  'inv-icon-m03-offcut-strip': (g) => {
    g.fillStyle(0x8a97a2);
    g.beginPath();
    g.moveTo(4, 20);
    g.lineTo(20, 6);
    g.lineTo(24, 10);
    g.lineTo(8, 24);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x62788a);
    g.strokePath();
  },
  'inv-icon-m03-used-stencil': (g) => {
    outlinedBox(g, 5, 6, 18, 16, 0x4a5869, 0x62788a);
    g.fillStyle(0x0d141c);
    g.fillRect(8, 9, 4, 4);
    g.fillRect(15, 9, 5, 4);
    g.fillRect(8, 16, 8, 3);
  },
  'inv-icon-m03-spent-swab': (g) => {
    g.lineStyle(2, 0xb8c4cc);
    g.lineBetween(8, 22, 19, 7);
    g.fillStyle(0x8a97a2);
    g.fillCircle(20, 6, 4);
    g.lineStyle(1, 0x62788a);
    g.strokeCircle(20, 6, 4);
  },
  'inv-icon-m03-tray-liner': (g) => {
    outlinedBox(g, 4, 10, 20, 12, 0xc9cfd4, 0x8a97a2);
    g.lineStyle(1, 0x8a97a2);
    g.lineBetween(4, 14, 24, 14);
    g.fillStyle(0x9aa8b4);
    g.fillRect(4, 10, 20, 2);
  },
};

/**
 * Generates every inv-icon-* texture once per game instance (idempotent;
 * safe to call from the overlay, the Lab and the hotbar HUD).
 */
export function ensureInventoryIconTextures(scene: Phaser.Scene) {
  for (const [textureKey, paint] of Object.entries(ICON_PAINTERS)) {
    if (scene.textures.exists(textureKey)) {
      continue;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

    paint(graphics);
    graphics.generateTexture(textureKey, ICON_SIZE, ICON_SIZE);
    graphics.destroy();
  }
}
