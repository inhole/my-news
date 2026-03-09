'use client';

import type { AxiosError } from 'axios';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Clock, ExternalLink, Share2 } from 'lucide-react';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingPage } from '@/components/ui/loading';
import { useAddBookmark, useNewsDetail } from '@/hooks/use-queries';

type ApiErrorResponse = {
  message?: string | string[];
};

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: news, isLoading, isError, error, refetch } = useNewsDetail(id);
  const addBookmark = useAddBookmark();

  const handleBookmark = async () => {
    try {
      await addBookmark.mutateAsync(id);
      alert('북마크에 추가했습니다.');
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 409) {
        alert('이미 북마크에 추가된 기사입니다.');
        return;
      }

      console.error('북마크 추가 실패:', err);
      alert('북마크 추가에 실패했습니다.');
    }
  };

  const handleShare = async () => {
    if (navigator.share && news) {
      try {
        await navigator.share({
          title: news.title,
          text: news.description || news.title,
          url: window.location.href,
        });
      } catch (err) {
        console.error('공유 실패:', err);
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
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage
          title="뉴스를 불러오지 못했습니다"
          message={error?.message || '잠시 후 다시 시도해 주세요.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage title="뉴스를 찾을 수 없습니다" />
      </div>
    );
  }

  const bodyText = news.content?.trim() || news.description?.trim() || '';
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-[#ddd6cd] bg-[#fbfaf7] shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#ebe5dc] bg-[#fbfaf7]/95 px-4 py-4 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4a5563]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>뒤로</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full bg-[#f1ede5] p-2 text-[#4a5563]"
              title="공유하기"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleBookmark}
              disabled={addBookmark.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#2f3947] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Bookmark className="h-4 w-4" />
              <span>{addBookmark.isPending ? '저장 중' : '북마크'}</span>
            </button>
          </div>
        </div>

        {news.imageUrl && (
          <div className="relative h-[240px] w-full bg-[#d8ddd2] sm:h-[360px] lg:h-[460px]">
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              priority
              className="object-cover"
            />
          </div>
        )}

        <article className="px-4 py-6 sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full bg-[#f8ebe0] px-3 py-1 text-xs font-semibold text-[#ef7d2a]">
            {news.category.name}
          </span>

          <h1 className="mt-4 text-[1.75rem] font-black leading-[1.4] tracking-[-0.02em] text-[#202733] sm:text-[2.2rem]">
            {news.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-[#ebe5dc] pb-5 text-sm text-[#7b8390]">
            <span className="font-semibold text-[#4a5563]">{news.source}</span>
            <span className="h-1 w-1 rounded-full bg-[#c5ccd6]" />
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDate(news.publishedAt)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-base leading-8 break-words text-[#3e4652] sm:text-[1.02rem]">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p>표시할 본문이 없습니다. 원문 보기에서 전체 기사를 확인해 주세요.</p>
            )}
          </div>

          <div className="mt-8 border-t border-[#ebe5dc] pt-6">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#ef7d2a] px-5 py-3 text-base font-semibold text-white"
            >
              <span>원문 보기</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
