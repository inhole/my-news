import type { AnonymousProfile } from '@/lib/personalization/anonymous-profile';
import type { News } from '@/types';

export interface PersonalizedNewsItem extends News {
  personalizedScore: number;
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
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60),
  );
  return Math.max(0, 24 - ageHours) * 0.3;
}

export function rankPersonalizedNews(
  articles: News[],
  profile: AnonymousProfile | null,
): PersonalizedNewsItem[] {
  const categoryScores = profile?.categoryScores ?? {};
  const keywordScores = profile?.keywordScores ?? {};
  const preferredCategorySlugs = new Set(profile?.preferredCategorySlugs ?? []);
  const preferredKeywords = new Set(profile?.preferredKeywords ?? []);
  const seenNewsIds = new Set(profile?.seenNewsIds ?? []);

  const candidateArticles =
    preferredCategorySlugs.size > 0
      ? articles.filter((article) =>
          preferredCategorySlugs.has(article.category.slug),
        )
      : articles;

  return candidateArticles
    .map((article) => {
      const keywords = tokenize(`${article.title} ${article.description ?? ''}`);
      const matchedKeywords = Array.from(
        new Set(
          keywords
            .filter((keyword) => (keywordScores[keyword] ?? 0) > 0)
            .sort((a, b) => (keywordScores[b] ?? 0) - (keywordScores[a] ?? 0)),
        ),
      ).slice(0, 3);

      const keywordAffinity = matchedKeywords.reduce(
        (sum, keyword) => sum + (keywordScores[keyword] ?? 0),
        0,
      );
      const categoryAffinity = categoryScores[article.category.slug] ?? 0;
      const preferredCategoryBoost = preferredCategorySlugs.has(
        article.category.slug,
      )
        ? 8
        : 0;
      const preferredKeywordBoost = keywords.reduce(
        (sum, keyword) => sum + (preferredKeywords.has(keyword) ? 3 : 0),
        0,
      );
      const freshness = calculateFreshnessScore(article.publishedAt);
      const seenPenalty = seenNewsIds.has(article.id) ? 6 : 0;

      return {
        ...article,
        personalizedScore:
          categoryAffinity * 2 +
          keywordAffinity +
          preferredCategoryBoost +
          preferredKeywordBoost +
          freshness -
          seenPenalty,
        matchedKeywords,
      };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore);
}
