import { Request, Response, NextFunction } from 'express'

// Mock user type
interface MockUser {
    id: number
    email: string
    name: string | null
    plan_tier: string
    api_key: string | null
    created_at: Date
}

// Mock users data
const mockUsers: MockUser[] = [
    {
        id: 1,
        email: 'test@fidant.ai',
        name: 'Test User',
        plan_tier: 'starter',
        api_key: 'test-api-key-123',
        created_at: new Date()
    }
]

export async function userFromRequest(req: Request): Promise<MockUser | null> {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) return null
    const token = auth.slice(7).trim()
    if (!token) return null
    return mockUsers.find(user => user.api_key === token) || null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = await userFromRequest(req)
    if (!user) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' }
        })
    }
    req.user = user
    next()
}

declare global {
    namespace Express {
        interface Request {
            user?: MockUser
        }
    }
}