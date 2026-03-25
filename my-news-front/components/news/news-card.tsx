'use client';

import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { NewsThumbnail } from '@/components/news/news-thumbnail';
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

export function NewsCard({ news }: NewsCardProps) {
  return (
    <Link href={`/news/${news.id}`} className="block">
      <article className="news-item-shell toss-card news-item-row relative flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="news-card-thumb relative shrink-0 overflow-hidden rounded-[22px] bg-[#e8f1ff]">
          <NewsThumbnail src={news.imageUrl} alt={news.title} fill sizes="112px" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{news.category.name}</p>
              <h3 className="news-card-title mt-1 text-[17px] font-bold text-[var(--text)]">
                {news.title}
              </h3>
            </div>

            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[#4e5968] transition hover:bg-[#e9eef5]"
              aria-label="원문 보기"
              title="원문 보기"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="font-medium">{news.source}</span>
            <span className="h-1 w-1 rounded-full bg-[#d1d6db]" />
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(news.publishedAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
