import { Request, Response, NextFunction } from 'express';
import { PrismaClient, users } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Извлекает пользователя из запроса по API ключу
 */
export async function userFromRequest(req: Request): Promise<users | null> {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return null;
    }

    const token = auth.slice(7).trim();
    if (!token) {
        return null;
    }

    try {
        return await prisma.users.findUnique({
            where: { api_key: token },
        });
    } catch (error) {
        console.error('Error finding user by API key:', error);
        return null;
    }
}

/**
 * Middleware для проверки аутентификации
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = await userFromRequest(req);

    if (!user) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing API key',
            },
        });
        return;
    }

    // Добавляем пользователя в объект запроса
    req.user = user;
    next();
}

// Расширяем типы Express для добавления user в Request
declare global {
    namespace Express {
        interface Request {
            user?: users;
        }
    }
}