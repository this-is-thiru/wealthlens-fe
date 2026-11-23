// Pre-push hook:
//   1. Block pushes to or deletions of protected branches.
//   2. Block pushing branches that do not match feature/*, chore/*, or fix/*.
//   3. Run `npm run typecheck` and `npm run test:ci` before pushing (skipped for pure deletions).
import { readFileSync } from 'node:fs';
import {
  PROTECTED_BRANCHES,
  WORKING_BRANCH,
  currentBranch,
  enterRepoRoot,
  fail,
  info,
  npmRun,
} from './lib.mjs';

enterRepoRoot();

const ZERO_SHA = '0000000000000000000000000000000000000000';

// Git sends one line per ref on stdin: <local ref> <local sha> <remote ref> <remote sha>
let stdin = '';
try {
  stdin = readFileSync(0, 'utf8');
} catch {
  stdin = '';
}

const updates = stdin
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
    return { localRef, localSha, remoteRef, remoteSha };
  });

const branchFromRef = (ref) =>
  ref && ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : null;

// Fallback if invoked manually with no stdin: check current branch
if (updates.length === 0) {
  const branch = currentBranch();
  if (branch && PROTECTED_BRANCHES.includes(branch)) {
    fail(`Direct pushes from protected branch "${branch}" are blocked.`, [
      'Open a pull request from a feature/*, chore/*, or fix/* branch instead.',
    ]);
  }
  if (branch && !WORKING_BRANCH.test(branch)) {
    fail(`Branch name "${branch}" is not allowed.`, [
      'Use one of: feature/<name>, chore/<name>, fix/<name>',
    ]);
  }
}

let hasNonDeletePush = updates.length === 0;

for (const { localRef, localSha, remoteRef } of updates) {
  const isDelete = localSha === ZERO_SHA;
  const remoteBranch = branchFromRef(remoteRef);
  const localBranch = branchFromRef(localRef);

  // 1. Protected-branch guard (blocks updates AND deletions)
  if (remoteBranch && PROTECTED_BRANCHES.includes(remoteBranch)) {
    fail(
      `Direct ${isDelete ? 'deletion of' : 'push to'} protected branch "${remoteBranch}" is blocked.`,
      ['Changes to protected branches must arrive through a pull request.'],
    );
  }
  if (!isDelete && localBranch && PROTECTED_BRANCHES.includes(localBranch)) {
    fail(`Pushing protected branch "${localBranch}" directly is blocked.`, [
      'Create a feature/*, chore/*, or fix/* branch instead.',
    ]);
  }

  // 2. Working branch-name guard (non-deletions targeting heads)
  if (!isDelete) {
    hasNonDeletePush = true;
    if (remoteBranch && !WORKING_BRANCH.test(remoteBranch)) {
      fail(`Remote branch name "${remoteBranch}" is not allowed.`, [
        'Allowed branch names: feature/<name>, chore/<name>, fix/<name>',
        'Characters after "/": start with letter/digit, then letters, digits, ".", "_", "-".',
      ]);
    }
  }
}

if (!hasNonDeletePush) {
  info(
    'Pure branch deletion on non-protected branch — skipping typecheck and tests.',
  );
  process.exit(0);
}

// 3. Typecheck
info('Running npm run typecheck...');
if (npmRun('typecheck') !== 0) {
  fail('Typecheck failed. Push aborted.', [
    'Fix the TypeScript/template errors and try pushing again.',
  ]);
}

// 4. Unit tests with coverage thresholds (Decision F: non-interactive CI config)
info('Running npm run test:ci...');
if (npmRun('test:ci') !== 0) {
  fail('Unit tests or coverage thresholds failed. Push aborted.', [
    'Fix the failing tests/coverage and try pushing again.',
  ]);
}

info('pre-push checks passed.');
