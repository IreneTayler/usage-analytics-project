import express, { Request } from 'express'
import { PrismaClient, users } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()
const app = express()

const projectRoot = path.resolve(__dirname, '..')

function sendBrowserAsset(res: express.Response, relativeToProjectRoot: string) {
  const filePath = path.join(projectRoot, relativeToProjectRoot)
  if (!fs.existsSync(filePath)) {
    console.error('Missing browser asset:', filePath)
    return res.status(404).type('text/plain').send(`Missing file: ${relativeToProjectRoot}`)
  }
  res.type('application/javascript')
  return res.sendFile(filePath)
}

// Serve UMD bundles from node_modules so the UI works without CDN (unpkg blocked/offline).
app.get('/assets/react.js', (_req, res) =>
  sendBrowserAsset(res, 'node_modules/react/umd/react.production.min.js'))
app.get('/assets/react-dom.js', (_req, res) =>
  sendBrowserAsset(res, 'node_modules/react-dom/umd/react-dom.production.min.js'))
app.get('/assets/react-is.js', (_req, res) =>
  sendBrowserAsset(res, 'node_modules/react-is/umd/react-is.production.min.js'))
app.get('/assets/recharts.js', (_req, res) =>
  sendBrowserAsset(res, 'node_modules/recharts/umd/Recharts.js'))
app.get('/assets/babel.min.js', (_req, res) =>
  sendBrowserAsset(res, 'node_modules/@babel/standalone/babel.min.js'))

app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  executive: 500,
}

const DEFAULT_LIMIT = LIMITS.starter

function dailyLimitForTier(planTier: string): number {
  return LIMITS[planTier] ?? DEFAULT_LIMIT
}

async function userFromRequest(req: Request): Promise<users | null> {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null
  return prisma.users.findUnique({ where: { api_key: token } })
}

async function updateCacheForDate(userId: number, dateKey: string) {
  const FIFTEEN_MIN = 15 * 60 * 1000

  const [committed, reserved] = await Promise.all([
    prisma.daily_usage_events.count({
      where: {
        user_id: userId,
        date_key: dateKey,
        status: 'committed',
      },
    }),
    prisma.daily_usage_events.count({
      where: {
        user_id: userId,
        date_key: dateKey,
        status: 'reserved',
        reserved_at: { gte: new Date(Date.now() - FIFTEEN_MIN) },
      },
    }),
  ])

  await prisma.daily_usage_cache.upsert({
    where: {
      user_id_date_key: { user_id: userId, date_key: dateKey },
    },
    update: { committed, reserved },
    create: { user_id: userId, date_key: dateKey, committed, reserved },
  })

  return { committed, reserved }
}

app.delete('/api/cache/clear', async (req, res) => {
  try {
    const user = await userFromRequest(req)
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing API key'
        }
      })
    }

    await prisma.daily_usage_cache.deleteMany()
    res.json({ message: 'Cache cleared successfully' })
  } catch (error) {
    console.error('Error clearing cache:', error)
    res.status(500).json({ error: 'Failed to clear cache' })
  }
})

app.get('/api/usage/stats', async (req, res) => {
  try {
    const user = await userFromRequest(req)
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization: Bearer <api_key>',
        },
      })
    }

    const daysParam = req.query.days as string
    const days = Math.min(Math.max(Number(daysParam) || 7, 1), 90)

    if (
      daysParam !== undefined &&
      daysParam !== '' &&
      (isNaN(Number(daysParam)) || Number(daysParam) < 1 || Number(daysParam) > 90)
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMETER',
          message: 'Parameter "days" must be between 1 and 90',
        },
      })
    }

    const today = new Date()
    const dates: string[] = []
    const fromDate = new Date()
    fromDate.setDate(today.getDate() - (days - 1))

    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate)
      d.setDate(fromDate.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }

    const cachedData = await prisma.daily_usage_cache.findMany({
      where: {
        user_id: user.id,
        date_key: { in: dates },
      },
    })

    const dataMap = new Map<string, { committed: number; reserved: number }>()
    dates.forEach(d => dataMap.set(d, { committed: 0, reserved: 0 }))

    const CACHE_TTL = 5 * 60 * 1000
    let usedStaleCacheFallback = false

    for (const date of dates) {
      const cached = cachedData.find(c => c.date_key === date)
      const cacheFresh =
        cached && Date.now() - cached.updated_at.getTime() <= CACHE_TTL

      if (cacheFresh) {
        dataMap.set(date, { committed: cached.committed, reserved: cached.reserved })
        continue
      }

      try {
        const fresh = await updateCacheForDate(user.id, date)
        dataMap.set(date, fresh)
      } catch (err) {
        console.error(`Cache refresh failed for ${date}, using fallback:`, err)
        if (cached) {
          dataMap.set(date, { committed: cached.committed, reserved: cached.reserved })
        }
        usedStaleCacheFallback = true
      }
    }

    const limit = dailyLimitForTier(user.plan_tier)

    const daysData = dates.map(date => {
      const d = dataMap.get(date)!
      return {
        date,
        committed: d.committed,
        reserved: d.reserved,
        limit,
        utilization: d.committed / limit,
      }
    })

    const totalCommitted = daysData.reduce((sum, day) => sum + day.committed, 0)
    const avgDaily = totalCommitted / days

    const peakDay = daysData.reduce(
      (peak, day) =>
        day.committed > peak.count ? { date: day.date, count: day.committed } : peak,
      { date: daysData[0].date, count: daysData[0].committed }
    )

    let currentStreak = 0
    for (let i = daysData.length - 1; i >= 0; i--) {
      if (daysData[i].committed > 0) {
        currentStreak++
      } else {
        break
      }
    }

    const response = {
      plan: user.plan_tier,
      daily_limit: limit,
      period: {
        from: dates[0],
        to: dates[dates.length - 1],
      },
      days: daysData,
      summary: {
        total_committed: totalCommitted,
        avg_daily: Math.round(avgDaily * 10) / 10,
        peak_day: peakDay,
        current_streak: currentStreak,
      },
      meta: {
        stale_cache_fallback: usedStaleCacheFallback,
      },
    }

    res.json(response)
  } catch (error) {
    console.error('Error in /api/usage/stats:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  }
})

const PORT = process.env.PORT || 3003
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
