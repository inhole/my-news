import type { Category } from './category';

export interface News {
  id: string;
  title: string;
  description: string | null;
  content?: string | null;
  contentHtml?: string | null;
  summary?: string | null;
  summaryLines?: string[];
  llmSummary?: NewsSummary | null;
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

export interface NewsSummary {
  id: string;
  newsId?: string;
  summary: string;
  summaryLines?: string[];
  model?: string;
  cached?: boolean;
}
