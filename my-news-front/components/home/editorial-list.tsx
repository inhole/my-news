import type { ReactNode } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { NewsThumbnail } from '@/components/news/news-thumbnail';
import { useMounted } from '@/hooks/use-mounted';
import { formatRelativeTime, formatShortDateLabel } from '@/lib/format/date';
import type { RankedTrendingNews } from '@/lib/news/trending';
import { trackNewsInterest } from '@/lib/personalization/signal-tracker';
import type { PersonalizedNewsItem } from '@/lib/personalization/personalized-feed';
import type { News } from '@/types';

type EditorialListProps =
  | { variant: 'default'; articles: News[]; limit?: number }
  | { variant: 'ranked'; articles: RankedTrendingNews[]; limit?: number }
  | { variant: 'personalized'; articles: PersonalizedNewsItem[]; limit?: number };

function EditorialRow({
  article,
  mounted,
  personalized,
  ranked,
  rank,
  keyword,
  matchedKeyword,
}: {
  article: News;
  mounted: boolean;
  personalized: boolean;
  ranked: boolean;
  rank?: number;
  keyword?: string;
  matchedKeyword?: string;
}): ReactNode {
  return (
    <Link
      key={article.id}
      href={`/news/${article.id}`}
      onClick={() => trackNewsInterest(article, personalized ? 2 : 1)}
      className={`editorial-list-row ${personalized ? 'editorial-list-row-personalized' : ''}`}
    >
      <div className={`editorial-body min-w-0 flex-1 ${personalized ? 'editorial-body-personalized' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          {ranked ? <span className="editorial-rank">{rank}</span> : null}
          <p className="text-[12px] font-semibold text-[var(--primary-strong)]">{article.category.name}</p>
          {ranked && keyword ? <span className="editorial-chip">{keyword}</span> : null}
          {personalized && matchedKeyword ? <span className="editorial-chip">#{matchedKeyword}</span> : null}
        </div>

        <h3
          className={`editorial-title mt-2 text-[20px] font-bold tracking-[-0.03em] text-[var(--text)] ${
            personalized ? 'editorial-title-personalized' : ''
          }`}
        >
          {article.title}
        </h3>

        {article.description ? (
          <p
            className={`editorial-summary mt-3 text-sm text-[var(--text-secondary)] ${
              personalized ? 'editorial-summary-personalized' : ''
            }`}
          >
            {article.description}
          </p>
        ) : null}

        <div
          className={`editorial-meta mt-4 flex min-w-0 items-center gap-2 text-xs text-[var(--text-secondary)] ${
            personalized ? 'editorial-meta-personalized' : ''
          }`}
        >
          <span className="truncate">{article.source}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
          <Clock className="h-3.5 w-3.5" />
          <span>{mounted ? formatRelativeTime(article.publishedAt) : formatShortDateLabel(article.publishedAt)}</span>
        </div>
      </div>

      {!personalized ? (
        <div className="editorial-thumb relative">
          <NewsThumbnail
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 479px) 114px, (max-width: 639px) 140px, 177px"
          />
        </div>
      ) : null}
    </Link>
  );
}

export function EditorialList(props: EditorialListProps) {
  const mounted = useMounted();
  const { limit } = props;

  let rows: ReactNode;

  switch (props.variant) {
    case 'ranked': {
      const visibleArticles = typeof limit === 'number' ? props.articles.slice(0, limit) : props.articles;
      rows = visibleArticles.map((article) => (
        <EditorialRow
          key={article.id}
          article={article}
          mounted={mounted}
          personalized={false}
          ranked
          rank={article.rank}
          keyword={article.keyword}
        />
      ));
      break;
    }
    case 'personalized': {
      const visibleArticles = typeof limit === 'number' ? props.articles.slice(0, limit) : props.articles;
      rows = visibleArticles.map((article) => (
        <EditorialRow
          key={article.id}
          article={article}
          mounted={mounted}
          personalized
          ranked={false}
          matchedKeyword={article.matchedKeywords?.[0]}
        />
      ));
      break;
    }
    default: {
      const visibleArticles = typeof limit === 'number' ? props.articles.slice(0, limit) : props.articles;
      rows = visibleArticles.map((article) => (
        <EditorialRow key={article.id} article={article} mounted={mounted} personalized={false} ranked={false} />
      ));
    }
  }

  return <div className="editorial-list">{rows}</div>;
}
