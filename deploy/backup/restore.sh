#!/usr/bin/env bash
set -euo pipefail

# Reload env persisted by entrypoint (needed when invoked via `docker compose
# run --rm postgres-backup restore.sh`).
if [ -f /etc/backup.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /etc/backup.env
  set +a
fi

: "${BACKUP_DIR:=/backups}"
: "${PGPORT:=5432}"

usage() {
  cat <<EOF
Usage:
  restore.sh                      Restore the most recent local dump
  restore.sh <path>               Restore a specific local dump
  restore.sh --remote <filename>  Download a remote dump and restore it

Examples:
  docker compose -f docker-compose.prod.yml run --rm postgres-backup restore.sh
  docker compose -f docker-compose.prod.yml run --rm postgres-backup restore.sh \\
      /backups/notes-20260418T030000Z.dump
  docker compose -f docker-compose.prod.yml run --rm postgres-backup restore.sh \\
      --remote notes-20260418T030000Z.dump

The target database is \$PGDATABASE on \$PGHOST. Data will be dropped and
recreated from the dump (pg_restore --clean --if-exists).
EOF
}

FILE=""

if [ $# -eq 0 ]; then
  FILE=$(ls -t "$BACKUP_DIR"/notes-*.dump 2>/dev/null | head -n1 || true)
elif [ "$1" = "--remote" ]; then
  [ -n "${2:-}" ] || { usage; exit 2; }
  [ -n "${RCLONE_REMOTE:-}" ] || { echo "RCLONE_REMOTE is not configured"; exit 2; }
  REMOTE_PATH="${RCLONE_REMOTE%/}/$2"
  FILE="$BACKUP_DIR/$2"
  echo "Downloading $REMOTE_PATH -> $FILE"
  rclone copyto "$REMOTE_PATH" "$FILE"
elif [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  usage; exit 0
else
  FILE="$1"
fi

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "No dump file found."; echo; usage; exit 1
fi

echo
echo "About to restore '$FILE' into database '$PGDATABASE' on $PGHOST:$PGPORT."
echo "This DROPS and recreates existing objects. There is no undo."
echo

# Skip confirmation when running non-interactively (e.g. from another script
# that knows what it's doing and already confirmed).
if [ -t 0 ]; then
  read -r -p "Type 'yes' to proceed: " CONFIRM
  [ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }
fi

PGPASSWORD="$PGPASSWORD" pg_restore \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --clean --if-exists \
  --no-owner --no-privileges \
  --verbose \
  "$FILE"

echo "Restore complete."
