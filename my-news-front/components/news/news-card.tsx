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
    <div className="absolute inset-0 flex items-end bg-[linear-gradient(135deg,#ccd6e2_0%,#dfe6ef_52%,#b6c4d2_100%)] p-4">
      <p className="line-clamp-3 text-sm font-bold leading-6 text-white/95">{title}</p>
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
      <article className="relative flex gap-4 rounded-[24px] border border-[#ddd6cd] bg-[#fbfaf7] p-4 pr-16 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBookmarkClick}
            disabled={addBookmark.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3efe8] text-[#4a5563] transition-colors hover:bg-[#ebe5dc] disabled:opacity-50"
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3efe8] text-[#4a5563] transition-colors hover:bg-[#ebe5dc]"
            aria-label="원문 보기"
            title="원문 보기"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#d8ddd2] sm:h-28 sm:w-28">
          {news.imageUrl ? (
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <FallbackThumb title={news.title} />
          )}
        </div>

        <div className="min-w-0 flex-1 py-1">
          <h3 className="line-clamp-3 text-[1.05rem] font-extrabold leading-[1.45] tracking-[-0.02em] text-[#202733] sm:text-[1.1rem]">
            {news.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#7b8390]">
            <span className="font-medium">{news.source}</span>
            <span className="h-1 w-1 rounded-full bg-[#c5ccd6]" />
            <Clock className="h-4 w-4" />
            <span>{formatRelativeTime(news.publishedAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
