# Deployment Guide

## Requirements
- Docker 20+
- docker compose v2
- Node 18+ (for building locally)
- Access to PostgreSQL & Redis (Dockerized or managed services)
- n8n workflow host reachable from the backend

## 1. Build & Test
```bash
npm install
npm run build
npm test
```

## 2. Docker Build (production image)
```bash
docker build -t aqua-thistle-backend:latest .
```

## 3. Local Environment (docker compose)
```bash
docker compose up -d
```
Services:
- `postgres` – port 5432
- `redis` – port 6379

> The backend container is not defined in compose (optional). Use the Dockerfile for deployment.

## 4. Environment Variables
- Example production file: `.env.production.example`
- Copy to your deployment environment and inject secrets via platform-specific methods.

## 5. Running in Production
```bash
npm run build
NODE_ENV=production PORT=3000 node dist/app.js
```

### Using Docker Image
```bash
docker run \
  --env-file .env.production \
  -p 3000:3000 \
  aqua-thistle-backend:latest
```

## 6. CI/CD Suggestions
- GitHub Actions workflow steps:
  1. Checkout & install dependencies
  2. `npm run lint`
  3. `npm test`
  4. `npm run build`
  5. `docker build` + push image to registry
  6. Deploy (e.g., using SSH, Kubernetes, or PaaS CLI)

## 7. Monitoring & Logging
- Expose Winston logs to stdout/stderr (already configured)
- Aggregate logs via platform (CloudWatch, Stackdriver, etc.)
- Consider PM2 or systemd for restart policies when running without Docker

## 8. n8n Integration Notes
- Ensure backend URL is whitelisted in n8n workflow triggers
- Set `N8N_API_KEY` consistently on backend + n8n HTTP Request node headers

## 9. Database & Cache Backups
- PostgreSQL: `pg_dump` or managed snapshots
- Redis: append-only file already enabled (`redis-server --appendonly yes`)

## 10. Post-Deployment Checklist
- `GET /health` returns status 200
- Auth flow: register → login → `/users/profile`
- Dashboard endpoints return data
- Chat message round-trip success (requires n8n)
- Socket client receives `dashboard:update` on data change
