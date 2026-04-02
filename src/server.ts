import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()

const LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  executive: 500,
}

app.get('/api/usage/stats', async (req, res) => {
  const userId = 1 // mock auth

  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90)

  const today = new Date()
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(today.getDate() - (days - 1 - i))
    dates.push(d.toISOString().slice(0, 10))
  }

  const user = await prisma.users.findUnique({ where: { id: userId } })
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } })

  const committed = await prisma.daily_usage_events.groupBy({
    by: ['date_key'],
    where: { user_id: userId, status: 'committed' },
    _count: true,
  })

  const FIFTEEN_MIN = 15 * 60 * 1000
  const reserved = await prisma.daily_usage_events.groupBy({
    by: ['date_key'],
    where: {
      user_id: userId,
      status: 'reserved',
      reserved_at: { gte: new Date(Date.now() - FIFTEEN_MIN) }
    },
    _count: true,
  })

  const map = new Map()
  dates.forEach(d => map.set(d, { committed: 0, reserved: 0 }))

  committed.forEach(c => map.get(c.date_key).committed = c._count)
  reserved.forEach(r => map.get(r.date_key).reserved = r._count)

  const limit = LIMITS[user.plan_tier]

  const result = dates.map(date => {
    const d = map.get(date)
    return {
      date,
      ...d,
      limit,
      utilization: d.committed / limit
    }
  })

  res.json({ days: result })
})

app.listen(3000, () => console.log('Server running'))
