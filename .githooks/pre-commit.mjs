// Pre-commit hook:
//   1. Block direct commits on protected branches.
//   2. Block staged secret files and build/coverage output.
//   3. Run ESLint on staged src/ TypeScript and HTML files.
//   4. Run Prettier check on staged code/style files (never auto-modifies files).
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as prettier from 'prettier';
import {
  PROTECTED_BRANCHES,
  chunk,
  currentBranch,
  enterRepoRoot,
  fail,
  gitNul,
  info,
  run,
  toolPath,
} from './lib.mjs';

enterRepoRoot();

// 1. Protected-branch guard
const branch = currentBranch();
if (branch && PROTECTED_BRANCHES.includes(branch)) {
  fail(`Direct commits to "${branch}" are blocked.`, [
    'Create a working branch instead (feature/*, chore/*, or fix/*) and open a pull request.',
    'Example: git checkout -b chore/my-change',
  ]);
}

// Collect staged files (Added, Copied, Modified, Renamed)
const staged = gitNul(
  'diff',
  '--cached',
  '--name-only',
  '--diff-filter=ACMR',
  '-z',
);

if (staged.length === 0) {
  process.exit(0);
}

// 2. Secret-file and build-output guard
const FORBIDDEN_DIR = /^(node_modules|dist|coverage)\//i;
const ENV_FILE = /^\.env(\..+)?$/i;
const KEY_FILE = /\.(pem|key)$/i;

const forbidden = staged.filter((file) => {
  const normalized = file.replace(/\\/g, '/');
  const name = basename(normalized);
  if (FORBIDDEN_DIR.test(normalized)) return true;
  if (KEY_FILE.test(name)) return true;
  if (ENV_FILE.test(name) && name.toLowerCase() !== '.env.example') return true;
  return false;
});

if (forbidden.length > 0) {
  fail('Refusing to commit secret files or build/coverage output:', [
    ...forbidden.map((f) => `- ${f}`),
    'Unstage them with: git reset HEAD -- <file>',
  ]);
}

// 3. ESLint on staged src/ *.ts and *.html files (respects eslint-suppressions.json)
const lintTargets = staged.filter(
  (file) => /^src\/.+\.(ts|html)$/.test(file) && existsSync(file),
);
if (lintTargets.length > 0) {
  info(`Running ESLint on ${lintTargets.length} staged file(s)...`);
  const eslintBin = toolPath('eslint/bin/eslint.js');
  for (const batch of chunk(lintTargets, 50)) {
    const status = run(process.execPath, [
      eslintBin,
      '--no-error-on-unmatched-pattern',
      ...batch,
    ]);
    if (status !== 0) {
      fail('ESLint failed on staged files.', [
        'Fix the reported lint errors, re-stage your files, and commit again.',
      ]);
    }
  }
}

// 4. Prettier check on staged files (matches scripts/check-format.mjs extensions)
const PRETTIER_EXT = /\.(ts|html|css|scss|js|mjs)$/;
const formatTargets = staged.filter(
  (file) => PRETTIER_EXT.test(file) && existsSync(file),
);

if (formatTargets.length > 0) {
  const unformatted = [];
  for (const file of formatTargets) {
    const fileInfo = await prettier.getFileInfo(file, {
      ignorePath: '.prettierignore',
    });
    if (fileInfo.ignored || !fileInfo.inferredParser) continue;
    const options = {
      ...(await prettier.resolveConfig(file)),
      filepath: file,
    };
    const source = readFileSync(file, 'utf8');
    if (!(await prettier.check(source, options))) {
      unformatted.push(file);
    }
  }

  if (unformatted.length > 0) {
    fail(`${unformatted.length} staged file(s) are not Prettier-formatted:`, [
      ...unformatted.map((f) => `- ${f}`),
      'Run: npm run format:changed  (then re-stage and commit again)',
    ]);
  }
}

info('pre-commit checks passed.');
