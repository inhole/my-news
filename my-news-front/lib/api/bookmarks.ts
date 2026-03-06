import apiClient from '@/lib/api-client';
import {
  BookmarksListResponse,
  Bookmark,
} from '@/types';

// ==================== 북마크 API ====================
export const bookmarkApi = {
  // 북마크 추가
  addBookmark: async (newsId: string): Promise<Bookmark> => {
    const response = await apiClient.post('/bookmarks', { newsId });
    return response.data;
  },

  // 북마크 목록 조회
  getBookmarks: async (cursor?: string, limit = 20): Promise<BookmarksListResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(`/bookmarks?${params.toString()}`);
    return response.data;
  },

  // 북마크 삭제
  removeBookmark: async (bookmarkId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/bookmarks/${bookmarkId}`);
    return response.data;
  },
};
