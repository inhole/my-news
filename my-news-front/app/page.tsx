'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock, Newspaper } from 'lucide-react';
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
    <div className="absolute inset-0 flex items-end bg-[linear-gradient(135deg,#dce9ff_0%,#bdd5ff_100%)] p-3">
      <p className="line-clamp-2 text-xs font-semibold leading-5 text-[#1f2937]">{title}</p>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_1fr]">
      <div className="h-[200px] animate-pulse rounded-3xl bg-[#edf2f7]" />
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`flex gap-4 py-4 ${index < 4 ? 'border-b border-[#f1f5f9]' : ''}`}
          >
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-[#edf2f7]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full rounded bg-[#edf2f7]" />
              <div className="h-4 w-3/4 rounded bg-[#edf2f7]" />
              <div className="h-3 w-24 rounded bg-[#edf2f7]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useInfiniteNews();
  const articles = data?.pages.flatMap((page) => page.items).slice(0, 5) ?? [];

  return (
    <div className="space-y-4">
      <header className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">My News</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#111827]">오늘의 주요 뉴스</h1>
      </header>

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
          message="뉴스가 수집되면 홈에서 최신 기사를 보여드립니다."
          icon={<Newspaper className="mb-4 h-12 w-12 text-[#9ca3af]" />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,320px)_1fr]">
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <WeatherWidget />
          </div>

          <section className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-[var(--line)] sm:p-4">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className={`grid gap-3 rounded-2xl px-3 py-3 transition hover:bg-[#f8fafc] sm:grid-cols-[1fr_110px] sm:items-center ${
                  index < articles.length - 1 ? 'border-b border-[#f1f5f9]' : ''
                }`}
              >
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#111827]">
                    {article.title}
                  </h2>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7280]">
                    <span>{article.source}</span>
                    <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatRelativeTime(article.publishedAt)}</span>
                  </div>
                </div>

                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#e5edf8] sm:h-20 sm:w-[110px] sm:justify-self-end">
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 110px"
                      className="object-cover"
                    />
                  ) : (
                    <FallbackThumb title={article.title} />
                  )}
                </div>
              </Link>
            ))}

            <Link
              href="/news"
              className="mx-2 mt-2 inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-weak)]"
            >
              <span>뉴스 더보기</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
