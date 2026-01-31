# 01 — Project Overview

## What Is This App?

**e-poznamky** ("e-notes") is a full-stack note-taking application with:

- Rich text editing (BlockNote — block-based, like Notion)
- Hierarchical folder organization
- Tag-based categorization
- Note sharing between users
- Offline-first architecture with sync queue
- File attachments (images, documents)
- Export to PDF, DOCX, Markdown, HTML
- Responsive layout (desktop 3-column, mobile single-panel)
- Dark/light theme with custom accent color
- Internationalization (Czech + English)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                                                      │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Next.js App  │  │ IndexedDB │  │ Keycloak JS   │ │
│  │  (Frontend)   │  │ (Dexie)   │  │ (Auth Client) │ │
│  └──────┬───────┘  └─────┬────┘  └──────┬────────┘ │
└─────────┼────────────────┼──────────────┼───────────┘
          │                │              │
          │ REST API       │ Offline      │ OIDC/JWT
          │ /api/v1/*      │ Sync Queue   │
          ▼                │              ▼
┌─────────────────┐       │     ┌─────────────────┐
│  .NET 10 API     │       │     │  Keycloak 26     │
│  (Backend)       │       │     │  (Auth Server)   │
│                  │◄──────┘     │                  │
│  - Controllers   │             │  - OIDC/PKCE     │
│  - DataService   │             │  - JWT tokens    │
│  - EF Core       │             │  - User mgmt     │
└────────┬─────────┘             └────────┬─────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL 16                        │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ notes DB  │  │keycloak  │  │ Full-Text Search  │ │
│  │           │  │  DB      │  │ (tsvector + GIN)  │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend (current) | React, TypeScript, Vite, MUI v6, Redux Toolkit | React 19 |
| Frontend (target) | **Next.js**, TypeScript | Latest |
| Rich Text Editor | BlockNote (block-based, Notion-like) | 0.46.x |
| Offline Storage | Dexie (IndexedDB wrapper) | 4.2.x |
| Backend API | .NET, Entity Framework Core | .NET 10 |
| Database | PostgreSQL | 16 |
| Auth | Keycloak (OIDC + JWT, PKCE flow) | 26 |
| Reverse Proxy | Nginx | 1.27 |
| Containerization | Docker Compose | Latest |
| CI/CD | GitHub Actions | - |

## Environment URLs

| Service | Local Dev | Docker | Production |
|---------|-----------|--------|------------|
| Frontend | http://localhost:3000 | http://localhost:3000 | https://notes.nettio.eu |
| API | http://localhost:5001 | http://localhost:5001 | https://notes.nettio.eu/api |
| Keycloak | http://localhost:8080 | http://localhost:8080 | https://notes.nettio.eu/auth |
| PostgreSQL | localhost:5432 | localhost:5432 | Internal only |

## API Base URL

All API requests use the prefix `/api/v1/`. The base URL is configurable:

- **Local dev**: `http://localhost:5001` (or proxy from frontend dev server)
- **Docker**: Relative URLs (same origin, Nginx proxies `/api/` to the API container)
- **Production**: `https://notes.nettio.eu` (Nginx proxies `/api/` to the API container)

## CORS Configuration

The API allows requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- `https://notes.nettio.eu`

All headers, all methods, credentials allowed.

## Key Constants

```typescript
const HEADER_HEIGHT = 64;          // px - top header bar
const MOBILE_NAV_HEIGHT = 56;      // px - bottom navigation on mobile
const MOBILE_BREAKPOINT = 768;     // px (use 48rem in CSS)
const SNACKBAR_AUTOHIDE = 10000;   // ms
const AUTO_SAVE_DELAY = 10000;     // ms - editor auto-save countdown
const SEARCH_DEBOUNCE = 300;       // ms
const INPUT_DEBOUNCE = 500;        // ms
const MAX_OPEN_TABS = 20;          // editor tab limit
const TRASH_RETENTION_DAYS = 30;   // days before permanent deletion
const MAX_FILE_SIZE = 104857600;   // 100 MB
const TOKEN_REFRESH_INTERVAL = 60; // seconds - Keycloak token refresh
```
