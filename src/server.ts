import express from 'express'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const prisma = new PrismaClient()
const app = express()

app.use(express.json())
app.use(express.static('public'))

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  executive: 500,
}

// Helper function to update cache for a specific date
async function updateCacheForDate(userId: number, dateKey: string) {
  const FIFTEEN_MIN = 15 * 60 * 1000

  const [committed, reserved] = await Promise.all([
    prisma.daily_usage_events.count({
      where: {
        user_id: userId,
        date_key: dateKey,
        status: 'committed'
      }
    }),
    prisma.daily_usage_events.count({
      where: {
        user_id: userId,
        date_key: dateKey,
        status: 'reserved',
        reserved_at: { gte: new Date(Date.now() - FIFTEEN_MIN) }
      }
    })
  ])

  await prisma.daily_usage_cache.upsert({
    where: {
      user_id_date_key: { user_id: userId, date_key: dateKey }
    },
    update: { committed, reserved },
    create: { user_id: userId, date_key: dateKey, committed, reserved }
  })

  return { committed, reserved }
}

// Test endpoint to clear cache
app.delete('/api/cache/clear', async (req, res) => {
  try {
    await prisma.daily_usage_cache.deleteMany()
    res.json({ message: 'Cache cleared successfully' })
  } catch (error) {
    console.error('Error clearing cache:', error)
    res.status(500).json({ error: 'Failed to clear cache' })
  }
})

app.get('/api/usage/stats', async (req, res) => {
  try {
    const userId = 1 // mock auth

    // Validate days parameter
    const daysParam = req.query.days as string
    const days = Math.min(Math.max(Number(daysParam) || 7, 1), 90)

    if (daysParam && (isNaN(Number(daysParam)) || Number(daysParam) < 1 || Number(daysParam) > 90)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMETER',
          message: 'Parameter "days" must be between 1 and 90'
        }
      })
    }

    const user = await prisma.users.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found'
        }
      })
    }

    // Generate date range
    const today = new Date()
    const dates: string[] = []
    const fromDate = new Date()
    fromDate.setDate(today.getDate() - (days - 1))

    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate)
      d.setDate(fromDate.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }

    // Try to get data from cache first
    const cachedData = await prisma.daily_usage_cache.findMany({
      where: {
        user_id: userId,
        date_key: { in: dates }
      }
    })

    const dataMap = new Map()
    dates.forEach(d => dataMap.set(d, { committed: 0, reserved: 0 }))

    // Check which dates need cache updates (missing or stale)
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    const datesToUpdate: string[] = []

    for (const date of dates) {
      const cached = cachedData.find(c => c.date_key === date)
      if (!cached || Date.now() - cached.updated_at.getTime() > CACHE_TTL) {
        datesToUpdate.push(date)
      } else {
        dataMap.set(date, { committed: cached.committed, reserved: cached.reserved })
      }
    }

    // Update stale cache entries
    if (datesToUpdate.length > 0) {
      const updatePromises = datesToUpdate.map(date => updateCacheForDate(userId, date))
      const updatedData = await Promise.all(updatePromises)

      datesToUpdate.forEach((date, index) => {
        dataMap.set(date, updatedData[index])
      })
    }

    const limit = LIMITS[user.plan_tier]

    // Build daily data
    const daysData = dates.map(date => {
      const d = dataMap.get(date)
      return {
        date,
        committed: d.committed,
        reserved: d.reserved,
        limit,
        utilization: d.committed / limit
      }
    })

    // Calculate summary statistics
    const totalCommitted = daysData.reduce((sum, day) => sum + day.committed, 0)
    const avgDaily = totalCommitted / days

    // Find peak day
    const peakDay = daysData.reduce((peak, day) =>
      day.committed > peak.count ? { date: day.date, count: day.committed } : peak,
      { date: daysData[0].date, count: daysData[0].committed }
    )

    // Calculate current streak
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
        to: dates[dates.length - 1]
      },
      days: daysData,
      summary: {
        total_committed: totalCommitted,
        avg_daily: Math.round(avgDaily * 10) / 10,
        peak_day: peakDay,
        current_streak: currentStreak
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error in /api/usage/stats:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
