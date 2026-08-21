/**
 * Information Processing foundation — shared domain model.
 *
 * Pure types only (no Phaser, no runtime imports). Every M13–M18 module
 * and the common terminal tutorial build on these shapes; the overlay
 * scenes are presentation adapters over them.
 *
 * SCIENTIFIC BOUNDARY: everything in this subsystem is PROVISIONAL
 * `proto_*` measurement design. Nothing here is an approved event name,
 * derived variable, weight or score. Raw observables are recorded per
 * module; interpretation belongs to the research owner.
 */

/** How a semantic action reached the engine (contextual data only). */
export type InputMode = 'pointer' | 'typed';

/**
 * Window lifecycle of one opportunity. `open` may be left and re-entered
 * (the overlay closes, the window stays open); every other state is
 * terminal for the window.
 */
export type WindowStatus =
  | 'unopened'
  | 'open'
  | 'completed'
  | 'exited'
  | 'exhausted'
  | 'technical_failure'
  | 'censored';

/** Parallel-form identifier (equivalent forms, deterministic per session). */
export type FormId = 'A' | 'B';

/**
 * One semantic command — the single internal representation that BOTH
 * input modes compile into. `verb` and every argument are canonical
 * upper-case tokens.
 */
export interface SemanticCommand {
  verb: string;
  args: readonly string[];
}

/**
 * Argument slot of a verb. `kind` names a value set in the command
 * context (e.g. 'fragment', 'destination'); `distinct` forbids repeating
 * the same value across arguments of that kind inside one command.
 */
export interface ArgSpec {
  kind: string;
  label: string;
  distinct?: boolean;
}

export interface VerbSpec {
  verb: string;
  args: readonly ArgSpec[];
  /** One-line plain-language summary shown in the palette/help. */
  summary: string;
}

/** A bounded command grammar (never free-form programming). */
export interface GrammarSpec {
  id: string;
  verbs: readonly VerbSpec[];
}

/** Valid values per argument kind for the current task state. */
export interface CommandContext {
  sets: Record<string, readonly string[]>;
}

export type CommandError =
  | 'empty'
  | 'unknown_verb'
  | 'missing_argument'
  | 'extra_argument'
  | 'unknown_argument'
  | 'duplicate_argument';

export type ParseResult =
  | { ok: true; command: SemanticCommand }
  | { ok: false; error: CommandError; detail: string };

/** One line of the ordered program buffer. */
export interface ProgramLine {
  line_id: string;
  command: SemanticCommand;
  input_mode: InputMode;
  seq: number;
}

export interface ProgramState {
  lines: ProgramLine[];
  next_seq: number;
}

export type ProgramFailure = CommandError | 'bad_index' | 'buffer_full';

export type ProgramResult =
  | { ok: true; detail?: Record<string, unknown> }
  | { ok: false; reason: ProgramFailure; detail: string };

export interface ProgramOutcome {
  state: ProgramState;
  result: ProgramResult;
}

export interface ProgramSnapshotV1 {
  version: 1;
  lines: ProgramLine[];
  next_seq: number;
}

/** A signal fragment / packet / report in the incoming panel. */
export interface Fragment {
  id: string;
  /** Channel or origin tag (ALPHA/BETA/GAMMA, NORTH/SOUTH…). */
  channel: string;
  /** Short visible payload (code, reading, text). */
  payload: string;
  /** Optional visible flags (URGENT, CRITICAL, checksum marks…). */
  flags?: readonly string[];
  /** Optional link key used by pairing/ordering rules. */
  key?: string;
}

/* ------------------------------------------------------------------ *
 * Terminal presentation contract (adapter pattern)
 * ------------------------------------------------------------------ */

export type ChipTone = 'alpha' | 'beta' | 'gamma' | 'neutral' | 'accent';

export interface TerminalChip {
  id: string;
  label: string;
  sub?: string;
  tone: ChipTone;
  /** Visual state badge — never evaluative. */
  state: 'pending' | 'handled' | 'flagged';
}

export interface TerminalBin {
  id: string;
  label: string;
}

export interface TerminalPanelText {
  title: string;
  lines: readonly string[];
}

export interface TerminalPrimaryAction {
  id: string;
  label: string;
  kind: 'accent' | 'plain';
}

/** Everything the terminal scene needs to render one frame. */
export interface TerminalView {
  title: string;
  stageLabel: string;
  instructions: readonly string[];
  incomingTitle: string;
  chips: readonly TerminalChip[];
  bins: readonly TerminalBin[];
  /** Palette token groups: verbs first, then argument tokens. */
  palette: readonly { group: string; values: readonly string[] }[];
  codebook: readonly TerminalPanelText[];
  outputTitle: string;
  output: readonly string[];
  buffer: readonly { text: string; input_mode: InputMode }[];
  consoleLines: readonly string[];
  /** Stage-advancing action shown beside SUBMIT (READY, NEXT TRIAL…). */
  primaryAction: TerminalPrimaryAction | null;
  submitEnabled: boolean;
  /** Verb composed by dragging a chip onto a bin (null = not allowed). */
  chipDropVerb: string | null;
  /** Verb composed by dragging a chip onto another chip (null = none). */
  chipPairVerb: string | null;
  /** Editing the buffer is allowed in the current stage. */
  editing: boolean;
  /** The window is terminally closed (read-only record view). */
  closed: boolean;
}

export interface TerminalActionResult {
  ok: boolean;
  message: string;
}

/**
 * The seam between a measurement module and the reusable terminal
 * scene. Every method is a semantic action; the scene never reaches
 * into module state directly and never holds its own copy of it.
 */
export interface TerminalTaskAdapter {
  id: string;
  grammar(): GrammarSpec;
  context(): CommandContext;
  view(): TerminalView;
  /** Overlay opened / closed (active-time bookkeeping). */
  open(nowMs: number): void;
  leave(nowMs: number): void;
  append(
    command: SemanticCommand,
    mode: InputMode,
    nowMs: number,
  ): TerminalActionResult;
  remove(index: number, mode: InputMode, nowMs: number): TerminalActionResult;
  clear(mode: InputMode, nowMs: number): TerminalActionResult;
  submit(mode: InputMode, nowMs: number): TerminalActionResult;
  primary(
    actionId: string,
    mode: InputMode,
    nowMs: number,
  ): TerminalActionResult;
  help(mode: InputMode, nowMs: number): readonly string[];
  /** Explicit "stop task" (window closes as `exited`). */
  stop(nowMs: number): void;
  /** Technical interruption (window closes as `technical_failure`). */
  fail(nowMs: number, detail: string): void;
  probe(): Record<string, unknown>;
}
