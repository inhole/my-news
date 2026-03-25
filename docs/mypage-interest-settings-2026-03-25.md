# 마이페이지 관심 카테고리 및 키워드 설정

## 변경 내용

- 마이페이지에서 관심 카테고리를 직접 선택하고 즉시 반영되도록 구성했다.
- 마이페이지에서 관심 키워드를 추가하거나 삭제할 수 있도록 구성했다.
- 같은 탭에서 설정을 바꿔도 바로 반영되도록 `PROFILE_UPDATED_EVENT` 커스텀 이벤트를 추가했다.
- 저장 완료 알림을 인라인 배너 대신 상단 토스트로 바꿔 더 자연스럽게 노출되도록 조정했다.
- 현재 반영 상태에는 `slug` 대신 실제 카테고리 이름을 보여주도록 정리했다.
- 초기화 전 확인 단계를 추가해 실수로 기록을 지우지 않도록 했다.

## 데이터 구조

- `preferredCategorySlugs`
- `preferredKeywords`
- 기존 `categoryScores`, `keywordScores`, `seenNewsIds` 유지

## 개인화 반영 방식

- 직접 선택한 카테고리는 해당 카테고리 기사에 추가 가중치를 부여한다.
- 직접 입력한 키워드는 기사 제목과 설명에 매칭될 때 추가 가중치를 부여한다.
- 행동 기반 점수와 사용자 설정 점수를 합산해 최종 `personalizedScore`를 계산한다.

## 영향 파일

- `my-news-front/app/mypage/page.tsx`
- `my-news-front/app/page.tsx`
- `my-news-front/lib/personalization/anonymous-profile.ts`
- `my-news-front/lib/personalization/personalized-feed.ts`
