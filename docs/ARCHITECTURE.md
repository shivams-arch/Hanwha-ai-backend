# Project AQUA THISTLE Backend Architecture

## Overview
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (TypeORM)
- **Cache**: Redis (sessions, calculations, dashboard, chat)
- **AI Workflow**: n8n webhook orchestrating LangChain + OpenAI
- **Realtime**: Socket.io (per-user rooms for dashboard/chat updates)

## Layered Structure
```
src/
├── config/          # env, database, redis
├── controllers/     # HTTP handlers (thin)
├── services/        # Business logic + aggregation
├── routes/          # Express routers, validation hooks
├── middleware/      # auth, validation, error handling
├── utils/           # calculators, cache helpers
├── validators/      # Joi schemas
├── websockets/      # socket service bootstrap
```

## Data Flow Examples
1. **Budget Calculation**
   - `CalculationService` composes user profile, categories, transactions, goals.
   - `BudgetCalculator` produces summary → cached via `calculation-cache`.
   - Dashboard + chat requests reuse cached summary for responsiveness.

2. **AI Chat**
   - `/chat/message` → `ChatService` builds context → n8n webhook.
   - n8n response hits `/webhooks/n8n/response` → conversation persisted + cache invalidated → socket emits `chat:message`.

3. **Dashboard Metrics**
   - `DashboardService` aggregates from `CalculationService`, `CategoryService`, `TransactionService`, `ConversationService`.
   - Results cached (`dashboard-cache`) for 60 seconds.
   - Mutations (transactions/categories/profile/chat) invalidate caches and emit `dashboard:update`.

## Redis Key Strategy
- `session:{sessionId}` – auth sessions
- `conversation:{sessionId}` – chat history
- `dashboard:{userId}:*` – dashboard caches
- `budget_calc:{userId}:{scenario}` – calculation caches

## Socket Channels
- Room: `{userId}`
- Events: `dashboard:update`, `chat:message`, `chat:session:cleared`

## External Dependencies
- PostgreSQL (Docker compose service)
- Redis (Docker compose service)
- n8n (managed externally, configured via env)

## Deployment Notes
- `npm run build` → compile to `dist/`
- Serve `dist/app.js` behind process manager (PM2, systemd)
- Ensure environment variables mirror `.env.example`
