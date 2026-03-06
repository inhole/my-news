import apiClient from '@/lib/api-client';
import {
  NewsListResponse,
  News,
  Category,
} from '@/types';

// ==================== 뉴스 API ====================
export const newsApi = {
  // 뉴스 목록 조회 (페이지네이션)
  getNews: async (
    cursor?: string,
    limit = 20,
    category?: string,
    search?: string
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const response = await apiClient.get(`/news?${params.toString()}`);
    return response.data;
  },

  // 카테고리 목록 조회
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/news/categories');
    return response.data;
  },

  // 뉴스 검색
  searchNews: async (
    keyword: string,
    cursor?: string,
    limit = 20
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams({
      search: keyword,
      limit: limit.toString(),
    });
    if (cursor) params.append('cursor', cursor);

    const response = await apiClient.get(`/news/search?${params.toString()}`);
    return response.data;
  },

  // 카테고리별 뉴스 조회
  getNewsByCategory: async (
    categorySlug: string,
    cursor?: string,
    limit = 20
  ): Promise<NewsListResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(
      `/news/category/${categorySlug}?${params.toString()}`
    );
    return response.data;
  },

  // 뉴스 상세 조회
  getNewsById: async (id: string): Promise<News> => {
    const response = await apiClient.get(`/news/${id}`);
    return response.data;
  },

  // 외부 API에서 뉴스 가져오기 (관리자용)
  fetchNews: async (category?: string): Promise<{ message: string; count?: number }> => {
    const params = category ? `?category=${category}` : '';
    const response = await apiClient.post(`/news/fetch${params}`);
    return response.data;
  },
};
