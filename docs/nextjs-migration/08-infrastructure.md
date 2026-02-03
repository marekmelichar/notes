# 08 — Infrastructure

## Docker Compose Services

### Local Development (`docker-compose.yml`)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `notes-db` | `postgres:16` | 5432 | PostgreSQL database |
| `notes-keycloak` | `quay.io/keycloak/keycloak:26` | 8080 | Keycloak auth server |
| `notes-api` | Built from `api/EpoznamkyApi/Dockerfile` | 5001→8080 | .NET API |
| `notes-frontend` | Built from `ui/Dockerfile` | 3000→80 | Nginx + React SPA |

### Production (`docker-compose.prod.yml`)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgres:16` | 5432 (internal) | PostgreSQL |
| `keycloak` | `quay.io/keycloak/keycloak:26` | 8080 (internal) | Keycloak |
| `api` | `ghcr.io/${REPO}/api:latest` | 8080 (internal) | .NET API |
| `frontend` | `ghcr.io/${REPO}/frontend:latest` | 80 (internal) | Nginx + SPA |
| `nginx` | `nginx:1.27-alpine` | 80, 443 | Reverse proxy + SSL |
| `certbot` | `certbot/certbot` | — | SSL certificate renewal |

---

## PostgreSQL

- **Version:** 16
- **Databases:** `notes` (app data), `keycloak` (auth data)
- **Default credentials (dev):** `postgres` / `postgres`
- **Init script:** `init-db.sql` creates both databases on first run
- **Connection string:** `Host=localhost;Database=notes;Username=postgres;Password=postgres`
- **Volume:** `postgres_data` (persistent)

---

## Keycloak

### Development Mode
- Started with `start-dev --import-realm`
- Imports realm from `notes-dev-realm.json`
- Admin console: `http://localhost:8080` (admin/admin)
- SSL: disabled

### Production Mode
- Started with `start --import-realm`
- Uses `notes-prod-realm.json`
- SSL: external (terminated at Nginx)
- Hostname: `https://notes.nettio.eu`
- Admin hostname: `https://auth.nettio.eu`
- Proxy headers: xforwarded

### Token Lifetimes (Production)
| Setting | Duration |
|---------|----------|
| Access token | 5 minutes |
| SSO session idle | 30 minutes |
| SSO session max | 10 hours |
| Offline session idle | 30 days |

---

## Nginx Configuration

### Frontend Nginx (`ui/nginx.conf`)
Used inside the frontend container to serve the SPA:

```nginx
# SPA routing — all paths serve index.html
location / {
    try_files $uri $uri/ /index.html?$args;
}

# Prevent caching of env.js (runtime config)
location /env.js {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}

# Cache static assets for 30 days
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# Security headers
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";

# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
```

### Production Reverse Proxy (`deploy/nginx.conf`)

```
Port 80:
  /.well-known/acme-challenge/ → Certbot (SSL verification)
  * → Redirect to HTTPS

Port 443 (notes.nettio.eu):
  /             → Frontend container (http://frontend:80)
  /api/         → API container (http://api:8080)
  /realms/      → Keycloak container (http://keycloak:8080)
  /resources/   → Keycloak static resources
  /js/          → Keycloak JavaScript adapter

Port 443 (auth.nettio.eu):
  /             → Keycloak admin console (http://keycloak:8080)
```

**Upload limit:** 101 MB (for file uploads through `/api/`)

**SSL:**
- TLS 1.2 + 1.3
- Let's Encrypt certificates via Certbot
- Auto-renewal every 12 hours
- HSTS: 2 years

---

## Environment Variables

### Frontend Runtime (`env.js`)

Generated at container startup by `docker-entrypoint.sh`:

```javascript
window.API_URL = '';                              // Empty = same origin (relative URLs)
window.KEYCLOAK_URL = 'http://localhost:8080';
window.KEYCLOAK_REALM = 'notes';
window.KEYCLOAK_CLIENT_ID = 'notes-frontend';
window.MOCK_MODE = false;
```

For Next.js migration, these can become standard `NEXT_PUBLIC_*` environment variables.

### API Environment

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `ASPNETCORE_ENVIRONMENT` | Development | Production |
| `ConnectionStrings__DefaultConnection` | localhost connection | Docker internal |
| `FileStorage__UploadDirectory` | `/app/uploads` | `/app/uploads` (volume) |

### Docker `.env.example`

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password-here
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=your-secure-password-here
GITHUB_REPOSITORY=your-username/notes
```

---

## CI/CD Pipeline (GitHub Actions)

### Trigger
- Push to `main` branch
- Manual dispatch (with optional `force_build_all` flag)

### Pipeline Steps

```
1. Detect changes (paths-filter)
   ├── api/ changed?
   ├── ui/ changed?
   └── infra changed?

2. Build API (if changed)
   └── Docker build → push to ghcr.io/{repo}/api:latest

3. Build UI (if changed)
   └── Docker build → push to ghcr.io/{repo}/frontend:latest

4. Deploy (if any build ran)
   ├── SCP config files to VPS
   ├── SSH: docker compose pull
   ├── SSH: docker compose up -d
   └── SSH: docker image prune -f
```

### Required Secrets
- `VPS_HOST` — Server IP/hostname
- `VPS_USER` — SSH username
- `VPS_SSH_KEY` — SSH private key
- `GITHUB_TOKEN` — Auto-provided for GHCR auth

---

## Vite Build Configuration (Current)

Relevant settings for understanding the build output:

```typescript
// Path alias
'@/' → './src'

// Dev server proxy
'/api' → 'http://localhost:5001'

// Code splitting chunks
{
  react: ['react', 'react-dom', 'react-router-dom'],
  mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
  'dnd-kit': ['@dnd-kit/*'],
  redux: ['@reduxjs/toolkit', 'react-redux'],
  'react-query': ['@tanstack/react-query'],
  i18n: ['i18next', 'react-i18next'],
  utils: ['axios']
}
```

---

## Key NPM Dependencies

These are the significant dependencies in the current React frontend. For the Next.js rebuild, equivalent packages should be used where applicable:

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19 | UI framework |
| `react-router-dom` | 7.5 | Client-side routing (replaced by Next.js router) |
| `@reduxjs/toolkit` | 2.0 | State management |
| `react-redux` | 9.1 | React bindings for Redux |
| `@tanstack/react-query` | 5.90 | Server state / data fetching |
| `axios` | 1.7 | HTTP client |

### UI
| Package | Version | Purpose |
|---------|---------|---------|
| `@mui/material` | 6.1 | Component library |
| `@emotion/react` | 11.x | CSS-in-JS (MUI dependency) |
| `notistack` | 3.0 | Snackbar notifications |
| `dayjs` | 1.11 | Date formatting |

### Editor
| Package | Version | Purpose |
|---------|---------|---------|
| `@blocknote/core` | 0.46 | Block-based rich text editor |
| `@blocknote/react` | 0.46 | React wrapper for BlockNote |
| `@blocknote/mantine` | 0.46 | Mantine UI theme for BlockNote |
| `@blocknote/xl-pdf-exporter` | 0.46 | PDF export |
| `@blocknote/xl-docx-exporter` | 0.46 | DOCX export |

### Offline / Storage
| Package | Version | Purpose |
|---------|---------|---------|
| `dexie` | 4.2 | IndexedDB wrapper |
| `dexie-react-hooks` | 4.2 | React hooks for Dexie |

### Auth
| Package | Version | Purpose |
|---------|---------|---------|
| `keycloak-js` | 26.2 | Keycloak JavaScript adapter |

### Drag-and-Drop
| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | 6.3 | DnD core |
| `@dnd-kit/sortable` | 10.0 | Sortable lists |
| `@dnd-kit/utilities` | 4.0 | DnD utilities |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | 7.65 | Form state management |
| `zod` | 4.1 | Schema validation |

### i18n
| Package | Version | Purpose |
|---------|---------|---------|
| `i18next` | 25.0 | i18n framework |
| `react-i18next` | 15.5 | React bindings |
| `i18next-http-backend` | 3.0 | Load translations from files |
| `i18next-browser-languagedetector` | 8.0 | Auto-detect language |

---

## File Upload Storage

- **Upload directory:** `/app/uploads` (Docker volume: `uploads_data`)
- **Max file size:** 100 MB
- **Storage format:** Files saved with GUID filenames, original name preserved in DB
- **Access:** Public download (no auth required) via `GET /api/v1/files/{id}`
- **Allowed types:** JPEG, PNG, GIF, WebP, SVG, HEIC/HEIF, PDF, Office documents, ZIP, Markdown, plain text

---

## Background Services

### Trash Cleanup (`TrashCleanupService`)
- Runs every 1 hour
- Permanently deletes notes where `isDeleted = true` and `deletedAt` is older than 30 days
- Cascades: removes NoteTag and NoteShare records for deleted notes
- Logs cleanup results
