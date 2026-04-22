# Operations

Day-2 runbook: logs, backup, restore, troubleshooting. For deploy procedures see [deployment.md](./deployment.md).

## Logs

All services log to stdout/stderr; `docker compose logs` is the front door.

```bash
# Tail everything (last 200 lines)
docker compose -f docker-compose.prod.yml logs --tail=200 -f

# Single service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f keycloak
docker compose -f docker-compose.prod.yml logs -f nginx

# Since a timestamp
docker compose -f docker-compose.prod.yml logs --since=2h api
```

Useful filters:

```bash
# .NET errors
docker compose -f docker-compose.prod.yml logs api 2>&1 | grep -E '(ERR|fail|Exception)'

# 5xx at the edge
docker compose -f docker-compose.prod.yml logs nginx 2>&1 | grep ' 50[0-9] '

# Keycloak failed logins
docker compose -f docker-compose.prod.yml logs keycloak 2>&1 | grep -i 'login_error\|invalid_grant'
```

The API includes a `traceId` in every ProblemDetails error response — the same `traceId` is in the .NET log line. Cross-reference user-reported errors that way.

## Backups

> **There is no automated backup tooling in the repo today.** This is a known gap. The recommended stop-gap is below; productionizing it (cron + offsite copy) is on the to-do list.

### Manual Postgres dump

```bash
ssh deploy@<vps>
cd /opt/nettio
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dumpall -U postgres \
  | gzip > "backups/pgdumpall-$(date +%Y%m%dT%H%M%S).sql.gz"
```

This dumps **both** `notes` and `keycloak` databases plus globals (roles).

For app-only backups (smaller, faster):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres notes \
  | gzip > "backups/notes-$(date +%Y%m%dT%H%M%S).sql.gz"
```

### File attachments

Stored in the `uploads_data` Docker volume, mounted into the API container at `/app/uploads`.

```bash
# Snapshot to a tarball
docker run --rm \
  -v notes_uploads_data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine tar czf "/backup/uploads-$(date +%Y%m%dT%H%M%S).tar.gz" -C /data .
```

### Recommended (TODO)

- Cron the above on the host nightly.
- Push to S3 / Backblaze with lifecycle (e.g. 30 daily / 12 monthly).
- Test restore quarterly.

## Restore

### Postgres restore

> **Stop the API and Keycloak first** to prevent writes during restore.

```bash
ssh deploy@<vps>
cd /opt/nettio
docker compose -f docker-compose.prod.yml stop api keycloak

# Drop and recreate (destructive!)
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -c 'DROP DATABASE notes;'
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -c 'DROP DATABASE keycloak;'

# Restore from dump
gunzip -c backups/pgdumpall-<timestamp>.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U postgres

docker compose -f docker-compose.prod.yml start api keycloak
```

Verify:

```bash
curl https://notes.nettio.eu/api/health/ready
```

### File attachments restore

```bash
docker compose -f docker-compose.prod.yml stop api
docker run --rm \
  -v notes_uploads_data:/data \
  -v "$PWD/backups":/backup:ro \
  alpine sh -c 'rm -rf /data/* && tar xzf /backup/uploads-<timestamp>.tar.gz -C /data'
docker compose -f docker-compose.prod.yml start api
```

Check the `OrphanFileCleanupService` log on startup — it'll report any files that have no DB row (and may delete them after the configured grace period).

## TLS certificates

Let's Encrypt via certbot in a sidecar. Certs live in the `certbot` shared volume (mounted into the host as `deploy/certbot/conf` per the prod compose). The sidecar's entrypoint only runs `certbot renew` in a 12-hour loop — **it does not obtain initial certs**. Bootstrapping is a one-off step, documented below.

Edge Nginx references three cert bundles (`deploy/nginx.conf`):

- `nettio.eu` / `www.nettio.eu` → `live/nettio.eu/`
- `notes.nettio.eu` → `live/notes.nettio.eu/`
- `auth.nettio.eu` → `live/auth.nettio.eu/`

If any of those paths are missing at startup nginx will fail to load. HSTS is enabled (`max-age=63072000`), so once a browser has connected successfully it **cannot** click through a later cert error — keeping the renew loop healthy is not optional.

### Check expiry

```bash
# Current cert the edge is actually serving
echo | openssl s_client -servername notes.nettio.eu -connect notes.nettio.eu:443 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates

# All certs in the volume (via the helper)
bash deploy/check-certs.sh
```

`deploy/check-certs.sh` exits `1` if any cert expires within 20 days — wire it into cron (or a `@daily` Docker healthcheck) and mail on non-zero.

### Force renewal

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### First-time issuance (bootstrap)

Use when `deploy/certbot/conf/live/<domain>/` does not exist — e.g. fresh VPS, or the volume was wiped. The helper script handles the chicken-and-egg (nginx needs certs to start, certbot needs port 80 to issue them) by running certbot in `--standalone` mode while nginx is stopped:

```bash
# On the VPS, in /opt/nettio
sudo bash deploy/bootstrap-certs.sh you@example.com
docker compose -f docker-compose.prod.yml up -d
```

Set `CERTBOT_STAGING=1` to dry-run against Let's Encrypt's staging environment first (recommended on a new box — staging has no rate limit but issues an untrusted cert; delete it with `certbot delete --cert-name <domain>` before issuing the real one).

### Diagnosing `NET::ERR_CERT_AUTHORITY_INVALID`

HSTS makes this user-invisible-fixable; the fix must happen on the server. In order:

1. `docker compose -f docker-compose.prod.yml ps` — is `nginx` actually `Up`? If not, it's almost always a missing cert file referenced by `deploy/nginx.conf`. Check `logs nginx` for `cannot load certificate`.
2. `bash deploy/check-certs.sh` — expired or missing?
3. `docker compose -f docker-compose.prod.yml logs --tail=200 certbot` — what did the last renew say? Common failure: HTTP-01 challenge returning 404 because port 80 isn't reaching the container (firewall / cloud SG), or `/.well-known/acme-challenge/` routing broke.
4. `openssl s_client ... | openssl x509 -noout -issuer` — issuer `(STAGING) Pretend Pear` or `Fake LE` means someone issued against staging; delete and re-issue without `--staging`.
5. If cert is valid but the browser still rejects: check system clock drift on the VPS (`timedatectl`). A clock >24h off makes every cert look invalid.

## Routine maintenance

| Cadence | Task | Command / Notes |
|---|---|---|
| Per release | Smoke check | See [deployment.md → smoke checks](./deployment.md#smoke-checks-after-deploy) |
| Weekly | Disk usage | `df -h`, `docker system df` |
| Weekly | Image prune | `docker image prune -f` (CI does this on every deploy too) |
| Monthly | Backup verification | Restore latest dump to a scratch container, run smoke queries |
| Monthly | Log rotation review | Docker's default `json-file` driver — ensure `max-size`/`max-file` is set on the host |
| Quarterly | Dependency audit | `cd ui && npm audit`; .NET: `dotnet list package --vulnerable` |
| Quarterly | Restore drill | Spin up a parallel stack from a backup; smoke test it |

## Troubleshooting

### Frontend loads but API calls fail

1. `curl https://notes.nettio.eu/api/health/ready` — ready state?
2. Inspect Network tab in DevTools — is the request hitting the right base URL?
3. `cat /opt/nettio` `env.js` — does it have the right values? (`docker compose exec frontend cat /usr/share/nginx/html/env.js`)
4. Check Nginx access log for the request — is it being routed to the API container?

### "Invalid issuer" or 401 on every call

- Keycloak issuer mismatch. Verify `KC_HOSTNAME` in `docker-compose.prod.yml` matches what tokens contain (`jwt.io` decode the access token from a browser cookie/storage).
- The realm export's `realm` field and the URL must agree.

### Login redirects in a loop

- Redirect URI in the realm doesn't include the current origin → Keycloak silently fails the post-login redirect. Edit `notes-prod-realm.json`, restart `keycloak`.
- Cookies blocked / third-party cookie restrictions → check that the Keycloak SSO cookie can be set on the auth domain (current setup uses a top-window redirect, no iframe — see [auth.md § How `check-sso` works here](./auth.md#how-check-sso-works-here)).

### `503 Service Unavailable` from the edge

- One of the upstream containers is down or unhealthy. `docker compose ps` and check the `STATUS` column.
- Container is up but unresponsive → restart that service: `docker compose restart api`.

### Postgres won't accept connections

- `docker compose logs postgres` — usually a misconfigured env var or a corrupted volume.
- Disk full? `df -h /var/lib/docker`.
- Last resort: stop everything, snapshot the volume, drop it, restore from backup.

### Keycloak can't reach Postgres

- Check the `keycloak` service env vars: `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`. They reference `${POSTGRES_USER}` / `${POSTGRES_PASSWORD}` from `.env`.
- Network: both should be on the same Docker network (compose handles this by default).

### File uploads fail with `413 Request Entity Too Large`

- Nginx body cap. `client_max_body_size 101m` is set per location for `/api/`. Confirm your file is ≤ 100 MB.
- The API also enforces 100 MB at the application layer.

### High memory on the API container

- TipTap content can be large; the upload cap is 5 MB per note (Title+Content). Check the largest rows: `SELECT id, length(content) FROM "Notes" ORDER BY 2 DESC LIMIT 10;`
- Hosted services (`TrashCleanupService`, `OrphanFileCleanupService`) run on a timer — verify they're completing and not piling up.

## Pointers

| Concern | File |
|---|---|
| Prod compose | `docker-compose.prod.yml` |
| Edge Nginx | `deploy/nginx.conf` |
| Health endpoints | `api/EpoznamkyApi/Program.cs` |
| Hosted sweepers | `api/EpoznamkyApi/Services/{TrashCleanupService,OrphanFileCleanupService}.cs` |
| Volumes | `postgres_data`, `uploads_data` (defined in compose) |
