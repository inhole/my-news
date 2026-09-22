import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NaverNewsSource } from './naver-news.source';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NaverNewsSource', () => {
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NAVER_CLIENT_ID') return 'test-client-id';
        if (key === 'NAVER_CLIENT_SECRET') return 'test-client-secret';
        return undefined;
      }),
    };
  });

  it('reports configured only when both client id and secret are set', () => {
    const configured = new NaverNewsSource(
      configService as unknown as ConfigService,
    );
    expect(configured.isConfigured()).toBe(true);

    const unconfiguredConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const unconfigured = new NaverNewsSource(
      unconfiguredConfigService as unknown as ConfigService,
    );
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('does not run the article-body crawler (Naver press articles keep the crawler on)', () => {
    const source = new NaverNewsSource(
      configService as unknown as ConfigService,
    );
    expect(source.skipContentCrawl).toBe(false);
  });

  it('maps the Naver News Search API response the same way the inline code used to', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            title: '<b>새</b> 기사 제목',
            description: '새 기사 설명',
            originallink: 'https://example.com/article',
            link: 'https://news.naver.com/article/1',
            pubDate: 'Mon, 01 Jan 2024 00:00:00 +0900',
          },
          // no url at all -> must be skipped
          {
            title: 'no url',
            description: 'no url',
          },
        ],
      },
    });

    const source = new NaverNewsSource(
      configService as unknown as ConfigService,
    );
    const articles = await source.fetchArticles({ searchQuery: '한국 뉴스' });

    const [requestUrl, requestConfig] = mockedAxios.get.mock.calls[0] as [
      string,
      { params: unknown; headers: unknown },
    ];
    expect(requestUrl).toBe('https://openapi.naver.com/v1/search/news.json');
    expect(requestConfig.params).toEqual({
      query: '한국 뉴스',
      display: 100,
      start: 1,
      sort: 'date',
    });
    expect(requestConfig.headers).toEqual({
      'X-Naver-Client-Id': 'test-client-id',
      'X-Naver-Client-Secret': 'test-client-secret',
    });

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: '<b>새</b> 기사 제목',
      description: '새 기사 설명',
      url: 'https://example.com/article',
      source: 'example.com',
      author: null,
    });
    expect(articles[0].publishedAt).toEqual(
      new Date('Mon, 01 Jan 2024 00:00:00 +0900'),
    );
    expect(articles[0].metadataCrawlUrls).toEqual([
      'https://example.com/article',
      'https://news.naver.com/article/1',
    ]);
  });

  it('falls back to the link when originallink is missing', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [
          {
            title: 'fallback title',
            description: 'fallback description',
            link: 'https://news.naver.com/article/2',
            pubDate: 'Mon, 01 Jan 2024 00:00:00 +0900',
          },
        ],
      },
    });

    const source = new NaverNewsSource(
      configService as unknown as ConfigService,
    );
    const articles = await source.fetchArticles({ searchQuery: 'q' });

    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe('https://news.naver.com/article/2');
    expect(articles[0].metadataCrawlUrls).toEqual([
      'https://news.naver.com/article/2',
    ]);
  });
});
