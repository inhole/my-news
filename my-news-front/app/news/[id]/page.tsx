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

  const bodyText = news.content?.trim() || news.description?.trim() || '';
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[var(--line)]">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#f1f5f9] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-semibold text-[#374151] hover:bg-[#f3f4f6]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>뒤로</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full bg-[#f3f4f6] p-2 text-[#4b5563] hover:bg-[#e5e7eb]"
            title="공유하기"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleBookmark}
            disabled={addBookmark.isPending}
            className="rounded-full bg-[#f3f4f6] p-2 text-[#4b5563] hover:bg-[#e5e7eb] disabled:opacity-50"
            title="북마크"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      </div>

      {news.imageUrl && (
        <div className="relative h-[220px] w-full bg-[#e5edf8] sm:h-[320px]">
          <Image src={news.imageUrl} alt={news.title} fill priority className="object-cover" />
        </div>
      )}

      <div className="px-4 py-6 sm:px-6">
        <span className="inline-flex rounded-full bg-[var(--primary-weak)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
          {news.category.name}
        </span>

        <h1 className="mt-3 text-2xl font-bold leading-9 tracking-[-0.02em] text-[#111827] sm:text-[2rem]">
          {news.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-[#f1f5f9] pb-4 text-xs text-[#6b7280]">
          <span className="font-medium">{news.source}</span>
          <span className="h-1 w-1 rounded-full bg-[#d1d5db]" />
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(news.publishedAt)}</span>
        </div>

        <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#374151]">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
          ) : (
            <p>표시할 본문이 없습니다. 원문 보기에서 전체 기사를 확인해 주세요.</p>
          )}
        </div>

        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <span>원문 보기</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
