#!/usr/bin/env bash
# Bulk-grab all student repos for one assignment.
#
# Usage:
#   bin/grab.sh <assignment-id> [out-dir]
#
# Defaults:
#   out-dir = ./marking/<assignment-id>
#
# Requires: gh (logged in to the org), git (auth set up via `gh auth setup-git`).

set -euo pipefail

ASG="${1:-}"
OUT="${2:-./marking/${ASG}}"
REPO="${CLASSROOM_REPO:-mbond-flinders-org/classroom}"

if [ -z "$ASG" ]; then
  echo "usage: $0 <assignment-id> [out-dir]" >&2
  exit 1
fi

echo "▶ Triggering bulk-clone workflow for '$ASG' on $REPO ..."
gh workflow run bulk-clone.yml -R "$REPO" -f "assignment_id=$ASG"

echo "▶ Waiting for run to register ..."
sleep 6

RUN_ID=$(gh run list -R "$REPO" -w bulk-clone.yml --limit 1 --json databaseId -q '.[0].databaseId')
echo "▶ Run #$RUN_ID — watching ..."
gh run watch "$RUN_ID" -R "$REPO" --exit-status

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "▶ Downloading artifact ..."
gh run download "$RUN_ID" -R "$REPO" -n "clone-$ASG" -D "$TMP"

mkdir -p "$OUT"
echo "▶ Cloning/pulling repos into $OUT ..."
bash "$TMP/clone.sh" "$OUT"

echo "✅ Done. Repos in: $OUT"
