// Enforces the WealthLens branch promotion policy on pull requests.
//
// Allowed paths:
//   feature/*, chore/*, fix/*  ->  development
//   development                ->  staging   (same repository only)
//   staging                    ->  release   (same repository only)
//   *                          ->  master    (transitional during migration; removed when master is retired)
//
// Inputs come exclusively from environment variables (never interpolated into a shell).
import { appendFileSync } from 'node:fs';

const WORKING_BRANCH = /^(feature|chore|fix)\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

const base = (process.env.PR_BASE_REF || '').trim();
const head = (process.env.PR_HEAD_REF || '').trim();
const headRepo = (process.env.PR_HEAD_REPO || '').trim();
const baseRepo = (process.env.PR_BASE_REPO || '').trim();
const summaryPath = process.env.GITHUB_STEP_SUMMARY || '';

function writeSummary(status, reason) {
  if (!summaryPath) return;
  const lines = [
    '## Promotion policy',
    '',
    `- **Result:** ${status}`,
    `- **Pull request:** \`${head || '(missing)'}\` → \`${base || '(missing)'}\``,
    `- **Details:** ${reason}`,
    '',
    '### Allowed promotion paths',
    '- `feature/*`, `chore/*`, `fix/*` → `development`',
    '- `development` → `staging` (same repository)',
    '- `staging` → `release` (same repository)',
    '',
  ];
  appendFileSync(summaryPath, lines.join('\n'));
}

function pass(reason) {
  console.log(`✅ Promotion policy passed: ${head} -> ${base} (${reason})`);
  writeSummary('✅ Passed', reason);
  process.exit(0);
}

function reject(reason) {
  console.error(`❌ Promotion policy failed: ${head} -> ${base}`);
  console.error(`   Reason: ${reason}`);
  console.error('');
  console.error('Allowed promotion paths:');
  console.error('  - feature/*, chore/*, fix/* -> development');
  console.error('  - development -> staging (same repository)');
  console.error('  - staging -> release (same repository)');
  writeSummary('❌ Failed', reason);
  process.exit(1);
}

if (!base || !head) {
  reject('Missing PR_BASE_REF or PR_HEAD_REF environment variable.');
}

const sameRepo = !headRepo || !baseRepo || headRepo === baseRepo;

if (base === 'master') {
  pass('master is transitional during branch migration');
} else if (base === 'development') {
  if (WORKING_BRANCH.test(head)) {
    pass('working branch into development');
  }
  reject(
    `Only feature/*, chore/*, or fix/* branches may target "development" (got "${head}").`,
  );
} else if (base === 'staging') {
  if (head !== 'development') {
    reject(
      `Only "development" may be promoted into "staging" (got "${head}").`,
    );
  }
  if (!sameRepo) {
    reject(
      `Promotion into "staging" must come from the same repository (got "${headRepo}", expected "${baseRepo}").`,
    );
  }
  pass('promotion from development to staging');
} else if (base === 'release') {
  if (head !== 'staging') {
    reject(`Only "staging" may be promoted into "release" (got "${head}").`);
  }
  if (!sameRepo) {
    reject(
      `Promotion into "release" must come from the same repository (got "${headRepo}", expected "${baseRepo}").`,
    );
  }
  pass('promotion from staging to release');
} else {
  reject(`Unsupported target branch "${base}".`);
}
