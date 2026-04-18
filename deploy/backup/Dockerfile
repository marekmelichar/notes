FROM postgres:16-alpine

RUN apk add --no-cache \
    rclone \
    tzdata \
    bash \
    ca-certificates

ENV TZ=UTC \
    BACKUP_DIR=/backups \
    LOCAL_RETENTION_DAYS=7 \
    BACKUP_CRON="0 3 * * *" \
    RUN_ON_START=false

COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh

VOLUME ["/backups"]

HEALTHCHECK --interval=15m --timeout=30s --start-period=5m --retries=2 \
  CMD [ -f "$BACKUP_DIR/.last-success" ] \
      && [ $(( $(date +%s) - $(date -r "$BACKUP_DIR/.last-success" +%s) )) -lt 93600 ] \
      || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
