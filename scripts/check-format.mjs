// Prettier gate for the files a change touches, not the whole tree: 131 files predated the gate (FD-002), and
// reformatting them all at once would be one unreviewable diff that collides with every open branch. A file is
// formatted the first time someone changes it, so the unformatted set only shrinks.
//
//   node scripts/check-format.mjs           check files changed since the merge-base with FORMAT_BASE
//   node scripts/check-format.mjs --write   format those files in place
//
// FORMAT_BASE defaults to origin/development, falling back to origin/master during branch migration.
// CI sets it to the PR base or the push's previous commit; an all-zero SHA (new branch push) falls back cleanly.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';

const CHECKED = /\.(ts|html|css|scss|js|mjs)$/;
const ZERO_SHA = /^0+$/;
const FALLBACK_BASES = ['origin/development', 'origin/master'];
const write = process.argv.includes('--write');

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\n')
    .filter(Boolean);
}

function tryMergeBase(ref) {
  try {
    const [sha] = git('merge-base', 'HEAD', ref);
    return sha || null;
  } catch {
    return null;
  }
}

const requested = (process.env.FORMAT_BASE || '').trim();
const candidates = [];
if (requested && !ZERO_SHA.test(requested)) {
  candidates.push(requested);
} else if (requested && ZERO_SHA.test(requested)) {
  console.log(
    `check-format: FORMAT_BASE is all-zeros (new branch push); falling back to ${FALLBACK_BASES.join(' -> ')}.`,
  );
}
for (const fallback of FALLBACK_BASES) {
  if (!candidates.includes(fallback)) {
    candidates.push(fallback);
  }
}

let base = null;
let mergeBase = null;
for (const candidate of candidates) {
  const found = tryMergeBase(candidate);
  if (found) {
    if (requested && !ZERO_SHA.test(requested) && candidate !== requested) {
      console.log(
        `check-format: could not resolve '${requested}'; fell back to '${candidate}'.`,
      );
    }
    base = candidate;
    mergeBase = found;
    break;
  }
}

if (!mergeBase) {
  console.error(
    `check-format: no merge-base between HEAD and any of [${candidates.join(', ')}]. Fetch the base branch, or set FORMAT_BASE.`,
  );
  process.exit(2);
}

// Working tree against the merge-base: committed, staged and unstaged changes alike, plus new untracked files.
const changed = new Set([
  ...git('diff', '--name-only', '--diff-filter=ACMR', mergeBase),
  ...git('ls-files', '--others', '--exclude-standard'),
]);

const unformatted = [];
const toCheck = [...changed]
  .filter((f) => CHECKED.test(f))
  .sort((a, b) => a.localeCompare(b));
for (const file of toCheck) {
  const info = await prettier.getFileInfo(file, {
    ignorePath: '.prettierignore',
  });
  if (info.ignored || !info.inferredParser) continue;
  const options = { ...(await prettier.resolveConfig(file)), filepath: file };
  const source = readFileSync(file, 'utf8');
  if (await prettier.check(source, options)) continue;
  if (write) {
    writeFileSync(file, await prettier.format(source, options));
    console.log(`formatted ${file}`);
  } else {
    unformatted.push(file);
  }
}

if (unformatted.length > 0) {
  console.error(
    `check-format: ${unformatted.length} changed file(s) are not Prettier-formatted:`,
  );
  for (const file of unformatted) console.error(`  ${file}`);
  console.error('Run: npm run format:changed');
  process.exit(1);
}
console.log(
  `check-format: ${changed.size} changed file(s) since ${base}, all formatted.`,
);
