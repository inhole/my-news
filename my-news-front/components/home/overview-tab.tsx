import { useMemo } from 'react';
import { BriefStrip } from '@/components/home/brief-strip';
import { EditorialList } from '@/components/home/editorial-list';
import { LeadStoryHero } from '@/components/home/lead-story-hero';
import { SectionHeader } from '@/components/home/section-header';
import type { RankedTrendingNews, TrendingKeyword } from '@/lib/news/trending';
import type { AnonymousProfile } from '@/lib/personalization/anonymous-profile';
import type { PersonalizedNewsItem } from '@/lib/personalization/personalized-feed';
import type { News } from '@/types';

export function OverviewTab({
  articles,
  headlineArticles,
  trendingKeywords,
  trendingTopArticles,
  personalizedArticles,
  personalizedTotalCount,
  profile,
}: {
  articles: News[];
  headlineArticles: News[];
  trendingKeywords: TrendingKeyword[];
  trendingTopArticles: RankedTrendingNews[];
  personalizedArticles: PersonalizedNewsItem[];
  personalizedTotalCount: number;
  profile: AnonymousProfile | null;
}) {
  const heroArticle = headlineArticles[0] ?? articles[0];
  const interestKeywords = useMemo(
    () =>
      Object.entries(profile?.keywordScores ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword]) => `#${keyword}`),
    [profile],
  );

  if (!heroArticle) {
    return null;
  }

  return (
    <div className="home-overview-stack">
      <LeadStoryHero article={heroArticle} trendingKeywords={trendingKeywords} interestKeywords={interestKeywords} />

      <BriefStrip
        totalArticleCount={articles.length}
        trendingKeywords={trendingKeywords}
        personalizedTotalCount={personalizedTotalCount}
      />

      <section className="home-section-surface reveal-up" style={{ animationDelay: '180ms' }}>
        <SectionHeader
          eyebrow="Headlines"
          title="지금 먼저 볼 기사"
          description="가장 빠르게 훑어야 할 주요 기사만 우선 배치했습니다."
          href="/news"
          linkLabel="전체 보기"
        />
        <div className="mt-6">
          <EditorialList variant="default" articles={headlineArticles} limit={4} />
        </div>
      </section>

      <section className="home-two-column reveal-up" style={{ animationDelay: '240ms' }}>
        <article className="home-section-surface">
          <SectionHeader
            eyebrow="Trending"
            title="지금 많이 언급되는 이슈"
            description="반복 출현한 키워드를 기준으로 상위 기사를 다시 묶었습니다."
          />
          <div className="mt-6">
            <EditorialList variant="ranked" articles={trendingTopArticles} limit={3} />
          </div>
        </article>

        <article className="home-section-surface">
          <SectionHeader
            eyebrow="For You"
            title="당신을 위한 선별"
            description="최근 반응을 바탕으로 읽을 가능성이 높은 순서대로 정렬했습니다."
          />
          <div className="mt-6">
            <EditorialList variant="personalized" articles={personalizedArticles} limit={3} />
          </div>
        </article>
      </section>

    </div>
  );
}
