import { Router } from 'express'
import { requireAuth } from '../middleware/auth-mock'
import { validateDaysParameter, getUsageStats } from '../services/usageService-mock'
import { clearCache } from '../services/cacheService-mock'

const router = Router()

// Usage stats endpoint
router.get('/usage/stats', requireAuth, async (req, res) => {
    try {
        const validation = validateDaysParameter(req.query.days as string)

        if (!validation.isValid) {
            return res.status(400).json({
                error: { code: 'INVALID_PARAMETER', message: validation.error }
            })
        }

        const stats = await getUsageStats(req.user!.id, req.user!.plan_tier, validation.days)
        res.json(stats)
    } catch (error) {
        console.error('Error in /api/usage/stats:', error)
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
        })
    }
})

// Clear cache endpoint
router.delete('/cache/clear', requireAuth, async (req, res) => {
    try {
        await clearCache()
        res.json({ message: 'Cache cleared successfully' })
    } catch (error) {
        console.error('Error clearing cache:', error)
        res.status(500).json({ error: 'Failed to clear cache' })
    }
})

export default router