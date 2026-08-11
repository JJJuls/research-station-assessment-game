#!/usr/bin/env node
/**
 * Read-only bounded-unit verifier.
 *
 * Prints the repository state for the active unit and checks every changed path
 * against an explicit allowlist. It never stages, commits, resets or otherwise
 * modifies the repository - it only runs read-only git plumbing.
 *
 * Usage:
 *   node scripts/claude/verify-unit.mjs --allow CLAUDE.md --allow .claude/settings.json
 *   node scripts/claude/verify-unit.mjs --allowlist-file docs/ai/unit-allowlist.txt
 *   CLAUDE_UNIT_ALLOWLIST="CLAUDE.md,scripts/claude/**" node scripts/claude/verify-unit.mjs
 *
 * Options:
 *   --allow <path>          add one allowlist entry (repeatable)
 *   --allowlist-file <path> read entries from a file, one per line ("#" comments)
 *   --base <ref>            also diff the whole branch against this ref
 *   --json                  emit a machine-readable summary instead of a report
 *
 * Allowlist entries are repo-relative POSIX paths. A trailing "/**" makes an
 * entry a directory prefix.
 *
 * Exit codes:
 *   0  every change is inside the allowlist and `git diff --check` is clean
 *   1  a violation was found (unexpected path, broad staging, whitespace error)
 *   2  the verifier could not run (not a git repository, bad arguments)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { canonicalPath, matchesAllowlist } from './pretool-guard.mjs';

/* ------------------------------------------------------------------ *
 * Read-only git helpers
 * ------------------------------------------------------------------ */

/**
 * Run a read-only git command and return trimmed stdout.
 * @param {string[]} args
 * @returns {string}
 */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}

/**
 * Run a read-only git command tolerating a non-zero exit status.
 * @param {string[]} args
 * @returns {{ status: number, stdout: string }}
 */
function gitSoft(args) {
  try {
    return { status: 0, stdout: git(args) };
  } catch (error) {
    return {
      status: error.status ?? 1,
      stdout: String(error.stdout ?? '').trim(),
    };
  }
}

/* ------------------------------------------------------------------ *
 * Argument parsing
 * ------------------------------------------------------------------ */

/**
 * @param {string[]} argv
 * @returns {{ allow: string[], base: string|null, json: boolean }}
 */
export function parseArgs(argv) {
  const allow = [];
  let base = null;
  let json = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--allow') {
      const value = argv[i + 1];
      if (!value) throw new Error('--allow requires a path');
      allow.push(value);
      i += 1;
    } else if (arg === '--allowlist-file') {
      const file = argv[i + 1];
      if (!file) throw new Error('--allowlist-file requires a path');
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const entry = line.split('#')[0].trim();
        if (entry) allow.push(entry);
      }
      i += 1;
    } else if (arg === '--base') {
      base = argv[i + 1];
      if (!base) throw new Error('--base requires a ref');
      i += 1;
    } else if (arg === '--json') {
      json = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (allow.length === 0 && process.env.CLAUDE_UNIT_ALLOWLIST) {
    for (const entry of process.env.CLAUDE_UNIT_ALLOWLIST.split(/[\n,;]+/)) {
      const trimmed = entry.trim();
      if (trimmed) allow.push(trimmed);
    }
  }
  return {
    allow: allow.map((e) => canonicalPath(e)).filter(Boolean),
    base,
    json,
  };
}

/* ------------------------------------------------------------------ *
 * Change collection
 * ------------------------------------------------------------------ */

/**
 * Collect staged, unstaged and untracked paths from `git status --porcelain=v1 -z`.
 * The NUL-delimited form is used so that spaces and non-ASCII names survive.
 * @param {string} porcelain raw `-z` output
 * @returns {{ staged: string[], unstaged: string[], untracked: string[] }}
 */
export function parsePorcelain(porcelain) {
  const staged = [];
  const unstaged = [];
  const untracked = [];
  const records = porcelain.split('\0');

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (record.length < 4) continue;
    const x = record[0];
    const y = record[1];
    const pathPart = record.slice(3);

    if (x === '?' && y === '?') {
      untracked.push(pathPart);
      continue;
    }
    // Renames and copies consume the following NUL-separated original path.
    if (x === 'R' || x === 'C') {
      const original = records[i + 1];
      i += 1;
      if (original) staged.push(original);
    }
    if (x !== ' ' && x !== '?') staged.push(pathPart);
    if (y !== ' ' && y !== '?') unstaged.push(pathPart);
  }
  return {
    staged: [...new Set(staged)].sort(),
    unstaged: [...new Set(unstaged)].sort(),
    untracked: [...new Set(untracked)].sort(),
  };
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function section(title) {
  process.stdout.write(`\n${title}\n${'-'.repeat(title.length)}\n`);
}

function list(label, paths) {
  if (paths.length === 0) {
    process.stdout.write(`${label}: (none)\n`);
    return;
  }
  process.stdout.write(`${label}: ${paths.length}\n`);
  for (const p of paths) process.stdout.write(`  ${p}\n`);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`verify-unit: ${error.message}\n`);
    process.exit(2);
    return;
  }

  const repoCheck = gitSoft(['rev-parse', '--is-inside-work-tree']);
  if (repoCheck.status !== 0 || repoCheck.stdout !== 'true') {
    process.stderr.write('verify-unit: not inside a git work tree.\n');
    process.exit(2);
    return;
  }

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(['rev-parse', 'HEAD']);
  const headSubject = git(['log', '-1', '--pretty=%s']);
  const { staged, unstaged, untracked } = parsePorcelain(
    execFileSync(
      'git',
      ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
      {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      },
    ),
  );

  const violations = [];
  const allChanged = [
    ...new Set([...staged, ...unstaged, ...untracked]),
  ].sort();

  let baseChanged = [];
  if (options.base) {
    const diff = gitSoft(['diff', '--name-only', `${options.base}...HEAD`]);
    if (diff.status !== 0) {
      violations.push(`could not diff against base ref "${options.base}"`);
    } else {
      baseChanged = diff.stdout
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  const candidates = [...new Set([...allChanged, ...baseChanged])].sort();

  if (options.allow.length === 0) {
    violations.push(
      'no allowlist supplied; a bounded unit must declare its exact allowed-file list',
    );
  } else {
    for (const p of candidates) {
      if (!matchesAllowlist(canonicalPath(p), options.allow)) {
        violations.push(`unexpected path outside the unit allowlist: ${p}`);
      }
    }
  }

  // Broad-staging detection: `git add .` / `git add -A` pulls in paths the unit
  // never named. Any staged path outside the allowlist is the observable
  // fingerprint of that mistake, so it is reported as its own class of problem.
  const broadlyStaged = options.allow.length
    ? staged.filter((p) => !matchesAllowlist(canonicalPath(p), options.allow))
    : [];
  if (broadlyStaged.length > 0) {
    violations.push(
      `broad staging detected: ${broadlyStaged.length} staged path(s) are outside the allowlist - unstage and add each allowlisted file by explicit name`,
    );
  }

  const whitespace = gitSoft(['diff', '--check']);
  const whitespaceStaged = gitSoft(['diff', '--check', '--cached']);
  if (whitespace.status !== 0 || whitespaceStaged.status !== 0) {
    violations.push(
      'git diff --check reported whitespace/conflict-marker errors',
    );
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          branch,
          head,
          headSubject,
          staged,
          unstaged,
          untracked,
          baseChanged,
          broadlyStaged,
          violations,
        },
        null,
        2,
      )}\n`,
    );
    process.exit(violations.length === 0 ? 0 : 1);
    return;
  }

  section('Repository state');
  process.stdout.write(`branch:      ${branch}\n`);
  process.stdout.write(`HEAD:        ${head}\n`);
  process.stdout.write(`HEAD subject: ${headSubject}\n`);

  section('Working-tree changes');
  list('staged', staged);
  list('unstaged', unstaged);
  list('untracked', untracked);
  if (options.base) list(`changed vs ${options.base}`, baseChanged);

  section('Allowlist');
  if (options.allow.length === 0) {
    process.stdout.write('(none supplied)\n');
  } else {
    for (const entry of options.allow) process.stdout.write(`  ${entry}\n`);
  }

  section('Whitespace check');
  const whitespaceOutput = [whitespace.stdout, whitespaceStaged.stdout]
    .filter(Boolean)
    .join('\n');
  process.stdout.write(
    whitespaceOutput ? `${whitespaceOutput}\n` : 'git diff --check: clean\n',
  );

  section('Result');
  if (violations.length === 0) {
    process.stdout.write('PASS - every change is inside the unit allowlist.\n');
    process.exit(0);
  }
  for (const v of violations) process.stdout.write(`FAIL - ${v}\n`);
  process.exit(1);
}

main();
