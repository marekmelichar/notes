---
name: attacksurface
description: >-
  Maintain attacksurface.md — the running inventory of every deployed system (hosts, web
  properties, APIs, databases, IdPs, vendors, CI/CD) and the attack surface each presents. Use
  when infrastructure changes (a service is added, exposed, reconfigured, or retired), when a new
  project/repo comes into scope, or when the user asks to review/update the attack-surface
  inventory. Keeps entries in a fixed schema and cross-links the AssessAttackSurface workflow.
---

# AttackSurface — maintain the attack-surface inventory

You own `attacksurface.md` at the repo root. It is a **living document**: the single source of
truth for what we operate and how exposed each piece is. This skill is about keeping it accurate
and complete. To actually *test* a surface, hand off to the `assess-attack-surface` skill.

## When to run

Trigger an update whenever any of these happen:

- A new service, container, host, domain, vendor, or third-party integration is added.
- An exposure changes: a port is published, an endpoint goes public, auth is added/removed, a
  route is proxied, admin access is opened/closed.
- A defense changes: headers, rate limits, CSP, WAF, network isolation, credential rotation.
- A system is retired (remove it, or move it to a `## Retired` section with the date).
- A new project or repo enters scope (add its systems as new `## System` blocks).
- The user asks to review, refresh, or extend the inventory.
- An `AssessAttackSurface` run produces findings (record date + outcome against the system).

If you change infrastructure in a PR, update `attacksurface.md` **in the same change** — the same
rule the repo already applies to `docs/`.

## How to (re)discover the surface

Don't guess from memory — read the ground truth, in roughly this order:

1. **Compose files** (`docker-compose.prod.yml`, `docker-compose.yml`) — every service, image,
   published port (`ports:` = internet-facing), env/secret, volume, and mount (watch for
   `docker.sock`).
2. **Edge config** (`deploy/nginx.conf`) — vhosts, TLS, which paths route to which upstream, what
   is public vs internal.
3. **Frontend nginx** (`ui/nginx.conf`) and **API startup** (`api/EpoznamkyApi/Program.cs`) —
   headers, CORS, rate limits, auth wiring.
4. **Auth** — realm exports (`notes-prod-realm.json`, `notes-dev-realm.json`) and
   [docs/auth.md](../../../docs/auth.md): clients, flows, grants, redirect URIs, token lifespans.
5. **CI/CD** (`.github/workflows/`) — what can reach production, secret scope, action pinning.
6. **Docs** — [docs/security.md](../../../docs/security.md), [docs/deployment.md](../../../docs/deployment.md),
   [docs/operations.md](../../../docs/operations.md), [docs/architecture.md](../../../docs/architecture.md) for the
   documented threat model and open-todo lists.
7. **Vendors** — anything third-party the system depends on (registrar/DNS, GHCR, Let's Encrypt,
   SaaS integrations like Notion). These are surfaces even without running code.

## Entry schema (keep every system consistent)

Each system is one `## System: <name>` block with exactly these fields, in this order:

- **Type** — web property / API / database / auth (IdP) / reverse proxy / object store / host / CI-CD / vendor
- **Hosting** — self-hosted vs third-party (name the concrete container/host/SaaS)
- **Tech** — platform + version, with a pointer to the config file
- **Authentication** — how we/users authenticate in (and what is intentionally anonymous)
- **Exposure** — one or more tags from the exposure legend at the top of `attacksurface.md`
  (`public`, `token-required`, `OAuth/OIDC`, `internal-only`, `localhost-only`, `SSH-key`,
  `unguessable-URL`)
- **Deployed here** — everything running on / stored in this system
- **Defenses** — the security mechanisms currently protecting it
- **Common issues** — the well-known vuln/misconfig classes for *that platform* (be specific to
  the tech: nginx SSRF, Keycloak admin exposure, Postgres port exposure, CI secret exfiltration…)
- **Our gaps** — known-open items for this system, cross-referenced to the relevant doc anchor
- **Assess** — recommended cadence + method (must match the row in the Testing cadence summary)

Keep the **Testing cadence summary** table and the **Cross-cutting known gaps** list in sync with
the per-system entries whenever you add, change, or remove a system.

## Rules that keep this file healthy

- **Exposure is the headline.** For every system be explicit about *who can reach it* — public,
  internal-only, behind which auth. If you can't state the exposure, you haven't finished the entry.
- **Separate defense from gap.** What protects it today vs. what's still open. Don't bury a gap
  inside prose — put it in **Our gaps** so it's greppable.
- **Name the platform's classic failure modes**, not generic ones. The value is "here is how *this*
  technology gets owned," so someone can go test exactly that.
- **Cross-link, don't duplicate.** Point to `docs/*` for mechanics; this file is the index and the
  exposure/risk lens, not a re-explanation of how auth works.
- **Third-party ≠ out of scope.** A registrar, a CI provider, and a CA are all attack surface even
  though we don't run them. Capture the account/control-plane risk.
- **Record assessments.** When `AssessAttackSurface` runs, update the system's **Assess** line and
  the "Last full review" / per-system date with what was checked and what was found.

## Validation before commit

`attacksurface.md` lives at the repo root, so the docs validator (`scripts/validate-docs.mjs`,
enforced by the pre-commit hook and CI) checks it. Every backticked file path and every internal
markdown link must resolve to a real file. Run `node scripts/validate-docs.mjs` before committing.
Use full `https://` URLs or `#anchor` links for anything that isn't a real repo file. **Never**
bypass the hook with `--no-verify`.

## Handoff

To test a surface and (re)derive its cadence, invoke the **`assess-attack-surface`** skill for the
specific system. Feed its findings back into this file.
