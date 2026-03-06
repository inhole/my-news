import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly newsApiKey: string;
  private readonly newsApiUrl = 'https://newsapi.org/v2';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.newsApiKey = this.configService.get<string>('NEWS_API_KEY') || '';
  }

  async getNews(cursor?: string, limit: number = 20, category?: string, search?: string) {
    // Build query
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

  async getNewsByCategory(categorySlug: string, cursor?: string, limit: number = 20) {
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

  // Fetch and cache news from external API
  async fetchAndCacheNews(category?: string) {
    try {
      interface NewsApiParams {
        apiKey: string;
        pageSize: number;
        country: string;
        category?: string;
      }

      const params: NewsApiParams = {
        apiKey: this.newsApiKey,
        pageSize: 100,
        country: 'kr', // 한국 뉴스
      };

      if (category) {
        params.category = category;
      } else {
        params.category = 'general';
      }

      const response = await axios.get(`${this.newsApiUrl}/top-headlines`, {
        params,
      });

      if (response.data.status === 'ok') {
        const articles = response.data.articles;

        // Find or create category
        let categoryRecord: { id: string } | null = null;
        if (category) {
          categoryRecord = await this.prisma.category.upsert({
            where: { slug: category },
            update: {},
            create: {
              name: category.charAt(0).toUpperCase() + category.slice(1),
              slug: category,
            },
          });
        }

        // Cache articles to database
        for (const article of articles) {
          if (!article.url) continue;

          await this.prisma.news.upsert({
            where: { url: article.url },
            update: {
              title: article.title,
              description: article.description,
              content: article.content,
              urlToImage: article.urlToImage,
              publishedAt: new Date(article.publishedAt),
              source: article.source?.name || 'Unknown',
              author: article.author,
            },
            create: {
              title: article.title,
              description: article.description,
              content: article.content,
              url: article.url,
              urlToImage: article.urlToImage,
              publishedAt: new Date(article.publishedAt),
              source: article.source?.name || 'Unknown',
              author: article.author,
              categoryId: categoryRecord?.id,
            },
          });
        }

        this.logger.log(`Cached ${articles.length} articles for category: ${category || 'general'}`);
        return articles.length;
      }

      return 0;
    } catch (error) {
      this.logger.error('Error fetching news from API', error);
      return 0;
    }
  }

  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
