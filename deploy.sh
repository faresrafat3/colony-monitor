#!/usr/bin/env bash
# THE single entry point: generate + freshness-gate + publish Colony Monitor.
# Generated artifacts (public/kernel/**, public/colony-driver.mjs) are untracked
# and rebuilt here every run — the tree cannot go stale silently.
set -euo pipefail
cd "$(dirname "$0")"
[ -z "$(git status --porcelain -- . ':!public/kernel' ':!public/colony-driver.mjs')" ] || {
  echo "refusing: uncommitted changes (generated artifacts are exempt)" >&2; exit 1;
}

node build.mjs   # vendor + assemble + freshness self-check (exits 1 if stale)

# Publish = one commit whose TREE is exactly public/ (the deployable: handwritten
# sources plus the generated kernel/ and driver), pushed to gh-pages. Building the
# commit with commit-tree avoids any worktree/index dance — HEAD can never leak
# into the publish. Parent: current origin/gh-pages if present (fast-forward by
# construction, works from a fresh clone), else no parent (first publish).
if git fetch -q origin gh-pages 2>/dev/null; then
  PARENT=$(git rev-parse FETCH_HEAD)
else
  PARENT=""
fi
# Build the site tree from the ON-DISK public/ (tracked sources + untracked
# generated artifacts) via a throwaway index — write-tree --prefix alone would
# reflect the tracked-only index and silently drop the generated files.
TMPIDX="$(mktemp -u)"
GIT_WORK_TREE="$PWD/public" GIT_INDEX_FILE="$TMPIDX" git add -A
TREE=$(GIT_INDEX_FILE="$TMPIDX" git write-tree)
rm -f "$TMPIDX"
COMMIT=$(printf 'Publish Colony Monitor: live kernel demo (deterministic, client-side)\n\nsite tree of %s\n' "$(git rev-parse --short HEAD)" |
  git commit-tree "$TREE" ${PARENT:+-p "$PARENT"})
# No-op check compares TREES (commit shas can never match: commit-tree
# stamps a new time each run). Identical tree = identical served site.
if [ "$PARENT" != "" ] && [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then
  echo "already current: live content identical — nothing to publish"
elif git push -q origin "$COMMIT:refs/heads/gh-pages"; then
  echo "published: $COMMIT"
else
  exit 1
fi
echo "live: https://faresrafat3.github.io/colony-monitor/"
