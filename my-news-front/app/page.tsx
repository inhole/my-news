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

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}일 전`;
  }

  return publishedAt.toLocaleDateString('ko-KR');
}

function FallbackThumb({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-end bg-[linear-gradient(135deg,#d6dee8_0%,#b8c6d4_42%,#8ea0b0_100%)] p-4">
      <p className="line-clamp-2 text-sm font-bold leading-6 text-white/95">{title}</p>
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(320px,360px)_1fr] lg:px-8">
      <div className="h-[250px] animate-pulse rounded-[28px] bg-[#dfe6ef]" />
      <div className="rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] p-5">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`flex gap-4 py-4 ${index < 4 ? 'border-b border-[#ebe5dc]' : ''}`}
          >
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-[18px] bg-[#ebe6de]" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-full rounded-full bg-[#ebe6de]" />
              <div className="h-5 w-4/5 rounded-full bg-[#ebe6de]" />
              <div className="h-4 w-24 rounded-full bg-[#ebe6de]" />
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
    <div className="pt-2">
      {isLoading ? (
        <HomeLoading />
      ) : isError ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <ErrorMessage
            title="뉴스를 불러오지 못했습니다"
            message={error?.message || '잠시 후 다시 시도해 주세요.'}
            onRetry={() => refetch()}
          />
        </div>
      ) : articles.length === 0 ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <EmptyState
            title="표시할 뉴스가 없습니다"
            message="뉴스를 수집한 뒤 홈에서 상위 5개 기사를 노출합니다."
            icon={<Newspaper className="mb-4 h-12 w-12 text-[#98a0ab]" />}
          />
        </div>
      ) : (
        <div className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(320px,360px)_1fr] lg:px-8">
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <WeatherWidget />
          </div>

          <section className="rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-[1.55rem] font-black leading-[1.35] tracking-[-0.03em] text-[#2f3947]">
                지금 주목할 뉴스
              </h1>
              <Link href="/news" className="text-sm font-semibold text-[#2f3947]">
                더보기
              </Link>
            </div>

            <div>
              {articles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
                  className={`grid gap-4 py-4 transition-colors hover:bg-[#f6f3ec] sm:grid-cols-[1fr_120px] sm:items-center sm:rounded-[22px] sm:px-4 ${
                    index < articles.length - 1 ? 'border-b border-[#ebe5dc]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-[1.06rem] font-extrabold leading-[1.45] tracking-[-0.02em] text-[#202733] sm:text-[1.15rem]">
                      {article.title}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#7b8390]">
                      <span className="font-medium">{article.source}</span>
                      <span className="h-1 w-1 rounded-full bg-[#c5ccd6]" />
                      <Clock className="h-4 w-4" />
                      <span>{formatRelativeTime(article.publishedAt)}</span>
                    </div>
                  </div>

                  <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#d8ddd2] sm:h-28 sm:w-[120px] sm:justify-self-end">
                    {article.imageUrl ? (
                      <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 120px"
                        className="object-cover"
                      />
                    ) : (
                      <FallbackThumb title={article.title} />
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/news"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2f3947]"
            >
              <span>더 많은 뉴스 보기</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
