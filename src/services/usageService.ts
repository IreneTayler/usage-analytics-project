import { PLAN_LIMITS, DEFAULT_DAYS, MAX_DAYS, MIN_DAYS } from '../config/constants'
import { UsageStatsResponse, UsageDay } from '../types'
import { getCachedData } from './cacheService'

export function validateDaysParameter(daysParam: string | undefined): { isValid: boolean; days: number; error?: string } {
    const days = Math.min(Math.max(Number(daysParam) || DEFAULT_DAYS, MIN_DAYS), MAX_DAYS)

    if (daysParam && (isNaN(Number(daysParam)) || Number(daysParam) < MIN_DAYS || Number(daysParam) > MAX_DAYS)) {
        return {
            isValid: false,
            days: 0,
            error: `Parameter "days" must be between ${MIN_DAYS} and ${MAX_DAYS}`
        }
    }

    return { isValid: true, days }
}

export function generateDateRange(days: number): string[] {
    const today = new Date()
    const dates: string[] = []
    const fromDate = new Date()
    fromDate.setDate(today.getDate() - (days - 1))

    for (let i = 0; i < days; i++) {
        const d = new Date(fromDate)
        d.setDate(fromDate.getDate() + i)
        dates.push(d.toISOString().slice(0, 10))
    }

    return dates
}

export function calculateSummary(daysData: UsageDay[]) {
    const totalCommitted = daysData.reduce((sum, day) => sum + day.committed, 0)
    const avgDaily = totalCommitted / daysData.length

    const peakDay = daysData.reduce((peak, day) =>
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

    return {
        total_committed: totalCommitted,
        avg_daily: Math.round(avgDaily * 10) / 10,
        peak_day: peakDay,
        current_streak: currentStreak
    }
}

export async function getUsageStats(userId: number, planTier: string, days: number): Promise<UsageStatsResponse> {
    const dates = generateDateRange(days)
    const dataMap = await getCachedData(userId, dates)
    const limit = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter

    const daysData: UsageDay[] = dates.map(date => {
        const d = dataMap.get(date)
        return {
            date,
            committed: d.committed,
            reserved: d.reserved,
            limit,
            utilization: d.committed / limit
        }
    })

    return {
        plan: planTier,
        daily_limit: limit,
        period: { from: dates[0], to: dates[dates.length - 1] },
        days: daysData,
        summary: calculateSummary(daysData)
    }
}