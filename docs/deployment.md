# Deployment

Production runs as Docker Compose on a single VPS, fronted by Nginx + Let's Encrypt. CI builds and pushes images to GHCR; deploy is a `scp` + `ssh` job that pulls + restarts.

## Topology

```mermaid
flowchart TB
    subgraph GH[GitHub]
        Repo[main branch]
        Actions[Actions: deploy.yml]
        GHCR[(ghcr.io<br/>frontend:latest<br/>api:latest)]
    end

    subgraph VPS[Production VPS]
        subgraph Edge[nettio-platform repo — /opt/nettio-platform]
            Nginx[edge-nginx<br/>:80, :443]
            Certbot[edge-certbot<br/>renew loop]
            KC[auth-keycloak 26.0.8<br/>realm nettio, own DB]
        end
        subgraph Compose[docker-compose.prod.yml — /opt/notes]
            UI[frontend:latest<br/>:3000 internal]
            API[api:latest<br/>:8080 internal]
            DB[(postgres:16)]
        end
        EnvFile[.env<br/>secrets]
    end

    Repo -->|push to main| Actions
    Actions -->|build + push| GHCR
    Actions -->|scp compose| VPS
    Actions -->|ssh: pull + up -d| Compose
    GHCR -.->|pull on deploy| UI
    GHCR -.->|pull on deploy| API
    EnvFile -.->|env_file| Compose

    User((User)) -->|HTTPS| Nginx
    Nginx -->|edge network| UI
    Nginx -->|edge network| API
    Nginx -->|edge network| KC
    API -->|edge network: keys| KC
```

## CI/CD pipeline

`.github/workflows/deploy.yml` triggers on push to `main` (or `workflow_dispatch` with `force_build_all`).

Jobs (path-filtered via `dorny/paths-filter`):

| Job | Trigger | Action |
|---|---|---|
| `changes` | always | Determines which paths changed |
| `build-api` | `api/**` changed | Docker build → push `ghcr.io/<repo>/api:{latest, sha}` |
| `build-ui` | `ui/**` changed | Docker build → push `ghcr.io/<repo>/frontend:{latest, sha}` |
| `deploy` | any of above succeeded **or** `docker-compose.prod.yml`/`init-db.sql`/`notes-prod-realm.json` changed | scp configs to `/opt/notes`; ssh `docker compose pull && up -d && image prune` |

If a change touches **only docs** (or another non-deploying path), the workflow runs but every build skips and `deploy` is gated off — the system is left untouched.

### Required GitHub secrets

| Secret | Used for |
|---|---|
| `GITHUB_TOKEN` | (auto) GHCR push + login |
| `VPS_HOST` | SSH target |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private key for SSH |

## Production stack

`docker-compose.prod.yml` (compose project `notes`) defines three services. TLS, the reverse proxy, the landing page and the **shared login** (Keycloak, realm `nettio`, at `https://auth.nettio.eu`) belong to the separate **nettio-platform** repo; `frontend` and `api` also join its external `edge` network as `notes-frontend` and `notes-api`, and the API reaches Keycloak there as `auth-keycloak`.

| Service | Image | Purpose | Notes |
|---|---|---|---|
| `postgres` | `postgres:16` | `notes` DB (its old `keycloak` DB is unused since the move to the shared login) | External volume `nettio_postgres_data` (pinned name; never rename), init `init-db.sql` |
| `api` | `ghcr.io/<repo>/api:latest` | .NET API | External volume `nettio_uploads_data:/app/uploads` |
| `frontend` | `ghcr.io/<repo>/frontend:latest` | React SPA via internal Nginx | `docker-entrypoint.sh` rewrites `env.js` from `${API_URL}`, `${KEYCLOAK_URL}`, `${KEYCLOAK_REALM}`, `${KEYCLOAK_CLIENT_ID}` |

### Required environment variables

Production reads from `/opt/notes/.env` on the host. Template at the repo root: `.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_USER` | yes | Postgres superuser |
| `POSTGRES_PASSWORD` | **yes** | `:?` syntax in compose — fails fast if missing |
| `GITHUB_REPOSITORY` | yes | For GHCR image URI (e.g. `marekmelichar/notes`) |

The `:?` syntax means the deploy will refuse to start if those secrets are absent — this is intentional. Put them in `.env`, never in compose or git.

## Edge Nginx config

Lives in the **nettio-platform** repo (`nginx/sites/notes.conf` and `auth.conf`), served by `edge-nginx`:

- HTTP → HTTPS redirect (with ACME challenge passthrough)
- TLSv1.2+, HSTS, secure ciphers
- `notes.nettio.eu`:
  - `/api/` → `notes-api:8080`
  - `/realms/notes/*` → 301 to `https://auth.nettio.eu/realms/nettio/*`; other `/realms/`, `/resources/`, `/js/` → 301 to `auth.nettio.eu` (old links)
  - everything else → `notes-frontend:80` (which itself does SPA fallback)
- `auth.nettio.eu` → the shared Keycloak (login for every project, admin console under `/admin/`)
- `client_max_body_size 101m` for the API location (matches the 100 MB upload cap + headers)

## Deploy procedures

### Standard deploy (push to main)

```bash
# Just merge to main. CI does the rest.
gh pr merge --squash <PR-number>
```

Watch the workflow:

```bash
gh run watch
# or
gh run list --workflow=deploy.yml
```

### Force rebuild everything

Useful after dependency upgrades or base image refreshes:

```bash
gh workflow run deploy.yml -f force_build_all=true
```

### Manual deploy from a workstation

If GitHub Actions is unavailable but you have SSH:

```bash
# Build locally + push to GHCR (needs PAT with write:packages)
echo "$GHCR_PAT" | docker login ghcr.io -u <username> --password-stdin
docker build -t ghcr.io/<repo>/api:latest ./api/EpoznamkyApi && docker push !$
docker build -t ghcr.io/<repo>/frontend:latest ./ui && docker push !$

# Deploy
ssh deploy@<vps> 'cd /opt/notes \
  && docker compose -f docker-compose.prod.yml pull \
  && docker compose -f docker-compose.prod.yml up -d \
  && docker image prune -f'
```

### Rollback

Every build is also tagged with the commit SHA. To roll back:

```bash
ssh deploy@<vps>
cd /opt/notes
# Find the SHA you want
docker images | grep -E '(api|frontend)'
# Edit docker-compose.prod.yml to pin :{sha} for the affected service
# Or override at the command line:
GITHUB_REPOSITORY=marekmelichar/notes \
  docker compose -f docker-compose.prod.yml up -d \
    --no-deps api  # or frontend
# Once stable, push a revert PR so the next CI run uses the right code.
```

## Database migrations

Migrations are **not** auto-applied in production (only Development). After a deploy that includes a new migration:

```bash
ssh deploy@<vps>
cd /opt/notes
docker compose -f docker-compose.prod.yml exec api dotnet ef database update
```

Check schema state:

```bash
docker compose -f docker-compose.prod.yml exec api dotnet ef migrations list
```

If a migration fails halfway, **don't auto-rollback** — inspect the DB, decide whether to forward-fix (new migration) or restore from backup. See [operations.md](./operations.md#postgres-restore).

## Smoke checks after deploy

```bash
# Health
curl https://notes.nettio.eu/api/health/live   # 200 "Healthy"
curl https://notes.nettio.eu/api/health/ready  # 200 if DB reachable

# Frontend renders
curl -I https://notes.nettio.eu/               # 200
curl -I https://notes.nettio.eu/env.js         # 200, no-store

# Keycloak well-known
curl https://auth.nettio.eu/realms/nettio/.well-known/openid-configuration | jq .issuer
```

If anything 5xx's, head straight to [operations.md → troubleshooting](./operations.md#troubleshooting).

## Pointers

| Concern | File |
|---|---|
| CI workflow | `.github/workflows/deploy.yml` |
| Prod compose | `docker-compose.prod.yml` |
| Edge Nginx | nettio-platform repo: `nginx/sites/notes.conf`, `auth.conf` |
| Frontend Nginx (in-container) | `ui/nginx.conf` |
| Frontend runtime config injection | `ui/docker-entrypoint.sh` |
| Env template | `.env.example` |
| DB init | `init-db.sql` |
| Realm config (prod) | `notes-prod-realm.json` |
