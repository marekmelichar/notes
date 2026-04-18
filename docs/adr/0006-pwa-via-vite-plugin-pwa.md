# 0006. Ship as a PWA via vite-plugin-pwa

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

We want users to be able to install the app to their home screen, get a standalone window, and have basic offline-cached read access — without building a native iOS/Android app or maintaining a separate React Native/Flutter codebase.

The web platform offers PWAs: a manifest, a service worker, install prompts, and (on supporting platforms) standalone display.

Build options:

- **`vite-plugin-pwa`** (Workbox under the hood)
- Hand-rolled service worker + manifest
- Workbox CLI integrated into the build
- Don't ship as PWA — just a standard SPA

A previous attempt at a Flutter mobile app (`mobile-app/` directory) was abandoned and removed (see commit history). The PWA path replaces that need.

## Decision

**Ship as a PWA using `vite-plugin-pwa` with the `generateSW` strategy and `registerType: 'prompt'`.** Manifest, icons, and Workbox config all declared in `ui/vite.config.ts`. App-shell precaching for static assets; `NetworkFirst` runtime caching for `/api/*` with 1h TTL. Update prompt surfaced in `components/PwaUpdatePrompt/` via `useRegisterSW` from `virtual:pwa-register/react`.

## Consequences

**Positive:**
- Zero second codebase. Web app == "mobile app".
- Installable on iOS, Android, desktop. Standalone display works.
- Service worker gives stale-while-revalidate for reads, navigation fallback to `index.html` for client-side routing.
- Deploys are unchanged — same Docker image, same Nginx, same CI.

**Negative:**
- Push notifications, deep filesystem access, and other native APIs are off the table (some on iOS especially).
- Service worker introduces a class of bugs that don't exist in plain SPAs (stale assets after deploy if registration is wrong, intercepted requests, debugging in DevTools is its own skill).
- iOS PWAs have historic platform quirks (storage eviction, `apple-touch-icon` requirements, no `beforeinstallprompt`).

**Neutral:**
- `registerType: 'prompt'` means the user explicitly opts into updates. Trades freshness for stability mid-edit. See [docs/pwa.md](../pwa.md).

## Alternatives considered

- **Hand-rolled SW**: full control, lots of footguns, more maintenance. `vite-plugin-pwa` already abstracts what we need.
- **Workbox CLI**: similar to `vite-plugin-pwa` but less integrated with Vite's build pipeline. Plugin won on convenience.
- **Just a SPA, no PWA**: loses install + offline read. No real upside.
- **Native or React Native app**: superseded by ADR-equivalent decision when `mobile-app/` was deleted. Cost of a second codebase didn't pencil out for a private app.

## Notes

If push notifications become a hard requirement, the path is Web Push (works on Android + desktop) or a native shell wrapping the PWA (Capacitor) — not a separate native rewrite. ADR pending if/when that happens.
