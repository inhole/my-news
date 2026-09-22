import { Newspaper, Sparkles, TrendingUp } from 'lucide-react';
import type { TrendingKeyword } from '@/lib/news/trending';

export function BriefStrip({
  totalArticleCount,
  trendingKeywords,
  personalizedTotalCount,
}: {
  totalArticleCount: number;
  trendingKeywords: TrendingKeyword[];
  personalizedTotalCount: number;
}) {
  return (
    <section className="home-brief-grid reveal-up" style={{ animationDelay: '120ms' }}>
      <article className="home-brief-card">
        <p className="home-eyebrow">Headlines</p>
        <div className="mt-5 flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-[var(--primary-strong)]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">{totalArticleCount}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">지금까지 모인 전체 기사 건수입니다.</p>
      </article>

      <article className="home-brief-card">
        <p className="home-eyebrow">Trending</p>
        <div className="mt-5 flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-[#d97706]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">
            {trendingKeywords.length > 0 ? `${trendingKeywords[0].count}x` : '-'}
          </p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {trendingKeywords.length > 0
            ? `가장 많이 반복된 키워드는 ${trendingKeywords[0].keyword}입니다.`
            : '충분한 기사 수집 후 실시간 이슈를 정리합니다.'}
        </p>
      </article>

      <article className="home-brief-card">
        <p className="home-eyebrow">For You</p>
        <div className="mt-5 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[var(--primary-strong)]" />
          <p className="text-[28px] font-bold tracking-[-0.04em] text-[var(--text)]">{personalizedTotalCount}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          최근 본 기사와 관심 카테고리를 반영해 익명 개인화 순서로 다시 정렬합니다.
        </p>
      </article>
    </section>
  );
}
