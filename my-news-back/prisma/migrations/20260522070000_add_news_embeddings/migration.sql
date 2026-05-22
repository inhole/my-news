CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "NewsEmbedding" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "chunkHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsEmbedding_chunkHash_key" ON "NewsEmbedding"("chunkHash");
CREATE INDEX "NewsEmbedding_newsId_idx" ON "NewsEmbedding"("newsId");
CREATE INDEX "NewsEmbedding_embedding_idx" ON "NewsEmbedding" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "NewsEmbedding"
ADD CONSTRAINT "NewsEmbedding_newsId_fkey"
FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
