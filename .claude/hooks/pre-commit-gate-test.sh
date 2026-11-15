#!/usr/bin/env bash
# Proves the commit gate (FD-003) in a throwaway directory, with a stand-in for `npm run verify` that records each
# call: a command that is not a commit is not checked; a commit runs verify; a failing verify blocks the commit; and
# input that is not JSON blocks rather than passes. Run: bash .claude/hooks/pre-commit-gate-test.sh (exit 0 = pass).
set -uo pipefail

hooks="$(cd "$(dirname "$0")" && pwd)"
repo=$(mktemp -d)
trap 'rm -rf "$repo"' EXIT
failures=0

cat > "$repo/fake-verify" <<'FAKE'
#!/usr/bin/env bash
echo "verify" >> "$FAKE_CALLS"
exit "${FAKE_STATUS:-0}"
FAKE
chmod +x "$repo/fake-verify"

export CLAUDE_PROJECT_DIR="$repo" COMMIT_GATE_VERIFY="$repo/fake-verify" FAKE_CALLS="$repo/calls"
: > "$FAKE_CALLS"

gate() { printf '%s' "$1" | "$hooks/pre-commit-gate.sh" 2>/dev/null; }
expect() {  # name, hook input, expected gate exit, expected verify calls so far
    local name=$1 want_exit=$3 want_calls=$4 got_exit got_calls
    gate "$2"; got_exit=$?
    got_calls=$(wc -l < "$FAKE_CALLS" | tr -d ' ')
    if [ "$got_exit" = "$want_exit" ] && [ "$got_calls" = "$want_calls" ]; then
        echo "PASS $name"
    else
        echo "FAIL $name: exit $got_exit (want $want_exit), verify calls $got_calls (want $want_calls)"
        failures=$((failures + 1))
    fi
}

expect "a command that is not a commit is not checked" '{"tool_input":{"command":"git status"}}' 0 0
expect "a commit runs verify" '{"tool_input":{"command":"git add a.ts && git commit -m x"}}' 0 1
FAKE_STATUS=1 expect "a failing verify blocks the commit" '{"tool_input":{"command":"git commit -m x"}}' 2 2
expect "and the next commit is checked again" '{"tool_input":{"command":"git commit -m x"}}' 0 3
expect "input that is not JSON blocks" 'not json' 2 3

[ "$failures" -eq 0 ] && echo "all cases pass" || echo "$failures case(s) failed"
exit "$failures"
