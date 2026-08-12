/**
 * Unit tests for the deterministic PreToolUse guard.
 *
 * Built-in Node test runner only - no dependency installation.
 *   node --test scripts/claude/pretool-guard.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalPath,
  checkBashCommand,
  checkFilePath,
  evaluate,
  matchesAllowlist,
  parseAllowlist,
  splitCommandSegments,
  tokenize,
  toRepoRelative,
} from './pretool-guard.mjs';

const REPO_ROOT = 'C:\\Users\\dev\\outpost';
const GUARD = fileURLToPath(new URL('./pretool-guard.mjs', import.meta.url));

/** Helper: assert a shell command is permitted. */
function allowed(command) {
  const verdict = checkBashCommand(command);
  assert.equal(
    verdict.allow,
    true,
    `expected ALLOW for: ${command}\ngot: ${verdict.reason}`,
  );
}

/** Helper: assert a shell command is blocked. */
function blocked(command) {
  const verdict = checkBashCommand(command);
  assert.equal(verdict.allow, false, `expected BLOCK for: ${command}`);
  assert.match(
    verdict.reason,
    /^Blocked/,
    'block reason should start with "Blocked"',
  );
}

/* ------------------------------------------------------------------ *
 * Safe read-only git inspection
 * ------------------------------------------------------------------ */

test('git status is allowed', () => {
  allowed('git status');
  allowed('git status --porcelain');
});

test('git diff is allowed', () => {
  allowed('git diff');
  allowed('git diff --check');
  allowed('git diff --staged --stat');
});

test('other read-only git inspection is allowed', () => {
  allowed('git log --oneline -5');
  allowed('git rev-parse HEAD');
  allowed('git ls-files');
  allowed('git show HEAD --stat');
  allowed('git branch --list');
  allowed('git worktree list');
  allowed('git tag --list');
  allowed('git tag -l "v*"');
  allowed('git config --get user.name');
  allowed('git merge-base --is-ancestor abc HEAD');
});

/* ------------------------------------------------------------------ *
 * Staging discipline
 * ------------------------------------------------------------------ */

test('git add with explicit files is allowed', () => {
  allowed('git add CLAUDE.md');
  allowed('git add .claude/settings.json scripts/claude/pretool-guard.mjs');
  allowed('git add "docs/ai/CLAUDE-OPERATING-MODE.md"');
});

test('git add . is blocked', () => {
  blocked('git add .');
  blocked('git add ./');
});

test('git add -A and --all are blocked', () => {
  blocked('git add -A');
  blocked('git add --all');
  blocked('git add -u');
  blocked('git add :/');
});

test('git commit -a is blocked but an explicit commit is allowed', () => {
  blocked('git commit -a -m "msg"');
  blocked('git commit -am "msg"');
  allowed(
    'git commit -m "chore(claude): add bounded autonomous operating system"',
  );
});

test('hook bypass flags are blocked', () => {
  blocked('git commit --no-verify -m "msg"');
  blocked('git commit --no-gpg-sign -m "msg"');
});

/* ------------------------------------------------------------------ *
 * Human-only remote and history operations
 * ------------------------------------------------------------------ */

test('git push is blocked', () => {
  blocked('git push');
  blocked('git push origin claude-professional-operating-system-v1');
  blocked('git -C /some/repo push');
});

test('force push is blocked', () => {
  blocked('git push --force');
  blocked('git push -f origin master');
  blocked('git push --force-with-lease');
  blocked('git push origin --delete some-branch');
});

test('git merge is blocked', () => {
  blocked('git merge master');
  blocked('git merge --no-ff feature');
  blocked('git rebase master');
  blocked('git cherry-pick abc123');
});

test('tag creation and deletion are blocked', () => {
  blocked('git tag v1.0.0');
  blocked('git tag -a v1.0.0 -m "release"');
  blocked('git tag -d v1.0.0');
  blocked('git tag --delete v1.0.0');
});

test('worktree removal and pruning are blocked', () => {
  blocked('git worktree remove ../some-worktree');
  blocked('git worktree prune');
  blocked('git worktree move a b');
});

test('destructive branch deletion is blocked', () => {
  blocked('git branch -d feature');
  blocked('git branch -D feature');
  blocked('git branch --delete feature');
  allowed('git branch new-feature');
});

test('reset --hard is blocked', () => {
  blocked('git reset --hard');
  blocked('git reset --hard HEAD~1');
  allowed('git reset HEAD file.txt');
});

test('git clean is blocked', () => {
  blocked('git clean -fd');
  blocked('git clean -n');
});

test('broad checkout/restore and recursive git rm are blocked', () => {
  blocked('git checkout .');
  blocked('git restore .');
  blocked('git rm -r src');
  allowed('git checkout -b new-branch');
  allowed('git rm docs/ai/obsolete.md');
});

test('git config writes are blocked', () => {
  blocked('git config user.email "x@y.z"');
  blocked('git config --global core.editor vim');
});

test('history rewriting is blocked', () => {
  blocked('git filter-branch --tree-filter true HEAD');
  blocked('git update-ref -d refs/heads/x');
});

/* ------------------------------------------------------------------ *
 * Publication, dependency and deployment surfaces
 * ------------------------------------------------------------------ */

test('publication and PR creation are blocked', () => {
  blocked('gh pr create --title x --body y');
  blocked('gh release create v1.0.0');
  blocked('gh repo delete owner/name');
  blocked('gh api -X POST /repos/o/n/issues');
  allowed('gh pr view 12');
  allowed('gh run list');
  allowed('gh api /repos/o/n');
});

test('dependency installation and publishing are blocked', () => {
  blocked('npm install');
  blocked('npm ci');
  blocked('npm publish');
  blocked('npm audit fix');
  blocked('pnpm add left-pad');
  blocked('yarn upgrade');
  allowed('npm run build');
  allowed('npm run lint:tsc');
  allowed('npm.cmd run build');
});

test('deployment CLIs are blocked', () => {
  blocked('vercel deploy --prod');
  blocked('netlify deploy');
  blocked('wrangler publish');
  blocked('docker push repo/image');
  blocked('aws s3 sync dist s3://bucket');
});

/* ------------------------------------------------------------------ *
 * Broad recursive deletion
 * ------------------------------------------------------------------ */

test('broad recursive deletion is blocked', () => {
  blocked('rm -rf dist');
  blocked('rm -r some/dir');
  blocked('rm --recursive some/dir');
  blocked('Remove-Item -Recurse -Force dist');
  blocked('rmdir /s /q dist');
  blocked('find . -name "*.tmp" -delete');
  allowed('rm scratch.txt');
  allowed('rm -f scratch.txt');
});

/* ------------------------------------------------------------------ *
 * Compound commands and substitutions
 * ------------------------------------------------------------------ */

test('a blocked command hidden in a compound command is still blocked', () => {
  blocked('git status && git push');
  blocked('git status; git add .');
  blocked('git diff | head -20 || git reset --hard');
  blocked('echo "$(git push origin master)"');
  blocked('git log -1 `git clean -fd`');
  allowed('git status && git diff --check && git log --oneline -3');
});

test('leading environment assignments do not hide the program', () => {
  blocked('CI=true git push');
  assert.deepEqual(tokenize('FOO=1 BAR=2 git status'), ['git', 'status']);
});

test('command segmentation handles newlines and operators', () => {
  assert.deepEqual(splitCommandSegments('a\nb && c || d ; e | f'), [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
  ]);
});

/* ------------------------------------------------------------------ *
 * Path normalisation
 * ------------------------------------------------------------------ */

test('Windows and POSIX path normalisation agree', () => {
  assert.equal(
    canonicalPath('C:\\Users\\dev\\outpost\\src\\a.ts'),
    'c:/Users/dev/outpost/src/a.ts',
  );
  assert.equal(
    canonicalPath('C:/Users/dev/outpost/src/a.ts'),
    'c:/Users/dev/outpost/src/a.ts',
  );
  assert.equal(
    canonicalPath('/c/Users/dev/outpost/src/a.ts'),
    'c:/Users/dev/outpost/src/a.ts',
  );
  assert.equal(
    canonicalPath('docs//ai/./CLAUDE-OPERATING-MODE.md'),
    'docs/ai/CLAUDE-OPERATING-MODE.md',
  );
});

test('parent-directory traversal is resolved before matching', () => {
  assert.equal(canonicalPath('src/../package.json'), 'package.json');
  const verdict = checkFilePath(
    'C:\\Users\\dev\\outpost\\src\\..\\package.json',
    {
      repoRoot: REPO_ROOT,
      allowlist: null,
    },
  );
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /protected/);
});

test('repo-relative resolution is identical for all three path spellings', () => {
  const spellings = [
    'C:\\Users\\dev\\outpost\\CLAUDE.md',
    'C:/Users/dev/outpost/CLAUDE.md',
    '/c/Users/dev/outpost/CLAUDE.md',
  ];
  for (const spelling of spellings) {
    assert.equal(
      toRepoRelative(spelling, REPO_ROOT).relative,
      'CLAUDE.md',
      spelling,
    );
    assert.equal(
      toRepoRelative(spelling, 'C:/Users/dev/outpost').inside,
      true,
      spelling,
    );
  }
});

test('paths outside the repository are blocked', () => {
  const verdict = checkFilePath('C:\\Users\\dev\\elsewhere\\x.md', {
    repoRoot: REPO_ROOT,
    allowlist: null,
  });
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /outside the repository root/);
});

/* ------------------------------------------------------------------ *
 * File-write policy
 * ------------------------------------------------------------------ */

test('immutable scientific ruling edits are blocked', () => {
  for (const target of [
    '04_GLOBAL_SCIENTIFIC_RULING_VERBATIM.txt',
    'docs/04_GLOBAL_SCIENTIFIC_RULING_VERBATIM.txt',
    'C:\\Users\\dev\\outpost\\04_GLOBAL_SCIENTIFIC_RULING_VERBATIM.txt',
    'docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md',
    'docs/research/event-schema.md',
    'docs/research/scoring-plan.md',
    'docs/decisions/D2.md',
    'docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md',
  ]) {
    const verdict = checkFilePath(target, {
      repoRoot: REPO_ROOT,
      allowlist: null,
    });
    assert.equal(verdict.allow, false, `expected BLOCK for ${target}`);
    assert.match(verdict.reason, /immutable/, target);
  }
});

test('protected operational-file edits are blocked', () => {
  for (const target of [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'playwright.config.ts',
    'vite.config.mts',
    'eslint.config.mts',
    '.commitlintrc.json',
    '.husky/pre-commit',
    '.mcp.json',
    '.claude/settings.local.json',
    '.env',
    '.env.local',
    'node_modules/pkg/index.js',
    'dist/index.html',
    'test-results/report.json',
    'asset-candidates/player.png',
    'AGENTS.md',
    'FABLE-NEXT-09-Q01-Q33-GAMEPLAY-COVERAGE.md',
  ]) {
    const verdict = checkFilePath(target, {
      repoRoot: REPO_ROOT,
      allowlist: null,
    });
    assert.equal(verdict.allow, false, `expected BLOCK for ${target}`);
    assert.match(verdict.reason, /protected/, target);
  }
});

test('an immutable path is blocked even when it appears on the allowlist', () => {
  const verdict = checkFilePath('docs/research/event-schema.md', {
    repoRoot: REPO_ROOT,
    allowlist: ['docs/research/event-schema.md'],
  });
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /immutable/);
});

test('ordinary allowlisted Edit/Write targets are allowed', () => {
  const allowlist = parseAllowlist(
    'CLAUDE.md,.claude/settings.json,scripts/claude/**,docs/ai/CLAUDE-OPERATING-MODE.md',
  );
  for (const target of [
    'CLAUDE.md',
    '.claude/settings.json',
    'scripts/claude/pretool-guard.mjs',
    'scripts/claude/verify-unit.mjs',
    'docs/ai/CLAUDE-OPERATING-MODE.md',
    'C:\\Users\\dev\\outpost\\CLAUDE.md',
    '/c/Users/dev/outpost/scripts/claude/verify-unit.mjs',
  ]) {
    const verdict = checkFilePath(target, { repoRoot: REPO_ROOT, allowlist });
    assert.equal(
      verdict.allow,
      true,
      `expected ALLOW for ${target}: ${verdict.reason}`,
    );
  }
});

test('a path outside the supplied allowlist is blocked', () => {
  const allowlist = parseAllowlist('CLAUDE.md\n.claude/settings.json');
  const verdict = checkFilePath('src/scenes/HubScene.ts', {
    repoRoot: REPO_ROOT,
    allowlist,
  });
  assert.equal(verdict.allow, false);
  assert.match(verdict.reason, /allowlist/);
});

test('with no allowlist supplied only permanent rules apply', () => {
  assert.equal(parseAllowlist(undefined), null);
  assert.equal(parseAllowlist(''), null);
  const verdict = checkFilePath('src/scenes/HubScene.ts', {
    repoRoot: REPO_ROOT,
    allowlist: null,
  });
  assert.equal(verdict.allow, true);
});

test('allowlist directory prefixes and exact entries both match', () => {
  const allowlist = parseAllowlist('scripts/claude/**;CLAUDE.md');
  assert.equal(
    matchesAllowlist('scripts/claude/verify-unit.mjs', allowlist),
    true,
  );
  assert.equal(matchesAllowlist('claude.md', allowlist), true);
  assert.equal(matchesAllowlist('scripts/other.mjs', allowlist), false);
});

/* ------------------------------------------------------------------ *
 * Payload evaluation and process contract
 * ------------------------------------------------------------------ */

test('evaluate() routes Bash and write tools correctly', () => {
  const env = {
    CLAUDE_PROJECT_DIR: REPO_ROOT,
    CLAUDE_UNIT_ALLOWLIST: 'CLAUDE.md',
  };
  assert.equal(
    evaluate({ tool_name: 'Bash', tool_input: { command: 'git status' } }, env)
      .allow,
    true,
  );
  assert.equal(
    evaluate({ tool_name: 'Bash', tool_input: { command: 'git push' } }, env)
      .allow,
    false,
  );
  assert.equal(
    evaluate(
      { tool_name: 'Write', tool_input: { file_path: 'CLAUDE.md' } },
      env,
    ).allow,
    true,
  );
  assert.equal(
    evaluate(
      { tool_name: 'Edit', tool_input: { file_path: 'package.json' } },
      env,
    ).allow,
    false,
  );
  assert.equal(
    evaluate(
      { tool_name: 'Read', tool_input: { file_path: 'package.json' } },
      env,
    ).allow,
    true,
  );
  assert.equal(
    evaluate({ tool_name: 'Grep', tool_input: { pattern: 'x' } }, env).allow,
    true,
  );
});

test('block reasons never echo the full command or file contents', () => {
  const secret = 'ghp_SECRETTOKENVALUE';
  const verdict = checkBashCommand(`git push https://${secret}@github.com/o/n`);
  assert.equal(verdict.allow, false);
  assert.equal(verdict.reason.includes(secret), false);
});

test('the CLI exits 0 on allow and 2 on block, writing the reason to stderr', () => {
  const run = (payload) => {
    try {
      execFileSync(process.execPath, [GUARD], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: REPO_ROOT,
          CLAUDE_UNIT_ALLOWLIST: 'CLAUDE.md',
        },
      });
      return { status: 0, stderr: '' };
    } catch (error) {
      return { status: error.status, stderr: String(error.stderr ?? '') };
    }
  };

  const ok = run({
    tool_name: 'Bash',
    tool_input: { command: 'git status --porcelain' },
  });
  assert.equal(ok.status, 0);

  const denied = run({
    tool_name: 'Bash',
    tool_input: { command: 'git push origin master' },
  });
  assert.equal(denied.status, 2);
  assert.match(denied.stderr, /Blocked: `git push`/);

  const deniedWrite = run({
    tool_name: 'Write',
    tool_input: { file_path: 'src/main.ts' },
  });
  assert.equal(deniedWrite.status, 2);
  assert.match(deniedWrite.stderr, /allowlist/);
});

test('malformed input is a non-blocking error, not a silent allow', () => {
  let status = 0;
  try {
    execFileSync(process.execPath, [GUARD], {
      input: 'not json',
      encoding: 'utf8',
    });
  } catch (error) {
    status = error.status;
  }
  assert.equal(status, 1);
});

test('the guard module lives where the settings hook expects it', () => {
  assert.equal(path.basename(GUARD), 'pretool-guard.mjs');
  assert.equal(path.basename(path.dirname(GUARD)), 'claude');
});

/* ------------------------------------------------------------------ *
 * Session-scratchpad exception
 * ------------------------------------------------------------------ */

const TEMP_ROOT = 'C:\\Users\\dev\\AppData\\Local\\Temp';
const SESSION = 'b1a339dc-4ff9-4ae7-a8e0-38ecfd40d1d6';
const OTHER_SESSION = '11111111-2222-3333-4444-555555555555';
const SLUG = 'C--Users-dev-outpost';
const CLAUDE_TMP = `${TEMP_ROOT}\\claude\\${SLUG}`;
const SCRATCH = `${CLAUDE_TMP}\\${SESSION}\\scratchpad`;
const SCRATCH_ENV = { TEMP: TEMP_ROOT };

/** Helper: assert a write target is permitted. */
function fileAllowed(target, env = SCRATCH_ENV, allowlist = null) {
  const verdict = checkFilePath(target, {
    repoRoot: REPO_ROOT,
    allowlist,
    env,
  });
  assert.equal(
    verdict.allow,
    true,
    `expected ALLOW for ${target}: ${verdict.reason}`,
  );
}

/** Helper: assert a write target is blocked. */
function fileBlocked(target, env = SCRATCH_ENV, allowlist = null) {
  const verdict = checkFilePath(target, {
    repoRoot: REPO_ROOT,
    allowlist,
    env,
  });
  assert.equal(verdict.allow, false, `expected BLOCK for ${target}`);
  assert.match(verdict.reason, /^Blocked/, target);
}

test('writes inside the current-session scratchpad are allowed', () => {
  fileAllowed(`${SCRATCH}\\probe.mjs`);
  fileAllowed(`${SCRATCH}\\nested\\deeper\\out.json`);
  fileAllowed(`${SCRATCH}/probe.mjs`);
  fileAllowed(
    `/c/Users/dev/AppData/Local/Temp/claude/${SLUG}/${SESSION}/scratchpad/probe.mjs`,
  );
});

test('the scratchpad exception survives an allowlist that governs repo files', () => {
  const allowlist = parseAllowlist('CLAUDE.md');
  fileAllowed(`${SCRATCH}\\probe.mjs`, SCRATCH_ENV, allowlist);
  // ...while repository allowlist enforcement is unchanged.
  fileBlocked('src/scenes/HubScene.ts', SCRATCH_ENV, allowlist);
  fileAllowed('CLAUDE.md', SCRATCH_ENV, allowlist);
});

test('prefix-confusion siblings of the scratchpad are blocked', () => {
  fileBlocked(`${CLAUDE_TMP}\\${SESSION}\\scratchpad-evil\\x.md`);
  fileBlocked(`${CLAUDE_TMP}\\${SESSION}\\scratchpadX\\x.md`);
  fileBlocked(`${CLAUDE_TMP}\\${SESSION}\\scratchpad.bak\\x.md`);
  fileBlocked(
    `${TEMP_ROOT}\\claude-evil\\${SLUG}\\${SESSION}\\scratchpad\\x.md`,
  );
});

test('sibling session state outside the scratchpad is blocked', () => {
  fileBlocked(`${CLAUDE_TMP}\\${SESSION}\\tasks\\out.txt`);
  fileBlocked(`${CLAUDE_TMP}\\${SESSION}\\x.md`);
  fileBlocked(`${CLAUDE_TMP}\\x.md`);
  fileBlocked(`${TEMP_ROOT}\\claude\\x.md`);
  fileBlocked(`${TEMP_ROOT}\\x.md`);
  // The scratchpad directory itself is not a write target.
  fileBlocked(SCRATCH);
});

test('traversal out of the scratchpad is resolved and blocked', () => {
  fileBlocked(`${SCRATCH}\\..\\tasks\\out.txt`);
  fileBlocked(`${SCRATCH}\\..\\..\\..\\..\\.claude\\.credentials.json`);
  fileBlocked(`${SCRATCH}\\nested\\..\\..\\tasks\\out.txt`);
});

test('a non-session directory in the session position is blocked', () => {
  fileBlocked(`${CLAUDE_TMP}\\not-a-session\\scratchpad\\x.md`);
  fileBlocked(`${CLAUDE_TMP}\\..\\claude\\${SLUG}\\scratchpad\\x.md`);
});

test('CLAUDE_SESSION_ID pins the exception to the current session', () => {
  const pinned = { TEMP: TEMP_ROOT, CLAUDE_SESSION_ID: SESSION };
  fileAllowed(`${SCRATCH}\\probe.mjs`, pinned);
  fileBlocked(`${CLAUDE_TMP}\\${OTHER_SESSION}\\scratchpad\\probe.mjs`, pinned);
});

test('settings and credential filenames are blocked inside the scratchpad', () => {
  fileBlocked(`${SCRATCH}\\.credentials.json`);
  fileBlocked(`${SCRATCH}\\settings.local.json`);
  fileBlocked(`${SCRATCH}\\settings.json`);
  fileBlocked(`${SCRATCH}\\.claude.json`);
  fileBlocked(`${SCRATCH}\\history.jsonl`);
  fileBlocked(`${SCRATCH}\\.env`);
  fileBlocked(`${SCRATCH}\\.env.local`);
});

test('with no temp root configured the scratchpad exception does not exist', () => {
  fileBlocked(`${SCRATCH}\\probe.mjs`, {});
});

/* ------------------------------------------------------------------ *
 * Shell write targets match the Write/Edit policy
 * ------------------------------------------------------------------ */

const SHELL_CTX = {
  repoRoot: REPO_ROOT,
  allowlist: parseAllowlist('CLAUDE.md,scripts/claude/**'),
  env: SCRATCH_ENV,
};

/** Helper: assert a shell command is permitted under the path policy. */
function shellAllowed(command) {
  const verdict = checkBashCommand(command, SHELL_CTX);
  assert.equal(
    verdict.allow,
    true,
    `expected ALLOW for: ${command}\ngot: ${verdict.reason}`,
  );
}

/** Helper: assert a shell command is blocked under the path policy. */
function shellBlocked(command) {
  const verdict = checkBashCommand(command, SHELL_CTX);
  assert.equal(verdict.allow, false, `expected BLOCK for: ${command}`);
}

test('shell redirection cannot write where Write/Edit cannot', () => {
  shellBlocked('echo x > package.json');
  shellBlocked('echo x >> package.json');
  shellBlocked('cat foo > .claude/settings.local.json');
  shellBlocked('npm run build 2> docs/research/event-schema.md');
  shellBlocked('echo x > src/scenes/HubScene.ts');
});

test('shell redirection to allowlisted and non-file sinks is allowed', () => {
  shellAllowed('git diff > CLAUDE.md');
  shellAllowed('node scripts/claude/verify-unit.mjs > scripts/claude/out.log');
  shellAllowed('npm run build > /dev/null');
  shellAllowed('npm run build > /dev/null 2>&1');
  shellAllowed('npm.cmd run lint:tsc 2>&1');
});

test('shell redirection into the session scratchpad is allowed', () => {
  shellAllowed(`node probe.mjs > "${SCRATCH.replace(/\\/g, '/')}/out.json"`);
  shellBlocked(
    `node probe.mjs > "${SCRATCH.replace(/\\/g, '/')}/../tasks/out.json"`,
  );
});

test('a quoted redirection character is not a write target', () => {
  shellAllowed('echo "a > b"');
  shellAllowed("echo 'x >> package.json'");
});

test('file-writing programs are held to the same policy', () => {
  shellBlocked('tee package.json');
  shellBlocked('cat x | tee tsconfig.json');
  shellBlocked('Out-File -FilePath package.json');
  shellBlocked('Set-Content -Path .env -Value x');
  shellAllowed('cat x | tee CLAUDE.md');
});

test('unresolvable variable targets fall back to the command rules', () => {
  shellAllowed('cat foo > "$SCRATCH/probe.mjs"');
  shellBlocked('git push origin master > "$SCRATCH/out.log"');
});

test('evaluate() applies the same policy to the PowerShell tool', () => {
  const env = {
    CLAUDE_PROJECT_DIR: REPO_ROOT,
    CLAUDE_UNIT_ALLOWLIST: 'CLAUDE.md',
    TEMP: TEMP_ROOT,
  };
  const run = (command) =>
    evaluate({ tool_name: 'PowerShell', tool_input: { command } }, env).allow;
  assert.equal(run('git status'), true);
  assert.equal(run('git push origin master'), false);
  assert.equal(run('Remove-Item -Recurse -Force dist'), false);
  assert.equal(run('echo x > package.json'), false);
  assert.equal(run('echo x > CLAUDE.md'), true);
});
