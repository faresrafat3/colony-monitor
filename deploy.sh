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

WORK="$(mktemp -d)"
trap 'git worktree remove --force "$WORK" 2>/dev/null || true' EXIT
# Prefer publishing ON TOP of the remote gh-pages head (fast-forward by
# construction, works from any fresh clone). Fall back to an orphan branch
# only when the remote branch does not exist yet.
if git fetch -q origin gh-pages 2>/dev/null; then
  git worktree add --detach -q "$WORK" FETCH_HEAD
  git -C "$WORK" rm -rfq . 2>/dev/null || true
  BASE="on top of origin/gh-pages"
else
  git worktree add --orphan -b gh-pages "$WORK"
  BASE="orphan (first publish)"
fi
cp -r public/. "$WORK"/
# NOTE: gh-pages INTENTIONALLY includes the generated artifacts (public/kernel/**,
# public/colony-driver.mjs) — the branch IS the deployable; only main keeps them
# untracked. add -A stages the full site.
git -C "$WORK" add -A
if git -C "$WORK" commit -qm "Publish Colony Monitor: live kernel demo (deterministic, client-side) [$BASE]" --author="faresrafat3 <faresrafat3@gmail.com>"; then
  git push origin HEAD:gh-pages
else
  echo "already current: live content identical — nothing to publish"
fi
echo "live: https://faresrafat3.github.io/colony-monitor/"
