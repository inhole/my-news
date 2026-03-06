'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Bookmark, Clock, Share2, ExternalLink } from 'lucide-react';
import { useNewsDetail, useAddBookmark } from '@/hooks/use-queries';
import { LoadingPage } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error';

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: news, isLoading, isError, error, refetch } = useNewsDetail(id);
  const addBookmark = useAddBookmark();

  const handleBookmark = async () => {
    try {
      await addBookmark.mutateAsync(id);
      alert('북마크에 추가되었습니다!');
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('이미 북마크에 추가된 뉴스입니다.');
      } else {
        console.error('북마크 실패:', error);
        alert('북마크 추가에 실패했습니다.');
      }
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
      } catch (error) {
        console.error('공유 실패:', error);
      }
    } else {
      // 폴백: URL 복사
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <ErrorMessage
          title="뉴스를 불러올 수 없습니다"
          message={error?.message || '다시 시도해주세요.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        <ErrorMessage title="뉴스를 찾을 수 없습니다" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {/* 헤더 */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">뒤로</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="공유하기"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={handleBookmark}
              disabled={addBookmark.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              <Bookmark className="w-4 h-4" />
              <span>저장</span>
            </button>
          </div>
        </div>

        {/* 이미지 */}
        {news.imageUrl && (
          <div className="relative w-full h-64 md:h-96 bg-gray-100">
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 본문 */}
        <article className="p-8">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
              {news.category.name}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {news.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
            <span className="font-medium">{news.source}</span>
            <span>·</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(news.publishedAt)}</span>
            </div>
          </div>

          {news.description && (
            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {news.description}
              </p>
            </div>
          )}

          {/* 원문 보기 버튼 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>원문 보기</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}
