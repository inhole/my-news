'use client';

import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, Flame, Newspaper, Sparkles, TrendingUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingSpinner } from '@/components/ui/loading';
import { NewsThumbnail } from '@/components/news/news-thumbnail';
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

function formatPublishedLabel(dateString: string) {
  return new Date(dateString).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HomeLoading() {
  return (
    <div className="home-overview-stack">
      <div className="home-hero-skeleton animate-pulse" />
      <div className="home-brief-grid">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="home-brief-card animate-pulse">
            <div className="h-3 w-16 rounded-full bg-[#dce8f9]" />
            <div className="mt-4 h-6 w-24 rounded-full bg-[#eaf1fb]" />
            <div className="mt-3 h-4 w-full rounded-full bg-[#edf2f7]" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-[#edf2f7]" />
          </div>
        ))}
      </div>
      <div className="home-section-surface animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div key={index} className={`editorial-list-row ${index < 3 ? 'border-b border-[var(--line)]' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="h-3 w-20 rounded-full bg-[#dce8f9]" />
              <div className="mt-3 h-5 w-full rounded-full bg-[#edf2f7]" />
              <div className="mt-2 h-5 w-4/5 rounded-full bg-[#edf2f7]" />
            </div>
            <div className="h-24 w-24 rounded-[24px] bg-[#edf2f7]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="home-eyebrow">{eyebrow}</p> : null}
        <h2 className="home-section-title">{title}</h2>
        {description ? <p className="home-section-description">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link href={href} className="home-inline-link">
          <span>{linkLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function EditorialList({
  articles,
  personalized = false,
  ranked = false,
  limit,
}: {
  articles: Array<News | PersonalizedNewsItem | RankedTrendingNews>;
  personalized?: boolean;
  ranked?: boolean;
  limit?: number;
}) {
  const visibleArticles = typeof limit === 'number' ? articles.slice(0, limit) : articles;

  return (
    <div className="editorial-list">
      {visibleArticles.map((article) => {
        const personalizedArticle = article as PersonalizedNewsItem;
        const rankedArticle = article as RankedTrendingNews;

        return (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, personalized ? 2 : 1)}
            className={`editorial-list-row ${personalized ? 'editorial-list-row-personalized' : ''}`}
          >
            <div className={`editorial-body min-w-0 flex-1 ${personalized ? 'editorial-body-personalized' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                {ranked ? <span className="editorial-rank">{rankedArticle.rank}</span> : null}
                <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{article.category.name}</p>
                {ranked && rankedArticle.keyword ? <span className="editorial-chip">{rankedArticle.keyword}</span> : null}
                {personalized && personalizedArticle.matchedKeywords?.[0] ? (
                  <span className="editorial-chip">#{personalizedArticle.matchedKeywords[0]}</span>
                ) : null}
              </div>

              <h3
                className={`editorial-title mt-2 text-[20px] font-bold tracking-[-0.03em] text-[var(--text)] ${
                  personalized ? 'editorial-title-personalized' : ''
                }`}
              >
                {article.title}
              </h3>

              {article.description ? (
                <p
                  className={`editorial-summary mt-3 text-sm text-[#5b6573] ${
                    personalized ? 'editorial-summary-personalized' : ''
                  }`}
                >
                  {article.description}
                </p>
              ) : null}

              <div
                className={`editorial-meta mt-4 flex min-w-0 items-center gap-2 text-xs text-[#6b7280] ${
                  personalized ? 'editorial-meta-personalized' : ''
                }`}
              >
                <span className="truncate">{article.source}</span>
                <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                <Clock className="h-3.5 w-3.5" />
                <span>{formatRelativeTime(article.publishedAt)}</span>
              </div>
            </div>

            {!personalized ? (
              <div className="editorial-thumb relative">
                <NewsThumbnail
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  sizes="(max-width: 479px) 114px, (max-width: 719px) 140px, 177px"
                />
              </div>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function LeadStoryHero({
  article,
  trendingKeywords,
  interestKeywords,
}: {
  article: News;
  trendingKeywords: TrendingKeyword[];
  interestKeywords: string[];
}) {
  const heroKeywords = [...trendingKeywords.slice(0, 2).map((item) => `#${item.keyword}`), ...interestKeywords.slice(0, 1)].slice(
    0,
    3,
  );

  return (
    <section className="home-hero reveal-up">
      <div className="home-hero-media">
        <NewsThumbnail
          src={article.imageUrl}
          alt={article.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          fallbackClassName="absolute inset-0 object-cover"
        />
      </div>

      <div className="home-hero-overlay" />

      <div className="home-hero-content">
        <p className="home-hero-brand">My News</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="home-hero-pill">{article.category.name}</span>
          <span className="home-hero-pill home-hero-pill-muted">오늘의 리드 스토리</span>
          {heroKeywords.map((keyword) => (
            <span key={keyword} className="home-hero-pill home-hero-pill-muted">
              {keyword}
            </span>
          ))}
        </div>

        <h1 className="home-hero-title">{article.title}</h1>
        <p className="home-hero-copy">
          지금 가장 먼저 봐야 할 흐름을 메인 기사로 올리고, 헤드라인과 관심사 기반 추천을 같은 화면에서 바로
          이어서 탐색할 수 있게 정리했습니다.
        </p>

        <div className="home-hero-meta">
          <span>{article.source}</span>
          <span className="h-1 w-1 rounded-full bg-white/55" />
          <span>{formatPublishedLabel(article.publishedAt)}</span>
        </div>

        <div className="home-hero-actions">
          <Link
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, 2)}
            className="home-hero-action home-hero-action-primary"
          >
            기사 읽기
          </Link>
          <Link href="/news" className="home-hero-action home-hero-action-secondary">
            전체 뉴스 보기
          </Link>
        </div>
      </div>
    </section>
  );
}

function BriefStrip({
  headlineCount,
  trendingKeywords,
  personalizedArticles,
}: {
  headlineCount: number;
  trendingKeywords: TrendingKeyword[];
  personalizedArticles: PersonalizedNewsItem[];
}) {
  return (
    <section className="home-brief-grid reveal-up" style={{ animationDelay: '120ms' }}>
      <article className="home-brief-card">
        <p className="home-eyebrow">Headlines</p>
        <div className="mt-5 flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-[var(--primary-strong)]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">{headlineCount}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5b6573]">지금 확인할 주요 기사 묶음을 한 화면에서 바로 훑을 수 있습니다.</p>
      </article>

      <article className="home-brief-card">
        <p className="home-eyebrow">Trending</p>
        <div className="mt-5 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-[#d97706]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">
            {trendingKeywords.length > 0 ? `${trendingKeywords[0].count}x` : '-'}
          </p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5b6573]">
          {trendingKeywords.length > 0
            ? `가장 많이 반복된 키워드는 ${trendingKeywords[0].keyword}입니다.`
            : '충분한 기사 수집 후 실시간 이슈를 정리합니다.'}
        </p>
      </article>

      <article className="home-brief-card">
        <p className="home-eyebrow">For You</p>
        <div className="mt-5 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[#1b64da]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">{personalizedArticles.length}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#5b6573]">
          최근 본 기사와 관심 카테고리를 반영해 익명 개인화 순서로 다시 정렬합니다.
        </p>
      </article>
    </section>
  );
}

function OverviewTab({
  articles,
  headlineArticles,
  trendingKeywords,
  trendingTopArticles,
  personalizedArticles,
}: {
  articles: News[];
  headlineArticles: News[];
  trendingKeywords: TrendingKeyword[];
  trendingTopArticles: RankedTrendingNews[];
  personalizedArticles: PersonalizedNewsItem[];
}) {
  const heroArticle = headlineArticles[0] ?? articles[0];
  const interestKeywords = useMemo(
    () =>
      Object.entries(getAnonymousProfile()?.keywordScores ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword]) => `#${keyword}`),
    [],
  );

  if (!heroArticle) {
    return null;
  }

  return (
    <div className="home-overview-stack">
      <LeadStoryHero article={heroArticle} trendingKeywords={trendingKeywords} interestKeywords={interestKeywords} />

      <BriefStrip
        headlineCount={headlineArticles.length}
        trendingKeywords={trendingKeywords}
        personalizedArticles={personalizedArticles}
      />

      <section className="home-section-surface reveal-up" style={{ animationDelay: '180ms' }}>
        <SectionHeader
          eyebrow="Headlines"
          title="지금 먼저 볼 기사"
          description="가장 빠르게 훑어야 할 주요 기사만 우선 배치했습니다."
          href="/news"
          linkLabel="전체 보기"
        />
        <div className="mt-6">
          <EditorialList articles={headlineArticles} limit={4} />
        </div>
      </section>

      <section className="home-two-column reveal-up" style={{ animationDelay: '240ms' }}>
        <article className="home-section-surface">
          <SectionHeader
            eyebrow="Trending"
            title="지금 많이 언급되는 이슈"
            description="반복 출현한 키워드를 기준으로 상위 기사를 다시 묶었습니다."
          />
          <div className="mt-6">
            <EditorialList articles={trendingTopArticles} ranked limit={3} />
          </div>
        </article>

        <article className="home-section-surface">
          <SectionHeader
            eyebrow="For You"
            title="당신을 위한 선별"
            description="최근 반응을 바탕으로 읽을 가능성이 높은 순서대로 정렬했습니다."
          />
          <div className="mt-6">
            <EditorialList articles={personalizedArticles} personalized limit={3} />
          </div>
        </article>
      </section>

    </div>
  );
}

function HeadlineSection({ articles }: { articles: News[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="헤드라인이 아직 없습니다"
        message="기사 수집이 완료되면 주요 기사 목록을 먼저 보여드립니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="home-section-surface reveal-up">
      <SectionHeader
        eyebrow="Headlines"
        title="오늘의 핵심 기사"
        description="가장 먼저 읽어야 할 기사만 추려 차분한 리스트로 정리했습니다."
        href="/news"
        linkLabel="전체 보기"
      />
      <div className="mt-6">
        <EditorialList articles={articles} />
      </div>
    </section>
  );
}

function TrendingTopSection({ articles }: { articles: RankedTrendingNews[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="집계할 트렌드가 아직 없습니다"
        message="기사 제목과 설명이 더 쌓이면 지금 많이 언급되는 이슈를 자동으로 정리합니다."
        icon={<Flame className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="home-section-surface reveal-up">
      <SectionHeader
        eyebrow="Trending"
        title="지금 많이 읽는 이슈"
        description="반복 키워드와 최신도를 함께 반영해 우선순위를 다시 계산했습니다."
        href="/news"
        linkLabel="전체 보기"
      />
      <div className="mt-6">
        <EditorialList articles={articles} ranked />
      </div>
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
        title="개인화할 반응이 아직 부족합니다"
        message="기사를 읽기 시작하면 관심 카테고리와 키워드를 반영해 추천 정확도를 높입니다."
        icon={<Sparkles className="mb-4 h-12 w-12 text-[#9ca3af]" />}
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
        <EditorialList articles={articles} personalized />
      </div>
      <div ref={sentinelRef} className="flex h-12 items-center justify-center pt-4">
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
    '대통령',
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
        if (!entries[0]?.isIntersecting || isLoadingMorePersonalized || isFetchingNextPage) {
          return;
        }

        setIsLoadingMorePersonalized(true);

        try {
          if (personalizedVisibleCount >= orderedPersonalizedArticles.length && hasNextPage) {
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
    orderedPersonalizedArticles.length,
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
        message="뉴스 수집이 완료되면 오늘의 흐름과 맞춤 추천을 여기서 확인할 수 있습니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
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
        />
      ) : null}
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
