#!/bin/bash
# ##############################################################
# ServiceDesk Backup Script
# ##############################################################
# Usage: ./scripts/backup.sh [--pg] [--rotate N]
#
#   --pg       Also dump PostgreSQL (requires pg_dump)
#   --rotate N Keep only N most recent backups (default: 7)
# ##############################################################
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/root/servicedesk/backup}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ROTATE="${2:-7}"
PG_ENABLED=false

if [ "${1:-}" = "--pg" ] || [ "${2:-}" = "--pg" ]; then
    PG_ENABLED=true
fi

mkdir -p "$BACKUP_DIR/sqlite" "$BACKUP_DIR/pg" "$BACKUP_DIR/logs" "$BACKUP_DIR/config"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/logs/backup_$TIMESTAMP.log"; }

log "=== Backup started ==="

# --- SQLite ---
SQLITE_SRC="/root/servicedesk/data/servicedesk.db"
SQLITE_DST="$BACKUP_DIR/sqlite/servicedesk_$TIMESTAMP.db"

if [ -f "$SQLITE_SRC" ]; then
    sqlite3 "$SQLITE_SRC" "VACUUM INTO '$SQLITE_DST'"
    gzip -f "$SQLITE_DST"
    log "SQLite backed up: ${SQLITE_DST}.gz ($(du -h "${SQLITE_DST}.gz" | cut -f1))"
else
    log "WARNING: SQLite database not found at $SQLITE_SRC"
fi

# --- PostgreSQL (if --pg flag) ---
if [ "$PG_ENABLED" = true ] && command -v pg_dump &>/dev/null; then
    PG_DST="$BACKUP_DIR/pg/servicedesk_$TIMESTAMP.sql.gz"
    PGPASSWORD="${PGPASSWORD:-}" pg_dump \
        -h "${PGHOST:-localhost}" \
        -p "${PGPORT:-5432}" \
        -U "${PGUSER:-postgres}" \
        -d "${PGDATABASE:-servicedesk}" \
        --no-owner --no-acl \
        2>>"$BACKUP_DIR/logs/backup_$TIMESTAMP.log" | gzip > "$PG_DST"
    log "PostgreSQL backed up: $PG_DST ($(du -h "$PG_DST" | cut -f1))"
fi

# --- Config files ---
CONFIG_DST="$BACKUP_DIR/config/config_$TIMESTAMP.tar.gz"
tar czf "$CONFIG_DST" \
    -C /root/servicedesk \
    .env docker-compose.yml nginx.conf \
    backend/Dockerfile backend/requirements.txt 2>/dev/null || true
log "Config backed up: $CONFIG_DST"

# --- Rotation ---
for dir in sqlite pg; do
    count="$(ls -1 "$BACKUP_DIR/$dir/" 2>/dev/null | wc -l)"
    if [ "$count" -gt "$ROTATE" ]; then
        ls -1t "$BACKUP_DIR/$dir/" | tail -n +$((ROTATE + 1)) | while read f; do
            rm -f "$BACKUP_DIR/$dir/$f"
            log "Rotated out: $BACKUP_DIR/$dir/$f"
        done
    fi
done

log "=== Backup completed successfully ==="
