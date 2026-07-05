# Attack Surface Inventory

> **Living document.** This is the running, continuously-updated inventory of everything we
> operate — every host, service, database, web property, API, vendor, and technology — and the
> total attack surface each one presents. Keep it current.
>
> - **Maintained by** the `AttackSurface` skill (`.claude/skills/attacksurface/SKILL.md`). Invoke it
>   whenever infrastructure changes (new service, new exposure, config change, retired system).
> - **Assessed by** the `AssessAttackSurface` workflow (`.claude/skills/assess-attack-surface/SKILL.md`).
>   Use it to actually test any surface below and to (re)derive its testing cadence.
> - **Last full review:** 2026-07-05
> - **Scope today:** the `notes.nettio.eu` production deployment (single VPS, Docker Compose) plus
>   its CI/CD and vendor dependencies. Additional projects get appended as new `## System` sections.

## How to read this file

Each system is one `## System` block with a fixed set of fields so entries stay comparable:

| Field | Meaning |
|---|---|
| **Type** | web property / API / database / auth (IdP) / reverse proxy / object store / host / CI-CD / vendor |
| **Hosting** | self-hosted vs third-party (SaaS/managed) |
| **Tech** | the concrete platform + version |
| **Authentication** | how *we* (or users) authenticate into it |
| **Exposure** | audience reachability — one or more of: `public`, `internal-only`, `behind-VPN`, `token-required`, `OAuth/OIDC`, `SSH-key`, `localhost-only` |
| **Deployed here** | everything we run on / store in this system |
| **Defenses** | security mechanisms currently protecting it |
| **Common issues** | the well-known vulnerability & misconfiguration classes for this platform |
| **Our gaps** | known-open items specific to this system (cross-referenced to docs) |
| **Assess** | recommended test cadence + method (see [Testing cadence](#testing-cadence-summary)) |

## Exposure legend

| Tag | Meaning |
|---|---|
| `public` | Reachable from the open internet by anyone |
| `token-required` | Public endpoint but needs a bearer/JWT to do anything |
| `OAuth/OIDC` | Access gated by an OIDC login (Keycloak) |
| `internal-only` | Only reachable on the private Docker network / loopback |
| `localhost-only` | Bound to loopback on the host |
| `SSH-key` | Reachable only with the deploy SSH private key |
| `unguessable-URL` | "Public" but protected by high-entropy identifier only |

---

## System: Edge Nginx reverse proxy

- **Type:** reverse proxy / TLS edge (also serves the static landing site)
- **Hosting:** self-hosted (Docker container `nettio-nginx` on the VPS)
- **Tech:** `nginx:1.27-alpine`, config in `deploy/nginx.conf`
- **Authentication:** none at the proxy itself — it is the unauthenticated front door; auth is
  delegated downstream to Keycloak/JWT. Publishes host ports `80` and `443`.
- **Exposure:** `public` (the only component with published ports; everything else sits behind it)
- **Deployed here:**
  - TLS termination for four vhosts: `nettio.eu`, `www.nettio.eu`, `notes.nettio.eu`, `auth.nettio.eu`
  - Static landing page (`nettio.eu` → `/var/www/nettio`, mounted read-only from the host)
  - Reverse-proxy routes on `notes.nettio.eu`: `/api/` → API, `/realms/` `/resources/` `/js/` → Keycloak, `/` → frontend
  - `auth.nettio.eu` → Keycloak admin
  - ACME `/.well-known/acme-challenge/` passthrough for cert renewal
- **Defenses:**
  - TLS 1.2/1.3 only, curated ECDHE-GCM cipher list, `ssl_prefer_server_ciphers off`
  - HSTS `max-age=63072000` on every HTTPS vhost (`always`)
  - HTTP→HTTPS 301 for all hosts (ACME path excepted)
  - `client_max_body_size 101m` scoped to `/api/` (matches the 100 MB upload cap)
  - Forwards `X-Forwarded-Proto`/`-For`/`Host`; internal upstreams are plain HTTP on a private network
- **Common issues (nginx edge):**
  - Missing/weak security headers passed through (no CSP set here — see API/UI entries)
  - SSRF / open-proxy via `proxy_pass` with variables + `resolver` (dynamic upstream resolution is in use — keep locations pinned to named services, never user-controlled hosts)
  - Request smuggling from proxy/upstream HTTP-version mismatches
  - Info leak via `Server` version header / default error pages
  - Overly-broad `server_name`/default-vhost fallthrough → SNI cert mismatch (see [operations.md](docs/operations.md#retiring-a-domain))
  - TLS misconfig (protocol downgrade, weak ciphers, OCSP stapling absent)
- **Our gaps:** no CSP; no `Server` token suppression; no rate limiting at the edge (only in the API layer). See [docs/security.md](docs/security.md#open-security-to-do).
- **Assess:** **Quarterly** external TLS + header scan (cheap, automatable). Ad-hoc after any `deploy/nginx.conf` change.

---

## System: Frontend SPA / PWA

- **Type:** web property (single-page app, installable PWA)
- **Hosting:** self-hosted (container `nettio-notes-frontend`, internal nginx serving static build)
- **Tech:** React 19 + TypeScript + Vite 7, MUI v6, TipTap/ProseMirror, Redux Toolkit, `keycloak-js`, service worker (vite-plugin-pwa). Served by in-container nginx (`ui/nginx.conf`).
- **Authentication:** end users log in via Keycloak (OIDC, PKCE S256) through `keycloak-js`; tokens held in memory, attached as bearer by the Axios client (`ui/src/lib/apiManager.ts`).
- **Exposure:** `public` (static assets) + `OAuth/OIDC` for anything data-bearing. Runtime config is served openly at the `env.js` route (Keycloak URL/realm/client-id — non-secret by design).
- **Deployed here:**
  - Compiled SPA bundle, locales (`en`, `cs`), PWA manifest + service worker
  - `ui/public/env.js` runtime config, rewritten on container boot by `ui/docker-entrypoint.sh`
- **Defenses:**
  - `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block` (`ui/nginx.conf`)
  - the `env.js` route served `no-store` so config rotates instantly
  - No secrets in the bundle; Keycloak client is a **public** PKCE client (no client secret to leak)
  - Tokens not persisted to `localStorage` by `keycloak-js` (in-memory + refresh)
- **Common issues (SPA/PWA):**
  - XSS via rich-text/HTML rendering (TipTap content is user HTML — sanitization must hold)
  - **No CSP** → any injected script runs unconstrained (highest-value gap here)
  - Service-worker cache poisoning / stale-asset serving
  - Token handling in JS (mitigated: in-memory, short TTL)
  - Dependency/supply-chain risk in a large npm tree
  - `env.js` accidental inclusion of a secret in a future edit
- **Our gaps:** no CSP (TipTap/MUI inline styles need `style-src 'unsafe-inline'`); no dependency scanning in CI. See [docs/security.md](docs/security.md#http-security-headers).
- **Assess:** **Quarterly** (XSS/DOM review + header check) and on every dependency bump / editor change. `npm audit` monthly (cheap).

---

## System: Notes API (.NET / ASP.NET Core)

- **Type:** API (REST, `/api/v1`)
- **Hosting:** self-hosted (container `nettio-notes-api`, image from GHCR)
- **Tech:** .NET 10 + ASP.NET Core, EF Core + Npgsql, JWT bearer auth. Startup/middleware in `api/EpoznamkyApi/Program.cs`.
- **Authentication:** Keycloak-issued JWT (`Authorization: Bearer`) validated against JWKS. Identity is the `sub` claim (`api/EpoznamkyApi/Controllers/BaseController.cs`); `userId` is **never** taken from request input (dev-only `X-User-Id` fallback, gated on `IsDevelopment()`).
- **Exposure:** `public` at `/api/` but `token-required` for all endpoints **except** `GET /api/v1/files/{id}` (`unguessable-URL`, deliberately anonymous) and the health endpoints. Internally the container listens on `:8080` (`internal-only`), only reachable via the edge.
- **Deployed here:**
  - CRUD for Notes, Folders, Tags, Files, Users (`/me`) — full catalog in [docs/api.md](docs/api.md)
  - File upload handling → `uploads_data` volume (`FileService.cs`)
  - Hosted sweepers: `TrashCleanupService`, `OrphanFileCleanupService`
  - Health: `/health/live`, `/health/ready`
- **Defenses:**
  - Per-user ownership filter on every query (`UserId` from JWT `sub`); 404 (not 403) on cross-tenant to avoid existence leaks
  - Rate limiting: 100 req/min/user global, 10/min for `POST /files` (`AddRateLimiter`)
  - Input validation: DTO attributes (400 + `errors` map) + service-layer business rules (folder cycle, depth 5, 100 MB / 5 MB caps, extension **and** content-type allowlist)
  - Optimistic concurrency (compare-and-swap on `updatedAt`) on note content — see [ADR 0009](docs/adr/0009-optimistic-concurrency-on-note-put.md)
  - ProblemDetails (RFC 7807) everywhere; no request bodies logged
  - Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
  - CORS allow-list: prod `https://notes.nettio.eu` only
  - Soft delete + sweeper limits blast radius of accidental deletes
- **Common issues (REST API / ASP.NET):**
  - Broken object-level authorization / IDOR (mitigated by the mandatory `UserId` filter — the #1 thing to regression-test on every new endpoint)
  - Unauthenticated file download endpoint: read-access to any leaked/guessed Guid (accepted trade-off — revisit if sharing/multi-tenant lands; [docs/security.md](docs/security.md#file-attachments))
  - Mass assignment / trusting `userId` from the body
  - SQL injection (mitigated: EF/parameterized; watch any raw SQL or the Notion importer)
  - File-upload abuse (type spoofing, path traversal, storage exhaustion, stored-XSS via served content)
  - JWT validation weaknesses (issuer/audience/alg confusion; `RequireHttpsMetadata=false` is safe only because TLS terminates at the edge)
  - Verbose errors / OpenAPI exposure (spec is Dev-only, off in prod)
- **Our gaps:** anonymous file GET; no audit-log table for sensitive ops (permanent delete). See [docs/security.md](docs/security.md#open-security-to-do).
- **Assess:** **Quarterly** authz/IDOR + upload fuzzing; **every new endpoint** gets the cross-tenant 404 test before merge. Higher criticality than the UI (owns the data).

---

## System: Keycloak (identity provider)

- **Type:** auth / IdP (OIDC) — both a web property (login + admin console) and a token API
- **Hosting:** self-hosted (container `nettio-auth`, `quay.io/keycloak/keycloak:26.0`)
- **Tech:** Keycloak 26, realm `notes`, Postgres-backed (`keycloak` DB). Realm export `notes-prod-realm.json`.
- **Authentication:**
  - End users: username/password → realm `notes` (Keycloak owns all credentials; the app never sees them)
  - Admin: `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` bootstrap creds (from host `.env`), console on `auth.nettio.eu`
  - Clients: `notes-frontend` is a **public** client, standard flow + PKCE S256
- **Exposure:**
  - `public` — user-facing OIDC endpoints via `notes.nettio.eu/realms/`
  - `public` — **admin console at `auth.nettio.eu`** (guarded only by admin credentials; not IP/VPN-restricted)
  - `internal-only` — container listens on `:8080`, reached only through the edge
- **Deployed here:** realm `notes` (roles `user` default, `admin`), client `notes-frontend`, all user identities/sessions.
- **Defenses:**
  - Brute-force protection enabled (`bruteForceProtected: true`)
  - Access-token TTL 300s; SSO idle 30d / max 365d
  - PKCE S256; `sslRequired: external`
  - `KC_HOSTNAME`/`KC_HOSTNAME_ADMIN` pinned so issuer matches public URL; `--proxy-headers xforwarded`
  - Admin bootstrap password enforced via compose `:?` (won't start if absent)
- **Common issues (Keycloak / IdP):**
  - **Exposed admin console** to the public internet (present here — top hardening candidate: IP-allowlist or VPN-gate `auth.nettio.eu`)
  - Weak/unrotated admin password; default admin left enabled
  - `directAccessGrantsEnabled: true` on the public client → resource-owner password grant is available (prefer disabling; auth-code+PKCE only)
  - Over-permissive redirect URIs / web origins (wildcards) enabling token theft
  - Realm export drift vs running config; secrets committed in a realm JSON
  - Unpatched Keycloak CVEs (auth bypass, SSRF in identity brokering)
  - Token misconfig (long-lived tokens, missing audience)
- **Our gaps:** admin console publicly reachable; password grant enabled on the public client; no admin-console access restriction. (Flag for hardening.)
- **Assess:** **Quarterly** config review + version/CVE check; **semi-annual** deeper review of realm settings (redirects, grants, token lifespans). High criticality — it is the auth root of trust.

---

## System: PostgreSQL

- **Type:** database
- **Hosting:** self-hosted (container `nettio-notes-db`, `postgres:16`, volume `postgres_data`)
- **Tech:** PostgreSQL 16, one instance hosting two DBs: `notes` (app) and `keycloak` (auth). Init: `init-db.sql`.
- **Authentication:** `POSTGRES_USER` / `POSTGRES_PASSWORD` superuser from host `.env`. App connects via connection string env; Keycloak via JDBC — both reuse the same credentials.
- **Exposure:** `internal-only` — **no host port published**; reachable only on the private Docker network by the API and Keycloak. Not internet-facing.
- **Deployed here:** all user note content (PII-ish), folders, tags, file metadata, full-text search vectors, and the entire Keycloak identity/session store.
- **Defenses:**
  - No published port (network isolation is the primary control)
  - Password required via compose `:?` enforcement
  - Healthcheck gating dependent services
  - Least data in logs; parameterized queries via EF
- **Common issues (PostgreSQL):**
  - Accidental port exposure (`5432` published) → internet-facing DB
  - Shared superuser for app + Keycloak (no least-privilege per-DB roles — present here)
  - Password reuse across services (app and Keycloak share `POSTGRES_PASSWORD`)
  - No encryption at rest on the volume; backup files unencrypted
  - SQL injection from the app tier (mitigated: EF; audit the Notion importer's string-built SQL)
  - **No automated backups** → data-loss risk (not a breach but an availability/integrity gap)
- **Our gaps:** no automated/offsite backups; single superuser role; volume not encrypted. See [docs/operations.md](docs/operations.md#backups).
- **Assess:** **Semi-annual** config/exposure review (confirm no published port, credentials rotated) — low external attack surface, so cadence is lower, but very high impact. Verify backup/restore drill quarterly (integrity, not security).

---

## System: File-upload object store (uploads volume)

- **Type:** object/file store
- **Hosting:** self-hosted Docker volume `uploads_data`, mounted into the API at `/app/uploads`
- **Tech:** plain filesystem storage on the VPS disk; files keyed by Guid, metadata rows in Postgres.
- **Authentication:** writes/deletes via authenticated, ownership-checked API (`POST`/`DELETE /api/v1/files`). Reads via anonymous `GET /api/v1/files/{id}`.
- **Exposure:** `unguessable-URL` for reads (36-char Guid v4, ~122 bits entropy); `token-required` for writes.
- **Deployed here:** user-uploaded attachments (images, docs) referenced from note content.
- **Defenses:** Guid-only addressing, no directory listing, extension + content-type allowlist on upload, 100 MB cap, 10 upload/min rate limit, `OrphanFileCleanupService` reclaims files with no DB row.
- **Common issues (file store):** stored XSS via served content, content-type sniffing, path traversal on write, guessable IDs (mitigated), storage exhaustion/DoS, unencrypted-at-rest, orphan accumulation.
- **Our gaps:** anonymous read by design; no at-rest encryption; no malware scanning of uploads. See [docs/security.md](docs/security.md#file-attachments).
- **Assess:** **Quarterly** alongside the API (upload validation fuzzing, content-type/disposition checks).

---

## System: VPS host

- **Type:** host / infrastructure
- **Hosting:** self-hosted single VPS (`/opt/nettio`), fronted by its cloud provider's network
- **Tech:** Linux host running Docker + Docker Compose; deploy user home holds `landing/`; secrets in `/opt/nettio/.env` (mode 600).
- **Authentication:** SSH with `VPS_SSH_KEY` private key (used by CI and operators). Host user `VPS_USER`.
- **Exposure:** `SSH-key` for management; `public` for whatever ports Docker publishes (only 80/443 via nginx). The Docker daemon socket is mounted into the certbot sidecar.
- **Deployed here:** the entire Compose stack, `.env` secrets, TLS material under `deploy/certbot/conf/live/`, Postgres + uploads volumes, the static landing site.
- **Defenses:** `.env` chmod 600 owned by deploy user; secrets never in git (only `.env.example`); only 80/443 exposed; SSH key-based auth.
- **Common issues (host / Docker):**
  - **`docker.sock` mounted into the certbot container** = root-equivalent escape if that container is compromised (deliberate, for the reload hook — see the security note in `deploy/reload-nginx.sh`; keep the sidecar minimal/pinned)
  - Exposed/weak SSH (password auth, root login, no fail2ban)
  - Unpatched host packages / kernel
  - Docker misconfig (privileged containers, exposed daemon, `latest` tags — images are pinned by SHA too)
  - Firewall/cloud security-group drift exposing internal ports
  - Secrets on disk readable by other users; no full-disk encryption
- **Our gaps:** `docker.sock` exposure to certbot; no documented host hardening baseline (SSH config, firewall, auto-patching, fail2ban).
- **Assess:** **Semi-annual** host hardening review (SSH config, open ports, patch level, Docker config). Ad-hoc after any change to the certbot sidecar or `.env` handling.

---

## System: TLS / certificates (Let's Encrypt + certbot)

- **Type:** vendor (public CA) + self-hosted renewal sidecar
- **Hosting:** third-party CA (Let's Encrypt) + self-hosted `certbot/certbot` container (`nettio-certbot`)
- **Tech:** certbot HTTP-01 challenge; renew loop `deploy/certbot-renew.sh`; reload hook `deploy/reload-nginx.sh` (SIGHUPs nginx via `docker.sock`); bootstrap `deploy/bootstrap-certs.sh`; monitor `deploy/check-certs.sh`.
- **Authentication:** ACME account key (managed by certbot). No inbound auth surface.
- **Exposure:** `public` only via the `/.well-known/acme-challenge/` path during issuance/renewal.
- **Deployed here:** certs for `nettio.eu`, `notes.nettio.eu`, `auth.nettio.eu` under the shared certbot volume.
- **Defenses:** deploy hook reloads nginx only when a cert actually changes; `check-certs.sh` warns 20 days out; staging dry-run supported.
- **Common issues (ACME/TLS ops):** renew-without-reload drift (had a 2026-04-23 incident — see [docs/operations.md](docs/operations.md#tls-certificates)); HSTS makes cert failures un-clickable-through; expired certs = outage; ACME challenge routing breakage; the `docker.sock` mount (see host entry).
- **Our gaps:** cert-expiry monitoring/alerting is a cron-it-yourself script, not wired to alerting.
- **Assess:** **Semi-annual** review of the renew/reload chain + expiry monitoring wiring. Mostly an availability control; low breach surface.

---

## System: GitHub — repo, Actions, GHCR

- **Type:** CI/CD + source + container registry (vendor)
- **Hosting:** third-party (GitHub SaaS): repo `marekmelichar/notes`, Actions, `ghcr.io`
- **Tech:** GitHub Actions (`.github/workflows/deploy.yml`, `.github/workflows/validate.yml`); images pushed to GHCR; deploy via `appleboy/scp-action` + `ssh-action`.
- **Authentication:** GitHub account/SSO for humans; `GITHUB_TOKEN` (auto) for GHCR; repo **Actions secrets** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` for deploy.
- **Exposure:** `public` control plane (github.com); deploy job holds `SSH-key` to prod. GHCR image visibility per package settings.
- **Deployed here:** CI/CD pipeline that builds + pushes prod images and SSHes into the VPS to `pull && up -d`; the pipeline is effectively a path to production.
- **Defenses:** path-filtered builds; deploy gated so docs-only changes don't touch prod; secrets in Actions secret store; SHA-tagged images enable rollback; docs validator + build in `validate.yml`.
- **Common issues (CI/CD supply chain):**
  - Secret exfiltration via a malicious PR/workflow or compromised third-party action (uses several `@vX` pinned-by-tag actions, not SHA — pin to SHA to harden)
  - `pull_request_target` / injection in workflows (not used here — keep it that way)
  - Over-privileged `GITHUB_TOKEN` (scoped to `packages: write` in build jobs — good)
  - Compromised base image or dependency baked into the pushed image
  - Branch-protection gaps letting unreviewed code reach `main` → auto-deploy
  - **CI does not run tests** (only builds) → security regressions can ship
- **Our gaps:** actions pinned by tag not SHA; no dependency scanning (Dependabot/Renovate); CI runs no tests. See [docs/testing.md](docs/testing.md#ci) and [docs/security.md](docs/security.md#open-security-to-do).
- **Assess:** **Quarterly** review of workflow permissions, action pinning, secret scope, and branch protection. Ad-hoc on every workflow edit.

---

## System: DNS + domain (nettio.eu)

- **Type:** vendor (DNS / registrar)
- **Hosting:** third-party registrar + DNS provider (records point `nettio.eu`, `www`, `notes`, `auth` at the VPS)
- **Authentication:** registrar/DNS provider account (ensure MFA).
- **Exposure:** `public` DNS records; the registrar account is a high-value control plane.
- **Deployed here:** the four A/CNAME records the whole system depends on; domain ownership underpins TLS issuance.
- **Defenses:** (verify) registrar MFA, registrar lock. No CAA record documented.
- **Common issues (DNS):** registrar-account takeover → full traffic hijack + rogue cert issuance; missing CAA record; subdomain takeover on stale records; no DNSSEC; missing SPF/DMARC if the domain sends mail.
- **Our gaps:** no CAA record; DNSSEC/registrar-lock status undocumented.
- **Assess:** **Semi-annual** — confirm registrar MFA + lock, add CAA, audit for stale records. Very high impact, low-frequency change.

---

## System: Notion import tooling (one-off)

- **Type:** vendor data source + local migration script (not a running service)
- **Hosting:** third-party (Notion) as the export source; script `scripts/import-notion.mjs` runs locally/on-host to generate SQL loaded into Postgres.
- **Authentication:** none at runtime — operates on a downloaded Notion export folder; requires a target Keycloak user UUID.
- **Exposure:** `internal-only` / operator-run; not network-exposed.
- **Deployed here:** nothing persistent — it emits `import.sql` piped into the DB by an operator.
- **Common issues:** SQL built via string interpolation (`escapeSQL` present — verify all inserted fields go through it; imported Notion HTML becomes note content and inherits the app's XSS surface); running untrusted export content against prod.
- **Our gaps:** importer isn't parameterized (generates raw SQL) — audit `escapeSQL` coverage before each use; imported HTML is not re-sanitized.
- **Assess:** **On use only** — review the script before each import run. Not a standing surface.

---

## Testing cadence summary

Cadence is set by **criticality × cost-to-test** (see the `AssessAttackSurface` workflow for the scoring model). Higher criticality and cheaper tests push toward more frequent testing.

| System | Criticality | Test cost | Cadence | Primary method |
|---|---|---|---|---|
| Keycloak (IdP) | Critical | Medium | **Quarterly** | Config + CVE review; realm/redirect/grant audit |
| Notes API | Critical | Medium | **Quarterly** + per-endpoint | Authz/IDOR tests, upload fuzzing |
| Edge Nginx | High | Low | **Quarterly** | External TLS + header scan |
| Frontend / PWA | High | Low | **Quarterly** | XSS/DOM review, header + `npm audit` |
| File store | High | Low | **Quarterly** | Upload validation fuzzing (with API) |
| GitHub CI/CD | High | Low | **Quarterly** | Workflow perms, action pinning, secret scope |
| PostgreSQL | Critical impact / low surface | Low | **Semi-annual** | Exposure + credential + role review |
| VPS host | High | Medium | **Semi-annual** | SSH/firewall/patch/Docker hardening review |
| TLS / certbot | Medium | Low | **Semi-annual** | Renew/reload chain + expiry monitoring |
| DNS / domain | Critical impact / rare change | Low | **Semi-annual** | Registrar MFA/lock, CAA, stale records |
| Notion importer | Low | Low | **On use** | Script review before each run |

**Continuous / cheap-to-automate (run more often than the table where feasible):** external TLS + security-header scan, `npm audit` / `dotnet list package --vulnerable` (monthly), and Keycloak/base-image version-vs-CVE checks.

## Cross-cutting known gaps (whole deployment)

Tracked in the docs' open-todo sections; consolidated here for visibility:

- **No Content Security Policy** ([docs/security.md](docs/security.md#http-security-headers))
- **No automated / offsite backups** ([docs/operations.md](docs/operations.md#backups))
- **CI runs no tests** — only image builds ([docs/testing.md](docs/testing.md#ci))
- **No dependency scanning in CI** (Dependabot/Renovate) ([docs/security.md](docs/security.md#open-security-to-do))
- **No audit-log table** for sensitive operations ([docs/security.md](docs/security.md#open-security-to-do))
- **Keycloak admin console is publicly reachable** and the public client has password grant enabled (this file — Keycloak entry)
- **`docker.sock` mounted into the certbot sidecar** (this file — host / TLS entries)
- **Single shared Postgres superuser** for app + Keycloak (this file — PostgreSQL entry)

---

*When you change infrastructure, update this file in the same change — that's what the `AttackSurface`
skill is for. When you actually test a surface, use the `AssessAttackSurface` workflow and record the
date + findings against the relevant system.*
