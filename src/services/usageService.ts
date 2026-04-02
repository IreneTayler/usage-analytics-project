import { PLAN_LIMITS, DEFAULT_DAYS, MAX_DAYS, MIN_DAYS, PlanTier } from '../config/constants';
import { UsageStatsResponse, UsageDay, UsageSummary } from '../types';
import { getCachedData } from './cacheService';

/**
 * Валидирует параметр days
 */
export function validateDaysParameter(daysParam: string | undefined): {
    isValid: boolean;
    days: number;
    error?: string;
} {
    const days = Math.min(Math.max(Number(daysParam) || DEFAULT_DAYS, MIN_DAYS), MAX_DAYS);

    if (daysParam && (isNaN(Number(daysParam)) || Number(daysParam) < MIN_DAYS || Number(daysParam) > MAX_DAYS)) {
        return {
            isValid: false,
            days: 0,
            error: `Parameter "days" must be between ${MIN_DAYS} and ${MAX_DAYS}`,
        };
    }

    return { isValid: true, days };
}

/**
 * Генерирует массив дат для запрашиваемого периода
 */
export function generateDateRange(days: number): string[] {
    const today = new Date();
    const dates: string[] = [];
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - (days - 1));

    for (let i = 0; i < days; i++) {
        const d = new Date(fromDate);
        d.setDate(fromDate.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
    }

    return dates;
}

/**
 * Вычисляет сводную статистику по дням
 */
export function calculateSummary(daysData: UsageDay[]): UsageSummary {
    const totalCommitted = daysData.reduce((sum, day) => sum + day.committed, 0);
    const totalReserved = daysData.reduce((sum, day) => sum + day.reserved, 0);
    const avgDaily = daysData.length > 0 ? totalCommitted / daysData.length : 0;

    // Находим день с максимальным количеством committed запросов
    const peakDay = daysData.reduce(
        (peak, day) => (day.committed > peak.count ? { date: day.date, count: day.committed } : peak),
        { date: daysData[0]?.date || '', count: daysData[0]?.committed || 0 }
    );

    // Вычисляем текущую серию активных дней (с конца)
    let currentStreak = 0;
    for (let i = daysData.length - 1; i >= 0; i--) {
        if (daysData[i].committed > 0) {
            currentStreak++;
        } else {
            break;
        }
    }

    return {
        total_committed: totalCommitted,
        total_reserved: totalReserved,
        avg_daily: Math.round(avgDaily * 10) / 10,
        peak_day: peakDay,
        current_streak: currentStreak,
    };
}

/**
 * Основная функция получения статистики использования
 * Использует кэш с fallback на сырые данные
 */
export async function getUsageStats(
    userId: number,
    planTier: string,
    days: number
): Promise<UsageStatsResponse> {
    // Генерируем диапазон дат
    const dates = generateDateRange(days);

    // Получаем данные из кэша (с автоматическим обновлением при необходимости)
    const { dataMap, cacheInfo } = await getCachedData(userId, dates);

    // Получаем лимит для плана пользователя
    const limit = PLAN_LIMITS[planTier as PlanTier] || PLAN_LIMITS.starter;

    // Формируем данные по дням
    const daysData: UsageDay[] = dates.map((date) => {
        const dayData = dataMap.get(date) || { committed: 0, reserved: 0, total: 0 };
        return {
            date,
            committed: dayData.committed,
            reserved: dayData.reserved,
            total: dayData.total,
            limit,
            utilization: limit > 0 ? dayData.committed / limit : 0,
        };
    });

    // Вычисляем сводную статистику
    const summary = calculateSummary(daysData);

    return {
        plan: planTier,
        daily_limit: limit,
        period: {
            from: dates[0],
            to: dates[dates.length - 1],
        },
        days: daysData,
        summary,
        cache_info: cacheInfo,
    };
}