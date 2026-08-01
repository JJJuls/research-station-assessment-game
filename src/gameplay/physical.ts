/**
 * Reusable direct-manipulation framework (physical-mechanics session,
 * Unit 1).
 *
 * A typed world-object layer that lets the participant VISIBLY manipulate
 * task objects: pick a loose object up (click, or start a drag), carry it
 * beside the avatar, drag or click it into a container/spatial slot, get
 * neutral valid/invalid placement feedback, take objects back out for
 * correction, and see persistent world state (objects render where the
 * host task state says they are).
 *
 * Division of responsibility (measurement safety):
 * - The layer owns PRESENTATION AND INPUT ROUTING ONLY. All task state
 *   lives in the host scene/module ("host"), which receives typed
 *   callbacks (`onPickup`, `onPlace`) and mutates its own state
 *   container; the layer re-renders from `sync*` calls. The layer never
 *   logs an event — event emission stays at the host's existing emission
 *   points, so a physical placement and a prompt-card placement converge
 *   on the SAME state mutation and the SAME telemetry (redundant-
 *   activator pattern, NEXT-08 §3.2 precedent, extended to the world).
 * - Reach is embodied: an object can be grabbed and a container can
 *   receive only while the PLAYER stands within reach — walking between
 *   stations remains part of the task. A drag released away from any
 *   in-reach container simply keeps the object carried (never a lost
 *   drop, never a punishing failure).
 * - The prompt-card flow remains each host's keyboard-accessible
 *   equivalent; both paths stay available at all times.
 * - Feedback is neutral and uniform per action class: one pickup cue,
 *   one place cue, one unavailable cue; correctness is NEVER previewed
 *   or revealed at placement time by this layer (hosts surface errors
 *   only where their measurement design already does, e.g. a review
 *   step).
 *
 * DEV probe: window.__physicalProbe (read-only, stripped from production
 * builds) exposes screen-space rects of loose objects and containers so
 * runtime verification can drive real pointer input.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import { sfxPickup, sfxUiSelect, sfxUnavailable } from './audio';

export interface PhysicalObjectSpec {
  /** Host-scoped object id (e.g. a registry item_id). */
  object_id: string;
  /** Participant-facing label (used for hover/reach hints). */
  label: string;
  /** Icon texture key rendered in the world and beside the avatar. */
  icon: string;
  /** Compatibility category, matched against container `accepts`. */
  category: string;
}

/** One loose object rendered at a world position. */
export interface PhysicalObjectEntry {
  spec: PhysicalObjectSpec;
  x: number;
  y: number;
  /**
   * Activator object: an in-reach click invokes this instead of the
   * pickup flow (no carry, no drag) — e.g. a drawer front that opens.
   * The host owns all semantics and feedback.
   */
  activate?: () => void;
}

export interface PhysicalContainerEntry {
  container_id: string;
  label: string;
  x: number;
  y: number;
  /** Drop-zone half-extents around (x, y); defaults suit 40px props. */
  halfWidth?: number;
  halfHeight?: number;
  /**
   * Categories this container is FICTION-compatible with (hover/drop
   * affordance only — the HOST decides placement semantics in onPlace;
   * an omitted list accepts every category).
   */
  accepts?: readonly string[];
}

export type PhysicalPlacement =
  /** Host applied the placement (correctness is the host's business). */
  | { outcome: 'accepted' }
  /** Container cannot take this object now (capacity/wrong kind). */
  | { outcome: 'unavailable'; feedback: string };

export interface PhysicalLayerConfig {
  scene: Phaser.Scene;
  getPlayerPosition: () => { x: number; y: number };
  /** Player-to-object / player-to-container manipulation reach (px). */
  reachRadius?: number;
  /** Input eligibility (host: no open prompt, no timed world action). */
  isEnabled: () => boolean;
  /**
   * Object grabbed (click or drag start). Host moves the object into its
   * carried state and returns true; returning false refuses the grab
   * (e.g. hands already full) and the host surfaces its own feedback.
   */
  onPickup: (objectId: string) => boolean;
  /**
   * Carried/dragged object released over an in-reach container. Host
   * applies its own semantics (including emitting its existing events).
   */
  onPlace: (objectId: string, containerId: string) => PhysicalPlacement;
  /** Currently carried object id per host state (single-slot hosts). */
  getCarried: () => PhysicalObjectSpec | null;
  /** Neutral message sink (host's showFeedbackMessage). */
  onFeedback: (message: string) => void;
  /** Render the carried-item bubble beside the avatar (default true). */
  showCarriedBubble?: boolean;
}

interface RenderedObject {
  entry: PhysicalObjectEntry;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  outline: Phaser.GameObjects.Rectangle;
}

interface RenderedContainer {
  entry: PhysicalContainerEntry;
  highlight: Phaser.GameObjects.Rectangle;
}

interface PhysicalProbeRect {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'object' | 'container';
}

declare global {
  interface Window {
    /**
     * DEV-only, read-only physical-layer probe (__promptCards
     * precedent): screen rects of manipulable objects and containers of
     * the active scene's layer, plus carried/drag state. Never read back
     * into gameplay.
     */
    __physicalProbe?: {
      scene: string;
      objects: PhysicalProbeRect[];
      containers: PhysicalProbeRect[];
      carried: string | null;
      dragging: string | null;
    } | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__physicalProbe = null;
}

const DEFAULT_REACH = 96;
const DRAG_THRESHOLD = 6;

/**
 * One direct-manipulation layer per hosting scene. Create in
 * populateRoom(), call update() from onRoomUpdate(), and re-sync after
 * any host state change; the layer destroys itself with the scene.
 */
export class PhysicalManipulationLayer {
  private readonly config: Required<
    Pick<PhysicalLayerConfig, 'reachRadius' | 'showCarriedBubble'>
  > &
    PhysicalLayerConfig;
  private readonly scene: Phaser.Scene;

  private objects: RenderedObject[] = [];
  private containers: RenderedContainer[] = [];

  private carriedBubble: Phaser.GameObjects.Image | null = null;
  private carriedBubbleIcon: string | null = null;

  /** Pointer-down candidate for click-vs-drag disambiguation. */
  private pressCandidate: {
    objectId: string;
    startX: number;
    startY: number;
  } | null = null;
  /** Ghost image following the pointer during an active drag. */
  private dragGhost: Phaser.GameObjects.Image | null = null;
  private draggingObjectId: string | null = null;

  private destroyed = false;

  constructor(config: PhysicalLayerConfig) {
    this.config = {
      reachRadius: DEFAULT_REACH,
      showCarriedBubble: true,
      ...config,
    };
    this.scene = config.scene;

    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyed = true;
      this.scene.input.off(
        Phaser.Input.Events.POINTER_DOWN,
        this.onPointerDown,
      );
      this.scene.input.off(
        Phaser.Input.Events.POINTER_MOVE,
        this.onPointerMove,
      );
      this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp);

      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        window.__physicalProbe = null;
      }
    });
  }

  /**
   * Renders the loose-object set (host state → world). Call whenever the
   * host's object locations change; the layer change-detects by id+position.
   */
  syncObjects(entries: PhysicalObjectEntry[]) {
    const signature = entries
      .map((entry) => `${entry.spec.object_id}@${entry.x},${entry.y}`)
      .join('|');

    if (signature === this.objectSignature) {
      return;
    }

    this.objectSignature = signature;

    for (const rendered of this.objects) {
      rendered.image.destroy();
      rendered.shadow.destroy();
      rendered.outline.destroy();
    }

    this.objects = [];

    for (const entry of entries) {
      if (!this.scene.textures.exists(entry.spec.icon)) {
        continue;
      }

      const shadow = this.scene.add
        .ellipse(entry.x, entry.y + 8, 18, 7, 0x000000, 0.25)
        .setDepth(Depth.AbovePlayer - 1);
      const image = this.scene.add
        .image(entry.x, entry.y, entry.spec.icon)
        .setDepth(Depth.AbovePlayer);
      const outline = this.scene.add
        .rectangle(entry.x, entry.y, 26, 26, 0x000000, 0)
        .setStrokeStyle(1, 0x5fd3c4, 0.9)
        .setDepth(Depth.AbovePlayer)
        .setVisible(false);

      this.objects.push({ entry, image, shadow, outline });
    }

    this.refreshProbe();
  }

  private objectSignature = '__unset__';

  /** Registers the container/drop-zone set (usually once per room). */
  syncContainers(entries: PhysicalContainerEntry[]) {
    for (const rendered of this.containers) {
      rendered.highlight.destroy();
    }

    this.containers = entries.map((entry) => {
      const highlight = this.scene.add
        .rectangle(
          entry.x,
          entry.y,
          (entry.halfWidth ?? 26) * 2 + 10,
          (entry.halfHeight ?? 26) * 2 + 10,
          0x5fd3c4,
          0.08,
        )
        .setStrokeStyle(1, 0x5fd3c4, 0.8)
        .setDepth(Depth.AbovePlayer)
        .setVisible(false);

      return { entry, highlight };
    });

    this.refreshProbe();
  }

  /** Per-frame update: carried bubble, hover cues, drop-zone hints. */
  update() {
    if (this.destroyed) {
      return;
    }

    this.updateCarriedBubble();
    this.updateHoverCues();
    this.refreshProbe();
  }

  private updateCarriedBubble() {
    const carried = this.config.showCarriedBubble
      ? this.config.getCarried()
      : null;
    const icon = carried?.icon ?? null;

    if (icon !== this.carriedBubbleIcon) {
      this.carriedBubbleIcon = icon;
      this.carriedBubble?.destroy();
      this.carriedBubble = null;

      if (icon !== null && this.scene.textures.exists(icon)) {
        this.carriedBubble = this.scene.add
          .image(0, 0, icon)
          .setScale(0.8)
          .setDepth(Depth.AbovePlayer);
      }
    }

    if (this.carriedBubble !== null) {
      const player = this.config.getPlayerPosition();

      this.carriedBubble.setPosition(player.x + 16, player.y - 30);
      // The ghost replaces the bubble visual while a drag is live.
      this.carriedBubble.setVisible(this.dragGhost === null);
    }
  }

  private updateHoverCues() {
    const pointer = this.scene.input.activePointer;
    const enabled = this.config.isEnabled();
    const player = this.config.getPlayerPosition();
    const manipulating =
      this.config.getCarried() !== null || this.draggingObjectId !== null;

    for (const rendered of this.objects) {
      const hover =
        enabled &&
        !manipulating &&
        this.hitsObject(rendered, pointer.worldX, pointer.worldY) &&
        this.withinReach(player, rendered.entry.x, rendered.entry.y);

      rendered.outline.setVisible(hover);
    }

    for (const rendered of this.containers) {
      const eligible =
        enabled &&
        manipulating &&
        this.containerAccepts(rendered.entry) &&
        this.withinReach(player, rendered.entry.x, rendered.entry.y);

      rendered.highlight.setVisible(eligible);
    }
  }

  private containerAccepts(entry: PhysicalContainerEntry): boolean {
    const moving =
      this.draggingObjectId !== null
        ? this.findObjectSpec(this.draggingObjectId)
        : this.config.getCarried();

    if (moving === null || entry.accepts === undefined) {
      return true;
    }

    return entry.accepts.includes(moving.category);
  }

  private findObjectSpec(objectId: string): PhysicalObjectSpec | null {
    // A dragged object has left the loose set; its spec is what the host
    // now reports as carried (drag start runs onPickup immediately).
    const carried = this.config.getCarried();

    if (carried !== null && carried.object_id === objectId) {
      return carried;
    }

    return (
      this.objects.find((r) => r.entry.spec.object_id === objectId)?.entry
        .spec ?? null
    );
  }

  private withinReach(
    player: { x: number; y: number },
    x: number,
    y: number,
  ): boolean {
    return (
      Phaser.Math.Distance.Between(player.x, player.y, x, y) <=
      this.config.reachRadius
    );
  }

  private hitsObject(
    rendered: RenderedObject,
    worldX: number,
    worldY: number,
  ): boolean {
    return (
      Math.abs(worldX - rendered.entry.x) <= 14 &&
      Math.abs(worldY - rendered.entry.y) <= 14
    );
  }

  private hitContainer(
    worldX: number,
    worldY: number,
  ): PhysicalContainerEntry | null {
    for (const rendered of this.containers) {
      const { entry } = rendered;

      if (
        Math.abs(worldX - entry.x) <= (entry.halfWidth ?? 26) + 6 &&
        Math.abs(worldY - entry.y) <= (entry.halfHeight ?? 26) + 6
      ) {
        return entry;
      }
    }

    return null;
  }

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (!this.config.isEnabled()) {
      return;
    }

    const player = this.config.getPlayerPosition();
    const carried = this.config.getCarried();

    // Carrying: a press on an in-reach compatible container places.
    if (carried !== null) {
      const container = this.hitContainer(pointer.worldX, pointer.worldY);

      if (container !== null) {
        if (!this.withinReach(player, container.x, container.y)) {
          this.config.onFeedback(`Move closer to the ${container.label}.`);
          return;
        }

        this.applyPlacement(carried.object_id, container);
        return;
      }

      // A press on another loose object while carrying routes to the
      // host's pickup gate so its refusal feedback ("hands are full")
      // surfaces instead of a silent no-op.
      for (const rendered of this.objects) {
        if (
          this.hitsObject(rendered, pointer.worldX, pointer.worldY) &&
          this.withinReach(player, rendered.entry.x, rendered.entry.y) &&
          rendered.entry.activate === undefined
        ) {
          this.config.onPickup(rendered.entry.spec.object_id);
          return;
        }
      }

      return;
    }

    // Hands free: a press on a loose object begins click-or-drag (or
    // invokes an activator object directly).
    for (const rendered of this.objects) {
      if (this.hitsObject(rendered, pointer.worldX, pointer.worldY)) {
        if (!this.withinReach(player, rendered.entry.x, rendered.entry.y)) {
          this.config.onFeedback(
            `Move closer to reach the ${rendered.entry.spec.label}.`,
          );
          return;
        }

        if (rendered.entry.activate !== undefined) {
          rendered.entry.activate();
          return;
        }

        this.pressCandidate = {
          objectId: rendered.entry.spec.object_id,
          startX: pointer.x,
          startY: pointer.y,
        };
        return;
      }
    }
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (this.pressCandidate !== null && this.dragGhost === null) {
      const moved = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.pressCandidate.startX,
        this.pressCandidate.startY,
      );

      if (moved >= DRAG_THRESHOLD) {
        this.beginDrag(this.pressCandidate.objectId, pointer);
      }
    }

    if (this.dragGhost !== null) {
      this.dragGhost.setPosition(pointer.worldX, pointer.worldY);
    }
  };

  private beginDrag(objectId: string, pointer: Phaser.Input.Pointer) {
    const spec = this.findObjectSpec(objectId);

    if (spec === null || !this.config.onPickup(objectId)) {
      this.pressCandidate = null;
      return;
    }

    sfxPickup();
    this.draggingObjectId = objectId;

    if (this.scene.textures.exists(spec.icon)) {
      this.dragGhost = this.scene.add
        .image(pointer.worldX, pointer.worldY, spec.icon)
        .setDepth(Depth.AboveWorld - 1)
        .setAlpha(0.9);
    }
  }

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => {
    const candidate = this.pressCandidate;

    this.pressCandidate = null;

    // Plain click (no drag threshold crossed): pick the object up.
    if (candidate !== null && this.draggingObjectId === null) {
      if (this.config.isEnabled() && this.config.onPickup(candidate.objectId)) {
        sfxPickup();
      }

      return;
    }

    // Drag release.
    if (this.draggingObjectId !== null) {
      const objectId = this.draggingObjectId;
      const player = this.config.getPlayerPosition();
      const container = this.hitContainer(pointer.worldX, pointer.worldY);

      this.draggingObjectId = null;
      this.dragGhost?.destroy();
      this.dragGhost = null;

      if (
        container !== null &&
        this.withinReach(player, container.x, container.y)
      ) {
        this.applyPlacement(objectId, container);
      }
      // Released anywhere else: the object simply stays carried (the
      // bubble reappears beside the avatar) — never a lost drop.
    }
  };

  private applyPlacement(objectId: string, container: PhysicalContainerEntry) {
    const result = this.config.onPlace(objectId, container.container_id);

    if (result.outcome === 'accepted') {
      sfxUiSelect();
      return;
    }

    sfxUnavailable();
    this.config.onFeedback(result.feedback);
    this.shakeContainer(container.container_id);
  }

  private shakeContainer(containerId: string) {
    const rendered = this.containers.find(
      (entry) => entry.entry.container_id === containerId,
    );

    if (rendered === undefined) {
      return;
    }

    const { highlight } = rendered;
    const originX = rendered.entry.x;

    this.scene.tweens.add({
      targets: highlight,
      x: { from: originX - 3, to: originX + 3 },
      duration: 50,
      repeat: 3,
      yoyo: true,
      onComplete: () => highlight.setX(originX),
    });
  }

  private refreshProbe() {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    const camera = this.scene.cameras.main;
    const toScreen = (x: number, y: number) => ({
      x: x - camera.worldView.x,
      y: y - camera.worldView.y,
    });

    window.__physicalProbe = {
      scene: this.scene.scene.key,
      objects: this.objects.map((rendered) => {
        const screen = toScreen(rendered.entry.x, rendered.entry.y);

        return {
          id: rendered.entry.spec.object_id,
          label: rendered.entry.spec.label,
          x: screen.x - 14,
          y: screen.y - 14,
          width: 28,
          height: 28,
          kind: 'object' as const,
        };
      }),
      containers: this.containers.map((rendered) => {
        const { entry } = rendered;
        const screen = toScreen(entry.x, entry.y);
        const halfWidth = (entry.halfWidth ?? 26) + 6;
        const halfHeight = (entry.halfHeight ?? 26) + 6;

        return {
          id: entry.container_id,
          label: entry.label,
          x: screen.x - halfWidth,
          y: screen.y - halfHeight,
          width: halfWidth * 2,
          height: halfHeight * 2,
          kind: 'container' as const,
        };
      }),
      carried: this.config.getCarried()?.object_id ?? null,
      dragging: this.draggingObjectId,
    };
  }
}
