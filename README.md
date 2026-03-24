# my-news

카테고리 기반 뉴스 탐색, 익명 개인화 추천, 헤드라인/키워드 뷰를 제공하는 뉴스 서비스입니다.

## 구성

- `my-news-front`: Next.js 16 프론트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger
- Database: Neon PostgreSQL

## 주요 화면

- 홈: 뉴스, 맞춤 뉴스, 헤드라인, 키워드 탭 제공
- 뉴스: 현재 위치 기반 지역 뉴스와 시간/주간 정보 제공
- 맞춤 뉴스: 익명 개인화 프로필 기반 추천 뉴스와 AI 3줄 요약 제공
- 헤드라인: 주요 뉴스 5건 노출
- 키워드: 헤드라인/설명 기반 키워드 추출 및 랭킹 제공
- 뉴스 목록: 카테고리 필터, 검색, 무한 스크롤 지원
- 뉴스 상세: 본문 링크와 원문 이동 제공

## 실행

루트에서 의존성을 설치합니다.

```bash
npm install
```

프론트엔드 실행:

```bash
npm run dev:front
```

백엔드 실행:

```bash
npm run dev:back
```

## 백엔드 로컬 설정

이 저장소의 기본 DB 구성은 Neon PostgreSQL + Prisma입니다.

1. `my-news-back/.env.example`을 `my-news-back/.env`로 복사합니다.
2. `DATABASE_URL`을 Neon Direct URL로 입력합니다.
3. `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 입력합니다.
4. 아래 명령을 실행합니다.

```bash
cd my-news-back
npm install
npm run db:generate
npm run db:migrate:deploy
npm run prisma:seed
```

자동화 스크립트가 필요하면 아래 파일을 사용합니다.

- Windows: `my-news-back/setup-neon-local.bat`
- macOS/Linux: `my-news-back/setup-neon-local.sh`

상세 가이드는 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)를 참고합니다.

## 환경 변수

프론트엔드:

```env
NEXT_PUBLIC_API_BASE_URL=/api
BACKEND_BASE_URL=http://localhost:3000
```

백엔드 필수:

- `DATABASE_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택:

- `NAVER_NEWS_API_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPEN_METEO_API_URL`
- `OPEN_METEO_AIR_QUALITY_API_URL`
- `PORT`
- `CORS_ORIGIN`

## 문서

- [anonymous-personalization-architecture.md](/C:/dev/workspace/my-news/docs/anonymous-personalization-architecture.md)
- [home-ui-2026-03-19.md](/C:/dev/workspace/my-news/docs/home-ui-2026-03-19.md)
