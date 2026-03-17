'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock, Newspaper, Sparkles } from 'lucide-react';
import { WeatherWidget } from '@/components/layout/weather-widget';
import { EmptyState } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error';
import { useInfiniteNews } from '@/hooks/use-queries';

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

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useInfiniteNews();
  const articles = data?.pages.flatMap((page) => page.items).slice(0, 6) ?? [];
  const heroArticle = articles[0];
  const sideArticles = articles.slice(1);

  return (
    <div className="min-w-0 space-y-5">
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
          message="뉴스 수집이 완료되면 최신 기사 요약을 보여드립니다."
          icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <WeatherWidget />

            {heroArticle ? (
              <Link
                href={`/news/${heroArticle.id}`}
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
                      <p className="text-sm font-semibold text-[var(--primary-strong)]">
                        {heroArticle.category.name}
                      </p>
                      <h1 className="mt-2 text-[28px] font-bold leading-10 tracking-[-0.03em] text-[var(--text)]">
                        {heroArticle.title}
                      </h1>
                      {heroArticle.description ? (
                        <p className="mt-3 line-clamp-3 text-[15px] leading-7 text-[#5b6573]">
                          {heroArticle.description}
                        </p>
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

          <section className="toss-card section-pad-sm">
            <div className="flex items-center justify-between px-1 pb-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Latest Feed
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[var(--text)]">
                  최신 뉴스 브리프
                </h2>
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
              {sideArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
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
        </>
      )}
    </div>
  );
}
