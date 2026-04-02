# Usage Analytics API

## Setup
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Features
- Usage stats endpoint
- Reserved expiration logic (15 min)
- Cache layer with fallback
- React component

## Assumptions
- UTC timezone
- Reserved TTL = 15 minutes

## Improvements
- Redis cache
- Background jobs
