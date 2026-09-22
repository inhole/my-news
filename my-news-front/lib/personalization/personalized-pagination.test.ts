import assert from 'node:assert/strict';
import { shouldAutoFetchNextPersonalizedPage } from './personalized-pagination';

const base = {
  isPersonalizedTabSelected: true,
  filteredArticleCount: 0,
  hasNextPage: true,
  isFetchingNextPage: false,
  isLoadingMorePersonalized: false,
  isFetchNextPageError: false,
};

// 필터링 결과가 0건이고 다음 페이지가 남아 있으면 자동으로 다음 페이지를 가져와야 한다.
assert.equal(shouldAutoFetchNextPersonalizedPage(base), true);

// 다른 탭이 선택된 상태에서는 자동으로 가져오지 않는다.
assert.equal(
  shouldAutoFetchNextPersonalizedPage({ ...base, isPersonalizedTabSelected: false }),
  false,
);

// 이미 표시할 기사가 있으면 스크롤 기반 로딩에 맡기고 자동 호출하지 않는다.
assert.equal(
  shouldAutoFetchNextPersonalizedPage({ ...base, filteredArticleCount: 3 }),
  false,
);

// 더 가져올 페이지가 없으면(소진) 자동 호출을 멈춘다 (무한 루프 방지).
assert.equal(shouldAutoFetchNextPersonalizedPage({ ...base, hasNextPage: false }), false);

// 이미 다음 페이지 요청이 진행 중이면 중복 호출하지 않는다.
assert.equal(
  shouldAutoFetchNextPersonalizedPage({ ...base, isFetchingNextPage: true }),
  false,
);
assert.equal(
  shouldAutoFetchNextPersonalizedPage({ ...base, isLoadingMorePersonalized: true }),
  false,
);

// 직전 페이지 요청이 실패했으면 자동 재시도를 멈춰 반복 실패 요청을 막는다.
assert.equal(
  shouldAutoFetchNextPersonalizedPage({ ...base, isFetchNextPageError: true }),
  false,
);

console.log('personalized-pagination.test.ts: all assertions passed');
