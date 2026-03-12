'use client';

import { useEffect, useRef } from 'react';
import { Newspaper } from 'lucide-react';
import { NewsCard } from '@/components/news/news-card';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingCard, LoadingSpinner } from '@/components/ui/loading';
import { useInfiniteNews } from '@/hooks/use-queries';

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="news-list-wrap news-list-grid grid lg:grid-cols-2">
        {[...Array(6)].map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="뉴스를 불러오지 못했습니다"
        message={error?.message || '잠시 후 다시 시도해 주세요.'}
        onRetry={() => refetch()}
      />
    );
  }

  const allNews = data?.pages.flatMap((page) => page.items) ?? [];

  if (allNews.length === 0) {
    return (
      <EmptyState
        title={search ? '검색 결과가 없습니다' : '뉴스가 없습니다'}
        message={
          search
            ? '다른 검색어로 다시 시도해 보세요.'
            : '아직 등록된 뉴스가 없습니다.'
        }
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <div className="news-list-wrap space-y-3 pb-4">
      <div className="news-list-grid grid lg:grid-cols-2">
        {allNews.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>

      <div ref={observerRef} className="py-4">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>

      {!hasNextPage && allNews.length > 0 && (
        <p className="py-2 text-center text-xs text-[#9ca3af]">모든 뉴스를 확인했습니다</p>
      )}
    </div>
  );
}
