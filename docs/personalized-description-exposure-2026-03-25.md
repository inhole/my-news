# 맞춤 뉴스 리스트 description 노출 전환

## 변경 내용

- 맞춤 뉴스 리스트에서 AI 요약(`summary`) 노출을 제거했다.
- 리스트 본문은 기사 `description`을 그대로 사용하도록 변경했다.
- 개인화 정렬 로직은 유지하고, 카드 본문 노출 기준만 요약에서 설명문으로 바꿨다.

## 검토 메모

- 기존 문서에는 맞춤 뉴스 카드가 AI 요약을 우선 노출한다고 적힌 부분이 남아 있다.
- 현재 UI 기준 문서의 정정 원본은 이 문서다.

## 영향 범위

- `my-news-front/app/page.tsx`
- `my-news-front/lib/personalization/personalized-feed.ts`

## 현재 기준

- 맞춤 뉴스 정렬: 개인화 점수 기반
- 맞춤 뉴스 본문 노출: `description`
- 맞춤 뉴스 썸네일: 미노출
- 배치 요약 생성: 백엔드에서 계속 유지 가능
