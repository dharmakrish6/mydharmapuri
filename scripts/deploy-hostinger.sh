#!/bin/bash
# Build the website + admin and publish them to the branches Hostinger deploys from:
#   hostinger-site  → mydharmapuri.com        (contents of app/dist)
#   hostinger-admin → admin.mydharmapuri.com  (contents of admin/dist)
# Each branch holds only built files, so no source code ends up on the public website.
# After the push, Hostinger pulls the branch (auto-deploy webhook, or hPanel → Git → Deploy).
#
# Usage:  scripts/deploy-hostinger.sh [website|admin|all]   (default: all)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WHAT="${1:-all}"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"

publish() { # publish <dist dir> <branch> <label>
  local src="$1" branch="$2" label="$3"
  local wt
  wt="$(mktemp -d)/$branch"
  git -C "$ROOT" fetch -q origin "$branch" 2>/dev/null || true
  if git -C "$ROOT" rev-parse -q --verify "origin/$branch" >/dev/null; then
    git -C "$ROOT" worktree add -q -B "$branch" "$wt" "origin/$branch"
  else
    git -C "$ROOT" worktree add -q --detach "$wt"
    git -C "$wt" checkout -q --orphan "$branch"
  fi
  git -C "$wt" rm -rqf --ignore-unmatch . >/dev/null
  git -C "$wt" clean -fdxq
  cp -R "$src/." "$wt/"
  find "$wt" -name .DS_Store -delete
  git -C "$wt" add -A
  if git -C "$wt" diff --cached --quiet; then
    echo "$label: no changes"
  else
    git -C "$wt" commit -qm "$label built from $(git -C "$ROOT" rev-parse --abbrev-ref HEAD)@$SHA"
    git -C "$wt" push -q -u origin "$branch"
    echo "$label: pushed $(git -C "$wt" rev-parse --short HEAD) to $branch"
  fi
  git -C "$ROOT" worktree remove --force "$wt"
}

if [ "$WHAT" = all ] || [ "$WHAT" = website ]; then
  (cd "$ROOT/app" && npm run build:web)
  publish "$ROOT/app/dist" hostinger-site "Website"
fi
if [ "$WHAT" = all ] || [ "$WHAT" = admin ]; then
  (cd "$ROOT/admin" && npm run build)
  publish "$ROOT/admin/dist" hostinger-admin "Admin"
fi
echo "Done. If auto-deploy is off: hPanel → Advanced → Git → Deploy, for each site."
