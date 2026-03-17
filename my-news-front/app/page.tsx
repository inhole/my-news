'use client';

import { Suspense, useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock, Flame, Newspaper, Search, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { WeatherWidget } from '@/components/layout/weather-widget';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { useInfiniteNews } from '@/hooks/use-queries';
import { getAnonymousProfile } from '@/lib/personalization/anonymous-profile';
import {
  rankPersonalizedNews,
  type PersonalizedNewsItem,
} from '@/lib/personalization/personalized-feed';
import { trackNewsInterest } from '@/lib/personalization/signal-tracker';
import type { News, NewsSummary } from '@/types';

type HomeTab = 'weather' | 'headline' | 'trending' | 'personalized';

interface TrendingKeyword {
  keyword: string;
  count: number;
  article: News;
}

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
      <div className="toss-card h-[320px] animate-pulse bg-[#edf2f7]" />
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
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-2">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[var(--text)]">{title}</h2>
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
}: {
  articles: Array<News | PersonalizedNewsItem>;
  personalized?: boolean;
}) {
  return (
    <div className="space-y-2">
      {articles.map((article) => {
        const personalizedArticle = article as PersonalizedNewsItem;

        return (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, personalized ? 2 : 1)}
            className="item-inner-pad grid gap-4 rounded-[24px] transition hover:bg-[var(--surface-soft)] sm:grid-cols-[1fr_112px] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{article.category.name}</p>
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

            <div className="relative aspect-[1/1] overflow-hidden rounded-[18px] bg-[#e5edf8] sm:h-24 sm:w-24 sm:justify-self-end">
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

function HeadlineSection({ heroArticle, sideArticles }: { heroArticle?: News; sideArticles: News[] }) {
  return (
    <div className="space-y-4">
      {heroArticle ? (
        <section className="toss-card section-pad group relative overflow-hidden">
          <Link href={`/news/${heroArticle.id}`} onClick={() => trackNewsInterest(heroArticle, 1)} className="block">
            <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(49,130,246,0.12),transparent)]" />
            <div className="relative">
              <div className="toss-pill">
                <Sparkles className="h-3.5 w-3.5" />
                <span>오늘의 헤드라인</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--primary-strong)]">{heroArticle.category.name}</p>
                  <h1 className="mt-2 text-[28px] font-bold leading-10 tracking-[-0.03em] text-[var(--text)]">
                    {heroArticle.title}
                  </h1>
                  {heroArticle.description ? (
                    <p className="mt-3 line-clamp-3 text-[15px] leading-7 text-[#5b6573]">{heroArticle.description}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="font-medium">{heroArticle.source}</span>
                    <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                    <Clock className="h-4 w-4" />
                    <span>{formatRelativeTime(heroArticle.publishedAt)}</span>
                  </div>
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] bg-[#e5edf8]">
                  {heroArticle.imageUrl ? (
                    <Image
                      src={heroArticle.imageUrl}
                      alt={heroArticle.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 220px"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <FallbackThumb title={heroArticle.title} />
                  )}
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="toss-card section-pad-sm">
        <SectionHeader eyebrow="Latest Feed" title="최신 뉴스 브리핑" href="/news" linkLabel="전체 보기" />
        <CompactNewsList articles={sideArticles} />
      </section>
    </div>
  );
}

function TrendingSection({ keywords }: { keywords: TrendingKeyword[] }) {
  if (keywords.length === 0) {
    return (
      <EmptyState
        title="실시간 키워드가 아직 부족합니다"
        message="수집된 뉴스가 더 쌓이면 제목과 설명 기준으로 많이 언급된 키워드를 보여줍니다."
        icon={<Flame className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="toss-card section-pad-sm">
        <SectionHeader eyebrow="Realtime" title="실시간 검색어" />
        <div className="space-y-2">
          {keywords.slice(0, 10).map((item, index) => (
            <div
              key={item.keyword}
              className="flex items-center justify-between rounded-[18px] bg-[var(--surface-soft)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-sm font-bold text-[var(--primary-strong)]">{index + 1}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{item.keyword}</span>
              </div>
              <span className="text-xs font-medium text-[#6b7280]">{item.count}건</span>
            </div>
          ))}
        </div>
      </section>

      <section className="toss-card section-pad-sm">
        <SectionHeader eyebrow="Keyword Feed" title="키워드 관련 뉴스" href="/news" linkLabel="뉴스 보기" />
        <div className="space-y-2">
          {keywords.slice(0, 5).map((item, index) => (
            <Link
              key={`${item.keyword}-${item.article.id}`}
              href={`/news/${item.article.id}`}
              onClick={() => trackNewsInterest(item.article, 1)}
              className="item-inner-pad flex items-start gap-4 rounded-[24px] transition hover:bg-[var(--surface-soft)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-weak)] text-sm font-bold text-[var(--primary-strong)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#fff3e8] px-2.5 py-1 text-[11px] font-semibold text-[#d97706]">
                    <Search className="mr-1 inline h-3 w-3" />
                    {item.keyword}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--primary-strong)]">{item.article.category.name}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 text-[18px] font-bold leading-7 tracking-[-0.02em] text-[var(--text)]">
                  {item.article.title}
                </h3>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#6b7280]">
                  <span className="truncate">{item.article.source}</span>
                  <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                  <span>{formatRelativeTime(item.article.publishedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PersonalizedSection({ articles }: { articles: PersonalizedNewsItem[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="맞춤 뉴스가 아직 부족합니다"
        message="뉴스를 읽기 시작하면 관심 카테고리와 키워드를 반영해 추천이 더 정교해집니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="toss-card section-pad-sm">
      <SectionHeader eyebrow="My Interest Feed" title="나의 관심 뉴스 리스트" href="/news" linkLabel="뉴스 보기" />
      <CompactNewsList articles={articles} personalized />
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
    '한국',
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
    const keywords = Array.from(
      new Set(tokenizeForTrending(`${article.title} ${article.description ?? ''}`)),
    );

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
  const [summaries, setSummaries] = useState<Record<string, string[]>>({});
  const { data, isLoading, isError, error, refetch } = useInfiniteNews();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, () => null);
  const articles = useMemo(() => data?.pages.flatMap((page) => page.items).slice(0, 16) ?? [], [data]);
  const heroArticle = articles[0];
  const headlineArticles = articles.slice(1, 7);
  const trendingKeywords = useMemo(() => buildTrendingKeywords(articles), [articles]);
  const personalizedArticles = rankPersonalizedNews(articles, profile)
    .slice(0, 8)
    .map((article) => ({
      ...article,
      summaryLines: summaries[article.id] ?? [
        '요약을 준비하고 있습니다.',
        '관심 카테고리와 키워드를 반영해 정렬했습니다.',
        '본문 분석이 끝나면 핵심 3줄을 표시합니다.',
      ],
    }));

  useEffect(() => {
    if (selectedTab !== 'personalized' || personalizedArticles.length === 0) {
      return;
    }

    const targets = personalizedArticles.filter((article) => !summaries[article.id]).slice(0, 5);
    if (targets.length === 0) {
      return;
    }

    const controller = new AbortController();

    fetch('/api/ai/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articles: targets.map((article) => ({
          id: article.id,
          title: article.title,
          description: article.description,
          content: article.content,
          categoryName: article.category.name,
        })),
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: { summaries?: NewsSummary[] }) => {
        const nextSummaries = Object.fromEntries(
          (payload.summaries ?? []).map((summary) => [summary.id, summary.lines]),
        );
        setSummaries((current) => ({ ...current, ...nextSummaries }));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [personalizedArticles, selectedTab, summaries]);

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
        message="뉴스 수집이 완료되면 홈 탭별로 날씨, 헤드라인, 실검, 맞춤 뉴스를 보여드립니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {selectedTab === 'weather' ? <WeatherWidget /> : null}
      {selectedTab === 'headline' ? (
        <HeadlineSection heroArticle={heroArticle} sideArticles={headlineArticles} />
      ) : null}
      {selectedTab === 'trending' ? <TrendingSection keywords={trendingKeywords} /> : null}
      {selectedTab === 'personalized' ? (
        <PersonalizedSection articles={personalizedArticles} />
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
