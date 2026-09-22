import type { News } from '@/types';

export interface TrendingKeyword {
  keyword: string;
  count: number;
  article: News;
}

export interface RankedTrendingNews extends News {
  rank: number;
  keyword?: string;
}

export function tokenizeForTrending(text: string) {
  const stopwords = new Set([
    '오늘',
    '이번',
    '관련',
    '기자',
    '뉴스',
    '정부',
    '시장',
    '대통령',
    '대한민국',
    '속보',
    '단독',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2 && !stopwords.has(keyword));
}

export function buildTrendingKeywords(articles: News[]): TrendingKeyword[] {
  const counter = new Map<string, { count: number; article: News }>();

  for (const article of articles) {
    const keywords = Array.from(new Set(tokenizeForTrending(`${article.title} ${article.description ?? ''}`)));

    for (const keyword of keywords.slice(0, 8)) {
      const current = counter.get(keyword);
      if (current) {
        current.count += 1;
      } else {
        counter.set(keyword, { count: 1, article });
      }
    }
  }

  return Array.from(counter.entries())
    .map(([keyword, value]) => ({
      keyword,
      count: value.count,
      article: value.article,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function buildTopTenTrendingNews(articles: News[], keywords: TrendingKeyword[]): RankedTrendingNews[] {
  const scoreMap = new Map<string, { article: News; score: number; keyword?: string }>();

  articles.slice(0, 10).forEach((article, index) => {
    scoreMap.set(article.id, {
      article,
      score: 100 - index * 8,
    });
  });

  keywords.forEach((item, index) => {
    const current = scoreMap.get(item.article.id);
    const keywordScore = item.count * 10 + Math.max(0, 20 - index);

    if (current) {
      current.score += keywordScore;
      if (!current.keyword) {
        current.keyword = item.keyword;
      }
      return;
    }

    scoreMap.set(item.article.id, {
      article: item.article,
      score: keywordScore,
      keyword: item.keyword,
    });
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    })
    .slice(0, 10)
    .map((item, index) => ({
      ...item.article,
      rank: index + 1,
      keyword: item.keyword ? `#${item.keyword}` : undefined,
    }));
}
