import type { Category } from './category';

// News
export interface News {
  id: string;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  categoryId: string;
  category: Category;
  createdAt?: string;
}

export interface NewsListResponse {
  items: News[];
  nextCursor: string | null;
  hasMore: boolean;
}
