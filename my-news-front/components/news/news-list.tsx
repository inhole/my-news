'use client';

import { useEffect, useRef } from 'react';
import { NewsCard } from '@/components/news/news-card';
import { LoadingSpinner, LoadingCard } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';
import { useInfiniteNews } from '@/hooks/use-queries';
import { Newspaper } from 'lucide-react';

interface NewsListProps {
  category?: string;
  search?: string;
}

export function NewsList({ category, search }: NewsListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteNews(category, search);

  const observerRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="뉴스를 불러올 수 없습니다"
        message={error?.message || '다시 시도해주세요.'}
        onRetry={() => refetch()}
      />
    );
  }

  const allNews = data?.pages.flatMap((page) => page.items) ?? [];

  if (allNews.length === 0) {
    return (
      <EmptyState
        title="뉴스가 없습니다"
        message="아직 등록된 뉴스가 없습니다."
        icon={<Newspaper className="w-12 h-12 text-gray-400 mb-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {allNews.map((news) => (
        <NewsCard key={news.id} news={news} />
      ))}

      {/* 무한 스크롤 트리거 */}
      <div ref={observerRef} className="py-6">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>

      {!hasNextPage && allNews.length > 0 && (
        <p className="text-center text-sm text-gray-500 py-6">
          모든 뉴스를 확인했습니다
        </p>
      )}
    </div>
  );
}
