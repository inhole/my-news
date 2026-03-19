'use client';

import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock, Flame, Newspaper } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { WeatherWidget } from '@/components/layout/weather-widget';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingSpinner } from '@/components/ui/loading';
import { useInfiniteNews } from '@/hooks/use-queries';
import { getAnonymousProfile } from '@/lib/personalization/anonymous-profile';
import {
  rankPersonalizedNews,
  type PersonalizedNewsItem,
} from '@/lib/personalization/personalized-feed';
import { trackNewsInterest } from '@/lib/personalization/signal-tracker';
import type { News } from '@/types';

type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

interface TrendingKeyword {
  keyword: string;
  count: number;
  article: News;
}

interface RankedTrendingNews extends News {
  rank: number;
  keyword?: string;
}

const PERSONALIZED_PAGE_SIZE = 8;

function formatRelativeTime(dateString: string) {
  const publishedAt = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - publishedAt.getTime();
  const minutes = Math.max(1, Math.floor(diff / (1000 * 60)));

  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return publishedAt.toLocaleDateString('ko-KR');
}

function FallbackThumb({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-end bg-[linear-gradient(145deg,#dce9ff_0%,#bdd5ff_100%)] p-4">
      <p className="line-clamp-2 text-sm font-semibold leading-6 text-[#1f2937]">{title}</p>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="space-y-4">
      <div className="toss-card section-pad-sm">
        {[...Array(5)].map((_, index) => (
          <div key={index} className={`flex gap-4 py-4 ${index < 4 ? 'border-b border-[var(--line)]' : ''}`}>
            <div className="h-24 w-24 shrink-0 rounded-[22px] bg-[#edf2f7]" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-20 rounded-full bg-[#eaf3ff]" />
              <div className="h-4 w-full rounded-full bg-[#edf2f7]" />
              <div className="h-4 w-3/4 rounded-full bg-[#edf2f7]" />
              <div className="h-3 w-24 rounded-full bg-[#edf2f7]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-2">
      <div>
        {eyebrow ? (
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{eyebrow}</p>
        ) : null}
        <h2 className={`${eyebrow ? 'mt-1' : ''} text-xl font-bold tracking-[-0.02em] text-[var(--text)]`}>
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary-strong)] transition hover:bg-[var(--primary-weak)]"
        >
          <span>{linkLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function CompactNewsList({
  articles,
  personalized = false,
  ranked = false,
}: {
  articles: Array<News | PersonalizedNewsItem | RankedTrendingNews>;
  personalized?: boolean;
  ranked?: boolean;
}) {
  return (
    <div className="space-y-2">
      {articles.map((article) => {
        const personalizedArticle = article as PersonalizedNewsItem;
        const rankedArticle = article as RankedTrendingNews;

        return (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, personalized ? 2 : 1)}
            className="item-inner-pad flex items-start gap-3 rounded-[24px] transition hover:bg-[var(--surface-soft)]"
          >
            {ranked ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-weak)] text-sm font-bold text-[var(--primary-strong)]">
                {rankedArticle.rank}
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{article.category.name}</p>
                {ranked && rankedArticle.keyword ? (
                  <span className="rounded-full bg-[#fff3e8] px-2 py-0.5 text-[11px] font-semibold text-[#d97706]">
                    {rankedArticle.keyword}
                  </span>
                ) : null}
                {personalized && personalizedArticle.matchedKeywords?.[0] ? (
                  <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] text-[#4b5563]">
                    #{personalizedArticle.matchedKeywords[0]}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 line-clamp-2 text-[18px] font-bold leading-7 tracking-[-0.02em] text-[var(--text)]">
                {article.title}
              </h3>
              {personalized && personalizedArticle.summaryLines?.length ? (
                <div className="mt-2 space-y-1">
                  {personalizedArticle.summaryLines.slice(0, 3).map((line, index) => (
                    <p key={`${article.id}-${index}`} className="line-clamp-1 text-[13px] leading-5 text-[#5b6573]">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-[#6b7280]">
                <span className="truncate">{article.source}</span>
                <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                <Clock className="h-3.5 w-3.5" />
                <span>{formatRelativeTime(article.publishedAt)}</span>
              </div>
            </div>

            <div className="home-compact-thumb relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#e5edf8]">
              {article.imageUrl ? (
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 96px"
                  className="object-cover"
                />
              ) : (
                <FallbackThumb title={article.title} />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HeadlineSection({ articles }: { articles: News[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="헤드라인이 아직 없습니다"
        message="수집된 뉴스가 쌓이면 주요 헤드라인 5개를 먼저 보여드립니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="toss-card section-pad-sm">
      <SectionHeader title="헤드라인" href="/news" linkLabel="뉴스 보기" />
      <CompactNewsList articles={articles} />
    </section>
  );
}

function TrendingTopSection({ articles }: { articles: RankedTrendingNews[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="실검 뉴스가 아직 없습니다"
        message="수집된 뉴스 제목과 설명을 분석해 많이 언급된 이슈 중심으로 뉴스를 정리해 보여드립니다."
        icon={<Flame className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="toss-card section-pad-sm">
      <SectionHeader title="실검 뉴스" href="/news" linkLabel="뉴스 보기" />
      <CompactNewsList articles={articles} ranked />
    </section>
  );
}

function PersonalizedSection({
  articles,
  isLoadingMore,
  sentinelRef,
}: {
  articles: PersonalizedNewsItem[];
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="맞춤 뉴스가 아직 부족합니다"
        message="뉴스를 읽기 시작하면 관심 카테고리와 키워드를 반영해 추천 정확도가 높아집니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="toss-card section-pad-sm">
      <SectionHeader eyebrow="My Interest Feed" title="맞춤 뉴스 리스트" href="/news" linkLabel="뉴스 보기" />
      <CompactNewsList articles={articles} personalized />
      <div ref={sentinelRef} className="min-h-8 pt-4">
        {isLoadingMore ? <LoadingSpinner size="small" /> : null}
      </div>
    </section>
  );
}

function tokenizeForTrending(text: string) {
  const stopwords = new Set([
    '오늘',
    '이번',
    '관련',
    '기자',
    '뉴스',
    '정부',
    '시장',
    '오전',
    '대한민국',
    '속보',
    '단독',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2 && !stopwords.has(keyword));
}

function buildTrendingKeywords(articles: News[]): TrendingKeyword[] {
  const counter = new Map<string, { count: number; article: News }>();

  for (const article of articles) {
    const keywords = Array.from(new Set(tokenizeForTrending(`${article.title} ${article.description ?? ''}`)));

    for (const keyword of keywords.slice(0, 8)) {
      const current = counter.get(keyword);
      if (current) {
        current.count += 1;
      } else {
        counter.set(keyword, { count: 1, article });
      }
    }
  }

  return Array.from(counter.entries())
    .map(([keyword, value]) => ({
      keyword,
      count: value.count,
      article: value.article,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildTopTenTrendingNews(articles: News[], keywords: TrendingKeyword[]): RankedTrendingNews[] {
  const scoreMap = new Map<string, { article: News; score: number; keyword?: string }>();

  articles.slice(0, 10).forEach((article, index) => {
    scoreMap.set(article.id, {
      article,
      score: 100 - index * 8,
    });
  });

  keywords.forEach((item, index) => {
    const current = scoreMap.get(item.article.id);
    const keywordScore = item.count * 10 + Math.max(0, 20 - index);

    if (current) {
      current.score += keywordScore;
      if (!current.keyword) {
        current.keyword = item.keyword;
      }
      return;
    }

    scoreMap.set(item.article.id, {
      article: item.article,
      score: keywordScore,
      keyword: item.keyword,
    });
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    })
    .slice(0, 10)
    .map((item, index) => ({
      ...item.article,
      rank: index + 1,
      keyword: item.keyword ? `#${item.keyword}` : undefined,
    }));
}

function subscribeProfile(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener('focus', handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('focus', handler);
  };
}

function getProfileSnapshot() {
  return getAnonymousProfile();
}

function HomeContent() {
  const searchParams = useSearchParams();
  const selectedTab = (searchParams.get('tab') as HomeTab) || 'weather';
  const [personalizedVisibleCount, setPersonalizedVisibleCount] = useState(PERSONALIZED_PAGE_SIZE);
  const [isLoadingMorePersonalized, setIsLoadingMorePersonalized] = useState(false);
  const personalizedSentinelRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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
                '요약을 준비하고 있습니다.',
                '관심 카테고리와 키워드를 반영해 정렬했습니다.',
                '본문 분석이 끝나면 핵심 3줄을 표시합니다.',
              ],
      })),
    [articles, profile],
  );
  const visiblePersonalizedArticles = useMemo(
    () => personalizedArticles.slice(0, personalizedVisibleCount),
    [personalizedArticles, personalizedVisibleCount],
  );
  const canLoadMorePersonalized =
    personalizedVisibleCount < personalizedArticles.length || Boolean(hasNextPage);

  useEffect(() => {
    setPersonalizedVisibleCount(PERSONALIZED_PAGE_SIZE);
  }, [profile?.updatedAt]);

  useEffect(() => {
    const sentinel = personalizedSentinelRef.current;
    if (!sentinel || selectedTab !== 'personalized' || !canLoadMorePersonalized) {
      return;
    }

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMorePersonalized || isFetchingNextPage) {
          return;
        }

        setIsLoadingMorePersonalized(true);

        try {
          if (personalizedVisibleCount >= personalizedArticles.length && hasNextPage) {
            await fetchNextPage();
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
    isLoadingMorePersonalized,
    personalizedArticles.length,
    personalizedVisibleCount,
    selectedTab,
  ]);

  if (isLoading) {
    return <HomeLoading />;
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

  if (articles.length === 0) {
    return (
      <EmptyState
        title="표시할 뉴스가 없습니다"
        message="뉴스 수집이 완료되면 날씨, 헤드라인, 실검, 맞춤 뉴스를 보여드립니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {selectedTab === 'weather' ? <WeatherWidget /> : null}
      {selectedTab === 'headline' ? <HeadlineSection articles={headlineArticles} /> : null}
      {selectedTab === 'trending' ? <TrendingTopSection articles={trendingTopArticles} /> : null}
      {selectedTab === 'personalized' ? (
        <PersonalizedSection
          articles={visiblePersonalizedArticles}
          isLoadingMore={isLoadingMorePersonalized || isFetchingNextPage}
          sentinelRef={personalizedSentinelRef}
        />
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
