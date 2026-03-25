# 백엔드 뉴스 요약 제거

## 변경 내용

- 뉴스 수집 배치에서 AI 요약 생성 로직을 제거했다.
- 뉴스 목록/상세 API 응답에서 가공 `summary` 필드를 제거했다.
- Prisma `News` 모델에서 `summaryLines`, `summaryHash` 컬럼을 삭제했다.
- 컬럼 삭제를 위한 Prisma 마이그레이션을 추가했다.

## 현재 동작

- 뉴스 배치: 기사 수집, 본문 보강, 이미지 및 출처 보강, DB 저장만 수행
- 뉴스 API: 저장된 기사 원문 데이터 중심으로 응답
- 요약 생성: 미사용

## 마이그레이션

- 추가 마이그레이션: `my-news-back/prisma/migrations/20260325170000_drop_news_summary_columns/migration.sql`
- 수행 SQL:
  - `ALTER TABLE "News" DROP COLUMN "summaryLines", DROP COLUMN "summaryHash";`

## 영향 파일

- `my-news-back/src/news/news.service.ts`
- `my-news-back/prisma/schema.prisma`
- `my-news-back/prisma/migrations/20260325170000_drop_news_summary_columns/migration.sql`
