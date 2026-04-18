# Progressive Web App

The frontend is a PWA: installable, with a service worker that precaches the app shell and (lightly) caches API responses. It is **not** offline-first — see [ADR 0005](./adr/0005-no-offline-first-sync.md).

## Configuration

`ui/vite.config.ts` uses [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) with Workbox under the hood:

```ts
VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.svg', 'favicon-150x150.png', 'apple-touch-icon.svg'],
  manifest: {
    name: 'Notes',
    short_name: 'Notes',
    description: 'Note-taking app with rich text editing',
    theme_color: '#7c3aed',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    icons: [
      { src: 'pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: 'pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/^\/api\//, /^\/realms\//, /^\/resources\//],
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
}),
```

## What gets cached

| Type | Strategy | Detail |
|---|---|---|
| App shell (`*.{js,css,html,svg,png,woff2}`) | Precache | Built once at deploy; `sw.js` lists every asset hash |
| Navigation requests | `index.html` fallback | Lets client-side routes work after first load |
| `/api/*` | NetworkFirst, 1h TTL, max 100 entries | Stale-but-readable when offline; writes still fail |
| `/realms/*`, `/resources/*` (Keycloak) | **Excluded** from SW navigation fallback | Avoid intercepting OIDC redirects |

## Update flow

`registerType: 'prompt'` means the SW does **not** auto-activate a new version. It waits for the app to call `updateServiceWorker()`. The prompt is wired in `ui/src/components/PwaUpdatePrompt/index.tsx`:

```tsx
const {
  needRefresh: [needRefresh, setNeedRefresh],
  updateServiceWorker,
} = useRegisterSW();
```

`useRegisterSW` returns `needRefresh` as a `[value, setter]` tuple — the component drives state directly rather than via `onNeedRefresh` callback.

When a new SW is detected:

1. The `needRefresh` state goes true.
2. A MUI Snackbar appears with **Update** / **Dismiss** buttons.
3. Clicking **Update** calls `updateServiceWorker(true)` — skipWaiting + reload.
4. Dismiss calls `setNeedRefresh(false)`; the new SW stays in `waiting` state and activates on next full close + open.

```mermaid
sequenceDiagram
    participant U as User
    participant SW as Service Worker
    participant App as React App
    participant CDN as Server (Nginx)

    Note over App,CDN: User opens app, registered SW v1 active
    App->>CDN: GET /sw.js (background check)
    CDN-->>App: New sw.js content
    App->>SW: Install v2 (in waiting state)
    SW->>App: onNeedRefresh()
    App->>U: Snackbar: "Update available"
    alt User clicks Update
        U->>App: Click Update
        App->>SW: skipWaiting + claim
        App->>App: location.reload()
    else User dismisses
        App->>App: Snackbar closes; SW v2 stays waiting
        Note over SW: v2 activates on next full close + open
    end
```

## Why `prompt` instead of `autoUpdate`

`autoUpdate` would silently apply a new SW and reload the page, which is jarring mid-edit. The prompt gives the user control. Trade-off: users on stale builds longer; we accept this because edits are short-lived (notes get auto-saved on each keystroke, so an unprompted reload would be safe enough — but the prompt is friendlier UX).

## Offline behavior in practice

- **Read existing notes**: works for ~1h after last visit (NetworkFirst cache).
- **Edit a note**: TipTap is local; the edit *appears* to save. The PUT will fail when offline. The auto-save retries on reconnect; if the tab closes before that, the edit is lost.
- **Create / delete**: fails outright (no queueing).
- **Login**: fails (Keycloak is excluded from SW caching).

If true offline-first becomes a requirement, the path is:

1. Add IndexedDB-backed write queue (e.g. `idb` + a custom Workbox plugin).
2. Reconcile on reconnect with a server-side merge strategy.
3. Surface conflicts in the UI.

This is a significant project — see ADR 0005.

## Icons & manifest

- `ui/public/pwa-192x192.svg`, `pwa-512x512.svg` — used by Android home screen, Lighthouse PWA install criteria.
- `apple-touch-icon.svg` — iOS home screen.
- `favicon.svg`, `favicon-150x150.png` — browser tab.
- Manifest is generated at build time and lands at `/manifest.webmanifest` (see `ui/build/manifest.webmanifest` after a build).

To validate:

```bash
cd ui && npm run build
# Then serve build/ and check /manifest.webmanifest + DevTools → Application → Manifest
```

## Pointers

| Concern | File |
|---|---|
| PWA config | `ui/vite.config.ts` |
| Update prompt UI | `ui/src/components/PwaUpdatePrompt/index.tsx` |
| Manifest icons | `ui/public/pwa-*.svg`, `apple-touch-icon.svg` |
| Generated SW (after build) | `ui/build/sw.js` |
| Generated manifest | `ui/build/manifest.webmanifest` |
| Decision rationale | [ADR 0006](./adr/0006-pwa-via-vite-plugin-pwa.md), [ADR 0005](./adr/0005-no-offline-first-sync.md) |
