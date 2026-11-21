#!/bin/bash
set -euo pipefail
MODE="${1:-check-files}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/poteto-pi.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
export PI_CODING_AGENT_DIR="$TMP/pi-agent"
mkdir -p "$PI_CODING_AGENT_DIR"
test -f "$ROOT/extensions/index.ts"
test -f "$ROOT/roles/pstack-worker.md"
grep -q -- '--model' "$ROOT/docs/harness/pi.md"
if [[ "$MODE" == "check-files" ]]; then
  printf '%s\n' '{"host":"pi","nativeChild":"not-run","cli":"not-invoked","nativeSubagent":false}'
  exit 0
fi
if ! command -v pi >/dev/null 2>&1; then
  printf '%s\n' '{"host":"pi","nativeChild":"not-run","cli":"absent","nativeSubagent":false}'
  exit 3
fi
pi --version
printf '%s\n' '{"host":"pi","nativeChild":"not-run","cli":"present"}'
