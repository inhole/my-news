'use client';

import type { MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Clock, ExternalLink } from 'lucide-react';
import { useAddBookmark } from '@/hooks/use-queries';
import { News } from '@/types';

interface NewsCardProps {
  news: News;
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
    <div className="absolute inset-0 flex items-end bg-[linear-gradient(135deg,#dce9ff_0%,#bdd5ff_100%)] p-3">
      <p className="line-clamp-2 text-xs font-semibold leading-5 text-[#1f2937]">{title}</p>
    </div>
  );
}

export function NewsCard({ news }: NewsCardProps) {
  const addBookmark = useAddBookmark();

  const handleBookmarkClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await addBookmark.mutateAsync(news.id);
    } catch (error) {
      console.error('북마크 추가 실패:', error);
    }
  };

  return (
    <Link href={`/news/${news.id}`} className="block">
      <article className="relative flex gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute right-4 top-4 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleBookmarkClick}
            disabled={addBookmark.isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6] text-[#4b5563] transition hover:bg-[#e5e7eb] disabled:opacity-50"
            aria-label="북마크"
            title="북마크"
          >
            <Bookmark className="h-4 w-4" />
          </button>

          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6] text-[#4b5563] transition hover:bg-[#e5e7eb]"
            aria-label="원문 보기"
            title="원문 보기"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#e5edf8] sm:h-24 sm:w-24">
          {news.imageUrl ? (
            <Image src={news.imageUrl} alt={news.title} fill sizes="96px" className="object-cover" />
          ) : (
            <FallbackThumb title={news.title} />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-16">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#111827]">{news.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6b7280]">
            <span>{news.source}</span>
            <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(news.publishedAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
