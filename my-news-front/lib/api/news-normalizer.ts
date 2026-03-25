import { News, NewsListResponse } from '@/types';

type ApiNews = {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
  contentHtml?: string | null;
  summary?: string | null;
  summaryLines?: string[];
  url: string;
  imageUrl?: string | null;
  urlToImage?: string | null;
  publishedAt: string;
  source: string;
  categoryId: string;
  category: News['category'];
  createdAt?: string;
};

type ApiNewsListResponse = {
  items: ApiNews[];
  nextCursor: string | null;
  hasMore: boolean;
};

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  middot: '·',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntities(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/&([a-z]+);/gi, (match, entity) => {
      const normalizedEntity = entity.toLowerCase();
      return NAMED_HTML_ENTITIES[normalizedEntity] ?? match;
    })
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeImageUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeSummary(summary?: string | null, summaryLines?: string[]): string | null {
  const normalizedSummary = summary?.trim();
  if (normalizedSummary) {
    return normalizedSummary.slice(0, 120);
  }

  if (!Array.isArray(summaryLines) || summaryLines.length === 0) {
    return null;
  }

  const joined = summaryLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  return joined ? joined.slice(0, 120) : null;
}

export function normalizeNews(news: ApiNews): News {
  return {
    id: news.id,
    title: decodeHtmlEntities(news.title) ?? news.title,
    description: decodeHtmlEntities(news.description),
    content: news.content ?? null,
    contentHtml: news.contentHtml ?? null,
    summary: normalizeSummary(news.summary, news.summaryLines),
    summaryLines: Array.isArray(news.summaryLines) ? news.summaryLines : [],
    url: news.url,
    imageUrl: normalizeImageUrl(news.imageUrl ?? news.urlToImage),
    publishedAt: news.publishedAt,
    source: news.source,
    categoryId: news.categoryId,
    category: news.category,
    createdAt: news.createdAt,
  };
}

export function normalizeNewsListResponse(response: ApiNewsListResponse): NewsListResponse {
  return {
    ...response,
    items: response.items.map(normalizeNews),
  };
}
