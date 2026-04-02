# Fidant.AI Usage Analytics

Clean, minimal usage analytics system for AI assistant with daily limits and caching.

## Quick Start

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open http://localhost:3003

## API Endpoints

### GET /api/usage/stats
Returns usage statistics for authenticated user.

**Headers:** `Authorization: Bearer dev-usage-analytics-secret`  
**Query:** `?days=7` (1-90, default: 7)

### DELETE /api/cache/clear
Clears the usage cache.

**Headers:** `Authorization: Bearer dev-usage-analytics-secret`

## Features

- ✅ **API with authentication** - Bearer token auth
- ✅ **React dashboard** - Charts and statistics  
- ✅ **Caching system** - 5min TTL with fallback
- ✅ **Validation** - Parameter validation and error handling
- ✅ **Plan limits** - starter: 30, pro: 100, executive: 500

## Database

- **users** - User accounts with plan tiers
- **daily_usage_events** - Raw usage events (reserved/committed)
- **daily_usage_cache** - Precomputed daily aggregates

## Tech Stack

- Node.js + Express + TypeScript
- SQLite + Prisma ORM  
- React + Recharts (inline)
- CSS-in-JS styling