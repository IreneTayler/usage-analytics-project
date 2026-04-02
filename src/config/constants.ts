export const PLAN_LIMITS = {
    starter: 30,
    pro: 100,
    executive: 500,
} as const;

export const CACHE_TTL = 5 * 60 * 1000; // 5 минут в миллисекундах
export const RESERVED_TTL = 15 * 60 * 1000; // 15 минут для reserved запросов
export const DEFAULT_DAYS = 7;
export const MAX_DAYS = 90;
export const MIN_DAYS = 1;

export const API_KEY = process.env.USAGE_API_KEY || 'dev-usage-analytics-secret';

export type PlanTier = keyof typeof PLAN_LIMITS;