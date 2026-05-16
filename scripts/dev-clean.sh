#!/usr/bin/env bash
# Reap leaked Next.js dev-server process trees for THIS project.
#
# Why this exists: `next dev --turbopack` (Next 16.2.x) spawns a `next-server`
# child plus a `.next/dev/build/postcss.js` worker. When the parent is killed
# ungracefully (SIGKILL from a closed terminal, a killed background task, or a
# force-quit) the children are NOT reaped — they reparent to launchd (PID 1)
# and keep running, each holding 400MB-2GB+ (and growing, per
# vercel/next.js#92052 on Apple Silicon). Restarting the dev server then stacks
# another orphan tree on top. Across a long editing session this reaches
# 100GB+. This script removes only stragglers belonging to this repo so a
# fresh dev server never accumulates on top of a dead one.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_DIR/frontend"

killed=0

kill_match() {
  # $1 = human label, $2 = pgrep -f pattern
  local label="$1" pattern="$2" pids
  pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "  reaping $label: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    killed=$((killed + 1))
  fi
}

echo "dev-clean: scanning for stale Next dev processes in $FRONTEND_DIR"

# 1. This project's `next dev --turbopack` launcher (path-scoped).
kill_match "next dev launcher" "$FRONTEND_DIR/node_modules/.*next/dist/bin/next dev"
# 2. This project's Turbopack postcss build worker (path-scoped).
kill_match "postcss build worker" "$FRONTEND_DIR/.next/dev/build"

# 3. Orphaned next-server processes (PPID == 1 only — a healthy server has a
#    real parent; PPID 1 means it was abandoned by an ungraceful kill).
orphans="$(ps -axo pid,ppid,command | awk '$2==1 && /next-server \(v/ {print $1}')"
if [ -n "$orphans" ]; then
  echo "  reaping orphaned next-server (PPID=1): $orphans"
  # shellcheck disable=SC2086
  kill -9 $orphans 2>/dev/null || true
  killed=$((killed + 1))
fi

if [ "$killed" -eq 0 ]; then
  echo "dev-clean: nothing to reap (clean)"
else
  echo "dev-clean: reaped $killed group(s)"
fi
