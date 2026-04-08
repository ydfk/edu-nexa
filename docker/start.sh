#!/bin/sh
set -eu

/app/main &
API_PID=$!

caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

stop_services() {
  kill "$API_PID" "$CADDY_PID" 2>/dev/null || true
}

trap stop_services INT TERM

STATUS=0
while :; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || STATUS=$?
    break
  fi

  if ! kill -0 "$CADDY_PID" 2>/dev/null; then
    wait "$CADDY_PID" || STATUS=$?
    break
  fi

  sleep 1
done

stop_services
wait "$API_PID" 2>/dev/null || true
wait "$CADDY_PID" 2>/dev/null || true
exit "$STATUS"
