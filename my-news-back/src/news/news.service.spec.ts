import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { PrismaService } from '../prisma/prisma.service';
import { NewsService } from './news.service';
import type { NewsRagService } from './news-rag.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

interface NewsFindManyArgs {
  where: Record<string, unknown>;
}

interface NewsUpsertArgs {
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

const lastFindManyArgs = (
  findManyMock: jest.Mock,
  callIndex: number,
): NewsFindManyArgs => {
  const call = findManyMock.mock.calls[callIndex] as [NewsFindManyArgs];
  return call[0];
};

const lastUpsertArgs = (
  upsertMock: jest.Mock,
  callIndex: number,
): NewsUpsertArgs => {
  const call = upsertMock.mock.calls[callIndex] as [NewsUpsertArgs];
  return call[0];
};

describe('NewsService', () => {
  let service: NewsService;
  let prisma: {
    news: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    category: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };
  let newsRagService: { indexNews: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      news: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NAVER_CLIENT_ID') return 'test-client-id';
        if (key === 'NAVER_CLIENT_SECRET') return 'test-client-secret';
        return undefined;
      }),
    };

    newsRagService = {
      indexNews: jest.fn().mockResolvedValue(undefined),
    };

    service = new NewsService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      newsRagService as unknown as NewsRagService,
    );
  });

  const buildNewsRow = (overrides: Record<string, unknown> = {}) => ({
    id: '00000000-0000-4000-8000-000000000001',
    title: 'title',
    description: 'description',
    content: 'content',
    contentHtml: '<p>content</p>',
    url: 'https://example.com/article',
    urlToImage: 'https://example.com/image.jpg',
    publishedAt: new Date('2024-01-01T00:00:00.000Z'),
    source: 'example.com',
    author: null,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: '일반', slug: 'general' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('getNews pagination', () => {
    it('orders by publishedAt desc with id desc tiebreak and encodes an opaque nextCursor', async () => {
      const itemA = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000b',
        publishedAt: new Date('2024-01-02T00:00:00.000Z'),
      });
      const itemB = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000a',
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      const itemC = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000c',
        publishedAt: new Date('2023-12-31T00:00:00.000Z'),
      });

      prisma.news.findMany.mockResolvedValue([itemA, itemB, itemC]);

      const result = await service.getNews(undefined, 2);

      expect(prisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 3,
        }),
      );
      expect(result.hasMore).toBe(true);
      expect(result.items).toEqual([itemA, itemB]);
      expect(typeof result.nextCursor).toBe('string');
      // opaque to the client: must not equal the raw id of the last item
      expect(result.nextCursor).not.toBe(itemB.id);
    });

    it('produces a stable publishedAt+id filter (not a raw id filter) when following a cursor', async () => {
      const anchor = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000a',
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      const extra = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000e',
        publishedAt: new Date('2023-12-31T00:00:00.000Z'),
      });
      prisma.news.findMany.mockResolvedValueOnce([anchor, extra]);
      const firstPage = await service.getNews(undefined, 1);
      expect(firstPage.nextCursor).toBeTruthy();

      prisma.news.findMany.mockResolvedValueOnce([]);
      await service.getNews(firstPage.nextCursor as string, 1);

      const secondCallArgs = lastFindManyArgs(prisma.news.findMany, 1);
      expect(secondCallArgs.where).toEqual({
        AND: [
          {
            OR: [
              { publishedAt: { lt: anchor.publishedAt } },
              { publishedAt: anchor.publishedAt, id: { lt: anchor.id } },
            ],
          },
        ],
      });
    });

    it('does not skip or duplicate items when multiple news share the same publishedAt', async () => {
      const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
      const first = buildNewsRow({
        id: '00000000-0000-4000-8000-000000000003',
        publishedAt: sameTimestamp,
      });
      const second = buildNewsRow({
        id: '00000000-0000-4000-8000-000000000002',
        publishedAt: sameTimestamp,
      });
      const third = buildNewsRow({
        id: '00000000-0000-4000-8000-000000000001',
        publishedAt: sameTimestamp,
      });

      // page 1: limit 2, take 3 -> returns 3 rows so hasMore=true, cursor anchors on `second`
      prisma.news.findMany.mockResolvedValueOnce([first, second, third]);
      const page1 = await service.getNews(undefined, 2);
      expect(page1.items).toEqual([first, second]);
      expect(page1.hasMore).toBe(true);

      // page 2: only `third` remains after the id-based tiebreak
      prisma.news.findMany.mockResolvedValueOnce([third]);
      const page2 = await service.getNews(page1.nextCursor as string, 2);

      const secondCallWhere = lastFindManyArgs(prisma.news.findMany, 1).where;
      expect(secondCallWhere).toEqual({
        AND: [
          {
            OR: [
              { publishedAt: { lt: sameTimestamp } },
              { publishedAt: sameTimestamp, id: { lt: second.id } },
            ],
          },
        ],
      });
      expect(page2.items).toEqual([third]);
      expect(page2.hasMore).toBe(false);
    });

    it('accepts a legacy raw-UUID cursor for backward compatibility', async () => {
      const legacyId = '123e4567-e89b-12d3-a456-426614174000';
      const legacyPublishedAt = new Date('2024-01-05T00:00:00.000Z');

      prisma.news.findUnique.mockResolvedValueOnce({
        id: legacyId,
        publishedAt: legacyPublishedAt,
      });
      prisma.news.findMany.mockResolvedValueOnce([]);

      await service.getNews(legacyId, 20);

      expect(prisma.news.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: legacyId } }),
      );
      const where = lastFindManyArgs(prisma.news.findMany, 0).where;
      expect(where).toEqual({
        AND: [
          {
            OR: [
              { publishedAt: { lt: legacyPublishedAt } },
              { publishedAt: legacyPublishedAt, id: { lt: legacyId } },
            ],
          },
        ],
      });
    });

    it('throws explicitly on an invalid cursor', async () => {
      prisma.news.findUnique.mockResolvedValueOnce(null);

      await expect(service.getNews('not-a-valid-cursor', 20)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a structurally malformed cursor (non-UUID id / bad date) even though it decodes', async () => {
      const bogusCursor = Buffer.from(
        '2024-01-01T00:00:00.000Z|not-a-uuid',
        'utf8',
      ).toString('base64url');

      prisma.news.findUnique.mockResolvedValueOnce(null);

      await expect(service.getNews(bogusCursor, 20)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('combines cursor, category, and search filters with AND', async () => {
      const anchor = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000a',
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      const extra = buildNewsRow({
        id: '00000000-0000-4000-8000-00000000000e',
        publishedAt: new Date('2023-12-31T00:00:00.000Z'),
      });
      prisma.news.findMany.mockResolvedValueOnce([anchor, extra]);
      const page1 = await service.getNews(undefined, 1);

      prisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        slug: 'technology',
      });
      prisma.news.findMany.mockResolvedValueOnce([]);

      await service.getNews(page1.nextCursor as string, 20, 'technology', 'ai');

      const where = lastFindManyArgs(prisma.news.findMany, 1).where;
      expect(where.AND).toHaveLength(3);
      expect(where.AND).toContainEqual({ categoryId: 'cat-1' });
      expect(where.AND).toContainEqual({
        OR: [
          { title: { contains: 'ai', mode: 'insensitive' } },
          { description: { contains: 'ai', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('fetchAndCacheNews content preservation', () => {
    const mockNaverApiResponse = (overrides: Record<string, unknown> = {}) => ({
      data: {
        items: [
          {
            title: '새 기사 제목',
            description: '새 기사 설명',
            originallink: 'https://example.com/article',
            link: 'https://example.com/article',
            pubDate: 'Mon, 01 Jan 2024 00:00:00 +0900',
            ...overrides,
          },
        ],
      },
    });

    beforeEach(() => {
      prisma.category.upsert.mockResolvedValue({
        id: 'cat-1',
        name: '일반',
        slug: 'general',
      });
      prisma.news.upsert.mockImplementation((args: NewsUpsertArgs) => ({
        id: 'saved-id',
        ...(args.update ?? args.create),
      }));
    });

    it('re-ingesting an already-enriched article keeps existing full content/contentHtml', async () => {
      // GET to naver search API
      mockedAxios.get.mockResolvedValueOnce(mockNaverApiResponse());

      prisma.news.findUnique.mockResolvedValueOnce({
        urlToImage: 'https://example.com/image.jpg',
        content: '기존 본문 전체 내용입니다.',
        contentHtml: '<p>기존 본문 전체 내용입니다.</p>',
      });

      const savedCount = await service.fetchAndCacheNews('general');

      expect(savedCount).toBe(1);
      // enrichment must be skipped: only the search API call, no article-page crawl
      expect(mockedAxios.get.mock.calls).toHaveLength(1);

      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.update.content).toBe('기존 본문 전체 내용입니다.');
      expect(upsertArgs.update.contentHtml).toBe(
        '<p>기존 본문 전체 내용입니다.</p>',
      );
    });

    it('preserves existing content/contentHtml when enrichment crawl fails', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockNaverApiResponse());

      // urlToImage missing -> shouldEnrich becomes true
      prisma.news.findUnique.mockResolvedValueOnce({
        urlToImage: null,
        content: '기존 본문 전체 내용입니다.',
        contentHtml: '<p>기존 본문 전체 내용입니다.</p>',
      });

      // article page crawl fails
      mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

      const savedCount = await service.fetchAndCacheNews('general');

      expect(savedCount).toBe(1);
      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.update.content).toBe('기존 본문 전체 내용입니다.');
      expect(upsertArgs.update.contentHtml).toBe(
        '<p>기존 본문 전체 내용입니다.</p>',
      );
    });

    it('preserves existing content/contentHtml when the crawl succeeds but no genuine article body is found', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockNaverApiResponse());

      // urlToImage missing -> shouldEnrich becomes true
      prisma.news.findUnique.mockResolvedValueOnce({
        urlToImage: null,
        content: '기존 본문 전체 내용입니다.',
        contentHtml: '<p>기존 본문 전체 내용입니다.</p>',
      });

      // article page fetch succeeds, but the page has no article body markup
      // (no selectors/paragraphs match) -> extraction falls back to the
      // short meta description instead of a real body.
      const html = `<html><head><meta name="description" content="짧은 설명 폴백"></head><body><div>no paragraphs here</div></body></html>`;
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from(html, 'utf8'),
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });

      const savedCount = await service.fetchAndCacheNews('general');

      expect(savedCount).toBe(1);
      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      // the crawl "succeeded" but only produced a description-length fallback,
      // so the fuller existing content/contentHtml must be kept, not overwritten
      expect(upsertArgs.update.content).toBe('기존 본문 전체 내용입니다.');
      expect(upsertArgs.update.contentHtml).toBe(
        '<p>기존 본문 전체 내용입니다.</p>',
      );
    });

    it('falls back to description-derived content only when there is no existing content at all', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockNaverApiResponse());

      prisma.news.findUnique.mockResolvedValueOnce(null);
      mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

      const savedCount = await service.fetchAndCacheNews('general');

      expect(savedCount).toBe(1);
      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.create.content).toBe('새 기사 설명');
      expect(upsertArgs.create.contentHtml).toBe('<p>새 기사 설명</p>');
    });
  });
});
