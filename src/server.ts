import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()

app.use(express.json())

const LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  executive: 500,
}

app.get('/api/usage/stats', async (req, res) => {
  try {
    const userId = 1 // mock auth

    // Валидация параметра days
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

    // Генерируем даты для периода
    const today = new Date()
    const dates: string[] = []
    const fromDate = new Date()
    fromDate.setDate(today.getDate() - (days - 1))

    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate)
      d.setDate(fromDate.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }

    // Получаем committed события
    const committed = await prisma.daily_usage_events.groupBy({
      by: ['date_key'],
      where: {
        user_id: userId,
        status: 'committed',
        date_key: { in: dates }
      },
      _count: true,
    })

    // Получаем актуальные reserved события (не старше 15 минут)
    const FIFTEEN_MIN = 15 * 60 * 1000
    const reserved = await prisma.daily_usage_events.groupBy({
      by: ['date_key'],
      where: {
        user_id: userId,
        status: 'reserved',
        date_key: { in: dates },
        reserved_at: { gte: new Date(Date.now() - FIFTEEN_MIN) }
      },
      _count: true,
    })

    // Создаем карту данных по дням
    const dataMap = new Map()
    dates.forEach(d => dataMap.set(d, { committed: 0, reserved: 0 }))

    committed.forEach(c => {
      if (dataMap.has(c.date_key)) {
        dataMap.get(c.date_key).committed = c._count
      }
    })

    reserved.forEach(r => {
      if (dataMap.has(r.date_key)) {
        dataMap.get(r.date_key).reserved = r._count
      }
    })

    const limit = LIMITS[user.plan_tier]

    // Формируем данные по дням
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

    // Вычисляем сводную статистику
    const totalCommitted = daysData.reduce((sum, day) => sum + day.committed, 0)
    const avgDaily = totalCommitted / days

    // Находим пиковый день
    const peakDay = daysData.reduce((peak, day) =>
      day.committed > peak.count ? { date: day.date, count: day.committed } : peak,
      { date: daysData[0].date, count: daysData[0].committed }
    )

    // Вычисляем текущий streak (подряд идущие дни с активностью)
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

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
