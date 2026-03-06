import type { News } from './news';

// Bookmark
export interface Bookmark {
  id: string;
  userId: string;
  newsId: string;
  createdAt: string;
  news: News;
}

export interface BookmarksListResponse {
  items: Bookmark[];
  nextCursor: string | null;
  hasMore: boolean;
}
