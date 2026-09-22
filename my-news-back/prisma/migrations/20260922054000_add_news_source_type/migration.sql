-- CreateEnum
CREATE TYPE "NewsSourceType" AS ENUM ('PRESS', 'COMMUNITY', 'BLOG');

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "externalCommentCount" INTEGER,
ADD COLUMN     "externalScore" INTEGER,
ADD COLUMN     "sourceType" "NewsSourceType" NOT NULL DEFAULT 'PRESS';

-- CreateIndex
CREATE INDEX "News_sourceType_publishedAt_idx" ON "News"("sourceType", "publishedAt");
