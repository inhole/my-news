import apiClient from '@/lib/api-client';
import { normalizeCommunityNewsListResponse } from '@/lib/api/community-news-normalizer';
import { CommunityNewsListResponse } from '@/types';

export const communityNewsApi = {
  getCommunityNews: async (
    cursor?: string,
    limit = 20,
  ): Promise<CommunityNewsListResponse> => {
    const params = new URLSearchParams();

    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get(`/news/community?${params.toString()}`);
    return normalizeCommunityNewsListResponse(response.data);
  },
};
