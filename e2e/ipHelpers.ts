/**
 * Information Processing Lab — shared Playwright helpers.
 *
 * Every interaction here is REAL browser input (pointer down/move/up,
 * keyboard down/up) against rectangles reported by the DEV-only
 * read-only probes (`__ipTerminalProbe`, `__ipPipeProbe`,
 * `__ipDiagnosisProbe`, `__ipModules`, `__playerProbe`). No helper
 * mutates module state through the window; the probes are mirrors.
 */

import { expect, type Page } from '@playwright/test';

import { designToPage, driveAxisTo } from './helpers';

export const IP_LAB_SCENE = 'information_processing_lab';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TerminalProbeLike {
  open: boolean;
  task: string | null;
  stage: string;
  closed: boolean;
  chips: (Rect & { id: string; label: string; state: string })[];
  bins: (Rect & { id: string })[];
  palette: (Rect & { token: string })[];
  buffer: (Rect & {
    index: number;
    text: string;
    input_mode: 'pointer' | 'typed';
    remove: Rect | null;
  })[];
  buttons: (Rect & { id: string; label: string; enabled: boolean })[];
  line: string;
  console: string[];
  output: string[];
  codebook: string[];
  submit_enabled: boolean;
  dragging: boolean;
  drop_target: string | null;
  drop_valid: boolean;
  help_open: boolean;
  confirm_open: boolean;
}

export interface IpModulesProbeLike {
  modules: Record<string, Record<string, unknown>>;
  validity: {
    opportunity_id: string;
    validity: string;
    completed: boolean;
    entered: boolean;
    invalid_reason: string | null;
    form: string | null;
    prior_exposure: string[];
  }[];
  event_families: Record<string, string[]>;
}

/* ------------------------------------------------------------------ *
 * Boot + navigation
 * ------------------------------------------------------------------ */

export async function bootIpLab(
  page: Page,
  params: Record<string, string> = {},
) {
  const search = new URLSearchParams({
    scene: IP_LAB_SCENE,
    participant_id: params.participant_id ?? 'PT_IP',
    game_session_id: params.game_session_id ?? `GS_IP_${Date.now()}`,
    ...params,
  });

  await page.goto(`/?${search.toString()}`);
  await page.waitForFunction(
    (scene) =>
      (window as unknown as { __playerProbe?: { scene: string } | null })
        .__playerProbe?.scene === scene,
    IP_LAB_SCENE,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(500);
}

/** Station coordinates (InformationProcessingLabScene.buildStations). */
export const IP_STATIONS: Record<string, { x: number; y: number }> = {
  tutorial: { x: 96, y: 150 },
  m14: { x: 248, y: 150 },
  m15: { x: 400, y: 150 },
  m16: { x: 552, y: 150 },
  m17: { x: 704, y: 150 },
  m13: { x: 240, y: 450 },
  m18: { x: 560, y: 450 },
};

export async function holdKey(page: Page, keyName: string, ms: number) {
  await page.keyboard.down(keyName);
  await page.waitForTimeout(ms);
  await page.keyboard.up(keyName);
  await page.waitForTimeout(120);
}

/**
 * Walks to a station (open room: one horizontal leg along y=300, then a
 * vertical leg) and presses E. Stations sit 40-60 px inside the walls,
 * so the final approach clamps well inside the 72 px radius.
 */
export async function walkToStation(page: Page, stationId: string) {
  const target = IP_STATIONS[stationId];

  if (target === undefined) {
    throw new Error(`unknown IP station ${stationId}`);
  }

  await driveAxisTo(page, 'y', 300, 8);
  await driveAxisTo(page, 'x', target.x, 8);
  await driveAxisTo(
    page,
    'y',
    target.y > 300 ? target.y - 44 : target.y + 44,
    8,
  );
}

export async function walkAndUseStation(page: Page, stationId: string) {
  await walkToStation(page, stationId);
  await holdKey(page, 'e', 160);
}

/* ------------------------------------------------------------------ *
 * Probes
 * ------------------------------------------------------------------ */

export async function terminalProbe(page: Page): Promise<TerminalProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __ipTerminalProbe?: TerminalProbeLike | null })
        .__ipTerminalProbe ?? null,
  );

  if (probe === null) {
    throw new Error('terminal probe unavailable');
  }

  return probe;
}

export async function waitTerminalOpen(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __ipTerminalProbe?: { open: boolean } | null })
        .__ipTerminalProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(150);
}

export async function ipModules(page: Page): Promise<IpModulesProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __ipModules?: IpModulesProbeLike | null })
        .__ipModules ?? null,
  );

  if (probe === null) {
    throw new Error('__ipModules probe unavailable');
  }

  return probe;
}

export async function ipModule(
  page: Page,
  id: string,
): Promise<Record<string, unknown>> {
  const probe = await ipModules(page);
  const module = probe.modules[id];

  if (module === undefined) {
    throw new Error(`module ${id} not in __ipModules`);
  }

  return module;
}

export async function ipValidity(page: Page, opportunityId: string) {
  const probe = await ipModules(page);
  const record = probe.validity.find(
    (candidate) => candidate.opportunity_id === opportunityId,
  );

  if (record === undefined) {
    throw new Error(`validity record ${opportunityId} missing`);
  }

  return record;
}

/* ------------------------------------------------------------------ *
 * Pointer primitives (FIT-scaled 800×600 design space)
 * ------------------------------------------------------------------ */

export async function gamePoint(page: Page, x: number, y: number) {
  // V4: design space → page (helpers.designToPage reads __designSpace).
  return designToPage(page, x, y);
}

export async function rectCenter(page: Page, rect: Rect) {
  return gamePoint(page, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

export async function clickRect(page: Page, rect: Rect) {
  const point = await rectCenter(page, rect);

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(40);
  await page.mouse.up();
  await page.waitForTimeout(220);
}

/** Real drag: down, threshold-crossing nudge, 8-step glide, up. */
export async function dragRectToRect(page: Page, from: Rect, to: Rect) {
  const start = await rectCenter(page, from);
  const end = await rectCenter(page, to);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 10, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(260);
}

/* ------------------------------------------------------------------ *
 * Terminal actions
 * ------------------------------------------------------------------ */

export async function terminalButton(page: Page, id: string) {
  const probe = await terminalProbe(page);
  const button = probe.buttons.find((candidate) => candidate.id === id);

  if (button === undefined) {
    throw new Error(`terminal button ${id} not present`);
  }

  return button;
}

export async function clickTerminalButton(page: Page, id: string) {
  await clickRect(page, await terminalButton(page, id));
}

export async function terminalChip(page: Page, id: string) {
  const probe = await terminalProbe(page);
  const chip = probe.chips.find((candidate) => candidate.id === id);

  if (chip === undefined) {
    throw new Error(`terminal chip ${id} not present`);
  }

  return chip;
}

export async function terminalBin(page: Page, id: string) {
  const probe = await terminalProbe(page);
  const bin = probe.bins.find((candidate) => candidate.id === id);

  if (bin === undefined) {
    throw new Error(`terminal bin ${id} not present`);
  }

  return bin;
}

export async function terminalToken(page: Page, token: string) {
  const probe = await terminalProbe(page);
  const entry = probe.palette.find((candidate) => candidate.token === token);

  if (entry === undefined) {
    throw new Error(`palette token ${token} not present`);
  }

  return entry;
}

/** Drag a chip onto a bin (ROUTE-style pointer composition). */
export async function dragChipToBin(page: Page, chipId: string, binId: string) {
  await dragRectToRect(
    page,
    await terminalChip(page, chipId),
    await terminalBin(page, binId),
  );
}

/** Drag a chip onto another chip (PAIR-style pointer composition). */
export async function dragChipToChip(page: Page, fromId: string, toId: string) {
  await dragRectToRect(
    page,
    await terminalChip(page, fromId),
    await terminalChip(page, toId),
  );
}

/** Click-compose: palette verb → chips/tokens → ADD. */
export async function composeByClick(page: Page, tokens: string[]) {
  for (const token of tokens) {
    const probe = await terminalProbe(page);
    const chip = probe.chips.find((candidate) => candidate.id === token);
    const bin = probe.bins.find((candidate) => candidate.id === token);
    const palette = probe.palette.find(
      (candidate) => candidate.token === token,
    );
    const rect = chip ?? bin ?? palette;

    if (rect === undefined) {
      throw new Error(`no clickable element for token ${token}`);
    }

    await clickRect(page, rect);
  }

  await clickTerminalButton(page, 'add');
}

/** Type a command character by character and press ENTER. */
export async function typeCommand(page: Page, text: string) {
  for (const char of text) {
    await page.keyboard.press(char === ' ' ? 'Space' : char);
    await page.waitForTimeout(25);
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(220);
}

export async function waitBufferLength(page: Page, length: number) {
  await page.waitForFunction(
    (wanted) =>
      ((
        window as unknown as {
          __ipTerminalProbe?: { buffer: unknown[] } | null;
        }
      ).__ipTerminalProbe?.buffer.length ?? -1) === wanted,
    length,
    { timeout: 8_000 },
  );
}

export async function expectBufferTexts(page: Page, texts: string[]) {
  const probe = await terminalProbe(page);

  expect(probe.buffer.map((line) => line.text)).toEqual(texts);
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export interface IpEventLike {
  event_type: string;
  episode?: string;
  scene?: string;
  object_id?: string;
  study_item_ids?: string[];
  construct_id?: string;
  success?: boolean | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function ipEvents(page: Page): Promise<IpEventLike[]> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          researchRuntime: { getEvents: () => unknown[] };
        }
      ).researchRuntime.getEvents() as never[],
  );
}

export function eventsOfFamily(
  events: IpEventLike[],
  familyPrefix: string,
): IpEventLike[] {
  return events.filter((event) =>
    event.event_type.startsWith(`${familyPrefix}_`),
  );
}

/** Every proto_* event must be free of canonical scientific context. */
export function expectProvisionalOnly(events: IpEventLike[]) {
  for (const event of events) {
    expect(event.study_item_ids, event.event_type).toBeUndefined();
    expect(event.construct_id, event.event_type).toBeUndefined();
    expect(event.success, event.event_type).toBeUndefined();
  }
}

/* ------------------------------------------------------------------ *
 * Lattice bench (M13) probe + actions
 * ------------------------------------------------------------------ */

export interface PipeSeriesLike {
  status: string;
  view: string;
  phase: string;
  header: string;
  network_id: string | null;
  network_index: number | null;
  editable: boolean;
  answered: { network_id: string; answered: boolean }[];
  practice_runs: { network_id: string; runs_used: number }[];
  practice_closed: string | null;
}

export interface PipeProbeLike {
  open: boolean;
  form: string | null;
  /** True when no board can be edited (answered, read-only or a record). */
  closed: boolean;
  /** The three-network series as the bench shows it (Unit 16). */
  series: PipeSeriesLike | null;
  cells: (Rect & {
    slot: string;
    piece_id: string | null;
    rotation: number | null;
    broken: boolean;
    port: string | null;
  })[];
  bench: (Rect & {
    index: number;
    piece_id: string | null;
    type: string | null;
  })[];
  held: { piece_id: string; rotation: number; source: string } | null;
  focus: { kind: 'cell' | 'bench'; id: string } | null;
  buttons: (Rect & { id: string; label: string; enabled: boolean })[];
  feedback: string[];
  /** Every line of text currently rendered on the bench. */
  lines: string[];
  last_action: string | null;
  undo_available: boolean;
  seated_count: number;
  snap_slot: string | null;
  dragging: boolean;
  drop_target: string | null;
  drop_valid: boolean;
  help_open: boolean;
  confirm_open: boolean;
  dialog: 'stop' | 'layout' | 'cannot_solve' | null;
}

export async function pipeProbe(page: Page): Promise<PipeProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __ipPipeProbe?: PipeProbeLike | null })
        .__ipPipeProbe ?? null,
  );

  if (probe === null) {
    throw new Error('pipe probe unavailable');
  }

  return probe;
}

export async function waitPipeOpen(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __ipPipeProbe?: { open: boolean } | null })
        .__ipPipeProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(150);
}

export async function pipeCell(page: Page, slot: string) {
  const probe = await pipeProbe(page);
  const cell = probe.cells.find((candidate) => candidate.slot === slot);

  if (cell === undefined) {
    throw new Error(`pipe cell ${slot} not in probe`);
  }

  return cell;
}

export async function pipeBenchPiece(page: Page, pieceId: string) {
  const probe = await pipeProbe(page);
  const entry = probe.bench.find((candidate) => candidate.piece_id === pieceId);

  if (entry === undefined) {
    throw new Error(`piece ${pieceId} is not on the bench`);
  }

  return entry;
}

export async function pipeButton(page: Page, id: string) {
  const probe = await pipeProbe(page);
  const button = probe.buttons.find((candidate) => candidate.id === id);

  if (button === undefined) {
    throw new Error(`pipe button ${id} not present`);
  }

  return button;
}

export async function clickPipeButton(page: Page, id: string) {
  await clickRect(page, await pipeButton(page, id));
}

/** Real drag of a bench piece onto a mount. */
export async function dragPieceToCell(
  page: Page,
  pieceId: string,
  slot: string,
) {
  // Piece images sit slightly above the bench-slot centre (-4 px).
  const bench = await pipeBenchPiece(page, pieceId);
  const source = { ...bench, y: bench.y - 8, h: bench.h };

  await dragRectToRect(page, source, await pipeCell(page, slot));
}

/** Real drag of a seated piece onto another mount. */
export async function dragCellToCell(page: Page, from: string, to: string) {
  await dragRectToRect(
    page,
    await pipeCell(page, from),
    await pipeCell(page, to),
  );
}

/** Real drag of a seated piece back onto the bench area. */
export async function dragCellToBench(page: Page, slot: string) {
  const probe = await pipeProbe(page);
  const benchSlot = probe.bench[probe.bench.length - 1];

  await dragRectToRect(page, await pipeCell(page, slot), benchSlot);
}

export async function rightClickRect(page: Page, rect: Rect) {
  const point = await rectCenter(page, rect);

  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.waitForTimeout(200);
}

export async function waitCellPiece(
  page: Page,
  slot: string,
  pieceId: string | null,
  rotation?: number,
) {
  await page.waitForFunction(
    (args) => {
      const probe = (
        window as unknown as { __ipPipeProbe?: PipeProbeLike | null }
      ).__ipPipeProbe;
      const cell = probe?.cells.find(
        (candidate) => candidate.slot === args.slot,
      );

      if (cell === undefined) {
        return false;
      }

      if (cell.piece_id !== args.pieceId) {
        return false;
      }

      return args.rotation === undefined || cell.rotation === args.rotation;
    },
    { slot, pieceId, rotation },
    { timeout: 8_000 },
  );
}

/* ------------------------------------------------------------------ *
 * Lattice bench (M13) — the three-network series (Unit 16)
 * ------------------------------------------------------------------ */

export type LatticeNetworkId = 'n1' | 'n2' | 'n3';
export type LatticeLayout = Record<
  string,
  { piece_id: string; rotation: number }
>;

/** "A2:el1@270 A1:el2@90" → layout. */
export function latticeLayout(spec: string): LatticeLayout {
  return Object.fromEntries(
    spec.split(' ').map((entry) => {
      const [slot, rest] = entry.split(':');
      const [pieceId, rotation] = rest.split('@');

      return [slot, { piece_id: pieceId, rotation: Number(rotation) }];
    }),
  );
}

/**
 * One sealed layout and one layout with an open branch per network and
 * form (hand-authored; `m13_networks.spec.ts` proves them against its
 * reference checker).
 */
export const LATTICE_LAYOUTS: Record<
  'A' | 'B',
  Record<LatticeNetworkId, { sealed: string; open: string }>
> = {
  A: {
    n1: {
      sealed: 'A2:el1@270 A1:el2@90 B1:va1@0 C1:el3@180 C2:el4@0',
      open: 'A2:el1@270 A1:el2@90 B1:va1@0 C1:el3@180 C2:te1@90',
    },
    n2: {
      sealed: 'A1:el1@180 A2:st1@90 A3:el2@0 B3:va1@0 C3:el3@180',
      open: 'A1:el1@180 A2:st1@90 A3:el2@0 B3:va1@0 C3:te1@180',
    },
    n3: {
      sealed: 'A1:st1@0 B1:el1@180 B2:va1@90 B3:el2@270 A3:st2@0',
      open: 'A1:st1@0 B1:el1@180 B2:va1@90 B3:te1@0 A3:st2@0',
    },
  },
  B: {
    n1: {
      sealed: 'B1:el1@0 C1:el2@180 C2:va1@90 C3:el3@270 B3:el4@90',
      open: 'B1:el1@0 C1:el2@180 C2:va1@90 C3:el3@270 B3:te1@180',
    },
    n2: {
      sealed: 'C1:el1@270 B1:st1@180 A1:el2@90 A2:va1@90 A3:el3@270',
      open: 'C1:el1@270 B1:st1@180 A1:el2@90 A2:va1@90 A3:te1@270',
    },
    n3: {
      sealed: 'C1:st1@90 C2:el1@270 B2:va1@180 A2:el2@0 A1:st2@90',
      open: 'C1:st1@90 C2:el1@270 B2:va1@180 A2:te1@90 A1:st2@90',
    },
  },
};

/** Bench order of the standard piece set (index = bench slot). */
const LATTICE_BENCH_ORDER = [
  'st1',
  'st2',
  'el1',
  'el2',
  'el3',
  'el4',
  'te1',
  'va1',
  'cap1',
];
const LATTICE_SLOTS = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2', 'A3', 'B3', 'C3'];

/** Settle window of the commitment dialog and of the acknowledgement. */
export const LATTICE_SETTLE_MS = 400;

export async function pipeSeries(page: Page): Promise<PipeSeriesLike> {
  const series = (await pipeProbe(page)).series;

  if (series === null) {
    throw new Error('pipe series unavailable');
  }

  return series;
}

export async function waitPipeView(page: Page, view: string) {
  await page.waitForFunction(
    (expected) =>
      (window as unknown as { __ipPipeProbe?: PipeProbeLike | null })
        .__ipPipeProbe?.series?.view === expected,
    view,
    { timeout: 8_000 },
  );
}

/** Moves the keyboard focus ring to a mount or a bench slot (arrow keys). */
export async function latticeFocus(
  page: Page,
  kind: 'cell' | 'bench',
  id: string,
) {
  // Mounts (rows 0–2) and bench slots (rows 3–5) form one 3-wide column.
  const position = (focusKind: string, focusId: string) => {
    const index =
      focusKind === 'cell' ? LATTICE_SLOTS.indexOf(focusId) : Number(focusId);

    return {
      col: index % 3,
      row: Math.floor(index / 3) + (focusKind === 'cell' ? 0 : 3),
    };
  };
  const target = position(kind, id);

  for (let step = 0; step < 12; step += 1) {
    const focus = (await pipeProbe(page)).focus;

    if (focus === null) {
      throw new Error('the bench shows no board');
    }

    const current = position(focus.kind, focus.id);

    if (current.col === target.col && current.row === target.row) {
      return;
    }

    await page.keyboard.press(
      current.col < target.col
        ? 'ArrowRight'
        : current.col > target.col
          ? 'ArrowLeft'
          : current.row < target.row
            ? 'ArrowDown'
            : 'ArrowUp',
    );
    await page.waitForTimeout(70);
  }

  throw new Error(`focus never reached ${kind} ${id}`);
}

/** Seats a layout with the keyboard alone (arrows, SPACE, R). */
export async function seatLatticeByKeyboard(page: Page, layout: LatticeLayout) {
  for (const [slot, piece] of Object.entries(layout)) {
    await latticeFocus(
      page,
      'bench',
      String(LATTICE_BENCH_ORDER.indexOf(piece.piece_id)),
    );
    await page.keyboard.press('Space');
    await page.waitForTimeout(70);

    for (let turns = piece.rotation / 90; turns > 0; turns -= 1) {
      await page.keyboard.press('r');
      await page.waitForTimeout(70);
    }

    await latticeFocus(page, 'cell', slot);
    await page.keyboard.press('Space');
    await waitCellPiece(page, slot, piece.piece_id, piece.rotation);
  }
}

/** Seats a layout with the pointer alone (drag, right-click to turn). */
export async function seatLatticeByPointer(page: Page, layout: LatticeLayout) {
  for (const [slot, piece] of Object.entries(layout)) {
    await dragPieceToCell(page, piece.piece_id, slot);
    await waitCellPiece(page, slot, piece.piece_id, 0);

    for (let turns = piece.rotation / 90; turns > 0; turns -= 1) {
      await rightClickRect(page, await pipeCell(page, slot));
    }

    await waitCellPiece(page, slot, piece.piece_id, piece.rotation);
  }
}

async function waitPipeDialog(page: Page, dialog: string | null) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __ipPipeProbe?: PipeProbeLike | null })
        .__ipPipeProbe?.dialog ?? null) === expected,
    dialog,
    { timeout: 8_000 },
  );
}

/**
 * Records the open network's first response by keyboard: T (layout) or N
 * (CANNOT SOLVE), then a fresh ENTER after the settle window.
 */
export async function commitLatticeByKeyboard(
  page: Page,
  kind: 'layout' | 'cannot_solve' = 'layout',
) {
  await page.keyboard.press(kind === 'layout' ? 't' : 'n');
  await waitPipeDialog(page, kind);
  await page.waitForTimeout(LATTICE_SETTLE_MS + 120);
  await page.keyboard.press('Enter');
  await waitPipeView(page, 'acknowledgement');
}

/** The same commitment with the pointer alone. */
export async function commitLatticeByPointer(
  page: Page,
  kind: 'layout' | 'cannot_solve' = 'layout',
) {
  await clickPipeButton(
    page,
    kind === 'layout' ? 'record_layout' : 'cannot_solve',
  );
  await waitPipeDialog(page, kind);
  await page.waitForTimeout(LATTICE_SETTLE_MS + 120);
  await clickPipeButton(page, 'confirm_commit');
  await waitPipeView(page, 'acknowledgement');
}

/** NEXT NETWORK / SHOW RESULTS after the acknowledgement has settled. */
export async function latticeNext(
  page: Page,
  input: 'keyboard' | 'pointer' = 'keyboard',
) {
  await page.waitForTimeout(LATTICE_SETTLE_MS + 120);

  if (input === 'keyboard') {
    await page.keyboard.press('Enter');
  } else {
    await clickPipeButton(page, 'next');
  }

  await page.waitForFunction(
    () =>
      (window as unknown as { __ipPipeProbe?: PipeProbeLike | null })
        .__ipPipeProbe?.series?.view !== 'acknowledgement',
    undefined,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(120);
}

/**
 * Answers the three networks in order by keyboard and stops on the third
 * acknowledgement (SHOW RESULTS not yet pressed).
 */
export async function completeLatticeByKeyboard(
  page: Page,
  form: 'A' | 'B',
  answers: readonly ('sealed' | 'open' | 'cannot_solve' | 'empty')[],
) {
  const ids: LatticeNetworkId[] = ['n1', 'n2', 'n3'];

  for (const [index, answer] of answers.entries()) {
    await waitPipeView(page, 'network');

    if (answer === 'sealed' || answer === 'open') {
      await seatLatticeByKeyboard(
        page,
        latticeLayout(LATTICE_LAYOUTS[form][ids[index]][answer]),
      );
    }

    await commitLatticeByKeyboard(
      page,
      answer === 'cannot_solve' ? 'cannot_solve' : 'layout',
    );

    if (index < answers.length - 1) {
      await latticeNext(page);
    }
  }
}

/** STOP TASK by keyboard (Q, then ENTER on the confirmation). */
export async function stopLatticeByKeyboard(page: Page) {
  await page.keyboard.press('q');
  await waitPipeDialog(page, 'stop');
  await page.keyboard.press('Enter');
  await waitPipeView(page, 'record');
}

/* ------------------------------------------------------------------ *
 * Diagnosis console (M18) probe + actions
 * ------------------------------------------------------------------ */

export interface DiagnosisProbeLike {
  open: boolean;
  form: string | null;
  closed: boolean;
  panels: (Rect & { id: string; viewed: boolean })[];
  tests: (Rect & { id: string; runs: number; run_button: Rect })[];
  hypotheses: (Rect & {
    id: string;
    selected: boolean;
    rejected: boolean;
    select: Rect;
    reject: Rect;
  })[];
  buttons: (Rect & { id: string; label: string; enabled: boolean })[];
  zones: (Rect & { id: string })[];
  detail_title: string | null;
  detail_lines: string[];
  feedback: string[];
  focus: string | null;
  submit_enabled: boolean;
  help_open: boolean;
  rules_open: boolean;
  confirm_open: boolean;
  dragging: boolean;
}

export async function diagnosisProbe(page: Page): Promise<DiagnosisProbeLike> {
  const probe = await page.evaluate(
    () =>
      (window as unknown as { __ipDiagnosisProbe?: DiagnosisProbeLike | null })
        .__ipDiagnosisProbe ?? null,
  );

  if (probe === null) {
    throw new Error('diagnosis probe unavailable');
  }

  return probe;
}

export async function waitDiagnosisOpen(page: Page, open: boolean) {
  await page.waitForFunction(
    (expected) =>
      ((window as unknown as { __ipDiagnosisProbe?: { open: boolean } | null })
        .__ipDiagnosisProbe?.open ?? false) === expected,
    open,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(150);
}

export async function clickDiagnosisPanel(page: Page, id: string) {
  const probe = await diagnosisProbe(page);
  const panel = probe.panels.find((candidate) => candidate.id === id);

  if (panel === undefined) {
    throw new Error(`panel ${id} not present`);
  }

  await clickRect(page, panel);
}

export async function clickDiagnosisRun(page: Page, id: string) {
  const probe = await diagnosisProbe(page);
  const test = probe.tests.find((candidate) => candidate.id === id);

  if (test === undefined) {
    throw new Error(`test ${id} not present`);
  }

  await clickRect(page, test.run_button);
}

export async function clickHypothesis(
  page: Page,
  id: string,
  control: 'select' | 'reject' | 'card',
) {
  const probe = await diagnosisProbe(page);
  const hypothesis = probe.hypotheses.find((candidate) => candidate.id === id);

  if (hypothesis === undefined) {
    throw new Error(`hypothesis ${id} not present`);
  }

  await clickRect(
    page,
    control === 'select'
      ? hypothesis.select
      : control === 'reject'
        ? hypothesis.reject
        : { x: hypothesis.x, y: hypothesis.y, w: hypothesis.w, h: 18 },
  );
}

export async function clickDiagnosisButton(page: Page, id: string) {
  const probe = await diagnosisProbe(page);
  const button = probe.buttons.find((candidate) => candidate.id === id);

  if (button === undefined) {
    throw new Error(`diagnosis button ${id} not present`);
  }

  await clickRect(page, button);
}
