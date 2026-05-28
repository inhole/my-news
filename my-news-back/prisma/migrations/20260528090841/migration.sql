/*
  Warnings:

  - You are about to drop the `Bookmark` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_newsId_fkey";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_userId_fkey";

-- DropIndex
DROP INDEX "NewsEmbedding_embedding_idx";

-- AlterTable
ALTER TABLE "NewsEmbedding" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NewsLlmSummary" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Bookmark";

-- DropTable
DROP TABLE "User";
