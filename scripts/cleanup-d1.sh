#!/bin/bash
set -euo pipefail

DB="${1:-DB}"
REMOTE="${2:---remote}"

echo "🔍 Fetching table list from D1 ($DB $REMOTE)..."
JSON=$(pnpm wrangler d1 execute "$DB" "$REMOTE" --command="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_%' ESCAPE '\\' AND name != '_cf_KV' ORDER BY name;" --json 2>/dev/null)

NAMES=$(echo "$JSON" | python3 -c "
import sys, json
entries = json.load(sys.stdin)
names = []
for entry in entries:
    for row in entry.get('results', []):
        n = row.get('name', '')
        if n:
            names.append(n)
print(' '.join(names))
")

if [ -z "$NAMES" ]; then
  echo "✅ No tables to drop."
  exit 0
fi

echo "🗑️  Dropping tables: $NAMES"
for table in $NAMES; do
  pnpm wrangler d1 execute "$DB" "$REMOTE" --command="DROP TABLE IF EXISTS \"$table\";" > /dev/null 2>&1 || true
  echo "Drop $table"
done

echo "✅ All tables dropped."

echo "🎉 Done!"
