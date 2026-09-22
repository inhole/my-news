/**
 * A single article normalized into the shape `news.service` persists,
 * regardless of which upstream source produced it.
 */
export interface NormalizedArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: string;
  author: string | null;
  urlToImage?: string | null;
  /**
   * Community-source signals (e.g. Hacker News score, GeekNews-style vote
   * counts). Carried through for a later stage to persist; ignored by the
   * current persistence layer since the DB has no columns for them yet.
   */
  externalScore?: number | null;
  externalCommentCount?: number | null;
  /**
   * Candidate URLs (priority order) to try when crawling the article page
   * for body/metadata enrichment. Defaults to `[url]` when omitted. Sources
   * whose adapter sets `skipContentCrawl` never use this.
   */
  metadataCrawlUrls?: string[];
}

/** Options passed to an adapter's fetch call. */
export interface NewsSourceFetchOptions {
  category?: string;
  searchQuery?: string;
  /** Optional cap on how many articles to fetch, for sources that support it. */
  limit?: number;
}

/**
 * A pluggable news source. Each adapter knows how to talk to one upstream
 * API/feed and normalize its response; everything else (dedupe, category
 * assignment, article-body crawling, logging) stays in `news.service`.
 */
export interface NewsSourceAdapter {
  readonly id: string;
  readonly displayName: string;
  /**
   * When true, `news.service` must not run the Naver-press-article body
   * crawler against this source's articles.
   */
  readonly skipContentCrawl: boolean;

  /** Whether this adapter has everything it needs (API keys, etc.) to run. */
  isConfigured(): boolean;

  fetchArticles(options: NewsSourceFetchOptions): Promise<NormalizedArticle[]>;
}
