import { Bookmark, BookmarksListResponse, News, NewsListResponse } from '@/types';

type ApiNews = {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
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

type ApiBookmark = Omit<Bookmark, 'news'> & {
  news: ApiNews;
};

export function normalizeNews(news: ApiNews): News {
  return {
    id: news.id,
    title: news.title,
    description: news.description ?? null,
    content: news.content ?? null,
    url: news.url,
    imageUrl: news.imageUrl ?? news.urlToImage ?? null,
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

export function normalizeBookmarksResponse(
  response: BookmarksListResponse & { items: ApiBookmark[] }
): BookmarksListResponse {
  return {
    ...response,
    items: response.items.map((bookmark) => ({
      ...bookmark,
      news: normalizeNews(bookmark.news),
    })),
  };
}
