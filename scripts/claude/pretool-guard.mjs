#!/usr/bin/env node
/**
 * Deterministic Claude Code PreToolUse guard.
 *
 * Reads a PreToolUse hook payload as JSON on stdin and decides whether the
 * Claude-initiated tool call may proceed. The guard is intentionally
 * conservative, side-effect free and fully unit-testable: every decision is a
 * pure function of the payload plus two environment variables.
 *
 * Exit behaviour (Claude Code hook contract):
 *   0 - allow (nothing written to stderr)
 *   2 - block; stderr is fed back to Claude as the reason
 *   1 - non-blocking error (payload could not be evaluated)
 *
 * Environment:
 *   CLAUDE_PROJECT_DIR    repository root used for path normalisation
 *   CLAUDE_UNIT_ALLOWLIST optional per-unit allowlist. Newline-, comma- or
 *                         semicolon-separated repo-relative paths. A trailing
 *                         "/**" makes an entry a directory prefix. When unset,
 *                         only the permanent immutable/protected rules apply.
 *
 * Privacy: the guard never echoes file contents, environment contents,
 * authorization headers or full command lines. Block reasons name the rule and
 * at most the offending subcommand/flag or repo-relative path.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ------------------------------------------------------------------ *
 * Path normalisation
 * ------------------------------------------------------------------ */

/**
 * Canonicalise a path to lower-cased-drive POSIX form, resolving "." and "..".
 * Handles Windows backslash paths, "C:/..." paths and Git-Bash "/c/..." paths.
 * @param {string} input
 * @returns {string}
 */
export function canonicalPath(input) {
  if (input === undefined || input === null) return '';
  let s = String(input).trim().replace(/\\/g, '/');
  if (s === '') return '';

  // Strip surrounding quotes a shell would have removed.
  s = s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

  let prefix = '';
  // Git-Bash / MSYS drive form: /c/Users -> c:/Users
  const msys = /^\/([a-zA-Z])(\/|$)/.exec(s);
  if (msys) {
    prefix = `${msys[1].toLowerCase()}:/`;
    s = s.slice(msys[0].length);
  } else {
    // Windows drive form: C:/Users -> c:/Users
    const drive = /^([a-zA-Z]):\/?/.exec(s);
    if (drive) {
      prefix = `${drive[1].toLowerCase()}:/`;
      s = s.slice(drive[0].length);
    } else if (s.startsWith('/')) {
      prefix = '/';
      s = s.slice(1);
    }
  }

  const out = [];
  for (const part of s.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (prefix === '') out.push('..');
      continue;
    }
    out.push(part);
  }
  return prefix + out.join('/');
}

/**
 * Express a path relative to the repository root when it lives inside it.
 * @param {string} target
 * @param {string} repoRoot
 * @returns {{ relative: string|null, canonical: string, inside: boolean }}
 */
export function toRepoRelative(target, repoRoot) {
  const canonicalTarget = canonicalPath(target);
  const canonicalRoot = canonicalPath(repoRoot);
  const isAbsolute = /^([a-z]:\/|\/)/.test(canonicalTarget);

  if (!isAbsolute) {
    return {
      relative: canonicalTarget,
      canonical: canonicalTarget,
      inside: true,
    };
  }
  if (canonicalRoot === '') {
    return { relative: null, canonical: canonicalTarget, inside: false };
  }
  const root = canonicalRoot.endsWith('/')
    ? canonicalRoot
    : `${canonicalRoot}/`;
  const lowerTarget = canonicalTarget.toLowerCase();
  const lowerRoot = root.toLowerCase();
  if (lowerTarget === lowerRoot.slice(0, -1)) {
    return { relative: '', canonical: canonicalTarget, inside: true };
  }
  if (lowerTarget.startsWith(lowerRoot)) {
    return {
      relative: canonicalTarget.slice(root.length),
      canonical: canonicalTarget,
      inside: true,
    };
  }
  return { relative: null, canonical: canonicalTarget, inside: false };
}

/* ------------------------------------------------------------------ *
 * File-write policy
 * ------------------------------------------------------------------ */

/** Never writable by Claude in any unit: research-owner-owned material. */
export const IMMUTABLE_PATTERNS = [
  {
    rule: 'immutable scientific ruling',
    test: (p) => /(^|\/)04_global_scientific_ruling_verbatim\.txt$/i.test(p),
  },
  {
    rule: 'scientific specification tree',
    test: (p) => p.toLowerCase().startsWith('docs/scientific/'),
  },
  {
    rule: 'research event-schema / scoring-plan tree',
    test: (p) => p.toLowerCase().startsWith('docs/research/'),
  },
  {
    rule: 'decision-record tree',
    test: (p) => p.toLowerCase().startsWith('docs/decisions/'),
  },
  {
    rule: 'canonical build contract',
    test: (p) =>
      /^docs\/ai\/fable-claude-final-game-build-contract-v3\.txt$/i.test(p),
  },
  {
    rule: 'scientific authority register',
    test: (p) =>
      /^docs\/ai\/scientific-authority-and-open-decisions\.md$/i.test(p),
  },
];

/** Never writable by Claude in any unit: operational / generated / user-owned. */
export const PROTECTED_PATTERNS = [
  {
    rule: 'package manifest or lockfile',
    test: (p) =>
      /^(package(-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(
        p,
      ),
  },
  {
    rule: 'typescript configuration',
    test: (p) => /^tsconfig(\.[\w.-]+)?\.json$/i.test(p),
  },
  {
    rule: 'build/test tool configuration',
    test: (p) => /^(vite|playwright|eslint|vitest)\.config\.[\w]+$/i.test(p),
  },
  {
    rule: 'lint/commit tooling configuration',
    test: (p) =>
      /^\.(commitlintrc|lintstagedrc|prettierrc|nvmrc|editorconfig)/i.test(p),
  },
  {
    rule: 'git hook definition',
    test: (p) => p.toLowerCase().startsWith('.husky/'),
  },
  {
    rule: 'MCP configuration',
    test: (p) => /(^|\/)\.mcp\.json$/i.test(p) || /(^|\/)mcp\.json$/i.test(p),
  },
  {
    rule: 'local Claude settings (user-owned)',
    test: (p) => /(^|\/)settings\.local\.json$/i.test(p),
  },
  { rule: 'environment file', test: (p) => /(^|\/)\.env(\.|$)/i.test(p) },
  { rule: 'git internals', test: (p) => p.toLowerCase().startsWith('.git/') },
  {
    rule: 'installed dependencies',
    test: (p) => p.toLowerCase().startsWith('node_modules/'),
  },
  { rule: 'build output', test: (p) => p.toLowerCase().startsWith('dist/') },
  {
    rule: 'test runner output',
    test: (p) =>
      /^(test-results|playwright-report|\.playwright-mcp)\//i.test(p),
  },
  {
    rule: 'PixelLab candidate assets',
    test: (p) => p.toLowerCase().startsWith('asset-candidates/'),
  },
  {
    rule: 'user-owned FABLE unit document',
    test: (p) => /^fable-[\w.-]+\.(md|txt)$/i.test(p),
  },
  {
    rule: 'user-owned project document',
    test: (p) => /^(agents\.md|project_spec\.md|license)$/i.test(p),
  },
];

/**
 * Parse the per-unit allowlist environment variable.
 * @param {string|undefined} raw
 * @returns {string[]|null} null when no allowlist was supplied
 */
export function parseAllowlist(raw) {
  if (raw === undefined || raw === null) return null;
  const entries = String(raw)
    .split(/[\n,;]+/)
    .map((e) => canonicalPath(e))
    .filter((e) => e !== '');
  return entries.length > 0 ? entries : null;
}

/**
 * @param {string} relative repo-relative POSIX path
 * @param {string[]} allowlist
 */
export function matchesAllowlist(relative, allowlist) {
  const target = relative.toLowerCase();
  return allowlist.some((entry) => {
    const e = entry.toLowerCase();
    if (e.endsWith('/**')) return target.startsWith(e.slice(0, -2));
    if (e.endsWith('/')) return target.startsWith(e);
    return target === e;
  });
}

/**
 * Decide whether Claude may write to a path.
 * @param {string} filePath
 * @param {{ repoRoot: string, allowlist: string[]|null }} ctx
 * @returns {{ allow: boolean, reason?: string }}
 */
export function checkFilePath(filePath, ctx) {
  if (!filePath) return { allow: true };
  const { relative, inside } = toRepoRelative(filePath, ctx.repoRoot);

  if (!inside || relative === null) {
    return {
      allow: false,
      reason:
        'Blocked: write target resolves outside the repository root. Units may only modify files inside the active worktree.',
    };
  }
  if (relative === '') {
    return {
      allow: false,
      reason: 'Blocked: write target resolves to the repository root itself.',
    };
  }

  for (const { rule, test } of IMMUTABLE_PATTERNS) {
    if (test(relative)) {
      return {
        allow: false,
        reason: `Blocked (immutable): "${relative}" is research-owner-owned material (${rule}). Claude never edits it; route the change to the research owner.`,
      };
    }
  }
  for (const { rule, test } of PROTECTED_PATTERNS) {
    if (test(relative)) {
      return {
        allow: false,
        reason: `Blocked (protected): "${relative}" is a protected operational file (${rule}). A human must change it deliberately.`,
      };
    }
  }
  if (ctx.allowlist && !matchesAllowlist(relative, ctx.allowlist)) {
    return {
      allow: false,
      reason: `Blocked (allowlist): "${relative}" is outside the active unit allowlist. Stop and report the scope gap instead of expanding it.`,
    };
  }
  return { allow: true };
}

/* ------------------------------------------------------------------ *
 * Shell-command policy
 * ------------------------------------------------------------------ */

/**
 * Split a shell command into independently-evaluated segments, including the
 * contents of command substitutions.
 * @param {string} command
 * @returns {string[]}
 */
export function splitCommandSegments(command) {
  const source = String(command ?? '');
  const segments = [];
  let current = '';
  let quote = null;
  const substitutions = [];

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    // Single quotes suppress expansion entirely; double quotes still expand
    // $(...) and `...`, so those substitutions must still be scanned.
    if (quote === "'") {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (quote === '"' && ch !== '$' && ch !== '`') {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (!quote && (ch === '"' || ch === "'")) {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '$' && next === '(') {
      let depth = 1;
      let j = i + 2;
      let inner = '';
      while (j < source.length && depth > 0) {
        if (source[j] === '(') depth += 1;
        else if (source[j] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
        inner += source[j];
        j += 1;
      }
      substitutions.push(inner);
      i = j;
      current += ' ';
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      let inner = '';
      while (j < source.length && source[j] !== '`') {
        inner += source[j];
        j += 1;
      }
      substitutions.push(inner);
      i = j;
      current += ' ';
      continue;
    }
    if (ch === '\n' || ch === ';') {
      segments.push(current);
      current = '';
      continue;
    }
    if ((ch === '&' || ch === '|') && next === ch) {
      segments.push(current);
      current = '';
      i += 1;
      continue;
    }
    if (ch === '|' || ch === '&') {
      segments.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  segments.push(current);

  for (const inner of substitutions)
    segments.push(...splitCommandSegments(inner));
  return segments.map((s) => s.trim()).filter((s) => s !== '');
}

/**
 * Tokenise one command segment, honouring quotes and dropping leading
 * environment-variable assignments.
 * @param {string} segment
 * @returns {string[]}
 */
export function tokenize(segment) {
  const tokens = [];
  let current = '';
  let quote = null;
  let started = false;

  for (const ch of String(segment)) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      started = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
      continue;
    }
    current += ch;
    started = true;
  }
  if (started) tokens.push(current);

  while (tokens.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]))
    tokens.shift();
  if (tokens.length > 0 && /^(env|command|nohup|time)$/.test(tokens[0]))
    tokens.shift();
  return tokens;
}

/** Reduce an executable token to its bare program name. */
function programName(token) {
  const base = canonicalPath(token).split('/').pop() ?? '';
  return base.replace(/\.(exe|cmd|bat|ps1)$/i, '').toLowerCase();
}

/** Skip git's global options to find the subcommand and its arguments. */
function gitSubcommand(tokens) {
  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === '-C' || t === '-c' || t === '--namespace') {
      i += 2;
      continue;
    }
    if (
      t.startsWith('--git-dir') ||
      t.startsWith('--work-tree') ||
      t.startsWith('--exec-path')
    ) {
      i += t.includes('=') ? 1 : 2;
      continue;
    }
    if (t.startsWith('-')) {
      i += 1;
      continue;
    }
    return { name: t.toLowerCase(), args: tokens.slice(i + 1) };
  }
  return { name: '', args: [] };
}

const BROAD_PATHSPECS = new Set([
  '.',
  './',
  '-A',
  '--all',
  '-u',
  '--update',
  ':/',
  '*',
  './*',
  '..',
  '*.*',
]);
const GIT_TAG_READ_FLAGS =
  /^(-l|--list|-n\d*|--contains|--no-contains|--points-at|--sort=.*|--format=.*|--merged|--no-merged|--column|-i|--ignore-case)$/;
const DEPLOY_PROGRAMS = new Set([
  'vercel',
  'netlify',
  'surge',
  'now',
  'wrangler',
  'firebase',
  'sls',
  'serverless',
  'heroku',
  'flyctl',
  'fly',
  'eb',
  'gcloud',
  'az',
  'aws',
  'kubectl',
  'helm',
  'terraform',
  'ansible',
]);
const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx']);
const MUTATING_PACKAGE_SUBCOMMANDS = new Set([
  'install',
  'i',
  'ci',
  'add',
  'remove',
  'rm',
  'uninstall',
  'un',
  'update',
  'up',
  'upgrade',
  'publish',
  'link',
  'unlink',
  'dedupe',
  'audit',
  'pkg',
  'version',
  'deprecate',
  'unpublish',
  'dist-tag',
  'owner',
  'token',
  'adduser',
  'login',
  'logout',
]);
const GH_READ_SUBCOMMANDS = new Set([
  'view',
  'list',
  'status',
  'diff',
  'checks',
  'ls',
]);

/**
 * Evaluate a single already-split command segment.
 * @param {string} segment
 * @returns {{ allow: boolean, reason?: string }}
 */
export function checkCommandSegment(segment) {
  const tokens = tokenize(segment);
  if (tokens.length === 0) return { allow: true };
  const program = programName(tokens[0]);

  /* ---------------- git ---------------- */
  if (program === 'git') {
    const { name, args } = gitSubcommand(tokens);
    const flags = args.filter((a) => a.startsWith('-'));
    const has = (...names) => names.some((n) => args.includes(n));

    switch (name) {
      case 'push':
        return {
          allow: false,
          reason:
            'Blocked: `git push` is a human-only operation. Stop after the local commit and hand off.',
        };
      case 'merge':
      case 'rebase':
      case 'cherry-pick':
        return {
          allow: false,
          reason: `Blocked: \`git ${name}\` rewrites or integrates history. Integration is a human-only operation.`,
        };
      case 'tag': {
        const nonReadFlag = flags.find((f) => !GIT_TAG_READ_FLAGS.test(f));
        // Positional arguments create a tag unless an explicit listing flag is
        // present, in which case they are shell patterns for `git tag -l`.
        const listing = flags.some((f) => /^(-l|--list|-n\d*)$/.test(f));
        const creates = !listing && args.some((a) => !a.startsWith('-'));
        if (nonReadFlag || creates) {
          return {
            allow: false,
            reason:
              'Blocked: creating or deleting a git tag is a human-only operation. `git tag --list` is allowed.',
          };
        }
        return { allow: true };
      }
      case 'worktree': {
        const sub = (args.find((a) => !a.startsWith('-')) ?? '').toLowerCase();
        if (['remove', 'prune', 'move', 'repair', 'unlock'].includes(sub)) {
          return {
            allow: false,
            reason: `Blocked: \`git worktree ${sub}\` removes or relocates an isolated unit workspace. Only a human does that.`,
          };
        }
        return { allow: true };
      }
      case 'branch':
        if (
          has('-d', '-D', '--delete', '-m', '-M', '--move', '-f', '--force')
        ) {
          return {
            allow: false,
            reason:
              'Blocked: deleting, renaming or force-updating a branch is a human-only operation.',
          };
        }
        return { allow: true };
      case 'reset':
        if (has('--hard', '--merge', '--keep')) {
          return {
            allow: false,
            reason:
              'Blocked: `git reset --hard` (and --merge/--keep) discards working-tree state.',
          };
        }
        return { allow: true };
      case 'clean':
        return {
          allow: false,
          reason:
            'Blocked: `git clean` deletes untracked files, including operational files this unit must preserve.',
        };
      case 'add': {
        const broad = args.find((a) => BROAD_PATHSPECS.has(a));
        if (broad) {
          return {
            allow: false,
            reason: `Blocked: \`git add ${broad}\` stages broadly. Stage each allowlisted file by explicit name.`,
          };
        }
        if (args.length === 0) return { allow: true };
        return { allow: true };
      }
      case 'commit':
        if (
          has('-a', '--all') ||
          flags.some((f) => /^-[a-zA-Z]*a[a-zA-Z]*$/.test(f))
        ) {
          return {
            allow: false,
            reason:
              'Blocked: `git commit -a` stages every tracked modification. Stage allowlisted files by explicit name first.',
          };
        }
        if (flags.some((f) => /^(--no-verify|-n|--no-gpg-sign)$/.test(f))) {
          return {
            allow: false,
            reason: 'Blocked: commit hooks and signing must not be bypassed.',
          };
        }
        return { allow: true };
      case 'checkout':
      case 'restore':
        if (args.some((a) => BROAD_PATHSPECS.has(a))) {
          return {
            allow: false,
            reason: `Blocked: \`git ${name} .\` discards uncommitted work across the tree.`,
          };
        }
        return { allow: true };
      case 'rm':
        if (
          has('-r', '-R', '--recursive') ||
          args.some((a) => BROAD_PATHSPECS.has(a))
        ) {
          return {
            allow: false,
            reason:
              'Blocked: recursive or broad `git rm` deletes tracked files in bulk.',
          };
        }
        return { allow: true };
      case 'config':
        if (
          !flags.some((f) =>
            /^(--get|--get-all|--get-regexp|--list|-l)$/.test(f),
          )
        ) {
          return {
            allow: false,
            reason:
              'Blocked: git configuration must never be modified by Claude. Read-only `git config --get/--list` is allowed.',
          };
        }
        return { allow: true };
      case 'filter-branch':
      case 'filter-repo':
        return {
          allow: false,
          reason: `Blocked: \`git ${name}\` rewrites repository history.`,
        };
      case 'update-ref':
        if (has('-d', '--delete'))
          return {
            allow: false,
            reason: 'Blocked: `git update-ref -d` deletes a ref.',
          };
        return { allow: true };
      case 'gc':
        if (has('--prune', '--aggressive'))
          return {
            allow: false,
            reason:
              'Blocked: pruning object storage is a human-only maintenance action.',
          };
        return { allow: true };
      case 'stash':
        if (
          args.some((a) => ['drop', 'clear', 'pop'].includes(a.toLowerCase()))
        ) {
          return {
            allow: false,
            reason:
              'Blocked: dropping or clearing stashes destroys uncommitted work.',
          };
        }
        return { allow: true };
      default:
        return { allow: true };
    }
  }

  /* ---------------- gh (publication surface) ---------------- */
  if (program === 'gh') {
    const positional = tokens.slice(1).filter((t) => !t.startsWith('-'));
    const sub = (positional[1] ?? '').toLowerCase();
    const group = (positional[0] ?? '').toLowerCase();
    if (group === 'api') {
      const methodIdx = tokens.findIndex((t) => t === '-X' || t === '--method');
      const method = (
        methodIdx >= 0 ? tokens[methodIdx + 1] : 'GET'
      ).toUpperCase();
      if (method !== 'GET') {
        return {
          allow: false,
          reason:
            'Blocked: non-GET `gh api` calls publish or mutate remote state.',
        };
      }
      return { allow: true };
    }
    if (!GH_READ_SUBCOMMANDS.has(sub)) {
      const label = `gh ${group} ${sub}`.trim();
      return {
        allow: false,
        reason: `Blocked: \`${label}\` publishes or mutates remote state (PRs, releases, repositories). Only read subcommands (view/list/status/diff/checks) are allowed.`,
      };
    }
    return { allow: true };
  }

  /* ---------------- package managers ---------------- */
  if (PACKAGE_MANAGERS.has(program)) {
    const sub = (tokens[1] ?? '').toLowerCase();
    if (MUTATING_PACKAGE_SUBCOMMANDS.has(sub)) {
      return {
        allow: false,
        reason: `Blocked: \`${program} ${sub}\` installs, updates or publishes packages. Dependency and release changes are human-only.`,
      };
    }
    return { allow: true };
  }

  /* ---------------- deployment CLIs ---------------- */
  if (DEPLOY_PROGRAMS.has(program)) {
    const lowered = tokens.map((t) => t.toLowerCase());
    if (
      lowered.some((t) =>
        [
          'deploy',
          'publish',
          'apply',
          'push',
          'sync',
          'release',
          'destroy',
        ].includes(t),
      )
    ) {
      return {
        allow: false,
        reason: `Blocked: \`${program}\` deployment/publication commands are human-only.`,
      };
    }
    return { allow: true };
  }
  if (program === 'docker' && (tokens[1] ?? '').toLowerCase() === 'push') {
    return {
      allow: false,
      reason: 'Blocked: `docker push` publishes an image.',
    };
  }

  /* ---------------- broad recursive deletion ---------------- */
  if (program === 'rm') {
    const recursive = tokens
      .slice(1)
      .some(
        (t) =>
          /^-{1,2}[A-Za-z]*$/.test(t) &&
          (/^--recursive$/.test(t) ||
            (/^-[A-Za-z]+$/.test(t) && /[rR]/.test(t.slice(1)))),
      );
    if (recursive) {
      return {
        allow: false,
        reason:
          'Blocked: recursive `rm` deletes directory trees. Remove individual files by explicit name, or ask a human.',
      };
    }
    return { allow: true };
  }
  if (program === 'remove-item' || program === 'ri') {
    if (tokens.some((t) => /^-recurse$/i.test(t))) {
      return {
        allow: false,
        reason: 'Blocked: `Remove-Item -Recurse` deletes directory trees.',
      };
    }
    return { allow: true };
  }
  if (
    (program === 'rmdir' ||
      program === 'rd' ||
      program === 'del' ||
      program === 'erase') &&
    tokens.some((t) => /^\/s$/i.test(t))
  ) {
    return {
      allow: false,
      reason: `Blocked: \`${program} /s\` deletes directory trees.`,
    };
  }
  if (
    program === 'find' &&
    tokens.some((t) => t === '-delete' || t === '-exec' || t === '-execdir')
  ) {
    return {
      allow: false,
      reason:
        'Blocked: `find` with -delete/-exec performs bulk deletion or execution.',
    };
  }

  return { allow: true };
}

/**
 * Evaluate a full shell command string.
 * @param {string} command
 * @returns {{ allow: boolean, reason?: string }}
 */
export function checkBashCommand(command) {
  for (const segment of splitCommandSegments(command)) {
    const verdict = checkCommandSegment(segment);
    if (!verdict.allow) return verdict;
  }
  return { allow: true };
}

/* ------------------------------------------------------------------ *
 * Payload evaluation
 * ------------------------------------------------------------------ */

const WRITE_TOOLS = new Set(['write', 'edit', 'multiedit', 'notebookedit']);

/**
 * @param {Record<string, unknown>} payload PreToolUse hook payload
 * @param {Record<string, string|undefined>} [env]
 * @returns {{ allow: boolean, reason?: string }}
 */
export function evaluate(payload, env = process.env) {
  const toolName = String(payload?.tool_name ?? '').toLowerCase();
  const toolInput = /** @type {Record<string, unknown>} */ (
    payload?.tool_input ?? {}
  );
  const repoRoot = String(
    env.CLAUDE_PROJECT_DIR ?? payload?.cwd ?? process.cwd(),
  );
  const allowlist = parseAllowlist(env.CLAUDE_UNIT_ALLOWLIST);

  if (toolName === 'bash' || toolName === 'powershell') {
    return checkBashCommand(String(toolInput.command ?? ''));
  }
  if (WRITE_TOOLS.has(toolName)) {
    const target =
      toolInput.file_path ?? toolInput.notebook_path ?? toolInput.path;
    return checkFilePath(target === undefined ? '' : String(target), {
      repoRoot,
      allowlist,
    });
  }
  return { allow: true };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const raw = readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.stderr.write(
      'pretool-guard: could not parse hook payload as JSON; no decision made.\n',
    );
    process.exit(1);
  }

  let verdict;
  try {
    verdict = evaluate(payload);
  } catch (error) {
    process.stderr.write(
      `pretool-guard: evaluation failed (${error instanceof Error ? error.name : 'error'}); no decision made.\n`,
    );
    process.exit(1);
    return;
  }

  if (verdict.allow) process.exit(0);
  process.stderr.write(`${verdict.reason}\n`);
  process.exit(2);
}

// Run the CLI only when this file is the process entry point; importing it from
// the test suite must have no side effects.
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
