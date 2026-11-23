// Commit-msg hook:
//   Enforces Conventional Commits: type(scope)!: summary (max 100 chars).
//   Allows git-generated Merge, Revert, fixup!, and squash! headers.
import { readFileSync } from 'node:fs';
import { COMMIT_TYPES, fail, info } from './lib.mjs';

const msgPath = process.argv[2];
if (!msgPath) {
  fail('Missing commit message file path.', [
    'This hook expects git to pass the path to COMMIT_EDITMSG.',
  ]);
}

const raw = readFileSync(msgPath, 'utf8');
const header = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.length > 0 && !line.startsWith('#'));

if (!header) {
  fail('Commit message is empty.', [
    'Use Conventional Commits format, e.g. "chore(git-safety): add local hooks".',
  ]);
}

// Allow git-generated merge, revert, and autosquash headers
if (/^(Merge\b|Revert\b|(fixup|squash)! )/.test(header)) {
  process.exit(0);
}

const MAX_HEADER_LENGTH = 100;
const CONVENTIONAL_RE = new RegExp(
  `^(${COMMIT_TYPES.join('|')})(\\([a-z0-9._/-]+\\))?!?: .+`,
);

const errors = [];
if (!CONVENTIONAL_RE.test(header)) {
  errors.push('Header does not match Conventional Commits format.');
}
if (header.length > MAX_HEADER_LENGTH) {
  errors.push(
    `Header is ${header.length} characters (maximum is ${MAX_HEADER_LENGTH}).`,
  );
}

if (errors.length > 0) {
  fail('Invalid commit message:', [
    `Received: "${header}"`,
    ...errors,
    '',
    'Expected: <type>(<scope>): <summary>   (scope and trailing [TICKET-ID] are optional)',
    `Types:    ${COMMIT_TYPES.join(', ')}`,
    'Examples:',
    '  feat(portfolio): add holdings table [WL-42]',
    '  chore(git-safety): add local git hooks',
  ]);
}

info('commit-msg check passed.');
