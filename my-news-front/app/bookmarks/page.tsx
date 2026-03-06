'use client';

import { useEffect, useRef } from 'react';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { useInfiniteBookmarks, useRemoveBookmark } from '@/hooks/use-queries';
import { NewsCard } from '@/components/news/news-card';
import { LoadingCard, LoadingSpinner } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error';
import { EmptyState } from '@/components/ui/empty';

export default function BookmarksPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteBookmarks();

  const removeBookmark = useRemoveBookmark();
  const observerRef = useRef<HTMLDivElement>(null);

  // 무한 스크롤
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

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (confirm('북마크를 삭제하시겠습니까?')) {
      try {
        await removeBookmark.mutateAsync(bookmarkId);
      } catch (error) {
        console.error('북마크 삭제 실패:', error);
        alert('북마크 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookmarkIcon className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">북마크</h1>
        </div>
        <p className="text-gray-600">저장한 뉴스를 모아보세요</p>
      </div>

      {/* 북마크 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorMessage
          title="북마크를 불러올 수 없습니다"
          message={error?.message || '다시 시도해주세요.'}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {data && data.pages[0].items.length === 0 ? (
            <EmptyState
              title="저장된 뉴스가 없습니다"
              message="관심있는 뉴스를 저장해보세요"
              icon={<BookmarkIcon className="w-12 h-12 text-gray-400 mb-4" />}
            />
          ) : (
            <div className="space-y-6">
              {data?.pages.flatMap((page) => page.items).map((bookmark) => (
                <div key={bookmark.id} className="relative group">
                  <NewsCard news={bookmark.news} />
                  <button
                    onClick={() => handleRemoveBookmark(bookmark.id)}
                    disabled={removeBookmark.isPending}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                    title="북마크 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 무한 스크롤 트리거 */}
              <div ref={observerRef} className="py-4">
                {isFetchingNextPage && <LoadingSpinner />}
              </div>

              {!hasNextPage && data && data.pages[0].items.length > 0 && (
                <p className="text-center text-sm text-gray-500 py-4">
                  모든 북마크를 확인했습니다
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
