# PROJECT AQUA THISTLE - Backend API

Backend API for PROJECT AQUA THISTLE - An AI-powered financial mentorship platform for GenZ users.

## Tech Stack

- **Framework**: Node.js + Express.js with TypeScript
- **Database**: PostgreSQL (with TypeORM)
- **Cache**: Redis
- **AI Integration**: n8n workflows with LangChain + OpenAI GPT-4
- **Testing**: Jest + Supertest

## Architecture

This backend uses a **hybrid architecture**:
- **Custom Express API**: Handles user management, financial calculations, dashboard data, and real-time updates
- **n8n Workflows**: Handles AI chatbot interactions (LangChain + OpenAI integration)
- The custom API triggers n8n workflows and receives responses via webhooks

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for PostgreSQL and Redis)
- n8n instance (for AI chatbot functionality)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL and Redis with Docker:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed test user data:**
   ```bash
   npm run seed
   ```

### Development

Start the development server with hot reload:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed test data
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration (DB, Redis, env)
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/           # TypeORM entity models
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   ├── validators/       # Request validation schemas
│   ├── websockets/       # WebSocket/SSE handlers
│   ├── scripts/          # Migration and seed scripts
│   └── app.ts            # Express app entry point
├── db/
│   ├── migrations/       # Database migrations
│   └── seeds/            # Seed data scripts
├── tests/                # Test files
├── n8n/
│   └── workflows/        # n8n workflow exports
└── docs/                 # API documentation
```

## Database Schema

### Tables

1. **users** - User profiles and financial data
2. **categories** - Budget categories (Finance, Education, Family, Friends, Vacation)
3. **transactions** - Income and expense transactions
4. **financial_goals** - User financial goals and progress
5. **conversations** - AI chatbot conversation history

### Test User Profile

A test user is seeded with the following profile:
- **Email**: test@aquathistle.com
- **Password**: password123
- **Bank Balance**: $5,250
- **Monthly Income**: $4,500
- **Monthly Expenses**: $2,800
- **Job**: Full-time Software Developer
- **Goals**: Emergency fund, house down payment, student loan payoff, AWS Solutions Architect exam (120 study hours, target 2025-05-01)

### Education Goal Metadata

Education-oriented goals capture detailed study plans, focus areas, milestones, and resource links. The `/api/v1/goals/progress` endpoint returns these enriched fields so Finny can coach users on exams or certifications alongside budget advice.

## API Endpoints

### Health Check
- `GET /health` - Server health check

### API Info
- `GET /api/v1` - API version and endpoint information

### Authentication
- `POST /api/v1/auth/register` - Register a new user (auto provisions default categories)
- `POST /api/v1/auth/login` - Authenticate and receive tokens
- `POST /api/v1/auth/logout` - Revoke current session
- `GET /api/v1/auth/me` - Retrieve current authenticated user
- `POST /api/v1/auth/refresh` - Refresh access token using refresh token

### User Profile
- `GET /api/v1/users/profile` - Get current user's profile
- `PUT /api/v1/users/profile` - Update profile information
- `GET /api/v1/users/profile/financial-summary` - Retrieve financial summary snapshot
- `PUT /api/v1/users/profile/financial-data` - Update financial data fields

### Category Management
- `GET /api/v1/categories` - List categories for current user
- `POST /api/v1/categories` - Create a new category
- `PUT /api/v1/categories/:id` - Update category metadata/budget
- `DELETE /api/v1/categories/:id` - Delete a category (fails if transactions exist)
- `GET /api/v1/categories/:id` - Fetch category details
- `GET /api/v1/categories/:id/transactions` - List transactions linked to a category
- `GET /api/v1/categories/:id/summary` - Category-level budget summary
- `GET /api/v1/categories/overview` - Aggregated overview (totals, utilization, overspending)

### Transactions
- `POST /api/v1/transactions` - Create income/expense transaction
- `GET /api/v1/transactions` - List transactions with filtering, pagination, and sorting
- `GET /api/v1/transactions/:id` - Fetch transaction by ID
- `PUT /api/v1/transactions/:id` - Update transaction (re-sync budgets automatically)
- `DELETE /api/v1/transactions/:id` - Delete transaction (re-sync budgets automatically)
- `GET /api/v1/transactions/stats` - Net cash flow and summary statistics

### Financial Calculations
- `POST /api/v1/calculations/budget` - Generate budget summary (cached for 5 minutes)
- `POST /api/v1/calculations/scenario` - Run affordability, projection, debt, or savings scenarios
- `GET /api/v1/calculations/projections` - Forecast income vs expenses for up to 10 years
- `POST /api/v1/calculations/affordability` - Shortcut for "Can I afford this?" checks

### Goals
- `GET /api/v1/goals/progress` - View completion metrics for active financial goals

### Dashboard
- `GET /api/v1/dashboard/overview` - Unified snapshot of budget, goals, and recent activity
- `GET /api/v1/dashboard/charts/budget-breakdown` - Category budget vs spend (pie)
- `GET /api/v1/dashboard/charts/spending-trends` - Monthly income vs expense trendline
- `GET /api/v1/dashboard/charts/category-comparison` - Top spending categories (bar)
- `GET /api/v1/dashboard/insights` - Finny tips distilled from recent chats

### Chat (AI Assistant)
- `POST /api/v1/chat/message` - Send message to Finny and receive the AI response
- `GET /api/v1/chat/history/:sessionId` - Fetch recent conversation messages
- `DELETE /api/v1/chat/session/:sessionId` - Clear and archive a chat session

### Webhooks
- `POST /api/v1/webhooks/n8n/response` - Receive asynchronous responses from n8n (requires `x-api-key`)

## Redis Key Structure

- `session:{sessionId}` - User sessions
- `conversation:{sessionId}` - Conversation history cache
- `dashboard:{userId}` - Dashboard data cache
- `budget_calc:{userId}:{scenario}` - Calculation results cache

## n8n Integration

The AI chatbot functionality is handled by n8n workflows. The workflow is located in:
- `n8n/workflows/finance-assistant.json`

### n8n Webhook Configuration
- **Incoming Webhook**: `POST /webhook/finance-assistant`
- **Outgoing Webhook**: `POST /api/v1/webhooks/n8n/response` (include `x-api-key: <N8N_API_KEY>`)

Each chat request forwards profile, budget summary, goal progress, and top categories to n8n so the workflow can answer with real-time financial context. Cached calculations keep response times low while redis stores conversation history for fast follow-up prompts.

## Real-time Updates

- Socket.io server starts with the API (same port) and supports per-user rooms keyed by `userId`
- Events
  - `dashboard:update` when transactions, categories, or profile changes affect KPIs
  - `chat:message` when Finny replies to the user
  - `chat:session:cleared` when a conversation is reset
- Clients connect using `io("/", { auth: { userId } })` or query parameters

## Documentation

- **Architecture Overview**: `docs/ARCHITECTURE.md`
- **Developer Guide**: `docs/DEVELOPER_GUIDE.md`
- **OpenAPI Spec**: `docs/api/openapi.yaml`
- Phase reports: `PHASE*_COMPLETE.md`

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `PORT` - API server port (default: 3000)
- `DB_*` - PostgreSQL configuration
- `REDIS_*` - Redis configuration
- `JWT_SECRET` - JWT signing secret
- `N8N_WEBHOOK_BASE_URL` - n8n instance URL
- `N8N_FINANCE_ASSISTANT_WEBHOOK` - n8n inbound webhook path for Finny
- `N8N_API_KEY` - Shared secret for authenticating n8n → backend webhooks
- `OPENAI_API_KEY` - OpenAI API key (used in n8n)

## Development Roadmap

### Phase 1: Project Foundation ✅
- [x] Project structure setup
- [x] Database schema and migrations
- [x] Redis configuration
- [x] Environment configuration

### Phase 2: Core API Infrastructure (Next)
- [ ] Express server with middleware
- [ ] Authentication & authorization
- [ ] Input validation & security
- [ ] Error handling & logging

### Phase 3-11: Feature Implementation
See `BACKEND_IMPLEMENTATION_PLAN.md` for detailed roadmap.

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## License

ISC
