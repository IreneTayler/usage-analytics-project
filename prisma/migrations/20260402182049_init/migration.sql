/*
  Warnings:

  - Made the column `api_key` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_daily_usage_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "committed" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_usage_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_usage_cache" ("committed", "created_at", "date_key", "id", "reserved", "updated_at", "user_id") SELECT "committed", "created_at", "date_key", "id", "reserved", "updated_at", "user_id" FROM "daily_usage_cache";
DROP TABLE "daily_usage_cache";
ALTER TABLE "new_daily_usage_cache" RENAME TO "daily_usage_cache";
CREATE INDEX "daily_usage_cache_updated_at_idx" ON "daily_usage_cache"("updated_at");
CREATE UNIQUE INDEX "daily_usage_cache_user_id_date_key_key" ON "daily_usage_cache"("user_id", "date_key");
CREATE TABLE "new_daily_usage_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reserved_at" DATETIME NOT NULL,
    "committed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_daily_usage_events" ("committed_at", "created_at", "date_key", "id", "request_id", "reserved_at", "status", "user_id") SELECT "committed_at", "created_at", "date_key", "id", "request_id", "reserved_at", "status", "user_id" FROM "daily_usage_events";
DROP TABLE "daily_usage_events";
ALTER TABLE "new_daily_usage_events" RENAME TO "daily_usage_events";
CREATE UNIQUE INDEX "daily_usage_events_request_id_key" ON "daily_usage_events"("request_id");
CREATE INDEX "daily_usage_events_user_id_date_key_idx" ON "daily_usage_events"("user_id", "date_key");
CREATE INDEX "daily_usage_events_user_id_status_idx" ON "daily_usage_events"("user_id", "status");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan_tier" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("api_key", "created_at", "email", "id", "name", "plan_tier") SELECT "api_key", "created_at", "email", "id", "name", "plan_tier" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
