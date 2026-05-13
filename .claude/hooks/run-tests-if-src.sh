#!/usr/bin/env bash
# PostToolUse hook: run vitest after edits inside src/ or tests/.
# The hook receives the tool invocation as JSON on stdin.
set -u

input=$(cat)
file_path=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('tool_input',{}).get('file_path',''))" "$input" 2>/dev/null || echo "")

case "$file_path" in
  */src/*|*/tests/*)
    cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
    echo "[hook] tests after edit to ${file_path}"
    npm run test:run --silent 2>&1 | tail -30
    ;;
esac
