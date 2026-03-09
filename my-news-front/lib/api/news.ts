import apiClient from '@/lib/api-client';
import {
  normalizeNews,
  normalizeNewsListResponse,
} from '@/lib/api/news-normalizer';
import { Category, News, NewsListResponse } from '@/types';

export const newsApi = {
  getNews: async (
    cursor?: string,
    limit = 20,
    category?: string,
    search?: string,
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams();

    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const response = await apiClient.get(`/news?${params.toString()}`);
    return normalizeNewsListResponse(response.data);
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/news/categories');
    return response.data;
  },

  searchNews: async (
    keyword: string,
    cursor?: string,
    limit = 20,
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams({
      search: keyword,
      limit: limit.toString(),
    });

    if (cursor) params.append('cursor', cursor);

    const response = await apiClient.get(`/news/search?${params.toString()}`);
    return normalizeNewsListResponse(response.data);
  },

  getNewsById: async (id: string): Promise<News> => {
    const response = await apiClient.get(`/news/${id}`);
    return normalizeNews(response.data);
  },

  fetchNews: async (
    category?: string,
  ): Promise<{ message: string; count?: number }> => {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.post(`/news/fetch${params}`);
    return response.data;
  },
};
