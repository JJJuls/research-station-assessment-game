/**
 * Command grammar + parser (Information Processing foundation).
 *
 * The ONE validation path for every semantic command. Typed text is
 * tokenised and handed to `validateCommand`; pointer composition (chips,
 * drag/drop) builds the same raw `{verb, args}` and hands it to the same
 * `validateCommand`. Both modes therefore produce byte-identical
 * SemanticCommand objects for the same intent — the equivalence tests
 * assert exactly this.
 *
 * Grammars are bounded vocabularies; there is no free-form programming.
 */

import type {
  CommandContext,
  CommandError,
  GrammarSpec,
  ParseResult,
  SemanticCommand,
  VerbSpec,
} from './model';

/** Canonical token form: trimmed, upper-case. */
export function normalizeToken(token: string): string {
  return token.trim().toUpperCase();
}

/** Splits typed text on whitespace and commas into raw tokens. */
export function tokenizeCommandText(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function findVerb(
  grammar: GrammarSpec,
  verb: string,
): VerbSpec | undefined {
  const wanted = normalizeToken(verb);

  return grammar.verbs.find((spec) => spec.verb === wanted);
}

function fail(error: CommandError, detail: string): ParseResult {
  return { ok: false, error, detail };
}

/**
 * Validates a raw command against the grammar and the current context.
 * Returns the canonical command (upper-case verb and arguments) or a
 * typed error with a neutral, participant-readable detail.
 */
export function validateCommand(
  grammar: GrammarSpec,
  context: CommandContext,
  raw: { verb: string; args: readonly string[] },
): ParseResult {
  const verb = normalizeToken(raw.verb);

  if (verb.length === 0) {
    return fail('empty', 'No command entered.');
  }

  const spec = findVerb(grammar, verb);

  if (spec === undefined) {
    return fail('unknown_verb', `${verb} is not a command in this protocol.`);
  }

  const args = raw.args.map(normalizeToken).filter((arg) => arg.length > 0);

  if (args.length < spec.args.length) {
    const missing = spec.args[args.length];

    return fail(
      'missing_argument',
      `${spec.verb} needs ${spec.args.length} argument${
        spec.args.length === 1 ? '' : 's'
      }: ${spec.args.map((a) => `<${a.label}>`).join(' ')} — missing <${missing.label}>.`,
    );
  }

  if (args.length > spec.args.length) {
    return fail(
      'extra_argument',
      `${spec.verb} takes ${spec.args.length} argument${
        spec.args.length === 1 ? '' : 's'
      }: ${spec.args.map((a) => `<${a.label}>`).join(' ')}.`,
    );
  }

  const seenByKind = new Map<string, Set<string>>();

  for (let index = 0; index < spec.args.length; index++) {
    const argSpec = spec.args[index];
    const value = args[index];
    const allowed = context.sets[argSpec.kind] ?? [];

    if (!allowed.includes(value)) {
      return fail(
        'unknown_argument',
        `${value} is not a valid <${argSpec.label}> here.`,
      );
    }

    if (argSpec.distinct === true) {
      const seen = seenByKind.get(argSpec.kind) ?? new Set<string>();

      if (seen.has(value)) {
        return fail(
          'duplicate_argument',
          `${spec.verb} needs two different <${argSpec.label}> values.`,
        );
      }

      seen.add(value);
      seenByKind.set(argSpec.kind, seen);
    }
  }

  return { ok: true, command: { verb: spec.verb, args } };
}

/** Typed-text entry point: tokenise, then the shared validation. */
export function parseCommandText(
  grammar: GrammarSpec,
  context: CommandContext,
  text: string,
): ParseResult {
  const tokens = tokenizeCommandText(text);

  if (tokens.length === 0) {
    return fail('empty', 'No command entered.');
  }

  const [verb, ...args] = tokens;

  return validateCommand(grammar, context, { verb, args });
}

/** Pointer-composition entry point: identical validation path. */
export function composeCommand(
  grammar: GrammarSpec,
  context: CommandContext,
  verb: string,
  args: readonly string[],
): ParseResult {
  return validateCommand(grammar, context, { verb, args });
}

/** Canonical display/serialisation form (`ROUTE P3 RELAY`). */
export function commandToText(command: SemanticCommand): string {
  return [command.verb, ...command.args].join(' ');
}

export function commandsEqual(a: SemanticCommand, b: SemanticCommand): boolean {
  return (
    a.verb === b.verb &&
    a.args.length === b.args.length &&
    a.args.every((arg, index) => arg === b.args[index])
  );
}

/** All palette tokens a grammar + context can produce (for the UI). */
export function paletteFor(
  grammar: GrammarSpec,
  context: CommandContext,
  kindLabels: Record<string, string>,
): { group: string; values: readonly string[] }[] {
  const groups: { group: string; values: readonly string[] }[] = [
    { group: 'COMMANDS', values: grammar.verbs.map((spec) => spec.verb) },
  ];
  const kinds = new Set<string>();

  for (const spec of grammar.verbs) {
    for (const arg of spec.args) {
      kinds.add(arg.kind);
    }
  }

  // Only kinds given a label appear as palette tokens; kinds that are
  // already visible as incoming chips (fragments) are left out.
  for (const kind of kinds) {
    const label = kindLabels[kind];
    const values = context.sets[kind] ?? [];

    if (label !== undefined && values.length > 0) {
      groups.push({ group: label, values });
    }
  }

  return groups;
}
