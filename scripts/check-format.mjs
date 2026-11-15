// Prettier gate for the files a change touches, not the whole tree: 131 files predated the gate (FD-002), and
// reformatting them all at once would be one unreviewable diff that collides with every open branch. A file is
// formatted the first time someone changes it, so the unformatted set only shrinks.
//
//   node scripts/check-format.mjs           check files changed since the merge-base with FORMAT_BASE
//   node scripts/check-format.mjs --write   format those files in place
//
// FORMAT_BASE defaults to origin/master. CI sets it to the PR base or the push's previous commit.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import * as prettier from 'prettier';

const CHECKED = /\.(ts|html|css|scss|js|mjs)$/;
const write = process.argv.includes('--write');
const base = process.env.FORMAT_BASE || 'origin/master';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

let mergeBase;
try {
  [mergeBase] = git('merge-base', 'HEAD', base);
} catch {
  console.error(
    `check-format: no merge-base between HEAD and '${base}'. Fetch it, or set FORMAT_BASE.`,
  );
  process.exit(2);
}

// Working tree against the merge-base: committed, staged and unstaged changes alike, plus new untracked files.
const changed = new Set([
  ...git('diff', '--name-only', '--diff-filter=ACMR', mergeBase),
  ...git('ls-files', '--others', '--exclude-standard'),
]);

const unformatted = [];
for (const file of [...changed].filter((f) => CHECKED.test(f)).sort()) {
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
