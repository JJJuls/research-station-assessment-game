/**
 * Deterministic dig-surface registry (field-actions foundation).
 *
 * Pure, Phaser-free. The world's diggable terrain is a set of registered
 * rectangular tile zones; every 32px cell inside an ENABLED zone is
 * individually diggable exactly once (unless the scenario explicitly
 * resets its zone). Buried objects sit in exact registered cells and can
 * be recovered only from those cells — repeated digging can never
 * duplicate an item (each buried object records when it left the
 * ground, whether into the inventory or a field cache).
 *
 * Chosen over a runtime-mutable tilemap deliberately (see
 * docs/game/FIELD-ACTIONS-REFERENCE-AUDIT.md §2): the registry plus
 * persistent decals gives the same participant-visible terrain change
 * with zero migration risk to the existing map architecture.
 *
 * Nothing here logs an event or computes a score.
 */

export const DIG_CELL_SIZE = 32;

export type DigCellState = 'untouched' | 'dug_empty' | 'dug_recovered';

export interface DigZone {
  zone_id: string;
  /** Inclusive tile-coordinate bounds. */
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  /** Disabled zones refuse digs neutrally (window/scenario gating). */
  enabled: boolean;
}

export interface BuriedObject {
  object_id: string;
  /** Inventory item granted on recovery. */
  item_id: string;
  col: number;
  row: number;
  zone_id: string;
  /** Set once the object has left the ground (inventory OR cache). */
  unearthed: boolean;
}

export type DigResolution =
  | {
      result: 'refused';
      reason: 'not_diggable' | 'zone_inactive' | 'already_dug';
    }
  | { result: 'empty'; zone_id: string }
  | { result: 'buried'; zone_id: string; object: BuriedObject };

export interface DugCellRecord {
  col: number;
  row: number;
  zone_id: string;
  state: Exclude<DigCellState, 'untouched'>;
}

export class DigSurfaceRegistry {
  private readonly zones = new Map<string, DigZone>();
  private readonly buried = new Map<string, BuriedObject>();
  private readonly cellStates = new Map<
    string,
    Exclude<DigCellState, 'untouched'>
  >();
  /** Cells inside a zone that are occupied (props) and never diggable. */
  private readonly blockedCells = new Set<string>();

  private cellKey(col: number, row: number): string {
    return `${col}:${row}`;
  }

  registerZone(zone: Omit<DigZone, 'enabled'> & { enabled?: boolean }): void {
    if (this.zones.has(zone.zone_id)) {
      throw new Error(`Duplicate dig zone: ${zone.zone_id}`);
    }

    this.zones.set(zone.zone_id, { enabled: true, ...zone });
  }

  setZoneEnabled(zoneId: string, enabled: boolean): void {
    const zone = this.zones.get(zoneId);

    if (zone === undefined) {
      throw new Error(`Unknown dig zone: ${zoneId}`);
    }

    zone.enabled = enabled;
  }

  registerBuried(object: Omit<BuriedObject, 'unearthed'>): void {
    if (this.buried.has(object.object_id)) {
      throw new Error(`Duplicate buried object: ${object.object_id}`);
    }

    const zone = this.zoneAt(object.col, object.row);

    if (zone === null || zone.zone_id !== object.zone_id) {
      throw new Error(
        `Buried object ${object.object_id} is not inside its zone ${object.zone_id}`,
      );
    }

    this.buried.set(object.object_id, { ...object, unearthed: false });
  }

  blockCell(col: number, row: number): void {
    this.blockedCells.add(this.cellKey(col, row));
  }

  /** World position → containing tile cell (32px grid). */
  resolveCell(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.floor(x / DIG_CELL_SIZE),
      row: Math.floor(y / DIG_CELL_SIZE),
    };
  }

  /** Cell centre in world pixels (for action bars, decals, caches). */
  cellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: col * DIG_CELL_SIZE + DIG_CELL_SIZE / 2,
      y: row * DIG_CELL_SIZE + DIG_CELL_SIZE / 2,
    };
  }

  zoneAt(col: number, row: number): DigZone | null {
    for (const zone of this.zones.values()) {
      if (
        col >= zone.minCol &&
        col <= zone.maxCol &&
        row >= zone.minRow &&
        row <= zone.maxRow
      ) {
        return zone;
      }
    }

    return null;
  }

  stateOf(col: number, row: number): DigCellState {
    return this.cellStates.get(this.cellKey(col, row)) ?? 'untouched';
  }

  /**
   * Whether a dig attempt at this cell would start (used for the D-chip
   * eligibility: only enabled, unblocked, untouched zone cells qualify).
   */
  isDiggable(col: number, row: number): boolean {
    const zone = this.zoneAt(col, row);

    return (
      zone !== null &&
      zone.enabled &&
      !this.blockedCells.has(this.cellKey(col, row)) &&
      this.stateOf(col, row) === 'untouched'
    );
  }

  /** The refusal reason a D press at this cell should surface (or null). */
  refusalReason(
    col: number,
    row: number,
  ): 'not_diggable' | 'zone_inactive' | 'already_dug' | null {
    const zone = this.zoneAt(col, row);

    if (zone === null || this.blockedCells.has(this.cellKey(col, row))) {
      return 'not_diggable';
    }

    if (!zone.enabled) {
      return 'zone_inactive';
    }

    if (this.stateOf(col, row) !== 'untouched') {
      return 'already_dug';
    }

    return null;
  }

  /**
   * Executes one dig at a cell. The cell's persistent state changes here
   * (empty digs still leave disturbed ground); a buried object is only
   * REPORTED — the caller attempts the inventory transaction and then
   * confirms with markUnearthed, so a failed insertion can fall back to
   * a field cache without ever duplicating or destroying the item.
   */
  dig(col: number, row: number): DigResolution {
    const refusal = this.refusalReason(col, row);

    if (refusal !== null) {
      return { result: 'refused', reason: refusal };
    }

    const zone = this.zoneAt(col, row)!;
    const object = this.buriedAt(col, row);

    if (object === null || object.unearthed) {
      this.cellStates.set(this.cellKey(col, row), 'dug_empty');

      return { result: 'empty', zone_id: zone.zone_id };
    }

    this.cellStates.set(this.cellKey(col, row), 'dug_recovered');

    return { result: 'buried', zone_id: zone.zone_id, object };
  }

  /** Confirms a buried object left the ground (inventory or cache). */
  markUnearthed(objectId: string): void {
    const object = this.buried.get(objectId);

    if (object === undefined) {
      throw new Error(`Unknown buried object: ${objectId}`);
    }

    object.unearthed = true;
  }

  private buriedAt(col: number, row: number): BuriedObject | null {
    for (const object of this.buried.values()) {
      if (object.col === col && object.row === row) {
        return object;
      }
    }

    return null;
  }

  /** Every excavated cell (persistent-state re-render / probes). */
  dugCells(): DugCellRecord[] {
    const records: DugCellRecord[] = [];

    for (const [cellKey, state] of this.cellStates) {
      const [col, row] = cellKey.split(':').map(Number);
      const zone = this.zoneAt(col, row);

      records.push({
        col,
        row,
        zone_id: zone?.zone_id ?? 'unzoned',
        state,
      });
    }

    return records;
  }

  /**
   * Explicit scenario reset of ONE zone: cell states clear and buried
   * objects that never left the ground stay recoverable; unearthed
   * objects stay unearthed (a reset never duplicates an item).
   */
  resetZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);

    if (zone === undefined) {
      throw new Error(`Unknown dig zone: ${zoneId}`);
    }

    for (const cellKey of [...this.cellStates.keys()]) {
      const [col, row] = cellKey.split(':').map(Number);

      if (this.zoneAt(col, row)?.zone_id === zoneId) {
        this.cellStates.delete(cellKey);
      }
    }
  }

  /** Test-only escape hatch. */
  reset(): void {
    this.zones.clear();
    this.buried.clear();
    this.cellStates.clear();
    this.blockedCells.clear();
  }
}
