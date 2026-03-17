'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Brain, ChevronRight, Clock, Newspaper, Sparkles, SunMedium } from 'lucide-react';
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

type HomeTab = 'weather' | 'personalized';

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
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="toss-card h-[360px] animate-pulse bg-[#edf2f7]" />
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

function HomeCategoryTabs({
  selected,
  onSelect,
}: {
  selected: HomeTab;
  onSelect: (tab: HomeTab) => void;
}) {
  const tabs: Array<{ id: HomeTab; label: string; icon: typeof SunMedium }> = [
    { id: 'weather', label: '날씨', icon: SunMedium },
    { id: 'personalized', label: '맞춤 뉴스', icon: Brain },
  ];

  return (
    <nav className="sticky top-0 z-30">
      <div className="toss-card overflow-hidden rounded-[26px]">
        <div className="flex gap-2 bg-white/95 p-2 backdrop-blur">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = selected === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-[var(--primary-strong)] text-white shadow-[0_10px_24px_rgba(27,100,218,0.22)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function LatestFeedSection({ articles }: { articles: News[] }) {
  return (
    <section className="toss-card section-pad-sm">
      <div className="flex items-center justify-between px-1 pb-2">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Latest Feed</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[var(--text)]">최신 뉴스 브리핑</h2>
        </div>
        <Link
          href="/news"
          className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary-strong)] transition hover:bg-[var(--primary-weak)]"
        >
          <span>전체 보기</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-2 space-y-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, 1)}
            className="item-inner-pad grid gap-4 rounded-[24px] transition hover:bg-[var(--surface-soft)] sm:grid-cols-[1fr_140px] sm:items-center"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{article.category.name}</p>
              <h3 className="mt-1 line-clamp-2 text-[18px] font-bold leading-7 tracking-[-0.02em] text-[var(--text)]">
                {article.title}
              </h3>
              <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-[#6b7280]">
                <span className="truncate">{article.source}</span>
                <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                <Clock className="h-3.5 w-3.5" />
                <span>{formatRelativeTime(article.publishedAt)}</span>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#e5edf8] sm:h-24 sm:w-[140px] sm:justify-self-end">
              {article.imageUrl ? (
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 140px"
                  className="object-cover"
                />
              ) : (
                <FallbackThumb title={article.title} />
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PersonalizedNewsSection({ articles }: { articles: PersonalizedNewsItem[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="맞춤 뉴스가 아직 부족합니다"
        message="뉴스를 읽기 시작하면 관심 카테고리와 키워드를 반영해 추천이 더 정교해집니다."
        icon={<Brain className="mb-4 h-12 w-12 text-[#9ca3af]" />}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="toss-card overflow-hidden">
        <div className="section-pad bg-[linear-gradient(145deg,#0f4fb3_0%,#1b64da_55%,#5f9cff_100%)] text-white">
          <p className="text-sm font-semibold text-white/78">My Interest Feed</p>
          <h2 className="mt-2 text-[28px] font-bold tracking-[-0.03em]">나의 관심 뉴스 리스트</h2>
          <p className="mt-3 text-sm leading-6 text-white/88">
            최근 읽은 카테고리와 키워드를 바탕으로 우선순위를 다시 계산하고, AI 요약 3줄로 핵심만 먼저 보여줍니다.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, 2)}
            className="toss-card block overflow-hidden transition hover:-translate-y-[1px] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
          >
            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_176px] sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--primary-weak)] px-3 py-1 text-[11px] font-semibold text-[var(--primary-strong)]">
                    추천 {index + 1}
                  </span>
                  <span className="text-[12px] font-semibold text-[#6b7280]">{article.category.name}</span>
                  {article.matchedKeywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-[#4b5563]">
                      #{keyword}
                    </span>
                  ))}
                </div>

                <h3 className="mt-3 text-[20px] font-bold leading-8 tracking-[-0.02em] text-[var(--text)]">
                  {article.title}
                </h3>

                <div className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fd_100%)] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-strong)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Summary</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {article.summaryLines.map((line, lineIndex) => (
                      <p key={`${article.id}-${lineIndex}`} className="line-clamp-1 text-sm leading-6 text-[#334155]">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
                  <span className="font-medium">{article.source}</span>
                  <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatRelativeTime(article.publishedAt)}</span>
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#e5edf8] sm:h-full sm:min-h-[176px]">
                {article.imageUrl ? (
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 176px"
                    className="object-cover"
                  />
                ) : (
                  <FallbackThumb title={article.title} />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
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

export default function Home() {
  const [selectedTab, setSelectedTab] = useState<HomeTab>('weather');
  const [summaries, setSummaries] = useState<Record<string, string[]>>({});
  const { data, isLoading, isError, error, refetch } = useInfiniteNews();
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, () => null);
  const articles = useMemo(() => data?.pages.flatMap((page) => page.items).slice(0, 12) ?? [], [data]);

  const heroArticle = articles[0];
  const sideArticles = articles.slice(1, 6);
  const personalizedArticles = rankPersonalizedNews(articles, profile).map((article) => ({
    ...article,
    summaryLines: summaries[article.id] ?? [
      '요약을 준비하고 있습니다.',
      '관심 카테고리 기준으로 우선순위를 계산했습니다.',
      '본문 분석이 끝나면 핵심 3줄을 표시합니다.',
    ],
  }));

  useEffect(() => {
    if (personalizedArticles.length === 0) {
      return;
    }

    const targets = personalizedArticles.slice(0, 5).filter((article) => !summaries[article.id]);
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
  }, [personalizedArticles, summaries]);

  return (
    <div className="min-w-0 space-y-5">
      <HomeCategoryTabs selected={selectedTab} onSelect={setSelectedTab} />

      {isLoading ? (
        <HomeLoading />
      ) : isError ? (
        <ErrorMessage
          title="뉴스를 불러오지 못했습니다"
          message={error?.message || '잠시 후 다시 시도해 주세요.'}
          onRetry={() => refetch()}
        />
      ) : articles.length === 0 ? (
        <EmptyState
          title="표시할 뉴스가 없습니다"
          message="뉴스 수집이 완료되면 최신 기사와 맞춤 요약을 보여드립니다."
          icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
        />
      ) : selectedTab === 'weather' ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <WeatherWidget />

            {heroArticle ? (
              <Link
                href={`/news/${heroArticle.id}`}
                onClick={() => trackNewsInterest(heroArticle, 1)}
                className="toss-card section-pad group relative overflow-hidden"
              >
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
            ) : null}
          </section>

          <LatestFeedSection articles={sideArticles} />
        </>
      ) : (
        <PersonalizedNewsSection articles={personalizedArticles.slice(0, 5)} />
      )}
    </div>
  );
}
