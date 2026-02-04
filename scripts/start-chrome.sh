#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-9222}"
WIDTH="${2:-1280}"
HEIGHT="${3:-720}"
CHROME_BIN="${CHROME_BIN:-google-chrome}"
if ! command -v "$CHROME_BIN" >/dev/null 2>&1; then
  if command -v chromium >/dev/null 2>&1; then CHROME_BIN=chromium;
  elif command -v chromium-browser >/dev/null 2>&1; then CHROME_BIN=chromium-browser;
  else echo "Chrome not found. Set CHROME_BIN."; exit 1; fi
fi
USER_DATA="/tmp/cdp-profile-$PORT"
mkdir -p "$USER_DATA"
"$CHROME_BIN" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$USER_DATA" \
  --no-first-run --no-default-browser-check \
  --disable-extensions \
  --disable-background-networking \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-features=CalculateNativeWinOcclusion \
  --force-device-scale-factor=1 \
  --window-size="$WIDTH","$HEIGHT" \
  about:blank
