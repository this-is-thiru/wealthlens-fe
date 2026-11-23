// Shared helpers for the git hooks in this folder. Plain Node with no dependencies,
// so the hooks behave the same on Windows and Linux.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Branches nobody commits or pushes to directly: changes arrive through pull requests only.
export const PROTECTED_BRANCHES = [
  'development',
  'staging',
  'release',
  'master',
];

// Branches a developer (or the agent) may create and push.
export const WORKING_BRANCH =
  /^(feature|chore|fix)\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'style',
  'test',
  'ci',
  'build',
];

/** Run git and return trimmed stdout. Throws if git exits non-zero. */
export function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  }).replace(/\r?\n$/, '');
}

/** Run git with `-z` style output and return the NUL-separated entries (safe for odd file names). */
export function gitNul(...args) {
  return git(...args)
    .split('\0')
    .filter(Boolean);
}

export function currentBranch() {
  try {
    return git('symbolic-ref', '--short', '-q', 'HEAD');
  } catch {
    return null; // detached HEAD (rebase, checkout of a commit)
  }
}

/** Hooks normally start in the top-level directory, but make sure. */
export function enterRepoRoot() {
  const root = git('rev-parse', '--show-toplevel');
  process.chdir(root);
  return root;
}

export function info(message) {
  console.log(`[git-safety] ${message}`);
}

/** Print a problem and stop the git operation. */
export function fail(title, details = []) {
  console.error(`\n[git-safety] ${title}`);
  for (const line of details) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

/** Run a command with the terminal attached and return its exit status. */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    fail(`Could not run "${command}": ${result.error.message}`);
  }
  return result.status ?? 1;
}

/** `npm run <script>`; on Windows npm is a .cmd file and needs a shell (fixed arguments only). */
export function npmRun(script) {
  return run('npm', ['run', script], { shell: process.platform === 'win32' });
}

/** Absolute path of a file inside node_modules, or a clear error when dependencies are missing. */
export function toolPath(relative) {
  const path = join(process.cwd(), 'node_modules', relative);
  if (!existsSync(path)) {
    fail('Dependencies are not installed.', ['Run: npm ci']);
  }
  return path;
}

export function chunk(list, size) {
  const groups = [];
  for (let i = 0; i < list.length; i += size) {
    groups.push(list.slice(i, i + size));
  }
  return groups;
}
