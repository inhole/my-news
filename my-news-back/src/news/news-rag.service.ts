import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

interface OllamaEmbeddingResponse {
  embedding?: number[];
}

interface SearchRow {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  contentHtml: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: Date;
  source: string;
  author: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: Prisma.JsonValue | null;
  matchedChunk: string;
  similarity: number;
}

interface RankedSearchItem {
  row: SearchRow;
  lexicalScore: number;
  matchedTokenCount: number;
  score: number;
}

interface NewsForEmbedding {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
}

@Injectable()
export class NewsRagService {
  private readonly logger = new Logger(NewsRagService.name);
  private readonly enabled: boolean;
  private readonly provider: string;
  private readonly embeddingModel: string;
  private readonly ollamaBaseUrl: string;
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.enabled =
      this.configService.get<string>('ENABLE_RAG_INDEXING') === 'true';
    this.provider =
      this.configService.get<string>('RAG_EMBEDDING_PROVIDER') || 'ollama';
    this.embeddingModel =
      this.configService.get<string>('RAG_EMBEDDING_MODEL') ||
      'nomic-embed-text';
    this.ollamaBaseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      'http://localhost:11434';
    this.chunkSize = this.readPositiveInt('RAG_CHUNK_SIZE', 1200);
    this.chunkOverlap = this.readPositiveInt('RAG_CHUNK_OVERLAP', 160);
  }

  async indexNews(newsId: string) {
    if (!this.enabled) {
      return { indexed: 0, skipped: true };
    }

    const news = await this.prisma.news.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
      },
    });

    if (!news) {
      return { indexed: 0, skipped: true };
    }

    return this.indexNewsRecord(news);
  }

  async indexRecentNews(limit = 50) {
    if (!this.enabled) {
      throw new BadRequestException('RAG indexing is disabled.');
    }

    const newsItems = await this.prisma.news.findMany({
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
      },
    });

    let indexed = 0;
    let skipped = 0;

    for (const news of newsItems) {
      const result = await this.indexNewsRecord(news);
      indexed += result.indexed;
      skipped += result.skipped ? 1 : 0;
    }

    return {
      newsCount: newsItems.length,
      chunkCount: indexed,
      skippedNewsCount: skipped,
    };
  }

  async semanticSearch(query: string, limit = 10) {
    if (!this.enabled) {
      throw new BadRequestException('RAG indexing is disabled.');
    }

    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required.');
    }

    const embedding = await this.createEmbedding(normalizedQuery);
    const vector = this.toVectorLiteral(embedding);
    const candidateLimit = Math.max(limit * 20, 100);
    const queryTokens = this.tokenize(normalizedQuery);
    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      WITH ranked_chunks AS (
        SELECT
          e."newsId",
          e."chunkText",
          e.embedding <=> ${vector}::vector AS distance,
          ROW_NUMBER() OVER (
            PARTITION BY e."newsId"
            ORDER BY e.embedding <=> ${vector}::vector
          ) AS rank
        FROM "NewsEmbedding" e
        WHERE e.model = ${this.embeddingModel}
        ORDER BY e.embedding <=> ${vector}::vector
        LIMIT ${candidateLimit}
      )
      SELECT
        n.id,
        n.title,
        n.description,
        n.content,
        n."contentHtml",
        n.url,
        n."urlToImage",
        n."publishedAt",
        n.source,
        n.author,
        n."categoryId",
        n."createdAt",
        n."updatedAt",
        CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'description', c.description,
            'createdAt', c."createdAt",
            'updatedAt', c."updatedAt"
          )
        END AS category,
        r."chunkText" AS "matchedChunk",
        1 - r.distance AS similarity
      FROM ranked_chunks r
      JOIN "News" n ON n.id = r."newsId"
      LEFT JOIN "Category" c ON c.id = n."categoryId"
      WHERE r.rank = 1
      ORDER BY r.distance, n."publishedAt" DESC
    `;
    const rankedItems = this.rankSearchRows(rows, queryTokens)
      .filter((item) => this.shouldKeepSearchItem(item, queryTokens))
      .slice(0, limit);

    return {
      items: rankedItems.map(({ row }) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        content: row.content,
        contentHtml: row.contentHtml,
        url: row.url,
        urlToImage: row.urlToImage,
        publishedAt: row.publishedAt,
        source: row.source,
        author: row.author,
        categoryId: row.categoryId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        category: row.category,
        rag: {
          matchedChunk: row.matchedChunk,
          similarity: Number(row.similarity),
        },
      })),
    };
  }

  private async indexNewsRecord(news: NewsForEmbedding) {
    const chunks = this.buildChunks(news);

    if (chunks.length === 0) {
      return { indexed: 0, skipped: true };
    }

    let indexed = 0;

    for (const chunkText of chunks) {
      const chunkHash = this.hashChunk(news.id, chunkText);
      const embedding = await this.createEmbedding(chunkText);
      const vector = this.toVectorLiteral(embedding);

      await this.prisma.$executeRaw`
        INSERT INTO "NewsEmbedding" (
          "id",
          "newsId",
          "chunkText",
          "chunkHash",
          "model",
          "embedding",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${news.id},
          ${chunkText},
          ${chunkHash},
          ${this.embeddingModel},
          ${vector}::vector,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("chunkHash") DO UPDATE SET
          "chunkText" = EXCLUDED."chunkText",
          "model" = EXCLUDED."model",
          "embedding" = EXCLUDED."embedding",
          "updatedAt" = CURRENT_TIMESTAMP;
      `;

      indexed += 1;
    }

    return { indexed, skipped: false };
  }

  private buildChunks(news: NewsForEmbedding): string[] {
    const text = this.normalizeText(
      [news.title, news.description, news.content].filter(Boolean).join('\n\n'),
    );

    if (!text) {
      return [];
    }

    if (text.length <= this.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunk = text.slice(start, end).trim();

      if (chunk.length >= 80) {
        chunks.push(chunk);
      }

      if (end >= text.length) {
        break;
      }

      start = Math.max(end - this.chunkOverlap, start + 1);
    }

    return chunks;
  }

  private async createEmbedding(text: string): Promise<number[]> {
    if (this.provider !== 'ollama') {
      throw new BadRequestException(
        `Unsupported embedding provider: ${this.provider}`,
      );
    }

    try {
      const response = await axios.post<OllamaEmbeddingResponse>(
        `${this.ollamaBaseUrl}/api/embeddings`,
        {
          model: this.embeddingModel,
          prompt: text,
        },
        { timeout: 30000 },
      );

      if (!Array.isArray(response.data.embedding)) {
        throw new Error('Ollama embedding response did not include embedding.');
      }

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Failed to create RAG embedding', error);
      throw new BadRequestException('Failed to create RAG embedding.');
    }
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.map((value) => Number(value).toString()).join(',')}]`;
  }

  private hashChunk(newsId: string, chunkText: string): string {
    return createHash('sha256')
      .update(`${newsId}:${this.embeddingModel}:${chunkText}`)
      .digest('hex');
  }

  private normalizeText(value: string): string {
    return value
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private rankSearchRows(
    rows: SearchRow[],
    queryTokens: string[],
  ): RankedSearchItem[] {
    return rows
      .map((row) => {
        const lexicalMatch = this.calculateLexicalMatch(row, queryTokens);

        return {
          row,
          lexicalScore: lexicalMatch.score,
          matchedTokenCount: lexicalMatch.matchedTokenCount,
          score:
            Number(row.similarity) + Math.min(lexicalMatch.score * 0.08, 0.4),
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          new Date(b.row.publishedAt).getTime() -
          new Date(a.row.publishedAt).getTime()
        );
      });
  }

  private shouldKeepSearchItem(
    item: RankedSearchItem,
    queryTokens: string[],
  ): boolean {
    if (queryTokens.length === 0) {
      return item.row.similarity >= 0.8;
    }

    if (item.lexicalScore > 0 && item.matchedTokenCount > 0) {
      return true;
    }

    return item.row.similarity >= 0.82;
  }

  private calculateLexicalMatch(
    row: SearchRow,
    queryTokens: string[],
  ): { score: number; matchedTokenCount: number } {
    if (queryTokens.length === 0) {
      return { score: 0, matchedTokenCount: 0 };
    }

    const title = this.searchableText(row.title);
    const description = this.searchableText(row.description || '');
    const content = this.searchableText(row.content || '');
    const chunk = this.searchableText(row.matchedChunk || '');
    const searchableFields = { title, description, content, chunk };
    const fieldWords = {
      title: this.toWordSet(title),
      description: this.toWordSet(description),
      content: this.toWordSet(content),
      chunk: this.toWordSet(chunk),
    };

    return queryTokens.reduce(
      (match, token) => {
        const matchedFields = {
          title: this.hasToken(searchableFields.title, fieldWords.title, token),
          description: this.hasToken(
            searchableFields.description,
            fieldWords.description,
            token,
          ),
          chunk: this.hasToken(searchableFields.chunk, fieldWords.chunk, token),
          content: this.hasToken(
            searchableFields.content,
            fieldWords.content,
            token,
          ),
        };

        if (
          matchedFields.title ||
          matchedFields.description ||
          matchedFields.chunk ||
          matchedFields.content
        ) {
          match.matchedTokenCount += 1;
        }

        if (matchedFields.title) {
          match.score += 4;
          return match;
        }

        if (matchedFields.description) {
          match.score += 2;
          return match;
        }

        if (matchedFields.chunk) {
          match.score += 2;
          return match;
        }

        if (matchedFields.content) {
          match.score += 1;
        }

        return match;
      },
      { score: 0, matchedTokenCount: 0 },
    );
  }

  private hasToken(text: string, words: Set<string>, token: string): boolean {
    if (token.length <= 2) {
      return words.has(token);
    }

    return text.includes(token);
  }

  private toWordSet(value: string): Set<string> {
    return new Set(value.split(/\s+/).filter(Boolean));
  }

  private tokenize(value: string): string[] {
    return Array.from(
      new Set(
        this.searchableText(value)
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length >= 2),
      ),
    );
  }

  private searchableText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private readPositiveInt(key: string, fallback: number): number {
    const value = Number.parseInt(
      this.configService.get<string>(key) || '',
      10,
    );

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
