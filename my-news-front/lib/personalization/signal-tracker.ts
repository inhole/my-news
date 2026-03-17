'use client';

import type { News } from '@/types';
import {
  createAnonymousProfile,
  getAnonymousProfile,
  saveAnonymousProfile,
  type AnonymousProfile,
} from '@/lib/personalization/anonymous-profile';

const STOPWORDS = new Set([
  '그리고',
  '그러나',
  '관련',
  '대해',
  '위해',
  '이번',
  '오늘',
  '내일',
  '속보',
  '단독',
  '뉴스',
  '기자',
  '정부',
  '한국',
  '대한민국',
]);

function ensureProfile(): AnonymousProfile {
  return getAnonymousProfile() ?? createAnonymousProfile();
}

function extractKeywords(article: News): string[] {
  const sourceText = `${article.title} ${article.description ?? ''}`;

  return Array.from(
    new Set(
      sourceText
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2 && !STOPWORDS.has(word)),
    ),
  ).slice(0, 8);
}

export function trackNewsInterest(article: News, weight = 1) {
  const profile = ensureProfile();
  const nextSeenNewsIds = [article.id, ...profile.seenNewsIds.filter((id) => id !== article.id)].slice(0, 100);

  profile.categoryScores[article.category.slug] =
    (profile.categoryScores[article.category.slug] ?? 0) + weight * 3;

  for (const keyword of extractKeywords(article)) {
    profile.keywordScores[keyword] = (profile.keywordScores[keyword] ?? 0) + weight;
  }

  saveAnonymousProfile({
    ...profile,
    seenNewsIds: nextSeenNewsIds,
  });
}
