// Turn the repo's git hooks on or off for this clone.
//   npm run hooks:install      sets core.hooksPath to .githooks
//   npm run hooks:uninstall    removes that setting (git falls back to .git/hooks)
// Local config only: nothing global is touched. Works the same on Windows and Linux.
import { chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { enterRepoRoot, fail, git, info } from '../.githooks/lib.mjs';

const HOOKS_DIR = '.githooks';
const HOOKS = ['pre-commit', 'commit-msg', 'pre-push'];

try {
  enterRepoRoot();
} catch {
  fail('This is not a git repository.', [
    'Run this from inside the wealthlens-fe clone.',
  ]);
}

function currentHooksPath() {
  try {
    return git('config', '--local', '--get', 'core.hooksPath');
  } catch {
    return ''; // not set
  }
}

const current = currentHooksPath();

if (process.argv.includes('--uninstall')) {
  if (current === HOOKS_DIR) {
    git('config', '--local', '--unset', 'core.hooksPath');
    info('Git hooks uninstalled. Git now uses .git/hooks again.');
  } else if (current === '') {
    info('Nothing to uninstall: core.hooksPath is not set.');
  } else {
    info(
      `core.hooksPath is "${current}", which this script did not set. Left unchanged.`,
    );
  }
  process.exit(0);
}

for (const hook of HOOKS) {
  const shim = join(HOOKS_DIR, hook);
  if (!existsSync(shim) || !existsSync(`${shim}.mjs`)) {
    fail(`Missing hook file: ${shim} or ${shim}.mjs`, [
      'Check out the branch that contains .githooks/ and try again.',
    ]);
  }
  try {
    chmodSync(shim, 0o755); // required on Linux/macOS; a no-op on Windows
  } catch {
    // The file system may not support modes; Git for Windows runs hooks anyway.
  }
  // Record the executable bit for tracked shims so fresh Linux clones keep it.
  if (git('ls-files', '--', shim)) {
    git('update-index', '--chmod=+x', '--', shim);
  }
}

if (current !== '' && current !== HOOKS_DIR) {
  info(
    `Replacing core.hooksPath "${current}". To restore it: git config core.hooksPath "${current}"`,
  );
}
git('config', '--local', 'core.hooksPath', HOOKS_DIR);

info(`Git hooks installed (core.hooksPath=${HOOKS_DIR}):`);
info(
  '  pre-commit   protected-branch and secret-file guard, ESLint + Prettier on staged files',
);
info('  commit-msg   Conventional Commits');
info(
  '  pre-push     protected-branch and branch-name guard, typecheck, test:ci',
);
info('Remove them with: npm run hooks:uninstall');
