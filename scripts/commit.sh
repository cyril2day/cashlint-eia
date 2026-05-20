#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: commit.sh -m "commit message" <file1> [file2 ...]

Helper to create small, focused commits. Stages only the files you pass and commits with the provided message.

Examples:
  ./scripts/commit.sh -m "fix: tidy imports in price translator" src/contexts/acl/eia-ingestion-acl/translators/price.ts
  ./scripts/commit.sh -m "chore: update README" README.md

This script intentionally does not auto-stage all changes to encourage granular commits.
EOF
}

if [ "$#" -lt 3 ]; then
  usage
  exit 1
fi

if [ "$1" != "-m" ]; then
  echo "First argument must be -m"
  usage
  exit 1
fi

shift
msg="$1"
shift

files=("$@")

# Stage only the requested files
for f in "${files[@]}"; do
  if [ ! -e "$f" ]; then
    echo "File not found: $f" >&2
    exit 2
  fi
done

git add -- "${files[@]}"

git commit -m "$msg"

echo "Committed: $msg"