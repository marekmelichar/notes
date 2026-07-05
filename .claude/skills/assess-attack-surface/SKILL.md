---
name: assess-attack-surface
description: >-
  Assess one of our attack surfaces (from attacksurface.md) thoroughly and efficiently — enumerate
  exposure, verify authentication and defenses, run the platform-specific misconfiguration
  checklist, and produce findings plus a recommended testing frequency scored on criticality and
  cost. Use when the user asks to assess/test/review the security of a specific system (the API,
  Keycloak, the edge, the host, CI/CD, a database, a vendor) or to (re)derive how often it should
  be tested. Read-and-verify oriented; does not perform destructive or unauthorized testing.
---

# AssessAttackSurface — assess one surface, set its cadence

A repeatable procedure to assess any single system in `attacksurface.md` well without boiling the
ocean. Assess **one system per run** (or a tight cluster like API + file store). Everything here is
**authorized, non-destructive assessment of our own infrastructure** — review config, verify
controls, and probe our own endpoints. Do not attack third parties, exfiltrate real data, or run
DoS/destructive tests against production.

## Inputs

- The target system's `## System` block in `attacksurface.md` (start there — it says what to expect).
- The ground-truth config for that system (compose, `deploy/nginx.conf`, `Program.cs`, realm JSON,
  workflows — see the discovery list in the `attacksurface` skill).

## Procedure

Work the phases in order. Stop early if a phase reveals a critical finding worth surfacing
immediately.

### 1. Scope & recon
- Restate the system, its **Type**, and its claimed **Exposure**. Confirm the claim against config:
  does anything published (`ports:`) or routed (`nginx` locations) contradict "internal-only"?
- List the concrete assets: hostnames, endpoints, ports, credentials, data stored.

### 2. Enumerate exposure (who can actually reach it)
- For each entry point, determine the real audience: `public`, `token-required`, `OAuth/OIDC`,
  `internal-only`, `SSH-key`, `unguessable-URL`.
- Non-destructive external checks where the surface is public, e.g.:
  - TLS + headers: `curl -sI https://<host>/` and inspect `Strict-Transport-Security`,
    `X-Frame-Options`, `X-Content-Type-Options`, CSP, `Server`.
  - TLS config: `echo | openssl s_client -connect <host>:443 -servername <host>` (protocols/cert).
  - Auth boundary: hit a protected endpoint without a token — expect 401, not data.
- Flag any exposure that is broader than the inventory claims.

### 3. Verify authentication & authorization
- Confirm how auth is enforced and that it can't be bypassed:
  - JWT: issuer/audience/alg/expiry validation actually on (`Program.cs`); no `userId` accepted
    from request input; cross-tenant request returns 404, not another user's data.
  - IdP: admin console reachability, brute-force protection, grant types, redirect-URI/web-origin
    scope, token lifespans.
  - Host/CI: key-based SSH only, secret scope, least privilege.
- Intentionally-anonymous endpoints (e.g. file GET): confirm the compensating control (entropy,
  no enumeration, no listing).

### 4. Run the platform misconfiguration checklist
Use the **Common issues** list in that system's inventory entry as the checklist, plus the
platform quick-refs below. For each item: is it present, mitigated, or open?

- **Reverse proxy (nginx):** header pass-through/CSP, SSRF via variable `proxy_pass`, request
  smuggling, default-vhost SNI fallthrough, version disclosure, TLS ciphers/protocols.
- **SPA/PWA:** XSS via user HTML (TipTap), CSP presence, service-worker cache poisoning, token
  storage, secrets in the bundle/`env.js`, dependency audit.
- **REST API (ASP.NET):** IDOR/broken object-level authz (test every resource for cross-tenant
  access), mass assignment, upload validation (type spoof, traversal, size, stored-XSS), rate
  limits, error verbosity, OpenAPI exposure in prod.
- **IdP (Keycloak):** admin-console exposure, admin credential strength/rotation, password-grant on
  public clients, redirect/web-origin wildcards, realm-export drift, CVE/version currency.
- **Database (Postgres):** confirm no published port, per-service least-privilege roles, credential
  reuse, at-rest & backup encryption, injection from the app tier.
- **Object store:** content-type/disposition handling, path traversal, ID entropy, at-rest
  encryption, malware scanning, orphan cleanup.
- **Host/Docker:** SSH hardening, patch level, firewall/security-group vs published ports,
  privileged containers, `docker.sock` mounts, secrets file perms.
- **CI/CD (GitHub):** workflow permissions, action pinning (tag vs SHA), secret scope, branch
  protection, whether tests/scanners run, third-party action trust.
- **Vendor (DNS/registrar/CA/SaaS):** account MFA, registrar lock, CAA/DNSSEC, stale records,
  control-plane takeover impact.

### 5. Check defenses actually work
Don't take the inventory's **Defenses** on faith — verify a sample. Rate limit: does the Nth
request get throttled? HSTS: present with a long max-age? Ownership filter: does a mismatched token
get a 404? Note which defenses you confirmed vs. assumed.

### 6. Produce findings
For each finding: **severity** (critical/high/medium/low), **exposure** (who can reach it), **what
was verified vs. assumed**, and a **concrete fix**. Order by severity. Distinguish "confirmed" from
"needs deeper testing." Keep it to what you actually observed.

### 7. Recommend a testing frequency
Score two axes:

- **Criticality (impact if compromised):** Critical (auth root, data store, path-to-prod) / High
  (public web/API surface) / Medium / Low.
- **Cost-to-test (effort + risk of the assessment itself):** Low (automatable external scan) /
  Medium (manual review + targeted probing) / High (deep manual pentest, needs care in prod).

Map to a cadence — cheaper and more critical ⇒ more frequent:

| | Cost: Low | Cost: Medium | Cost: High |
|---|---|---|---|
| **Critical** | Monthly (automate) / Quarterly deep | Quarterly | Semi-annual |
| **High** | Quarterly | Quarterly | Semi-annual |
| **Medium** | Semi-annual | Semi-annual | Annual |
| **Low** | Annual / on-change | On use | On use |

Adjust for: **rate of change** (config that changes often ⇒ also assess on-change), **exposure**
(public beats internal-only), and **automatability** (if a check is cheap to automate, run it
continuously regardless of the table — e.g. TLS/header scans, `npm audit`, CVE checks). Always add
event-driven triggers (assess on any change to that system's config) on top of the periodic cadence.

## Output

1. A short findings report for the assessed system, severity-ordered.
2. A recommended cadence with the criticality/cost reasoning in one line.
3. An update to `attacksurface.md` via the `attacksurface` skill: refresh the system's **Assess**
   line, its **Our gaps**, the Testing cadence summary row, and the review date. Record what was
   checked so the next run starts from a known baseline.

## Efficiency notes

- Lead with config review (free, fast) before any live probing — most misconfigs are visible in
  the compose/nginx/realm files.
- Reuse the inventory's **Common issues** as your checklist so you don't re-derive it each time.
- Batch cheap external checks (TLS, headers, auth-boundary) into a couple of `curl`/`openssl` calls.
- Timebox deep manual work to the phases where the exposure justifies it (public + critical first).
