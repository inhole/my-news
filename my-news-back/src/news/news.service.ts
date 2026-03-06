import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly naverClientId: string;
  private readonly naverClientSecret: string;
  private readonly naverNewsApiUrl: string;
  private readonly categoryQueryMap: Record<string, string> = {
    general: '한국 주요 뉴스',
    business: '한국 경제',
    technology: '한국 IT 기술',
    entertainment: '한국 연예',
    sports: '한국 스포츠',
    science: '한국 과학',
    health: '한국 건강 의학',
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.naverClientId =
      this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.naverClientSecret =
      this.configService.get<string>('NAVER_CLIENT_SECRET') || '';
    this.naverNewsApiUrl =
      this.configService.get<string>('NAVER_NEWS_API_URL') ||
      'https://openapi.naver.com/v1/search/news.json';
  }

  async getNews(
    cursor?: string,
    limit: number = 20,
    category?: string,
    search?: string,
  ) {
    interface WhereClause {
      id?: { lt: string };
      categoryId?: string;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    }

    const where: WhereClause = {};

    if (cursor) {
      where.id = { lt: cursor };
    }

    if (category) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: category },
      });
      if (cat) {
        where.categoryId = cat.id;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const news = await this.prisma.news.findMany({
      where,
      take: limit + 1,
      orderBy: { publishedAt: 'desc' },
      include: {
        category: true,
      },
    });

    const hasMore = news.length > limit;
    const items = hasMore ? news.slice(0, -1) : news;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async getNewsById(id: string) {
    return this.prisma.news.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async getNewsByCategory(
    categorySlug: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!category) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    return this.getNews(cursor, limit, categorySlug);
  }

  async searchNews(query: string, cursor?: string, limit: number = 20) {
    return this.getNews(cursor, limit, undefined, query);
  }

  async fetchAndCacheNews(category?: string) {
    if (!this.naverClientId || !this.naverClientSecret) {
      this.logger.warn(
        'NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured',
      );
      return 0;
    }

    const normalizedCategory = (category || 'general').toLowerCase();
    const searchQuery =
      this.categoryQueryMap[normalizedCategory] ||
      `${normalizedCategory} 한국 뉴스`;

    try {
      const params: NaverNewsApiParams = {
        query: searchQuery,
        display: 100,
        start: 1,
        sort: 'date',
      };

      const response = await axios.get<NaverNewsApiResponse>(
        this.naverNewsApiUrl,
        {
          params,
          headers: {
            'X-Naver-Client-Id': this.naverClientId,
            'X-Naver-Client-Secret': this.naverClientSecret,
          },
        },
      );

      const articles: NaverNewsItem[] = Array.isArray(response.data.items)
        ? response.data.items
        : [];

      const categoryRecord = await this.prisma.category.upsert({
        where: { slug: normalizedCategory },
        update: {},
        create: {
          name:
            normalizedCategory.charAt(0).toUpperCase() +
            normalizedCategory.slice(1),
          slug: normalizedCategory,
        },
      });

      let savedCount = 0;
      for (const article of articles) {
        const url = article.originallink || article.link;
        if (!url) continue;

        const publishedAt = this.parsePublishedDate(article.pubDate);
        const title = this.normalizeText(article.title);
        const description = this.normalizeText(article.description);
        const source = this.extractSourceName(url);

        await this.prisma.news.upsert({
          where: { url },
          update: {
            title,
            description,
            content: description,
            urlToImage: null,
            publishedAt,
            source,
            author: null,
            categoryId: categoryRecord.id,
          },
          create: {
            title,
            description,
            content: description,
            url,
            urlToImage: null,
            publishedAt,
            source,
            author: null,
            categoryId: categoryRecord.id,
          },
        });

        savedCount += 1;
      }

      this.logger.log(
        `Cached ${savedCount} articles for category: ${normalizedCategory} (query: ${searchQuery})`,
      );
      return savedCount;
    } catch (error: unknown) {
      this.logger.error('Error fetching news from Naver API', error);
      return 0;
    }
  }

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  private parsePublishedDate(pubDate?: string): Date {
    if (!pubDate) {
      return new Date();
    }

    const parsed = new Date(pubDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private normalizeText(value?: string): string {
    if (!value) return '';

    const withoutTags = value.replace(/<[^>]*>/g, ' ');
    return withoutTags
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractSourceName(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Naver News';
    }
  }
}
