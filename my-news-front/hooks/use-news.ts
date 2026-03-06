'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newsApi } from '@/lib/api';

// 뉴스 무한 스크롤 (전체 또는 검색)
export function useInfiniteNews(category?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['news', category, search],
    queryFn: ({ pageParam }) => newsApi.getNews(pageParam, 20, category, search),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });
}

// 카테고리별 뉴스 무한 스크롤
export function useInfiniteNewsByCategory(categorySlug: string) {
  return useInfiniteQuery({
    queryKey: ['news', 'category', categorySlug],
    queryFn: ({ pageParam }) => newsApi.getNewsByCategory(categorySlug, pageParam, 20),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!categorySlug,
  });
}

// 뉴스 검색 무한 스크롤
export function useInfiniteSearchNews(keyword: string) {
  return useInfiniteQuery({
    queryKey: ['news', 'search', keyword],
    queryFn: ({ pageParam }) => newsApi.searchNews(keyword, pageParam, 20),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!keyword,
  });
}

// 뉴스 상세
export function useNewsDetail(id: string) {
  return useQuery({
    queryKey: ['news', id],
    queryFn: () => newsApi.getNewsById(id),
    enabled: !!id,
  });
}

// 카테고리 목록
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: newsApi.getCategories,
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

// 뉴스 가져오기 (관리자용)
export function useFetchNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category?: string) => newsApi.fetchNews(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
