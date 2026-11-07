# 0010. Give the Notes API its own token audience (`notes-api`)

Date: 2026-11-07
Status: Accepted

## Context

The API validated `aud = "account"`. Keycloak adds `account` to an access token only when the user holds a role of its built-in `account` client (`view-profile`, `manage-account`), which normal users get through the realm's default roles. So whether a user could use Notes depended on their Keycloak account-console roles, not on anything about Notes.

This surfaced on 2026-11-07 with the portfolio `demo` user. It was deliberately given no account-console roles so visitors can't change its password, and every API call answered 401. The workaround was to give it `account view-profile`.

Since the same day the realm (`nettio`, at `auth.nettio.eu`) is shared by every nettio.eu project. A token whose audience is `account` says nothing about which API it is meant for.

## Decision

Access tokens for the Notes frontend carry the audience `notes-api`, added by an audience mapper on the `notes-frontend` client, and the API accepts `notes-api`.

During the switch the API accepts both `notes-api` and `account`, because tokens and refresh tokens issued before the mapper keep `account` only. Once the mapper is live and old sessions have rolled over, `account` is removed from `ValidAudiences` and `demo` loses `account view-profile`.

## Consequences

- **Positive:** access to the API no longer depends on account-console roles. A token for another nettio.eu project (with its own audience) is not accepted by Notes once `account` is dropped.
- **Negative:** one more piece of realm configuration to keep in sync with `Program.cs` (the live realm is edited in the Keycloak admin; `notes-dev-realm.json` carries the same mapper for local dev).
- **Neutral:** dev mode still skips audience validation, as before.

## Alternatives considered

- **Keep `account`, give `demo` `view-profile`.** Works, but keeps the coupling and the cross-project ambiguity.
- **A bearer-only `notes-api` client with a client-scope audience.** Cleaner in a realm with many APIs, but more moving parts than one mapper for a single API. Can be done later without changing the API.
