import { Newspaper } from 'lucide-react';
import { EditorialList } from '@/components/home/editorial-list';
import { SectionHeader } from '@/components/home/section-header';
import { EmptyState } from '@/components/ui/empty';
import type { News } from '@/types';

export function HeadlineSection({ articles }: { articles: News[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title="헤드라인이 아직 없습니다"
        message="기사 수집이 완료되면 주요 기사 목록을 먼저 보여드립니다."
        icon={<Newspaper className="mb-4 h-12 w-12 text-[var(--muted)]" />}
      />
    );
  }

  return (
    <section className="home-section-surface reveal-up">
      <SectionHeader
        eyebrow="Headlines"
        title="오늘의 핵심 기사"
        description="가장 먼저 읽어야 할 기사만 추려 차분한 리스트로 정리했습니다."
        href="/news"
        linkLabel="전체 보기"
      />
      <div className="mt-6">
        <EditorialList variant="default" articles={articles} />
      </div>
    </section>
  );
}
