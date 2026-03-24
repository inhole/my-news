import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NEWS_CATEGORY_MAP, NEWS_CATEGORY_SLUGS } from './news-categories';

type NaverSort = 'sim' | 'date';
type CheerioNode = Cheerio<AnyNode>;

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
  contentHtml: string | null;
  imageUrl: string | null;
  source: string | null;
}

interface ContentBlock {
  tag: string;
  text: string;
}

interface SummaryTarget {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  categoryName: string;
  summaryHash: string;
}

@Injectable()
export class NewsService {
  private readonly summaryBatchMaxItems = 20;
  private readonly summaryBatchMaxPromptChars = 18000;
  private readonly summaryTitleMaxChars = 120;
  private readonly summaryDescriptionMaxChars = 240;
  private readonly summaryContentMaxChars = 800;
  private readonly logger = new Logger(NewsService.name);
  private readonly naverClientId: string;
  private readonly naverClientSecret: string;
  private readonly naverNewsApiUrl: string;
  private readonly openAiApiKey: string;
  private readonly openAiModel: string;

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
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.openAiModel =
      this.configService.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini';
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
      items: items.map((item) => ({
        ...item,
        summary: this.buildShortSummary(
          item.summaryLines,
          item.description,
          item.content,
        ),
      })),
      nextCursor,
      hasMore,
    };
  }

  async getNewsById(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!news) {
      return null;
    }

    return {
      ...news,
      summary: this.buildShortSummary(
        news.summaryLines,
        news.description,
        news.content,
      ),
    };
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
      const summaryTargets: SummaryTarget[] = [];

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
            id: true,
            urlToImage: true,
            content: true,
            contentHtml: true,
            summaryHash: true,
            summaryLines: true,
          },
        });

        const shouldEnrich =
          !existingNews ||
          !existingNews.urlToImage ||
          !existingNews.content ||
          !existingNews.contentHtml;
        const crawledMetadata = shouldEnrich
          ? await this.fetchArticleMetadata(originalUrl, fallbackUrl)
          : null;

        const resolvedTitle = this.preferReadableText(
          crawledMetadata?.title,
          title,
        );
        const resolvedDescription = this.preferReadableText(
          crawledMetadata?.description,
          description,
        );
        const resolvedContent = this.preferReadableText(
          crawledMetadata?.content,
          resolvedDescription || description,
        );
        const resolvedContentHtml =
          crawledMetadata?.contentHtml ||
          this.buildParagraphHtml(
            resolvedContent || resolvedDescription || description,
          );
        const resolvedSource = crawledMetadata?.source || source;
        const resolvedImageUrl =
          crawledMetadata?.imageUrl || existingNews?.urlToImage || null;
        const nextSummaryHash = this.buildSummaryHash({
          title: resolvedTitle,
          description: resolvedDescription,
          content: resolvedContent,
          categoryName: categoryRecord.name,
        });

        const savedNews = await this.prisma.news.upsert({
          where: { url },
          update: {
            title: resolvedTitle,
            description: resolvedDescription,
            content: resolvedContent,
            contentHtml: resolvedContentHtml,
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
            contentHtml: resolvedContentHtml,
            url,
            urlToImage: resolvedImageUrl,
            publishedAt,
            source: resolvedSource,
            author: null,
            categoryId: categoryRecord.id,
          },
          select: {
            id: true,
          },
        });

        if (
          !existingNews ||
          existingNews.summaryHash !== nextSummaryHash ||
          !existingNews.summaryLines?.length
        ) {
          summaryTargets.push({
            id: savedNews.id,
            title: resolvedTitle,
            description: resolvedDescription,
            content: resolvedContent,
            categoryName: categoryRecord.name,
            summaryHash: nextSummaryHash,
          });
        }

        savedCount += 1;
      }

      if (summaryTargets.length > 0) {
        await this.generateAndStoreSummaries(summaryTargets);
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

  private buildSummaryHash(input: {
    title: string;
    description?: string | null;
    content?: string | null;
    categoryName?: string | null;
  }) {
    return createHash('sha256')
      .update(
        JSON.stringify({
          title: this.normalizeText(input.title),
          description: this.normalizeText(input.description || ''),
          content: this.normalizeText(input.content || ''),
          categoryName: this.normalizeText(input.categoryName || ''),
        }),
      )
      .digest('hex');
  }

  private buildShortSummary(
    summaryLines?: string[] | null,
    description?: string | null,
    content?: string | null,
  ) {
    const candidate = Array.isArray(summaryLines)
      ? summaryLines
          .map((line) => this.normalizeText(line))
          .filter(Boolean)
          .join(' ')
      : '';

    const fallback =
      this.normalizeText(description || '') || this.normalizeText(content || '');
    const merged = candidate || fallback;

    if (!merged) {
      return null;
    }

    return merged.slice(0, 120);
  }

  private async generateAndStoreSummaries(targets: SummaryTarget[]) {
    if (targets.length === 0) {
      return new Map<string, string[]>();
    }

    const batches = this.buildSummaryRequestBatches(targets);
    const storedSummaries = new Map<string, string[]>();

    for (const batch of batches) {
      const summaries = await this.summarizeShortBatch(batch);

      await Promise.all(
        batch.map(async (target) => {
          const lines =
            summaries.get(target.id) ?? this.buildShortFallbackSummary(target);

          storedSummaries.set(target.id, lines);

          await this.prisma.news.update({
            where: { id: target.id },
            data: {
              summaryLines: lines,
              summaryHash: target.summaryHash,
            },
          });
        }),
      );
    }

    return storedSummaries;
  }

  private buildSummaryRequestBatches(targets: SummaryTarget[]) {
    const batches: SummaryTarget[][] = [];
    let currentBatch: SummaryTarget[] = [];
    let currentSize = 0;

    for (const target of targets) {
      const estimatedSize = this.estimateSummaryTargetSize(target);
      const wouldExceedItemLimit =
        currentBatch.length >= this.summaryBatchMaxItems;
      const wouldExceedPromptLimit =
        currentBatch.length > 0 &&
        currentSize + estimatedSize > this.summaryBatchMaxPromptChars;

      if (wouldExceedItemLimit || wouldExceedPromptLimit) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }

      currentBatch.push(target);
      currentSize += estimatedSize;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  private estimateSummaryTargetSize(target: SummaryTarget) {
    return (
      this.truncateSummaryField(target.title, this.summaryTitleMaxChars).length +
      this.truncateSummaryField(
        target.description || '',
        this.summaryDescriptionMaxChars,
      ).length +
      this.truncateSummaryField(
        target.content || '',
        this.summaryContentMaxChars,
      ).length +
      120
    );
  }

  private async summarizeShortBatch(targets: SummaryTarget[]) {
    if (!this.openAiApiKey) {
      return new Map<string, string[]>();
    }

    const compactTargets = targets.map((target) => ({
      ...target,
      title: this.truncateSummaryField(target.title, this.summaryTitleMaxChars),
      description: this.truncateSummaryField(
        target.description || '',
        this.summaryDescriptionMaxChars,
      ),
      content: this.truncateSummaryField(
        target.content || '',
        this.summaryContentMaxChars,
      ),
    }));

    const prompt = [
      '아래 뉴스 여러 건에 대해 한국어 120자 이내 요약을 JSON으로 반환해 주세요.',
      '각 기사마다 summary 필드에 하나의 자연스러운 문장 또는 짧은 문단으로만 작성해 주세요.',
      '핵심 내용만 유지하고 군더더기는 빼 주세요.',
      '출력은 JSON 배열만 반환해 주세요.',
      '형식: [{"id":"기사ID","summary":"120자 이내 요약"}]',
      '',
      ...compactTargets.map((target, index) =>
        [
          `기사 ${index + 1}`,
          `id: ${target.id}`,
          `카테고리: ${this.normalizeText(target.categoryName)}`,
          `제목: ${this.normalizeText(target.title)}`,
          `설명: ${this.normalizeText(target.description || '')}`,
          `본문: ${this.normalizeText(target.content || '')}`,
          '',
        ].join('\n'),
      ),
    ].join('\n');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openAiModel,
          temperature: 0.2,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Summary batch request failed with status ${response.status}: ${errorText}`,
        );
        return new Map<string, string[]>();
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return new Map<string, string[]>();
      }

      const parsed = JSON.parse(content) as Array<{
        id?: string;
        summary?: string;
      }>;

      return new Map(
        parsed
          .filter(
            (item): item is { id: string; summary: string } =>
              Boolean(item?.id) && typeof item.summary === 'string',
          )
          .map((item) => [
            item.id,
            [this.normalizeText(item.summary).slice(0, 120)].filter(Boolean),
          ]),
      );
    } catch (error) {
      this.logger.warn(`Summary batch generation failed: ${String(error)}`);
      return new Map<string, string[]>();
    }
  }

  private buildShortFallbackSummary(target: SummaryTarget) {
    const description = this.normalizeText(target.description || '');
    const content = this.normalizeText(target.content || '');
    const sentences = [description, ...content.split(/\n{2,}|(?<=[.!?])\s+/)]
      .map((sentence) => this.normalizeText(sentence))
      .filter(Boolean);

    return [
      (
        sentences[0] ||
        `${target.categoryName} 기사: ${this.normalizeText(target.title)}`
      ).slice(0, 120),
    ];
  }

  private truncateSummaryField(value: string, maxLength: number) {
    const normalized = this.normalizeText(value);
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return normalized.slice(0, maxLength);
  }

  private async summarizeBatch(targets: SummaryTarget[]) {
    if (!this.openAiApiKey) {
      return new Map<string, string[]>();
    }

    const prompt = [
      '아래 뉴스 여러 건에 대해 한국어 3줄 요약을 JSON으로 반환해 주세요.',
      '각 기사마다 lines는 반드시 3개의 짧은 문장으로 작성해 주세요.',
      '출력은 JSON 배열만 반환해 주세요.',
      '형식: [{"id":"기사ID","lines":["줄1","줄2","줄3"]}]',
      '',
      ...targets.map((target, index) =>
        [
          `기사 ${index + 1}`,
          `id: ${target.id}`,
          `카테고리: ${this.normalizeText(target.categoryName)}`,
          `제목: ${this.normalizeText(target.title)}`,
          `설명: ${this.normalizeText(target.description || '')}`,
          `본문: ${this.normalizeText(target.content || '')}`,
          '',
        ].join('\n'),
      ),
    ].join('\n');

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: this.openAiModel,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Summary batch request failed with status ${response.status}`,
        );
        return new Map<string, string[]>();
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return new Map<string, string[]>();
      }

      const parsed = JSON.parse(content) as Array<{
        id?: string;
        lines?: string[];
      }>;
      return new Map(
        parsed
          .filter(
            (item): item is { id: string; lines: string[] } =>
              Boolean(item?.id) &&
              Array.isArray(item?.lines) &&
              item.lines.length >= 3,
          )
          .map((item) => [
            item.id,
            item.lines
              .slice(0, 3)
              .map((line) => this.normalizeText(line))
              .filter(Boolean),
          ]),
      );
    } catch (error) {
      this.logger.warn(`Summary batch generation failed: ${String(error)}`);
      return new Map<string, string[]>();
    }
  }

  private buildFallbackSummary(target: SummaryTarget) {
    const description = this.normalizeText(target.description || '');
    const content = this.normalizeText(target.content || '');
    const sentences = [description, ...content.split(/\n{2,}|(?<=[.!?])\s+/)]
      .map((sentence) => this.normalizeText(sentence))
      .filter(Boolean);

    return [
      `${target.categoryName} 핵심: ${this.normalizeText(target.title)}`.slice(
        0,
        120,
      ),
      (sentences[0] || '핵심 내용을 정리 중입니다.').slice(0, 120),
      (sentences[1] || '본문 분석이 끝나면 추가 요약을 제공합니다.').slice(
        0,
        120,
      ),
    ];
  }

  private chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
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
          metadata.contentHtml ||
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
      contentHtml: null,
      imageUrl: null,
      source: primaryUrl ? this.extractSourceName(primaryUrl) : null,
    };
  }

  private async fetchArticleMetadataFromUrl(
    url: string,
  ): Promise<CrawledArticleMetadata> {
    const response = await axios.get<ArrayBuffer>(url, {
      timeout: 8000,
      maxRedirects: 5,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      },
    });

    const html = this.decodeHtmlResponse(
      response.data,
      response.headers['content-type'],
    );
    if (!html) {
      return {
        title: null,
        description: null,
        content: null,
        contentHtml: null,
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
    const contentData = this.extractArticleContent($, description);

    return {
      title: title || null,
      description: description || null,
      content: contentData.text || description || null,
      contentHtml:
        contentData.html ||
        this.buildParagraphHtml(contentData.text || description) ||
        null,
      imageUrl,
      source,
    };
  }

  private extractArticleContent(
    $: CheerioAPI,
    fallbackDescription: string,
  ): { text: string | null; html: string | null } {
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

      const contentData = this.extractContentFromContainer(
        container,
        fallbackDescription,
      );

      if (contentData.text || contentData.html) {
        return contentData;
      }
    }

    const bodyContentData = this.extractContentFromElements(
      $('body p, body h1, body h2, body h3, body h4, body li, body blockquote')
        .toArray()
        .map((element) => $(element)),
      fallbackDescription,
    );

    if (bodyContentData.text || bodyContentData.html) {
      return bodyContentData;
    }

    const fallbackText =
      this.preferReadableText(fallbackDescription, '') || null;
    return {
      text: fallbackText,
      html: this.buildParagraphHtml(fallbackText),
    };
  }

  private extractContentFromContainer(
    container: CheerioNode,
    fallbackDescription: string,
  ): { text: string | null; html: string | null } {
    const containerHtml = container.html();

    if (!containerHtml) {
      return { text: null, html: null };
    }

    const containerApi = load(`<article>${containerHtml}</article>`);
    const clonedContainer = containerApi('article').first();

    clonedContainer
      .find(
        'script, style, iframe, form, button, input, .reporter_area, .media_end_head_journalist, .copyright, .copyright_text, .link_news, .promotion, .related, .ad, .advertisement, .subscribe',
      )
      .remove();

    const richContent = this.extractContentFromElements(
      clonedContainer
        .find('p, h1, h2, h3, h4, li, blockquote')
        .toArray()
        .map((element) => containerApi(element)),
      fallbackDescription,
    );

    if (richContent.text || richContent.html) {
      return richContent;
    }

    const fallbackText = this.normalizeText(clonedContainer.text());
    if (fallbackText.length > 120) {
      const text = this.preferReadableText(fallbackText, fallbackDescription);
      return {
        text,
        html: this.buildParagraphHtml(text),
      };
    }

    return { text: null, html: null };
  }

  private extractContentFromElements(
    elements: CheerioNode[],
    fallbackDescription: string,
  ): { text: string | null; html: string | null } {
    const blocks = this.uniqueContentBlocks(
      elements
        .map((element) => this.toContentBlock(element))
        .filter((block): block is ContentBlock => Boolean(block)),
    );

    if (blocks.length === 0) {
      return { text: null, html: null };
    }

    const text = this.preferReadableText(
      blocks.map((block) => block.text).join('\n\n'),
      fallbackDescription,
    );

    return {
      text,
      html: blocks
        .map((block) => this.renderContentBlock(block.tag, block.text))
        .join(''),
    };
  }

  private toContentBlock(element: CheerioNode): ContentBlock | null {
    const node = element.get(0) as Element | undefined;
    const tagName = (node?.tagName || 'p').toLowerCase();
    const normalizedTag = ['h1', 'h2', 'h3', 'h4', 'li', 'blockquote'].includes(
      tagName,
    )
      ? tagName
      : 'p';
    const text = this.normalizeText(element.text());

    if (text.length < 20) {
      return null;
    }

    if (this.isLikelyBoilerplateText(text)) {
      return null;
    }

    return {
      tag: normalizedTag,
      text,
    };
  }

  private uniqueContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
    const seen = new Set<string>();

    return blocks.filter((block) => {
      if (seen.has(block.text)) {
        return false;
      }

      seen.add(block.text);
      return true;
    });
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

  private renderContentBlock(tag: string, text: string): string {
    const escapedText = this.escapeHtml(text).replace(/\n/g, '<br />');

    if (tag === 'blockquote') {
      return `<blockquote><p>${escapedText}</p></blockquote>`;
    }

    if (tag.startsWith('h')) {
      return `<${tag}>${escapedText}</${tag}>`;
    }

    return `<p>${escapedText}</p>`;
  }

  private buildParagraphHtml(text?: string | null): string | null {
    if (!text) {
      return null;
    }

    const paragraphs = this.uniqueParagraphs(
      text
        .split(/\n{2,}/)
        .map((paragraph) => this.normalizeText(paragraph))
        .filter(Boolean),
    );

    if (paragraphs.length === 0) {
      return null;
    }

    return paragraphs
      .map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`)
      .join('');
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

  private decodeHtmlResponse(
    responseData: ArrayBuffer,
    contentType?: string,
  ): string {
    const buffer = Buffer.from(responseData);
    if (buffer.length === 0) {
      return '';
    }

    const asciiHead = buffer
      .subarray(0, Math.min(buffer.length, 2048))
      .toString('ascii');
    const charset =
      this.extractCharset(contentType) ||
      this.extractCharset(asciiHead) ||
      'utf-8';

    try {
      return new TextDecoder(charset).decode(buffer);
    } catch {
      try {
        return new TextDecoder('utf-8').decode(buffer);
      } catch {
        return buffer.toString('utf8');
      }
    }
  }

  private extractCharset(value?: string): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/charset\s*=\s*["']?\s*([^"';\s>]+)/i);
    if (!match?.[1]) {
      return null;
    }

    return match[1].trim().toLowerCase();
  }

  private normalizeText(value?: string): string {
    if (!value) return '';

    const withLineBreaks = value
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n');
    const withoutTags = withLineBreaks.replace(/<[^>]*>/g, ' ');

    return withoutTags
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private preferReadableText(
    primary?: string | null,
    fallback?: string,
  ): string {
    const normalizedPrimary = this.normalizeText(primary || '');
    const normalizedFallback = this.normalizeText(fallback || '');

    if (
      normalizedPrimary &&
      !this.isLikelyCorruptedText(normalizedPrimary) &&
      normalizedPrimary.length >=
        Math.min(10, Math.max(1, normalizedFallback.length))
    ) {
      return normalizedPrimary;
    }

    return normalizedFallback || normalizedPrimary;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  private isLikelyBoilerplateText(text: string): boolean {
    const normalized = text.replace(/\s+/g, ' ').trim();

    return [
      '무단 전재 및 재배포 금지',
      '저작권자',
      '기사제보',
      '기자',
      '구독',
      '좋아요',
      '댓글',
    ].some((keyword) => normalized.includes(keyword));
  }

  private extractSourceName(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'Naver News';
    }
  }
}
