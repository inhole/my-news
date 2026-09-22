import { CommunityNews, CommunityNewsListResponse } from '@/types';

/**
 * `GET /news/community`가 그대로 내려주는 raw `News` row 형태.
 * 카테고리 관계를 include하지 않으므로 `category` 필드 자체가 없고 `categoryId`는 null이다.
 * 이 타입은 `lib/api/news-normalizer.ts`의 `ApiNews`와 의도적으로 분리되어 있다.
 */
type ApiCommunityNews = {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
  contentHtml?: string | null;
  url: string;
  urlToImage?: string | null;
  publishedAt: string;
  source: string;
  author?: string | null;
  categoryId: string | null;
  sourceType?: string;
  externalScore?: number | null;
  externalCommentCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiCommunityNewsListResponse = {
  items: ApiCommunityNews[];
  nextCursor: string | null;
  hasMore: boolean;
};

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

export function normalizeCommunityNews(news: ApiCommunityNews): CommunityNews {
  return {
    id: news.id,
    title: news.title,
    description: news.description,
    url: news.url,
    imageUrl: normalizeImageUrl(news.urlToImage),
    publishedAt: news.publishedAt,
    source: news.source,
    author: news.author ?? null,
    externalScore: news.externalScore ?? null,
    externalCommentCount: news.externalCommentCount ?? null,
    createdAt: news.createdAt,
  };
}

export function normalizeCommunityNewsListResponse(
  response: ApiCommunityNewsListResponse,
): CommunityNewsListResponse {
  return {
    ...response,
    items: response.items.map(normalizeCommunityNews),
  };
}
