import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateDaysParameter, getUsageStats } from '../services/usageService';
import { clearCache, cleanupOldCache } from '../services/cacheService';

const router = Router();

/**
 * GET /api/usage/stats
 * Получение статистики использования с кэшированием
 */
router.get('/usage/stats', requireAuth, async (req, res) => {
    try {
        // Валидируем параметр days
        const validation = validateDaysParameter(req.query.days as string);

        if (!validation.isValid) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETER',
                    message: validation.error,
                },
            });
        }

        // Получаем статистику (с использованием кэша)
        const stats = await getUsageStats(req.user!.id, req.user!.plan_tier, validation.days);

        res.json(stats);
    } catch (error) {
        console.error('Error in /api/usage/stats:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Internal server error',
            },
        });
    }
});

/**
 * DELETE /api/cache/clear
 * Очистка всего кэша
 */
router.delete('/cache/clear', requireAuth, async (req, res) => {
    try {
        const result = await clearCache();
        res.json({
            message: 'Cache cleared successfully',
            deleted_count: result.deleted_count,
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to clear cache',
            },
        });
    }
});

/**
 * DELETE /api/cache/cleanup
 * Очистка устаревших записей кэша
 */
router.delete('/cache/cleanup', requireAuth, async (req, res) => {
    try {
        const hoursParam = req.query.hours as string;
        const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

        if (isNaN(hours) || hours < 1) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PARAMETER',
                    message: 'Parameter "hours" must be a positive number',
                },
            });
        }

        const result = await cleanupOldCache(hours);
        res.json({
            message: `Cleaned up cache entries older than ${hours} hours`,
            deleted_count: result.deleted_count,
        });
    } catch (error) {
        console.error('Error cleaning up cache:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to cleanup cache',
            },
        });
    }
});

/**
 * GET /api/health
 * Проверка состояния API
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

export default router;