#!/bin/bash
# hourly-sync.sh — Pull new commits from remote branches into main once per hour,
# auto-resolve trivial conflicts, run build, escalate only on real code conflicts.
#
# Disable before public launch — uncontrolled main changes don't mix with live
# traffic.
#
# Cron: 7 * * * * /home/brrr/brrr-xlmarket/scripts/hourly-sync.sh >> /home/brrr/brrr-xlmarket/data/hourly-sync.log 2>&1

set -uo pipefail

REPO="/home/brrr/brrr-xlmarket"
LOG_DIR="$REPO/data/sync-reports"
LOCK="/tmp/xlmarket-hourly-sync.lock"
ESCALATION="$REPO/data/hourly-sync-ESCALATION.md"

mkdir -p "$LOG_DIR"

# Prevent overlap — 2 syncs at once is a recipe for merge hell
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date -Iseconds)] Another sync already running — exiting."
  exit 0
fi

cd "$REPO"

# Silent if nothing to do (cron mails on any output)
QUIET=${QUIET:-1}
log() { echo "[$(date -Iseconds)] $*"; }
loud() { QUIET=0; echo "[$(date -Iseconds)] $*"; }

# ── Safety gate ───────────────────────────────────────────────────────
# Never touch a dirty tree. Expect operator to commit/stash first.
DIRTY=$(git status --porcelain --untracked-files=no)
if [ -n "$DIRTY" ]; then
  loud "SKIP — working tree dirty. Commit or stash before sync can run."
  loud "$DIRTY"
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  loud "SKIP — not on main (current: $CURRENT_BRANCH)."
  exit 0
fi

# ── Fetch ─────────────────────────────────────────────────────────────
git fetch --all --prune 2>&1 | grep -v "^Fetching" || true

# ── 1. Fast-forward origin/main if new commits ────────────────────────
# AHEAD = local commits not yet pushed. BEHIND = remote commits not yet pulled.
AHEAD=$(git rev-list --count origin/main..main)
BEHIND=$(git rev-list --count main..origin/main)

if [ "$AHEAD" -gt 0 ] && [ "$BEHIND" -gt 0 ]; then
  loud "main diverged from origin/main (ahead $AHEAD, behind $BEHIND) — manual rebase or merge needed."
  exit 1
elif [ "$BEHIND" -gt 0 ]; then
  loud "Fast-forwarding main — $BEHIND new commit(s) from origin/main"
  git pull --ff-only origin main 2>&1 || {
    loud "FF pull failed — manual intervention required."
    exit 1
  }
fi
# AHEAD only (local unpushed commits, remote unchanged) is harmless — continue.

# ── 2. Scan feature branches for new commits to merge ─────────────────
# A branch qualifies if:
#   - it's under origin/ (remote tracking)
#   - not main, not HEAD
#   - has commits not yet on main
#
# Ordering: oldest-first so serial merges don't re-solve the same conflicts.
CANDIDATES=$(git for-each-ref --sort=committerdate \
  --format='%(refname:short) %(committerdate:unix)' refs/remotes/origin/ | \
  awk '$1 != "origin/HEAD" && $1 != "origin/main" {print $1}')

MERGED_ANY=0
ESCALATED=""

for branch in $CANDIDATES; do
  # Anything new on this branch vs main?
  NEW=$(git rev-list --count main..$branch 2>/dev/null || echo 0)
  if [ "$NEW" = "0" ]; then
    continue
  fi

  # Only follow branches committed to recently. 7 days is the rolling window —
  # anything older is assumed abandoned and should be merged manually or deleted.
  LAST_COMMIT=$(git log -1 --format=%ct $branch)
  NOW=$(date +%s)
  AGE_DAYS=$(( (NOW - LAST_COMMIT) / 86400 ))
  if [ "$AGE_DAYS" -gt 7 ]; then
    log "skip $branch — stale (last commit ${AGE_DAYS}d ago)"
    continue
  fi

  # Skip branches with a huge diff from main — probably long-lived features
  # that need a deliberate rebase, not an unattended merge.
  if [ "$NEW" -gt 50 ]; then
    log "skip $branch — too many commits ($NEW) behind main; needs manual rebase"
    continue
  fi

  loud "Trying merge $branch ($NEW new commit(s), age ${AGE_DAYS}d)..."

  # Try a dry-run merge first
  git merge --no-commit --no-ff "$branch" 2>/dev/null
  MERGE_STATUS=$?

  if [ $MERGE_STATUS -eq 0 ]; then
    # Clean merge — commit it
    git commit --no-edit -m "Merge $branch into main (auto hourly-sync)" 2>&1 | tail -2
    loud "OK merged $branch cleanly."
    MERGED_ANY=1
    continue
  fi

  # Conflict — try trivial auto-resolve
  CONFLICTED=$(git diff --name-only --diff-filter=U)
  loud "CONFLICT $branch — files: $CONFLICTED"

  # Auto-resolve rules (ordered from safest to riskiest):
  RESOLVED_ALL=1
  for f in $CONFLICTED; do
    case "$f" in
      # Generated JSON — always take whichever side regenerates freshest. Both
      # sides run the same generator; content is deterministic from YAML. Pick
      # --theirs (the incoming branch) so the branch's version wins, and then
      # immediately regen from YAML to reconcile properly.
      *.generated.json|backend/.medusa/types/*.d.ts|package-lock.json|yarn.lock|pnpm-lock.yaml)
        git checkout --theirs "$f" 2>/dev/null && git add "$f"
        log "  auto-resolve generated file: $f (took theirs)"
        ;;
      # Nothing else is trivially resolvable — real code needs human judgment.
      *)
        RESOLVED_ALL=0
        ;;
    esac
  done

  # Regenerate generated JSON files from YAML SSoT if script exists
  if [ "$RESOLVED_ALL" = "1" ] && [ -x "$REPO/scripts/gen-category-tree.mjs" ]; then
    node "$REPO/scripts/gen-category-tree.mjs" 2>&1 | tail -3 || true
    git add storefront/lib/category-tree.generated.json 2>/dev/null || true
  fi

  if [ "$RESOLVED_ALL" = "1" ]; then
    git commit --no-edit -m "Merge $branch into main — auto-resolved generated files (hourly-sync)" 2>&1 | tail -2
    loud "OK merged $branch after auto-resolving generated files."
    MERGED_ANY=1
  else
    # Real code conflict — abort merge, escalate, stop processing further branches
    git merge --abort 2>/dev/null
    loud "ESCALATE $branch — real code conflict needs human."
    ESCALATED="$ESCALATED $branch"
    break
  fi
done

# ── 3. If anything merged, run build + tests ──────────────────────────
if [ "$MERGED_ANY" = "1" ]; then
  loud "Running build validation..."
  REPORT="$LOG_DIR/sync-$(date +%Y-%m-%d-%H%M).log"

  cd "$REPO/storefront"
  if npm run build > "$REPORT" 2>&1; then
    loud "Build OK. Deployment not automatic — push manually when ready."
  else
    loud "BUILD FAILED — rolling back to pre-sync state."
    cd "$REPO"
    # Reset main to origin/main (remote version) so broken local merges don't persist
    git reset --hard origin/main 2>&1 | tail -2
    ESCALATED="$ESCALATED BUILD_FAILURE_SEE:$REPORT"
  fi
fi

# ── 4. Escalation report ──────────────────────────────────────────────
if [ -n "$ESCALATED" ]; then
  {
    echo "# Hourly-sync escalation — $(date -Iseconds)"
    echo ""
    echo "The following needs human attention:"
    for item in $ESCALATED; do
      echo "- \`$item\`"
    done
    echo ""
    echo "Recent log: $LOG_DIR/"
    echo ""
    echo "Run \`bash scripts/hourly-sync.sh\` again after resolving."
  } > "$ESCALATION"
  loud "Wrote escalation report: $ESCALATION"
else
  rm -f "$ESCALATION"
fi

if [ "$MERGED_ANY" = "0" ] && [ -z "$ESCALATED" ] && [ "$QUIET" = "1" ]; then
  exit 0
fi

loud "Done."
