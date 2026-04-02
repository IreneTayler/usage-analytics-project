import { PrismaClient } from '@prisma/client'
import { CACHE_TTL, RESERVED_TTL } from '../config/constants'

const prisma = new PrismaClient()

export async function updateCacheForDate(userId: number, dateKey: string) {
    const [committed, reserved] = await Promise.all([
        prisma.daily_usage_events.count({
            where: { user_id: userId, date_key: dateKey, status: 'committed' }
        }),
        prisma.daily_usage_events.count({
            where: {
                user_id: userId,
                date_key: dateKey,
                status: 'reserved',
                reserved_at: { gte: new Date(Date.now() - RESERVED_TTL) }
            }
        })
    ])

    await prisma.daily_usage_cache.upsert({
        where: { user_id_date_key: { user_id: userId, date_key: dateKey } },
        update: { committed, reserved },
        create: { user_id: userId, date_key: dateKey, committed, reserved }
    })

    return { committed, reserved }
}

export async function getCachedData(userId: number, dates: string[]) {
    const cachedData = await prisma.daily_usage_cache.findMany({
        where: { user_id: userId, date_key: { in: dates } }
    })

    const dataMap = new Map()
    dates.forEach(d => dataMap.set(d, { committed: 0, reserved: 0 }))

    const datesToUpdate: string[] = []

    for (const date of dates) {
        const cached = cachedData.find(c => c.date_key === date)
        if (!cached || Date.now() - cached.updated_at.getTime() > CACHE_TTL) {
            datesToUpdate.push(date)
        } else {
            dataMap.set(date, { committed: cached.committed, reserved: cached.reserved })
        }
    }

    // Update stale entries
    if (datesToUpdate.length > 0) {
        const updatePromises = datesToUpdate.map(date => updateCacheForDate(userId, date))
        const updatedData = await Promise.all(updatePromises)

        datesToUpdate.forEach((date, index) => {
            dataMap.set(date, updatedData[index])
        })
    }

    return dataMap
}

export async function clearCache() {
    return prisma.daily_usage_cache.deleteMany()
}