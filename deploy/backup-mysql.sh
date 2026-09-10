#!/usr/bin/env bash
# ==============================================================================
# POKÉVAULT LEGENDS — AUTOMATED MYSQL DATABASE BACKUP & ROTATION
# Setup in crontab (Runs daily at 2:00 AM):
#   0 2 * * * /opt/pokevault/deploy/backup-mysql.sh >> /var/log/pokevault/backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/mysql}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pokevault_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

# MySQL Container Details
CONTAINER_NAME="pokevault-mysql"
DB_NAME="pokevault"
DB_USER="pokevault"
DB_PASS="pokevault_secret"

mkdir -p "$BACKUP_DIR"

echo "---------------------------------------------------------------"
echo "[$(date)] Starting automated MySQL backup for '${DB_NAME}'..."

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] Container '${CONTAINER_NAME}' is not running!" >&2
    exit 1
fi

# Execute mysqldump inside container and compress output on host
docker exec "$CONTAINER_NAME" mysqldump \
    -u "$DB_USER" \
    -p"$DB_PASS" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    "$DB_NAME" | gzip -9 > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[SUCCESS] Backup created at: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Purge backups older than RETENTION_DAYS
echo "[CLEANUP] Removing backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "pokevault_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;

echo "[$(date)] Backup and rotation completed cleanly."
