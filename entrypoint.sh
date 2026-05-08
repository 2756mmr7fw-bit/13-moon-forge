#!/bin/sh
LOG=/tmp/forge.log

# Pre-flight diagnostics (go to Docker logs via stderr)
echo "[entrypoint] node $(node --version)" >&2
echo "[entrypoint] NODE_ENV=$NODE_ENV  PORT=$PORT  BUILD_ID=$BUILD_ID" >&2
echo "[entrypoint] dist files:" >&2
ls /app/artifacts/api-server/dist/ 2>&1 >&2 || true
echo "[entrypoint] key node_modules:" >&2
ls /app/node_modules/.modules.yaml 2>/dev/null >&2 && echo "pnpm store present" >&2 || echo "no pnpm store" >&2
node -e "require('express'); process.stdout.write('[entrypoint] express OK\n')" >&2 2>&1 || echo "[entrypoint] express LOAD FAILED" >&2
node -e "require('pg'); process.stdout.write('[entrypoint] pg OK\n')" >&2 2>&1 || echo "[entrypoint] pg LOAD FAILED" >&2

echo "[entrypoint] Starting forge server..." >&2

# Run the server, capture ALL output to log file (will also print to stderr below on exit)
node --enable-source-maps /app/artifacts/api-server/dist/index.mjs >"$LOG" 2>&1
EXIT=$?

echo "[entrypoint] *** SERVER EXITED with code $EXIT ***" >&2
cat "$LOG" >&2

# Start a diagnostic HTTP server on port 8080 that serves the crash log
# This lets us see the crash reason via the healthz endpoint
exec node -e "
const http = require('http');
const fs   = require('fs');
const log  = (() => {
  try { return fs.readFileSync('/tmp/forge.log', 'utf8').slice(-8000); }
  catch (e) { return 'cannot read log: ' + e; }
})();
const body = JSON.stringify({ status: 'crashed', exitCode: process.env.EXIT_CODE || '?', log });
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(body);
}).listen(8080, () => {
  process.stderr.write('[diag] Diagnostic server on :8080 — crash log available via healthz\n');
});
"
