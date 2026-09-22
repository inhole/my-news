import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { PrismaService } from '../prisma/prisma.service';
import { NEWS_CATEGORY_MAP, NEWS_CATEGORY_SLUGS } from './news-categories';
import { NewsRagService } from './news-rag.service';
import { extractSourceName } from './sources/extract-source-name.util';
import { NewsSourcesRegistry } from './sources/news-sources.registry';

type CheerioNode = Cheerio<AnyNode>;

interface CrawledArticleMetadata {
  title: string | null;
  description: string | null;
  content: string | null;
  contentHtml: string | null;
  /**
   * true only when `content`/`contentHtml` came from genuine article-body
   * extraction (selectors, body tags). false when they are merely a
   * repackaged `description` fallback with no real body found.
   */
  contentExtracted: boolean;
  imageUrl: string | null;
  source: string | null;
}

interface ContentBlock {
  tag: string;
  text: string;
}

interface ExtractedContent {
  text: string | null;
  html: string | null;
  /** true when text/html came from real DOM content, not a description-only fallback. */
  extracted: boolean;
}

interface NewsCursor {
  publishedAt: Date;
  id: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CURSOR_SEPARATOR = '|';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private newsRagService: NewsRagService,
    private newsSourcesRegistry: NewsSourcesRegistry,
  ) {}

  async getNews(
    cursor?: string,
    limit: number = 20,
    category?: string,
    search?: string,
  ) {
    const andConditions: Prisma.NewsWhereInput[] = [];

    if (cursor) {
      const decodedCursor = await this.decodeCursor(cursor);
      andConditions.push({
        OR: [
          { publishedAt: { lt: decodedCursor.publishedAt } },
          {
            publishedAt: decodedCursor.publishedAt,
            id: { lt: decodedCursor.id },
          },
        ],
      });
    }

    if (category) {
      const cat = await this.prisma.category.findUnique({
        where: { slug: category },
      });
      if (cat) {
        andConditions.push({ categoryId: cat.id });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.NewsWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const news = await this.prisma.news.findMany({
      where,
      take: limit + 1,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      include: {
        category: true,
      },
    });

    const hasMore = news.length > limit;
    const items = hasMore ? news.slice(0, -1) : news;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore
      ? this.encodeCursor(lastItem.publishedAt, lastItem.id)
      : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  private encodeCursor(publishedAt: Date, id: string): string {
    return Buffer.from(
      `${publishedAt.toISOString()}${CURSOR_SEPARATOR}${id}`,
      'utf8',
    ).toString('base64url');
  }

  private async decodeCursor(cursor: string): Promise<NewsCursor> {
    const decoded = this.tryDecodeStructuredCursor(cursor);
    if (decoded) {
      return decoded;
    }

    if (UUID_PATTERN.test(cursor)) {
      const legacyNews = await this.prisma.news.findUnique({
        where: { id: cursor },
        select: { id: true, publishedAt: true },
      });

      if (legacyNews) {
        return { publishedAt: legacyNews.publishedAt, id: legacyNews.id };
      }
    }

    throw new BadRequestException('Invalid cursor');
  }

  private tryDecodeStructuredCursor(cursor: string): NewsCursor | null {
    let raw: string;
    try {
      raw = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      return null;
    }

    const separatorIndex = raw.lastIndexOf(CURSOR_SEPARATOR);
    if (separatorIndex === -1) {
      return null;
    }

    const publishedAtRaw = raw.slice(0, separatorIndex);
    const id = raw.slice(separatorIndex + 1);

    if (!ISO_DATE_PATTERN.test(publishedAtRaw) || !UUID_PATTERN.test(id)) {
      return null;
    }

    const publishedAt = new Date(publishedAtRaw);
    if (Number.isNaN(publishedAt.getTime())) {
      return null;
    }

    return { publishedAt, id };
  }

  async getNewsById(id: string) {
    return this.prisma.news.findUnique({
      where: { id },
      include: {
        category: true,
        llmSummary: true,
      },
    });
  }

  async searchNews(query: string, cursor?: string, limit: number = 20) {
    return this.getNews(cursor, limit, undefined, query);
  }

  async fetchAndCacheNews(category?: string) {
    const naverSource = this.newsSourcesRegistry.get('naver');

    if (!naverSource || !naverSource.isConfigured()) {
      this.logger.warn(
        'NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is not configured',
      );
      return 0;
    }

    const normalizedCategory = (category || 'general').toLowerCase();
    const categoryDefinition = NEWS_CATEGORY_MAP[normalizedCategory];
    const searchQuery =
      categoryDefinition?.searchQuery || `${normalizedCategory} ?쒓뎅 ?댁뒪`;

    try {
      const articles = await naverSource.fetchArticles({
        category: normalizedCategory,
        searchQuery,
      });

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
        const url = article.url;

        if (!url) {
          continue;
        }

        const publishedAt = article.publishedAt;
        const title = this.normalizeText(article.title);
        const description = this.normalizeText(article.description);
        const source = article.source;

        const existingNews = await this.prisma.news.findUnique({
          where: { url },
          select: {
            urlToImage: true,
            content: true,
            contentHtml: true,
          },
        });

        const shouldEnrich =
          !naverSource.skipContentCrawl &&
          (!existingNews ||
            !existingNews.urlToImage ||
            !existingNews.content ||
            !existingNews.contentHtml);
        const crawlCandidates =
          article.metadataCrawlUrls && article.metadataCrawlUrls.length > 0
            ? article.metadataCrawlUrls
            : [url];
        const crawledMetadata = shouldEnrich
          ? await this.fetchArticleMetadata(crawlCandidates)
          : null;

        const resolvedTitle = this.preferReadableText(
          crawledMetadata?.title,
          title,
        );
        const resolvedDescription = this.preferReadableText(
          crawledMetadata?.description,
          description,
        );
        // Only a genuinely extracted body may replace existing content; a
        // description-only fallback must not overwrite a fuller existing body.
        const genuineCrawledContent = crawledMetadata?.contentExtracted
          ? crawledMetadata.content
          : null;
        const genuineCrawledContentHtml = crawledMetadata?.contentExtracted
          ? crawledMetadata.contentHtml
          : null;

        const existingContentFallback =
          existingNews?.content || resolvedDescription || description;
        const resolvedContent = this.preferReadableText(
          genuineCrawledContent,
          existingContentFallback,
        );
        const resolvedContentHtml =
          genuineCrawledContentHtml ||
          existingNews?.contentHtml ||
          this.buildParagraphHtml(
            resolvedContent || resolvedDescription || description,
          );
        const resolvedSource = crawledMetadata?.source || source;
        const resolvedImageUrl =
          crawledMetadata?.imageUrl || existingNews?.urlToImage || null;

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
            author: article.author,
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
            author: article.author,
            categoryId: categoryRecord.id,
          },
        });

        this.newsRagService.indexNews(savedNews.id).catch((error) => {
          this.logger.warn(
            `Failed to index news embedding for ${savedNews.id}: ${String(error)}`,
          );
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

  private async fetchArticleMetadata(
    candidateUrls: string[],
  ): Promise<CrawledArticleMetadata> {
    const candidates = [...new Set(candidateUrls.filter(Boolean))];

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

    const primaryUrl = candidates[0];

    return {
      title: null,
      description: null,
      content: null,
      contentHtml: null,
      contentExtracted: false,
      imageUrl: null,
      source: primaryUrl ? extractSourceName(primaryUrl) : null,
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
        contentExtracted: false,
        imageUrl: null,
        source: extractSourceName(url),
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
      ) || extractSourceName(url);
    const contentData = this.extractArticleContent($, description);

    return {
      title: title || null,
      description: description || null,
      content: contentData.text || description || null,
      contentHtml:
        contentData.html ||
        this.buildParagraphHtml(contentData.text || description) ||
        null,
      contentExtracted: contentData.extracted,
      imageUrl,
      source,
    };
  }

  private extractArticleContent(
    $: CheerioAPI,
    fallbackDescription: string,
  ): ExtractedContent {
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

    // Last resort: no real article body was found in the DOM, so this is
    // just a repackaging of the description, not genuine extraction.
    const fallbackText =
      this.preferReadableText(fallbackDescription, '') || null;
    return {
      text: fallbackText,
      html: this.buildParagraphHtml(fallbackText),
      extracted: false,
    };
  }

  private extractContentFromContainer(
    container: CheerioNode,
    fallbackDescription: string,
  ): ExtractedContent {
    const containerHtml = container.html();

    if (!containerHtml) {
      return { text: null, html: null, extracted: false };
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
        extracted: true,
      };
    }

    return { text: null, html: null, extracted: false };
  }

  private extractContentFromElements(
    elements: CheerioNode[],
    fallbackDescription: string,
  ): ExtractedContent {
    const blocks = this.uniqueContentBlocks(
      elements
        .map((element) => this.toContentBlock(element))
        .filter((block): block is ContentBlock => Boolean(block)),
    );

    if (blocks.length === 0) {
      return { text: null, html: null, extracted: false };
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
      extracted: true,
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
      .replace(/&middot;/gi, '·')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (_, code) => {
        const parsed = Number.parseInt(code, 10);
        return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
      })
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
        const parsed = Number.parseInt(code, 16);
        return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
      })
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

    if (text.includes('占?')) {
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
      '광고',
    ].some((keyword) => normalized.includes(keyword));
  }
}
