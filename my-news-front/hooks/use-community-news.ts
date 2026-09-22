'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { communityNewsApi } from '@/lib/api';

export function useInfiniteCommunityNews(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['news', 'community'],
    queryFn: ({ pageParam }) => communityNewsApi.getCommunityNews(pageParam, 20),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled,
  });
}
