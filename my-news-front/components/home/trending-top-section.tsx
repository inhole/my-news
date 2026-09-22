import { Flame } from 'lucide-react';
import { EditorialList } from '@/components/home/editorial-list';
import { SectionHeader } from '@/components/home/section-header';
import { EmptyState } from '@/components/ui/empty';
import type { RankedTrendingNews } from '@/lib/news/trending';

export function TrendingTopSection({ articles }: { articles: RankedTrendingNews[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="집계할 트렌드가 아직 없습니다"
        message="기사 제목과 설명이 더 쌓이면 지금 많이 언급되는 이슈를 자동으로 정리합니다."
        icon={<Flame className="mb-4 h-12 w-12 text-[var(--muted)]" />}
      />
    );
  }

  return (
    <section className="home-section-surface reveal-up">
      <SectionHeader
        eyebrow="Trending"
        title="지금 많이 읽는 이슈"
        description="반복 키워드와 최신도를 함께 반영해 우선순위를 다시 계산했습니다."
        href="/news"
        linkLabel="전체 보기"
      />
      <div className="mt-6">
        <EditorialList variant="ranked" articles={articles} />
      </div>
    </section>
  );
}
