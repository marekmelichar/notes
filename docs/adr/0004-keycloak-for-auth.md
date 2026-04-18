# 0004. Use Keycloak for authentication

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

We needed authentication for a private notes app with the following constraints:

- Standard auth (email/password) plus easy room to add SSO later (Google, GitHub).
- Self-hostable — no per-user pricing tail.
- OIDC / OAuth2 standards-compliant so the API can validate JWTs without per-request DB calls.
- Manageable user store (admin UI, password reset, account locking).
- Doesn't require us to store password hashes ourselves.

The realistic options:

- Build it ourselves on top of ASP.NET Core Identity
- **Keycloak** (self-hosted)
- Auth0 / Clerk / Supabase Auth (hosted)
- Authentik / ORY (other self-hosted OIDC providers)

## Decision

**Use Keycloak 26 as a self-hosted OIDC provider.** Frontend uses `keycloak-js` (PKCE S256, `check-sso`); API validates JWTs via the standard ASP.NET `AddJwtBearer` middleware against Keycloak's JWKS endpoint.

Keycloak runs as a Docker container in the same Compose stack, sharing the Postgres instance (separate `keycloak` database). Two realm exports are version-controlled: `notes-dev-realm.json` and `notes-prod-realm.json`.

## Consequences

**Positive:**
- Standards-compliant: any OIDC client library works, today and forever.
- Mature admin UI: user management, role/group assignment, federation, account-level events — all out of the box.
- Self-hosted: no vendor pricing model, no PII leaving our infra.
- Easy SSO add-on: enable a Google identity provider in the realm and we're done.
- Stateless API auth: bearer JWT, validated locally via cached JWKS — no DB call per request.

**Negative:**
- Operational overhead: an extra container with its own DB, hostname, and TLS concerns.
- Learning curve: the Keycloak admin UI and concepts (realms, clients, scopes, mappers) take a session to internalize.
- Hostname/issuer pitfalls behind a reverse proxy — `KC_HOSTNAME` must match what tokens claim, or the API rejects them. Bit us once; documented in `docs/auth.md`.
- Admin password rotation requires `kcadm.sh`, not just env-var change.
- Major version upgrades occasionally require migration of the realm export schema.

**Neutral:**
- Realm config is checked into git as JSON. Diffs are noisy but the audit trail is invaluable.

## Alternatives considered

- **ASP.NET Core Identity**: would mean storing password hashes ourselves, building the admin UI, and re-implementing OIDC flows. More code to own, more attack surface.
- **Auth0 / Clerk**: zero ops, but per-user pricing scales poorly for a private app and creates a vendor dependency. Also moves PII off-prem.
- **Authentik / ORY Hydra**: viable, less mature ecosystems at adoption time. Keycloak's documentation and community were the deciding factor.

## Notes

If the project ever becomes truly multi-tenant (multiple organizations), Keycloak realms-as-tenants is a well-trodden pattern. We'd add per-realm clients and federate as needed.
