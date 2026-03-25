# 뉴스 썸네일 대체 이미지 추가

## 변경 내용

- 뉴스 썸네일 공통 컴포넌트를 추가했다.
- 이미지 URL이 없거나 로딩 실패 시 기본 대체 이미지를 표시한다.
- 목록 카드, 홈 맞춤/헤드라인 리스트, 홈 히어로, 뉴스 상세 상단에 동일한 대체 규칙을 적용했다.

## 대상 파일

- `my-news-front/components/news/news-thumbnail.tsx`
- `my-news-front/components/news/news-card.tsx`
- `my-news-front/app/page.tsx`
- `my-news-front/app/news/[id]/page.tsx`
- `my-news-front/public/news-fallback.svg`
