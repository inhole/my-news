import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { NewsSourceType } from '@prisma/client';
import axios from 'axios';
import type { PrismaService } from '../prisma/prisma.service';
import { NewsService } from './news.service';
import type { NewsRagService } from './news-rag.service';
import { GeekNewsSource } from './sources/geeknews.source';
import { HackerNewsSource } from './sources/hacker-news.source';
import { NaverNewsSource } from './sources/naver-news.source';
import { NewsSourcesRegistry } from './sources/news-sources.registry';

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
      findFirst: jest.Mock;
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
        findFirst: jest.fn(),
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

    const newsSourcesRegistry = new NewsSourcesRegistry(
      new NaverNewsSource(configService as unknown as ConfigService),
      new GeekNewsSource(configService as unknown as ConfigService),
      new HackerNewsSource(configService as unknown as ConfigService),
    );

    service = new NewsService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      newsRagService as unknown as NewsRagService,
      newsSourcesRegistry,
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
          { sourceType: NewsSourceType.PRESS },
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
          { sourceType: NewsSourceType.PRESS },
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
          { sourceType: NewsSourceType.PRESS },
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
      expect(where.AND).toHaveLength(4);
      expect(where.AND).toContainEqual({ sourceType: NewsSourceType.PRESS });
      expect(where.AND).toContainEqual({ categoryId: 'cat-1' });
      expect(where.AND).toContainEqual({
        OR: [
          { title: { contains: 'ai', mode: 'insensitive' } },
          { description: { contains: 'ai', mode: 'insensitive' } },
        ],
      });
    });

    it('always filters to press articles, even with no cursor/category/search', async () => {
      prisma.news.findMany.mockResolvedValueOnce([]);

      await service.getNews();

      const where = lastFindManyArgs(prisma.news.findMany, 0).where;
      expect(where).toEqual({ AND: [{ sourceType: NewsSourceType.PRESS }] });
    });
  });

  describe('getNewsById press-only guarantee', () => {
    it('scopes the lookup to press articles so a community/blog id resolves to nothing', async () => {
      prisma.news.findFirst.mockResolvedValueOnce(null);

      await service.getNewsById('00000000-0000-4000-8000-000000000099');

      expect(prisma.news.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: '00000000-0000-4000-8000-000000000099',
            sourceType: NewsSourceType.PRESS,
          },
        }),
      );
    });
  });

  describe('getCommunityNews', () => {
    it('filters to non-press sourceType and paginates like getNews', async () => {
      const item = buildNewsRow({
        id: '00000000-0000-4000-8000-0000000000c1',
        sourceType: NewsSourceType.COMMUNITY,
      });
      prisma.news.findMany.mockResolvedValueOnce([item]);

      const result = await service.getCommunityNews();

      const where = lastFindManyArgs(prisma.news.findMany, 0).where;
      expect(where).toEqual({
        AND: [{ sourceType: { not: NewsSourceType.PRESS } }],
      });
      expect(result.items).toEqual([item]);
    });

    it('combines the non-press filter with the cursor condition', async () => {
      const anchor = buildNewsRow({
        id: '00000000-0000-4000-8000-0000000000c2',
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        sourceType: NewsSourceType.COMMUNITY,
      });
      prisma.news.findMany.mockResolvedValueOnce([anchor]);
      const page1 = await service.getCommunityNews(undefined, 1);
      // only 1 row returned for take=2 -> hasMore=false, no cursor to follow;
      // force a second call directly to inspect the cursor-combined where.
      prisma.news.findMany.mockResolvedValueOnce([]);
      const cursor = (
        service as unknown as {
          encodeCursor: (publishedAt: Date, id: string) => string;
        }
      ).encodeCursor(anchor.publishedAt, anchor.id);

      await service.getCommunityNews(cursor, 20);

      const where = lastFindManyArgs(prisma.news.findMany, 1).where;
      expect(where).toEqual({
        AND: [
          { sourceType: { not: NewsSourceType.PRESS } },
          {
            OR: [
              { publishedAt: { lt: anchor.publishedAt } },
              { publishedAt: anchor.publishedAt, id: { lt: anchor.id } },
            ],
          },
        ],
      });
      expect(page1.hasMore).toBe(false);
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

    it('persists sourceType PRESS and a categoryId for the default naver source', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockNaverApiResponse());
      prisma.news.findUnique.mockResolvedValueOnce(null);
      mockedAxios.get.mockRejectedValueOnce(new Error('network error'));

      await service.fetchAndCacheNews('general');

      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.create.sourceType).toBe(NewsSourceType.PRESS);
      expect(upsertArgs.create.categoryId).toBe('cat-1');
      expect(newsRagService.indexNews).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchAndCacheNews source generalization', () => {
    beforeEach(() => {
      prisma.news.upsert.mockImplementation((args: NewsUpsertArgs) => ({
        id: 'saved-id',
        ...(args.update ?? args.create),
      }));
    });

    it('persists geeknews articles as COMMUNITY with no category and skips RAG indexing', async () => {
      const atomFeed = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>GeekNews item</title>
            <link rel="alternate" href="https://news.hada.io/topic?id=1" />
            <author><name>submitter</name></author>
            <published>2024-01-01T00:00:00Z</published>
            <content type="html"><![CDATA[<p>본문 요약</p>]]></content>
          </entry>
        </feed>`;
      mockedAxios.get.mockResolvedValueOnce({ data: atomFeed });

      const savedCount = await service.fetchAndCacheNews(undefined, 'geeknews');

      expect(savedCount).toBe(1);
      expect(prisma.category.upsert).not.toHaveBeenCalled();
      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.create.sourceType).toBe(NewsSourceType.COMMUNITY);
      expect(upsertArgs.create.categoryId).toBeNull();
      expect(newsRagService.indexNews).not.toHaveBeenCalled();
    });

    it('persists hacker-news articles as COMMUNITY with externalScore/externalCommentCount and skips RAG indexing', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [111] });
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 111,
          title: 'HN item',
          url: 'https://example.com/hn-article',
          by: 'someone',
          score: 42,
          descendants: 7,
          time: 1704067200,
          type: 'story',
        },
      });

      const savedCount = await service.fetchAndCacheNews(
        undefined,
        'hacker-news',
      );

      expect(savedCount).toBe(1);
      expect(prisma.category.upsert).not.toHaveBeenCalled();
      const upsertArgs = lastUpsertArgs(prisma.news.upsert, 0);
      expect(upsertArgs.create.sourceType).toBe(NewsSourceType.COMMUNITY);
      expect(upsertArgs.create.categoryId).toBeNull();
      expect(upsertArgs.create.externalScore).toBe(42);
      expect(upsertArgs.create.externalCommentCount).toBe(7);
      expect(newsRagService.indexNews).not.toHaveBeenCalled();
    });

    it('returns 0 and logs a warning for an unknown source id', async () => {
      const savedCount = await service.fetchAndCacheNews(undefined, 'bogus');
      expect(savedCount).toBe(0);
      expect(mockedAxios.get.mock.calls).toHaveLength(0);
    });
  });
});
