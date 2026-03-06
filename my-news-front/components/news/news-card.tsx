'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Clock, ExternalLink } from 'lucide-react';
import { News } from '@/types';
import { useAddBookmark } from '@/hooks/use-queries';

interface NewsCardProps {
  news: News;
}

export function NewsCard({ news }: NewsCardProps) {
  const addBookmark = useAddBookmark();

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await addBookmark.mutateAsync(news.id);
    } catch (error) {
      console.error('북마크 실패:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}분 전`;
    }
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <Link href={`/news/${news.id}`}>
      <article className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200">
        <div className="flex gap-4 p-5">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">
              {news.title}
            </h3>
            {news.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {news.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-medium text-blue-600">{news.category.name}</span>
              <span>·</span>
              <span>{news.source}</span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(news.publishedAt)}</span>
              </div>
            </div>
          </div>

          {news.imageUrl && (
            <div className="shrink-0 w-28 h-28 relative rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={news.imageUrl}
                alt={news.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <button
            onClick={handleBookmarkClick}
            disabled={addBookmark.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100"
          >
            <Bookmark className="w-4 h-4" />
            <span>저장</span>
          </button>

          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100"
          >
            <span>원문</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </article>
    </Link>
  );
}
