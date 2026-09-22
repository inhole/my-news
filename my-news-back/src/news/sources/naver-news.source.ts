import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { extractSourceName } from './extract-source-name.util';
import {
  NewsSourceAdapter,
  NewsSourceFetchOptions,
  NormalizedArticle,
} from './news-source.interface';

type NaverSort = 'sim' | 'date';

interface NaverNewsApiParams {
  query: string;
  display: number;
  start: number;
  sort: NaverSort;
}

interface NaverNewsItem {
  title?: string;
  description?: string;
  originallink?: string;
  link?: string;
  pubDate?: string;
}

interface NaverNewsApiResponse {
  items?: NaverNewsItem[];
}

/**
 * Naver News Search API adapter. This mirrors exactly what
 * `news.service`'s `fetchAndCacheNews` did inline before the source-adapter
 * refactor; behaviour is unchanged.
 */
@Injectable()
export class NaverNewsSource implements NewsSourceAdapter {
  readonly id = 'naver';
  readonly displayName = 'Naver News';
  readonly skipContentCrawl = false;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('NAVER_CLIENT_SECRET') || '';
    this.apiUrl =
      this.configService.get<string>('NAVER_NEWS_API_URL') ||
      'https://openapi.naver.com/v1/search/news.json';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async fetchArticles(
    options: NewsSourceFetchOptions,
  ): Promise<NormalizedArticle[]> {
    const params: NaverNewsApiParams = {
      query: options.searchQuery || '',
      display: 100,
      start: 1,
      sort: 'date',
    };

    const response = await axios.get<NaverNewsApiResponse>(this.apiUrl, {
      params,
      headers: {
        'X-Naver-Client-Id': this.clientId,
        'X-Naver-Client-Secret': this.clientSecret,
      },
    });

    const items: NaverNewsItem[] = Array.isArray(response.data.items)
      ? response.data.items
      : [];

    return items
      .map((item) => this.toNormalizedArticle(item))
      .filter((article): article is NormalizedArticle => article !== null);
  }

  private toNormalizedArticle(item: NaverNewsItem): NormalizedArticle | null {
    const originalUrl = item.originallink;
    const fallbackUrl = item.link;
    const url = originalUrl || fallbackUrl;

    if (!url) {
      return null;
    }

    const metadataCrawlUrls = [
      ...new Set(
        [originalUrl, fallbackUrl].filter((value): value is string =>
          Boolean(value),
        ),
      ),
    ];

    return {
      title: item.title || '',
      description: item.description || '',
      url,
      publishedAt: this.parsePublishedDate(item.pubDate),
      source: extractSourceName(url),
      author: null,
      metadataCrawlUrls,
    };
  }

  private parsePublishedDate(pubDate?: string): Date {
    if (!pubDate) {
      return new Date();
    }

    const parsed = new Date(pubDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
