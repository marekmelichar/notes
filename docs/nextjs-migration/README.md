# e-poznamky (e-notes) — Full Project Documentation for Next.js Rebuild

This documentation describes the complete architecture, features, data models, API contracts, authentication flow, and UI behavior of the **e-poznamky** note-taking application. It is intended to serve as a specification for rebuilding the frontend in **Next.js** while keeping the existing **.NET 10 API**, **PostgreSQL 16**, and **Keycloak 26** backend stack.

## Documentation Index

| File | Description |
|------|-------------|
| [01-project-overview.md](./01-project-overview.md) | High-level architecture, tech stack, environment URLs |
| [02-data-models.md](./02-data-models.md) | All entity models, DTOs, request/response shapes |
| [03-api-endpoints.md](./03-api-endpoints.md) | Complete REST API reference with all endpoints |
| [04-authentication.md](./04-authentication.md) | Keycloak OIDC integration, JWT flow, token refresh |
| [05-features-and-ui.md](./05-features-and-ui.md) | Every feature, page, and UI component specification |
| [06-state-management.md](./06-state-management.md) | All application state, persistence, and sync patterns |
| [07-internationalization.md](./07-internationalization.md) | i18n setup and complete translation keys |
| [08-infrastructure.md](./08-infrastructure.md) | Docker, Nginx, CI/CD, environment configuration |

## What to Keep (Backend — No Changes)

- **.NET 10 API** — All controllers, services, and database logic remain unchanged
- **PostgreSQL 16** — Database schema, migrations, and full-text search stay as-is
- **Keycloak 26** — Realm configuration, client setup, and OIDC flow are preserved
- **Docker Compose** — Backend services (db, keycloak, api) remain the same
- **Nginx** — Reverse proxy config for API and Keycloak paths stays unchanged

## What to Rebuild (Frontend)

Replace the React 19 + Vite SPA with a **Next.js** application that replicates all functionality:

- All pages (notes, settings, no-access, not-found)
- Rich text editor (BlockNote or alternative)
- Folder/tag sidebar with drag-and-drop
- Tabbed editor with auto-save
- Mobile-responsive layout with bottom navigation
- Dark/light theme with custom primary color
- Offline-first with IndexedDB sync queue
- File upload/download
- Export to PDF, DOCX, Markdown, HTML
- Global search with keyboard navigation
- i18n (Czech + English)

## Quick Start (Existing Backend)

```bash
# Start backend services (PostgreSQL, Keycloak, API)
docker compose up -d notes-db notes-keycloak notes-api

# Database: localhost:5432 (postgres/postgres, db: notes)
# Keycloak: localhost:8080 (admin/admin, realm: notes)
# API: localhost:5001 (all endpoints under /api/v1/)

# Test user: testuser / testuser (test@example.com)
```
