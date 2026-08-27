#!/usr/bin/env bash
# AutoCare — PostgreSQL restore script
# Usage: ./scripts/restore.sh <backup_file> [container_name] [database_name]
#
# Example: ./scripts/restore.sh backups/autocare_20260827_120000.sql.gz
#
# WARNING: This REPLACES all data in the target database.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file> [container_name] [database_name]"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="${2:-autocare-db}"
DATABASE="${3:-autocare}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "WARNING: This will replace ALL data in database '${DATABASE}' on container '${CONTAINER}'."
read -rp "Type 'YES' to confirm: " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

echo "Dropping and recreating database..."
docker exec "$CONTAINER" psql -U autocare -d postgres -c \
  "DROP DATABASE IF EXISTS ${DATABASE}; CREATE DATABASE ${DATABASE};"

echo "Restoring from ${BACKUP_FILE}..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U autocare -d "$DATABASE" -q

echo "Restore complete. Run 'pnpm db:generate' to regenerate the Prisma client."
