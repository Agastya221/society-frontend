#!/bin/bash
# Fast phone test of the guard app (dev build). Needs: a phone with USB debugging, the guard dev build installed.
# It starts the code server in test mode (or reuses the one it started last time if no code changed since),
# builds the app once from this computer so the phone never times out, switches the phone's animations off,
# runs every flow, then puts the animations back.
# Results: .maestro/reports/ (HTML report + failure screenshots) and .maestro/recordings/*.mp4 (video of every flow).
# Run one flow only:  ./run-tests.sh 25-type-the-flat.yaml
# Force a clean code server:  FRESH=1 ./run-tests.sh
# Two-person flows (tag needs-tokens) also act as the resident; tokens.js signs their tokens with the
# backend secret on this computer, and they are skipped when the backend folder is not here.
set -u
cd "$(dirname "$0")"
APP_DIR="$(cd .. && pwd)"
export PATH="$PATH:$HOME/maestro-dl/maestro/bin"
# Windows Java reads the flow files in the local code page, turning Hindi text into "?????" so no Hindi screen ever matches.
export MAESTRO_OPTS="-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -Dstdout.encoding=UTF-8"
LOG="${TEMP:-/tmp}/metro_guard_e2e.log"
MARK="${TEMP:-/tmp}/metro_guard_e2e.pid"

listener_pid() { powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue | Select -First 1).OwningProcess" | tr -d '\r'; }

echo "== code server (test mode)"
PID=$(listener_pid)
REUSE=0
# Reuse only the test-mode server this script started, and only if no app code changed since (it runs without file watching).
if [ -z "${FRESH:-}" ] && [ -n "$PID" ] && [ -f "$MARK" ] && [ "$(cat "$MARK")" = "$PID" ] \
   && [ -z "$(find "$APP_DIR/src" "$APP_DIR/app.json" -newer "$MARK" -print -quit 2>/dev/null)" ]; then
  REUSE=1
  echo "   reusing the running test server (pid $PID)"
else
  [ -n "$PID" ] && taskkill //F //T //PID "$PID" > /dev/null 2>&1
  # No --clear by default: in development Expo adds EXPO_PUBLIC_* values when it assembles the bundle, not into
  # the per-file cache, so the test switch never needs a cold rebuild (which takes minutes).
  CLEAR=""; [ -n "${FRESH:-}" ] && CLEAR="--clear"
  # Started through PowerShell so it is fully detached: a child started from bash on Windows keeps this
  # script's output pipe open, and anything reading the output (| grep, | tee) then never finishes.
  powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -WorkingDirectory '$(cygpath -w "$APP_DIR")' -FilePath cmd.exe -ArgumentList '/c set EXPO_PUBLIC_E2E=1&& set CI=1&& npx expo start --dev-client --port 8082 $CLEAR > \"$(cygpath -w "$LOG")\" 2>&1'" < /dev/null > /dev/null 2>&1
  until curl -s -m 2 localhost:8082/status | grep -q running; do sleep 1; done
  listener_pid > "$MARK"
fi
adb reverse tcp:8082 tcp:8082 > /dev/null

# Build the app here first: a cold build takes minutes and the phone gives up long before that.
echo "== building the app (instant when nothing changed)"
URL=$(curl -s -m 60 -H "expo-platform: android" -H "accept: application/expo+json,application/json" localhost:8082 \
  | grep -o '"launchAsset":{[^}]*' | grep -o '"url":"[^"]*' | cut -d'"' -f4)
[ -z "$URL" ] && { echo "!! code server gave no app address; see $LOG"; exit 1; }
curl -s -m 900 -o /dev/null -w "   built (http %{http_code})\n" "$URL"

echo "== phone: animations off, app loaded once"
for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $k 0; done
restore() { for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $k 1; done; }
trap restore EXIT
if [ "$REUSE" = 0 ] || ! adb shell pidof com.sgate.guard > /dev/null; then
  adb shell am force-stop com.sgate.guard
  adb shell am start -a android.intent.action.VIEW -d "exp+s-gate-guard://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082" com.sgate.guard > /dev/null
fi

echo "== flows"
mkdir -p reports recordings
TARGET="${1:-.}"
# Two-person flows act as the resident too; they need tokens signed with the backend's secret (tokens.js).
TOKEN_ARGS=()
while IFS= read -r LINE; do [ -n "$LINE" ] && TOKEN_ARGS+=(-e "$LINE"); done < <(node tokens.js 2>/dev/null | tr -d '\r')
if [ ${#TOKEN_ARGS[@]} -eq 0 ]; then
  echo "   no backend secret on this computer: skipping two-person flows"
  TOKEN_ARGS=(--exclude-tags needs-tokens)
fi
maestro test --no-reinstall-driver --format HTML-DETAILED --output reports/report.html --debug-output reports/debug --flatten-debug-output "${TOKEN_ARGS[@]}" "$TARGET"
STATUS=$?
# Maestro files each video deep inside the debug folder; gather them in one place.
find reports/debug -name "*.mp4" -exec cp {} recordings/ \; 2>/dev/null
echo "   videos: .maestro/recordings/ ($(ls recordings/*.mp4 2>/dev/null | wc -l) files)"
exit $STATUS
