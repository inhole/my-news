import Link from 'next/link';
import { NewsThumbnail } from '@/components/news/news-thumbnail';
import { formatPublishedLabel } from '@/lib/format/date';
import type { TrendingKeyword } from '@/lib/news/trending';
import { trackNewsInterest } from '@/lib/personalization/signal-tracker';
import type { News } from '@/types';

export function LeadStoryHero({
  article,
  trendingKeywords,
  interestKeywords,
}: {
  article: News;
  trendingKeywords: TrendingKeyword[];
  interestKeywords: string[];
}) {
  const heroKeywords = [...trendingKeywords.slice(0, 2).map((item) => `#${item.keyword}`), ...interestKeywords.slice(0, 1)].slice(
    0,
    3,
  );

  return (
    <section className="home-hero reveal-up">
      <div className="home-hero-media">
        <NewsThumbnail
          src={article.imageUrl}
          alt={article.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          fallbackClassName="absolute inset-0 object-cover"
        />
      </div>

      <div className="home-hero-overlay" />

      <div className="home-hero-content">
        <p className="home-hero-brand">My News</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="home-hero-pill">{article.category.name}</span>
          <span className="home-hero-pill home-hero-pill-muted">오늘의 리드 스토리</span>
          {heroKeywords.map((keyword) => (
            <span key={keyword} className="home-hero-pill home-hero-pill-muted">
              {keyword}
            </span>
          ))}
        </div>

        <h1 className="home-hero-title">{article.title}</h1>
        <p className="home-hero-copy">
          지금 가장 먼저 봐야 할 흐름을 메인 기사로 올리고, 헤드라인과 관심사 기반 추천을 같은 화면에서 바로
          이어서 탐색할 수 있게 정리했습니다.
        </p>

        <div className="home-hero-meta">
          <span>{article.source}</span>
          <span className="h-1 w-1 rounded-full bg-white/55" />
          <span>{formatPublishedLabel(article.publishedAt)}</span>
        </div>

        <div className="home-hero-actions">
          <Link
            href={`/news/${article.id}`}
            onClick={() => trackNewsInterest(article, 2)}
            className="home-hero-action home-hero-action-primary"
          >
            기사 읽기
          </Link>
          <Link href="/news" className="home-hero-action home-hero-action-secondary">
            전체 뉴스 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
