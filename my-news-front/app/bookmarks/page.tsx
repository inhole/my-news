'use client';

import { useEffect, useRef } from 'react';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';
import { NewsCard } from '@/components/news/news-card';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingCard, LoadingSpinner } from '@/components/ui/loading';
import { useInfiniteBookmarks, useRemoveBookmark } from '@/hooks/use-queries';

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

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (!confirm('북마크를 해제할까요?')) return;

    try {
      await removeBookmark.mutateAsync(bookmarkId);
    } catch {
      alert('북마크 해제에 실패했습니다.');
    }
  };

  const allBookmarks = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4">
      <section className="toss-card section-pad">
        <div className="flex items-center gap-4">
          <div className="rounded-[20px] bg-[var(--primary-weak)] p-3">
            <BookmarkIcon className="h-6 w-6 text-[var(--primary-strong)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#6b7280]">My Archive</p>
            <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-[#111827]">북마크 뉴스</h1>
            <p className="mt-1 text-sm text-[#6b7280]">저장해 둔 기사를 다시 읽고 빠르게 관리할 수 있습니다.</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="news-list-wrap news-list-grid grid lg:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorMessage
          title="북마크를 불러오지 못했습니다"
          message={error?.message || '잠시 후 다시 시도해 주세요.'}
          onRetry={() => refetch()}
        />
      ) : allBookmarks.length === 0 ? (
        <EmptyState
          title="저장한 뉴스가 없습니다"
          message="관심 있는 뉴스를 북마크해 보세요."
          icon={<BookmarkIcon className="mb-4 h-12 w-12 text-[#9ca3af]" />}
        />
      ) : (
        <div className="news-list-wrap space-y-3">
          <div className="news-list-grid grid lg:grid-cols-2">
            {allBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="group relative">
                <NewsCard news={bookmark.news} />
                <button
                  type="button"
                  onClick={() => handleRemoveBookmark(bookmark.id)}
                  disabled={removeBookmark.isPending}
                  className="absolute bottom-5 left-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--danger)] opacity-0 shadow-[0_8px_22px_rgba(15,23,42,0.12)] ring-1 ring-[#fee2e2] transition group-hover:opacity-100 disabled:opacity-50"
                  title="북마크 해제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div ref={observerRef} className="py-4">
            {isFetchingNextPage && <LoadingSpinner />}
          </div>

          {!hasNextPage && (
            <p className="py-2 text-center text-xs text-[#9ca3af]">모든 북마크를 확인했습니다</p>
          )}
        </div>
      )}
    </div>
  );
}
