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
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WORK" gh-pages
  git -C "$WORK" rm -rfq .
else
  git worktree add --orphan -b gh-pages "$WORK"
fi
cp -r public/. "$WORK"/
# NOTE: gh-pages INTENTIONALLY includes the generated artifacts (public/kernel/**,
# public/colony-driver.mjs) — the branch IS the deployable; only main keeps them
# untracked. add -A stages the full site; a no-op commit simply means the live
# content is already current.
git -C "$WORK" add -A
git -C "$WORK" commit -qm "Publish Colony Monitor: live kernel demo (deterministic, client-side)" --author="faresrafat3 <faresrafat3@gmail.com>"
git push origin gh-pages
echo "live: https://faresrafat3.github.io/colony-monitor/"
