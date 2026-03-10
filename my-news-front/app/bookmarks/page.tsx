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
      { threshold: 0.1 }
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
    <div className="mx-auto w-full max-w-[840px] space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--primary-weak)] p-2">
            <BookmarkIcon className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111827]">북마크</h1>
            <p className="text-sm text-[#6b7280]">저장한 뉴스를 모아볼 수 있습니다.</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-1.5 px-1 py-2 lg:grid-cols-2">
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
        <div className="space-y-2 px-1 py-2">
          <div className="grid gap-1.5 lg:grid-cols-2">
            {allBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="group relative">
                <NewsCard news={bookmark.news} />
                <button
                  type="button"
                  onClick={() => handleRemoveBookmark(bookmark.id)}
                  disabled={removeBookmark.isPending}
                  className="absolute bottom-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--danger)] opacity-0 shadow-sm ring-1 ring-[#fee2e2] transition group-hover:opacity-100 disabled:opacity-50"
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

          {!hasNextPage && <p className="py-2 text-center text-xs text-[#9ca3af]">모든 북마크를 확인했습니다</p>}
        </div>
      )}
    </div>
  );
}
