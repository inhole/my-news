# my-news

뉴스 조회, 북마크, 날씨 위젯을 제공하는 모노레포입니다.

## 구성

- `my-news-front`: Next.js 16 프런트엔드
- `my-news-back`: NestJS 11 + Prisma 백엔드

## 기술 스택

- Frontend: Next.js, React, TypeScript, TanStack Query, Tailwind CSS
- Backend: NestJS, Prisma, PostgreSQL, Swagger, JWT 인증
- Database: Neon PostgreSQL

## 실행

루트에서 전체 의존성 설치:

```bash
npm run install:all
```

개별 실행:

```bash
npm run dev:front
npm run dev:back
```

## 환경변수

프런트:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

백엔드 필수값:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

백엔드 선택값:

- `NAVER_NEWS_API_URL`
- `PORT`
- `CORS_ORIGIN`

자세한 로컬 DB 설정은 [NEON_LOCAL_SETUP.md](/C:/dev/workspace/my-news/NEON_LOCAL_SETUP.md)에서 확인합니다.

## 데이터 정책

- 카테고리 `slug`는 영문 고정값을 사용합니다.
- 카테고리 `name`은 화면 노출용 한글 이름으로 저장합니다.
- 기본 카테고리 시드는 `my-news-back/prisma/seed.ts`와 백엔드 뉴스 수집 로직이 동일한 정의를 공유합니다.
