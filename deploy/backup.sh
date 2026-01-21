#!/bin/bash
# Backup script for epoznamky.cz
# Usage: ./backup.sh [backup_dir]
#
# Setup (on production server):
#   1. Make executable: chmod +x /path/to/deploy/backup.sh
#   2. Create backup directory: mkdir -p /var/backups/epoznamky
#   3. Add to crontab (crontab -e):
#      0 3 * * * /path/to/epoznamky.cz/deploy/backup.sh /var/backups/epoznamky

set -e

APP_DIR="/opt/epoznamky"
BACKUP_DIR="${1:-/var/backups/epoznamky}"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup epoznamky database
EPOZNAMKY_BACKUP="$BACKUP_DIR/epoznamky-$TIMESTAMP.sql.gz"
docker exec epoznamky-db pg_dump -U postgres epoznamky | gzip > "$EPOZNAMKY_BACKUP"
echo "Backup created: $EPOZNAMKY_BACKUP"

# Backup keycloak database
KEYCLOAK_BACKUP="$BACKUP_DIR/keycloak-$TIMESTAMP.sql.gz"
docker exec epoznamky-db pg_dump -U postgres keycloak | gzip > "$KEYCLOAK_BACKUP"
echo "Backup created: $KEYCLOAK_BACKUP"

# Backup .env file (contains credentials)
if [ -f "$APP_DIR/.env" ]; then
    ENV_BACKUP="$BACKUP_DIR/env-$TIMESTAMP.backup"
    cp "$APP_DIR/.env" "$ENV_BACKUP"
    chmod 600 "$ENV_BACKUP"
    echo "Backup created: $ENV_BACKUP"
fi

# Backup SSL certificates (weekly - only on Sundays)
if [ "$(date +%u)" = "7" ]; then
    SSL_BACKUP="$BACKUP_DIR/ssl-certs-$TIMESTAMP.tar.gz"
    tar -czf "$SSL_BACKUP" -C "$APP_DIR/deploy/certbot" conf 2>/dev/null || true
    echo "Backup created: $SSL_BACKUP"
fi

# Backup uploads directory (if exists)
UPLOADS_DIR="$APP_DIR/uploads"
if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
    UPLOADS_BACKUP="$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz"
    tar -czf "$UPLOADS_BACKUP" -C "$APP_DIR" uploads
    echo "Backup created: $UPLOADS_BACKUP"
fi

# Remove backups older than retention period
find "$BACKUP_DIR" -name "epoznamky-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "keycloak-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env-*.backup" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "ssl-certs-*.tar.gz" -mtime +30 -delete  # Keep SSL backups for 30 days
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete"
