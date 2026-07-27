#!/usr/bin/env bash
# Delete GitHub Actions workflow runs (5 concurrent)
# Usage: ./cleanup-workflow-runs.sh [YYYY-MM-DD]
#   No args: delete all runs
#   With date: delete runs before that date
set -euo pipefail

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "Please login first:"
  echo "  gh auth login"
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Deleting all runs..."
  ids=$(gh run list --json databaseId --jq '.[].databaseId' --limit 500)
else
  echo "Deleting runs created before $1..."
  ids=$(gh run list --created "<$1" --json databaseId --jq '.[].databaseId' --limit 500)
fi

[ -z "$ids" ] && echo "No runs found." && exit 0

echo "$ids" | xargs -P5 -I{} sh -c 'echo "  Deleting run {}..." && gh run delete "{}" >/dev/null 2>&1 || true'
echo "Done."
