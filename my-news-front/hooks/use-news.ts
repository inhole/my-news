'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { newsApi } from '@/lib/api';
import type { NewsSummary } from '@/types';

export function useInfiniteNews(category?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['news', category, search],
    queryFn: ({ pageParam }) => newsApi.getNews(pageParam, 20, category, search),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useInfiniteSearchNews(keyword: string) {
  return useInfiniteQuery({
    queryKey: ['news', 'search', keyword],
    queryFn: ({ pageParam }) => newsApi.searchNews(keyword, pageParam, 20),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!keyword,
  });
}

export function useNewsDetail(id: string) {
  return useQuery({
    queryKey: ['news', id],
    queryFn: () => newsApi.getNewsById(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: newsApi.getCategories,
    staleTime: 1000 * 60 * 60,
  });
}

export function useFetchNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category?: string) => newsApi.fetchNews(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}

export function useSummarizeNews(id: string) {
  const queryClient = useQueryClient();

  return useMutation<NewsSummary, Error, boolean>({
    mutationFn: (refresh = false) => newsApi.summarizeNews(id, refresh),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news', id] });
    },
  });
}
