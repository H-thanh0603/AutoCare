#!/usr/bin/env bash
# AutoCare — PostgreSQL backup script
# Usage: ./scripts/backup.sh [container_name] [database_name]
#
# Defaults: container=autocare-db, database=autocare
# Backups are saved to ./backups/ with timestamp suffix.

set -euo pipefail

CONTAINER="${1:-autocare-db}"
DATABASE="${2:-autocare}"
BACKUP_DIR="./backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="autocare_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up ${DATABASE} from container ${CONTAINER}..."
docker exec "$CONTAINER" pg_dump -U autocare "$DATABASE" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

FILESIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "Backup saved: ${BACKUP_DIR}/${FILENAME} (${FILESIZE})"

# Keep only the last 7 backups (adjust as needed)
cd "$BACKUP_DIR"
ls -1t autocare_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
REMAINING=$(ls -1t autocare_*.sql.gz 2>/dev/null | wc -l)
echo "Backups on disk: ${REMAINING}"
