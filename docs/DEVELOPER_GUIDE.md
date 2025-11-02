# Developer Guide

## Prerequisites
- Node.js 18+
- PostgreSQL & Redis (via `docker-compose up -d`)
- n8n instance reachable at `N8N_WEBHOOK_BASE_URL`

## Environment Setup
```bash
cp .env.example .env
# Adjust secrets and connection strings as needed
```

## Useful Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (ts-node + nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run migrate` | Execute TypeORM migrations |
| `npm run seed` | Seed test user & baseline data |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Generate coverage report |
| `docker build -t aqua-thistle-backend .` | Build production Docker image |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format `src/**/*.ts` |

## API Documentation
- OpenAPI spec: `docs/api/openapi.yaml`
- Import into Swagger UI/Postman for interactive exploration.

## Workflow Tips
- **Testing**: Requires Node 18. Use `npm run test:coverage` before PRs.
- **Caching**: Redis must be running; caches auto-invalidate on data mutations.
- **Realtime**: Socket.io client should connect with `userId` in `auth` payload to receive events.
- **n8n**: Configure `N8N_webhook` env values and `N8N_API_KEY` for webhook authentication.

## Directory Highlights
- `src/services/` – business logic & integration points.
- `src/utils/calculations/` – financial calculators and engines.
- `src/websockets/socket.service.ts` – socket bootstrap + emit helpers.
- `tests/unit/` – Jest unit tests for calculators and middleware.

## Deployment Checklist
- `npm run build`
- Provide production `.env`
- Run migrations (`npm run migrate`)
- Ensure Redis + Postgres reachable
- Start server (`npm start` or container)
