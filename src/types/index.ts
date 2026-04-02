export interface UsageDay {
    date: string;
    committed: number;
    reserved: number;
    total: number;
    limit: number;
    utilization: number;
}

export interface UsageSummary {
    total_committed: number;
    total_reserved: number;
    avg_daily: number;
    peak_day: {
        date: string;
        count: number;
    };
    current_streak: number;
}

export interface UsageStatsResponse {
    plan: string;
    daily_limit: number;
    period: {
        from: string;
        to: string;
    };
    days: UsageDay[];
    summary: UsageSummary;
    cache_info: {
        cached_days: number;
        fresh_days: number;
        cache_hit_rate: number;
    };
}

export interface ApiError {
    error: {
        code: string;
        message: string;
    };
}

export interface CacheEntry {
    user_id: number;
    date_key: string;
    committed: number;
    reserved: number;
    total: number;
    updated_at: Date;
}