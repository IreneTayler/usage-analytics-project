import { Request, Response, NextFunction } from 'express'
import { PrismaClient, users } from '@prisma/client'

const prisma = new PrismaClient()

export async function userFromRequest(req: Request): Promise<users | null> {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) return null
    const token = auth.slice(7).trim()
    if (!token) return null
    return prisma.users.findUnique({ where: { api_key: token } })
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
            user?: users
        }
    }
}