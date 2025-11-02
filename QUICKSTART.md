# Quick Start Guide - PROJECT AQUA THISTLE Backend

This guide will get you up and running in 5 minutes.

## Prerequisites

Make sure you have installed:
- Node.js 18+ (`node --version`)
- npm (`npm --version`)
- Docker Desktop (`docker --version`)
- Docker Compose (`docker-compose --version`)

## Step-by-Step Setup

### 1. Install Dependencies (1 minute)

```bash
cd backend
npm install
```

### 2. Start Docker Services (30 seconds)

This starts PostgreSQL and Redis in Docker containers:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

You should see:
- `aqua-thistle-postgres` - healthy
- `aqua-thistle-redis` - healthy

### 3. Configure Environment (30 seconds)

The `.env` file has already been created from `.env.example`.

**Optional**: Review and modify `.env` if needed (default values work for local dev).

### 4. Run Database Migrations (30 seconds)

Create the database schema:

```bash
npm run migrate
```

Expected output:
```
🚀 Starting database migrations...
✅ Database connection established
✅ Successfully ran 1 migration(s):
   - InitialSchema1730000000000
✅ Database connection closed
```

### 5. Seed Test Data (30 seconds)

Populate the database with test user:

```bash
npm run seed
```

Expected output:
```
🚀 Starting database seeding...
✅ Database connection established
🌱 Seeding test user...
✅ Test user created: test@aquathistle.com
✅ Default categories created for test user
✅ Financial goals created for test user
🎉 Seeding completed successfully!
```

### 6. Start Development Server (immediate)

```bash
npm run dev
```

Expected output:
```
🚀 SERVER STARTED
================================
Environment: development
Port: 3000
API Version: v1
Health Check: http://localhost:3000/health
API Base: http://localhost:3000/api/v1
================================
```

### 7. Test the API (immediate)

Open a new terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api/v1
```

## Test User Credentials

**Email**: test@aquathistle.com
**Password**: password123

**Profile**:
- Bank Balance: $5,250
- Monthly Income: $4,500
- Monthly Expenses: $2,800
- Job: Full-time Software Developer

**Financial Goals**:
1. Emergency Fund ($10,000 target)
2. House Down Payment ($50,000 target)
3. Pay Off Student Loans ($25,000 target)

## Useful Commands

```bash
# Development
npm run dev              # Start dev server (hot reload)
npm run build            # Build for production
npm start                # Start production server

# Database
npm run migrate          # Run migrations
npm run seed             # Seed test data

# Docker
docker-compose up -d     # Start services
docker-compose down      # Stop services
docker-compose logs      # View logs
docker-compose restart   # Restart services

# Code Quality
npm run lint             # Check code quality
npm run format           # Format code
npm test                 # Run tests (Phase 8)
```

## Troubleshooting

### Port 5432 already in use (PostgreSQL)
If you have PostgreSQL running locally:
```bash
# Option 1: Stop local PostgreSQL
brew services stop postgresql

# Option 2: Change port in docker-compose.yml and .env
# Edit ports: "5433:5432" in docker-compose.yml
# Update DB_PORT=5433 in .env
```

### Port 6379 already in use (Redis)
If you have Redis running locally:
```bash
# Option 1: Stop local Redis
brew services stop redis

# Option 2: Change port in docker-compose.yml and .env
# Edit ports: "6380:6379" in docker-compose.yml
# Update REDIS_PORT=6380 in .env
```

### Migration fails
```bash
# Reset database
docker-compose down -v
docker-compose up -d
npm run migrate
npm run seed
```

### TypeScript errors
```bash
# Rebuild
npm run build

# Check for syntax errors
npm run lint
```

## Accessing Services Directly

### PostgreSQL
```bash
# Connect to PostgreSQL
docker exec -it aqua-thistle-postgres psql -U aqua_user -d aqua_thistle_db

# View tables
\dt

# View users
SELECT * FROM users;

# Exit
\q
```

### Redis
```bash
# Connect to Redis
docker exec -it aqua-thistle-redis redis-cli

# List all keys
KEYS *

# Get a value
GET session:test-session-id

# Exit
exit
```

## Next Steps

1. **Phase 1 Complete** ✅ - Foundation is ready!
2. **Phase 2 Next** - Implement authentication & core API endpoints
3. **Review**: Check `BACKEND_IMPLEMENTATION_PLAN.md` for full roadmap

## Need Help?

- Check `README.md` for detailed documentation
- Review `BACKEND_IMPLEMENTATION_PLAN.md` for implementation phases
- Check `PHASE1_COMPLETE.md` for what's been built

---

**Happy Coding!** 🚀
