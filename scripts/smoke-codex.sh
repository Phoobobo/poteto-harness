#!/bin/bash
set -euo pipefail
MODE="${1:-check-files}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/poteto-codex.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
export CODEX_HOME="$TMP/codex-home"
mkdir -p "$CODEX_HOME"
test -f "$ROOT/plugin.json"
test -f "$ROOT/.agents/plugins/marketplace.json"
grep -q spawn_agent "$ROOT/docs/harness/codex.md"
if [[ "$MODE" == "check-files" ]]; then
  printf '%s\n' '{"host":"codex","nativeChild":"not-run","cli":"not-invoked"}'
  exit 0
fi
if ! command -v codex >/dev/null 2>&1; then
  printf '%s\n' '{"host":"codex","nativeChild":"not-run","cli":"absent"}'
  exit 3
fi
codex --version
printf '%s\n' '{"host":"codex","nativeChild":"not-run","cli":"present"}'
