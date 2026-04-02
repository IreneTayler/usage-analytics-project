import { PrismaClient } from '@prisma/client'
import { API_KEY } from './config/constants'

const prisma = new PrismaClient()

async function seed() {
    console.log('Seeding database...')

    // Create test user
    const user = await prisma.users.upsert({
        where: { email: 'test@fidant.ai' },
        update: { api_key: API_KEY },
        create: {
            email: 'test@fidant.ai',
            name: 'Test User',
            plan_tier: 'starter',
            api_key: API_KEY,
        }
    })

    console.log('Created user:', user)
    console.log('API key:', API_KEY)

    // Generate test data for the last 14 days
    const today = new Date()
    const events = []

    for (let i = 13; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const dateKey = date.toISOString().slice(0, 10)

        // Generate random usage for each day
        const dailyUsage = Math.floor(Math.random() * 25) + 5 // 5-30 requests per day

        for (let j = 0; j < dailyUsage; j++) {
            const requestId = `req_${dateKey}_${j}`
            const reservedAt = new Date(date)
            reservedAt.setHours(Math.floor(Math.random() * 24))
            reservedAt.setMinutes(Math.floor(Math.random() * 60))

            // 90% of requests get committed
            const isCommitted = Math.random() > 0.1
            const committedAt = isCommitted ? new Date(reservedAt.getTime() + Math.random() * 300000) : null

            events.push({
                user_id: user.id,
                date_key: dateKey,
                request_id: requestId,
                status: isCommitted ? 'committed' : 'reserved',
                reserved_at: reservedAt,
                committed_at: committedAt
            })
        }
    }

    // Add some recent reserved events (within 15 minutes)
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)
    for (let i = 0; i < 3; i++) {
        const recentReserved = new Date(now.getTime() - Math.random() * 10 * 60 * 1000)
        events.push({
            user_id: user.id,
            date_key: todayKey,
            request_id: `recent_${i}`,
            status: 'reserved',
            reserved_at: recentReserved,
            committed_at: null
        })
    }

    await prisma.daily_usage_events.createMany({ data: events })
    console.log(`Created ${events.length} usage events`)
    console.log('Seeding completed!')
}

seed()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })