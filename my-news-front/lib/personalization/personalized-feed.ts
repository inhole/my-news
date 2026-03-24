import type { AnonymousProfile } from '@/lib/personalization/anonymous-profile';
import type { News } from '@/types';

export interface PersonalizedNewsItem extends News {
  personalizedScore: number;
  summary: string | null;
  summaryLines: string[];
  matchedKeywords: string[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function calculateFreshnessScore(publishedAt: string) {
  const ageHours = Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
  return Math.max(0, 24 - ageHours) * 0.3;
}

export function rankPersonalizedNews(articles: News[], profile: AnonymousProfile | null): PersonalizedNewsItem[] {
  const categoryScores = profile?.categoryScores ?? {};
  const keywordScores = profile?.keywordScores ?? {};
  const seenNewsIds = new Set(profile?.seenNewsIds ?? []);

  return articles
    .map((article) => {
      const keywords = tokenize(`${article.title} ${article.description ?? ''}`);
      const matchedKeywords = Array.from(
        new Set(
          keywords
            .filter((keyword) => (keywordScores[keyword] ?? 0) > 0)
            .sort((a, b) => (keywordScores[b] ?? 0) - (keywordScores[a] ?? 0)),
        ),
      ).slice(0, 3);

      const keywordAffinity = matchedKeywords.reduce((sum, keyword) => sum + (keywordScores[keyword] ?? 0), 0);
      const categoryAffinity = categoryScores[article.category.slug] ?? 0;
      const freshness = calculateFreshnessScore(article.publishedAt);
      const seenPenalty = seenNewsIds.has(article.id) ? 6 : 0;

      return {
        ...article,
        personalizedScore: categoryAffinity * 2 + keywordAffinity + freshness - seenPenalty,
        summary: article.summary ?? null,
        summaryLines: Array.isArray(article.summaryLines) ? article.summaryLines : [],
        matchedKeywords,
      };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore);
}
