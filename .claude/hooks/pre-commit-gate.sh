#!/usr/bin/env bash
# Blocks `git commit` from a Claude Code session unless `npm run verify` passes: ESLint against its shrinking
# baseline, Prettier on the files the change touches, and the template-aware typecheck. These are the enforced half
# of CLAUDE.md "Engineering standards" (FD-003). It runs no test, after the backend's W-267: the pipeline runs them.
set -uo pipefail

# No jq on the owner's machine; node is always present in this repo.
command=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.command??"")}catch{process.exit(3)}})')
if [ $? -ne 0 ]; then
    echo "Commit gate: could not read the hook input as JSON." >&2
    exit 2
fi
case "$command" in
    *"git commit"*) ;;
    *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
if ! cd "$root" 2>/dev/null; then
    echo "Commit blocked: pre-commit-gate could not find the project root ('$root')." >&2
    exit 2
fi

# The test seam: pre-commit-gate-test.sh points this at a stand-in, so the gate is tested without a build.
verify="${COMMIT_GATE_VERIFY:-npm run --silent verify}"
if output=$($verify 2>&1); then
    exit 0
fi

{
    echo "Commit blocked by .claude/hooks/pre-commit-gate.sh (CLAUDE.md Engineering standards, FD-003)."
    echo "npm run verify failed (lint, format:check or typecheck). Fix the cause; do not bypass the gate."
    echo "--- last 60 lines ---"
    echo "$output" | tail -60
} >&2
exit 2
