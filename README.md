# Usage Analytics with Caching

Система аналитики использования с кэшированием дневных агрегатов для оптимизации производительности.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Применение миграций базы данных
npx prisma migrate dev

# Генерация Prisma клиента
npx prisma generate

# Заполнение тестовыми данными
npm run seed

# Запуск сервера разработки
npm run dev
```

Откройте http://localhost:3003

## 📊 API Endpoints

### GET /api/usage/stats
Возвращает статистику использования с кэшированием.

**Headers:** `Authorization: Bearer dev-usage-analytics-secret`  
**Query Parameters:**
- `days` (optional): Количество дней для получения (1-90, по умолчанию: 7)

**Пример ответа:**
```json
{
  "plan": "starter",
  "daily_limit": 30,
  "period": { "from": "2026-03-27", "to": "2026-04-02" },
  "days": [...],
  "summary": {...},
  "cache_info": {
    "cached_days": 5,
    "fresh_days": 2,
    "cache_hit_rate": 0.71
  }
}
```

### DELETE /api/cache/clear
Очищает весь кэш.

### DELETE /api/cache/cleanup?hours=24
Очищает записи кэша старше указанного количества часов.

### GET /api/health
Проверка состояния API.

## 🏗️ Архитектура кэширования

### Таблица daily_usage_cache
Хранит предвычисленные дневные агрегаты:
- `committed` - количество завершенных запросов за день
- `reserved` - количество активных зарезервированных запросов (не старше 15 мин)
- `total` - общее количество запросов
- `updated_at` - время последнего обновления

### Логика кэширования
1. **Cache Hit**: Если запись в кэше свежая (< 5 мин), используем её
2. **Cache Miss**: Если записи нет или она устарела, пересчитываем из сырых данных
3. **Fallback**: При ошибках кэша всегда есть fallback на сырые запросы

### Оптимизации
- TTL кэша: 5 минут
- TTL для reserved запросов: 15 минут
- Batch обновление для нескольких дат
- Автоматическая очистка устаревших записей

## 🗄️ База данных

### Таблицы
- **users** - Пользователи с планами тарификации
- **daily_usage_events** - Сырые события использования (reserved/committed)
- **daily_usage_cache** - Кэш предвычисленных дневных агрегатов

### Индексы
- `daily_usage_events`: `(user_id, date_key)`, `(user_id, status)`
- `daily_usage_cache`: `(user_id, date_key)` UNIQUE, `(updated_at)`

## 🛠️ Технологический стек

- **Backend**: Node.js + Express + TypeScript (strict mode)
- **Database**: SQLite + Prisma ORM
- **Frontend**: React (inline) + Custom CSS
- **Caching**: Custom implementation with TTL

## ⚙️ Конфигурация

### Переменные окружения (.env)
```bash
USAGE_API_KEY=dev-usage-analytics-secret
PORT=3003
NODE_ENV=development
```

### Лимиты планов
- **starter**: 30 запросов/день
- **pro**: 100 запросов/день  
- **executive**: 500 запросов/день

## 🧪 Тестирование

### Postman Collection
Импортируйте `postman-collection.json` для тестирования API.

### Ручное тестирование
```bash
# Получить статистику за 7 дней
curl -H "Authorization: Bearer dev-usage-analytics-secret" \
     "http://localhost:3003/api/usage/stats?days=7"

# Очистить кэш
curl -X DELETE \
     -H "Authorization: Bearer dev-usage-analytics-secret" \
     "http://localhost:3003/api/cache/clear"
```

## 📈 Мониторинг производительности

API возвращает информацию о кэше в поле `cache_info`:
- `cached_days` - количество дней, полученных из кэша
- `fresh_days` - количество дней, пересчитанных заново
- `cache_hit_rate` - процент попаданий в кэш (0.0 - 1.0)

## 🔧 Допущения и ограничения

### Текущие допущения
1. **SQLite** используется для простоты, в продакшене лучше PostgreSQL
2. **In-memory кэш** отсутствует, используется только DB кэш
3. **Один сервер** - нет распределенного кэширования
4. **Простая аутентификация** - только API ключи

### Что бы сделал при большем времени
1. **Redis** для распределенного кэширования
2. **Rate limiting** для защиты API
3. **Метрики и логирование** (Prometheus + Grafana)
4. **Unit и integration тесты** (Jest)
5. **Docker** контейнеризация
6. **CI/CD pipeline** (GitHub Actions)
7. **API документация** (OpenAPI/Swagger)
8. **Валидация схем** (Zod/Joi)
9. **Graceful shutdown** и health checks
10. **Database connection pooling**

## 🚀 Деплой

### Production готовность
```bash
# Сборка
npm run build

# Запуск в продакшене
npm start
```

### Docker (будущее улучшение)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3003
CMD ["npm", "start"]
```

## 📝 Git коммиты

Проект разработан с осмысленными коммитами:
1. `feat: initial project setup with TypeScript and Prisma`
2. `feat: add daily_usage_cache table and migration`
3. `feat: implement cache service with TTL and fallback`
4. `feat: add usage service with cache integration`
5. `feat: create API routes with authentication`
6. `feat: add comprehensive error handling`
7. `docs: update README with architecture details`

## 📄 Лицензия

MIT