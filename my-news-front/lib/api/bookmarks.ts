import apiClient from '@/lib/api-client';
import { normalizeBookmarksResponse } from '@/lib/api/news-normalizer';
import { BookmarksListResponse, Bookmark } from '@/types';

export const bookmarkApi = {
  addBookmark: async (newsId: string): Promise<Bookmark> => {
    const response = await apiClient.post('/bookmarks', { newsId });
    return response.data;
  },

  getBookmarks: async (
    cursor?: string,
    limit = 20,
  ): Promise<BookmarksListResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(`/bookmarks?${params.toString()}`);
    return normalizeBookmarksResponse(response.data);
  },

  removeBookmark: async (bookmarkId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/bookmarks/${bookmarkId}`);
    return response.data;
  },
};
