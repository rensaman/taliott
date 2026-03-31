#!/usr/bin/env bash
# Pulls main branch and redeploys changed containers.
#
# Usage: ./scripts/deploy.sh [--force]
#   --force  redeploy even if no git changes detected

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
LOG_FILE="/var/log/taliott-deploy.log"
FORCE=false

[[ "${1:-}" == "--force" ]] && FORCE=true

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR"

log "=== Deploy started ==="

# ── 1. Fetch & detect changes ────────────────────────────────────────────────
git fetch origin main 2>&1 | while IFS= read -r line; do log "git: $line"; done

CURRENT=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$CURRENT" = "$REMOTE" ] && [ "$FORCE" = false ]; then
  log "Already up to date ($CURRENT). Nothing to do."
  log "=== Deploy skipped ==="
  exit 0
fi

log "Changes detected: $CURRENT → $REMOTE"
CHANGED=$(git diff --name-only HEAD origin/main)

if [ -n "$CHANGED" ]; then
  log "Changed files:"
  while IFS= read -r f; do log "  $f"; done <<< "$CHANGED"
fi

# ── 2. Classify changes ──────────────────────────────────────────────────────
REBUILD_BACKEND=false
REBUILD_FRONTEND=false
REBUILD_OTP=false
RESTART_IMAGE_SERVICES=false

while IFS= read -r file; do
  case "$file" in
    backend/*|prisma/*|package.json|package-lock.json)
      REBUILD_BACKEND=true ;;
    frontend/*)
      REBUILD_FRONTEND=true ;;
    otp/*)
      REBUILD_OTP=true ;;
    docker-compose*.yml|Caddyfile)
      RESTART_IMAGE_SERVICES=true ;;
  esac
done <<< "$CHANGED"

# Force flag rebuilds all app containers
if [ "$FORCE" = true ]; then
  REBUILD_BACKEND=true
  REBUILD_FRONTEND=true
  REBUILD_OTP=true
fi

# ── 3. Pull ──────────────────────────────────────────────────────────────────
log "Pulling origin/main..."
git pull origin main 2>&1 | while IFS= read -r line; do log "git: $line"; done

# ── 4. Rebuild & restart app containers ─────────────────────────────────────
BUILD_TARGETS=()
[ "$REBUILD_BACKEND" = true ]  && BUILD_TARGETS+=(backend)
[ "$REBUILD_FRONTEND" = true ] && BUILD_TARGETS+=(frontend)
[ "$REBUILD_OTP" = true ]      && BUILD_TARGETS+=(otp)

if [ ${#BUILD_TARGETS[@]} -gt 0 ]; then
  log "Building & restarting: ${BUILD_TARGETS[*]}"
  $COMPOSE build "${BUILD_TARGETS[@]}" 2>&1 | while IFS= read -r line; do log "build: $line"; done
  $COMPOSE up -d --no-deps "${BUILD_TARGETS[@]}" 2>&1 | while IFS= read -r line; do log "up: $line"; done
fi

# ── 5. Restart image-based services if compose config changed ───────────────
if [ "$RESTART_IMAGE_SERVICES" = true ]; then
  log "Compose config changed — restarting image-based services..."
  $COMPOSE up -d --no-deps --no-recreate caddy postgres postgres-umami umami otp \
    2>&1 | while IFS= read -r line; do log "up: $line"; done
fi

# ── 6. Remove dangling images to free disk space ────────────────────────────
docker image prune -f 2>&1 | while IFS= read -r line; do log "prune: $line"; done

log "=== Deploy complete ==="
