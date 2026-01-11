# epoznamky.cz

A note-taking application with React frontend, .NET API, PostgreSQL database, and Keycloak authentication.

## Project Structure

```
epoznamky.cz/
├── api/                    # .NET 10 API
│   └── EpoznamkyApi/
├── ui/                     # React/Vite/MUI frontend
├── deploy/                 # Deployment scripts and configs
│   ├── nginx.conf          # Production nginx reverse proxy
│   ├── setup-vps.sh        # Initial VPS setup script
│   └── setup-ssl.sh        # SSL certificate setup
├── docker-compose.yml      # Local development
├── docker-compose.prod.yml # Production deployment
├── init-db.sql             # Database initialization
└── keycloak-realm.json     # Keycloak realm configuration
```

## Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js 22+ (for UI development without Docker)
- .NET 10 SDK (for API development without Docker)

### Quick Start (Docker)

```bash
# Start all services (API, DB, Keycloak)
docker compose up -d

# Access the application
# Frontend: http://localhost:3000 (via Docker)
# API: http://localhost:5001
# Keycloak Admin: http://localhost:8080 (admin/admin)
```

### Frontend Development (Recommended)

```bash
cd ui
npm install
npm run dev    # http://localhost:5173
```

This runs Vite dev server with hot reload. API calls are proxied to localhost:5001.

### Development URLs

| Service | Docker | Vite Dev | Credentials |
|---------|--------|----------|-------------|
| Frontend | http://localhost:3000 | http://localhost:5173 | - |
| API | http://localhost:5001 | http://localhost:5001 | - |
| Keycloak Admin | http://localhost:8080 | http://localhost:8080 | admin / admin |
| PostgreSQL | localhost:5432 | localhost:5432 | postgres / postgres |

### Code Quality

Pre-commit hooks automatically run lint and build checks:

```bash
# Manual lint check
cd ui && npm run lint

# Manual build check
cd ui && npm run build
```

## Production Deployment

See [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Overview

1. Push to `main` branch triggers GitHub Actions
2. Docker images are built and pushed to GitHub Container Registry
3. Images are pulled and deployed on VPS via SSH
4. Nginx handles SSL termination and reverse proxy

## Tech Stack

### Frontend (ui/)
- React 19 with TypeScript
- Vite 7 for build tooling
- Material-UI (MUI) v6 for components
- Redux Toolkit for state management
- React Query for API calls
- BlockNote for rich text editing
- Keycloak JS for authentication
- i18next for internationalization
- ESLint + Prettier for code quality
- Husky pre-commit hooks (lint + build)

### Backend (api/)
- .NET 10
- Entity Framework Core
- PostgreSQL database
- JWT authentication via Keycloak

### Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL
- GitHub Actions CI/CD
- GitHub Container Registry

## License

Private - All rights reserved
