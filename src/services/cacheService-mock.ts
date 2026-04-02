// Mock cache service for testing without Prisma
export async function clearCache(): Promise<void> {
    console.log('Mock: Cache cleared successfully')
    // In a real implementation, this would clear the daily_usage_cache table
    return Promise.resolve()
}