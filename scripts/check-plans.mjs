// A finished item may not leave an open step behind (the frontend's FinishedPlanTest, after backend D-399).
// An item the STATE.md status board marks DONE must have every `- [ ]` step in its plan ticked, or say "not taken"
// with why. Otherwise the plan claims work that was never done, and the next session resumes into it.
import { existsSync, readFileSync } from 'node:fs';

const BUILD = 'docs/fe-build';
const board = readFileSync(`${BUILD}/STATE.md`, 'utf8');

// Status board rows: | FE-001 | DONE | ... |
const done = [
  ...board.matchAll(/^\|\s*(FE-\d{3}[a-z0-9]*)\s*\|\s*DONE\s*\|/gm),
].map((m) => m[1]);

const open = [];
for (const item of done) {
  const plan = `${BUILD}/plans/${item}.md`;
  if (!existsSync(plan)) continue;
  readFileSync(plan, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (/^\s*- \[ \]/.test(line) && !/not taken/i.test(line)) {
        open.push(`${plan}:${index + 1}: ${line.trim()}`);
      }
    });
}

if (open.length > 0) {
  console.error(
    'check-plans: items marked DONE still have open steps. Tick each with its commit, or mark it "not taken" with why:',
  );
  for (const line of open) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`check-plans: ${done.length} DONE item(s), no open steps.`);
