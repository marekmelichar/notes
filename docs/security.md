# Security

This is the security model: what we protect, how, and where the soft spots are. Read it before adding endpoints, changing auth, or storing new kinds of data.

## Threat model (lightweight)

| Asset | Threat | Mitigation |
|---|---|---|
| User notes (PII-ish, private) | Cross-tenant read/write | JWT-derived `UserId` filter on every query |
| User credentials | Theft | Owned by Keycloak; we never see them |
| Access tokens | Replay / leak | Short TTL (300s prod); HTTPS-only; not stored in localStorage by `keycloak-js` (in-memory + refresh token) |
| File attachments | Unauthorized access | Per [§ File attachments](#file-attachments) below — relies on unguessable Guid IDs |
| Service-to-service traffic | MITM | All exposure terminates at Nginx with TLS 1.2+; internal Docker network only |
| Secrets (DB pw, KC admin) | Disclosure | `.env` on host (chmod 600), never in repo; `:?` enforcement in compose |
| Supply chain | Compromised dep | Quarterly `npm audit` / `dotnet list package --vulnerable`; lockfile committed |

Out of scope: nation-state actors, side-channel attacks, physical VPS access. This is a single-tenant private-notes app, not a regulated system.

## Authentication

- Keycloak 26 issues OIDC access + refresh tokens (PKCE S256).
- Frontend uses `keycloak-js` with `flow: 'standard'`, `pkceMethod: 'S256'`, `checkLoginIframe: false`.
- Tokens are stored by `keycloak-js` in memory (refresh tokens not persisted to localStorage by default).
- Access token lifespan in prod: **300s**. Proactive refresh 60s before expiry.

Full mechanics: [auth.md](./auth.md).

## Authorization

**Every owned entity has a `UserId`. Every query filters by it.** The `UserId` comes from the JWT `sub` claim — never from the request body, query string, or headers.

```csharp
// Correct (NoteService.cs pattern):
var note = await db.Notes
    .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

// WRONG — never do this:
var note = await db.Notes.FirstOrDefaultAsync(n => n.Id == id);
// (then check ownership later — race condition, easy to forget)
```

If you add a new entity:

1. Give it a `UserId` column (text, indexed).
2. Filter every read, update, and delete by it.
3. Add a test that confirms a different user gets a 404 (not a 403 — don't leak existence).

## Input validation

Two layers:

1. **ASP.NET model validation** via `[Required]`, `[StringLength]`, `[RegularExpression]`, `[Range]` attributes on request DTOs (`Models/*.cs`). Failures → 400 with `errors` map.
2. **Service-layer business rules** — folder cycle detection, max tree depth (5), max upload size (100 MB), allowed file types, etc. Failures → 400 with descriptive `detail`.

Add validation at the *closest* layer where the constraint is meaningful. Don't push business rules into DTOs (they belong in services), and don't rely on services for length-of-string checks (DTO attribute is cheaper and gives a structured error).

## File attachments

`GET /api/v1/files/{id}` is **not** authenticated. This is a deliberate trade-off:

- File IDs are 36-char Guid v4 (~122 bits of entropy).
- Authenticated `GET` would break inline rendering inside `<img src="…">` for HTML email/export and would require pre-signed URLs to share files outside the SPA.
- The risk: anyone with a leaked URL can read the file. Mitigated by:
  - URLs only ever appear in authenticated contexts (notes content, upload response).
  - Note content is per-user; URLs aren't enumerable.
  - No directory listing.
  - Standard server logging captures access attempts.

`POST` and `DELETE` on `/files/*` **are** authenticated and ownership-checked.

If this trade-off ever stops being acceptable (e.g. the app gets sharing/multi-tenant features), revisit by adding a short-lived signed token query param.

## Transport security

- Nginx terminates TLS 1.2+ with HSTS (`Strict-Transport-Security`).
- All HTTP requests are 301'd to HTTPS (with the `/.well-known/acme-challenge/` exception for cert renewal).
- Internal traffic between containers is plain HTTP on a private Docker network — acceptable because nothing else has access.

## HTTP security headers

Set in middleware (`Program.cs`) and `ui/nginx.conf`:

| Header | Value | Source |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | API (`Program.cs`) + UI Nginx |
| `X-Frame-Options` | `DENY` (API responses) / `SAMEORIGIN` (UI responses) | API sets `DENY`; UI Nginx sets `SAMEORIGIN`. Each origin response carries its own value. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | API |
| `Strict-Transport-Security` | `max-age=…` | Edge Nginx (`deploy/nginx.conf`) |
| `X-XSS-Protection` | `1; mode=block` | UI Nginx (legacy header, harmless) |

There's an integration test in `api/EpoznamkyApi.IntegrationTests/Tests/CrossCutting/SecurityHeadersTests.cs` that locks the API's `X-Frame-Options: DENY`. If you change the value, update the test.

**No CSP yet.** Adding one is on the to-do list — TipTap and MUI both inline styles, so a CSP needs care (likely `style-src 'unsafe-inline' 'self'`).

## CORS

API allow-list (`Program.cs`):

| Env | Origins |
|---|---|
| Dev | `http://localhost:3000`, `http://localhost:5173`, `https://notes.nettio.eu` |
| Prod | `https://notes.nettio.eu` |

If you add a new origin (subdomain, sandbox URL), add it both in `Program.cs` *and* the Keycloak realm `webOrigins`.

## Rate limiting

Configured globally in `Program.cs`:

- **100 requests / minute / user** (partition key: JWT `sub`)
- **10 requests / minute / user** for `POST /api/v1/files`

Anonymous requests share a single bucket. The 401 silent-refresh on the frontend will also be rate-limited if it loops — that's intentional (don't DoS Keycloak with a misconfigured client).

## Secrets handling

- **Repo**: only `.env.example` (no real values).
- **Production**: `/opt/nettio/.env`, owned by the deploy user, mode `600`.
- **CI**: GitHub Actions secrets (`VPS_*`, `GITHUB_TOKEN`).
- **Keycloak admin password**: required via `${KEYCLOAK_ADMIN_PASSWORD:?}` — compose refuses to start if missing. Rotate by `kcadm.sh` inside the container.
- **Database password**: same `:?` enforcement.

If a secret leaks:

1. Rotate it immediately (DB → `ALTER USER … WITH PASSWORD …`; Keycloak admin → kcadm; GitHub → settings page).
2. Update `.env`, restart affected containers.
3. Audit logs for misuse.

## Dependency hygiene

- `package-lock.json` and `*.csproj` are committed.
- React Compiler in babel pipeline — ensure no unsafe optimizations.
- No transitive runtime fetches (no auto-updating CDN scripts in `index.html`).

Run periodically:

```bash
cd ui && npm audit --audit-level=moderate
cd api/EpoznamkyApi && dotnet list package --vulnerable --include-transitive
```

## Logging & PII

- API logs include `traceId`, controller, action, status — **not** request bodies.
- Be deliberate when adding `_logger.LogInformation(…, note.Title)` — note titles are user content. Log IDs, not content.
- Keycloak logs auth events; these are useful for incident response but contain user identifiers. Treat the log volume as sensitive.

## Reporting issues

Internal project — open a GitHub issue tagged `security` (private repo). For anything sensitive, contact the maintainer directly rather than opening an issue.

## Open security to-do

- Automated backup + offsite copy ([operations.md](./operations.md#backups))
- Content Security Policy
- Dependency-scanning in CI (Dependabot or Renovate)
- Audit log table for sensitive operations (delete-permanent, role changes if/when admin role is used)
