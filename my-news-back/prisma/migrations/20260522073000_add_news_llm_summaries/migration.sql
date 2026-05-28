CREATE TABLE "NewsLlmSummary" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "summaryLines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsLlmSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsLlmSummary_newsId_key" ON "NewsLlmSummary"("newsId");

ALTER TABLE "NewsLlmSummary"
ADD CONSTRAINT "NewsLlmSummary_newsId_fkey"
FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
