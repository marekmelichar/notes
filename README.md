# notes.nettio.eu

A notes application with a React frontend, a .NET API, PostgreSQL persistence, and Keycloak authentication.

## Current Architecture

- `ui/`: React 19, TypeScript, Vite, MUI, Redux Toolkit, TipTap, Axios
- `api/`: .NET 10, ASP.NET Core, Entity Framework Core, PostgreSQL
- `auth`: Keycloak with JWT bearer validation
- `infra`: Docker Compose for local development, Nginx and GitHub Actions for deployment

The app is currently a server-backed, single-owner notes product. It does not ship an offline-first sync layer, generated API client, or collaboration workflow.

## Repository Layout

```text
notes.nettio.eu/
├── api/                    # .NET API and integration tests
├── ui/                     # React frontend
├── deploy/                 # Deployment scripts and configs
├── docs/                   # Product and operational docs
├── docker-compose.yml      # Local development stack
└── docker-compose.prod.yml # Production deployment stack
```

## Local Development

### Prerequisites

- Docker and Docker Compose
- Node.js 22+
- .NET 10 SDK

### Start the stack

```bash
docker compose up -d
```

Services:

- Frontend via Docker: `http://localhost:3000`
- Frontend via Vite: `http://localhost:5173`
- API: `http://localhost:5001`
- Keycloak Admin: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

### Frontend development

```bash
cd ui
npm install
npm run dev
```

### Quality checks

```bash
cd ui
npm run lint
npm run build
```

## Deployment

See `deploy/` and the GitHub Actions workflow for deployment details. Production uses container images, Nginx reverse proxying, and TLS termination at the edge.

## License

Private - All rights reserved
