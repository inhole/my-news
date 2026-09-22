import assert from 'node:assert/strict';
import { buildTopTenTrendingNews, buildTrendingKeywords, tokenizeForTrending } from './trending';
import type { News } from '../../types';

const category = { id: 'c1', name: '정치', slug: 'politics' };

function makeNews(overrides: Partial<News> & Pick<News, 'id'>): News {
  return {
    title: '기본 제목',
    description: null,
    url: `https://example.com/${overrides.id}`,
    imageUrl: null,
    publishedAt: '2026-09-20T00:00:00.000Z',
    source: '테스트뉴스',
    categoryId: category.id,
    category,
    ...overrides,
  };
}

// tokenizeForTrending: 불용어는 제거하고, 길이 2 미만인 토큰도 제거한다.
{
  const tokens = tokenizeForTrending('오늘 단독 기자 속보 대한민국 대통령 정부 시장 관련 뉴스 AI 반도체 수출 a');
  assert.deepEqual(tokens, ['ai', '반도체', '수출']);
}

// tokenizeForTrending: 길이 2 미만(한 글자) 토큰은 제외한다.
{
  const tokens = tokenizeForTrending('가 나다 라마바');
  assert.deepEqual(tokens, ['나다', '라마바']);
}

// buildTrendingKeywords: 여러 기사에 걸쳐 등장한 키워드 수를 세고, 개수 내림차순으로 정렬한다.
{
  const articles: News[] = [
    makeNews({ id: '1', title: '반도체 수출 증가', description: '반도체 업황 개선' }),
    makeNews({ id: '2', title: '반도체 투자 확대', description: '반도체 클러스터 조성' }),
    makeNews({ id: '3', title: '자동차 수출 둔화', description: null }),
  ];

  const keywords = buildTrendingKeywords(articles);
  const byKeyword = new Map(keywords.map((item) => [item.keyword, item.count]));

  assert.equal(byKeyword.get('반도체'), 2);
  assert.equal(byKeyword.get('수출'), 2);
  assert.equal(byKeyword.get('자동차'), 1);
  assert.equal(keywords[0].count >= keywords[keywords.length - 1].count, true);
}

// buildTrendingKeywords: 상위 10개로 결과를 제한한다.
{
  const articles: News[] = Array.from({ length: 15 }, (_, index) =>
    makeNews({ id: `k${index}`, title: `고유키워드${index} 테스트단어${index}`, description: null }),
  );

  const keywords = buildTrendingKeywords(articles);
  assert.equal(keywords.length <= 10, true);
}

// buildTopTenTrendingNews: 최신순 기본 점수와 키워드 점수를 합산해 순위를 매긴다.
// (반도체는 b, d, e 세 기사에 걸쳐 등장해 count 3으로 최상위 키워드가 되고,
//  그 키워드 점수는 최초로 등장한 기사인 b에 귀속되어 base score(92)와 합산된다.
//  base score 1위인 a는 count 1짜리 키워드(정치)만 더해져 b에 역전당한다.)
{
  const articles: News[] = [
    makeNews({ id: 'a', title: '정치', description: null, publishedAt: '2026-09-20T04:00:00.000Z' }),
    makeNews({ id: 'b', title: '반도체', description: null, publishedAt: '2026-09-20T03:00:00.000Z' }),
    makeNews({ id: 'c', title: '스포츠', description: null, publishedAt: '2026-09-20T02:00:00.000Z' }),
    makeNews({ id: 'd', title: '반도체', description: null, publishedAt: '2026-09-20T01:00:00.000Z' }),
    makeNews({ id: 'e', title: '반도체', description: null, publishedAt: '2026-09-20T00:00:00.000Z' }),
  ];

  const keywords = buildTrendingKeywords(articles);
  assert.equal(keywords[0].keyword, '반도체');
  assert.equal(keywords[0].count, 3);

  const ranked = buildTopTenTrendingNews(articles, keywords);

  // rank는 1부터 시작하는 연속된 값이어야 한다.
  assert.deepEqual(ranked.map((item) => item.rank), ranked.map((_, index) => index + 1));

  // 반복 빈도가 가장 높은 키워드의 점수가 반영되어 'b' 기사가 최상위로 올라온다.
  assert.equal(ranked[0].id, 'b');
  assert.equal(ranked[0].keyword, '#반도체');
}

// buildTopTenTrendingNews: 점수가 동률이면 publishedAt이 최신인 기사가 앞선다.
{
  const older = makeNews({ id: 'older', title: '동률 기사 A', description: null, publishedAt: '2026-09-19T00:00:00.000Z' });
  const newer = makeNews({ id: 'newer', title: '동률 기사 B', description: null, publishedAt: '2026-09-21T00:00:00.000Z' });

  // 기사 목록을 비워 base score(articles.slice(0,10) 기반)가 전혀 반영되지 않게 하고,
  // keyword score만으로 두 기사의 총점을 정확히 30으로 맞춘다.
  // score = count * 10 + max(0, 20 - index)
  // older: index 0, count 1  => 1*10 + 20 = 30
  // newer: index 10, count 2 => 2*10 + 10 = 30
  const fillerKeywords = Array.from({ length: 9 }, (_, i) => ({
    keyword: `filler${i}`,
    count: 0,
    article: makeNews({ id: `filler-${i}`, title: '필러', description: null }),
  }));
  const tieKeywords = [
    { keyword: '동률', count: 1, article: older },
    ...fillerKeywords,
    { keyword: '동률2', count: 2, article: newer },
  ];

  const rankedTie = buildTopTenTrendingNews([], tieKeywords);
  const newerIndex = rankedTie.findIndex((item) => item.id === 'newer');
  const olderIndex = rankedTie.findIndex((item) => item.id === 'older');

  assert.equal(newerIndex >= 0 && olderIndex >= 0, true);
  // 동점일 때는 publishedAt이 더 최신인 newer가 앞선다.
  assert.equal(newerIndex < olderIndex, true);
}

console.log('trending.test.ts: all assertions passed');
