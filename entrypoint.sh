#!/bin/sh
LOG=/tmp/forge.log
SELFTEST_FILE=/tmp/selftest.txt

echo "[entrypoint] node $(node --version)" >&2
echo "[entrypoint] NODE_ENV=$NODE_ENV  PORT=$PORT  BUILD_ID=$BUILD_ID" >&2
echo "[entrypoint] dist:" >&2
ls /app/artifacts/api-server/dist/*.mjs >&2 || echo "no .mjs files!" >&2

echo "[entrypoint] Starting server in background..." >&2
node --enable-source-maps /app/artifacts/api-server/dist/index.mjs >"$LOG" 2>&1 &
NODE_PID=$!

# Wait up to 20s for the server to be ready
i=0
while [ $i -lt 20 ]; do
  sleep 1
  i=$((i + 1))
  if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "[entrypoint] Server died after ${i}s" >&2
    break
  fi
done

# Self-test: try to reach healthz from within the container
if kill -0 $NODE_PID 2>/dev/null; then
  echo "[entrypoint] Server still running after ${i}s. Running self-test..." >&2
  node -e "
    const http = require('http');
    const startMs = Date.now();
    const timer = setTimeout(() => {
      const msg = '[selftest] TIMED OUT after ' + (Date.now()-startMs) + 'ms';
      process.stderr.write(msg + '\n');
      require('fs').writeFileSync('/tmp/selftest.txt', JSON.stringify({ ok: false, reason: 'timeout', ms: Date.now()-startMs }));
      process.exit(1);
    }, 6000);
    http.get('http://localhost:8080/api/healthz', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(timer);
        const ms = Date.now() - startMs;
        process.stderr.write('[selftest] responded in ' + ms + 'ms: ' + d.slice(0,200) + '\n');
        require('fs').writeFileSync('/tmp/selftest.txt', JSON.stringify({ ok: true, ms, body: d.slice(0,500) }));
        process.exit(0);
      });
    }).on('error', e => {
      clearTimeout(timer);
      const ms = Date.now() - startMs;
      const msg = '[selftest] connection error after ' + ms + 'ms: ' + e.message;
      process.stderr.write(msg + '\n');
      require('fs').writeFileSync('/tmp/selftest.txt', JSON.stringify({ ok: false, reason: 'error', error: e.message, ms }));
      process.exit(1);
    });
  " >&2
  SELFTEST_EXIT=$?
  echo "[entrypoint] Self-test exit code: $SELFTEST_EXIT" >&2

  if [ $SELFTEST_EXIT -eq 0 ]; then
    echo "[entrypoint] Server is healthy on localhost! Keeping alive." >&2
    # Server responds fine locally — wait for it in foreground
    wait $NODE_PID
    EXIT=$?
    echo "[entrypoint] Server exited with code $EXIT" >&2
    cat "$LOG" >&2
  else
    echo "[entrypoint] Server NOT responding on localhost — hanging or error. Killing." >&2
    kill $NODE_PID 2>/dev/null
    sleep 2
    EXIT=99
    cat "$LOG" >&2
  fi
else
  # Process died during startup wait
  wait $NODE_PID 2>/dev/null
  EXIT=$?
  echo "[entrypoint] Server died with code $EXIT" >&2
  cat "$LOG" >&2
  SELFTEST_EXIT=0
  echo '{"ok":false,"reason":"crashed before selftest"}' > "$SELFTEST_FILE"
fi

echo "[entrypoint] Starting diagnostic HTTP server on :8080" >&2
exec node -e "
const http = require('http');
const fs   = require('fs');
const log  = (() => { try { return fs.readFileSync('/tmp/forge.log','utf8').slice(-8000); } catch(e){ return 'no log: '+e; } })();
const st   = (() => { try { return JSON.parse(fs.readFileSync('/tmp/selftest.txt','utf8')); } catch(e){ return {error:''+e}; } })();
const body = JSON.stringify({ status:'crashed', exitCode:'$EXIT', selftest: st, log });
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type':'application/json' });
  res.end(body);
}).listen(8080, () => {
  process.stderr.write('[diag] Diagnostic server running on :8080\n');
});
"
