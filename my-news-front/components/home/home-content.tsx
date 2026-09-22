'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import { HeadlineSection } from '@/components/home/headline-section';
import { HomeLoading } from '@/components/home/home-loading';
import { OverviewTab } from '@/components/home/overview-tab';
import { PersonalizedSection } from '@/components/home/personalized-section';
import { TrendingTopSection } from '@/components/home/trending-top-section';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { useInfiniteNews } from '@/hooks/use-queries';
import { resolveHomeTab, type HomeTab } from '@/lib/navigation/home-tabs';
import { buildTopTenTrendingNews, buildTrendingKeywords } from '@/lib/news/trending';
import {
  getAnonymousProfile,
  PROFILE_UPDATED_EVENT,
} from '@/lib/personalization/anonymous-profile';
import { rankPersonalizedNews, type PersonalizedNewsItem } from '@/lib/personalization/personalized-feed';
import { shouldAutoFetchNextPersonalizedPage } from '@/lib/personalization/personalized-pagination';

const PERSONALIZED_PAGE_SIZE = 8;

function subscribeProfile(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener('focus', handler);
  window.addEventListener(PROFILE_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('focus', handler);
    window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
  };
}

function getProfileSnapshot() {
  return getAnonymousProfile();
}

export function HomeContent() {
  const searchParams = useSearchParams();
  const selectedTab: HomeTab = resolveHomeTab(searchParams.get('tab'));
  const [personalizedVisibleCount, setPersonalizedVisibleCount] = useState(PERSONALIZED_PAGE_SIZE);
  const [isLoadingMorePersonalized, setIsLoadingMorePersonalized] = useState(false);
  const [orderedPersonalizedArticles, setOrderedPersonalizedArticles] = useState<PersonalizedNewsItem[]>([]);
  const personalizedSentinelRef = useRef<HTMLDivElement>(null);
  const previousProfileUpdatedAtRef = useRef<string | undefined>(undefined);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteNews();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, () => null);

  const articles = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const headlineArticles = useMemo(() => articles.slice(0, 5), [articles]);
  const trendingKeywords = useMemo(() => buildTrendingKeywords(articles), [articles]);
  const trendingTopArticles = useMemo(
    () => buildTopTenTrendingNews(articles, trendingKeywords),
    [articles, trendingKeywords],
  );
  const personalizedArticles = useMemo(
    () =>
      rankPersonalizedNews(articles, profile).map((article) => ({
        ...article,
        summaryLines:
          article.summaryLines && article.summaryLines.length > 0
            ? article.summaryLines
            : [
                '요약 데이터를 준비하는 중입니다.',
                '관심 카테고리와 키워드 반응을 우선 반영했습니다.',
                '본문 분석이 완료되면 핵심 문장을 함께 제공합니다.',
              ],
      })),
    [articles, profile],
  );
  useEffect(() => {
    setOrderedPersonalizedArticles((current) => {
      if (current.length === 0 || current.length > personalizedArticles.length) {
        return personalizedArticles;
      }

      const nextById = new Map(personalizedArticles.map((article) => [article.id, article]));
      const preservedIds = current.map((article) => article.id).filter((id) => nextById.has(id));
      const preservedIdSet = new Set(preservedIds);
      const appendedArticles = personalizedArticles.filter((article) => !preservedIdSet.has(article.id));

      return [...preservedIds.map((id) => nextById.get(id)!), ...appendedArticles];
    });
  }, [personalizedArticles]);
  const visiblePersonalizedArticles = useMemo(
    () => orderedPersonalizedArticles.slice(0, personalizedVisibleCount),
    [orderedPersonalizedArticles, personalizedVisibleCount],
  );
  const canLoadMorePersonalized =
    personalizedVisibleCount < orderedPersonalizedArticles.length || Boolean(hasNextPage);

  useEffect(() => {
    if (previousProfileUpdatedAtRef.current === profile?.updatedAt) {
      return;
    }

    previousProfileUpdatedAtRef.current = profile?.updatedAt;
    setPersonalizedVisibleCount(PERSONALIZED_PAGE_SIZE);
    setOrderedPersonalizedArticles(personalizedArticles);
  }, [personalizedArticles, profile?.updatedAt]);

  useEffect(() => {
    const sentinel = personalizedSentinelRef.current;
    if (!sentinel || selectedTab !== 'personalized' || !canLoadMorePersonalized) {
      return;
    }

    const observer = new IntersectionObserver(
      async (entries) => {
        if (
          !entries[0]?.isIntersecting ||
          isLoadingMorePersonalized ||
          isFetchingNextPage ||
          isFetchNextPageError
        ) {
          return;
        }

        setIsLoadingMorePersonalized(true);

        try {
          if (personalizedVisibleCount >= orderedPersonalizedArticles.length && hasNextPage) {
            const result = await fetchNextPage();
            if (result.isError) {
              return;
            }
          }

          setPersonalizedVisibleCount((current) => current + PERSONALIZED_PAGE_SIZE);
        } finally {
          setIsLoadingMorePersonalized(false);
        }
      },
      {
        root: document.getElementById('app-scroll-container'),
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    canLoadMorePersonalized,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isLoadingMorePersonalized,
    orderedPersonalizedArticles.length,
    personalizedVisibleCount,
    selectedTab,
  ]);

  useEffect(() => {
    const shouldAutoFetch = shouldAutoFetchNextPersonalizedPage({
      isPersonalizedTabSelected: selectedTab === 'personalized',
      filteredArticleCount: orderedPersonalizedArticles.length,
      hasNextPage: Boolean(hasNextPage),
      isFetchingNextPage,
      isLoadingMorePersonalized,
      isFetchNextPageError,
    });

    if (!shouldAutoFetch) {
      return;
    }

    fetchNextPage();
  }, [
    selectedTab,
    orderedPersonalizedArticles.length,
    hasNextPage,
    isFetchingNextPage,
    isLoadingMorePersonalized,
    isFetchNextPageError,
    fetchNextPage,
  ]);

  const isSearchingPersonalizedMatches =
    visiblePersonalizedArticles.length === 0 &&
    (isFetchingNextPage || isLoadingMorePersonalized) &&
    !isFetchNextPageError;
  const personalizedLoadMoreError = isFetchNextPageError ? error : null;
  const hasPreferredCategoryFilter = (profile?.preferredCategorySlugs.length ?? 0) > 0;

  if (isLoading) {
    return <HomeLoading />;
  }

  if (isError && !isFetchNextPageError) {
    return (
      <ErrorMessage
        title="뉴스를 불러오지 못했습니다"
        message={error?.message || '잠시 후 다시 시도해 주세요.'}
        onRetry={() => refetch()}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        title="표시할 뉴스가 없습니다"
        message="뉴스 수집이 완료되면 오늘의 흐름과 맞춤 추천을 여기서 확인할 수 있습니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[var(--muted)]" />}
      />
    );
  }

  return (
    <div className="min-w-0 home-page-stack">
      {selectedTab === 'weather' ? (
        <OverviewTab
          articles={articles}
          headlineArticles={headlineArticles}
          trendingKeywords={trendingKeywords}
          trendingTopArticles={trendingTopArticles}
          personalizedArticles={visiblePersonalizedArticles}
          personalizedTotalCount={orderedPersonalizedArticles.length}
          profile={profile}
        />
      ) : null}
      {selectedTab === 'headline' ? <HeadlineSection articles={headlineArticles} /> : null}
      {selectedTab === 'trending' ? <TrendingTopSection articles={trendingTopArticles} /> : null}
      {selectedTab === 'personalized' ? (
        <PersonalizedSection
          articles={visiblePersonalizedArticles}
          isLoadingMore={isLoadingMorePersonalized || isFetchingNextPage}
          isSearchingForMatches={isSearchingPersonalizedMatches}
          loadMoreError={personalizedLoadMoreError}
          hasPreferredCategoryFilter={hasPreferredCategoryFilter}
          onRetryLoadMore={() => fetchNextPage()}
          sentinelRef={personalizedSentinelRef}
        />
      ) : null}
    </div>
  );
}
