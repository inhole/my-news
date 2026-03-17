'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Clock, ExternalLink, Share2 } from 'lucide-react';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingPage } from '@/components/ui/loading';
import { useNewsDetail } from '@/hooks/use-queries';

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: news, isLoading, isError, error, refetch } = useNewsDetail(id);

  const handleShare = async () => {
    if (navigator.share && news) {
      try {
        await navigator.share({
          title: news.title,
          text: news.description || news.title,
          url: window.location.href,
        });
      } catch {
        return;
      }
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    alert('링크를 복사했습니다.');
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return <LoadingPage />;
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

  if (!news) {
    return <ErrorMessage title="뉴스를 찾을 수 없습니다" />;
  }

  const bodyHtml = news.contentHtml?.trim() || '';
  const bodyText = news.content?.trim() || news.description?.trim() || '';

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <article className="toss-card overflow-hidden">
        {news.imageUrl && (
          <div className="relative h-[260px] w-full bg-[#e5edf8] sm:h-[380px]">
            <Image src={news.imageUrl} alt={news.title} fill priority className="object-cover" />
          </div>
        )}

        <div className="section-pad">
          <p className="text-sm font-semibold text-[var(--primary-strong)]">{news.category.name}</p>

          <h1 className="mt-3 break-words text-[30px] font-bold leading-[1.32] tracking-[-0.035em] text-[#111827] sm:text-[36px]">
            {news.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5 text-sm text-[#6b7280]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#4b5563]">{news.source}</span>
              <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
              <Clock className="h-4 w-4" />
              <span>{formatDate(news.publishedAt)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[#4b5563] hover:bg-[#e9eef5]"
                title="공유하기"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[#4b5563] hover:bg-[#e9eef5]"
                title="원문 보기"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-6 text-[16px] leading-8 text-[#374151]">
            {bodyHtml ? (
              <div className="article-content break-words" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : bodyText ? (
              <div className="article-content break-words whitespace-pre-wrap">{bodyText}</div>
            ) : (
              <p>표시할 본문이 없습니다. 원문 보기에서 전체 기사를 확인해 주세요.</p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
