import * as fs from 'fs';
import * as path from 'path';
import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HackerNewsSource } from './hacker-news.source';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

interface FixtureItem {
  by?: string;
  descendants?: number;
  id: number;
  score?: number;
  text?: string;
  time?: number;
  title: string;
  type: string;
  url?: string;
}

interface Fixture {
  topStoryIds: number[];
  items: Record<string, FixtureItem>;
}

const FIXTURE_PATH = path.join(
  __dirname,
  '__fixtures__',
  'hacker-news-items.json',
);

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as Fixture;

describe('HackerNewsSource', () => {
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    configService = { get: jest.fn().mockReturnValue(undefined) };
  });

  const mockHackerNewsApi = (topStoryIds: number[] = fixture.topStoryIds) => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.endsWith('/topstories.json')) {
        return Promise.resolve({ data: topStoryIds });
      }

      const match = /\/item\/(\d+)\.json$/.exec(url);
      const id = match ? Number(match[1]) : NaN;
      const item = fixture.items[String(id)];

      return Promise.resolve({ data: item });
    });
  };

  it('is configured with no API key required', () => {
    const source = new HackerNewsSource(
      configService as unknown as ConfigService,
    );
    expect(source.isConfigured()).toBe(true);
    expect(source.skipContentCrawl).toBe(true);
  });

  it('maps a Hacker News item to a normalized article, carrying score/descendants', async () => {
    mockHackerNewsApi([49792730]);
    const source = new HackerNewsSource(
      configService as unknown as ConfigService,
    );

    const articles = await source.fetchArticles({});

    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      title: 'MiMo v2.6',
      url: 'https://mimo.xiaomi.com/mimo-v2-6',
      author: 'volf_',
      source: 'Hacker News',
      externalScore: 700,
      externalCommentCount: 330,
    });
    expect(articles[0].publishedAt).toEqual(new Date(1790021532 * 1000));
  });

  it('falls back to the HN item page when the story has no url (e.g. Ask HN)', async () => {
    mockHackerNewsApi([49786609]);
    const source = new HackerNewsSource(
      configService as unknown as ConfigService,
    );

    const articles = await source.fetchArticles({});

    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe(
      'https://news.ycombinator.com/item?id=49786609',
    );
  });

  it('respects the configured item count (limit)', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'HACKER_NEWS_ITEM_COUNT') return '2';
      return undefined;
    });
    mockHackerNewsApi(fixture.topStoryIds);
    const source = new HackerNewsSource(
      configService as unknown as ConfigService,
    );

    await source.fetchArticles({});

    // 1 call for topstories.json + exactly 2 item calls (the configured limit)
    const itemCalls = mockedAxios.get.mock.calls.filter(([url]) =>
      String(url).includes('/item/'),
    );
    expect(itemCalls).toHaveLength(2);
  });

  it('keeps concurrent in-flight item requests within the configured bound', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'HACKER_NEWS_ITEM_COUNT') return '4';
      if (key === 'HACKER_NEWS_CONCURRENCY') return '2';
      return undefined;
    });

    let inFlight = 0;
    let maxInFlight = 0;

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.endsWith('/topstories.json')) {
        return Promise.resolve({ data: fixture.topStoryIds });
      }

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      return new Promise((resolve) => {
        setTimeout(() => {
          inFlight -= 1;
          const match = /\/item\/(\d+)\.json$/.exec(url);
          const id = match ? Number(match[1]) : NaN;
          const item = fixture.items[String(id)];
          resolve({ data: item });
        }, 5);
      });
    });

    const source = new HackerNewsSource(
      configService as unknown as ConfigService,
    );
    await source.fetchArticles({});

    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(maxInFlight).toBeGreaterThan(0);
  });
});
