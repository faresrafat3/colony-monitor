#!/usr/bin/env bash
# Build + publish Colony Monitor to the gh-pages branch of its repo.
set -euo pipefail
cd "$(dirname "$0")"
[ -z "$(git status --porcelain -- . ':!public/kernel')" ] || { echo "refusing: uncommitted changes (kernel vendor output is exempt)" >&2; exit 1; }

node build-vendor.mjs
node build.mjs

WORK="$(mktemp -d)"
trap 'git worktree remove --force "$WORK" 2>/dev/null || true' EXIT
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WORK" gh-pages
  git -C "$WORK" rm -rfq .
else
  git worktree add --orphan -b gh-pages "$WORK"
fi
cp -r public/. "$WORK"/
git -C "$WORK" add -A
git -C "$WORK" commit -qm "Publish Colony Monitor: live kernel demo (deterministic, client-side)" --author="faresrafat3 <faresrafat3@gmail.com>"
git push origin gh-pages
echo "live: https://faresrafat3.github.io/colony-monitor/"
