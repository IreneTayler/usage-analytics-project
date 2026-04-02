import { PLAN_LIMITS } from '../config/constants'

export function validateDaysParameter(days?: string) {
    if (!days) {
        return { isValid: true, days: 30 }
    }

    const daysNum = parseInt(days, 10)
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 90) {
        return { isValid: false, error: 'Days parameter must be between 1 and 90', days: 30 }
    }

    return { isValid: true, days: daysNum }
}

export async function getUsageStats(userId: number, planTier: string, days: number) {
    // Mock data for testing
    const dailyLimit = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter

    // Generate mock daily usage data
    const dailyUsage = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]

        // Mock some usage data
        const committed = Math.floor(Math.random() * dailyLimit * 0.8)
        const reserved = Math.floor(Math.random() * dailyLimit * 0.2)

        dailyUsage.push({
            date: dateKey,
            committed,
            reserved,
            total: committed + reserved,
            limit: dailyLimit
        })
    }

    const totalCommitted = dailyUsage.reduce((sum, day) => sum + day.committed, 0)
    const totalReserved = dailyUsage.reduce((sum, day) => sum + day.reserved, 0)
    const totalUsage = totalCommitted + totalReserved
    const avgDaily = Math.round(totalUsage / days)

    // Find peak day
    const peakDay = dailyUsage.reduce((peak, day) =>
        day.total > peak.total ? day : peak, dailyUsage[0])

    // Calculate current streak (days with usage > 0)
    let currentStreak = 0
    for (let i = dailyUsage.length - 1; i >= 0; i--) {
        if (dailyUsage[i].total > 0) {
            currentStreak++
        } else {
            break
        }
    }

    const fromDate = new Date(today)
    fromDate.setDate(fromDate.getDate() - (days - 1))

    return {
        user_id: userId,
        plan: planTier,
        daily_limit: dailyLimit,
        period: {
            from: fromDate.toISOString(),
            to: today.toISOString()
        },
        summary: {
            total_committed: totalCommitted,
            total_reserved: totalReserved,
            total_usage: totalUsage,
            avg_daily: avgDaily,
            peak_day: {
                date: peakDay.date,
                count: peakDay.total
            },
            current_streak: currentStreak
        },
        days: dailyUsage
    }
}