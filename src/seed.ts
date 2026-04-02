import { PrismaClient } from '@prisma/client';
import { API_KEY } from './config/constants';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
    console.log('🌱 Seeding database...');

    try {
        // Создаем тестового пользователя
        const user = await prisma.users.upsert({
            where: { email: 'test@example.com' },
            update: { api_key: API_KEY },
            create: {
                email: 'test@example.com',
                name: 'Test User',
                plan_tier: 'starter',
                api_key: API_KEY,
            },
        });

        console.log('👤 Created user:', { id: user.id, email: user.email, plan: user.plan_tier });
        console.log('🔑 API key:', API_KEY);

        // Генерируем тестовые данные за последние 14 дней
        const today = new Date();
        const events = [];

        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = date.toISOString().slice(0, 10);

            // Генерируем случайное количество запросов для каждого дня (5-25)
            const dailyUsage = Math.floor(Math.random() * 20) + 5;

            for (let j = 0; j < dailyUsage; j++) {
                const requestId = `req_${dateKey}_${j}_${Date.now()}`;
                const reservedAt = new Date(date);
                reservedAt.setHours(Math.floor(Math.random() * 24));
                reservedAt.setMinutes(Math.floor(Math.random() * 60));

                // 85% запросов становятся committed
                const isCommitted = Math.random() > 0.15;
                const committedAt = isCommitted
                    ? new Date(reservedAt.getTime() + Math.random() * 300000) // в течение 5 минут
                    : null;

                events.push({
                    user_id: user.id,
                    date_key: dateKey,
                    request_id: requestId,
                    status: isCommitted ? 'committed' : 'reserved',
                    reserved_at: reservedAt,
                    committed_at: committedAt,
                });
            }
        }

        // Добавляем несколько недавних reserved событий (в пределах 15 минут)
        const now = new Date();
        const todayKey = now.toISOString().slice(0, 10);

        for (let i = 0; i < 3; i++) {
            const recentReserved = new Date(now.getTime() - Math.random() * 10 * 60 * 1000); // последние 10 минут
            events.push({
                user_id: user.id,
                date_key: todayKey,
                request_id: `recent_${i}_${Date.now()}`,
                status: 'reserved',
                reserved_at: recentReserved,
                committed_at: null,
            });
        }

        // Создаем события в базе данных
        await prisma.daily_usage_events.createMany({ data: events });
        console.log(`📊 Created ${events.length} usage events`);

        // Статистика по дням
        const dayStats = events.reduce((acc, event) => {
            if (!acc[event.date_key]) {
                acc[event.date_key] = { committed: 0, reserved: 0 };
            }
            if (event.status === 'committed') {
                acc[event.date_key].committed++;
            } else {
                acc[event.date_key].reserved++;
            }
            return acc;
        }, {} as Record<string, { committed: number; reserved: number }>);

        console.log('\n📈 Daily statistics:');
        Object.entries(dayStats)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, stats]) => {
                console.log(`  ${date}: ${stats.committed} committed, ${stats.reserved} reserved`);
            });

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n🚀 You can now start the server with: npm run dev');
        console.log(`📱 Dashboard will be available at: http://localhost:3003`);
        console.log(`🔧 API endpoint: http://localhost:3003/api/usage/stats`);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        throw error;
    }
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });