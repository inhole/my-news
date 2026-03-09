import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CheerioAPI, load } from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';
import { NEWS_CATEGORY_MAP, NEWS_CATEGORY_SLUGS } from './news-categories';

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

interface CrawledArticleMetadata {
  title: string | null;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  source: string | null;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly naverClientId: string;
  private readonly naverClientSecret: string;
  private readonly naverNewsApiUrl: string;

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
    const categoryDefinition = NEWS_CATEGORY_MAP[normalizedCategory];
    const searchQuery =
      categoryDefinition?.searchQuery || `${normalizedCategory} 한국 뉴스`;

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
        update: categoryDefinition
          ? {
              name: categoryDefinition.name,
              description: categoryDefinition.description,
            }
          : {},
        create: {
          name: categoryDefinition?.name || normalizedCategory,
          slug: normalizedCategory,
          description: categoryDefinition?.description,
        },
      });

      let savedCount = 0;

      for (const article of articles) {
        const originalUrl = article.originallink;
        const fallbackUrl = article.link;
        const url = originalUrl || fallbackUrl;

        if (!url) {
          continue;
        }

        const publishedAt = this.parsePublishedDate(article.pubDate);
        const title = this.normalizeText(article.title);
        const description = this.normalizeText(article.description);
        const source = this.extractSourceName(url);

        const existingNews = await this.prisma.news.findUnique({
          where: { url },
          select: {
            urlToImage: true,
            content: true,
          },
        });

        const shouldEnrich =
          !existingNews || !existingNews.urlToImage || !existingNews.content;
        const crawledMetadata = shouldEnrich
          ? await this.fetchArticleMetadata(originalUrl, fallbackUrl)
          : null;

        const resolvedTitle = this.preferReadableText(crawledMetadata?.title, title);
        const resolvedDescription = this.preferReadableText(
          crawledMetadata?.description,
          description,
        );
        const resolvedContent = this.preferReadableText(
          crawledMetadata?.content,
          resolvedDescription || description,
        );
        const resolvedSource = crawledMetadata?.source || source;
        const resolvedImageUrl =
          crawledMetadata?.imageUrl || existingNews?.urlToImage || null;

        await this.prisma.news.upsert({
          where: { url },
          update: {
            title: resolvedTitle,
            description: resolvedDescription,
            content: resolvedContent,
            urlToImage: resolvedImageUrl,
            publishedAt,
            source: resolvedSource,
            author: null,
            categoryId: categoryRecord.id,
          },
          create: {
            title: resolvedTitle,
            description: resolvedDescription,
            content: resolvedContent,
            url,
            urlToImage: resolvedImageUrl,
            publishedAt,
            source: resolvedSource,
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
    const categories = await this.prisma.category.findMany();
    const sortOrder = new Map(
      NEWS_CATEGORY_SLUGS.map((slug, index) => [slug, index]),
    );

    return categories.sort((a, b) => {
      const aOrder = sortOrder.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = sortOrder.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.name.localeCompare(b.name, 'ko');
    });
  }

  private parsePublishedDate(pubDate?: string): Date {
    if (!pubDate) {
      return new Date();
    }

    const parsed = new Date(pubDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private async fetchArticleMetadata(
    primaryUrl?: string,
    fallbackUrl?: string,
  ): Promise<CrawledArticleMetadata> {
    const candidates = [...new Set([primaryUrl, fallbackUrl].filter(Boolean))];

    for (const candidateUrl of candidates) {
      if (!candidateUrl) {
        continue;
      }

      try {
        const metadata = await this.fetchArticleMetadataFromUrl(candidateUrl);

        if (
          metadata.imageUrl ||
          metadata.content ||
          metadata.description ||
          metadata.title
        ) {
          return metadata;
        }
      } catch (error) {
        this.logger.debug(
          `Failed to crawl article metadata from ${candidateUrl}: ${String(error)}`,
        );
      }
    }

    return {
      title: null,
      description: null,
      content: null,
      imageUrl: null,
      source: primaryUrl ? this.extractSourceName(primaryUrl) : null,
    };
  }

  private async fetchArticleMetadataFromUrl(
    url: string,
  ): Promise<CrawledArticleMetadata> {
    const response = await axios.get<string>(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
    });

    const html = typeof response.data === 'string' ? response.data : '';
    if (!html) {
      return {
        title: null,
        description: null,
        content: null,
        imageUrl: null,
        source: this.extractSourceName(url),
      };
    }

    const $ = load(html);

    const title = this.normalizeText(
      this.readMetaContent($, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title',
      ]) || '',
    );
    const description = this.normalizeText(
      this.readMetaContent($, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
      ]) || '',
    );
    const imageUrl = this.resolveUrl(
      url,
      this.readMetaContent($, [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[itemprop="image"]',
      ]),
    );
    const source =
      this.normalizeText(
        this.readMetaContent($, [
          'meta[property="og:site_name"]',
          'meta[name="application-name"]',
        ]) || '',
      ) || this.extractSourceName(url);
    const content = this.extractArticleContent($, description);

    return {
      title: title || null,
      description: description || null,
      content: content || description || null,
      imageUrl,
      source,
    };
  }

  private extractArticleContent(
    $: CheerioAPI,
    fallbackDescription: string,
  ): string | null {
    const selectors = [
      '[itemprop="articleBody"]',
      'article',
      '#dic_area',
      '.newsct_article',
      '.article_view',
      '.article-body',
      '.story-news',
      'main',
    ];

    for (const selector of selectors) {
      const container = $(selector).first();
      if (!container.length) {
        continue;
      }

      const paragraphs = container
        .find('p')
        .toArray()
        .map((element) => this.normalizeText($(element).text()))
        .filter((text) => text.length > 30);

      const mergedParagraphs = this.uniqueParagraphs(paragraphs);
      if (mergedParagraphs.length > 0) {
        return this.preferReadableText(
          mergedParagraphs.join('\n\n'),
          fallbackDescription,
        ).slice(0, 5000);
      }

      const fallbackText = this.normalizeText(container.text());
      if (fallbackText.length > 120) {
        return this.preferReadableText(fallbackText, fallbackDescription).slice(
          0,
          5000,
        );
      }
    }

    const bodyParagraphs = this.uniqueParagraphs(
      $('body p')
        .toArray()
        .map((element) => this.normalizeText($(element).text()))
        .filter((text) => text.length > 30),
    );

    if (bodyParagraphs.length > 0) {
      return this.preferReadableText(
        bodyParagraphs.join('\n\n'),
        fallbackDescription,
      ).slice(0, 5000);
    }

    return this.preferReadableText(fallbackDescription, '') || null;
  }

  private uniqueParagraphs(paragraphs: string[]): string[] {
    const seen = new Set<string>();

    return paragraphs.filter((paragraph) => {
      if (seen.has(paragraph)) {
        return false;
      }
      seen.add(paragraph);
      return true;
    });
  }

  private readMetaContent($: CheerioAPI, selectors: string[]): string | null {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (!element.length) {
        continue;
      }

      const content = element.attr('content') || element.text();
      if (content?.trim()) {
        return content.trim();
      }
    }

    return null;
  }

  private resolveUrl(
    baseUrl: string,
    targetUrl?: string | null,
  ): string | null {
    if (!targetUrl) {
      return null;
    }

    try {
      return new URL(targetUrl, baseUrl).toString();
    } catch {
      return null;
    }
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

  private preferReadableText(primary?: string | null, fallback?: string): string {
    const normalizedPrimary = this.normalizeText(primary || '');
    const normalizedFallback = this.normalizeText(fallback || '');

    if (
      normalizedPrimary &&
      !this.isLikelyCorruptedText(normalizedPrimary) &&
      normalizedPrimary.length >= Math.min(10, Math.max(1, normalizedFallback.length))
    ) {
      return normalizedPrimary;
    }

    return normalizedFallback || normalizedPrimary;
  }

  private isLikelyCorruptedText(text: string): boolean {
    if (!text) {
      return false;
    }

    if (text.includes('�')) {
      return true;
    }

    const latinSupplementCount = (text.match(/[\u00C0-\u024F]/g) || []).length;
    const hangulCount = (text.match(/[가-힣]/g) || []).length;

    if (hangulCount === 0 && latinSupplementCount >= 3) {
      return true;
    }

    if (latinSupplementCount >= 6 && latinSupplementCount > hangulCount * 2) {
      return true;
    }

    return false;
  }

  private extractSourceName(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Naver News';
    }
  }
}
