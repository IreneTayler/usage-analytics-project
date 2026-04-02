import { PrismaClient } from '@prisma/client';
import { CACHE_TTL, RESERVED_TTL } from '../config/constants';
import { CacheEntry } from '../types';

const prisma = new PrismaClient();

/**
 * Обновляет кэш для конкретной даты пользователя
 * Вычисляет актуальные агрегаты из сырых событий
 */
export async function updateCacheForDate(userId: number, dateKey: string): Promise<CacheEntry> {
    // Вычисляем committed запросы за день
    const committed = await prisma.daily_usage_events.count({
        where: {
            user_id: userId,
            date_key: dateKey,
            status: 'committed',
        },
    });

    // Вычисляем активные reserved запросы (не старше 15 минут)
    const reservedCutoff = new Date(Date.now() - RESERVED_TTL);
    const reserved = await prisma.daily_usage_events.count({
        where: {
            user_id: userId,
            date_key: dateKey,
            status: 'reserved',
            reserved_at: {
                gte: reservedCutoff,
            },
        },
    });

    const total = committed + reserved;

    // Обновляем или создаем запись в кэше
    const cacheEntry = await prisma.daily_usage_cache.upsert({
        where: {
            user_id_date_key: {
                user_id: userId,
                date_key: dateKey,
            },
        },
        update: {
            committed,
            reserved,
            total,
            updated_at: new Date(),
        },
        create: {
            user_id: userId,
            date_key: dateKey,
            committed,
            reserved,
            total,
        },
    });

    return {
        user_id: cacheEntry.user_id,
        date_key: cacheEntry.date_key,
        committed: cacheEntry.committed,
        reserved: cacheEntry.reserved,
        total: cacheEntry.total,
        updated_at: cacheEntry.updated_at,
    };
}

/**
 * Получает данные из кэша с fallback на сырые запросы
 * Возвращает Map с данными по датам и информацию о кэше
 */
export async function getCachedData(
    userId: number,
    dates: string[]
): Promise<{
    dataMap: Map<string, { committed: number; reserved: number; total: number }>;
    cacheInfo: { cached_days: number; fresh_days: number; cache_hit_rate: number };
}> {
    // Получаем существующие записи из кэша
    const cachedData = await prisma.daily_usage_cache.findMany({
        where: {
            user_id: userId,
            date_key: { in: dates },
        },
    });

    const dataMap = new Map<string, { committed: number; reserved: number; total: number }>();
    const datesToUpdate: string[] = [];
    let cachedDays = 0;

    // Инициализируем все даты нулевыми значениями
    dates.forEach((date) => {
        dataMap.set(date, { committed: 0, reserved: 0, total: 0 });
    });

    // Проверяем актуальность кэша для каждой даты
    for (const date of dates) {
        const cached = cachedData.find((c) => c.date_key === date);

        if (cached && Date.now() - cached.updated_at.getTime() < CACHE_TTL) {
            // Кэш актуален
            dataMap.set(date, {
                committed: cached.committed,
                reserved: cached.reserved,
                total: cached.total,
            });
            cachedDays++;
        } else {
            // Кэш отсутствует или устарел
            datesToUpdate.push(date);
        }
    }

    // Обновляем устаревшие записи
    if (datesToUpdate.length > 0) {
        const updatePromises = datesToUpdate.map((date) => updateCacheForDate(userId, date));
        const updatedData = await Promise.all(updatePromises);

        updatedData.forEach((entry) => {
            dataMap.set(entry.date_key, {
                committed: entry.committed,
                reserved: entry.reserved,
                total: entry.total,
            });
        });
    }

    const freshDays = datesToUpdate.length;
    const cacheHitRate = dates.length > 0 ? cachedDays / dates.length : 0;

    return {
        dataMap,
        cacheInfo: {
            cached_days: cachedDays,
            fresh_days: freshDays,
            cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
        },
    };
}

/**
 * Очищает весь кэш (для административных целей)
 */
export async function clearCache(): Promise<{ deleted_count: number }> {
    const result = await prisma.daily_usage_cache.deleteMany();
    return { deleted_count: result.count };
}

/**
 * Очищает устаревшие записи кэша (старше определенного времени)
 */
export async function cleanupOldCache(olderThanHours = 24): Promise<{ deleted_count: number }> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await prisma.daily_usage_cache.deleteMany({
        where: {
            updated_at: {
                lt: cutoffDate,
            },
        },
    });

    return { deleted_count: result.count };
}