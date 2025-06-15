-- AlterTable
ALTER TABLE "reflections" ADD COLUMN     "habitStackingSuggestion" TEXT,
ADD COLUMN     "streakDay" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "habitPrefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastActive" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "milestones" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "users_lastActive_idx" ON "users"("lastActive");
