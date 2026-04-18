# Authentication

Authentication is handled by **Keycloak 26**, an OIDC provider. The frontend uses `keycloak-js` to drive the login flow; the API validates JWTs on every request.

There is **no application-side user store** for credentials — Keycloak owns identities. The `Users` table in Postgres exists for optional metadata only; authorization is keyed off the JWT `sub` claim.

## High-level flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant SPA as Frontend (keycloak-js)
    participant KC as Keycloak
    participant API as .NET API

    U->>SPA: Open app
    SPA->>KC: init({ onLoad: 'check-sso' })<br/>silent-check-sso.html iframe
    alt User has active KC session
        KC-->>SPA: Access + refresh token (PKCE S256)
    else No session
        SPA->>KC: Redirect to login (PKCE)
        U->>KC: Enter credentials
        KC-->>SPA: Redirect back with code
        SPA->>KC: Exchange code → tokens
    end

    SPA->>SPA: Schedule proactive refresh (T-60s)
    SPA->>API: Any /api/v1/* call<br/>Authorization: Bearer <access>
    API->>KC: Fetch JWKS (cached)
    API->>API: Validate signature, issuer, audience, expiry
    API-->>SPA: 200 / 4xx

    Note over SPA,KC: Token refresh runs proactively;<br/>tab visibility change also triggers refresh
    Note over SPA,API: 401 → silent refresh + retry queue;<br/>refresh fail → /no-access
```

## Realms & clients

Two realm exports are checked into the repo:

| File | Realm | SSL | Client | Type | Notes |
|---|---|---|---|---|---|
| `notes-dev-realm.json` | `notes` | `none` | `notes-frontend` | Public, PKCE S256 | Test user `testuser/testuser`. 30d idle / 365d max session. |
| `notes-prod-realm.json` | `notes` | `external` | `notes-frontend` | Public, PKCE S256 | Roles: `user` (default), `admin`. Access token TTL 300s. |

**Redirect URIs / Web origins**

| Env | Redirect URIs | Web origins |
|---|---|---|
| Dev | `http://localhost:3000/*`, `http://localhost:5173/*` | same |
| Prod | `https://notes.nettio.eu/*` (+ post-logout) | `https://notes.nettio.eu`, `+` |

Both realms are imported on container start (`--import-realm`). Schema and user data live in the `keycloak` database in the same Postgres instance.

## Frontend integration

### Runtime config

The SPA does **not** know its Keycloak URL at build time. Config is injected at container startup by `ui/docker-entrypoint.sh`, which writes `ui/public/env.js` with values from environment variables:

```js
// env.js (rewritten on container boot)
window.API_URL = "https://notes.nettio.eu";
window.KEYCLOAK_URL = "https://notes.nettio.eu";
window.KEYCLOAK_REALM = "notes";
window.KEYCLOAK_CLIENT_ID = "notes-frontend";
```

Nginx serves `env.js` with `Cache-Control: no-store` so config changes take effect immediately on rotation. See `ui/nginx.conf`.

### Initialization

`ui/src/features/auth/utils/keycloak.ts`:

- `keycloak.init({ onLoad: 'check-sso', flow: 'standard', pkceMethod: 'S256', checkLoginIframe: false, silentCheckSsoRedirectUri: '/silent-check-sso.html' })`
- **Proactive refresh**: schedules `keycloak.updateToken()` 60s before access token expires
- **Visibility-change listener**: re-checks/refreshes on tab focus (catches missed refreshes after device sleep)
- **Mutex**: prevents concurrent refreshes when both proactive timer and 401 interceptor fire
- **Exponential backoff** with max 3 retries on refresh failure

### Token attachment

`ui/src/lib/apiManager.ts` request interceptor:

```ts
config.headers.Authorization = `Bearer ${getAuthToken()}`;
```

Response interceptor:

- `401` → attempt silent refresh (`keycloak.updateToken(-1)`), queue concurrent failures, retry once
- Refresh fail → set Redux `auth.accessStatus = 'unauthorized'` → router redirects to `/no-access`
- `403` → same `unauthorized` state (server says you're authenticated but lack access — for this single-tenant app this typically means the JWT is for a different user than the entity's owner)

### Silent SSO

`ui/public/silent-check-sso.html` is the iframe target Keycloak loads to detect an existing SSO session without redirecting the top-level window. It just `postMessage`s the URL back to the parent. Don't delete it — `keycloak.init({ onLoad: 'check-sso' })` requires it.

## Backend validation

`api/EpoznamkyApi/Program.cs`:

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts => {
        opts.Authority = builder.Configuration["Keycloak:Authority"];   // dev
        opts.MetadataAddress = ...                                       // prod issuer
        opts.Audience = "account";
        opts.RequireHttpsMetadata = false;   // Nginx terminates TLS
        opts.TokenValidationParameters = new() {
            ValidateIssuer = !isDev,
            ValidateAudience = !isDev,
            NameClaimType = "preferred_username",
        };
    });
```

Notes:

- **Issuer** comes from `Keycloak:Authority` (dev) or `Keycloak:Issuer` (prod) config keys. Default: `http://localhost:8080/realms/notes`.
- **Audience** is `"account"` (Keycloak's default for public clients). If you change this, update both the realm and `Program.cs`.
- **JWKS** is fetched lazily and cached per the JWT bearer middleware defaults (1h refresh, 24h fail).
- **TLS metadata** is *not* required because Nginx terminates HTTPS at the edge and forwards plain HTTP internally. If you ever expose the API directly, flip `RequireHttpsMetadata = true`.
- **Dev mode skips issuer/audience validation** so the realm can be reached at multiple hostnames (`localhost`, container name, etc.) without breaking. **Never** disable in prod.

## Reading the user identity

In a controller:

```csharp
var userId = User.FindFirst("sub")?.Value;
```

In `BaseController` (where most controllers inherit), this is exposed as `UserId`. Always treat it as the source of truth — never accept a `userId` from the request body.

## Logout

`keycloak.logout({ redirectUri: window.location.origin })` ends the Keycloak session and brings the user back to the app, where `check-sso` will fail and they'll be sent to login. This invalidates the SSO cookie at Keycloak; existing access tokens remain valid until expiry (~5 min in prod) — accept this as the cost of stateless JWT auth.

## Common gotchas

- **CORS in dev**: API allow-lists `localhost:3000` (Docker) and `localhost:5173` (Vite). Adding a new dev origin? Add it in `Program.cs` *and* the dev realm `webOrigins`.
- **"Invalid redirect URI"** at login: redirect URI in the Keycloak client must match exactly (including trailing wildcard or none). Edit the realm JSON, restart Keycloak.
- **Token expired loops**: proactive refresh + 401-retry should prevent these. If you see repeated 401s, check `keycloak.token` in the console and inspect with [jwt.io](https://jwt.io).
- **Keycloak `iss` mismatch in prod**: behind Nginx, Keycloak must know its public URL via the `KC_HOSTNAME` env var, otherwise it issues tokens with internal `iss` that the API rejects. See `docker-compose.prod.yml`.

## Pointers

| Concern | File |
|---|---|
| Realm config (dev) | `notes-dev-realm.json` |
| Realm config (prod) | `notes-prod-realm.json` |
| Frontend Keycloak setup | `ui/src/features/auth/utils/keycloak.ts` |
| Token attachment / 401 refresh | `ui/src/lib/apiManager.ts` |
| Runtime config injector | `ui/docker-entrypoint.sh`, `ui/public/env.js` |
| Silent SSO iframe | `ui/public/silent-check-sso.html` |
| Route guard | `ui/src/features/auth/components/ProtectedRoute/` |
| API JWT validation | `api/EpoznamkyApi/Program.cs` |
| User identity in controllers | `api/EpoznamkyApi/Controllers/BaseController.cs` |
