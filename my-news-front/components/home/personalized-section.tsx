import type { RefObject } from 'react';
import { Sparkles } from 'lucide-react';
import { EditorialList } from '@/components/home/editorial-list';
import { SectionHeader } from '@/components/home/section-header';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingSpinner } from '@/components/ui/loading';
import type { PersonalizedNewsItem } from '@/lib/personalization/personalized-feed';

export function PersonalizedSection({
  articles,
  isLoadingMore,
  isSearchingForMatches,
  loadMoreError,
  hasPreferredCategoryFilter,
  onRetryLoadMore,
  sentinelRef,
}: {
  articles: PersonalizedNewsItem[];
  isLoadingMore: boolean;
  isSearchingForMatches: boolean;
  loadMoreError: Error | null;
  hasPreferredCategoryFilter: boolean;
  onRetryLoadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  if (articles.length === 0) {
    if (loadMoreError) {
      return (
        <ErrorMessage
          title="맞춤 뉴스를 더 불러오지 못했습니다"
          message={loadMoreError.message || '잠시 후 다시 시도해 주세요.'}
          onRetry={onRetryLoadMore}
        />
      );
    }

    if (isSearchingForMatches) {
      return (
        <div className="toss-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <LoadingSpinner size="small" />
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
            관심 카테고리에 맞는 기사를 더 찾는 중입니다.
          </p>
        </div>
      );
    }

    if (hasPreferredCategoryFilter) {
      return (
        <EmptyState
          title="선호 카테고리와 일치하는 기사를 찾지 못했습니다"
          message="현재 수집된 기사 중에는 선택한 카테고리와 맞는 기사가 없습니다. 카테고리 설정을 바꾸거나 잠시 후 다시 확인해 주세요."
          icon={<Sparkles className="mb-4 h-12 w-12 text-[var(--muted)]" />}
        />
      );
    }

    return (
      <EmptyState
        title="개인화할 반응이 아직 부족합니다"
        message="기사를 읽기 시작하면 관심 카테고리와 키워드 반응을 반영해 추천 정확도를 높입니다."
        icon={<Sparkles className="mb-4 h-12 w-12 text-[var(--muted)]" />}
      />
    );
  }

  return (
    <section className="home-section-surface reveal-up">
      <SectionHeader
        eyebrow="For You"
        title="맞춤 뉴스 리스트"
        description="읽은 기사와 관심 키워드 반응을 기준으로 다시 선별했습니다."
        href="/news"
        linkLabel="전체 보기"
      />
      <div className="mt-6">
        <EditorialList variant="personalized" articles={articles} />
      </div>
      <div ref={sentinelRef} className="flex h-12 flex-col items-center justify-center gap-2 pt-4 text-center">
        {loadMoreError ? (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              {loadMoreError.message || '기사를 더 불러오지 못했습니다.'}
            </p>
            <button
              type="button"
              onClick={onRetryLoadMore}
              className="text-sm font-semibold text-[var(--primary-strong)] underline underline-offset-2"
            >
              다시 시도
            </button>
          </>
        ) : isLoadingMore ? (
          <LoadingSpinner size="small" />
        ) : null}
      </div>
    </section>
  );
}
