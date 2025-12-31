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

### Quick Start

```bash
# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:5001
# Keycloak Admin: http://localhost:8080 (admin/admin)
# PostgreSQL: localhost:5432 (postgres/postgres)
```

### Development URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| API | http://localhost:5001 | - |
| Keycloak Admin | http://localhost:8080 | admin / admin |
| PostgreSQL | localhost:5432 | postgres / postgres |

## Production Deployment

See [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Overview

1. Push to `main` branch triggers GitHub Actions
2. Docker images are built and pushed to GitHub Container Registry
3. Images are pulled and deployed on VPS via SSH
4. Nginx handles SSL termination and reverse proxy

## Tech Stack

### Frontend (ui/)
- React 18 with TypeScript
- Vite for build tooling
- Material-UI (MUI) for components
- Redux Toolkit for state management
- React Query for API calls
- Keycloak JS for authentication
- i18next for internationalization

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
