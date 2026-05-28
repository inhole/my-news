'use client';

import { useParams } from 'next/navigation';
import { Clock, ExternalLink, Share2, Sparkles } from 'lucide-react';
import { NewsThumbnail } from '@/components/news/news-thumbnail';
import { ErrorMessage } from '@/components/ui/error';
import { LoadingPage } from '@/components/ui/loading';
import { useNewsDetail, useSummarizeNews } from '@/hooks/use-queries';

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: news, isLoading, isError, error, refetch } = useNewsDetail(id);
  const summarizeNews = useSummarizeNews(id);

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
  const summary = summarizeNews.data ?? news.llmSummary;
  const summaryLines =
    summary?.summaryLines && summary.summaryLines.length > 0
      ? summary.summaryLines
      : summary?.summary
        ? [summary.summary]
        : [];

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <article className="toss-card overflow-hidden">
        <div className="relative h-[260px] w-full bg-[#e5edf8] sm:h-[380px]">
          <NewsThumbnail src={news.imageUrl} alt={news.title} fill priority sizes="100vw" />
        </div>

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

          <section className="mt-6 rounded-[8px] border border-[#dbeafe] bg-[#f8fbff] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]">
                  <Sparkles className="h-4 w-4" />
                  <span>AI 요약</span>
                </div>
                {summaryLines.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-[15px] leading-7 text-[#374151]">
                    {summaryLines.map((line, index) => (
                      <li key={`${line}-${index}`} className="flex gap-2">
                        <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary-strong)]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                    로컬 LLM으로 기사 핵심 내용을 3줄로 정리합니다.
                  </p>
                )}
                {summarizeNews.isError ? (
                  <p className="mt-3 text-sm text-[#dc2626]">
                    요약을 만들지 못했습니다. 로컬 LLM 설정과 Ollama 실행 상태를 확인해 주세요.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => summarizeNews.mutate(summaryLines.length > 0)}
                disabled={summarizeNews.isPending}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                <span>{summarizeNews.isPending ? '요약 중' : summaryLines.length > 0 ? '다시 요약' : '요약 생성'}</span>
              </button>
            </div>
          </section>

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
