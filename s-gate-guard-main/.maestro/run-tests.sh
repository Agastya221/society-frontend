#!/bin/bash
# Fast phone test of the guard app (dev build). Needs: a phone with USB debugging, the guard dev build installed.
# It starts the code server itself in test mode, loads the app once, switches the phone's animations off,
# runs every flow, then puts the animations back.
# Results: .maestro/reports/ (HTML report + failure screenshots) and .maestro/recordings/*.mp4 (video of every flow).
# Run one flow only:  ./run-tests.sh 25-type-the-flat.yaml
set -u
cd "$(dirname "$0")"
APP_DIR="$(cd .. && pwd)"
export PATH="$PATH:$HOME/maestro-dl/maestro/bin"
LOG="${TEMP:-/tmp}/metro_guard_e2e.log"

echo "== code server (test mode)"
PID=$(powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue | Select -First 1).OwningProcess")
[ -n "$PID" ] && powershell -NoProfile -Command "Stop-Process -Id $PID -Force"
(cd "$APP_DIR" && EXPO_PUBLIC_E2E=1 CI=1 npx expo start --dev-client --port 8082 --clear > "$LOG" 2>&1 &)
until curl -s -m 2 localhost:8082/status | grep -q running; do sleep 1; done
adb reverse tcp:8082 tcp:8082

echo "== phone: animations off, app loaded once"
for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $k 0; done
restore() { for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $k 1; done; }
trap restore EXIT
adb shell am force-stop com.sgate.guard
adb shell am start -a android.intent.action.VIEW -d "exp+s-gate-guard://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082" com.sgate.guard > /dev/null
until grep -q "Bundled" "$LOG"; do sleep 1; done
sleep 4

echo "== flows"
mkdir -p reports recordings
TARGET="${1:-.}"
maestro test --no-reinstall-driver --format HTML-DETAILED --output reports/report.html --debug-output reports/debug --flatten-debug-output "$TARGET"
