import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  NewsSourceAdapter,
  NewsSourceFetchOptions,
  NormalizedArticle,
} from './news-source.interface';

interface HackerNewsItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
  deleted?: boolean;
  dead?: boolean;
}

const DEFAULT_CONCURRENCY = 5;

/**
 * Hacker News adapter, backed by the public Firebase API
 * (https://hacker-news.firebaseio.com/v0/). `topstories.json` only returns
 * ids, so fetching articles is an N+1: one call for the id list, then one
 * `item/<id>.json` call per story. We cap how many stories we fetch and
 * bound how many of those per-item calls run concurrently, matching the
 * politeness pattern already used by `news-batch.service`'s `delay(2000)`.
 */
@Injectable()
export class HackerNewsSource implements NewsSourceAdapter {
  readonly id = 'hacker-news';
  readonly displayName = 'Hacker News';
  readonly skipContentCrawl = true;

  private readonly logger = new Logger(HackerNewsSource.name);
  private readonly baseUrl: string;
  private readonly itemLimit: number;
  private readonly concurrency: number;

  constructor(private configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('HACKER_NEWS_API_URL') ||
      'https://hacker-news.firebaseio.com/v0';
    this.itemLimit = this.toPositiveInt(
      this.configService.get<string>('HACKER_NEWS_ITEM_COUNT'),
      30,
    );
    this.concurrency = this.toPositiveInt(
      this.configService.get<string>('HACKER_NEWS_CONCURRENCY'),
      DEFAULT_CONCURRENCY,
    );
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  async fetchArticles(
    options: NewsSourceFetchOptions = {},
  ): Promise<NormalizedArticle[]> {
    const ids = await this.fetchTopStoryIds();
    const limit = options.limit ?? this.itemLimit;
    const targetIds = ids.slice(0, limit);

    const items = await this.fetchItemsWithBoundedConcurrency(targetIds);

    return items
      .map((item) => this.toNormalizedArticle(item))
      .filter((article): article is NormalizedArticle => article !== null);
  }

  private async fetchTopStoryIds(): Promise<number[]> {
    const response = await axios.get<number[]>(
      `${this.baseUrl}/topstories.json`,
      { timeout: 8000 },
    );

    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Fetches each item id, running at most `this.concurrency` requests in
   * flight at a time. A single item failure is logged and skipped rather
   * than failing the whole batch.
   */
  private async fetchItemsWithBoundedConcurrency(
    ids: number[],
  ): Promise<HackerNewsItem[]> {
    const results: (HackerNewsItem | null)[] = new Array<HackerNewsItem | null>(
      ids.length,
    ).fill(null);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= ids.length) {
          return;
        }

        results[currentIndex] = await this.fetchItem(ids[currentIndex]);
      }
    };

    const workerCount = Math.min(this.concurrency, ids.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return results.filter((item): item is HackerNewsItem => item !== null);
  }

  private async fetchItem(id: number): Promise<HackerNewsItem | null> {
    try {
      const response = await axios.get<HackerNewsItem>(
        `${this.baseUrl}/item/${id}.json`,
        { timeout: 8000 },
      );
      return response.data || null;
    } catch (error) {
      this.logger.debug(
        `Failed to fetch Hacker News item ${id}: ${String(error)}`,
      );
      return null;
    }
  }

  private toNormalizedArticle(item: HackerNewsItem): NormalizedArticle | null {
    if (!item || !item.title || item.deleted || item.dead) {
      return null;
    }

    const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;

    return {
      title: item.title,
      description: '',
      url,
      publishedAt: item.time ? new Date(item.time * 1000) : new Date(),
      source: 'Hacker News',
      author: item.by || null,
      externalScore: typeof item.score === 'number' ? item.score : null,
      externalCommentCount:
        typeof item.descendants === 'number' ? item.descendants : null,
    };
  }

  private toPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
