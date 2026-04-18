#!/usr/bin/env bash
set -euo pipefail

# When invoked by cron most env vars are stripped — reload from entrypoint.
if [ -f /etc/backup.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /etc/backup.env
  set +a
fi

: "${BACKUP_DIR:=/backups}"
: "${LOCAL_RETENTION_DAYS:=7}"
: "${PGPORT:=5432}"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/notes-${TIMESTAMP}.dump"
LOG_PREFIX="[$(date -u +%FT%TZ)]"

echo "$LOG_PREFIX postgres-backup: starting dump of '$PGDATABASE' on $PGHOST:$PGPORT"

mkdir -p "$BACKUP_DIR"

# Custom format + max compression. --no-owner / --no-privileges keep the dump
# portable across environments (prod -> staging restore, for example).
PGPASSWORD="$PGPASSWORD" pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  --file="${BACKUP_FILE}.tmp"

mv "${BACKUP_FILE}.tmp" "$BACKUP_FILE"
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "$LOG_PREFIX postgres-backup: local dump complete — $BACKUP_FILE ($SIZE)"

if [ -n "${RCLONE_REMOTE:-}" ]; then
  REMOTE_PATH="${RCLONE_REMOTE%/}/notes-${TIMESTAMP}.dump"
  echo "$LOG_PREFIX postgres-backup: uploading to $REMOTE_PATH"
  rclone copyto "$BACKUP_FILE" "$REMOTE_PATH" \
    --s3-no-check-bucket \
    --stats=0 \
    --retries=3
  echo "$LOG_PREFIX postgres-backup: upload complete"
else
  echo "$LOG_PREFIX postgres-backup: RCLONE_REMOTE not set, skipping upload"
fi

# Prune local backups. Remote retention is the responsibility of the bucket
# lifecycle policy (see deploy/backup/README.md).
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'notes-*.dump' -mtime "+${LOCAL_RETENTION_DAYS}" -print -delete \
  | sed "s|^|$LOG_PREFIX postgres-backup: pruned |"

# Health marker used by Docker healthcheck.
touch "$BACKUP_DIR/.last-success"

echo "$LOG_PREFIX postgres-backup: run successful"
