'use client';

import { useEffect, useRef } from 'react';
import { ArrowBigUp, Clock, Code2, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingSpinner } from '@/components/ui/loading';
import { useMounted } from '@/hooks/use-mounted';
import { useInfiniteCommunityNews } from '@/hooks/use-queries';
import { formatRelativeTime, formatShortDateLabel } from '@/lib/format/date';
import type { CommunityNews } from '@/types';

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function CommunityNewsRow({ item, mounted }: { item: CommunityNews; mounted: boolean }) {
  const domain = getDomain(item.url);
  const hasStats = item.externalScore !== null || item.externalCommentCount !== null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1.5 py-3"
    >
      <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[var(--text)]">
        {item.title}
      </h3>

      {item.description ? (
        <p className="line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)]">
          {item.description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]">
        <span className="font-semibold text-[var(--primary-strong)]">{item.source}</span>
        {domain ? (
          <>
            <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
            <span className="min-w-0 truncate">{domain}</span>
          </>
        ) : null}
        <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
        <Clock className="h-3.5 w-3.5" />
        <span>{mounted ? formatRelativeTime(item.publishedAt) : formatShortDateLabel(item.publishedAt)}</span>

        {hasStats ? (
          <>
            <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
            {item.externalScore !== null ? (
              <span className="inline-flex items-center gap-0.5">
                <ArrowBigUp className="h-3.5 w-3.5" />
                {item.externalScore}
              </span>
            ) : null}
            {item.externalCommentCount !== null ? (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {item.externalCommentCount}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </a>
  );
}

export function CommunityNewsList() {
  const mounted = useMounted();
  const observerRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteCommunityNews();
  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        // 앱은 body가 아니라 #app-scroll-container가 스크롤되므로
        // 홈 무한 스크롤(home-content.tsx)과 같은 root/rootMargin을 쓴다.
        root: document.getElementById('app-scroll-container'),
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.1,
      },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  if (isError) {
    return (
      <ErrorMessage
        title="개발자 뉴스를 불러오지 못했습니다"
        message={error?.message || '잠시 후 다시 시도해 주세요.'}
        onRetry={() => refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="아직 수집된 글이 없습니다"
        message="GeekNews와 Hacker News 글은 배치 수집 이후 이곳에 표시됩니다."
        icon={<Code2 className="mb-4 h-12 w-12 text-[var(--muted)]" />}
      />
    );
  }

  return (
    <div className="pb-4">
      <div className="toss-card section-pad divide-y divide-[var(--line)]">
        {items.map((item) => (
          <CommunityNewsRow key={item.id} item={item} mounted={mounted} />
        ))}
      </div>

      <div ref={observerRef} className="py-4">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>

      {!hasNextPage && items.length > 0 && (
        <p className="py-2 text-center text-xs text-[var(--muted)]">모든 글을 확인했습니다</p>
      )}
    </div>
  );
}
