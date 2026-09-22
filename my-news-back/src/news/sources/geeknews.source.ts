import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Cheerio, load } from 'cheerio';
import type { AnyNode } from 'domhandler';
import {
  NewsSourceAdapter,
  NewsSourceFetchOptions,
  NormalizedArticle,
} from './news-source.interface';

const EXCERPT_MAX_LENGTH = 300;

/**
 * GeekNews (news.hada.io) adapter.
 *
 * The feed is Atom, not RSS 2.0: entries are `<entry>` elements, the link is
 * the `href` attribute of `<link rel='alternate' .../>` (not element text),
 * and `<content>` holds an HTML-in-CDATA Korean summary of the linked
 * article. The `href`/`<id>` point at the GeekNews topic page, not the
 * original article - by design we link users to the topic page and do not
 * crawl it for the original URL. `<author><name>` is the GeekNews
 * submitter, not the article's author.
 */
@Injectable()
export class GeekNewsSource implements NewsSourceAdapter {
  readonly id = 'geeknews';
  readonly displayName = 'GeekNews';
  readonly skipContentCrawl = true;

  private readonly logger = new Logger(GeekNewsSource.name);
  private readonly feedUrl: string;

  constructor(private configService: ConfigService) {
    this.feedUrl =
      this.configService.get<string>('GEEKNEWS_FEED_URL') ||
      'https://news.hada.io/rss/news';
  }

  isConfigured(): boolean {
    return Boolean(this.feedUrl);
  }

  async fetchArticles(
    options: NewsSourceFetchOptions = {},
  ): Promise<NormalizedArticle[]> {
    const response = await axios.get<string>(this.feedUrl, {
      responseType: 'text',
      timeout: 8000,
    });

    const articles = this.parseFeed(response.data);

    return typeof options.limit === 'number'
      ? articles.slice(0, options.limit)
      : articles;
  }

  parseFeed(xml: string): NormalizedArticle[] {
    const $ = load(xml, { xmlMode: true });
    const articles: NormalizedArticle[] = [];

    $('entry').each((_, entryEl) => {
      const entry = $(entryEl);
      const article = this.toNormalizedArticle(entry);
      if (article) {
        articles.push(article);
      }
    });

    return articles;
  }

  private toNormalizedArticle(
    entry: Cheerio<AnyNode>,
  ): NormalizedArticle | null {
    const title = entry.find('title').first().text().trim();
    const url = entry
      .find('link[rel="alternate"]')
      .first()
      .attr('href')
      ?.trim();

    if (!title || !url) {
      this.logger.debug('Skipping GeekNews entry with no title/link');
      return null;
    }

    const submitter = entry.find('author name').first().text().trim() || null;
    const publishedRaw =
      entry.find('published').first().text().trim() ||
      entry.find('updated').first().text().trim();
    const publishedAt = this.parsePublishedDate(publishedRaw);
    const contentHtml = entry.find('content').first().html() || '';
    const description = this.toExcerpt(contentHtml);

    return {
      title,
      description,
      url,
      publishedAt,
      source: 'GeekNews',
      author: submitter,
    };
  }

  private toExcerpt(html: string): string {
    const text = load(html)('body').text().replace(/\s+/g, ' ').trim();

    if (text.length <= EXCERPT_MAX_LENGTH) {
      return text;
    }

    return `${text.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}...`;
  }

  private parsePublishedDate(value?: string): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
