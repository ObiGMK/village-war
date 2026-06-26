#!/usr/bin/env bash
# Keeps the Village War backend alive — respawns it if it ever crashes.
# Usage: ./run.sh [port]   (default 3456)
PORT="${1:-3456}"
cd "$(dirname "$0")"
echo "Village War supervisor → http://localhost:$PORT  (Ctrl-C to stop)"
while true; do
  python3 server.py "$PORT"
  code=$?
  echo "[supervisor] server exited (code $code) — restarting in 2s…"
  sleep 2
done
