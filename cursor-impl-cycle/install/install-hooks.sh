#!/usr/bin/env bash
# Append cursor-impl-cycle stop hook to .cursor/hooks.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACK_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ "$(basename "$(dirname "$PACK_ROOT")")" == "cursor-packs" ]]; then
  ROOT="$(cd "$PACK_ROOT/../.." && pwd)"
else
  ROOT="$(cd "$PACK_ROOT/.." && pwd)"
fi

HOOKS_JSON="$ROOT/.cursor/hooks.json"
PACK_HOOK="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$PACK_ROOT/hooks/stop.sh" "$ROOT")"

cd "$ROOT"

mkdir -p "$ROOT/.cursor"

if [[ ! -f "$HOOKS_JSON" ]]; then
  cat >"$HOOKS_JSON" <<'EOF'
{
  "version": 1,
  "hooks": {
    "stop": []
  }
}
EOF
fi

python3 - "$HOOKS_JSON" "$PACK_HOOK" <<'PY'
import json
import sys

hooks_path, pack_hook = sys.argv[1], sys.argv[2]
with open(hooks_path, encoding="utf-8") as f:
    data = json.load(f)

stop = data.setdefault("hooks", {}).setdefault("stop", [])
for entry in stop:
    if isinstance(entry, dict) and entry.get("command") == pack_hook:
        print(f"Hook already registered: {pack_hook}")
        sys.exit(0)

stop.append({"command": pack_hook, "timeout": 20, "loop_limit": None})
with open(hooks_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"Appended stop hook: {pack_hook}")
PY

chmod +x "$PACK_ROOT/hooks/stop.sh"
echo "Done."
