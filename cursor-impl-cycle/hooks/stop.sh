#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ "$(basename "$(dirname "$PACK_ROOT")")" == "cursor-packs" ]]; then
  ROOT="$(cd "$PACK_ROOT/../.." && pwd)"
else
  ROOT="$(cd "$PACK_ROOT/.." && pwd)"
fi
cd "$ROOT"
exec node "$PACK_ROOT/hooks/stop.mjs"
