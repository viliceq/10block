#!/usr/bin/env bash
# Refresh the `before=` line in .npmrc to today minus 30 days.
# Run this monthly (or before an install session) so npm installs only
# package versions that have had time to be community-vetted.
set -euo pipefail

cd "$(dirname "$0")/.."

DATE=$(date -v-30d +%Y-%m-%d)
NPMRC=.npmrc

if [ ! -f "$NPMRC" ]; then
  echo "$NPMRC missing — bootstrapping" >&2
  cat > "$NPMRC" <<EOF
# Refuse to install package versions published in the last ~30 days.
before=$DATE
EOF
else
  # Replace the `before=` line in place, keeping comments and other settings.
  if grep -q '^before=' "$NPMRC"; then
    sed -i '' "s/^before=.*/before=$DATE/" "$NPMRC"
  else
    echo "before=$DATE" >> "$NPMRC"
  fi
fi

echo "npm 'before' cutoff set to $DATE"
