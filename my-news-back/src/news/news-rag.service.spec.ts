import { ConfigService } from '@nestjs/config';
import { NewsSourceType } from '@prisma/client';
import axios from 'axios';
import { NewsRagService } from './news-rag.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

type RawSqlCall = { text: string; values: unknown[] };

function toRawCall(
  strings: TemplateStringsArray,
  values: unknown[],
): RawSqlCall {
  return { text: strings.join('?'), values };
}

describe('NewsRagService', () => {
  let prisma: {
    news: { findUnique: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock };
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let configValues: Record<string, string>;
  let configService: ConfigService;
  let service: NewsRagService;
  let executedInTransaction: RawSqlCall[];

  beforeEach(() => {
    jest.clearAllMocks();

    configValues = {
      ENABLE_RAG_INDEXING: 'true',
      RAG_EMBEDDING_PROVIDER: 'ollama',
      RAG_EMBEDDING_MODEL: 'nomic-embed-text',
    };

    configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    executedInTransaction = [];

    prisma = {
      news: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $executeRaw: jest
        .fn()
        .mockImplementation(
          (strings: TemplateStringsArray, ...values: unknown[]) => {
            void toRawCall(strings, values);
            return Promise.resolve(0);
          },
        ),
      $queryRaw: jest.fn(),
      $transaction: jest.fn(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            $executeRaw: jest
              .fn()
              .mockImplementation(
                (strings: TemplateStringsArray, ...values: unknown[]) => {
                  executedInTransaction.push(toRawCall(strings, values));
                  return Promise.resolve(1);
                },
              ),
          };
          return callback(tx);
        },
      ),
    };

    service = new NewsRagService(
      prisma as unknown as PrismaService,
      configService,
    );

    mockedAxios.post.mockResolvedValue({
      data: { embedding: [0.1, 0.2, 0.3] },
    });
  });

  function findUniqueNews(overrides: Partial<Record<string, unknown>> = {}) {
    prisma.news.findFirst.mockResolvedValue({
      id: 'news-1',
      title: '제목',
      description: '설명',
      content: '본문',
      ...overrides,
    });
  }

  describe('press-only indexing', () => {
    it('looks up a single news item with a PRESS filter so community content is never embedded', async () => {
      findUniqueNews();

      await service.indexNews('news-1');

      expect(prisma.news.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'news-1', sourceType: NewsSourceType.PRESS },
        }),
      );
    });

    it('skips indexing when the id belongs to non-press content', async () => {
      prisma.news.findFirst.mockResolvedValue(null);

      const result = await service.indexNews('community-1');

      expect(result).toEqual({ indexed: 0, skipped: true });
    });
  });

  describe('atomic replacement', () => {
    it('deletes the old rows for the same news/model before inserting the newly generated chunks', async () => {
      findUniqueNews();

      const result = await service.indexNews('news-1');

      expect(result.skipped).toBe(false);
      expect(result.indexed).toBeGreaterThan(0);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      const deleteCall = executedInTransaction[0];
      expect(deleteCall.text).toContain('DELETE FROM "NewsEmbedding"');
      expect(deleteCall.values).toEqual(['news-1', 'nomic-embed-text']);

      const insertCalls = executedInTransaction.slice(1);
      expect(insertCalls.length).toBe(result.indexed);
      insertCalls.forEach((call) => {
        expect(call.text).toContain('INSERT INTO "NewsEmbedding"');
      });

      // delete must run before any insert within the same transaction
      const deleteIndex = executedInTransaction.findIndex((c) =>
        c.text.includes('DELETE'),
      );
      const firstInsertIndex = executedInTransaction.findIndex((c) =>
        c.text.includes('INSERT'),
      );
      expect(deleteIndex).toBeLessThan(firstInsertIndex);
    });

    it('generates all embeddings before opening the transaction', async () => {
      findUniqueNews({
        content: 'x'.repeat(3000),
      });

      const callOrder: string[] = [];
      mockedAxios.post.mockImplementation(() => {
        callOrder.push('embedding');
        return Promise.resolve({ data: { embedding: [0.1, 0.2, 0.3] } });
      });
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          callOrder.push('transaction');
          const tx = {
            $executeRaw: jest.fn().mockResolvedValue(1),
          };
          return callback(tx);
        },
      );

      await service.indexNews('news-1');

      expect(callOrder[callOrder.length - 1]).toBe('transaction');
      expect(callOrder.filter((c) => c === 'embedding').length).toBeGreaterThan(
        1,
      );
    });

    it('deduplicates repeated identical chunk text instead of inserting duplicate hashes', async () => {
      findUniqueNews({
        title: '',
        description: null,
        content: 'a'.repeat(5000),
      });

      const result = await service.indexNews('news-1');

      const insertCalls = executedInTransaction.filter((call) =>
        call.text.includes('INSERT'),
      );
      const insertedHashes = insertCalls.map((call) => call.values[3]);

      expect(insertedHashes.length).toBe(new Set(insertedHashes).size);
      expect(result.indexed).toBe(insertedHashes.length);
    });
  });

  describe('failure preservation', () => {
    it('does not touch the database when embedding generation fails', async () => {
      findUniqueNews();
      mockedAxios.post.mockRejectedValue(new Error('ollama down'));

      await expect(service.indexNews('news-1')).rejects.toThrow();

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('rolls back and keeps old rows when the replace transaction fails', async () => {
      findUniqueNews();
      prisma.$transaction.mockRejectedValue(new Error('db unavailable'));

      await expect(service.indexNews('news-1')).rejects.toThrow(
        'db unavailable',
      );

      // no direct (non-transactional) delete/insert should have leaked out
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('model isolation', () => {
    it('scopes delete to the currently configured embedding model only', async () => {
      findUniqueNews();

      await service.indexNews('news-1');

      const deleteCall = executedInTransaction[0];
      expect(deleteCall.values).toContain('nomic-embed-text');
      expect(deleteCall.text).toContain('"model" =');
    });

    it('does not remove other models when the empty-source cleanup runs', async () => {
      findUniqueNews({ title: '', description: null, content: null });

      await service.indexNews('news-1');

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = prisma.$executeRaw.mock.calls[0] as [
        TemplateStringsArray,
        ...unknown[],
      ];
      const call = toRawCall(strings, values);
      expect(call.text).toContain('DELETE FROM "NewsEmbedding"');
      expect(call.values).toEqual(['news-1', 'nomic-embed-text']);
    });
  });

  describe('empty source handling', () => {
    it('removes stale embeddings and skips embedding generation when the source text is empty', async () => {
      findUniqueNews({ title: '', description: null, content: null });
      prisma.$executeRaw.mockResolvedValue(2);

      const result = await service.indexNews('news-1');

      expect(result).toEqual({ indexed: 0, skipped: true });
      // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() reference, not `this`-bound
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('is a no-op against the database when there was nothing stale to remove', async () => {
      findUniqueNews({ title: '', description: null, content: null });
      prisma.$executeRaw.mockResolvedValue(0);

      const result = await service.indexNews('news-1');

      expect(result).toEqual({ indexed: 0, skipped: true });
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('per news/model serialization', () => {
    it('does not start the second concurrent indexNews call until the first has fully settled', async () => {
      findUniqueNews();

      let resolveFirstEmbedding!: (value: {
        data: { embedding: number[] };
      }) => void;
      const firstEmbeddingGate = new Promise<{
        data: { embedding: number[] };
      }>((resolve) => {
        resolveFirstEmbedding = resolve;
      });

      const order: string[] = [];
      let callCount = 0;

      mockedAxios.post.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          order.push('embed-1-start');
          return firstEmbeddingGate.then((value) => {
            order.push('embed-1-end');
            return value;
          });
        }

        order.push('embed-2');
        return Promise.resolve({ data: { embedding: [0.1, 0.2, 0.3] } });
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          order.push('tx-start');
          const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
          const result = await callback(tx);
          order.push('tx-end');
          return result;
        },
      );

      const first = service.indexNews('news-1');
      await Promise.resolve();
      await Promise.resolve();

      const second = service.indexNews('news-1');
      await Promise.resolve();
      await Promise.resolve();

      expect(callCount).toBe(1);
      expect(prisma.$transaction).not.toHaveBeenCalled();

      resolveFirstEmbedding({ data: { embedding: [0.1, 0.2, 0.3] } });

      await Promise.all([first, second]);

      expect(callCount).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(order).toEqual([
        'embed-1-start',
        'embed-1-end',
        'tx-start',
        'tx-end',
        'embed-2',
        'tx-start',
        'tx-end',
      ]);
    });

    it('releases the lock when the first run fails so the waiting second run can still proceed', async () => {
      findUniqueNews();

      let rejectFirstEmbedding!: (error: Error) => void;
      const firstEmbeddingGate = new Promise<never>((_, reject) => {
        rejectFirstEmbedding = reject;
      });

      const order: string[] = [];
      let callCount = 0;

      mockedAxios.post.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          order.push('embed-1-start');
          return firstEmbeddingGate.catch((error: Error) => {
            order.push('embed-1-failed');
            throw error;
          });
        }

        order.push('embed-2');
        return Promise.resolve({ data: { embedding: [0.1, 0.2, 0.3] } });
      });

      const first = service.indexNews('news-1');
      await Promise.resolve();
      await Promise.resolve();

      const second = service.indexNews('news-1');
      await Promise.resolve();
      await Promise.resolve();

      expect(callCount).toBe(1);

      rejectFirstEmbedding(new Error('ollama down'));

      await expect(first).rejects.toThrow('Failed to create RAG embedding.');
      const secondResult = await second;

      expect(secondResult.skipped).toBe(false);
      expect(secondResult.indexed).toBeGreaterThan(0);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(order.indexOf('embed-1-failed')).toBeLessThan(
        order.indexOf('embed-2'),
      );
    });
  });

  describe('disabled / missing news', () => {
    it('skips without querying prisma raw APIs when RAG indexing is disabled', async () => {
      configValues.ENABLE_RAG_INDEXING = 'false';
      service = new NewsRagService(
        prisma as unknown as PrismaService,
        configService,
      );

      const result = await service.indexNews('news-1');

      expect(result).toEqual({ indexed: 0, skipped: true });
      expect(prisma.news.findUnique).not.toHaveBeenCalled();
    });

    it('skips when the news record no longer exists', async () => {
      prisma.news.findUnique.mockResolvedValue(null);

      const result = await service.indexNews('missing');

      expect(result).toEqual({ indexed: 0, skipped: true });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('press-only filtering', () => {
    it('indexRecentNews only selects press articles to re-embed', async () => {
      prisma.news.findMany.mockResolvedValue([]);

      await service.indexRecentNews(10);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceType: 'PRESS' },
        }),
      );
    });

    it('semanticSearch restricts the joined News rows to sourceType PRESS', async () => {
      prisma.$queryRaw.mockImplementation(
        (strings: TemplateStringsArray, ...values: unknown[]) => {
          const call = toRawCall(strings, values);
          expect(call.text).toContain(`n."sourceType" = 'PRESS'`);
          return Promise.resolve([]);
        },
      );

      const result = await service.semanticSearch('테스트 검색어', 5);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result.items).toEqual([]);
    });
  });
});
