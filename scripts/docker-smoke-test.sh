#!/usr/bin/env bash
# Smoke test for the WealthLens nginx image.
# Starts a container from IMAGE, checks it serves the app correctly, then removes it.
#
# Usage: scripts/docker-smoke-test.sh <image> [host-port]
#   e.g. scripts/docker-smoke-test.sh wealthlens:ci
set -euo pipefail

IMAGE="${1:?usage: $0 <image> [host-port]}"
PORT="${2:-4200}" # host port; the container always listens on 8080
NAME="wealthlens-smoke-$$"
BASE="http://127.0.0.1:${PORT}"
failures=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; failures=$((failures + 1)); }

cleanup() {
  if [ "$failures" -gt 0 ]; then
    echo "--- container logs ---"
    docker logs "$NAME" 2>&1 | tail -50 || true
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Faster health checks than the image default so the test doesn't wait 30s.
docker run -d --name "$NAME" -p "${PORT}:8080" \
  --health-interval=2s --health-start-period=2s "$IMAGE" >/dev/null

echo "Waiting for ${IMAGE} to become healthy..."
status=""
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$NAME")"
  [ "$status" = "healthy" ] && break
  sleep 1
done

echo "Container"
if [ "$status" = "healthy" ]; then
  pass "HEALTHCHECK reports healthy"
else
  fail "health status is '${status}' (running: $(docker inspect -f '{{.State.Running}}' "$NAME"))"
  echo "Smoke test FAILED: container never became healthy, skipping remaining checks"
  exit 1
fi

uid="$(docker exec "$NAME" id -u)"
if [ "$uid" != "0" ]; then pass "runs as non-root (uid ${uid})"; else fail "runs as root"; fi

if docker exec "$NAME" sh -c 'echo x >> /usr/share/nginx/html/index.html' 2>/dev/null; then
  fail "site files are writable by the nginx user"
else
  pass "site files are read-only for the nginx user"
fi

# status <path> -> HTTP status code
code() { curl -s -o /dev/null -w '%{http_code}' "${BASE}$1"; }
# header <path> <name> -> header value (case-insensitive name)
header() { curl -s -D - -o /dev/null "${BASE}$1" | tr -d '\r' | awk -v h="$(echo "$2" | tr '[:upper:]' '[:lower:]')" -F': ' 'tolower($1)==h {print $2}'; }
expect_code() { local got; got="$(code "$1")"; if [ "$got" = "$2" ]; then pass "$1 -> $2"; else fail "$1 -> ${got} (expected $2)"; fi; }
expect_header() { local got; got="$(header "$1" "$2")"; if [ "$got" = "$3" ]; then pass "$1 $2: $3"; else fail "$1 $2: '${got}' (expected '$3')"; fi; }

echo "Routing"
expect_code /healthz 200
expect_code / 200
if curl -s "${BASE}/" | grep -qi '<app-root'; then pass "/ serves the Angular index.html"; else fail "/ does not contain <app-root>"; fi
expect_code /some/deep/route 200
if curl -s "${BASE}/some/deep/route" | grep -qi '<app-root'; then pass "deep links fall back to index.html"; else fail "deep link did not return index.html"; fi
expect_code /chunk-ZZZZZZZZ.js 404

echo "Headers"
expect_header / X-Content-Type-Options nosniff
expect_header / X-Frame-Options DENY
expect_header / Cache-Control no-cache
if [ -n "$(header / Server | grep -E '[0-9]' || true)" ]; then fail "Server header exposes the nginx version"; else pass "Server header hides the nginx version"; fi

# Long-lived caching only applies to fingerprinted files (production builds).
asset="$(curl -s "${BASE}/" | grep -oE '(main|chunk|styles)-[A-Z0-9]{8}\.(js|css)' | head -1 || true)"
if [ -n "$asset" ]; then
  expect_code "/${asset}" 200
  expect_header "/${asset}" Cache-Control "public, max-age=31536000, immutable"
else
  echo "  ➖ no fingerprinted asset in index.html (non-production build), cache check skipped"
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "Smoke test FAILED: ${failures} check(s) failed"
  exit 1
fi
echo "Smoke test passed"
