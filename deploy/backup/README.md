# Postgres backup service

Nightly logical backups of the `notes` database, pushed to an off-host
S3-compatible object store. Runs as the `postgres-backup` service in
`docker-compose.prod.yml`.

## What it does

- `pg_dump -Fc --compress=9` once per day (cron, default `0 3 * * *` UTC)
- Writes the dump to the `backups_data` Docker volume
- `rclone copyto` the dump to the configured remote
- Prunes local dumps older than `LOCAL_RETENTION_DAYS` (default 7 days)
- Exposes a Docker healthcheck that goes unhealthy if no successful backup has
  completed in 26 hours

Remote retention is **not** handled by the service — configure a bucket
lifecycle policy on the object store side (examples below).

## Configure the remote (one-time)

The service reads rclone config from environment variables, so there is **no
`rclone.conf` to mount** — everything goes in the host's `.env` file next to
`docker-compose.prod.yml`.

### Contabo Object Storage (recommended — same provider as the VPS)

In the Contabo customer panel, create an S3-compatible bucket and an access
key pair. Then add to the host `.env`:

```ini
# .env on the VPS
RCLONE_CONFIG_NOTES_TYPE=s3
RCLONE_CONFIG_NOTES_PROVIDER=Other
RCLONE_CONFIG_NOTES_ACCESS_KEY_ID=<contabo-access-key>
RCLONE_CONFIG_NOTES_SECRET_ACCESS_KEY=<contabo-secret-key>
RCLONE_CONFIG_NOTES_ENDPOINT=https://eu2.contabostorage.com
RCLONE_CONFIG_NOTES_REGION=default
RCLONE_CONFIG_NOTES_ACL=private

BACKUP_RCLONE_REMOTE=notes:notes-backups
```

The `notes` in `notes:notes-backups` is the remote name (matches
`RCLONE_CONFIG_NOTES_*`); `notes-backups` is the bucket name — create it first.

### Backblaze B2

```ini
RCLONE_CONFIG_NOTES_TYPE=b2
RCLONE_CONFIG_NOTES_ACCOUNT=<b2-application-key-id>
RCLONE_CONFIG_NOTES_KEY=<b2-application-key>
RCLONE_CONFIG_NOTES_HARD_DELETE=true

BACKUP_RCLONE_REMOTE=notes:notes-backups
```

### Cloudflare R2

```ini
RCLONE_CONFIG_NOTES_TYPE=s3
RCLONE_CONFIG_NOTES_PROVIDER=Cloudflare
RCLONE_CONFIG_NOTES_ACCESS_KEY_ID=<r2-access-key>
RCLONE_CONFIG_NOTES_SECRET_ACCESS_KEY=<r2-secret-key>
RCLONE_CONFIG_NOTES_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
RCLONE_CONFIG_NOTES_ACL=private

BACKUP_RCLONE_REMOTE=notes:notes-backups
```

## Remote retention (bucket lifecycle)

The service only prunes *local* dumps. Set a lifecycle rule on the bucket so
old backups expire on their own.

**Contabo / S3-compatible:**

```xml
<LifecycleConfiguration>
  <Rule>
    <ID>expire-old-backups</ID>
    <Status>Enabled</Status>
    <Filter><Prefix>notes-</Prefix></Filter>
    <Expiration><Days>30</Days></Expiration>
  </Rule>
</LifecycleConfiguration>
```

Apply with:

```bash
aws --endpoint-url=https://eu2.contabostorage.com s3api \
  put-bucket-lifecycle-configuration \
  --bucket notes-backups \
  --lifecycle-configuration file://lifecycle.json
```

**Backblaze B2:** set "Lifecycle Settings" on the bucket in the B2 UI — pick
the preset "Keep prior versions for this number of days: 30".

## Run a backup manually

```bash
docker compose -f docker-compose.prod.yml exec postgres-backup \
  /usr/local/bin/backup.sh
```

## Verify the schedule is working

```bash
# Healthcheck — must say "healthy" after ~26h of first successful backup
docker inspect --format '{{.State.Health.Status}}' nettio-notes-backup

# Last successful run
docker compose -f docker-compose.prod.yml exec postgres-backup \
  date -u -r /backups/.last-success

# List local dumps
docker compose -f docker-compose.prod.yml exec postgres-backup \
  ls -lh /backups/

# List remote dumps (run from host, with rclone CLI configured the same way)
rclone ls notes:notes-backups/
```

## Restore drill

**Restore the most recent local dump** (into the live database — use with care):

```bash
docker compose -f docker-compose.prod.yml run --rm postgres-backup \
  /usr/local/bin/restore.sh
```

**Restore a specific remote dump:**

```bash
docker compose -f docker-compose.prod.yml run --rm postgres-backup \
  /usr/local/bin/restore.sh --remote notes-20260418T030000Z.dump
```

The script prompts for `yes` confirmation because `pg_restore --clean
--if-exists` drops and recreates existing objects.

## Quarterly drill (recommended)

Every 3 months, restore the latest dump into a throwaway container and verify
the app boots against it. Reason: a backup is only as good as the last
successful restore.

```bash
# Spin up a throwaway postgres, restore into it, point a local API at it
docker run -d --name pg-restore-drill \
  -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16-alpine

rclone copy notes:notes-backups/ ./drill --include 'notes-*.dump' --max-age 2d
LATEST=$(ls -t ./drill/*.dump | head -n1)

PGPASSWORD=test pg_restore -h localhost -p 5433 -U postgres \
  --create --dbname=postgres --clean --if-exists "$LATEST"

docker rm -f pg-restore-drill
```

## Cost estimate

Assuming a 50 MB uncompressed dump (≈10 MB compressed), 30 days retention:

| Provider | Monthly cost |
|---|---|
| Contabo Object Storage | €0 (included in VPS bundle on most plans) |
| Backblaze B2 | ~$0.01/month storage, free egress ≤ 3x storage |
| Cloudflare R2 | ~$0.01/month storage, zero egress |

All three are functionally equivalent for this use case. Pick whichever has
the lowest egress friction if you ever need to restore.
