/**
 * Manifold-trench presentation layer (action-assessment rebuild,
 * Unit 3).
 *
 * The direct-manipulation surface of the M13 manifold puzzle: renders
 * the 3x3 slot grid (feed port west, intake port east, fractured centre
 * mount), the bench with the standardised piece set, drag/drop and
 * click placement via PhysicalManipulationLayer, and click-to-rotate on
 * seated pieces. The puzzle STATE lives in
 * src/measurement/m13PipePuzzle.ts; this class owns presentation and
 * input routing only, and reports every act to the host through a
 * single onAct callback (the host logs proto_m13_* telemetry at its own
 * emission points — the layer never logs).
 *
 * Keyboard equivalence: the hosting scene's trench-console prompt cards
 * (seat/rotate/clear/submit) mutate the same module state; hosts call
 * sync() afterwards so both paths render identically.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import type { M13Rotation, M13SlotId } from '../measurement/m13PipePuzzle';
import {
  getM13Piece,
  M13_BROKEN_SLOT,
  M13_OUTLET_SLOT,
  M13_SLOT_IDS,
  M13_SOURCE_SLOT,
  m13BenchPieces,
  m13SlotPlacement,
  m13State,
  placeM13Piece,
  rotateM13Piece,
} from '../measurement/m13PipePuzzle';
import { sfxPickup, sfxUiSelect, sfxUnavailable } from './audio';
import type { PhysicalObjectSpec } from './physical';
import { PhysicalManipulationLayer } from './physical';

/** Texture per piece type (32x32, connectors on tile edges). */
export const PIPE_PIECE_TEXTURES: Record<string, string> = {
  straight: 'proc-pipe-straight',
  elbow: 'proc-pipe-elbow',
  tee: 'proc-pipe-tee',
  valve: 'proc-pipe-valve',
  cap: 'proc-pipe-cap',
};

const SLOT_PITCH = 40;
const BENCH_PITCH = 36;

export type ManifoldAct =
  | { kind: 'grabbed'; piece_id: string }
  | { kind: 'placed'; slot: M13SlotId; piece_id: string }
  | {
      kind: 'rotated';
      slot: M13SlotId;
      piece_id: string;
      rotation: M13Rotation;
    }
  | { kind: 'refused'; reason: 'broken_slot' | 'occupied_slot' };

export interface ManifoldTrenchConfig {
  scene: Phaser.Scene;
  /** Top-left slot centre (A1). */
  origin: { x: number; y: number };
  /** Left-most bench piece centre. */
  benchOrigin: { x: number; y: number };
  getPlayerPosition: () => { x: number; y: number };
  isEnabled: () => boolean;
  /** Every manipulation act, for host telemetry. */
  onAct: (act: ManifoldAct) => void;
  onFeedback: (message: string) => void;
}

export class ManifoldTrench {
  private readonly config: ManifoldTrenchConfig;
  private readonly scene: Phaser.Scene;
  private readonly layer: PhysicalManipulationLayer;
  private carriedPieceId: string | null = null;
  private seatedImages = new Map<M13SlotId, Phaser.GameObjects.Image>();
  private destroyed = false;

  constructor(config: ManifoldTrenchConfig) {
    this.config = config;
    this.scene = config.scene;

    const { scene, origin } = config;

    // Static grid chrome: slot frames, the fractured mount, ports.
    for (const slot of M13_SLOT_IDS) {
      const position = this.slotPosition(slot);

      scene.add
        .image(
          position.x,
          position.y,
          slot === M13_BROKEN_SLOT ? 'proc-pipe-slot-broken' : 'proc-pipe-slot',
        )
        .setDepth(1);
    }

    scene.add
      .text(origin.x - SLOT_PITCH - 14, origin.y + SLOT_PITCH, 'FEED ▶', {
        color: '#9fb2c1',
        font: 'bold 11px monospace',
      })
      .setOrigin(1, 0.5)
      .setDepth(Depth.AbovePlayer);
    scene.add
      .text(origin.x + 3 * SLOT_PITCH - 14, origin.y + SLOT_PITCH, '▶ INTAKE', {
        color: '#9fb2c1',
        font: 'bold 11px monospace',
      })
      .setOrigin(0, 0.5)
      .setDepth(Depth.AbovePlayer);

    this.layer = new PhysicalManipulationLayer({
      scene,
      getPlayerPosition: config.getPlayerPosition,
      isEnabled: config.isEnabled,
      onPickup: (objectId) => this.grabBenchPiece(objectId),
      onPlace: (objectId, containerId) =>
        this.placeIntoSlot(objectId, containerId as M13SlotId),
      getCarried: () => this.carriedSpec(),
      onFeedback: config.onFeedback,
    });

    this.layer.syncContainers(
      M13_SLOT_IDS.filter((slot) => slot !== M13_BROKEN_SLOT).map((slot) => {
        const position = this.slotPosition(slot);

        return {
          container_id: slot,
          label: `Mount ${slot}`,
          x: position.x,
          y: position.y,
          halfWidth: 17,
          halfHeight: 17,
          accepts: ['pipe'],
        };
      }),
    );

    // Rotation input on seated pieces (trench-owned; the physical layer
    // only carries bench pieces).
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyed = true;
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    });

    this.sync();
  }

  /** Re-renders bench + seated pieces from module state. */
  sync() {
    if (this.destroyed) {
      return;
    }

    // Bench pieces (unseated, minus the carried one) as loose objects.
    const carried = this.carriedPieceId;
    const benchPieces = m13BenchPieces().filter(
      (piece) => piece.piece_id !== carried,
    );

    this.layer.syncObjects(
      benchPieces.map((piece, index) => ({
        spec: this.pieceSpec(piece.piece_id),
        x: this.config.benchOrigin.x + index * BENCH_PITCH,
        y: this.config.benchOrigin.y,
      })),
    );

    // Seated pieces at their slots, at their rotations.
    const liveSlots = new Set<M13SlotId>();

    for (const slot of M13_SLOT_IDS) {
      const placement = m13SlotPlacement(slot);

      if (placement === null) {
        continue;
      }

      liveSlots.add(slot);

      const position = this.slotPosition(slot);
      const texture = PIPE_PIECE_TEXTURES[getM13Piece(placement.piece_id).type];
      let image = this.seatedImages.get(slot);

      if (image === undefined || image.texture.key !== texture) {
        image?.destroy();
        image = this.scene.add
          .image(position.x, position.y, texture)
          .setDepth(2);
        this.seatedImages.set(slot, image);
      }

      image.setAngle(placement.rotation);
    }

    for (const [slot, image] of [...this.seatedImages]) {
      if (!liveSlots.has(slot)) {
        image.destroy();
        this.seatedImages.delete(slot);
      }
    }
  }

  update() {
    this.layer.update();
  }

  private slotPosition(slot: M13SlotId): { x: number; y: number } {
    const column = slot.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = Number(slot[1]) - 1;

    return {
      x: this.config.origin.x + column * SLOT_PITCH,
      y: this.config.origin.y + row * SLOT_PITCH,
    };
  }

  private pieceSpec(pieceId: string): PhysicalObjectSpec {
    const piece = getM13Piece(pieceId);

    return {
      object_id: pieceId,
      label: piece.label,
      icon: PIPE_PIECE_TEXTURES[piece.type],
      category: 'pipe',
    };
  }

  private carriedSpec(): PhysicalObjectSpec | null {
    return this.carriedPieceId === null
      ? null
      : this.pieceSpec(this.carriedPieceId);
  }

  private grabBenchPiece(objectId: string): boolean {
    if (this.carriedPieceId !== null || m13State.completed) {
      this.config.onFeedback('Hands full — seat the carried section first.');

      return false;
    }

    this.carriedPieceId = objectId;
    this.config.onAct({ kind: 'grabbed', piece_id: objectId });
    this.sync();

    return true;
  }

  private placeIntoSlot(
    objectId: string,
    slot: M13SlotId,
  ): { outcome: 'accepted' } | { outcome: 'unavailable'; feedback: string } {
    if (m13SlotPlacement(slot) !== null) {
      this.config.onAct({ kind: 'refused', reason: 'occupied_slot' });

      return {
        outcome: 'unavailable',
        feedback: 'That mount already holds a section.',
      };
    }

    if (!placeM13Piece(slot, objectId)) {
      this.config.onAct({ kind: 'refused', reason: 'broken_slot' });

      return {
        outcome: 'unavailable',
        feedback: 'The centre mount is fractured — nothing seats there.',
      };
    }

    this.carriedPieceId = null;
    this.config.onAct({ kind: 'placed', slot, piece_id: objectId });
    this.sync();

    return { outcome: 'accepted' };
  }

  /** Host card path helper: returns the carried piece to the bench. */
  dropCarried() {
    this.carriedPieceId = null;
    this.sync();
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (
      this.destroyed ||
      !this.config.isEnabled() ||
      this.carriedPieceId !== null ||
      m13State.completed
    ) {
      return;
    }

    for (const slot of M13_SLOT_IDS) {
      const placement = m13SlotPlacement(slot);

      if (placement === null) {
        continue;
      }

      const position = this.slotPosition(slot);

      if (
        Math.abs(pointer.worldX - position.x) <= 17 &&
        Math.abs(pointer.worldY - position.y) <= 17
      ) {
        const player = this.config.getPlayerPosition();

        if (
          Phaser.Math.Distance.Between(
            player.x,
            player.y,
            position.x,
            position.y,
          ) > 96
        ) {
          this.config.onFeedback('Move closer to the trench to adjust it.');
          sfxUnavailable();
          return;
        }

        const rotation = rotateM13Piece(slot);

        if (rotation !== null) {
          sfxUiSelect();
          this.config.onAct({
            kind: 'rotated',
            slot,
            piece_id: placement.piece_id,
            rotation,
          });
          this.sync();
        }

        return;
      }
    }
  };
}

/** Shared pickup cue for the card-path grab (parity with drag path). */
export function manifoldGrabCue() {
  sfxPickup();
}

export { M13_OUTLET_SLOT, M13_SOURCE_SLOT };
