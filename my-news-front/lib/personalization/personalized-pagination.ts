export interface PersonalizedAutoFetchState {
  isPersonalizedTabSelected: boolean;
  filteredArticleCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoadingMorePersonalized: boolean;
  isFetchNextPageError: boolean;
}

/**
 * 개인화 탭에서 카테고리/키워드 필터링 결과가 0건이어도, 다음 페이지에 일치하는
 * 기사가 있을 수 있으므로 스크롤 없이도 다음 페이지를 계속 가져와야 하는지 판단한다.
 * hasNextPage가 false(소진)이거나 직전 페이지 요청이 실패한 경우에는 재시도 폭주를
 * 막기 위해 false를 반환한다.
 */
export function shouldAutoFetchNextPersonalizedPage(
  state: PersonalizedAutoFetchState,
): boolean {
  if (!state.isPersonalizedTabSelected) {
    return false;
  }

  if (state.filteredArticleCount > 0 || !state.hasNextPage) {
    return false;
  }

  if (state.isFetchingNextPage || state.isLoadingMorePersonalized || state.isFetchNextPageError) {
    return false;
  }

  return true;
}
